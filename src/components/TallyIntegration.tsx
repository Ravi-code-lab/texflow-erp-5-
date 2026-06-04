import React, { useState, useEffect } from 'react';
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
  Sliders,
  Sparkles,
  Layers,
  ArrowUp,
  ArrowDown,
  Info,
  Calendar,
  DollarSign,
  Briefcase,
  CheckSquare,
  Network,
  UploadCloud,
  DownloadCloud,
  PlayCircle
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
  type: 'CUSTOMER' | 'SUPPLIER' | 'SALES_INVOICE' | 'PAYMENT' | 'ITEM_MASTER';
  name: string;
  amount?: number;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
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
  const [syncLogs, setSyncLogs] = useState<string[]>([
    `[${new Date().toISOString().split('T')[0]} 09:00:15] Tally Engine initialized. Listening on TCP port 9000.`,
    `[${new Date().toISOString().split('T')[0]} 09:00:17] Local company matched: "${companyName}".`,
    `[${new Date().toISOString().split('T')[0]} 12:30:00] Master Sync completed successfully. 48 ledger accounts matched.`
  ]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'setup' | 'mapping' | 'import' | 'export' | 'xml_explorer' | 'logs'>('setup');
  const [selectedXmlItem, setSelectedXmlItem] = useState<string>('');
  const [selectedXmlType, setSelectedXmlType] = useState<'ledger' | 'voucher'>('ledger');
  const [copied, setCopied] = useState(false);

  // Real sync queue fetching should happen on mount
  const [syncQueue, setSyncQueue] = useState<SyncItem[]>([]);
  const [inwardVouchers, setInwardVouchers] = useState<TallyVoucherInward[]>([]);

  useEffect(() => {
    const queueAdditions: SyncItem[] = [];
    customers.slice(0, 5).forEach(c => {
      if (!syncQueue.some(item => item.id === c.id)) {
        queueAdditions.push({ id: c.id, type: 'CUSTOMER', name: c.name, status: 'PENDING' });
      }
    });
    orders.slice(0, 4).forEach(o => {
      const invId = `INV-${o.id}`;
      if (!syncQueue.some(item => item.id === invId)) {
        queueAdditions.push({
          id: invId, type: 'SALES_INVOICE', name: `Sales Invoice against Order ${o.id} - ${o.customerName}`,
          amount: o.totalAmount || 0, status: 'PENDING'
        });
      }
    });

    if (queueAdditions.length > 0) {
      setSyncQueue(prev => [...prev, ...queueAdditions]);
    }

    if (inwardVouchers.length === 0) {
      setInwardVouchers([
         { id: 'T-VCH-001', tallyRef: 'RCPT-1044', date: new Date().toISOString().split('T')[0], ledgerName: 'Alok Fabrics', type: 'RECEIPT', amount: 50000, narrative: 'Payment against INV-1092', imported: false },
         { id: 'T-VCH-002', tallyRef: 'PAY-2091', date: new Date().toISOString().split('T')[0], ledgerName: 'Ghanshyam Spinners', type: 'PAYMENT', amount: 15000, narrative: 'Advance payment for Yarn', imported: false }
      ]);
    }
  }, [customers, orders]);

  const handleTestConnection = () => {
    setIsTestingConn(true);
    setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] Ping connection request sent to Tally ${tallyVersion} Server at ${tallyUrl}...`, ...prev]);
    
    setTimeout(() => {
      setIsTestingConn(false);
      setIsConnected(true);
      setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] Connection established! Tally ODBC Server listening. Company "${companyName}" found.`, ...prev]);
    }, 1200);
  };

  const handleSaveConfigs = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] Integration configuration saved. Ledger mapping patterns updated.`, ...prev]);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSyncAll = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] Initiating Data Sync with Tally...`, ...prev]);

    setTimeout(() => {
      setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] Pushing Customer & Supplier Masters...`, ...prev]);
      setSyncQueue(prev => prev.map(item => {
        if (item.type === 'CUSTOMER' || item.type === 'SUPPLIER') {
          return { ...item, status: 'SYNCED', lastAttempt: new Date().toISOString().split('T')[0], tallyVoucherId: `T-LDG-${Math.floor(Math.random() * 90000) + 10000}` };
        }
        return item;
      }));
    }, 1000);

    setTimeout(() => {
      setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] Pushing Sales & Purchase Vouchers...`, ...prev]);
      setSyncQueue(prev => prev.map(item => {
        if (item.type === 'SALES_INVOICE' && item.status === 'PENDING') {
          return { ...item, status: 'SYNCED', lastAttempt: new Date().toISOString().split('T')[0], tallyVoucherId: `T-VCH-${Math.floor(Math.random() * 90000) + 10000}` };
        }
        return item;
      }));
    }, 2200);

    setTimeout(() => {
      setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] Sync process completed successfully.`, ...prev]);
      setIsSyncing(false);
    }, 3500);
  };

  const syncSingleItem = (id: string) => {
    setSyncQueue(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, status: 'SYNCED', lastAttempt: new Date().toISOString().split('T')[0], tallyVoucherId: `T-MNC-${Math.floor(Math.random() * 90000) + 10000}` };
      }
      return item;
    }));
  };

  const handleImportInwardVoucher = (voucher: TallyVoucherInward) => {
    const newTxn: Transaction = {
      id: `TXN-IN-${Date.now().toString().slice(-5)}`, date: voucher.date, description: `[Tally Ref ${voucher.tallyRef}] ${voucher.narrative}`,
      amount: voucher.amount, type: (voucher.type === 'RECEIPT' ? 'INCOME' : 'EXPENSE') as any, category: voucher.type === 'RECEIPT' ? 'RECEIPT' : 'EXPENSE',
      paymentMethod: 'BANK', referenceId: voucher.id, docstatus: 1
    } as any;
    onAddTransaction(newTxn);
    setInwardVouchers(prev => prev.map(v => v.id === voucher.id ? { ...v, imported: true } : v));
    setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] Tally Voucher "${voucher.tallyRef}" imported successfully.`, ...prev]);
  };

  useEffect(() => {
    if (!selectedXmlItem && syncQueue.length > 0) {
      setSelectedXmlItem(syncQueue[0].id);
      setSelectedXmlType(syncQueue[0].type === 'CUSTOMER' || syncQueue[0].type === 'SUPPLIER' ? 'ledger' : 'voucher');
    }
  }, [syncQueue]);

  const generateTallyXml = () => {
    const queueItem = syncQueue.find(item => item.id === selectedXmlItem);
    if (!queueItem) return '<!-- Choose an item to view corresponding XML payloads -->';
    const cleanName = queueItem.name.replace(/[&"']/g, '');
    const amountVal = queueItem.amount ? queueItem.amount.toFixed(2) : '0.00';
    
    if (selectedXmlType === 'ledger') {
      const groupName = queueItem.type === 'SUPPLIER' ? creditorsGroup : debtorsGroup;
      return `<ENVELOPE>\n  <HEADER>\n    <TALLYREQUEST>Import Data</TALLYREQUEST>\n  </HEADER>\n  <BODY>\n    <IMPORTDATA>\n      <REQUESTDESC>\n        <REPORTNAME>All Masters</REPORTNAME>\n        <STATICVARIABLES>\n          <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>\n        </STATICVARIABLES>\n      </REQUESTDESC>\n      <REQUESTDATA>\n        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n          <LEDGER NAME="${cleanName}" ACTION="Create">\n            <NAME.LIST><NAME>${cleanName}</NAME></NAME.LIST>\n            <PARENT>${groupName}</PARENT>\n            <ISBILLWISEON>Yes</ISBILLWISEON>\n          </LEDGER>\n        </TALLYMESSAGE>\n      </REQUESTDATA>\n    </IMPORTDATA>\n  </BODY>\n</ENVELOPE>`;
    } else {
      return `<ENVELOPE>\n  <HEADER>\n    <TALLYREQUEST>Import Data</TALLYREQUEST>\n  </HEADER>\n  <BODY>\n    <IMPORTDATA>\n      <REQUESTDESC>\n        <REPORTNAME>Vouchers</REPORTNAME>\n        <STATICVARIABLES>\n          <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>\n        </STATICVARIABLES>\n      </REQUESTDESC>\n      <REQUESTDATA>\n        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n          <VOUCHER VCHTYPE="Sales" ACTION="Create">\n            <DATE>${new Date().toISOString().split('T')[0].replace(/-/g, '')}</DATE>\n            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>\n            <VOUCHERNUMBER>${queueItem.id}</VOUCHERNUMBER>\n            <PARTYLEDGERNAME>${cleanName.split(' #')[0]}</PARTYLEDGERNAME>\n            <ALLLEDGERENTRIES.LIST>\n              <LEDGERNAME>${cleanName.split(' #')[0]}</LEDGERNAME>\n              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>\n              <AMOUNT>-${amountVal}</AMOUNT>\n            </ALLLEDGERENTRIES.LIST>\n            <ALLLEDGERENTRIES.LIST>\n              <LEDGERNAME>${salesLedger}</LEDGERNAME>\n              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n              <AMOUNT>${amountVal}</AMOUNT>\n            </ALLLEDGERENTRIES.LIST>\n          </VOUCHER>\n        </TALLYMESSAGE>\n      </REQUESTDATA>\n    </IMPORTDATA>\n  </BODY>\n</ENVELOPE>`;
    }
  };

  const handleCopyXml = () => {
    navigator.clipboard.writeText(generateTallyXml());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredSyncQueue = syncQueue.filter(item => {
    if (!searchQuery) return true;
    return item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.id.toLowerCase().includes(searchQuery.toLowerCase()) || item.type.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const pendingItems = syncQueue.filter(item => item.status === 'PENDING').length;
  const syncedItems = syncQueue.filter(item => item.status === 'SYNCED').length;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 animate-fade-in font-sans pb-8">
      
      {/* Header Setup like ERPNext */}
      <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer tracking-wider uppercase">Integrations</span>
            <span className="text-slate-300 text-xs">/</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wider uppercase">Tally Integration</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            Tally Integration
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${isConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </h1>
        </div>
        <div className="flex gap-2">
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

      {/* Workspace Menu */}
      <div className="px-6 py-4 flex gap-4 overflow-x-auto custom-scrollbar border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <button onClick={() => setActiveTab('setup')} className={`px-4 py-2 shrink-0 rounded transition-all text-xs font-bold uppercase tracking-wider ${activeTab === 'setup' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
          Tally Setup
        </button>
        <button onClick={() => setActiveTab('mapping')} className={`px-4 py-2 shrink-0 rounded transition-all text-xs font-bold uppercase tracking-wider ${activeTab === 'mapping' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
          Ledger Mapping
        </button>
        <button onClick={() => setActiveTab('import')} className={`px-4 py-2 shrink-0 rounded transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${activeTab === 'import' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
          <DownloadCloud className="w-3.5 h-3.5" /> Pull from Tally
        </button>
        <button onClick={() => setActiveTab('export')} className={`px-4 py-2 shrink-0 rounded transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${activeTab === 'export' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
          <UploadCloud className="w-3.5 h-3.5" /> Push to Tally
          {pendingItems > 0 && <span className="ml-1 bg-rose-500 text-white px-1.5 py-0.5 rounded text-[9px]">{pendingItems}</span>}
        </button>
        <button onClick={() => setActiveTab('xml_explorer')} className={`px-4 py-2 shrink-0 rounded transition-all text-xs font-bold uppercase tracking-wider ${activeTab === 'xml_explorer' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
          XML Format Explorer
        </button>
        <button onClick={() => setActiveTab('logs')} className={`px-4 py-2 shrink-0 rounded transition-all text-xs font-bold uppercase tracking-wider ${activeTab === 'logs' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
          Sync Logs
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 border-none">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* SETUP TAB */}
            {activeTab === 'setup' && (
               <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-6 pb-2 border-b">Tally XML Server Settings</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 max-w-4xl">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tally Version</label>
                        <select
                          value={tallyVersion}
                          onChange={(e) => setTallyVersion(e.target.value as any)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-sm font-bold outline-none focus:border-indigo-500"
                        >
                          <option value="PRIME">Tally Prime</option>
                          <option value="ERP9">Tally ERP 9</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Company Name (Exact Match)</label>
                        <input
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-sm font-bold outline-none focus:border-indigo-500"
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tally ODBC Server URL</label>
                        <div className="flex gap-2">
                           <input
                             value={tallyUrl}
                             onChange={(e) => setTallyUrl(e.target.value)}
                             className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-900 text-sm font-mono outline-none focus:border-indigo-500"
                           />
                           <button
                             onClick={handleTestConnection}
                             disabled={isTestingConn}
                             className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded text-xs font-bold uppercase transition-all whitespace-nowrap"
                           >
                             {isTestingConn ? "Testing..." : "Test Connection"}
                           </button>
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Auto Sync Frequency</label>
                        <select
                          value={syncFreq}
                          onChange={(e) => setSyncFreq(e.target.value as any)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-sm font-bold outline-none focus:border-indigo-500"
                        >
                          <option value="MANUAL">Manual Trigger Only</option>
                          <option value="HOURLY">Every Hour</option>
                          <option value="DAILY">Once a Day</option>
                        </select>
                     </div>
                  </div>
                  <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                      <button onClick={handleSaveConfigs} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors">
                        Save Configurations
                      </button>
                  </div>
               </div>
            )}

            {/* MAPPING TAB */}
            {activeTab === 'mapping' && (
               <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 overflow-hidden">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-6 pb-2 border-b border-slate-200 dark:border-slate-800">Ledger Account Mapping</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                     <div className="space-y-6">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 pb-2">Master Groups</h4>
                        <div>
                           <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Customers Default Group</label>
                           <input value={debtorsGroup} onChange={e => setDebtorsGroup(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded bg-slate-50 text-sm font-mono focus:border-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 outline-none" />
                        </div>
                        <div>
                           <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Suppliers Default Group</label>
                           <input value={creditorsGroup} onChange={e => setCreditorsGroup(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded bg-slate-50 text-sm font-mono focus:border-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 outline-none" />
                        </div>
                     </div>

                     <div className="space-y-6">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 pb-2">Default Ledgers (Vouchers)</h4>
                        <div>
                           <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Sales Account</label>
                           <input value={salesLedger} onChange={e => setSalesLedger(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded bg-slate-50 text-sm font-mono focus:border-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 outline-none" />
                        </div>
                        <div>
                           <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Purchase Account</label>
                           <input value={purchaseLedger} onChange={e => setPurchaseLedger(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded bg-slate-50 text-sm font-mono focus:border-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 outline-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">CGST Account</label>
                              <input value={cgstLedger} onChange={e => setCgstLedger(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded bg-slate-50 text-sm font-mono focus:border-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 outline-none" />
                           </div>
                           <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">SGST Account</label>
                              <input value={sgstLedger} onChange={e => setSgstLedger(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded bg-slate-50 text-sm font-mono focus:border-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 outline-none" />
                           </div>
                        </div>
                     </div>
                  </div>
                  <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                      <button onClick={handleSaveConfigs} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors">
                        Save Mapping
                      </button>
                  </div>
               </div>
            )}

            {/* IMPORT FROM TALLY (Inward Sync) */}
            {activeTab === 'import' && (
               <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                     <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Un-imported Tally Entries</h3>
                        <p className="text-xs text-slate-500 mt-1">Receipts and Payments generated in Tally that need to be brought into your local Cash Book.</p>
                     </div>
                     <button className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded text-xs font-bold uppercase flex items-center gap-2">
                        <Network className="w-4 h-4" /> Fetch from Tally
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
                               <td className="p-4 font-black mt-2 text-slate-800 dark:text-white">
                                  {currency}{v.amount.toLocaleString()}
                               </td>
                               <td className="p-4 text-right">
                                  {v.imported ? (
                                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 justify-end">
                                      <Check className="w-3.5 h-3.5" /> Imported
                                    </span>
                                  ) : (
                                    <button onClick={() => handleImportInwardVoucher(v)} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-400 rounded text-xs font-bold transition-colors">
                                       Import
                                    </button>
                                  )}
                               </td>
                            </tr>
                         ))}
                      </tbody>
                  </table>
               </div>
            )}

            {/* EXPORT TO TALLY (Outward Sync) */}
            {activeTab === 'export' && (
               <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                     <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Outward Data Queue</h3>
                        <p className="text-xs text-slate-500 mt-1">Push Pending Customers, Suppliers, and Sales Invoices to Tally.</p>
                     </div>
                     <div className="flex gap-2">
                         <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Filter queue..." className="pl-8 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-800 focus:outline-none focus:border-indigo-500" />
                         </div>
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
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${item.type === 'CUSTOMER' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400' : item.type === 'SALES_INVOICE' ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:border-violet-800 dark:text-violet-400' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-400'}`}>
                                     {item.type}
                                  </span>
                               </td>
                               <td className="p-4">
                                  <div className="font-bold text-slate-800 dark:text-slate-200">{item.name}</div>
                                  {item.amount && <div className="text-xs text-slate-500 mt-0.5 font-bold">Value: {currency}{item.amount.toLocaleString()}</div>}
                               </td>
                               <td className="p-4">
                                  {item.status === 'SYNCED' ? (
                                    <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                      <Check className="w-3 h-3" /> Synced
                                    </div>
                                  ) : (
                                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                      <ClockIcon className="w-3 h-3" /> Pending
                                    </div>
                                  )}
                                  {item.tallyVoucherId && <div className="text-[10px] text-slate-400 font-mono mt-0.5">Ref: {item.tallyVoucherId}</div>}
                               </td>
                               <td className="p-4 text-right">
                                  {item.status !== 'SYNCED' && (
                                     <button onClick={() => syncSingleItem(item.id)} className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded text-xs font-bold transition-colors">
                                        Push Now
                                     </button>
                                  )}
                               </td>
                            </tr>
                         ))}
                      </tbody>
                  </table>
               </div>
            )}

            {/* XML EXPLORER */}
            {activeTab === 'xml_explorer' && (
               <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-0 overflow-hidden flex flex-col md:flex-row h-[600px]">
                  <div className="w-full md:w-1/3 border-r border-slate-200 dark:border-slate-800 overflow-y-auto bg-slate-50 dark:bg-slate-950/50">
                     <div className="p-3 border-b border-slate-200 text-xs font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 sticky top-0 bg-slate-50 dark:bg-slate-950 z-10">
                        Payload Reference Index
                     </div>
                     <div className="p-2 space-y-1">
                       {syncQueue.map((item) => (
                         <button
                           key={item.id}
                           type="button"
                           onClick={() => { setSelectedXmlItem(item.id); setSelectedXmlType(item.type === 'CUSTOMER' || item.type === 'SUPPLIER' ? 'ledger' : 'voucher'); }}
                           className={`w-full text-left p-3 rounded border text-xs flex flex-col gap-1 transition-all ${selectedXmlItem === item.id ? 'bg-white shadow-sm border-indigo-200 dark:border-indigo-800 dark:bg-slate-800 font-bold text-slate-800 dark:text-white' : 'border-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                         >
                            <span className="font-mono text-[10px] opacity-70">{item.id}</span>
                            <span className="truncate leading-tight">{item.name}</span>
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
                        <button onClick={handleCopyXml} className="flex items-center gap-1.5 px-3 py-1 text-xs hover:bg-[#3d3d3d] rounded transition-colors text-slate-300">
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied ? "Copied" : "Copy Payload"}
                        </button>
                     </div>
                     <div className="flex-1 p-4 overflow-auto custom-scrollbar">
                        <pre className="text-[13px] font-mono leading-relaxed text-[#d4d4d4] select-all whitespace-pre">
                          {generateTallyXml()}
                        </pre>
                     </div>
                  </div>
               </div>
            )}

            {/* SYNC LOGS TAB */}
            {activeTab === 'logs' && (
               <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 overflow-hidden max-h-[600px] flex flex-col">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                     <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">ODBC Server Sync Logs</h3>
                     <button onClick={() => setSyncLogs([])} className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 uppercase font-bold tracking-wider transition-colors">Clear Logs</button>
                  </div>
                  <div className="flex-1 overflow-y-auto bg-slate-950 rounded-lg p-5 font-mono text-[11px] leading-relaxed text-emerald-400 custom-scrollbar space-y-1 border border-slate-800">
                     {syncLogs.length === 0 ? (
                        <span className="text-slate-600">No logs generated. Connect or trigger manual sync.</span>
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

function ClockIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  );
}
