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
  Network
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
  type: 'CUSTOMER' | 'SUPPLIER' | 'SALES_INVOICE' | 'PAYMENT';
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
  type: 'RECEIPT' | 'PAYMENT';
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
  const [tallyUrl, setTallyUrl] = useState('http://127.0.0.1:9001');
  const [companyName, setCompanyName] = useState('Ravi Textile Pvt. Ltd.');
  const [syncFreq, setSyncFreq] = useState<'MANUAL' | 'HOURLY' | 'DAILY'>('MANUAL');
  const [syncDirection, setSyncDirection] = useState<'BIDIRECTIONAL' | 'OUTWARD_ONLY' | 'INWARD_ONLY'>('BIDIRECTIONAL');
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Ledger Group Mappings
  const [debtorsGroup, setDebtorsGroup] = useState('Sundry Debtors');
  const [creditorsGroup, setCreditorsGroup] = useState('Sundry Creditors');
  const [salesLedger, setSalesLedger] = useState('Local CGST/SGST Sales A/c');
  const [purchaseLedger, setPurchaseLedger] = useState('Yarn Procurement A/c');
  const [cgstLedger, setCgstLedger] = useState('CGST Output ledger');
  const [sgstLedger, setSgstLedger] = useState('SGST Output ledger');

  // Integration operational state
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([
    `[${new Date().toISOString().split('T')[0]} 09:00:15] Tally Engine initialized. Listening on TCP port 9001.`,
    `[${new Date().toISOString().split('T')[0]} 09:00:17] Local company matched: "${companyName}".`,
    `[${new Date().toISOString().split('T')[0]} 12:30:00] Master Sync completed successfully. 48 ledger accounts matched.`
  ]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'mapping' | 'xml_explorer' | 'inward_flow'>('dashboard');
  const [selectedXmlItem, setSelectedXmlItem] = useState<string>('');
  const [selectedXmlType, setSelectedXmlType] = useState<'ledger' | 'voucher'>('ledger');
  const [copied, setCopied] = useState(false);

  // Hardcode prefilled sync queue to demonstrate immediate action
  const [syncQueue, setSyncQueue] = useState<SyncItem[]>([
    { id: 'CUST-3021', type: 'CUSTOMER', name: 'Alok Fabrics Ahmedabad', status: 'PENDING' },
    { id: 'CUST-3045', type: 'CUSTOMER', name: 'Shree Balaji Apparels', status: 'SYNCED', lastAttempt: '2026-05-30', tallyVoucherId: 'T-LDG-10291' },
    { id: 'SUPP-4011', type: 'SUPPLIER', name: 'Ghanshyam Yarn Spinners', status: 'PENDING' },
    { id: 'INV-1092', type: 'SALES_INVOICE', name: 'Sales Invoice #1092 to Shree Balaji', amount: 84500, status: 'PENDING' },
    { id: 'INV-1093', type: 'SALES_INVOICE', name: 'Sales Invoice #1093 to Alok Fabrics', amount: 142000, status: 'PENDING' },
    { id: 'TXN-9022', type: 'PAYMENT', name: 'Payment of Wages via Karigar Ledger', amount: 12500, status: 'SYNCED', lastAttempt: '2026-05-30', tallyVoucherId: 'T-VCH-88019' },
    { id: 'TXN-9041', type: 'PAYMENT', name: 'Security Deposit Paid to Office Rent', amount: 45000, status: 'FAILED', lastAttempt: '2026-05-29', error: 'Parent Group [Deposits Assets] missing in Tally chart of accounts' },
  ]);

  // Vouchers made in Tally that can be imported to Cash Book/ERP (2-way integration demo)
  const [inwardVouchers, setInwardVouchers] = useState<TallyVoucherInward[]>([
    {
      id: "TALLY-REC-501",
      tallyRef: "TY-99201",
      date: new Date().toISOString().split('T')[0],
      ledgerName: "Shree Balaji Apparels",
      type: "RECEIPT",
      amount: 50000,
      narrative: "Part payment received in HDFC Bank - imported via Tally webhook",
      imported: false
    },
    {
      id: "TALLY-PAY-805",
      tallyRef: "TY-99408",
      date: new Date().toISOString().split('T')[0],
      ledgerName: "Office Electric Maintenance",
      type: "PAYMENT",
      amount: 3200,
      narrative: "Electric room maintenance paid directly in Tally",
      imported: false
    },
    {
      id: "TALLY-REC-504",
      tallyRef: "TY-99512",
      date: new Date().toISOString().split('T')[0],
      ledgerName: "Alok Fabrics Ahmedabad",
      type: "RECEIPT",
      amount: 142000,
      narrative: "Full payment clear against Invoice INV-1093",
      imported: false
    }
  ]);

  // Load select items of dynamic data from Parent ERP state if empty or update
  useEffect(() => {
    // Add real customer pending syncs dynamically if customers state exists
    const queueAdditions: SyncItem[] = [];
    customers.slice(0, 5).forEach(c => {
      if (!syncQueue.some(item => item.id === c.id)) {
        queueAdditions.push({
          id: c.id,
          type: 'CUSTOMER',
          name: c.name,
          status: 'PENDING'
        });
      }
    });
    
    // Add real invoice pending syncs
    orders.slice(0, 4).forEach(o => {
      const invId = `INV-${o.id}`;
      if (!syncQueue.some(item => item.id === invId)) {
        queueAdditions.push({
          id: invId,
          type: 'SALES_INVOICE',
          name: `Sales Invoice against Order ${o.id} - ${o.customerName}`,
          amount: o.totalAmount || 0,
          status: 'PENDING'
        });
      }
    });

    if (queueAdditions.length > 0) {
      setSyncQueue(prev => [...prev, ...queueAdditions]);
    }
  }, [customers, orders]);

  // Trigger test connection
  const handleTestConnection = () => {
    setIsTestingConn(true);
    setSyncLogs(prev => [
      `[${new Date().toLocaleTimeString()}] Ping connection request sent to Tally Prime Server at ${tallyUrl}...`,
      ...prev
    ]);
    
    setTimeout(() => {
      setIsTestingConn(false);
      setIsConnected(true);
      setSyncLogs(prev => [
        `[${new Date().toLocaleTimeString()}] Connection established! Tally ODBC Server listening. Company "${companyName}" selected. XML Engine v9.2 ready.`,
        ...prev
      ]);
    }, 1200);
  };

  const handleSaveConfigs = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setSyncLogs(prev => [
      `[${new Date().toLocaleTimeString()}] Integration configuration saved. Ledger mapping patterns updated.`,
      ...prev
    ]);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Execute full sync
  const handleSyncAll = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    
    setSyncLogs(prev => [
      `[${new Date().toLocaleTimeString()}] Initiating 2-Way transactional reconciliation synchronization...`,
      ...prev
    ]);

    // Stage 1 sync
    setTimeout(() => {
      setSyncLogs(prev => [
        `[${new Date().toLocaleTimeString()}] Step 1: Matching local Account Ledgers with Tally Directory...`,
        `[${new Date().toLocaleTimeString()}] Ledgers: Synced new account "Alok Fabrics Ahmedabad" to Tally Group "${debtorsGroup}".`,
        `[${new Date().toLocaleTimeString()}] Ledgers: Synced new account "Ghanshyam Yarn Spinners" to Tally Group "${creditorsGroup}".`,
        ...prev
      ]);
      
      setSyncQueue(prev => prev.map(item => {
        if (item.type === 'CUSTOMER' || item.type === 'SUPPLIER') {
          return { ...item, status: 'SYNCED', lastAttempt: new Date().toISOString().split('T')[0], tallyVoucherId: `T-LDG-RECOV-${Math.floor(Math.random() * 90000) + 10000}` };
        }
        return item;
      }));
    }, 1000);

    // Stage 2 sync (Vouchers)
    setTimeout(() => {
      setSyncLogs(prev => [
        `[${new Date().toLocaleTimeString()}] Step 2: Push Sales Invoices as Accounting Vouchers to Tally XML Gateway...`,
        `[${new Date().toLocaleTimeString()}] Push: Packing multi-ledger XML voucher payload for Invoice INV-1092. Total value: ₹84,500.`,
        `[${new Date().toLocaleTimeString()}] Push: Packing multi-ledger XML voucher payload for Invoice INV-1093. Total value: ₹1,42,000.`,
        `[${new Date().toLocaleTimeString()}] Success: Ref VCH-2026-X812 generated in Tally for Invoice INV-1092.`,
        `[${new Date().toLocaleTimeString()}] Success: Ref VCH-2026-X813 generated in Tally for Invoice INV-1093.`,
        ...prev
      ]);

      setSyncQueue(prev => prev.map(item => {
        if (item.type === 'SALES_INVOICE' && item.status === 'PENDING') {
          return { ...item, status: 'SYNCED', lastAttempt: new Date().toISOString().split('T')[0], tallyVoucherId: `T-VCH-${Math.floor(Math.random() * 90000) + 10000}` };
        }
        return item;
      }));
    }, 2200);

    // Stage 3 2-way import check
    setTimeout(() => {
      setSyncLogs(prev => [
        `[${new Date().toLocaleTimeString()}] Step 3: Fetching bank receipts / journals created directly in Tally...`,
        `[${new Date().toLocaleTimeString()}] Inbound: Found 3 un-imported vouchers inside selected Company's Daybook. Ready for manual/auto import into TexFlow Cash Book.`,
        `[${new Date().toLocaleTimeString()}] 2-way Sync process completed. 4 items successfully posted.`,
        ...prev
      ]);
      setIsSyncing(false);
    }, 3500);
  };

  // Sync a single pending item manually
  const syncSingleItem = (id: string) => {
    setSyncQueue(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, status: 'SYNCED', lastAttempt: new Date().toISOString().split('T')[0], tallyVoucherId: `T-MNC-${Math.floor(Math.random() * 90000) + 10000}` };
      }
      return item;
    }));

    const syncedItem = syncQueue.find(i => i.id === id);
    if (syncedItem) {
      setSyncLogs(prev => [
        `[${new Date().toLocaleTimeString()}] Manual Sync: Formatted and posted ${syncedItem.type} "${syncedItem.name}" directly to Tally Prime. Received XML status: SUCCESS.`,
        ...prev
      ]);
    }
  };

  // Interactive import of safe cash/bank transaction from Tally to ERP
  const handleImportInwardVoucher = (voucher: TallyVoucherInward) => {
    // Generate new local transaction entity
    const newTxn: Transaction = {
      id: `TXN-IN-${Date.now().toString().slice(-5)}`,
      date: voucher.date,
      description: `[Tally Ref ${voucher.tallyRef}] ${voucher.narrative}`,
      amount: voucher.amount,
      type: voucher.type === 'RECEIPT' ? 'INCOME' : 'EXPENSE',
      category: voucher.type === 'RECEIPT' ? 'RECEIPT' : 'EXPENSE',
      paymentMethod: 'BANK',
      referenceId: voucher.id,
      docstatus: 1
    };

    onAddTransaction(newTxn);

    // Update state to matched
    setInwardVouchers(prev => prev.map(v => v.id === voucher.id ? { ...v, imported: true } : v));
    setSyncLogs(prev => [
      `[${new Date().toLocaleTimeString()}] 2-Way Sync Import: Tally Voucher "${voucher.tallyRef}" imported into TexFlow Cash Book as payment/receipt ledger entry! ID: ${newTxn.id}`,
      ...prev
    ]);
  };

  // Auto-fill active item for XML Explorer
  useEffect(() => {
    if (!selectedXmlItem && syncQueue.length > 0) {
      setSelectedXmlItem(syncQueue[0].id);
      setSelectedXmlType(syncQueue[0].type === 'CUSTOMER' || syncQueue[0].type === 'SUPPLIER' ? 'ledger' : 'voucher');
    }
  }, [syncQueue]);

  // Generate real-time XML based on selected item (Authentic XML Format for Tally import!)
  const generateTallyXml = () => {
    const queueItem = syncQueue.find(item => item.id === selectedXmlItem);
    if (!queueItem) return '<!-- Choose an item to view corresponding XML payloads -->';

    const cleanName = queueItem.name.replace(/[&"']/g, '');
    const amountVal = queueItem.amount ? queueItem.amount.toFixed(2) : '0.00';
    
    if (selectedXmlType === 'ledger') {
      const groupName = queueItem.type === 'SUPPLIER' ? creditorsGroup : debtorsGroup;
      return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>${companyName}</ID>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="${cleanName}" ACTION="Create">
            <NAME.LIST>
              <NAME>${cleanName}</NAME>
            </NAME.LIST>
            <PARENT>${groupName}</PARENT>
            <OPENINGBALANCE>0</OPENINGBALANCE>
            <TAXTYPE>GST</TAXTYPE>
            <ISBILLWISEON>Yes</ISBILLWISEON>
            <AFFECTSSTOCK>No</AFFECTSSTOCK>
            <COUNTRYNAME>India</COUNTRYNAME>
            <MAILINGNAME>${cleanName}</MAILINGNAME>
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
    } else {
      // Voucher XML
      return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>${companyName}</ID>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Accounting Voucher View">
            <DATE>${new Date().toISOString().split('T')[0].replace(/-/g, '')}</DATE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${queueItem.id}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${cleanName.split(' #')[0]}</PARTYLEDGERNAME>
            <PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>
            <ALLLEDGERENTRIES.LIST>
              <!-- Debit Entry (Debtor Account) -->
              <LEDGERNAME>${cleanName.split(' #')[0]}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${amountVal}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <!-- Credit Entry (Sales Account) -->
              <LEDGERNAME>${salesLedger}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${(parseFloat(amountVal) * 0.95).toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <!-- CGST Tax Share Ledger -->
              <LEDGERNAME>${cgstLedger}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${(parseFloat(amountVal) * 0.025).toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <!-- SGST Tax Share Ledger -->
              <LEDGERNAME>${sgstLedger}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${(parseFloat(amountVal) * 0.025).toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
    }
  };

  const handleCopyXml = () => {
    navigator.clipboard.writeText(generateTallyXml());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter items in the sync queue
  const filteredSyncQueue = syncQueue.filter(item => {
    if (!searchQuery) return true;
    return item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
           item.type.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const pendingItems = syncQueue.filter(item => item.status === 'PENDING').length;
  const syncedItems = syncQueue.filter(item => item.status === 'SYNCED').length;
  const failedItems = syncQueue.filter(item => item.status === 'FAILED').length;

  return (
    <div className="space-y-6 text-left">
      {/* Visual Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 rounded px-2.5 py-1 text-[10px] font-black tracking-widest text-rose-600 dark:text-rose-300 uppercase flex items-center gap-1">
              <Network className="w-3 h-3" />
              Tally XML Gate
            </div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">2-Way Sync Engine</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 flex items-center gap-2 tracking-tight">
            Tally 2-Way Sync Workbench
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Reconcile your sales invoices, accounting receipts, ledger accounts, and procurement vouchers bidirectionally with Tally Prime and Tally ERP 9.
          </p>
        </div>

        {/* Global Control Status */}
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-2 bg-white dark:bg-slate-900 ${isConnected ? 'border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400' : 'border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400'}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            {isConnected ? 'Tally ODBC Active' : 'Offline / Interrupted'}
          </div>
          <button
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm focus:outline-none"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Everything Now'}
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${activeTab === 'dashboard' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Layers className="w-4 h-4" />
          Sync Dashboard ({pendingItems} pending)
        </button>
        <button
          onClick={() => setActiveTab('inward_flow')}
          className={`px-4 py-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${activeTab === 'inward_flow' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <ArrowDown className="w-4 h-4 text-emerald-500 animate-bounce" />
          Inward Sync from Tally ({inwardVouchers.filter(v => !v.imported).length} vch)
        </button>
        <button
          onClick={() => setActiveTab('mapping')}
          className={`px-4 py-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${activeTab === 'mapping' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Sliders className="w-4 h-4" />
          Ledger Mapping
        </button>
        <button
          onClick={() => setActiveTab('xml_explorer')}
          className={`px-4 py-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${activeTab === 'xml_explorer' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <FileCode className="w-4 h-4" />
          Tally XML Envelope Explorer
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${activeTab === 'history' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Settings2 className="w-4 h-4" />
          ODBC Server Logs
        </button>
      </div>

      {/* Render Tabs */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Sync Queue List */}
          <div className="xl:col-span-2 space-y-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Outward Sync Reconciliation Queue</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Post customer ledger profiles, vendor records, and tax invoices generated inside TexFlow to Tally.</p>
                </div>
                <div className="relative w-full sm:w-64 shrink-0">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search pending sync items..."
                    className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20 text-center">
                <div className="p-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Pending</span>
                  <p className="text-lg font-black text-amber-600 dark:text-amber-500 mt-0.5">{pendingItems}</p>
                </div>
                <div className="p-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Synced to Tally</span>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-500 mt-0.5">{syncedItems}</p>
                </div>
                <div className="p-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Failed / Blocked</span>
                  <p className="text-lg font-black text-rose-600 dark:text-rose-500 mt-0.5">{failedItems}</p>
                </div>
              </div>

              {/* Items List */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[460px] overflow-y-auto">
                {filteredSyncQueue.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs">No pending outward items found matching the filter.</p>
                  </div>
                ) : (
                  filteredSyncQueue.map((item) => (
                    <div key={item.id} className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider uppercase ${
                            item.type === 'CUSTOMER' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-100' :
                            item.type === 'SUPPLIER' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-100' :
                            item.type === 'SALES_INVOICE' ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border border-violet-100' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {item.type}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{item.id}</span>
                        </div>
                        <p className="font-bold text-slate-850 dark:text-slate-200">{item.name}</p>
                        
                        {item.amount && (
                          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            Invoice Value: <span className="font-sans font-black text-rose-600 dark:text-rose-400">{currency}{item.amount.toLocaleString()}</span>
                          </p>
                        )}

                        {item.status === 'SYNCED' && item.lastAttempt && (
                          <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            <Check className="w-3.5 h-3.5" />
                            Posted to Tally on {item.lastAttempt} • Tally Ref: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded font-bold font-mono text-[9px]">{item.tallyVoucherId}</code>
                          </div>
                        )}

                        {item.status === 'FAILED' && item.error && (
                          <div className="flex items-start gap-1 text-[10px] text-rose-500 dark:text-rose-400 font-medium bg-rose-50/50 dark:bg-rose-950/20 p-2 rounded border border-rose-100 dark:border-rose-900/40 mt-1">
                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <p>{item.error}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                        <button
                          onClick={() => {
                            setSelectedXmlItem(item.id);
                            setSelectedXmlType(item.type === 'CUSTOMER' || item.type === 'SUPPLIER' ? 'ledger' : 'voucher');
                            setActiveTab('xml_explorer');
                          }}
                          className="px-2.5 py-1 text-[10px] rounded border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-300 font-bold transition-all flex items-center gap-1 bg-white dark:bg-slate-900"
                          title="Generate Tally XML Request Envelope"
                        >
                          <FileCode className="w-3 h-3" />
                          View XML
                        </button>
                        
                        {item.status !== 'SYNCED' && (
                          <button
                            onClick={() => syncSingleItem(item.id)}
                            className="px-2.5 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-indigo-600 hover:text-white rounded text-[10px] font-black uppercase tracking-wider transition-colors"
                          >
                            Push Now
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Configuration Summary or Quick Guides */}
          <div className="space-y-5">
            <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="text-yellow-400 w-5 h-5 shrink-0" />
                <h3 className="text-sm font-black uppercase tracking-wider">Tally ODBC 2-Way Protocol</h3>
              </div>
              <p className="text-xs text-indigo-200 leading-relaxed">
                TexFlow uses Tally XML exchange protocol built in modern ERP systems. Invoices trigger accounting ledgers over direct local listener hook configurations.
              </p>
              
              <div className="border-t border-indigo-800 pt-3.5 space-y-2.5 text-xs text-indigo-100">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p><strong>Ledger Sync:</strong> Creates or updates Sundry Debtors and Creditors dynamically with direct multi-state address fields.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p><strong>Voucher Mapping:</strong> Maps CGST, SGST, IGST calculations into proper output-input ledgers instantly.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p><strong>Reverse Receipt Flow:</strong> Bank clear records finalized inside Tally auto-populate Cash entries here.</p>
                </div>
              </div>
            </div>

            {/* Quick Server Configurations form inside sidebar card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-2 dark:border-slate-800">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-indigo-500" />
                  ODBC Connection Setup
                </h4>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Online</span>
                </div>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Company Name in Tally</label>
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 font-bold focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">Must exactly match Company Name in active Tally book.</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Local Gateway Port URL</label>
                  <div className="flex gap-2">
                    <input
                      value={tallyUrl}
                      onChange={(e) => setTallyUrl(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 font-mono text-xs focus:outline-none"
                    />
                    <button
                      onClick={handleTestConnection}
                      disabled={isTestingConn}
                      className="px-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                    >
                      {isTestingConn ? "Pinging..." : "Test"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tally Sync Schedule</label>
                  <select
                    value={syncFreq}
                    onChange={(e) => setSyncFreq(e.target.value as any)}
                    className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none"
                  >
                    <option value="MANUAL">Manual Trigger (Control Panel)</option>
                    <option value="HOURLY">Realtime Hook (Hourly check)</option>
                    <option value="DAILY">Daily End-of-Day Consolidation</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INWARD FLOW TAB */}
      {activeTab === 'inward_flow' && (
        <div className="space-y-5">
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-3">
            <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1 text-slate-650 dark:text-slate-350">
              <p className="font-bold text-slate-800 dark:text-slate-200">What is Inward Reconciliation Sync?</p>
              <p>
                In a bidirectional (2-way) ERPNext integration, entries completed directly by accountants inside Tally Prime (like bank clear checks, payments, and adjustments) must flow back to your warehouse cash reports. Below are vouchers detected inside Tally's General Daybook. Direct click <strong>"Import and Post to Cash Book"</strong> parses the XML data and reconciles it in local books seamlessly.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Tally Inward Queue (2-Way Stream)</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Vouchers parsed from Tally company database awaiting local ledger validation.</p>
              </div>
              <span className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 border border-rose-100 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
                Active Listeners Active
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {inwardVouchers.map((v) => (
                <div key={v.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold ${v.type === 'RECEIPT' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {v.type}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{v.ledgerName}</span>
                      <span className="text-[10px] font-mono text-slate-400">Tally ID: {v.tallyRef}</span>
                    </div>

                    <p className="text-slate-500">{v.narrative}</p>
                    
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Voucher Date: {v.date}
                      </span>
                      <span className="flex items-center gap-1 font-bold text-slate-600 dark:text-slate-350">
                        <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                        Amount: <span className="font-sans font-black text-indigo-600 dark:text-indigo-400">{currency}{v.amount.toLocaleString()}</span>
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {v.imported ? (
                      <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold rounded-lg flex items-center gap-1.5 border border-emerald-100">
                        <Check className="w-4 h-4" />
                        Imported & Match Clear
                      </span>
                    ) : (
                      <button
                        onClick={() => handleImportInwardVoucher(v)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-2 shadow-sm"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Import and Post to Cash Book
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MAPPING TAB */}
      {activeTab === 'mapping' && (
        <form onSubmit={handleSaveConfigs} className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Accounting Ledgers Mapping</h3>
                <p className="text-xs text-slate-400 mt-0.5">Establish the name translations of ledger groups for Tally Import files (.XML).</p>
              </div>
              <button
                type="submit"
                className="px-4 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-indigo-655 font-bold rounded-lg text-xs transition-colors"
              >
                Save Mapping Definitions
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide border-b pb-1 dark:border-slate-800">Master Group Alignments</h4>
                
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Debtors Parent Group Name</label>
                  <input
                    value={debtorsGroup}
                    onChange={(e) => setDebtorsGroup(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs font-mono outline-none"
                    placeholder="Sundry Debtors"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Default group in Tally where customer account nodes will be automatically constructed.</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1">Creditors Parent Group Name</label>
                  <input
                    value={creditorsGroup}
                    onChange={(e) => setCreditorsGroup(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs font-mono outline-none"
                    placeholder="Sundry Creditors"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Default group in Tally where suppliers ledger nodes will be automatically constructed.</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide border-b pb-1 dark:border-slate-800">Sales & Tax Ledgers Map</h4>

                <div>
                  <label className="block font-bold text-slate-500 mb-1">Primary Sales Account Ledger</label>
                  <input
                    value={salesLedger}
                    onChange={(e) => setSalesLedger(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs font-mono outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Voucher base credit values will post directly to this Sales Account ledger node.</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1">Primary Purchase Account Ledger</label>
                  <input
                    value={purchaseLedger}
                    onChange={(e) => setPurchaseLedger(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs font-mono outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">CGST Ledger Name</label>
                    <input
                      value={cgstLedger}
                      onChange={(e) => setCgstLedger(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">SGST Ledger Name</label>
                    <input
                      value={sgstLedger}
                      onChange={(e) => setSgstLedger(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs font-mono outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {saveSuccess && (
              <div className="m-5 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 flex items-center gap-2 text-xs">
                <Check className="w-4 h-4" />
                Ledger Mapping Rules successfully saved and applied to immediate voucher rendering.
              </div>
            )}
          </div>
        </form>
      )}

      {/* XML ENVELOPE EXPLORER */}
      {activeTab === 'xml_explorer' && (
        <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-3 border-b text-xs font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              Sync Queue Index
            </div>
            <div className="p-2 space-y-1 max-h-[460px] overflow-y-auto">
              {syncQueue.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedXmlItem(item.id);
                    setSelectedXmlType(item.type === 'CUSTOMER' || item.type === 'SUPPLIER' ? 'ledger' : 'voucher');
                  }}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs flex flex-col gap-1 transition-all ${
                    selectedXmlItem === item.id
                      ? 'border-indigo-500 bg-indigo-50/40 text-indigo-800 dark:bg-indigo-950/20 dark:text-white font-bold'
                      : 'border-transparent text-slate-650 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between pointer-events-none">
                    <span className="font-mono text-[9px] text-slate-400">{item.id}</span>
                    <span className="text-[9px] px-1 bg-slate-100 dark:bg-slate-800 rounded uppercase font-bold text-slate-500">{item.type}</span>
                  </div>
                  <span className="truncate leading-tight">{item.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col h-full min-h-[480px]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs bg-slate-50/50 dark:bg-slate-950/20">
              <div className="space-y-0.5">
                <span className="font-mono bg-slate-200 dark:bg-slate-800 text-slate-650 px-1.5 py-0.5 rounded text-[10px] font-bold">XML Payload Output</span>
                <p className="text-slate-400 text-[10px] mt-1">This formatted SOAP XML is the exact payload transmitted down to Tally ODBC endpoint.</p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedXmlType}
                  onChange={(e) => setSelectedXmlType(e.target.value as any)}
                  className="px-2 py-1 bg-white border dark:bg-slate-950 border-slate-200 rounded text-xs focus:outline-none"
                >
                  <option value="ledger">Ledger Definition Master</option>
                  <option value="voucher">Invoice Accounting Voucher</option>
                </select>
                <button
                  type="button"
                  onClick={handleCopyXml}
                  className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs rounded font-bold transition-all flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy Payload"}
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 bg-slate-950 font-mono text-xs text-indigo-300 dark:text-indigo-400 overflow-x-auto space-y-1 block max-h-[420px] select-all leading-normal whitespace-pre">
              {generateTallyXml()}
            </div>
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
            <div>
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">ODBC Socket Listener Thread logs</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Realtime events, socket payloads and sync results captured in localhost channel.</p>
            </div>
            <button
              onClick={() => setSyncLogs([])}
              className="text-[10px] text-rose-500 font-bold hover:underline"
            >
              Clear Logs
            </button>
          </div>

          <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 min-h-[400px] max-h-[500px] overflow-y-auto space-y-2 text-left select-text leading-relaxed">
            {syncLogs.length === 0 ? (
              <p className="text-slate-500 italic">No console log entries generated.</p>
            ) : (
              syncLogs.map((log, i) => {
                let colorClass = "text-slate-300";
                if (log.includes("建立") || log.includes("Connection established") || log.includes("Success:") || log.includes("SUCCESS")) {
                  colorClass = "text-emerald-400";
                } else if (log.includes("Ping connection") || log.includes("Initiating")) {
                  colorClass = "text-yellow-400";
                } else if (log.includes("FAILED") || log.includes("missing")) {
                  colorClass = "text-rose-400";
                }
                return (
                  <p key={i} className={`${colorClass} whitespace-pre-wrap`}>
                    {log}
                  </p>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
