import { AuditLog, BaseEntity } from '../types';
import { getDefaultDocStatus } from './documentEngine';

type AuditAction = AuditLog['action'];

const nowIso = () => new Date().toISOString();

const resolveDocStatus = (doc: BaseEntity & Record<string, any>) =>
  getDefaultDocStatus(doc.status);

export const prepareDocumentCreate = <T extends BaseEntity & Record<string, any>>(
  doc: T,
  userName = 'System'
) => {
  const timestamp = nowIso();

  return {
    ...doc,
    version: doc.version || 1,
    createdAt: doc.createdAt || timestamp,
    updatedAt: timestamp,
    updatedBy: userName,
    docstatus: doc.docstatus ?? resolveDocStatus(doc),
  } as T;
};

export const prepareDocumentUpdate = <T extends BaseEntity & Record<string, any>>(
  nextDoc: T,
  previousDoc?: T,
  userName = 'System'
) => {
  const timestamp = nowIso();

  return {
    ...nextDoc,
    createdAt: nextDoc.createdAt || previousDoc?.createdAt || timestamp,
    updatedAt: timestamp,
    updatedBy: userName,
    version: (previousDoc?.version || nextDoc.version || 0) + 1,
    docstatus: resolveDocStatus(nextDoc),
  } as T;
};

export const prepareDocumentDelete = <T extends BaseEntity & Record<string, any>>(
  doc: T,
  userName = 'System'
) =>
  prepareDocumentUpdate(
    {
      ...doc,
      deleted: true,
      docstatus: 2,
    },
    doc,
    userName
  );

export const createAuditLog = (
  entityType: string,
  entityId: string,
  action: AuditAction,
  previousState?: unknown,
  newState?: unknown,
  userName = 'System'
): AuditLog => {
  const timestamp = nowIso();

  return {
    id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    entityType,
    entityId,
    action,
    previousState,
    newState,
    timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    updatedBy: userName,
    doctype: 'Version',
    version: 1,
  };
};

