import SHA256 from "crypto-js/sha256";

export async function hashPassword(password: string): Promise<string> {
  // If crypto.subtle exists and is a secure context, we can use it
  if (typeof crypto !== "undefined" && crypto.subtle && crypto.subtle.digest) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch {
      // fallback
    }
  }

  // Fallback for non-HTTPS LAN clients
  return SHA256(password).toString();
}
