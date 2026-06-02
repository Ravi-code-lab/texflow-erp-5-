import JSZip from 'jszip';

const DB_NAME = 'NexusERP_StateCache';
const DB_VERSION = 7;

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
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        db.onclose = () => {
          dbPromise = null;
        };
        db.onerror = () => {
          dbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        dbPromise = null;
        reject(request.error);
      };
      request.onblocked = () => {
        dbPromise = null;
        reject(new Error('IndexedDB blocked'));
      };
    });
  }
  return dbPromise;
};

const getStoreForKey = (key: string): string => {
    // ── STAFF ──────────────────────────────────────────────────────────────
    if (key === 'team') return STORES.STAFF;

    // ── INVENTORY ──────────────────────────────────────────────────────────
    if (
        key === 'inventory' ||
        key === 'stockAudits' ||
        key === 'transfers' ||
        key === 'packs' ||
        key === 'packingSlips' ||
        key === 'yarnLots' ||
        key === 'dyeingJobs' ||
        key === 'fabricCostings' ||
        key === 'dispatchEntries' ||
        key === 'wasteLogs' ||
        key === 'brokerLogs' ||
        key === 'marginCostings'
    ) return STORES.INVENTORY;

    // ── ORDERS ─────────────────────────────────────────────────────────────
    if (
        key === 'orders' ||
        key === 'purchaseOrders' ||
        key === 'quotations' ||
        key === 'purchaseInvoices' ||
        key === 'materialRequests' ||
        key === 'supplierQuotations' ||
        key === 'posInvoices' ||
        key === 'timesheets' ||
        key === 'expenseClaims' ||
        key === 'supportTickets' ||
        key === 'vehicles'
    ) return STORES.ORDERS;

    // ── PRODUCTION ─────────────────────────────────────────────────────────
    if (
        key === 'production' ||
        key === 'jobWorks' ||
        key === 'designs' ||
        key === 'slips' ||
        key === 'samples' ||
        key === 'qualityReports' ||
        key === 'inspections' ||
        key === 'machines' ||
        key === 'texflow_manufacturing_pipeline_batches' ||
        key === 'texflow_garment_manufacturing_setup'
    ) return STORES.PRODUCTION;

    // ── FINANCE ────────────────────────────────────────────────────────────
    if (
        key === 'transactions' ||
        key === 'loans' ||
        key === 'cheques' ||
        key === 'budgets' ||
        key === 'payrollAdjustments' ||
        key === 'coa_accounts_v2' ||
        key === 'coa_company_v2' ||
        key === 'coa_journals_v2'
    ) return STORES.FINANCE;

    // ── MASTERS ────────────────────────────────────────────────────────────
    if (
        key === 'customers' ||
        key === 'suppliers' ||
        key === 'agents' ||
        key === 'karigars' ||
        key === 'gatePasses' ||
        key === 'leads' ||
        key === 'projects' ||
        key === 'attendance' ||
        key === 'leaves' ||
        key === 'maintenance' ||
        key === 'gallery'
    ) return STORES.MASTERS;

    // ── AUDIT ──────────────────────────────────────────────────────────────
    if (key === 'auditLogs' || key === 'productionLogs') return STORES.AUDIT;

    // ── CONFIG (settings, UI, notifications, tasks, dynamic docs) ──────────
    if (
        key === 'uiPrefs' ||
        key === 'companyInfo' ||
        key === 'notifications' ||
        key === 'tasks' ||
        key === 'dynamicDocuments' ||
        key === 'erpnext_custom_fields' ||
        key === 'texflow_features' ||
        key === 'texflow_invoice_config' ||
        key === 'texflow_shopify_config' ||
        key === 'texflow_security_config' ||
        key === 'texflow_communication_config' ||
        key === 'texflow_advanced_config' ||
        key === 'texflow_report_builder_saved_reports'
    ) return STORES.CONFIG;

    // Default fallback
    return STORES.CONFIG;
};

export const getItem = async <T>(key: string): Promise<T | null> => {
  try {
    const db = await openDB();
    const storeName = getStoreForKey(key);
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result !== undefined ? request.result : null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) { 
    try {
      const val = localStorage.getItem(key);
      if (val) return JSON.parse(val);
    } catch(e) {}
    return null; 
  }
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
  } catch (error) { 
    console.error(`Write Exception for ${key}:`, error);
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch(e) {}
  }
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

    for (const key of keys) {
      await setItem(key, data[key]);
    }
    return true;
  } catch (err) {
    console.error("Restore Failure:", err);
    throw err;
  }
};

export const clearAllDataFlag = async (): Promise<void> => {
  const db = await openDB();
  for (const storeName of Object.values(STORES)) {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  localStorage.clear();

  // On Electron (server PC), also wipe the physical vault shards from disk.
  // Without this, hydrateFromNative() re-loads the old team data on next boot,
  // which prevents the seed admin/admin123 login from working after a factory reset.
  if (isElectron && ipc) {
    try {
      await ipc.invoke('db:factory-reset');
    } catch (e) {
      console.error('[FACTORY RESET] IPC call failed:', e);
    }
  }
};
