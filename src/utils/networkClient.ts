/**
 * networkClient.ts — TexFlow ERP data transport layer
 *
 * Three modes, auto-detected at runtime:
 *
 *  A) Electron (server PC)   window.process.type === 'renderer'
 *     → reads/writes via IPC (db:save-shard / db:load-all) → texflow_vault.json
 *     → login is done client-side (no JWT needed, data is local)
 *
 *  B) LAN Client             browser opened via non-localhost IP
 *     → login hits POST /api/auth/login → receives JWT
 *     → JWT stored in localStorage, injected as Bearer token on every request
 *     → auto-revalidated via GET /api/auth/me on page reload
 *
 *  C) Dev / standalone       localhost browser
 *     → localStorage only
 */

const LAN_PORT = 3001;
const LS_SERVER_URL_KEY = 'ravi_erp_server_url';
const LS_TOKEN_KEY      = 'ravi_erp_jwt';

// ── Force-logout event (fired when server returns 401 mid-session) ────────────
type LogoutListener = () => void;
const _logoutListeners: LogoutListener[] = [];

export function onForceLogout(fn: LogoutListener): () => void {
  _logoutListeners.push(fn);
  return () => {
    const idx = _logoutListeners.indexOf(fn);
    if (idx >= 0) _logoutListeners.splice(idx, 1);
  };
}

function _triggerForceLogout(): void {
  clearToken();
  _logoutListeners.forEach(fn => { try { fn(); } catch { /* ignore */ } });
}

// ── Mode detection ────────────────────────────────────────────────────────────

function isElectron(): boolean {
  return typeof window !== 'undefined' && !!(window as any).process?.type;
}

function getServerUrl(): string | null {
  try {
    const saved = localStorage.getItem(LS_SERVER_URL_KEY);
    if (saved) return saved;
  } catch { /* private browsing */ }

  if (typeof window !== 'undefined' && !isElectron()) {
    const host = window.location.hostname;
    const isLocal = !host || host === 'localhost' || host === '127.0.0.1' || host === '::1';
    if (!isLocal) return `http://${host}:${LAN_PORT}`;
  }
  return null;
}

export function isLanClientMode(): boolean {
  return !isElectron() && Boolean(getServerUrl());
}

// ── Token management ──────────────────────────────────────────────────────────

export function getToken(): string | null {
  try { return localStorage.getItem(LS_TOKEN_KEY); } catch { return null; }
}

export function setToken(token: string): void {
  try { localStorage.setItem(LS_TOKEN_KEY, token); } catch { /* private */ }
}

export function clearToken(): void {
  try { localStorage.removeItem(LS_TOKEN_KEY); } catch { /* ignore */ }
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// ── IPC helpers (Electron server mode) ───────────────────────────────────────

function ipc(): any {
  return (window as any).require?.('electron')?.ipcRenderer;
}

let _vaultCache: Record<string, unknown> | null = null;

async function ipcLoadAll(): Promise<Record<string, unknown>> {
  if (_vaultCache) return _vaultCache;
  try {
    const result = await ipc()?.invoke('db:load-all');
    if (result?.success && result.data) {
      _vaultCache = result.data as Record<string, unknown>;
      return _vaultCache;
    }
  } catch (e) { console.warn('[networkClient] IPC db:load-all failed:', e); }
  return {};
}

async function ipcSaveShard(key: string, data: unknown): Promise<void> {
  if (_vaultCache) _vaultCache[key] = data;
  try {
    await ipc()?.invoke('db:save-shard', { key, data });
  } catch (e) {
    console.warn('[networkClient] IPC db:save-shard failed:', e);
    try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* full */ }
  }
}

// ── REST helpers ──────────────────────────────────────────────────────────────

function buildUrl(path: string): string {
  const base = getServerUrl();
  if (!base) throw new Error('No server URL configured');
  return `${base}${path}`;
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = buildUrl(path);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...(init.headers as Record<string, string> || {}),
  };
  return fetch(url, { ...init, headers, signal: init.signal ?? AbortSignal.timeout(10000) });
}

// ── Public API ────────────────────────────────────────────────────────────────

export function setServerUrl(ip: string): void {
  try { localStorage.setItem(LS_SERVER_URL_KEY, `http://${ip}:${LAN_PORT}`); } catch { /* private */ }
}

export function clearServerUrl(): void {
  try { localStorage.removeItem(LS_SERVER_URL_KEY); } catch { /* ignore */ }
}

export async function testLanConnection(ip: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`http://${ip}:${LAN_PORT}/api/ping`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const json = await res.json();
    return json?.ok ? { ok: true } : { ok: false, error: 'Unexpected response' };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Cannot reach server' };
  }
}

/**
 * LAN login — POST /api/auth/login with pre-hashed password.
 * Returns { success, user, token?, mustChangePassword? } or { success: false, error }.
 */
export async function lanLogin(
  username: string,
  passwordHash: string
): Promise<{ success: boolean; user?: any; mustChangePassword?: boolean; error?: string }> {
  if (!isLanClientMode()) return { success: false, error: 'Not in LAN client mode' };
  try {
    const res = await fetch(buildUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, passwordHash }),
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json();
    if (res.status === 401) return { success: false, error: 'Invalid username or password.' };
    if (!res.ok) return { success: false, error: json?.error || `Server error ${res.status}` };
    if (json.token) setToken(json.token);
    return { success: true, user: json.user, mustChangePassword: json.mustChangePassword };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Cannot reach server' };
  }
}

/**
 * Re-authenticate from stored JWT on page reload.
 * Returns the user if still valid, null if token is expired/invalid.
 */
export async function revalidateSession(): Promise<{ user: any; mustChangePassword?: boolean } | null> {
  if (!isLanClientMode()) return null;
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(buildUrl('/api/auth/me'), {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) { if (res.status === 401) _triggerForceLogout(); else clearToken(); return null; }
    const json = await res.json();
    return json.success ? { user: json.user, mustChangePassword: json.mustChangePassword } : null;
  } catch {
    return null; // server unreachable — don't clear token, let user retry
  }
}

export async function getItem<T>(key: string): Promise<T | null> {
  if (isElectron()) {
    const vault = await ipcLoadAll();
    return (vault[key] ?? null) as T | null;
  }
  if (isLanClientMode()) {
    try {
      const res = await apiFetch(`/api/shard/${encodeURIComponent(key)}`);
      if (res.status === 404) return null;
      if (res.status === 401) { _triggerForceLogout(); return null; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return (json?.data ?? null) as T | null;
    } catch (err) {
      console.warn(`[networkClient] getItem("${key}") failed:`, err);
      return null;
    }
  }
  try {
    const val = localStorage.getItem(key);
    return val ? (JSON.parse(val) as T) : null;
  } catch { return null; }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  if (isElectron()) { await ipcSaveShard(key, value); return; }
  if (isLanClientMode()) {
    try {
      await apiFetch('/api/shard', {
        method: 'POST',
        body: JSON.stringify({ key, data: value }),
      });
    } catch (err) { console.warn(`[networkClient] setItem("${key}") failed:`, err); }
    return;
  }
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* full */ }
}

export async function getVaultSnapshot(): Promise<Record<string, unknown> | null> {
  if (isElectron()) return await ipcLoadAll();
  if (isLanClientMode()) {
    try {
      const res = await apiFetch('/api/data');
      if (res.status === 401) { _triggerForceLogout(); return null; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return (json?.data ?? null) as Record<string, unknown> | null;
    } catch (err) {
      console.warn('[networkClient] getVaultSnapshot failed:', err);
      return null;
    }
  }
  return null;
}

export function onDataPush(callback: (key: string, data: unknown) => void): () => void {
  if (isElectron()) {
    const renderer = ipc();
    if (!renderer) return () => {};
    const handler = (_: any, { key, data }: { key: string; data: unknown }) => callback(key, data);
    renderer.on('lan:data-push', handler);
    return () => renderer.removeListener('lan:data-push', handler);
  }
  if (isLanClientMode()) {
    // BUG 6 FIX: include JWT token in WS URL so server can verify auth
    const wsBase = buildUrl('').replace(/^http/, 'ws');
    let ws: WebSocket | null = null;
    let closed = false;
    function connect() {
      if (closed) return;
      try {
        // Re-read token each reconnect in case it was refreshed
        const _tok = getToken();
        const _url = _tok ? `${wsBase}?token=${encodeURIComponent(_tok)}` : wsBase;
        ws = new WebSocket(_url);
        ws.onmessage = (e) => {
          try {
            const { type, key, data } = JSON.parse(e.data);
            if (type === 'shard' && key) callback(key, data);
            if (type === 'reconnect') callback('__connected__', null);
          } catch { /* malformed */ }
        };
        ws.onopen  = () => callback('__connected__', null);
        ws.onerror = () => ws?.close();
        ws.onclose = () => { if (!closed) setTimeout(connect, 5000); };
      } catch { /* WS not supported */ }
    }
    connect();
    return () => { closed = true; ws?.close(); };
  }
  return () => {};
}

export async function clearVault(): Promise<void> {
  _vaultCache = null;
  clearToken();
  try { localStorage.clear(); } catch { /* ignore */ }
}

export async function hydrateFromNative(): Promise<void> {}
