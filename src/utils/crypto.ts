import CryptoJS from 'crypto-js';

export async function hashPassword(password: string): Promise<string> {
  // Use crypto-js (pure JS) instead of crypto.subtle which is unavailable
  // on HTTP (non-secure) origins like LAN IP addresses (192.168.x.x:port)
  return CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
}
