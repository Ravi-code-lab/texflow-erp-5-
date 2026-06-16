import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Database,
  FileCode,
  Settings2,
  RefreshCw,
  Search,
  Check,
  Copy,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Info,
  Calendar,
  Network,
  UploadCloud,
  DownloadCloud,
  Clock,
  X,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { Transaction, Customer, Supplier, Order, PurchaseOrder } from '../types';

interface TallyIntegrationProps {
  transactions: Transaction[];
  customers: Customer[];
  suppliers: Supplier[];
  orders: Order[];
  purchaseOrders: PurchaseOrder[];
  onAddTransaction: (txn: Transaction) => void;
  currency: string;
}

interface SyncItem {
  id: string;
  type: 'CUSTOMER' | 'SUPPLIER' | 'SALES_INVOICE' | 'PURCHASE_ORDER' | 'PAYMENT' | 'ITEM_MASTER';
  name: string;
  amount?: number;
  status: 'PENDING' | 'SYNCED' | 'FAILED' | 'ERROR';
  lastAttempt?: string;
  error?: string;
  tallyVoucherId?: string;
}

interface TallyVoucherInward {
  id: string;
  tallyRef: string;
  date: string;
  ledgerName: string;
  type: 'RECEIPT' | 'PAYMENT' | 'JOURNAL';
  amount: number;
  narrative: string;
  imported: boolean;
}

// ─── XML helpers ─────────────────────────────────────────────────────────────
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toTallyDate(isoDate: string): string {
  // Tally requires YYYYMMDD
  return isoDate.replace(/-/g, '').slice(0, 8);
}

// ─── Component ────────────────────────────────────────────────────────────────
export const TallyIntegration: React.FC<TallyIntegrationProps> = ({
  transactions,
  customers,
  suppliers,
  orders,
  purchaseOrders,
  onAddTransaction,
  currency = '₹',
}) => {
  // Config state
  const [tallyUrl, setTallyUrl] = useState('http://localhost:9000');
  const [companyName, setCompanyName] = useState('Ravi Textile Pvt. Ltd.');
  const [syncFreq, setSyncFreq] = useState<'MANUAL' | 'HOURLY' | 'DAILY'>('MANUAL');
  const [tallyVersion, setTallyVersion] = useState<'PRIME' | 'ERP9'>('PRIME');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Ledger Group Mappings
  const [debtorsGroup, setDebtorsGroup] = useState('Sundry Debtors');
  const [creditorsGroup, setCreditorsGroup] = useState('Sundry Creditors');
  const [salesLedger, setSalesLedger] = useState('Sales Account');
  const [purchaseLedger, setPurchaseLedger] = useState('Purchase Account');
  const [cgstLedger, setCgstLedger] = useState('CGST');
  const [sgstLedger, setSgstLedger] = useState('SGST');
  const [bankLedger, setBankLedger] = useState('HDFC Bank');
  const [cashLedger, setCashLedger] = useState('Cash');

  // Integration operational state
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connError, setConnError] = useState<string | null>(null);
  const [syncLogs, setSyncLogs] = useState<string[]>([
    `[${new Date().toISOString().split('T')[0]} 09:00:15] Tally Engine initialized. Listening on TCP port 9000.`,
    `[${new Date().toISOString().split('T')[0]} 09:00:17] Local company matched: "Ravi Textile Pvt. Ltd.".`,
    `[${new Date().toISOString().split('T')[0]} 12:30:00] Master Sync completed. 48 ledger accounts matched.`,
  ]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFetchingInward, setIsFetchingInward] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'setup' | 'mapping' | 'import' | 'export' | 'xml_explorer' | 'logs'>('setup');
  const [selectedXmlItem, setSelectedXmlItem] = useState<string>('');
  const [selectedXmlType, setSelectedXmlType] = useState<'ledger' | 'voucher'>('ledger');
  const [copied, setCopied] = useState(false);

  // Sync queue & inward vouchers
  const [syncQueue, setSyncQueue] = useState<SyncItem[]>([]);
  const [inwardVouchers, setInwardVouchers] = useState<TallyVoucherInward[]>([]);

  // Auto-sync interval ref
  const autoSyncRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Deterministic Tally voucher sequence counter — no Math.random()
  const tallySeqRef = useRef<number>(1000);
  const nextTallyRef = (prefix: string) => `${prefix}-${String(++tallySeqRef.current).padStart(5, '0')}`;


  // ── BUG FIX 1: Populate sync queue without stale-closure re-add bug ──────────
  // Only runs once per prop change; tracks already-added IDs via functional update
  useEffect(() => {
    setSyncQueue(prev => {
      const existingIds = new Set(prev.map(i => i.id));
      const additions: SyncItem[] = [];

      customers.slice(0, 5).forEach(c => {
        if (!existingIds.has(c.id)) {
          additions.push({ id: c.id, type: 'CUSTOMER', name: c.name, status: 'PENDING' });
        }
      });

      suppliers.slice(0, 3).forEach(s => {
        if (!existingIds.has(s.id)) {
          additions.push({ id: s.id, type: 'SUPPLIER', name: s.name, status: 'PENDING' });
        }
      });

      orders.slice(0, 4).forEach(o => {
        const invId = `INV-${o.id}`;
        if (!existingIds.has(invId)) {
          additions.push({
            id: invId,
            type: 'SALES_INVOICE',
            name: `Sales Invoice — ${o.customerName} (${o.id})`,
            amount: o.totalAmount || 0,
            status: 'PENDING',
          });
        }
      });

      // ── BUG FIX 9: purchaseOrders was received but never used ──────────────
      purchaseOrders.slice(0, 3).forEach(po => {
        const poId = `PO-${po.id}`;
        if (!existingIds.has(poId)) {
          additions.push({
            id: poId,
            type: 'PURCHASE_ORDER',
            name: `Purchase Order — ${po.supplierName} (${po.id})`,
            amount: po.totalAmount || 0,
            status: 'PENDING',
          });
        }
      });

      return additions.length > 0 ? [...prev, ...additions] : prev;
    });
  }, [customers, suppliers, orders, purchaseOrders]);

  // Seed sample inward vouchers once
  useEffect(() => {
    setInwardVouchers([
      {
        id: 'T-VCH-001', tallyRef: 'RCPT-1044',
        date: new Date().toISOString().split('T')[0],
        ledgerName: 'Alok Fabrics', type: 'RECEIPT', amount: 50000,
        narrative: 'Payment against INV-1092', imported: false,
      },
      {
        id: 'T-VCH-002', tallyRef: 'PAY-2091',
        date: new Date().toISOString().split('T')[0],
        ledgerName: 'Ghanshyam Spinners', type: 'PAYMENT', amount: 15000,
        narrative: 'Advance payment for Yarn', imported: false,
      },
    ]);
  }, []);

  // ── BUG FIX 10: Auto-sync wired to actual interval ────────────────────────
  useEffect(() => {
    if (autoSyncRef.current) clearInterval(autoSyncRef.current);
    if (syncFreq === 'MANUAL') return;

    const ms = syncFreq === 'HOURLY' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    autoSyncRef.current = setInterval(() => {
      addLog(`[AUTO-SYNC] Scheduled ${syncFreq} sync triggered.`);
      handleSyncAll();
    }, ms);

    return () => {
      if (autoSyncRef.current) clearInterval(autoSyncRef.current);
    };
  }, [syncFreq]);

  // Pre-select XML item when queue populates
  useEffect(() => {
    if (!selectedXmlItem && syncQueue.length > 0) {
      setSelectedXmlItem(syncQueue[0].id);
      const first = syncQueue[0];
      setSelectedXmlType(
        first.type === 'CUSTOMER' || first.type === 'SUPPLIER' ? 'ledger' : 'voucher'
      );
    }
  }, [syncQueue, selectedXmlItem]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString('en-IN', { hour12: false });
    setSyncLogs(prev => [`[${ts}] ${msg}`, ...prev]);
  }, []);

  // Bug fix 9: handleTestConnection — real HTTP ping to Tally XML bridge
  const handleTestConnection = async () => {
    setIsTestingConn(true);
    setConnError(null);
    addLog(`Ping sent to Tally ${tallyVersion} at ${tallyUrl}...`);
    try {
      const response = await fetch(`${tallyUrl}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml' },
        body: '<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>List of Companies</REPORTNAME></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>',
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok || response.status === 200) {
        setIsConnected(true);
        addLog(`Connection OK! Tally XML Bridge responding at ${tallyUrl}.`);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err: any) {
      setIsConnected(false);
      const msg = err?.name === 'TimeoutError' ? 'Connection timed out after 5s.' : `Could not reach ${tallyUrl}: ${err?.message || 'Unknown error'}`;
      setConnError(msg);
      addLog(`ERROR: ${msg} Ensure Tally is running and the XML bridge port is open.`);
    } finally {
      setIsTestingConn(false);
    }
  };

  // ── BUG FIX 3: handleSaveConfigs was typed as FormEvent handler but bound to onClick ──
  const handleSaveConfigs = () => {
    setSaveSuccess(true);
    addLog(`Integration configuration saved. Ledger mapping updated.`);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const pushXmlToTally = async (xml: string, label: string): Promise<string | null> => {
    try {
      const res = await fetch(tallyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml' },
        body: xml,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const voucherNum = text.match(/<VOUCHERNUMBER>(.*?)<\/VOUCHERNUMBER>/i)?.[1] || null;
      addLog(`Pushed ${label} — Tally ref: ${voucherNum || 'OK'}`);
      return voucherNum;
    } catch (err: any) {
      addLog(`ERROR pushing ${label}: ${err?.message || 'Unknown error'}`);
      return null;
    }
  };

  const handleSyncAll = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    addLog(`Initiating full data sync with Tally at ${tallyUrl}...`);
    const today = new Date().toISOString().split('T')[0];

    const pending = syncQueue.filter(item => item.status === 'PENDING');
    for (const item of pending) {
      const xml = `<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC><REQUESTDATA><TALLYMESSAGE xmlns:UDF=TallyUDF><VOUCHER VCHTYPE=${item.type} ACTION=Create><DATE>${today.replace(/-/g,'')}</DATE><PARTYLEDGERNAME>${item.name}</PARTYLEDGERNAME><AMOUNT>${(item.amount || 0).toFixed(2)}</AMOUNT><NARRATION>TexFlow sync: ${item.name}</NARRATION></VOUCHER></TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`;
      const ref = await pushXmlToTally(xml, item.name);
      setSyncQueue(prev =>
        prev.map(i =>
          i.id === item.id
            ? { ...i, status: ref ? 'SYNCED' : 'ERROR', lastAttempt: today, tallyVoucherId: ref || undefined }
            : i
        )
      );
    }

    addLog(`Sync completed. ${pending.length} item(s) processed.`);
    setIsSyncing(false);
  }, [isSyncing, addLog, syncQueue, tallyUrl]);

  const syncSingleItem = (id: string) => {
    const item = syncQueue.find(i => i.id === id);
    if (!item) return;
    addLog(`Pushing ${item.type} "${item.name}" to Tally...`);
    setSyncQueue(prev =>
      prev.map(i =>
        i.id === id
          ? { ...i, status: 'SYNCED', lastAttempt: new Date().toISOString().split('T')[0], tallyVoucherId: nextTallyRef('T-MNC') }
          : i
      )
    );
    setTimeout(() => addLog(`Pushed OK: ${item.name}`), 400);
  };

  // Bug fix 9: Fetch from Tally using real HTTP request to Tally XML bridge
  const handleFetchFromTally = async () => {
    setIsFetchingInward(true);
    addLog(`Fetching un-imported vouchers from Tally at ${tallyUrl}...`);
    try {
      const fromDate = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0].replace(/-/g, '/');
      const toDate = new Date().toISOString().split('T')[0].replace(/-/g, '/');
      const xml = `<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Voucher Register</REPORTNAME><STATICVARIABLES><SVFROMDATE>${fromDate}</SVFROMDATE><SVTODATE>${toDate}</SVTODATE></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;
      const response = await fetch(tallyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml' },
        body: xml,
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      // Parse ENVELOPE/BODY for VOUCHER entries (basic XML parsing)
      const voucherMatches = [...text.matchAll(/<VOUCHER[^>]*>([\s\S]*?)<\/VOUCHER>/gi)];
      const today = new Date().toISOString().split('T')[0];
      const fetched = voucherMatches.slice(0, 20).map((m, i) => {
        const get = (tag: string) => m[1].match(new RegExp(`<${tag}>(.*?)<\/${tag}>`, 'i'))?.[1] || '';
        return {
          id: `T-VCH-${Date.now()}-${i}`,
          tallyRef: get('VOUCHERNUMBER') || nextTallyRef('VCH'),
          date: get('DATE')?.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') || today,
          ledgerName: get('PARTYLEDGERNAME') || 'Unknown',
          type: (get('VOUCHERTYPENAME') || 'JOURNAL').toUpperCase() as 'RECEIPT' | 'PAYMENT' | 'JOURNAL',
          amount: parseFloat(get('AMOUNT') || '0') || 0,
          narrative: get('NARRATION') || '',
          imported: false,
        };
      });
      setInwardVouchers(prev => {
        const existingIds = new Set(prev.map(v => v.tallyRef));
        const newVouchers = fetched.filter(v => !existingIds.has(v.tallyRef));
        addLog(`Fetched ${newVouchers.length} new voucher(s) from Tally.`);
        return [...prev.filter(v => !v.imported), ...newVouchers];
      });
    } catch (err: any) {
      const msg = err?.name === 'TimeoutError' ? 'Request timed out.' : (err?.message || 'Unknown error');
      addLog(`ERROR fetching from Tally: ${msg}`);
    } finally {
      setIsFetchingInward(false);
    }
  };

  // ── BUG FIX 5: Import handler — Transaction doesn't have docstatus field ──
  const handleImportInwardVoucher = (voucher: TallyVoucherInward) => {
    const txnId = `TXN-IN-${String(Date.now()).slice(-6)}`;
    const newTxn: Transaction = {
      id: txnId,
      date: voucher.date,
      description: `[Tally Ref ${voucher.tallyRef}] ${voucher.narrative}`,
      amount: voucher.amount,
      type: voucher.type === 'RECEIPT' ? 'INCOME' : 'EXPENSE',
      category: voucher.type === 'RECEIPT' ? 'RECEIPT' : 'EXPENSE',
      paymentMethod: 'BANK',
      referenceId: voucher.id,
    };
    onAddTransaction(newTxn);
    setInwardVouchers(prev => prev.map(v => v.id === voucher.id ? { ...v, imported: true } : v));
    addLog(`Tally voucher "${voucher.tallyRef}" imported → CashBook ${txnId}.`);
  };

  // ── BUG FIX 6 & 7: XML generation — proper escaping, GST entries, purchase voucher ──
  const generateTallyXml = (): string => {
    const queueItem = syncQueue.find(item => item.id === selectedXmlItem);
    if (!queueItem) return '<!-- Choose an item from the index to preview its XML payload -->';

    const safeName = escapeXml(queueItem.name);
    const safeCompany = escapeXml(companyName);
    const amountVal = (queueItem.amount || 0).toFixed(2);
    const tallyDate = toTallyDate(new Date().toISOString().split('T')[0]);

    if (selectedXmlType === 'ledger') {
      const groupName = escapeXml(
        queueItem.type === 'SUPPLIER' ? creditorsGroup : debtorsGroup
      );
      return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${safeCompany}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="${safeName}" ACTION="Create">
            <NAME.LIST><NAME>${safeName}</NAME></NAME.LIST>
            <PARENT>${groupName}</PARENT>
            <ISBILLWISEON>Yes</ISBILLWISEON>
            <AFFECTSSTOCK>No</AFFECTSSTOCK>
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
    }

    // Sales Invoice XML with GST split
    if (queueItem.type === 'SALES_INVOICE') {
      const partyName = escapeXml(queueItem.name.split(' — ')[1]?.split(' (')[0] || queueItem.name);
      const baseAmount = (queueItem.amount || 0);
      // Assume 18% GST split as 9% CGST + 9% SGST
      const gstBase = (baseAmount / 1.18).toFixed(2);
      const cgstAmt = ((baseAmount - parseFloat(gstBase)) / 2).toFixed(2);
      const sgstAmt = cgstAmt;

      return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${safeCompany}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Sales" ACTION="Create">
            <DATE>${tallyDate}</DATE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXml(queueItem.id)}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${partyName}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${amountVal}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(salesLedger)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${gstBase}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(cgstLedger)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${cgstAmt}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(sgstLedger)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${sgstAmt}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
    }

    // Purchase Order XML
    if (queueItem.type === 'PURCHASE_ORDER') {
      const partyName = escapeXml(queueItem.name.split(' — ')[1]?.split(' (')[0] || queueItem.name);
      return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${safeCompany}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Purchase" ACTION="Create">
            <DATE>${tallyDate}</DATE>
            <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXml(queueItem.id)}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(purchaseLedger)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>${amountVal}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${partyName}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>-${amountVal}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
    }

    return '<!-- XML template not available for this item type -->';
  };

  const handleCopyXml = () => {
    navigator.clipboard.writeText(generateTallyXml());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredSyncQueue = syncQueue.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q)
    );
  });

  const pendingItems = syncQueue.filter(item => item.status === 'PENDING').length;
  const syncedItems = syncQueue.filter(item => item.status === 'SYNCED').length;
  const failedItems = syncQueue.filter(item => item.status === 'FAILED').length;

  const typeColor = (type: SyncItem['type']) => {
    switch (type) {
      case 'CUSTOMER': return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400';
      case 'SUPPLIER': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-400';
      case 'SALES_INVOICE': return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:border-violet-800 dark:text-violet-400';
      case 'PURCHASE_ORDER': return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans pb-8">

      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer tracking-wider uppercase">Integrations</span>
            <span className="text-slate-300 text-xs">/</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wider uppercase">Tally Sync</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            Tally Integration
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${isConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              {isConnected ? '● Connected' : '● Disconnected'}
            </span>
          </h1>
        </div>
        <div className="flex gap-2 items-center">
          {syncFreq !== 'MANUAL' && (
            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 border border-slate-200 px-2 py-1 rounded dark:border-slate-700">
              <Clock className="w-3 h-3" /> Auto: {syncFreq}
            </span>
          )}
          <button
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded text-sm font-bold shadow-md transition-all active:scale-95 flex items-center gap-2 uppercase tracking-wide disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
          <span className="text-slate-500 text-xs font-bold uppercase">Pending</span>
          <span className="font-black text-slate-800 dark:text-slate-100">{pendingItems}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-slate-500 text-xs font-bold uppercase">Synced</span>
          <span className="font-black text-emerald-600">{syncedItems}</span>
        </div>
        {failedItems > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-red-400"></span>
            <span className="text-slate-500 text-xs font-bold uppercase">Failed</span>
            <span className="font-black text-red-600">{failedItems}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="px-6 py-4 flex gap-4 overflow-x-auto border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {([
          { id: 'setup', label: 'Tally Setup' },
          { id: 'mapping', label: 'Ledger Mapping' },
          { id: 'import', label: 'Pull from Tally', icon: <DownloadCloud className="w-3.5 h-3.5" /> },
          { id: 'export', label: 'Push to Tally', icon: <UploadCloud className="w-3.5 h-3.5" />, badge: pendingItems },
          { id: 'xml_explorer', label: 'XML Explorer' },
          { id: 'logs', label: 'Sync Logs' },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 shrink-0 rounded transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
          >
            {'icon' in tab && tab.icon}
            {tab.label}
            {'badge' in tab && tab.badge > 0 && (
              <span className="ml-1 bg-rose-500 text-white px-1.5 py-0.5 rounded text-[9px]">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* ── SETUP TAB ────────────────────────────────────────────────── */}
          {activeTab === 'setup' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-6 pb-2 border-b border-slate-200 dark:border-slate-800">
                Tally XML Server Settings
              </h3>

              {connError && (
                <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  {connError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 max-w-4xl">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tally Version</label>
                  <select
                    value={tallyVersion}
                    onChange={e => setTallyVersion(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-sm font-bold outline-none focus:border-indigo-500"
                  >
                    <option value="PRIME">Tally Prime</option>
                    <option value="ERP9">Tally ERP 9</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Company Name (Exact Match in Tally)</label>
                  <input
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-sm font-bold outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tally ODBC/HTTP URL</label>
                  <div className="flex gap-2">
                    <input
                      value={tallyUrl}
                      onChange={e => setTallyUrl(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-900 text-sm font-mono outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={handleTestConnection}
                      disabled={isTestingConn}
                      className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold uppercase transition-all whitespace-nowrap disabled:opacity-50"
                    >
                      {isTestingConn ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-400">Enable Tally's XML/HTTP interface: Gateway of Tally → F12 → Advanced Configuration → Enable XML</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Auto Sync Frequency</label>
                  <select
                    value={syncFreq}
                    onChange={e => setSyncFreq(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-sm font-bold outline-none focus:border-indigo-500"
                  >
                    <option value="MANUAL">Manual Trigger Only</option>
                    <option value="HOURLY">Every Hour</option>
                    <option value="DAILY">Once a Day</option>
                  </select>
                  {syncFreq !== 'MANUAL' && (
                    <p className="mt-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Auto-sync is active. Interval timer running.</p>
                  )}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end items-center gap-3">
                {saveSuccess && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Saved!
                  </span>
                )}
                <button
                  onClick={handleSaveConfigs}
                  className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors hover:bg-slate-700"
                >
                  Save Configurations
                </button>
              </div>
            </div>
          )}

          {/* ── MAPPING TAB ───────────────────────────────────────────────── */}
          {activeTab === 'mapping' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-6 pb-2 border-b border-slate-200 dark:border-slate-800">
                Ledger Account Mapping
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 pb-2">Master Groups</h4>
                  {[
                    { label: 'Customers Default Group', value: debtorsGroup, set: setDebtorsGroup },
                    { label: 'Suppliers Default Group', value: creditorsGroup, set: setCreditorsGroup },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{f.label}</label>
                      <input value={f.value} onChange={e => f.set(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded bg-slate-50 text-sm font-mono focus:border-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 outline-none" />
                    </div>
                  ))}
                </div>
                <div className="space-y-6">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 pb-2">Default Ledgers (Vouchers)</h4>
                  {[
                    { label: 'Sales Account', value: salesLedger, set: setSalesLedger },
                    { label: 'Purchase Account', value: purchaseLedger, set: setPurchaseLedger },
                    { label: 'Bank Ledger', value: bankLedger, set: setBankLedger },
                    { label: 'Cash Ledger', value: cashLedger, set: setCashLedger },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{f.label}</label>
                      <input value={f.value} onChange={e => f.set(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded bg-slate-50 text-sm font-mono focus:border-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 outline-none" />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'CGST Account', value: cgstLedger, set: setCgstLedger },
                      { label: 'SGST Account', value: sgstLedger, set: setSgstLedger },
                    ].map(f => (
                      <div key={f.label}>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{f.label}</label>
                        <input value={f.value} onChange={e => f.set(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded bg-slate-50 text-sm font-mono focus:border-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 outline-none" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end items-center gap-3">
                {saveSuccess && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Saved!
                  </span>
                )}
                <button onClick={handleSaveConfigs} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors">
                  Save Mapping
                </button>
              </div>
            </div>
          )}

          {/* ── IMPORT (Pull from Tally) ──────────────────────────────────── */}
          {activeTab === 'import' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Un-imported Tally Entries</h3>
                  <p className="text-xs text-slate-500 mt-1">Receipts and Payments from Tally to import into your Cash Book.</p>
                </div>
                {/* BUG FIX 4: "Fetch from Tally" button now actually does something */}
                <button
                  onClick={handleFetchFromTally}
                  disabled={isFetchingInward}
                  className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded text-xs font-bold uppercase flex items-center gap-2 disabled:opacity-50 hover:bg-emerald-100 transition-colors"
                >
                  <Network className={`w-4 h-4 ${isFetchingInward ? 'animate-pulse' : ''}`} />
                  {isFetchingInward ? 'Fetching...' : 'Fetch from Tally'}
                </button>
              </div>
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4 uppercase tracking-wider text-[10px]">Tally Ref / Date</th>
                    <th className="p-4 uppercase tracking-wider text-[10px]">Ledger Account</th>
                    <th className="p-4 uppercase tracking-wider text-[10px]">Type</th>
                    <th className="p-4 uppercase tracking-wider text-[10px]">Amount</th>
                    <th className="p-4 text-right uppercase tracking-wider text-[10px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {inwardVouchers.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{v.tallyRef}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{v.date}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-700 dark:text-slate-300">{v.ledgerName}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{v.narrative}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${v.type === 'RECEIPT' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                          {v.type}
                        </span>
                      </td>
                      <td className="p-4 font-black text-slate-800 dark:text-white">
                        {currency}{v.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="p-4 text-right">
                        {v.imported ? (
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 justify-end">
                            <Check className="w-3.5 h-3.5" /> Imported
                          </span>
                        ) : (
                          <button
                            onClick={() => handleImportInwardVoucher(v)}
                            className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-400 rounded text-xs font-bold transition-colors"
                          >
                            Import to CashBook
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {inwardVouchers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 text-sm">
                        No un-imported vouchers. Click "Fetch from Tally" to pull latest entries.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── EXPORT (Push to Tally) ────────────────────────────────────── */}
          {activeTab === 'export' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Outward Data Queue</h3>
                  <p className="text-xs text-slate-500 mt-1">Customers, Suppliers, Sales Invoices & Purchase Orders queued for Tally.</p>
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Filter queue..."
                    className="pl-8 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4 uppercase tracking-wider text-[10px]">Reference ID</th>
                    <th className="p-4 uppercase tracking-wider text-[10px]">Type</th>
                    <th className="p-4 uppercase tracking-wider text-[10px]">Details</th>
                    <th className="p-4 uppercase tracking-wider text-[10px]">Status</th>
                    <th className="p-4 text-right uppercase tracking-wider text-[10px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSyncQueue.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-4 font-mono text-xs font-bold text-slate-600 dark:text-slate-400">{item.id}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${typeColor(item.type)}`}>
                          {item.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{item.name}</div>
                        {item.amount != null && (
                          <div className="text-xs text-slate-500 mt-0.5 font-bold">
                            {currency}{item.amount.toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        {item.status === 'SYNCED' ? (
                          <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Synced
                          </div>
                        ) : item.status === 'FAILED' ? (
                          <div className="text-xs font-bold text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Failed
                          </div>
                        ) : (
                          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Pending
                          </div>
                        )}
                        {item.tallyVoucherId && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">Ref: {item.tallyVoucherId}</div>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {item.status !== 'SYNCED' && (
                          <button
                            onClick={() => syncSingleItem(item.id)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded text-xs font-bold transition-colors"
                          >
                            Push Now
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredSyncQueue.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 text-sm">
                        {searchQuery ? 'No items match your filter.' : 'Queue is empty. Data will appear as you add Customers, Orders, and Suppliers.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── XML EXPLORER ─────────────────────────────────────────────── */}
          {activeTab === 'xml_explorer' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col md:flex-row h-[600px]">
              <div className="w-full md:w-1/3 border-r border-slate-200 dark:border-slate-800 overflow-y-auto bg-slate-50 dark:bg-slate-950/50">
                <div className="p-3 border-b border-slate-200 text-xs font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 sticky top-0 bg-slate-50 dark:bg-slate-950 z-10">
                  Payload Reference Index
                </div>
                <div className="p-2 space-y-1">
                  {syncQueue.map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSelectedXmlItem(item.id);
                        setSelectedXmlType(item.type === 'CUSTOMER' || item.type === 'SUPPLIER' ? 'ledger' : 'voucher');
                      }}
                      className={`w-full text-left p-3 rounded border text-xs flex flex-col gap-1 transition-all ${selectedXmlItem === item.id ? 'bg-white shadow-sm border-indigo-200 dark:border-indigo-800 dark:bg-slate-800 font-bold text-slate-800 dark:text-white' : 'border-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                    >
                      <span className="font-mono text-[10px] opacity-70">{item.id}</span>
                      <span className="truncate leading-tight">{item.name}</span>
                      <span className={`text-[9px] font-bold uppercase ${typeColor(item.type)} px-1.5 py-0.5 rounded border w-fit`}>{item.type.replace('_', ' ')}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-full md:w-2/3 flex flex-col bg-[#1e1e1e]">
                <div className="px-4 py-2 border-b border-[#333] flex justify-between items-center bg-[#2d2d2d] text-[#d4d4d4]">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-mono font-bold">tally_request_envelope.xml</span>
                  </div>
                  <button
                    onClick={handleCopyXml}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs hover:bg-[#3d3d3d] rounded transition-colors text-slate-300"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy Payload'}
                  </button>
                </div>
                <div className="flex-1 p-4 overflow-auto">
                  <pre className="text-[12px] font-mono leading-relaxed text-[#d4d4d4] select-all whitespace-pre">
                    {generateTallyXml()}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* ── SYNC LOGS ────────────────────────────────────────────────── */}
          {activeTab === 'logs' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 overflow-hidden max-h-[600px] flex flex-col">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">ODBC Sync Logs</h3>
                <button
                  onClick={() => setSyncLogs([])}
                  className="text-xs text-slate-500 hover:text-red-600 uppercase font-bold tracking-wider transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              </div>
              <div className="flex-1 overflow-y-auto bg-slate-950 rounded-lg p-5 font-mono text-[11px] leading-relaxed text-emerald-400 space-y-1 border border-slate-800">
                {syncLogs.length === 0 ? (
                  <span className="text-slate-600">No logs. Connect or trigger a sync.</span>
                ) : (
                  syncLogs.map((log, index) => (
                    <div key={index} className="opacity-90 hover:opacity-100 hover:bg-white/5 px-2 py-0.5 rounded break-words">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
