/**
 * electron/main.js — Ravi-Textile ERP Desktop Core
 * ─────────────────────────────────────────────────
 * • Electron window + IPC handlers (db, storage, tally, lan)
 * • Embedded Express REST API on port 3001 for LAN multi-user mode
 * • WebSocket server for real-time push to all connected clients
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path   = require('path');
const fs     = require('fs');
const http   = require('http');
const os     = require('os');
const AdmZip = require('adm-zip');

// ── Get real LAN IP using os.networkInterfaces() ─────────────────────────────
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip loopback and non-IPv4
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// ── LAN Server (Express + WebSocket) ─────────────────────────────────────────
let express, WebSocketServer;
try {
  express         = require('express');
  WebSocketServer = require('ws').WebSocketServer;
} catch (e) {
  console.warn('[LAN] express/ws not found — run npm install');
}

const LAN_PORT_DEFAULT = 3001;
let lanPort      = LAN_PORT_DEFAULT;
let lanServer    = null;
let wss          = null;
let lanRunning   = false;

// ── Port availability helper ─────────────────────────────────────────────────
function findAvailablePort(startPort, maxTries = 20) {
  return new Promise((resolve, reject) => {
    const net = require('net');
    let port = startPort;
    let tries = 0;

    function tryPort(p) {
      if (tries >= maxTries) {
        return reject(new Error(`No free port found after ${maxTries} attempts starting at ${startPort}`));
      }
      const tester = net.createServer();
      tester.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          tries++;
          tryPort(p + 1);
        } else {
          reject(err);
        }
      });
      tester.once('listening', () => {
        tester.close(() => resolve(p));
      });
      tester.listen(p, '0.0.0.0');
    }

    tryPort(port);
  });
}

// In-memory vault (mirrors the JSON file on disk)
let vaultCache   = {};

// ── Write queue — prevents file corruption when multiple LAN clients save simultaneously ──
let writeQueue   = Promise.resolve();

function queueWrite(data) {
  vaultCache = { ...vaultCache, ...data };
  const snapshot = { ...vaultCache };
  writeQueue = writeQueue.then(() => {
    try { fs.writeFileSync(VAULT_FILE, JSON.stringify(snapshot), 'utf8'); }
    catch (e) { console.error('[VAULT] Write error:', e.message); }
  });
  return writeQueue;
}

// ── Paths ────────────────────────────────────────────────────────────────────
const USER_DATA  = app.getPath('userData');
const VAULT_FILE = path.join(USER_DATA, 'texflow_vault.json');
const LOG_FILE   = path.join(USER_DATA, 'backup_journal.log');
const CFG_FILE   = path.join(USER_DATA, 'storage_config.json');

// ── Helpers ──────────────────────────────────────────────────────────────────
function readVault(forceReload = false) {
  // Return in-memory cache unless a forced reload is requested.
  // The cache is always up-to-date: every write goes through queueWrite() which
  // updates vaultCache before writing to disk. So a disk read is only needed
  // on startup or after an external restore.
  if (!forceReload && Object.keys(vaultCache).length > 0) return vaultCache;
  try {
    if (fs.existsSync(VAULT_FILE)) {
      vaultCache = JSON.parse(fs.readFileSync(VAULT_FILE, 'utf8'));
    }
  } catch (e) { console.error('[VAULT] Read error:', e); }
  return vaultCache;
}

function writeVault(data) {
  return queueWrite(data);
}

function appendLog(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line);
}

function broadcastToClients(payload) {
  if (!wss) return;
  const msg = JSON.stringify(payload);
  wss.clients.forEach(client => {
    if (client.readyState === 1 /* OPEN */) client.send(msg);
  });
}

// ── LAN Server start/stop ────────────────────────────────────────────────────
async function startLanServer(win) {
  if (lanRunning || !express) return;

  // Find a free port starting from LAN_PORT_DEFAULT
  let port;
  try {
    port = await findAvailablePort(LAN_PORT_DEFAULT);
  } catch (e) {
    console.error('[LAN] Could not find a free port:', e.message);
    appendLog(`LAN server failed — no free port: ${e.message}`);
    if (win && !win.isDestroyed()) {
      win.webContents.send('lan:status', { running: false, error: e.message });
    }
    return;
  }

  lanPort = port;

  const expressApp = express();
  expressApp.use(express.json({ limit: '50mb' }));

  // CORS — allow any LAN origin
  expressApp.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  // ── JWT helpers (no external package — pure Node.js crypto) ─────────────────
  const crypto = require('crypto');

  // Derive a stable secret from the vault path so it survives restarts
  // but is unique per installation (not shared across different server PCs).
  const JWT_SECRET = crypto
    .createHash('sha256')
    .update(VAULT_FILE + 'texflow-jwt-v1')
    .digest('hex');

  const JWT_EXPIRY_SECONDS = 60 * 60 * 12; // 12 hours

  function base64url(buf) {
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function signToken(payload) {
    const header  = base64url(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
    const body    = base64url(Buffer.from(JSON.stringify(payload)));
    const sig     = base64url(
      crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest()
    );
    return `${header}.${body}.${sig}`;
  }

  function verifyToken(token) {
    try {
      const [header, body, sig] = token.split('.');
      const expected = base64url(
        crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest()
      );
      if (sig !== expected) return null;
      const payload = JSON.parse(Buffer.from(body, 'base64').toString());
      if (payload.exp && Date.now() / 1000 > payload.exp) return null; // expired
      return payload;
    } catch { return null; }
  }

  function requireAuth(req, res, next) {
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Unauthorized' });
    req.user = payload;
    next();
  }

  // ── Auth endpoints ────────────────────────────────────────────────────────────

  // GET /api/ping — health check (public)
  expressApp.get('/api/ping', (req, res) => {
    res.json({ ok: true, ts: Date.now(), version: app.getVersion() });
  });

  // POST /api/auth/login — validate credentials server-side, return JWT
  expressApp.post('/api/auth/login', (req, res) => {
    const { username, passwordHash } = req.body;
    if (!username || !passwordHash)
      return res.status(400).json({ error: 'username and passwordHash required' });

    const vault = readVault();
    const team  = Array.isArray(vault.team) ? vault.team : [];

    // Match against stored team
    const member = team.find(t =>
      (t.username?.toLowerCase() === username.toLowerCase() ||
       t.name?.toLowerCase()     === username.toLowerCase() ||
       t.id?.toLowerCase()       === username.toLowerCase()) &&
      t.passwordHash === passwordHash &&
      t.status === 'ACTIVE' &&
      !t.deleted
    );

    if (member) {
      const token = signToken({
        sub: member.id,
        name: member.name,
        role: member.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY_SECONDS,
      });
      return res.json({ success: true, token, user: member });
    }

    // Seed admin — only when no team exists yet (first boot)
    const SEED_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';
    const activeTeam = team.filter(t => !t.deleted);
    if (username === 'admin' && passwordHash === SEED_HASH && activeTeam.length === 0) {
      const adminUser = { id: 'admin', name: 'Administrator', role: 'ADMIN', status: 'ACTIVE' };
      const token = signToken({
        sub: 'admin',
        name: 'Administrator',
        role: 'ADMIN',
        seedAdmin: true,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY_SECONDS,
      });
      return res.json({ success: true, token, user: adminUser, mustChangePassword: true });
    }

    return res.status(401).json({ error: 'Invalid credentials' });
  });

  // GET /api/auth/me — verify a stored token, return user info
  expressApp.get('/api/auth/me', (req, res) => {
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token expired or invalid' });

    // Re-fetch user from vault so role/status changes take effect immediately
    const vault = readVault();
    const team  = Array.isArray(vault.team) ? vault.team : [];
    const member = team.find(t => t.id === payload.sub && t.status === 'ACTIVE' && !t.deleted);

    if (member) return res.json({ success: true, user: member });
    if (payload.seedAdmin) return res.json({ success: true, user: { id: 'admin', name: 'Administrator', role: 'ADMIN', status: 'ACTIVE' }, mustChangePassword: true });

    return res.status(401).json({ error: 'User not found or inactive' });
  });

  // ── Data endpoints (protected) ────────────────────────────────────────────────

  // GET /api/data — return full vault
  expressApp.get('/api/data', requireAuth, (req, res) => {
    res.json({ success: true, data: readVault() });
  });

  // GET /api/shard/:key — fetch a single key
  expressApp.get('/api/shard/:key', requireAuth, (req, res) => {
    const vault = readVault();
    const key = req.params.key;
    if (!(key in vault)) return res.status(404).json({ error: 'key not found' });
    res.json({ success: true, key, data: vault[key] });
  });

  // POST /api/shard — client writes ONE key; broadcast to all peers
  expressApp.post('/api/shard', requireAuth, async (req, res) => {
    const { key, data } = req.body;
    if (!key) return res.status(400).json({ error: 'key required' });
    await writeVault({ [key]: data });
    broadcastToClients({ type: 'shard', key, data });
    if (win && !win.isDestroyed()) win.webContents.send('lan:data-push', { key, data });
    res.json({ success: true });
  });

  // POST /api/shard/batch — atomic multi-key write
  expressApp.post('/api/shard/batch', requireAuth, async (req, res) => {
    const { shards } = req.body;
    if (!Array.isArray(shards) || shards.length === 0)
      return res.status(400).json({ error: 'shards array required' });
    const patch = {};
    for (const { key, data } of shards) { if (key) patch[key] = data; }
    await writeVault(patch);
    for (const { key, data } of shards) {
      if (!key) continue;
      broadcastToClients({ type: 'shard', key, data });
      if (win && !win.isDestroyed()) win.webContents.send('lan:data-push', { key, data });
    }
    res.json({ success: true, count: shards.length });
  });

  // Serve the built React app to LAN clients (mobile/laptop browsers)
  const distPath = path.join(__dirname, '../dist');
  expressApp.use(express.static(distPath));

  // Catch-all: return index.html so React Router works on any sub-path
  expressApp.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  const httpServer = http.createServer(expressApp);

  // Catch any listen errors (e.g. race condition) gracefully — no crash
  httpServer.on('error', (err) => {
    console.error('[LAN] Server error:', err.message);
    appendLog(`LAN server error: ${err.message}`);
    lanRunning = false;
    lanServer  = null;
    wss        = null;
    if (win && !win.isDestroyed()) {
      win.webContents.send('lan:status', { running: false, error: err.message });
    }
  });

  // WebSocket on same port — BUG 6 FIX: verify JWT token from ?token= query param
  wss = new WebSocketServer({ server: httpServer });
  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    // Extract token from query string: ws://host:port/?token=<jwt>
    let tokenOk = false;
    try {
      const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const tok = urlObj.searchParams.get('token');
      if (tok && verifyToken(tok)) tokenOk = true;
    } catch { /* malformed URL */ }

    if (!tokenOk) {
      console.log(`[LAN] WS rejected (no/invalid token): ${ip}`);
      try { ws.send(JSON.stringify({ type: 'auth_error', message: 'Unauthorized' })); } catch { /* ignore */ }
      ws.terminate();
      return;
    }

    console.log(`[LAN] Client connected: ${ip}`);
    // Tell the newly connected client to re-fetch all data (handles server restarts)
    try { ws.send(JSON.stringify({ type: 'reconnect' })); } catch { /* ignore */ }
    ws.on('close', () => console.log(`[LAN] Client disconnected: ${ip}`));
  });

  httpServer.listen(lanPort, '0.0.0.0', () => {
    lanRunning = true;
    lanServer  = httpServer;
    console.log(`[LAN] Server running on port ${lanPort}`);
    appendLog(`LAN server started on port ${lanPort}`);
    if (win && !win.isDestroyed()) {
      win.webContents.send('lan:status', { running: true, port: lanPort, ip: getLocalIp() });
    }
  });
}

function stopLanServer(win) {
  if (!lanRunning || !lanServer) return;
  // Gracefully terminate all connected WS clients before closing
  if (wss) {
    wss.clients.forEach(client => {
      try {
        client.send(JSON.stringify({ type: 'server_shutdown' }));
        client.terminate();
      } catch { /* ignore */ }
    });
    wss.close();
  }
  lanServer.close(() => {
    lanRunning = false;
    lanServer  = null;
    wss        = null;
    console.log('[LAN] Server stopped');
    if (win && !win.isDestroyed()) {
      win.webContents.send('lan:status', { running: false });
    }
  });
}

// ── Electron Window ──────────────────────────────────────────────────────────
let mainWindow;

function createWindow() {
  readVault(); // pre-load vault into memory

  mainWindow = new BrowserWindow({
    width:  1400,
    height: 900,
    minWidth:  900,
    minHeight: 600,
    title: 'Ravi-Textile ERP',
    // Hide window until fully painted — prevents broken/unstyled flash on PC startup
    show: false,
    backgroundColor: '#f5f5f7', // matches body background so no white flash
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // ── Show window only after first paint is complete ───────────────────────
  // This is the key fix for "CSS not loading properly after PC restart":
  // Electron was showing the window immediately while CSS/fonts were still
  // being fetched. Now it waits until the page is fully rendered.
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Safety net: if ready-to-show never fires (e.g. page error), show after 4s
  const showFallback = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  }, 4000);
  mainWindow.once('ready-to-show', () => clearTimeout(showFallback));

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });

  // Auto-start LAN server if previously enabled (Defaulting to true)
  try {
    const cfg = fs.existsSync(CFG_FILE) ? JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')) : {};
    if (cfg.lanAutoStart !== false) startLanServer(mainWindow).catch(e => console.error('[LAN] Auto-start failed:', e.message));
  } catch (e) {
    startLanServer(mainWindow).catch(err => console.error('[LAN] Auto-start failed:', err.message));
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ── IPC: Database ─────────────────────────────────────────────────────────────
ipcMain.handle('db:load-all', async () => {
  try {
    const data = readVault();
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('db:save-shard', async (_, { key, data }) => {
  try {
    await writeVault({ [key]: data });
    // Push to all connected LAN clients (browser PCs)
    broadcastToClients({ type: 'shard', key, data });
    // Also notify the Electron renderer itself so any OTHER open views update
    // (e.g. two modules open side-by-side, or if we later support multiple windows)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('lan:data-push', { key, data });
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ── IPC: Storage / Backup ─────────────────────────────────────────────────────
ipcMain.handle('storage:info', async () => {
  try {
    const logs = fs.existsSync(LOG_FILE)
      ? fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n').slice(-20).reverse()
      : [];
    return {
      vaultRoot: VAULT_FILE,
      shardCount: Object.keys(vaultCache).length,
      logs,
    };
  } catch (e) { return { error: e.message }; }
});

ipcMain.handle('storage:select-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select ERP Data Folder',
  });
  if (!result.canceled && result.filePaths[0]) {
    const cfg = { vaultDir: result.filePaths[0], lanAutoStart: false };
    fs.writeFileSync(CFG_FILE, JSON.stringify(cfg));
    appendLog(`Storage path set: ${result.filePaths[0]}`);
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('storage:backup', async () => {
  try {
    const ts  = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const out = path.join(USER_DATA, `TexFlow_Backup_${ts}.zip`);
    const zip = new AdmZip();
    zip.addLocalFile(VAULT_FILE);
    zip.writeZip(out);
    appendLog(`Backup created: ${out}`);
    return { success: true, path: out };
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('storage:restore-zip', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: 'ZIP Backup', extensions: ['zip'] }],
    title: 'Select Backup ZIP',
  });
  if (result.canceled) return { success: false };
  try {
    const zip  = new AdmZip(result.filePaths[0]);
    const entry = zip.getEntries().find(e => e.entryName === 'texflow_vault.json');
    if (!entry) throw new Error('No vault file in ZIP');
    zip.extractEntryTo(entry, USER_DATA, false, true);
    readVault(true); // force reload from disk after restore
    appendLog(`Restored from ZIP: ${result.filePaths[0]}`);
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('storage:verify', async () => {
  const ok = fs.existsSync(VAULT_FILE);
  return { success: ok, shardCount: ok ? Object.keys(readVault()).length : 0 };
});

// BUG 7 FIX: actually wipe vault so factory reset works
ipcMain.handle('storage:reset', async () => {
  try {
    vaultCache = {};
    if (fs.existsSync(VAULT_FILE)) {
      fs.writeFileSync(VAULT_FILE, JSON.stringify({}), 'utf8');
    }
    appendLog('Factory reset: vault wiped');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ── IPC: Tally Sync ───────────────────────────────────────────────────────────
ipcMain.handle('tally:sync', async (_, { host, port, xml }) => {
  return new Promise((resolve) => {
    // TallyPrime REQUIRES Content-Length — without it the request hangs forever.
    const xmlBuffer = Buffer.from(xml, 'utf8');

    const options = {
      host,
      port: Number(port),
      method: 'POST',
      path: '/',
      headers: {
        'Content-Type':   'text/xml;charset=utf-8',
        'Content-Length': xmlBuffer.length,
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ success: true, body }));
    });

    // 10-second timeout so the UI doesn't hang if Tally is unreachable
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ success: false, error: `Connection timed out (10s). Is TallyPrime open and its HTTP server enabled on ${host}:${port}?` });
    });

    req.on('error', (e) => {
      let msg = e.message;
      if (e.code === 'ECONNREFUSED')
        msg = `Connection refused — TallyPrime is not listening on ${host}:${port}. Enable the HTTP server in F12 → Advanced Config.`;
      else if (e.code === 'ENOTFOUND' || e.code === 'EHOSTUNREACH')
        msg = `Cannot reach ${host} — check the IP address and that both PCs are on the same network.`;
      resolve({ success: false, error: msg });
    });

    req.write(xmlBuffer);
    req.end();
  });
});

// ── IPC: LAN Server control ───────────────────────────────────────────────────
ipcMain.handle('lan:start', async () => {
  await startLanServer(mainWindow);
  // Save auto-start preference
  try {
    const cfg = fs.existsSync(CFG_FILE) ? JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')) : {};
    cfg.lanAutoStart = true;
    fs.writeFileSync(CFG_FILE, JSON.stringify(cfg));
  } catch (e) { /* ignore */ }
  return { success: true, port: lanPort, ip: getLocalIp() };
});

ipcMain.handle('lan:stop', async () => {
  stopLanServer(mainWindow);
  try {
    const cfg = fs.existsSync(CFG_FILE) ? JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')) : {};
    cfg.lanAutoStart = false;
    fs.writeFileSync(CFG_FILE, JSON.stringify(cfg));
  } catch (e) { /* ignore */ }
  return { success: true };
});

ipcMain.handle('lan:status', async () => {
  return { running: lanRunning, port: lanPort, ip: getLocalIp() };
});