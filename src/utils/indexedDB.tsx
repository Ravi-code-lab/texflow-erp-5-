import JSZip from 'jszip';

const DB_NAME = 'NexusERP_StateCache';
const DB_VERSION = 5; // v5: added colours + sizes stores (T-02)

export const STORES = {
  STAFF: 'staff_registry',
  INVENTORY: 'inventory_registry',
  ORDERS: 'orders_registry',
  PRODUCTION: 'production_registry',
  FINANCE: 'finance_ledger',
  MASTERS: 'masters_registry',
  CONFIG: 'system_config',
  AUDIT: 'audit_trails'
};

const isElectron = typeof window !== 'undefined' && (window as any).process && (window as any).process.type === 'renderer';
const ipc = isElectron ? (window as any).require('electron').ipcRenderer : null;

let dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        Object.values(STORES).forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName);
          }
        });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
};

const getStoreForKey = (key: string): string => {
    if (key === 'team') return STORES.STAFF;
    if (key === 'inventory') return STORES.INVENTORY;
    if (key === 'orders' || key === 'purchaseOrders') return STORES.ORDERS;
    if (
        key === 'production' || key === 'jobWorks' || key === 'designs' || key === 'slips' ||
        key === 'boms' || key === 'workOrders' || key === 'jobCards' || key === 'materialRequests' ||
        key === 'samples' || key === 'qualityReports' || key === 'inspections' ||
        key === 'stockEntries' || key === 'stockAudits' || key === 'transfers' || key === 'packs' ||
        key === 'projects' ||
        // CuttingRoom keys (previously used localStorage — now migrated to IndexedDB)
        key === 'cuttingOrders' || key === 'cuttingPlans' ||
        key === 'cuttingWastageLots' || key === 'stitchingWorkOrders' ||
        key === 'embroideryLaceJobs' || key === 'alterationReworkRecords' ||
        key === 'shortShipmentAlerts' ||
        // Bundle cards, packing lists, style collections
        key === 'bundleCards' || key === 'packingLists' || key === 'styleCollections' ||
        // Design recipe BOM trees & Embroidery print jobs
        key === 'bomTrees' || key === 'embroideryPrintJobs' ||
        // Style image registry
        key === 'styleImageRegistry' ||
        // Yarn, dyeing, fabric modules
        key === 'yarnLots' || key === 'yarnBlends' ||
        key === 'dyeingJobs' || key === 'fabricCostings' || key === 'costingSheets' ||
        // Design Catalog masters (T-02)
        key === 'colours' || key === 'sizes'
    ) return STORES.PRODUCTION;
    if (key === 'transactions' || key === 'loans' || key === 'leaves') return STORES.FINANCE;
    if (key === 'customers' || key === 'suppliers' || key === 'agents' || key === 'karigars' || key === 'gatePasses' || key === 'dispatches') return STORES.MASTERS;
    if (key === 'auditLogs' || key === 'productionLogs' || key === 'attendance') return STORES.AUDIT;
    return STORES.CONFIG;
};

// Keys that were previously (incorrectly) routed to STORES.CONFIG before the fix.
// getItem will check the correct store first, then fall back to CONFIG and re-save if found there.
const MFG_KEYS = new Set(['boms','workOrders','jobCards','materialRequests','samples',
  'qualityReports','inspections','stockEntries','stockAudits','transfers','packs','projects','leaves',
  'cuttingOrders','cuttingPlans',
  'bundleCards','packingLists','styleCollections',
  'styleImageRegistry',
  // Yarn, dyeing, fabric, dispatch — previously stored in CONFIG before being routed
  'yarnLots','yarnBlends','dyeingJobs','fabricCostings','costingSheets','dispatches',
  // Design Catalog masters (T-02)
  'colours','sizes']);

export const getItem = async <T>(key: string): Promise<T | null> => {
  try {
    const db = await openDB();
    const storeName = getStoreForKey(key);
    const result = await new Promise<T | null>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result !== undefined ? request.result : null);
      request.onerror = () => reject(request.error);
    });
    if (result !== null) return result;

    // Fallback: if this key may have been previously stored in CONFIG, try there
    if (MFG_KEYS.has(key) && storeName !== STORES.CONFIG) {
      const fallback = await new Promise<T | null>((resolve, reject) => {
        const transaction = db.transaction(STORES.CONFIG, 'readonly');
        const store = transaction.objectStore(STORES.CONFIG);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result !== undefined ? request.result : null);
        request.onerror = () => reject(request.error);
      });
      if (fallback !== null) {
        // Migrate to correct store silently
        await setItem(key, fallback);
        console.log(`[MIGRATE] Moved '${key}' from CONFIG → ${storeName}`);
      }
      return fallback;
    }
    return null;
  } catch (error) { return null; }
};

export const setItem = async (key: string, value: any, bypassNative: boolean = false): Promise<void> => {
  try {
    const db = await openDB();
    const storeName = getStoreForKey(key);
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    // Only push to physical vault if not bypassed (bypassed during initial hydration)
    if (isElectron && ipc && !bypassNative) {
        await ipc.invoke('db:save-shard', { key, data: value });
    }
  } catch (error) { console.error(`Write Exception for ${key}:`, error); }
};

export const hydrateFromNative = async (): Promise<boolean> => {
  if (!isElectron || !ipc) return true;
  try {
    const result = await ipc.invoke('db:load-all');
    
    if (result?.needsProvisioning) {
        const provision = await ipc.invoke('storage:select-path');
        if (provision?.success) return hydrateFromNative();
        return false;
    }
    
    if (result?.success && result.data) {
      const keys = Object.keys(result.data);
      if (keys.length === 0) return true;

      // Use the setItem with bypassNative=true to avoid writing back to disk during load
      for (const key of keys) {
        const val = result.data[key];
        if (val !== null) {
            await setItem(key, val, true);
        }
      }
      console.log(`[VAULT] Hydration confirmed. ${keys.length} shards verified.`);
      return true;
    }
    return !!result?.success;
  } catch (err) { 
    console.error("[VAULT] Critical Hydration Failure:", err);
    return false; 
  }
};

export const exportAllDataToZip = async (): Promise<void> => {
  const db = await openDB();
  const zip = new JSZip();
  const allData: Record<string, any> = {};

  for (const storeName of Object.values(STORES)) {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          allData[cursor.key as string] = cursor.value;
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  zip.file('backup_manifest.json', JSON.stringify({
    version: DB_VERSION,
    timestamp: new Date().toISOString(),
    keys: Object.keys(allData)
  }));
  zip.file('data.json', JSON.stringify(allData));

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `TexFlow_ERP_Backup_${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const restoreDataFromZip = async (file: File): Promise<boolean> => {
  try {
    const zip = await JSZip.loadAsync(file);
    const dataFile = zip.file('data.json');
    if (!dataFile) throw new Error('Invalid backup file: data.json mismatch');

    const content = await dataFile.async('text');
    const data = JSON.parse(content);
    const keys = Object.keys(data);

    // Bug #9 Fix: Pass bypassNative=true so each setItem writes only to IndexedDB
    // and does NOT fire an individual IPC 'db:save-shard' call per key.
    // Previously this caused N sequential IPC round-trips during restore, which was
    // slow and could race with the write queue in main.js.
    // After all keys are written to IndexedDB, do ONE bulk vault save via IPC.
    for (const key of keys) {
      await setItem(key, data[key], true);
    }

    // Single bulk write to the physical vault file
    if (isElectron && ipc) {
      // Collect all restored data and save in one shot
      const bulk: Record<string, any> = {};
      for (const key of keys) bulk[key] = data[key];
      await ipc.invoke('db:save-shard-bulk', bulk);
    }

    return true;
  } catch (err) {
    console.error("Restore Failure:", err);
    throw err;
  }
};
