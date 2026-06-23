export async function getItem<T>(key: string): Promise<T | null> {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : null;
}

export async function setItem(key: string, value: any): Promise<void> {
    localStorage.setItem(key, JSON.stringify(value));
}

export async function hydrateFromNative() {}

export async function getVaultSnapshot(): Promise<any> {
    return null;
}

export function onDataPush(callback: (key: string, data: any) => void) {
    return () => {};
}

export async function clearVault(): Promise<void> {
    localStorage.clear();
}
export function setServerUrl(url: string) {}
export function clearServerUrl() {}
export async function testLanConnection(url: string): Promise<{ ok: boolean, error?: string }> { return { ok: true }; }
export function isLanClientMode() { return false; }

