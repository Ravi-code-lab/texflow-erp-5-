import { generateNextId, NumberingSeriesConfig } from './numberingSeries';

// Global numbering config reference — set once from App.tsx
let _seriesConfig: NumberingSeriesConfig | null = null;
let _onSeriesUpdate: ((doctype: string, nextNumber: number) => void) | null = null;

export function setNumberingConfig(
  config: NumberingSeriesConfig,
  onUpdate: (doctype: string, nextNumber: number) => void
) {
  _seriesConfig = config;
  _onSeriesUpdate = onUpdate;
}

function generateId(doctype: string): string {
  if (_seriesConfig) {
    // Try exact match, then case-insensitive match
    const rule =
      _seriesConfig[doctype] ||
      Object.values(_seriesConfig).find(r => r.doctype === doctype);
    if (rule && rule.enabled) {
      const { id, nextNumber } = generateNextId(rule);
      _onSeriesUpdate?.(rule.doctype, nextNumber);
      return id;
    }
  }
  // Fallback: short random ID (keeps backward compat)
  return `${doctype.slice(0, 3)}-${Date.now().toString(36).toUpperCase()}`;
}

export function prepareDocumentCreate(item: any, user: string) {
  const id = item.id || generateId(item.doctype || '');
  return {
    ...item,
    id,
    createdAt: new Date().toISOString(),
    createdBy: user,
  };
}

export function prepareDocumentUpdate(item: any, previous: any, user: string) {
  return { ...item, updatedAt: new Date().toISOString(), updatedBy: user };
}

export function prepareDocumentDelete(item: any, user?: string) {
  return { ...item, deleted: true, deletedBy: user, deletedAt: new Date().toISOString() };
}

export function createAuditLog(
  entityType: string,
  entityId: string,
  action: string,
  previousState: any,
  newState: any,
  user: string
) {
  return {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    entityType,
    entityId,
    action,
    previousState,
    newState,
    user,
  };
}
