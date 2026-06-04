import { BaseEntity } from '../types';
import { getDocTypeSchema } from './doctypes';

let _idCounter = Date.now();
function genId(prefix = 'DOC'): string {
  return `${prefix}-${(++_idCounter).toString(36).toUpperCase()}`;
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
