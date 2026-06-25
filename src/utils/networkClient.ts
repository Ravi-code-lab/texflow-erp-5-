/**
 * networkClient.ts
 *
 * Auto-detects LAN-client mode:
 *   - If the app is opened in a browser via a non-localhost IP/hostname,
 *     it is running as a LAN client served by the Electron server on port 3001.
 *     The server URL is derived from window.location.hostname automatically —
 *     no manual IP entry needed.
 *   - If a server URL was manually saved (via client-setup flow), that takes precedence.
 *   - In Electron (window.process.type exists) or localhost, runs in local mode.
 */

const LAN_PORT = 3001;
const LS_SERVER_URL_KEY = "ravi_erp_server_url";

// ── Auto-detect LAN client mode ───────────────────────────────────────────────

function detectServerUrl(): string | null {
  // 1. Manually saved URL takes priority (client-setup flow)
  try {
    const saved = localStorage.getItem(LS_SERVER_URL_KEY);
    if (saved) return saved;
  } catch { /* private browsing */ }

  // 2. Auto-detect: if running in a browser (not Electron) on a non-localhost IP,
  //    the Electron LAN server is serving us on port 3001 of that same host.
  if (typeof window !== "undefined") {
    const isElectron = !!(window as any).process?.type;
    if (!isElectron) {
      const host = window.location.hostname;
      const isLocal =
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "" ||
        host === "::1";
      if (!isLocal) {
        // Auto-derive server URL from the host we were served from
        return `http://${host}:${LAN_PORT}`;
      }
    }
  }

  return null;
}

function getBaseUrl(): string | null {
  return detectServerUrl();
}

function buildUrl(path: string): string {
  const base = getBaseUrl();
  if (!base) throw new Error("No server URL configured");
  return `${base}${path}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function setServerUrl(ip: string): void {
  const url = `http://${ip}:${LAN_PORT}`;
  try {
    localStorage.setItem(LS_SERVER_URL_KEY, url);
  } catch { /* private browsing */ }
}

export function clearServerUrl(): void {
  try {
    localStorage.removeItem(LS_SERVER_URL_KEY);
  } catch { /* ignore */ }
}

/**
 * Returns true when this browser tab is operating as a LAN client.
 * True if: manually configured server URL exists, OR auto-detected non-localhost host.
 */
export function isLanClientMode(): boolean {
  return Boolean(getBaseUrl());
}

/**
 * Ping the server's health endpoint.
 */
export async function testLanConnection(
  ip: string
): Promise<{ ok: boolean; error?: string }> {
  const url = `http://${ip}:${LAN_PORT}/api/ping`;
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false, error: `Server responded with HTTP ${res.status}` };
    const json = await res.json();
    if (json?.ok || json?.status === "ok") return { ok: true };
    return { ok: false, error: "Unexpected server response" };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Cannot reach server" };
  }
}

/**
 * Read a single key.
 * - LAN mode   → GET /api/shard/:key
 * - Local mode → localStorage
 */
export async function getItem<T>(key: string): Promise<T | null> {
  if (isLanClientMode()) {
    try {
      const res = await fetch(buildUrl(`/api/shard/${encodeURIComponent(key)}`), {
        signal: AbortSignal.timeout(8000),
      });
      if (res.status === 404) return null;
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
  } catch {
    return null;
  }
}

/**
 * Write a single key.
 * - LAN mode   → POST /api/shard  { key, data }
 * - Local mode → localStorage
 */
export async function setItem<T>(key: string, value: T): Promise<void> {
  if (isLanClientMode()) {
    try {
      await fetch(buildUrl("/api/shard"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, data: value }),
        signal: AbortSignal.timeout(8000),
      });
    } catch (err) {
      console.warn(`[networkClient] setItem("${key}") failed:`, err);
    }
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage full */ }
}

/**
 * Fetch the entire vault in one shot.
 * - LAN mode   → GET /api/data
 * - Local mode → null
 */
export async function getVaultSnapshot(): Promise<Record<string, unknown> | null> {
  if (!isLanClientMode()) return null;
  try {
    const res = await fetch(buildUrl("/api/data"), {
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return (json?.data ?? null) as Record<string, unknown> | null;
  } catch (err) {
    console.warn("[networkClient] getVaultSnapshot() failed:", err);
    return null;
  }
}

/**
 * Subscribe to real-time data pushes from the server via SSE.
 * Returns an unsubscribe function.
 */
export function onDataPush(
  callback: (key: string, data: unknown) => void
): () => void {
  if (!isLanClientMode()) return () => {};

  let es: EventSource | null = null;
  let closed = false;

  function connect() {
    if (closed) return;
    try {
      es = new EventSource(buildUrl("/api/events"));
      es.addEventListener("shard", (e: MessageEvent) => {
        try {
          const { key, data } = JSON.parse(e.data);
          callback(key, data);
        } catch { /* malformed */ }
      });
      es.addEventListener("connected", () => {
        callback("__connected__", null);
      });
      es.onerror = () => {
        es?.close();
        if (!closed) setTimeout(connect, 5000);
      };
    } catch {
      // SSE not supported — ignore
    }
  }

  connect();
  setTimeout(() => callback("__connected__", null), 300);

  return () => {
    closed = true;
    es?.close();
  };
}

export async function clearVault(): Promise<void> {
  try { localStorage.clear(); } catch { /* ignore */ }
}

export async function hydrateFromNative(): Promise<void> {}
