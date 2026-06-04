import { AuditLog, BaseEntity } from '../types';

/**
 * Stamps a new document with created-by metadata.
 */
export function prepareDocumentCreate<T extends Record<string, any>>(
  doc: T,
  user: string = 'Administrator'
): T {
  const now = new Date().toISOString();
  return {
    ...doc,
    createdAt: doc.createdAt || now,
    updatedAt: now,
    updatedBy: user,
    version: 1,
    docstatus: doc.docstatus ?? 0,
    deleted: false,
  };
}

/**
 * Stamps an existing document with updated-by metadata.
 */
export function prepareDocumentUpdate<T extends Record<string, any>>(
  doc: T,
  _previous?: T,
  user: string = 'Administrator'
): T {
  return {
    ...doc,
    updatedAt: new Date().toISOString(),
    updatedBy: user,
    version: (doc.version ?? 1) + 1,
  };
}

/**
 * Soft-deletes a document by setting the deleted flag.
 */
export function prepareDocumentDelete<T extends Record<string, any>>(
  doc: T,
  user: string = 'Administrator'
): T {
  return {
    ...doc,
    deleted: true,
    updatedAt: new Date().toISOString(),
    updatedBy: user,
    version: (doc.version ?? 1) + 1,
  };
}

/**
 * Creates an audit log entry for a document action.
 */
export function createAuditLog(
  entityType: string,
  entityId: string,
  action: AuditLog['action'],
  previousState?: any,
  newState?: any,
  user: string = 'Administrator'
): AuditLog {
  const now = new Date().toISOString();
  return {
    id: `AUDIT-${Date.now().toString(36).toUpperCase()}`,
    entityType,
    entityId,
    action,
    previousState,
    newState,
    timestamp: now,
    createdAt: now,
    updatedAt: now,
    updatedBy: user,
  };
}
