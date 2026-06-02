import { BaseEntity } from '../types';
import { getDocTypeSchema } from './doctypes';

let _idCounter = Date.now();
function genId(prefix = 'DOC'): string {
  return `${prefix}-${(++_idCounter).toString(36).toUpperCase()}`;
}

/**
 * Bug fix #6/#7: Safely resolve a supplier by name from the suppliers list.
 * Returns the supplier's stable `id` if found (case-insensitive), or throws a
 * descriptive error instead of silently falling back to a garbage 'SUP-XXX' string.
 *
 * Usage: const supplierId = resolveSupplierLink(suppliers, formData.supplierName);
 */
export function resolveSupplierLink(
  suppliers: Array<{ id: string; name: string }>,
  nameOrId: string | undefined
): string {
  if (!nameOrId?.trim()) {
    throw new Error('Supplier is required — please select a supplier before saving.');
  }
  const trimmed = nameOrId.trim();
  // First try exact id match (already resolved)
  const byId = suppliers.find(s => s.id === trimmed);
  if (byId) return byId.id;
  // Then try case-insensitive name match
  const byName = suppliers.find(s => s.name.toLowerCase() === trimmed.toLowerCase());
  if (byName) return byName.id;
  // Not found — reject loudly instead of storing a garbage fallback
  throw new Error(
    `Supplier "${trimmed}" not found. Please add this supplier in the Suppliers master first.`
  );
}

/**
 * Creates a new ERP document with schema defaults merged with overrides.
 * Accepts an optional third argument for extra fields (e.g. status).
 */
export function createERPDocument(
  view: string,
  overrides: Record<string, any> = {},
  extra: Record<string, any> = {}
): any {
  const schema = getDocTypeSchema(view);
  const defaults: Record<string, any> = {};

  if (schema) {
    for (const field of schema.fields) {
      if (field.default !== undefined) {
        defaults[field.fieldname] = field.default;
      }
    }
  }

  const now = new Date().toISOString();
  return {
    id: genId(schema?.namingSeriesPrefix?.replace(/-$/, '') || 'DOC'),
    doctype: schema?.name || view,
    docstatus: 0 as 0,
    createdAt: now,
    updatedAt: now,
    version: 1,
    ...defaults,
    ...overrides,
    ...extra,
  };
}

/**
 * Bug fix #8: Cryptographically secure share/document token generator.
 * Replaces any usage of Math.random().toString(36).substring(2,12) which
 * produces predictable, guessable tokens that can be enumerated by attackers.
 *
 * Uses the Web Crypto API (available in all modern browsers and Node 18+).
 * Returns a URL-safe base64 token of the requested byte length (default 16 bytes = 128 bits).
 *
 * Usage: const token = generateSecureToken();  // e.g. "aB3xZ9kRmT4wLpQ2"
 */
export function generateSecureToken(byteLength = 16): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    // Convert to URL-safe base64 (no padding)
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
  // Fallback for environments without Web Crypto (should not happen in modern browsers)
  console.warn('[generateSecureToken] Web Crypto unavailable — using fallback. Do not use in production.');
  return Array.from({ length: byteLength * 2 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}
