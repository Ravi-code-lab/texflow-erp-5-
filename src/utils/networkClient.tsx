/**
 * utils/networkClient.ts — Unified Data Layer
 * ─────────────────────────────────────────────
 * Auto-detects environment and routes reads/writes accordingly:
 *
 *  MODE A — Electron (Server PC):
 *    getItem/setItem → IndexedDB + IPC to save to physical vault file
 *
 *  MODE B — LAN Client (browser on another PC):
 *    serverUrl is set (stored in localStorage as 'ravi_erp_server_url')
 *    getItem  → GET  http://SERVER_IP:3001/api/data  (fetch full vault, pick key)
 *    setItem  → POST http://SERVER_IP:3001/api/shard (push key to server)
 *    WebSocket connection receives real-time pushes from server
 */

import { getItem as idbGet, setItem as idbSet, hydrateFromNative as idbHydrate } from './indexedDB';

// Re-export hydrateFromNative — on Electron (server PC) it loads vault from disk;
// on LAN clients (browser) it's a no-op since data comes from the server API.
export const hydrateFromNative = async (): Promise<boolean> => {
  if (isLanClientMode()) return true; // LAN clients load via fetchVault(), nothing to hydrate
  return idbHydrate();
};

const SERVER_URL_KEY = 'ravi_erp_server_url';
const LAN_PORT       = 3001;

// ── Environment detection ────────────────────────────────────────────────────
const isElectron = typeof window !== 'undefined' &&
  (window as any).process?.type === 'renderer';

function getServerUrl(): string | null {
  try { return localStorage.getItem(SERVER_URL_KEY); } catch { return null; }
}

export function setServerUrl(ip: string) {
  const url = ip ? `http://${ip}:${LAN_PORT}` : '';
  try { localStorage.setItem(SERVER_URL_KEY, url); } catch { /* ignore */ }
  // Reconnect WebSocket with new URL
  connectWebSocket();
}

export function clearServerUrl() {
  try { localStorage.removeItem(SERVER_URL_KEY); } catch { /* ignore */ }
  disconnectWebSocket();
}

export function isLanClientMode(): boolean {
  if (isElectron) return false;
  if (getServerUrl()) return true;
  // If opened via an IP address (not localhost), it must be a LAN client —
  // auto-save the server URL so future loads skip mode-select entirely.
  if (typeof window !== 'undefined') {
    const h = window.location.hostname;
    if (h !== 'localhost' && h !== '127.0.0.1') {
      setServerUrl(h);   // persists to localStorage
      return true;
    }
  }
  return false;
}

// ── WebSocket (LAN client real-time sync) ────────────────────────────────────
let ws: WebSocket | null = null;
let wsCallbacks: Array<(key: string, data: any) => void> = [];
let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;

export function onDataPush(cb: (key: string, data: any) => void) {
  wsCallbacks.push(cb);
  return () => { wsCallbacks = wsCallbacks.filter(f => f !== cb); };
}


function connectWebSocket() {
  disconnectWebSocket();
  const url = getServerUrl();
  if (!url || isElectron) return;

  const token  = getToken();
  const wsUrl  = url.replace('http://', 'ws://');
  const wsUrlWithToken = token ? `${wsUrl}?token=${encodeURIComponent(token)}` : wsUrl;

  try {
    ws = new WebSocket(wsUrlWithToken);
    ws.onopen = () => {
      wsCallbacks.forEach(cb => cb('__connected__', null));
      // Flush any writes that happened while offline
      flushOfflineQueue();
      lanVaultCache = null;
      lanCacheTs = 0;
    };
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'shard' && msg.key) {
          if (lanVaultCache) lanVaultCache[msg.key] = msg.data;
          lanCacheTs = Date.now();
          wsCallbacks.forEach(cb => cb(msg.key, msg.data));
        }
        if (msg.type === 'reconnect') {
          lanVaultCache = null;
          lanCacheTs = 0;
          wsCallbacks.forEach(cb => cb('__reconnect__', null));
          flushOfflineQueue();
        }
        if (msg.type === 'server_shutdown') {
          wsCallbacks.forEach(cb => cb('__disconnected__', null));
        }
      } catch { /* malformed */ }
    };
    ws.onclose = () => {
      ws = null;
      wsCallbacks.forEach(cb => cb('__disconnected__', null));
      wsReconnectTimer = setTimeout(connectWebSocket, 5000);
    };
    ws.onerror = () => { ws?.close(); };
  } catch (e) { console.warn('[LAN] WebSocket error:', e); }
}

function disconnectWebSocket() {
  if (wsReconnectTimer) { clearTimeout(wsReconnectTimer); wsReconnectTimer = null; }
  if (ws) { ws.close(); ws = null; }
}

// ── LAN HTTP helpers ──────────────────────────────────────────────────────────
let lanVaultCache: Record<string, any> | null = null;
let lanCacheTs = 0;
const CACHE_TTL = 10_000; // 10 seconds


const TOKEN_KEY = 'ravi_erp_lan_token';

function getToken(): string {
  try { return localStorage.getItem(TOKEN_KEY) ?? ''; } catch { return ''; }
}

export function setLanToken(token: string) {
  try { localStorage.setItem(TOKEN_KEY, token.trim()); } catch { /* ignore */ }
  // Re-init WebSocket so it picks up the new token in its URL
  connectWebSocket();
}

export function clearLanToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const OFFLINE_QUEUE_KEY = 'ravi_erp_offline_queue';

interface OfflineEntry { key: string; data: any; ts: number; }
let offlineQueue: OfflineEntry[] = [];

function persistOfflineQueue() {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(offlineQueue.slice(-200)));
  } catch { /* ignore quota errors */ }
}

function loadOfflineQueue() {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (raw) offlineQueue = JSON.parse(raw);
  } catch { offlineQueue = []; }
}

async function flushOfflineQueue() {
  if (offlineQueue.length === 0) return;
  const url = getServerUrl();
  if (!url) return;

  const toFlush = [...offlineQueue];
  offlineQueue = [];
  persistOfflineQueue();

  // De-duplicate: last write for each key wins
  const latest: Record<string, OfflineEntry> = {};
  toFlush.forEach(e => { latest[e.key] = e; });

  const entries = Object.values(latest);
  console.log(`[LAN] Flushing ${entries.length} offline writes`);

  for (const entry of entries) {
    try {
      await pushShard(entry.key, entry.data);
    } catch {
      // If it fails again, put it back in the queue
      offlineQueue.push(entry);
    }
  }
  persistOfflineQueue();
}


async function fetchVault(): Promise<Record<string, any>> {
  const url = getServerUrl();
  if (!url) return {};
  const now = Date.now();
  if (lanVaultCache && now - lanCacheTs < CACHE_TTL) return lanVaultCache;
  try {
    const res = await fetch(`${url}/api/data`, {
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 401) {
      // Token is wrong — notify UI
      wsCallbacks.forEach(cb => cb('__auth_error__', null));
      return lanVaultCache ?? {};
    }
    const json = await res.json();
    lanVaultCache = json.data || {};
    lanCacheTs = now;
    return lanVaultCache!;
  } catch (e) {
    console.error('[LAN] fetchVault failed:', e);
    return lanVaultCache || {};
  }
}

/**
 * PUBLIC: Fetch the entire vault in ONE HTTP call.
 * Use this in App.tsx refreshData() instead of calling getItem() 40+ times.
 * Returns null on Electron/server mode (use IndexedDB directly).
 */
export async function getVaultSnapshot(): Promise<Record<string, any> | null> {
  if (!isLanClientMode()) return null;
  lanVaultCache = null; // force fresh fetch — login must see latest team data
  return fetchVault();
}


async function pushShard(key: string, data: any): Promise<void> {
  const url = getServerUrl();
  if (!url) return;
  try {
    const res = await fetch(`${url}/api/shard`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, data }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 401) {
      wsCallbacks.forEach(cb => cb('__auth_error__', null));
      return;
    }
    if (lanVaultCache) lanVaultCache[key] = data;
  } catch (e) {
    console.error('[LAN] pushShard failed — queuing for retry', e);
    offlineQueue.push({ key, data, ts: Date.now() });
    persistOfflineQueue();
  }
}

// ── Connection test ───────────────────────────────────────────────────────────
export async function testLanConnection(ip: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`http://${ip}:${LAN_PORT}/api/ping`, {
      signal: AbortSignal.timeout(4000),
    });
    const json = await res.json();
    return json.ok ? { ok: true } : { ok: false, error: 'Server replied but ping failed' };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Cannot reach server' };
  }
}

// ── Public API (drop-in replacement for indexedDB.ts exports) ─────────────────
export async function getItem<T>(key: string): Promise<T | null> {
  if (isLanClientMode()) {
    const vault = await fetchVault();
    return (key in vault ? vault[key] : null) as T | null;
  }
  return idbGet<T>(key);
}

export async function setItem(key: string, value: any): Promise<void> {
  if (isLanClientMode()) {
    await pushShard(key, value);
    return;
  }
  return idbSet(key, value);
}

/**
 * Batch-write multiple keys in one HTTP call (LAN clients) or sequential IndexedDB writes.
 * Avoids N round-trips when saving related data together (e.g. inventory + orders).
 */
export async function setItems(shards: Array<{ key: string; value: any }>): Promise<void> {
  if (shards.length === 0) return;
  if (isLanClientMode()) {
    const url = getServerUrl();
    if (!url) { for (const { key, value } of shards) await pushShard(key, value); return; }
    try {
      const body = JSON.stringify({ shards: shards.map(({ key, value }) => ({ key, data: value })) });
      await fetch(`${url}/api/shard/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(10000),
      });
      // Update local cache for all keys
      if (lanVaultCache) {
        for (const { key, value } of shards) lanVaultCache[key] = value;
        lanCacheTs = Date.now();
      }
    } catch (e) {
      // Fallback to individual writes
      for (const { key, value } of shards) await pushShard(key, value);
    }
    return;
  }
  // Electron / server mode — write each key to IndexedDB
  for (const { key, value } of shards) await idbSet(key, value);
}

// ── Auto-connect WebSocket on module load ─────────────────────────────────────
if (typeof window !== 'undefined') {
  connectWebSocket();

  // ── Electron server-PC: listen for lan:data-push from main process ───────
  // When a LAN client POSTs /api/shard, main.js notifies the Electron renderer
  // via win.webContents.send('lan:data-push'). We handle it here so the server
  // PC's own UI refreshes in real-time, just like any other client.
  if (isElectron) {
    try {
      const { ipcRenderer } = (window as any).require('electron');
      ipcRenderer.on('lan:data-push', (_: any, { key, data }: { key: string; data: any }) => {
        // Push into the same callback pipeline as the WebSocket path
        wsCallbacks.forEach(cb => cb(key, data));
      });
    } catch { /* not in Electron — ignore */ }
  }
}


export async function verifyLanToken(serverIp: string, token: string): Promise<boolean> {
  try {
    const url = `http://${serverIp}:3001/api/token-check`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    return res.status === 200;
  } catch {
    return false;
  }
}