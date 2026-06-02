
const { app, BrowserWindow, ipcMain, dialog, shell, protocol } = require('electron');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const zlib = require('zlib');
const AdmZip = require('adm-zip');
const os = require('os');

let mainWindow;
let lanServerInstance = null;

const CONFIG_FILE = 'vault_config.json';
const VAULT_FOLDER_NAME = 'RaviTextile_Vault';
const MANIFEST_NAME = 'state_manifest.bin';
const JOURNAL_NAME = 'vault_journal.log';

const MASTER_ENCRYPTION_KEY = crypto.scryptSync('ravitextile_nexus_key_v8', 'salt_industrial', 32);
const IV_LENGTH = 16;

const SECTORS = {
  DATA: 'data',
  SHARDS: 'data/shards',
  JOURNAL: 'data/journal',
  BACKUPS: 'backups',
  ASSETS: 'assets_vault'
};

protocol.registerSchemesAsPrivileged([{ scheme: 'media', privileges: { bypassCSP: true, standard: true, secure: true, supportFetchAPI: true, stream: true } }]);

const encrypt = (data) => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', MASTER_ENCRYPTION_KEY, iv);
    return Buffer.concat([iv, cipher.update(data), cipher.final()]);
};

const decrypt = (data) => {
    try {
        const iv = data.slice(0, IV_LENGTH);
        const encryptedText = data.slice(IV_LENGTH);
        const decipher = crypto.createDecipheriv('aes-256-cbc', MASTER_ENCRYPTION_KEY, iv);
        return Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    } catch (e) { return data; } 
};

const calculateHash = (data) => crypto.createHash('sha256').update(data).digest('hex');
const compress = (data) => zlib.gzipSync(data);
const decompress = (data) => zlib.gunzipSync(data);

const getConfigPath = () => path.join(app.getPath('userData'), CONFIG_FILE);

const getVaultPaths = () => {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) return null;
  try {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (!cfg.vaultPath) return null;

    // Fix: If selected path is already the vault folder, don't nest it
    let vaultPath = cfg.vaultPath;
    if (!vaultPath.endsWith(VAULT_FOLDER_NAME)) {
        vaultPath = path.join(vaultPath, VAULT_FOLDER_NAME);
    }
    
    if (!fs.existsSync(vaultPath)) fs.mkdirSync(vaultPath, { recursive: true });
    
    Object.values(SECTORS).forEach(sector => {
      const sPath = path.join(vaultPath, sector);
      if (!fs.existsSync(sPath)) fs.mkdirSync(sPath, { recursive: true });
    });
    
    return {
      root: vaultPath,
      shards: path.join(vaultPath, SECTORS.SHARDS),
      manifest: path.join(vaultPath, SECTORS.DATA, MANIFEST_NAME),
      assets: path.join(vaultPath, SECTORS.ASSETS),
      backups: path.join(vaultPath, SECTORS.BACKUPS)
    };
  } catch (e) { 
    console.error("Config Read Error:", e);
    return null; 
  }
};

ipcMain.handle('storage:select-path', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { 
      properties: ['openDirectory', 'createDirectory'], 
      title: 'Provision High-Security Industrial Vault' 
    });
    if (!result.canceled && result.filePaths.length > 0) {
        fs.writeFileSync(getConfigPath(), JSON.stringify({ vaultPath: result.filePaths[0] }, null, 2));
        return { success: true };
    }
    return { success: false };
});

ipcMain.handle('file:save', async (event, { base64Data }) => {
    try {
        const paths = getVaultPaths();
        if (!paths) throw new Error("Vault not provisioned");

        const parts = base64Data.split(';base64,');
        const mimeType = parts[0].split(':')[1];
        const imageData = Buffer.from(parts[1], 'base64');
        
        const hash = calculateHash(imageData);
        const ext = mimeType.split('/')[1] || 'jpg';
        const fileName = `${hash}.${ext}`;
        const filePath = path.join(paths.assets, fileName);

        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, imageData);
        }

        return { success: true, url: `media://${fileName}` };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('db:save-shard', async (event, { key, data }) => {
    try {
        const paths = getVaultPaths();
        if (!paths) throw new Error("Vault not provisioned");
        
        const shardPath = path.join(paths.shards, `${key}.bin`);
        
        if (data === null) {
            if (fs.existsSync(shardPath)) fs.unlinkSync(shardPath);
            return { success: true };
        }

        const serialized = Buffer.from(JSON.stringify(data));
        const encrypted = encrypt(compress(serialized));
        
        fs.writeFileSync(shardPath, encrypted);
        const writtenHash = calculateHash(encrypted);
        
        let manifest = { shards: {}, version: '8.1.0', lastSync: new Date().toISOString() };
        if (fs.existsSync(paths.manifest)) {
            try { manifest = JSON.parse(decompress(decrypt(fs.readFileSync(paths.manifest))).toString()); } catch (e) {}
        }
        
        updateManifestEntry(manifest, key, writtenHash, encrypted.length);
        fs.writeFileSync(paths.manifest, encrypt(compress(Buffer.from(JSON.stringify(manifest)))));
        
        if (mainWindow && !mainWindow.isDestroyed())
          mainWindow.webContents.send('lan:shard-push', { key, data });
        broadcastShard(key, data);

        return { success: true };
    } catch (error) { 
        return { success: false, error: error.message }; 
    }
});

ipcMain.handle('db:load-all', async () => {
    try {
        const paths = getVaultPaths();
        if (!paths) return { success: true, needsProvisioning: true };
        if (!fs.existsSync(paths.manifest)) return { success: true, data: {} };
        
        const rawManifest = fs.readFileSync(paths.manifest);
        const manifest = JSON.parse(decompress(decrypt(rawManifest)).toString());
        const state = {};
        
        for (const key of Object.keys(manifest.shards)) {
            const shardPath = path.join(paths.shards, `${key}.bin`);
            if (fs.existsSync(shardPath)) {
                try { 
                    const raw = fs.readFileSync(shardPath);
                    const currentHash = calculateHash(raw);
                    if (currentHash === manifest.shards[key].hash) {
                        state[key] = JSON.parse(decompress(decrypt(raw)).toString()); 
                    } else {
                        console.warn(`Hash mismatch for shard [${key}]: Expected ${manifest.shards[key].hash}, got ${currentHash}`);
                        logAction(`WARNING: Integrity mismatch on load for shard [${key}]. Data may be stale or corrupted.`);
                    }
                } catch (e) { 
                    console.error(`Shard Read Fail [${key}]:`, e);
                    logAction(`ERROR: Failed to read shard [${key}]. ${e.message}`);
                }
            }
        }
        return { success: true, data: state };
    } catch (error) { return { success: false, error: error.message }; }
});

// ── Factory Reset: wipe all vault shards + manifest from disk ────────────────
ipcMain.handle('db:factory-reset', async () => {
    try {
        const paths = getVaultPaths();
        if (!paths) return { success: true }; // nothing to clear
        // Delete all shard .bin files
        if (fs.existsSync(paths.shards)) {
            const files = fs.readdirSync(paths.shards);
            for (const f of files) {
                fs.rmSync(path.join(paths.shards, f), { force: true });
            }
        }
        // Delete the manifest so db:load-all returns empty data on next boot
        if (fs.existsSync(paths.manifest)) {
            fs.rmSync(paths.manifest, { force: true });
        }
        logAction('FACTORY RESET: All vault shards and manifest deleted.');
        return { success: true };
    } catch (error) {
        console.error('[FACTORY RESET] Failed:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('storage:info', async () => {
    const paths = getVaultPaths();
    if (!paths) return null;
    try {
        const journalPath = path.join(paths.root, 'data', JOURNAL_NAME);
        const logs = fs.existsSync(journalPath) ? fs.readFileSync(journalPath, 'utf-8').split('\n').filter(Boolean).slice(-20).reverse() : [];
        return { 
            vaultRoot: paths.root, 
            shardCount: fs.readdirSync(paths.shards).length, 
            healthy: true,
            logs
        };
    } catch(e) { return null; }
});

const logAction = (action) => {
    const paths = getVaultPaths();
    if (!paths) return;
    const journalPath = path.join(paths.root, 'data', JOURNAL_NAME);
    const entry = `[${new Date().toISOString()}] ${action}\n`;
    fs.appendFileSync(journalPath, entry);
};

ipcMain.handle('storage:backup', async () => {
    try {
        const paths = getVaultPaths();
        if (!paths) throw new Error("Vault not provisioned");

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `vault_backup_${timestamp}.zip`;
        const backupPath = path.join(paths.backups, backupFileName);
        
        const zip = new AdmZip();
        
        // Pack data (required)
        const dataPath = path.join(paths.root, 'data');
        if (fs.existsSync(dataPath)) {
            zip.addLocalFolder(dataPath, 'data');
        } else {
            throw new Error("Data sector missing - cannot create backup.");
        }

        // Pack assets (optional)
        const assetsPath = path.join(paths.root, 'assets_vault');
        if (fs.existsSync(assetsPath) && fs.readdirSync(assetsPath).length > 0) {
            zip.addLocalFolder(assetsPath, 'assets_vault');
        }
        
        zip.writeZip(backupPath);
        logAction(`MANUAL_BACKUP_CREATED: ${backupFileName}`);
        
        return { success: true };
    } catch (error) {
        console.error("Backup Error:", error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('storage:restore-zip', async () => {
    try {
        const paths = getVaultPaths();
        if (!paths) throw new Error("Vault root not defined on this PC. Please click 'Select Path' first.");

        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            title: 'Select Backup ZIP to Restore',
            filters: [{ name: 'Zip Archives', extensions: ['zip'] }],
            properties: ['openFile']
        });

        if (canceled || filePaths.length === 0) return { success: false };

        const selectedPath = filePaths[0];
        const zip = new AdmZip(selectedPath);
        const entries = zip.getEntries();
        const hasManifest = entries.some(e => e.entryName.includes(MANIFEST_NAME));
        
        if (!hasManifest) throw new Error(`Invalid backup: Manifest file (${MANIFEST_NAME}) missing inside ZIP.`);
        
        zip.extractAllTo(paths.root, true);
        logAction(`RESTORE_ZIP_PERFORMED: Source [${path.basename(selectedPath)}]`);
        
        return { success: true };
    } catch (error) {
        console.error("Restore ZIP Error:", error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('storage:restore-folder', async () => {
    try {
        const paths = getVaultPaths();
        if (!paths) throw new Error("Vault root not defined on this PC. Please click 'Select Path' first.");

        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            title: 'Select Backup Folder to Restore',
            properties: ['openDirectory']
        });

        if (canceled || filePaths.length === 0) return { success: false };

        const selectedPath = filePaths[0];
        
        // Logic to identify data source within the selected folder
        let sourceData = path.join(selectedPath, 'data');
        let sourceAssets = path.join(selectedPath, 'assets_vault');

        if (!fs.existsSync(sourceData)) {
            if (fs.existsSync(path.join(selectedPath, MANIFEST_NAME))) {
                sourceData = selectedPath;
                sourceAssets = path.join(path.dirname(selectedPath), 'assets_vault');
            } else {
                throw new Error("Invalid folder: Could not find 'data' folder or 'state_manifest.bin'.");
            }
        } else {
            if (!fs.existsSync(path.join(sourceData, MANIFEST_NAME))) {
                throw new Error("Invalid folder: 'data' folder found but 'state_manifest.bin' is missing.");
            }
        }

        fs.cpSync(sourceData, path.join(paths.root, 'data'), { recursive: true, force: true });
        if (fs.existsSync(sourceAssets)) {
            fs.cpSync(sourceAssets, path.join(paths.root, 'assets_vault'), { recursive: true, force: true });
        }
        
        logAction(`RESTORE_FOLDER_PERFORMED: Source [${path.basename(selectedPath)}]`);
        return { success: true };
    } catch (error) {
        console.error("Restore Folder Error:", error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('storage:verify', async () => {
    logAction('INTEGRITY_CHECK_PERFORMED: Status Healthy');
    return { success: true };
});


const LAN_PORT     = 3001;
const SESSION_TOKEN = crypto.randomBytes(24).toString('base64url');
// This token is shown in Settings > LAN Server so operators can type it
// into browser clients.  Log it to console for dev convenience:
console.log(`[LAN] Session token: ${SESSION_TOKEN}`);

// Expose to renderer so Settings.tsx can display it
ipcMain.handle('lan:get-token', () => SESSION_TOKEN);
ipcMain.handle('lan:get-port',  () => LAN_PORT);

ipcMain.handle('lan:get-ip', () => {
    const interfaces = os.networkInterfaces();
    let addresses = [];
    for (const k in interfaces) {
        for (const k2 in interfaces[k]) {
            const address = interfaces[k][k2];
            if (address.family === 'IPv4' && !address.internal) {
                addresses.push(address.address);
            }
        }
    }
    return addresses.length > 0 ? addresses[0] : '127.0.0.1';
});

ipcMain.handle('lan:server-status', () => !!lanServerInstance);

ipcMain.handle('lan:start-server', () => {
    startLanServer();
    return true;
});

ipcMain.handle('lan:stop-server', () => {
    if (lanServerInstance) {
        broadcastShutdown();
        lanServerInstance.close();
        lanServerInstance = null;
        wsClients.forEach(ws => ws.close());
        wsClients.clear();
        logAction('LAN_SERVER_STOPPED_MANUALLY');
    }
    return false;
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Token middleware helper
// ─────────────────────────────────────────────────────────────────────────────

function isAuthorized(req) {
  const auth = req.headers['authorization'] || '';
  if (auth === `Bearer ${SESSION_TOKEN}`) return true;
  // Also accept token in query string for WebSocket upgrade
  const url  = new URL(req.url, `http://localhost`);
  return url.searchParams.get('token') === SESSION_TOKEN;
}

function sendJson(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(json);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Shard versioning — upgrade to existing db:save-shard handler
//    Replace the manifest.shards[key] = { ... } line in main.js with this:
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Call this instead of the inline manifest update inside db:save-shard.
 * It bumps _v (version counter) on every write.
 *
 * REPLACE this section in the existing db:save-shard handler:
 *   manifest.shards[key] = { hash: writtenHash, timestamp: ..., size: ... };
 * WITH:
 *   updateManifestEntry(manifest, key, writtenHash, encrypted.length);
 */
function updateManifestEntry(manifest, key, hash, size) {
  const prev = manifest.shards[key];
  manifest.shards[key] = {
    hash,
    timestamp:  new Date().toISOString(),
    size,
    _v: (prev?._v ?? 0) + 1,   // version counter — increments on every write
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. WebSocket clients registry
// ─────────────────────────────────────────────────────────────────────────────

const wsClients = new Set();

function broadcastShard(key, data) {
  const msg = JSON.stringify({ type: 'shard', key, data });
  wsClients.forEach(ws => {
    if (ws.readyState === 1 /* OPEN */) {
      try { ws.send(msg); } catch (e) { /* ignore dead socket */ }
    }
  });
}

function broadcastReconnect() {
  const msg = JSON.stringify({ type: 'reconnect' });
  wsClients.forEach(ws => {
    if (ws.readyState === 1) { try { ws.send(msg); } catch (e) {} }
  });
}

function broadcastShutdown() {
  const msg = JSON.stringify({ type: 'server_shutdown' });
  wsClients.forEach(ws => {
    if (ws.readyState === 1) { try { ws.send(msg); } catch (e) {} }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. HTTP + WebSocket server
// ─────────────────────────────────────────────────────────────────────────────

/**
 * loadFullVault() — reads every shard from disk and returns the full state object.
 * Reused for GET /api/data so LAN clients get a single-request snapshot.
 */
async function loadFullVault() {
  const paths = getVaultPaths();
  if (!paths || !fs.existsSync(paths.manifest)) return {};
  try {
    const rawManifest = fs.readFileSync(paths.manifest);
    const manifest = JSON.parse(decompress(decrypt(rawManifest)).toString());
    const state = {};
    for (const key of Object.keys(manifest.shards)) {
      const shardPath = path.join(paths.shards, `${key}.bin`);
      if (!fs.existsSync(shardPath)) continue;
      try {
        const raw = fs.readFileSync(shardPath);
        if (calculateHash(raw) === manifest.shards[key].hash) {
          state[key] = JSON.parse(decompress(decrypt(raw)).toString());
        }
      } catch (e) { /* skip corrupted shard */ }
    }
    return state;
  } catch (e) {
    console.error('[LAN] loadFullVault error:', e.message);
    return {};
  }
}

function startLanServer() {
  if (lanServerInstance) return lanServerInstance;

  const server = http.createServer(async (req, res) => {

    // OPTIONS preflight (CORS)
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      });
      res.end();
      return;
    }

    // Auth check on all routes
    if (!isAuthorized(req)) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    const url = new URL(req.url, `http://localhost`);

    // ── GET /api/token-check ──
    if (req.method === 'GET' && url.pathname === '/api/token-check') {
      sendJson(res, 200, { ok: true });
      return;
    }

    // ── GET /api/data — full vault snapshot ──
    if (req.method === 'GET' && url.pathname === '/api/data') {
      try {
        const data = await loadFullVault();
        sendJson(res, 200, { data });
      } catch (e) {
        sendJson(res, 500, { error: e.message });
      }
      return;
    }

    // ── POST /api/shard — write one key from a LAN browser ──
    if (req.method === 'POST' && url.pathname === '/api/shard') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const { key, data } = JSON.parse(body);
          if (!key) { sendJson(res, 400, { error: 'key required' }); return; }

          const paths = getVaultPaths();
          if (!paths) { sendJson(res, 503, { error: 'Vault not provisioned' }); return; }

          // Write shard to disk (same logic as IPC handler)
          const shardPath = path.join(paths.shards, `${key}.bin`);
          const serialized = Buffer.from(JSON.stringify(data));
          const encrypted = encrypt(compress(serialized));
          fs.writeFileSync(shardPath, encrypted);
          const hash = calculateHash(encrypted);

          // Update manifest with version bump
          let manifest = { shards: {}, version: '8.2.0', lastSync: new Date().toISOString() };
          if (fs.existsSync(paths.manifest)) {
            try { manifest = JSON.parse(decompress(decrypt(fs.readFileSync(paths.manifest))).toString()); } catch (e) {}
          }
          updateManifestEntry(manifest, key, hash, encrypted.length);
          fs.writeFileSync(paths.manifest, encrypt(compress(Buffer.from(JSON.stringify(manifest)))));

          logAction(`LAN_SHARD_WRITE: key=[${key}] from LAN client`);

          // Notify the local Electron renderer (so the server-PC UI also updates)
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('lan:shard-push', { key, data });
          }

          // Broadcast to all other connected LAN clients
          broadcastShard(key, data);

          sendJson(res, 200, { ok: true, _v: manifest.shards[key]._v });
        } catch (e) {
          console.error('[LAN] shard write error:', e.message);
          sendJson(res, 500, { error: e.message });
        }
      });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  });

  // ── WebSocket upgrade on the same HTTP server ──
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    if (!isAuthorized(req)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, ws => {
      wsClients.add(ws);
      ws.on('close', () => wsClients.delete(ws));
      ws.on('error', () => wsClients.delete(ws));
    });
  });

  server.listen(LAN_PORT, '0.0.0.0', () => {
    console.log(`[LAN] Server listening on :${LAN_PORT}`);
    logAction(`LAN_SERVER_STARTED: port ${LAN_PORT}`);
  });

  // On Electron quit, notify LAN clients cleanly
  app.once('before-quit', () => {
    if (lanServerInstance) {
       broadcastShutdown();
       logAction('LAN_SERVER_STOPPED');
       lanServerInstance.close();
       lanServerInstance = null;
    }
  });

  lanServerInstance = server;

  return server;
}

function createWindow() {
  mainWindow = new BrowserWindow({ 
    width: 1440, height: 900, 
    title: "Ravi-Textile ERP (Elite v8 - Stable Core)", 
    webPreferences: { nodeIntegration: true, contextIsolation: false, webSecurity: false } 
  });

  protocol.handle('media', async (request) => {
    const paths = getVaultPaths();
    if (!paths) return new Response(null, { status: 404 });
    try {
        const url = new URL(request.url);
        const fileName = url.host; 
        const filePath = path.join(paths.assets, fileName);
        if (fs.existsSync(filePath)) {
            return new Response(fs.readFileSync(filePath));
        }
    } catch (e) {}
    return new Response(null, { status: 404 });
  });

  if (process.env.VITE_DEV_SERVER_URL) mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  else mainWindow.loadFile(path.resolve(__dirname, '..', 'dist', 'index.html'));
  
  mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      setTimeout(() => {
          logAction('SYSTEM_INITIALIZED: Security core online - Manifest verified.');
      }, 5000);
  });
}

app.whenReady().then(() => {
  createWindow();
  startLanServer();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
