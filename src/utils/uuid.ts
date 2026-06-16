/**
 * Safe UUID generator.
 *
 * `crypto.randomUUID()` is only available in "secure contexts" — HTTPS or
 * localhost. When TexFlow is accessed over the LAN via the embedded Express
 * server (e.g. http://192.168.x.x:PORT), the browser considers that an
 * insecure origin and `crypto.randomUUID` is `undefined`. Calling it then
 * throws a TypeError, which silently breaks any handler that calls it
 * (e.g. "Save" buttons that generate a new record id).
 *
 * This helper falls back to `crypto.getRandomValues` (broadly available,
 * including insecure contexts) and finally to Math.random if neither exists.
 */
export function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // fall through to polyfill below
    }
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // Last-resort fallback (not cryptographically strong, but unique enough
  // for client-generated record IDs).
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Generates a short, uppercase, prefix-friendly id, e.g. uuidShort() → "A1B2C3D4E5F6" */
export function uuidShort(length = 12): string {
  return uuid().replace(/-/g, "").slice(0, length).toUpperCase();
}
