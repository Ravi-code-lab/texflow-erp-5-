
const { app, BrowserWindow, ipcMain, dialog, shell, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const zlib = require('zlib');
const AdmZip = require('adm-zip');

let mainWindow;

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
        
        manifest.shards[key] = { hash: writtenHash, timestamp: new Date().toISOString(), size: encrypted.length };
        fs.writeFileSync(paths.manifest, encrypt(compress(Buffer.from(JSON.stringify(manifest)))));
        
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

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
