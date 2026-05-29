
import React, { useState, useMemo, useCallback } from 'react';
import {
  Transaction, Customer, Karigar, PurchaseOrder, Order,
  Agent, Budget, TeamMember, LoanRecord, Supplier
} from '../types';
import {
  Wallet, BookOpen, Printer, Download, History,
  ArrowDownLeft, ArrowUpRight, Search, Plus, CreditCard,
  Landmark, BarChart3, TrendingUp, IndianRupee,
  FileText, Filter, User, X, ChevronDown, ChevronUp,
  RefreshCw, CheckCircle, AlertCircle, Clock, Banknote,
  Receipt, Calculator, PiggyBank, Scale, Building2,
  ArrowLeftRight, TrendingDown, Package, Truck, Scissors
} from 'lucide-react';
import BaseModal from './BaseModal';

// ─── Types ────────────────────────────────────────────────────────────────────

type MainTab =
  | 'LEDGER'
  | 'DAYBOOK'
  | 'TRIAL_BALANCE'
  | 'PROFIT_LOSS'
  | 'BALANCE_SHEET'
  | 'CASH_FLOW'
  | 'GST'
  | 'PAYABLES'
  | 'RECEIVABLES'
  | 'JOURNAL'
  | 'RECONCILE';

type LedgerType = 'CLIENT' | 'KARIGAR' | 'BROKER' | 'STAFF' | 'SUPPLIER';

interface JournalEntry {
  id: string;
  date: string;
  narration: string;
  entries: { account: string; accountType: 'DEBIT' | 'CREDIT'; amount: number }[];
  voucherType: 'PAYMENT' | 'RECEIPT' | 'CONTRA' | 'JOURNAL' | 'SALES' | 'PURCHASE';
  createdAt: string;
  isReconciled?: boolean;
}

interface AccountingProps {
  transactions: Transaction[];
  onAddTransaction: (t: Transaction) => void;
  purchaseOrders?: PurchaseOrder[];
  salesOrders?: Order[];
  customers?: Customer[];
  karigars?: Karigar[];
  agents?: Agent[];
  team?: TeamMember[];
  loans?: LoanRecord[];
  suppliers?: Supplier[];
  currency?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number, cur = '₹') =>
  `${cur}${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const today = () => new Date().toISOString().split('T')[0];

const VOUCHER_COLORS: Record<string, string> = {
  PAYMENT:  'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  RECEIPT:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  CONTRA:   'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  JOURNAL:  'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  SALES:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  PURCHASE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string; value: string; sub?: string;
  color?: string; icon: React.ReactNode; trend?: number;
}> = ({ label, value, sub, color = 'text-slate-800 dark:text-white', icon, trend }) => (
  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
      <span className="text-slate-400">{icon}</span>
    </div>
    <div className={`text-2xl font-black tabular-nums ${color}`}>{value}</div>
    {sub && <div className="text-[11px] text-slate-400 font-medium">{sub}</div>}
    {trend !== undefined && (
      <div className={`flex items-center gap-1 text-xs font-bold ${trend >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
        {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {Math.abs(trend).toFixed(1)}% vs last month
      </div>
    )}
  </div>
);

const SectionHeader: React.FC<{ title: string; subtitle?: string; children?: React.ReactNode }> = ({
  title, subtitle, children
}) => (
  <div className="flex items-center justify-between mb-4">
    <div>
      <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">{title}</h3>
      {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const Accounting: React.FC<AccountingProps> = ({
  transactions, onAddTransaction,
  purchaseOrders = [], salesOrders = [],
  customers = [], karigars = [], agents = [],
  team = [], loans = [], suppliers = [],
  currency = '₹'
}) => {
  const [activeTab, setActiveTab] = useState<MainTab>('DAYBOOK');
  const [ledgerType, setLedgerType] = useState<LedgerType>('CLIENT');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterVoucher, setFilterVoucher] = useState('ALL');

  // Modal state
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [journals, setJournals] = useState<JournalEntry[]>([]);

  const [entryForm, setEntryForm] = useState({
    amount: 0, type: 'DEBIT' as 'CREDIT' | 'DEBIT',
    description: '', date: today(),
    paymentMethod: 'CASH' as string,
    voucherType: 'PAYMENT' as JournalEntry['voucherType'],
    category: 'OTHER'
  });

  const [journalForm, setJournalForm] = useState<{
    date: string; narration: string;
    voucherType: JournalEntry['voucherType'];
    debitAccount: string; debitAmount: number;
    creditAccount: string; creditAmount: number;
  }>({
    date: today(), narration: '', voucherType: 'JOURNAL',
    debitAccount: '', debitAmount: 0,
    creditAccount: '', creditAmount: 0
  });

  // ── Computed financials ───────────────────────────────────────────────────

  const totalIncome  = useMemo(() => transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0), [transactions]);
  const totalExpense = useMemo(() => transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0), [transactions]);
  const netProfit    = totalIncome - totalExpense;
  const cashBalance  = useMemo(() =>
    transactions.filter(t => t.paymentMethod === 'CASH')
      .reduce((s, t) => s + (t.type === 'INCOME' ? t.amount : -t.amount), 0),
    [transactions]
  );
  const bankBalance  = useMemo(() =>
    transactions.filter(t => t.paymentMethod === 'BANK')
      .reduce((s, t) => s + (t.type === 'INCOME' ? t.amount : -t.amount), 0),
    [transactions]
  );

  const totalPurchase = useMemo(() => purchaseOrders.reduce((s, p) => s + p.totalAmount, 0), [purchaseOrders]);
  const totalSales    = useMemo(() => salesOrders.reduce((s, o) => s + o.totalAmount, 0), [salesOrders]);

  const totalReceivable = useMemo(() =>
    salesOrders.filter(o => o.paymentStatus !== 'PAID').reduce((s, o) => s + o.totalAmount, 0),
    [salesOrders]
  );
  const totalPayable = useMemo(() =>
    purchaseOrders.filter(p => p.status !== 'CANCELLED').reduce((s, p) => s + p.totalAmount, 0),
    [purchaseOrders]
  );

  // GST
  const gst = useMemo(() => {
    const input  = purchaseOrders.reduce((s, p) => s + (p.totalAmount * (p.taxRate || 5) / 100), 0);
    const output = salesOrders.reduce((s, o) => s + (o.totalAmount * (o.taxRate || 5) / 100), 0);
    return { input, output, net: output - input };
  }, [purchaseOrders, salesOrders]);

  // Daybook (all transactions, filtered)
  const daybookRows = useMemo(() => {
    return transactions.filter(t => {
      const q = searchQ.toLowerCase();
      const matchSearch = !q || t.description?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q);
      const matchFrom   = !dateFrom || t.date >= dateFrom;
      const matchTo     = !dateTo   || t.date <= dateTo;
      return matchSearch && matchFrom && matchTo;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchQ, dateFrom, dateTo]);

  const daybookIn  = daybookRows.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const daybookOut = daybookRows.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);

  // Ledger
  const activeAccount = useMemo(() => {
    if (ledgerType === 'CLIENT')   return customers.find(c => c.id === selectedAccountId);
    if (ledgerType === 'KARIGAR')  return karigars.find(k => k.id === selectedAccountId);
    if (ledgerType === 'STAFF')    return team.find(t => t.id === selectedAccountId);
    if (ledgerType === 'SUPPLIER') return suppliers.find(s => s.id === selectedAccountId);
    return agents.find(a => a.id === selectedAccountId);
  }, [ledgerType, selectedAccountId, customers, karigars, agents, team, suppliers]);

  const ledgerRows = useMemo(() => {
    if (!selectedAccountId) return [];
    const entries: { date: string; time: string; desc: string; dr: number; cr: number }[] = [];

    transactions
      .filter(t => t.referenceId === selectedAccountId)
      .forEach(t => entries.push({
        date: t.date,
        time: t.updatedAt ? new Date(t.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        desc: t.description || 'Transaction',
        dr: t.type === 'EXPENSE' ? t.amount : 0,
        cr: t.type === 'INCOME' ? t.amount : 0
      }));

    if (ledgerType === 'BROKER') {
      salesOrders
        .filter(o => o.agentId === selectedAccountId || o.agentName === activeAccount?.name)
        .forEach(o => entries.push({
          date: o.orderDate, time: '',
          desc: `Commission: Order #${o.id}`,
          dr: 0, cr: o.agentCommissionAmount || 0
        }));
    }

    if (ledgerType === 'STAFF') {
      loans.filter(l => l.employeeId === selectedAccountId).forEach(l =>
        entries.push({
          date: l.date, time: '',
          desc: l.type === 'GIVEN' ? `Advance Given: ${l.notes}` : `Advance Repaid: ${l.notes}`,
          dr: l.type === 'GIVEN' ? l.amount : 0,
          cr: l.type === 'REPAID' ? l.amount : 0
        })
      );
    }

    if (ledgerType === 'CLIENT') {
      salesOrders
        .filter(o => {
          const cust = customers.find(c => c.id === selectedAccountId);
          return o.customerName === cust?.name;
        })
        .forEach(o => entries.push({
          date: o.orderDate, time: '',
          desc: `Sales Order #${o.id} – ${o.status}`,
          dr: 0, cr: o.totalAmount
        }));
    }

    if (ledgerType === 'SUPPLIER') {
      purchaseOrders
        .filter(p => p.supplierId === selectedAccountId)
        .forEach(p => entries.push({
          date: p.date, time: '',
          desc: `Purchase Order #${p.id} – ${p.status}`,
          dr: p.totalAmount, cr: 0
        }));
    }

    let running = 0;
    return entries
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(e => { running += (e.cr - e.dr); return { ...e, balance: running }; });
  }, [selectedAccountId, transactions, ledgerType, salesOrders, purchaseOrders, activeAccount, loans, customers, suppliers]);

  // Receivables ageing
  const receivables = useMemo(() => {
    const now = Date.now();
    return salesOrders
      .filter(o => o.paymentStatus !== 'PAID')
      .map(o => {
        const days = Math.floor((now - new Date(o.orderDate).getTime()) / 86400000);
        const bucket = days <= 30 ? '0–30 days' : days <= 60 ? '31–60 days' : days <= 90 ? '61–90 days' : '90+ days';
        return { ...o, daysOld: days, bucket };
      })
      .sort((a, b) => b.daysOld - a.daysOld);
  }, [salesOrders]);

  const payables = useMemo(() => {
    const now = Date.now();
    return purchaseOrders
      .filter(p => p.status !== 'CANCELLED' && p.status !== 'RECEIVED')
      .map(p => {
        const days = Math.floor((now - new Date(p.date).getTime()) / 86400000);
        const bucket = days <= 30 ? '0–30 days' : days <= 60 ? '31–60 days' : days <= 90 ? '61–90 days' : '90+ days';
        return { ...p, daysOld: days, bucket };
      })
      .sort((a, b) => b.daysOld - a.daysOld);
  }, [purchaseOrders]);

  // Trial balance
  const trialBalance = useMemo(() => {
    const map: Record<string, { dr: number; cr: number }> = {};
    const add = (acct: string, dr: number, cr: number) => {
      if (!map[acct]) map[acct] = { dr: 0, cr: 0 };
      map[acct].dr += dr; map[acct].cr += cr;
    };
    transactions.forEach(t => {
      if (t.type === 'INCOME')  add(t.category || 'Revenue', 0, t.amount);
      if (t.type === 'EXPENSE') add(t.category || 'Expense', t.amount, 0);
    });
    salesOrders.forEach(o  => add('Sales', 0, o.totalAmount));
    purchaseOrders.forEach(p => add('Purchases', p.totalAmount, 0));
    return Object.entries(map).map(([name, v]) => ({ name, dr: v.dr, cr: v.cr, net: v.cr - v.dr }));
  }, [transactions, salesOrders, purchaseOrders]);

  const tbTotalDr = trialBalance.reduce((s, r) => s + r.dr, 0);
  const tbTotalCr = trialBalance.reduce((s, r) => s + r.cr, 0);

  // P&L by month
  const plByMonth = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    transactions.forEach(t => {
      const m = t.date.slice(0, 7);
      if (!map[m]) map[m] = { income: 0, expense: 0 };
      if (t.type === 'INCOME')  map[m].income  += t.amount;
      if (t.type === 'EXPENSE') map[m].expense += t.amount;
    });
    return Object.entries(map).sort().slice(-6).map(([m, v]) => ({ month: m, ...v, profit: v.income - v.expense }));
  }, [transactions]);

  // Cash flow
  const cashFlow = useMemo(() => {
    const operating = transactions.filter(t => ['SALES','PURCHASES','SALARY','COMMISSION'].includes(t.category))
      .reduce((s, t) => s + (t.type === 'INCOME' ? t.amount : -t.amount), 0);
    const investing = transactions.filter(t => t.category === 'ASSET')
      .reduce((s, t) => s + (t.type === 'INCOME' ? t.amount : -t.amount), 0);
    const financing = transactions.filter(t => ['LOAN','CAPITAL'].includes(t.category))
      .reduce((s, t) => s + (t.type === 'INCOME' ? t.amount : -t.amount), 0);
    return { operating, investing, financing, net: operating + investing + financing };
  }, [transactions]);

  // Handlers
  const handlePostEntry = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId || !entryForm.amount) return;
    onAddTransaction({
      id: `TXN-${Date.now()}`,
      description: entryForm.description || `${ledgerType} Entry`,
      amount: entryForm.amount,
      date: entryForm.date,
      type: entryForm.type === 'DEBIT' ? 'EXPENSE' : 'INCOME',
      category: entryForm.category,
      paymentMethod: entryForm.paymentMethod,
      referenceId: selectedAccountId,
      subType: ledgerType,
      updatedAt: new Date().toISOString()
    } as Transaction);
    setIsEntryModalOpen(false);
    setEntryForm({ amount: 0, type: 'DEBIT', description: '', date: today(), paymentMethod: 'CASH', voucherType: 'PAYMENT', category: 'OTHER' });
  }, [selectedAccountId, entryForm, ledgerType, onAddTransaction]);

  const handleAddJournal = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!journalForm.debitAmount || !journalForm.debitAccount) return;
    const je: JournalEntry = {
      id: `JE-${Date.now()}`,
      date: journalForm.date,
      narration: journalForm.narration,
      voucherType: journalForm.voucherType,
      createdAt: new Date().toISOString(),
      entries: [
        { account: journalForm.debitAccount,  accountType: 'DEBIT',  amount: journalForm.debitAmount },
        { account: journalForm.creditAccount, accountType: 'CREDIT', amount: journalForm.creditAmount || journalForm.debitAmount },
      ]
    };
    setJournals(prev => [je, ...prev]);
    // Also add as a transaction for balance tracking
    onAddTransaction({
      id: `TXN-${Date.now()}`,
      description: journalForm.narration,
      amount: journalForm.debitAmount,
      date: journalForm.date,
      type: 'EXPENSE',
      category: journalForm.voucherType,
      paymentMethod: 'JOURNAL',
      updatedAt: new Date().toISOString()
    } as Transaction);
    setIsJournalModalOpen(false);
    setJournalForm({ date: today(), narration: '', voucherType: 'JOURNAL', debitAccount: '', debitAmount: 0, creditAccount: '', creditAmount: 0 });
  }, [journalForm, onAddTransaction]);

  // ── Nav tabs config ───────────────────────────────────────────────────────

  const tabs: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    { id: 'DAYBOOK',       label: 'Day Book',       icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'LEDGER',        label: 'Ledger',         icon: <User className="w-3.5 h-3.5" /> },
    { id: 'JOURNAL',       label: 'Journal',        icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'RECEIVABLES',   label: 'Receivables',    icon: <ArrowDownLeft className="w-3.5 h-3.5" /> },
    { id: 'PAYABLES',      label: 'Payables',       icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
    { id: 'TRIAL_BALANCE', label: 'Trial Balance',  icon: <Scale className="w-3.5 h-3.5" /> },
    { id: 'PROFIT_LOSS',   label: 'P&L',            icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'BALANCE_SHEET', label: 'Balance Sheet',  icon: <Building2 className="w-3.5 h-3.5" /> },
    { id: 'CASH_FLOW',     label: 'Cash Flow',      icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
    { id: 'GST',           label: 'GST / Tax',      icon: <Receipt className="w-3.5 h-3.5" /> },
    { id: 'RECONCILE',     label: 'Reconcile',      icon: <CheckCircle className="w-3.5 h-3.5" /> },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 animate-fade-in font-sans">

      {/* ── Top header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
            Accounting & Finance
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Full double-entry ledger · GST · P&L · Balance Sheet
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="px-3 py-2 border bg-white dark:bg-slate-900 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1.5 border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          <button className="px-3 py-2 border bg-white dark:bg-slate-900 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1.5 border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button
            onClick={() => setIsJournalModalOpen(true)}
            className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" /> Journal Entry
          </button>
          <button
            onClick={() => setIsEntryModalOpen(true)}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" /> Quick Entry
          </button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <StatCard label="Net Profit"    value={fmt(netProfit, currency)}    color={netProfit>=0 ? 'text-emerald-600':'text-rose-600'} icon={<TrendingUp className="w-4 h-4"/>} />
        <StatCard label="Total Income"  value={fmt(totalIncome, currency)}  color="text-emerald-600" icon={<ArrowDownLeft className="w-4 h-4"/>} />
        <StatCard label="Total Expense" value={fmt(totalExpense, currency)} color="text-rose-500"    icon={<ArrowUpRight className="w-4 h-4"/>} />
        <StatCard label="Cash Balance"  value={fmt(cashBalance, currency)}  icon={<Wallet className="w-4 h-4"/>} />
        <StatCard label="Bank Balance"  value={fmt(bankBalance, currency)}  icon={<Landmark className="w-4 h-4"/>} />
        <StatCard label="GST Liability" value={fmt(Math.max(0, gst.net), currency)} color="text-amber-600" icon={<Receipt className="w-4 h-4"/>} />
      </div>

      {/* ── Tab nav ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          <div className="flex min-w-max px-2 py-1 gap-0.5">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all whitespace-nowrap
                  ${activeTab === t.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">

          {/* ════════════════════════════════════
              DAY BOOK
          ════════════════════════════════════ */}
          {activeTab === 'DAYBOOK' && (
            <div className="p-5">
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Search transactions..."
                    value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  />
                </div>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500" />
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>

              {/* Summary bar */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-center">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase">Total In</p>
                  <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">{fmt(daybookIn, currency)}</p>
                </div>
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-3 text-center">
                  <p className="text-[10px] font-bold text-rose-600 uppercase">Total Out</p>
                  <p className="text-lg font-black text-rose-700 dark:text-rose-400">{fmt(daybookOut, currency)}</p>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 text-center">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase">Net</p>
                  <p className={`text-lg font-black ${daybookIn-daybookOut>=0?'text-indigo-700 dark:text-indigo-400':'text-rose-600'}`}>{fmt(daybookIn-daybookOut, currency)}</p>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 sticky top-0 z-10">
                    <tr>
                      {['Date','Voucher Type','Description','Category','Method','Dr','Cr'].map(h => (
                        <th key={h} className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {daybookRows.map((t, i) => (
                      <tr key={t.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-slate-500 uppercase">{t.date}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.type === 'INCOME' ? VOUCHER_COLORS.RECEIPT : VOUCHER_COLORS.PAYMENT}`}>
                            {t.type === 'INCOME' ? 'Receipt' : 'Payment'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">{t.description}</td>
                        <td className="px-4 py-3 text-slate-500 uppercase font-medium">{t.category}</td>
                        <td className="px-4 py-3 text-slate-500 uppercase">{t.paymentMethod}</td>
                        <td className="px-4 py-3 text-right text-rose-500 font-bold tabular-nums">
                          {t.type === 'EXPENSE' ? fmt(t.amount, currency) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-bold tabular-nums">
                          {t.type === 'INCOME' ? fmt(t.amount, currency) : '-'}
                        </td>
                      </tr>
                    ))}
                    {daybookRows.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-16 text-center text-slate-400 text-xs italic">No transactions found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════
              LEDGER
          ════════════════════════════════════ */}
          {activeTab === 'LEDGER' && (
            <div className="p-5">
              <div className="flex flex-wrap gap-3 mb-5">
                <select
                  className="px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 font-bold uppercase"
                  value={ledgerType}
                  onChange={e => { setLedgerType(e.target.value as LedgerType); setSelectedAccountId(''); }}
                >
                  <option value="CLIENT">Customer Ledger</option>
                  <option value="KARIGAR">Karigar Ledger</option>
                  <option value="BROKER">Broker / Agent Ledger</option>
                  <option value="STAFF">Staff Ledger</option>
                  <option value="SUPPLIER">Supplier Ledger</option>
                </select>
                <select
                  className="px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 min-w-[200px]"
                  value={selectedAccountId}
                  onChange={e => setSelectedAccountId(e.target.value)}
                >
                  <option value="">— Select Party —</option>
                  {ledgerType === 'CLIENT'   && customers.map(c  => <option key={c.id}  value={c.id}>{c.name}</option>)}
                  {ledgerType === 'KARIGAR'  && karigars.map(k   => <option key={k.id}  value={k.id}>{k.name}</option>)}
                  {ledgerType === 'STAFF'    && team.map(m        => <option key={m.id}  value={m.id}>{m.name}</option>)}
                  {ledgerType === 'SUPPLIER' && suppliers.map(s  => <option key={s.id}  value={s.id}>{s.name}</option>)}
                  {ledgerType === 'BROKER'   && agents.map(a     => <option key={a.id}  value={a.id}>{a.name}</option>)}
                </select>
                {selectedAccountId && (
                  <button
                    onClick={() => setIsEntryModalOpen(true)}
                    className="ml-auto px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-700 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Entry
                  </button>
                )}
              </div>

              {activeAccount ? (
                <div>
                  {/* Account header card */}
                  <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl p-5 mb-4 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">{ledgerType} Account</p>
                      <h3 className="text-xl font-black uppercase tracking-tight">{activeAccount.name}</h3>
                      <p className="text-xs text-indigo-200 mt-1 uppercase">ID: {activeAccount.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-indigo-200 uppercase mb-1">Closing Balance</p>
                      <h3 className="text-3xl font-black tabular-nums">
                        {fmt(Math.abs(ledgerRows[ledgerRows.length-1]?.balance || 0), currency)}
                      </h3>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded mt-1 inline-block ${
                        (ledgerRows[ledgerRows.length-1]?.balance || 0) >= 0
                          ? 'bg-emerald-500/30 text-emerald-100'
                          : 'bg-rose-500/30 text-rose-100'
                      }`}>
                        {(ledgerRows[ledgerRows.length-1]?.balance || 0) >= 0 ? 'Credit' : 'Debit'}
                      </span>
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-950 sticky top-0 z-10">
                        <tr>
                          {['Date','Time','Narration / Reference','Debit (Dr)','Credit (Cr)','Balance'].map(h => (
                            <th key={h} className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {ledgerRows.slice().reverse().map((e, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-3 font-mono text-slate-500 uppercase">{e.date}</td>
                            <td className="px-4 py-3 text-[10px] text-slate-400">{e.time}</td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-[220px] truncate">{e.desc}</td>
                            <td className="px-4 py-3 text-right text-rose-500 font-bold tabular-nums">{e.dr > 0 ? fmt(e.dr, currency) : '—'}</td>
                            <td className="px-4 py-3 text-right text-emerald-600 font-bold tabular-nums">{e.cr > 0 ? fmt(e.cr, currency) : '—'}</td>
                            <td className={`px-4 py-3 text-right font-black tabular-nums border-l ${e.balance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}`}>
                              {fmt(Math.abs(e.balance), currency)} {e.balance >= 0 ? 'Cr' : 'Dr'}
                            </td>
                          </tr>
                        ))}
                        {ledgerRows.length === 0 && (
                          <tr><td colSpan={6} className="px-4 py-16 text-center text-slate-400 italic">No transactions for this account.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 opacity-40">
                  <BookOpen className="w-14 h-14 text-slate-400 mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">Select a party to view their ledger</p>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════
              JOURNAL ENTRIES
          ════════════════════════════════════ */}
          {activeTab === 'JOURNAL' && (
            <div className="p-5">
              <SectionHeader title="Journal Vouchers" subtitle="Double-entry bookkeeping records">
                <button onClick={() => setIsJournalModalOpen(true)} className="px-3 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-violet-700 transition-all">
                  <Plus className="w-3.5 h-3.5" /> New Journal
                </button>
              </SectionHeader>

              {journals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-40">
                  <FileText className="w-12 h-12 mb-3 text-slate-400" />
                  <p className="text-xs font-bold uppercase tracking-widest">No journal entries yet</p>
                  <p className="text-xs text-slate-400 mt-1">Create your first double-entry journal voucher</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {journals.map(j => (
                    <div key={j.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${VOUCHER_COLORS[j.voucherType] || VOUCHER_COLORS.JOURNAL}`}>
                            {j.voucherType}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 font-mono">{j.id}</span>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">{j.date}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mb-3">{j.narration}</p>
                      <div className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-900">
                            <tr>
                              <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-400 uppercase">Account</th>
                              <th className="px-3 py-2 text-right text-[10px] font-bold text-slate-400 uppercase">Debit</th>
                              <th className="px-3 py-2 text-right text-[10px] font-bold text-slate-400 uppercase">Credit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {j.entries.map((en, i) => (
                              <tr key={i}>
                                <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">
                                  {en.accountType === 'CREDIT' && <span className="ml-4" />}{en.account}
                                </td>
                                <td className="px-3 py-2 text-right text-rose-500 font-bold tabular-nums">
                                  {en.accountType === 'DEBIT' ? fmt(en.amount, currency) : '—'}
                                </td>
                                <td className="px-3 py-2 text-right text-emerald-600 font-bold tabular-nums">
                                  {en.accountType === 'CREDIT' ? fmt(en.amount, currency) : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════
              RECEIVABLES
          ════════════════════════════════════ */}
          {activeTab === 'RECEIVABLES' && (
            <div className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {['0–30 days','31–60 days','61–90 days','90+ days'].map(bucket => {
                  const amt = receivables.filter(r => r.bucket === bucket).reduce((s, r) => s + r.totalAmount, 0);
                  const color = bucket === '0–30 days' ? 'text-emerald-600' : bucket === '31–60 days' ? 'text-amber-600' : bucket === '61–90 days' ? 'text-orange-600' : 'text-rose-600';
                  return (
                    <div key={bucket} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{bucket}</p>
                      <p className={`text-xl font-black tabular-nums ${color}`}>{fmt(amt, currency)}</p>
                    </div>
                  );
                })}
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-950">
                    <tr>
                      {['Order #','Customer','Order Date','Due','Amount','Age','Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200 dark:border-slate-800">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {receivables.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-slate-500">{r.id}</td>
                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-white uppercase">{r.customerName}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono">{r.orderDate}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono">{r.dueDate || '—'}</td>
                        <td className="px-4 py-3 font-black text-slate-800 dark:text-white tabular-nums">{fmt(r.totalAmount, currency)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.daysOld <= 30 ? 'bg-emerald-100 text-emerald-700' :
                            r.daysOld <= 60 ? 'bg-amber-100 text-amber-700' :
                            r.daysOld <= 90 ? 'bg-orange-100 text-orange-700' :
                            'bg-rose-100 text-rose-700'
                          }`}>{r.daysOld}d</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold uppercase">{r.paymentStatus}</span>
                        </td>
                      </tr>
                    ))}
                    {receivables.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-16 text-center text-slate-400 italic">All orders paid. No pending receivables.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════
              PAYABLES
          ════════════════════════════════════ */}
          {activeTab === 'PAYABLES' && (
            <div className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {['0–30 days','31–60 days','61–90 days','90+ days'].map(bucket => {
                  const amt = payables.filter(p => p.bucket === bucket).reduce((s, p) => s + p.totalAmount, 0);
                  const color = bucket === '0–30 days' ? 'text-emerald-600' : bucket === '31–60 days' ? 'text-amber-600' : bucket === '61–90 days' ? 'text-orange-600' : 'text-rose-600';
                  return (
                    <div key={bucket} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{bucket}</p>
                      <p className={`text-xl font-black tabular-nums ${color}`}>{fmt(amt, currency)}</p>
                    </div>
                  );
                })}
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-950">
                    <tr>
                      {['PO #','Supplier','Date','Expected','Amount','Age','Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200 dark:border-slate-800">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {payables.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-slate-500">{p.id}</td>
                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-white uppercase">{p.supplierName}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono">{p.date}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono">{p.expectedDate || '—'}</td>
                        <td className="px-4 py-3 font-black text-slate-800 dark:text-white tabular-nums">{fmt(p.totalAmount, currency)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.daysOld <= 30 ? 'bg-emerald-100 text-emerald-700' :
                            p.daysOld <= 60 ? 'bg-amber-100 text-amber-700' :
                            p.daysOld <= 90 ? 'bg-orange-100 text-orange-700' :
                            'bg-rose-100 text-rose-700'
                          }`}>{p.daysOld}d</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            p.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-700' :
                            p.status === 'SENT'     ? 'bg-sky-100 text-sky-700' :
                            p.status === 'DRAFT'    ? 'bg-slate-100 text-slate-500' :
                            'bg-rose-100 text-rose-700'
                          }`}>{p.status}</span>
                        </td>
                      </tr>
                    ))}
                    {payables.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-16 text-center text-slate-400 italic">No pending payables.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════
              TRIAL BALANCE
          ════════════════════════════════════ */}
          {activeTab === 'TRIAL_BALANCE' && (
            <div className="p-5">
              <SectionHeader title="Trial Balance" subtitle="All accounts with debit/credit totals">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${Math.abs(tbTotalDr - tbTotalCr) < 0.01 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {Math.abs(tbTotalDr - tbTotalCr) < 0.01 ? '✓ Balanced' : '✗ Unbalanced'}
                </span>
              </SectionHeader>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-950">
                    <tr>
                      {['Account / Head','Debit Total','Credit Total','Net'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200 dark:border-slate-800">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {trialBalance.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300 uppercase">{r.name}</td>
                        <td className="px-4 py-3 text-right text-rose-500 font-bold tabular-nums">{r.dr > 0 ? fmt(r.dr, currency) : '—'}</td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-bold tabular-nums">{r.cr > 0 ? fmt(r.cr, currency) : '—'}</td>
                        <td className={`px-4 py-3 text-right font-black tabular-nums ${r.net >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {fmt(Math.abs(r.net), currency)} {r.net >= 0 ? 'Cr' : 'Dr'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 dark:bg-slate-800 font-black border-t-2 border-slate-300 dark:border-slate-600">
                    <tr>
                      <td className="px-4 py-3 uppercase text-slate-700 dark:text-slate-200">TOTAL</td>
                      <td className="px-4 py-3 text-right text-rose-600 tabular-nums">{fmt(tbTotalDr, currency)}</td>
                      <td className="px-4 py-3 text-right text-emerald-700 tabular-nums">{fmt(tbTotalCr, currency)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">{fmt(Math.abs(tbTotalCr - tbTotalDr), currency)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════
              PROFIT & LOSS
          ════════════════════════════════════ */}
          {activeTab === 'PROFIT_LOSS' && (
            <div className="p-5 max-w-3xl mx-auto">
              <SectionHeader title="Profit & Loss Statement" subtitle="Income vs Expenses by period" />
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Total Revenue</p>
                  <p className="text-3xl font-black text-emerald-700 dark:text-emerald-400">{fmt(totalIncome, currency)}</p>
                  <p className="text-xs text-emerald-600 mt-1">Sales + Other Income</p>
                </div>
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-5">
                  <p className="text-[10px] font-bold text-rose-600 uppercase mb-1">Total Expenses</p>
                  <p className="text-3xl font-black text-rose-700 dark:text-rose-400">{fmt(totalExpense, currency)}</p>
                  <p className="text-xs text-rose-600 mt-1">Purchases + Overheads</p>
                </div>
              </div>
              <div className={`rounded-2xl p-6 text-center mb-6 ${netProfit >= 0 ? 'bg-emerald-600' : 'bg-rose-600'} text-white`}>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Net Profit / (Loss)</p>
                <p className="text-4xl font-black tabular-nums">{fmt(netProfit, currency)}</p>
                <p className="text-sm opacity-70 mt-1">{netProfit >= 0 ? 'Profitable period' : 'Loss period'}</p>
              </div>

              {/* Monthly trend */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-4">Monthly Trend (Last 6 months)</p>
                <div className="space-y-3">
                  {plByMonth.map(m => {
                    const maxVal = Math.max(...plByMonth.map(x => Math.max(x.income, x.expense)), 1);
                    return (
                      <div key={m.month}>
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-1">
                          <span>{m.month}</span>
                          <span className={m.profit >= 0 ? 'text-emerald-600' : 'text-rose-500'}>{fmt(m.profit, currency)}</span>
                        </div>
                        <div className="flex gap-1 items-center h-4">
                          <div className="bg-emerald-400 rounded-sm h-3 transition-all" style={{ width: `${(m.income / maxVal) * 60}%` }} />
                          <div className="bg-rose-400 rounded-sm h-3 transition-all" style={{ width: `${(m.expense / maxVal) * 60}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-3 text-[10px] font-bold text-slate-400 uppercase">
                  <span className="flex items-center gap-1"><span className="w-3 h-2 bg-emerald-400 rounded-sm inline-block" /> Income</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-2 bg-rose-400 rounded-sm inline-block" /> Expense</span>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════
              BALANCE SHEET
          ════════════════════════════════════ */}
          {activeTab === 'BALANCE_SHEET' && (
            <div className="p-5 max-w-3xl mx-auto">
              <SectionHeader title="Balance Sheet" subtitle="Assets = Liabilities + Equity (simplified)" />
              <div className="grid grid-cols-2 gap-5">
                {/* Assets */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="bg-sky-600 text-white px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest">Assets</p>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[
                      { label: 'Cash in Hand',  value: cashBalance },
                      { label: 'Bank Balance',  value: bankBalance },
                      { label: 'Trade Receivables', value: totalReceivable },
                      { label: 'Inventory (est.)', value: totalPurchase * 0.4 },
                    ].map(r => (
                      <div key={r.label} className="flex justify-between px-4 py-3 text-xs">
                        <span className="text-slate-500 font-medium">{r.label}</span>
                        <span className="font-black text-slate-800 dark:text-white tabular-nums">{fmt(r.value, currency)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between px-4 py-3 text-xs bg-sky-50 dark:bg-sky-900/20 font-black">
                      <span className="text-sky-700 dark:text-sky-400 uppercase">Total Assets</span>
                      <span className="text-sky-700 dark:text-sky-400 tabular-nums">{fmt(cashBalance + bankBalance + totalReceivable, currency)}</span>
                    </div>
                  </div>
                </div>
                {/* Liabilities + Equity */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="bg-violet-600 text-white px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest">Liabilities & Equity</p>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[
                      { label: 'Trade Payables',   value: totalPayable },
                      { label: 'GST Payable',       value: Math.max(0, gst.net) },
                      { label: 'Salary Payable',    value: team.reduce((s, m) => s + (m.dailyWage || 0) * 30, 0) * 0.1 },
                    ].map(r => (
                      <div key={r.label} className="flex justify-between px-4 py-3 text-xs">
                        <span className="text-slate-500 font-medium">{r.label}</span>
                        <span className="font-black text-slate-800 dark:text-white tabular-nums">{fmt(r.value, currency)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between px-4 py-3 text-xs">
                      <span className="text-emerald-600 font-bold">Retained Earnings</span>
                      <span className={`font-black tabular-nums ${netProfit>=0?'text-emerald-600':'text-rose-500'}`}>{fmt(netProfit, currency)}</span>
                    </div>
                    <div className="flex justify-between px-4 py-3 text-xs bg-violet-50 dark:bg-violet-900/20 font-black">
                      <span className="text-violet-700 dark:text-violet-400 uppercase">Total Liabilities + Equity</span>
                      <span className="text-violet-700 dark:text-violet-400 tabular-nums">{fmt(totalPayable + Math.max(0, gst.net) + netProfit, currency)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════
              CASH FLOW
          ════════════════════════════════════ */}
          {activeTab === 'CASH_FLOW' && (
            <div className="p-5 max-w-2xl mx-auto">
              <SectionHeader title="Cash Flow Statement" subtitle="Operating · Investing · Financing" />
              <div className="space-y-3">
                {[
                  { label: 'Operating Activities',  value: cashFlow.operating,  desc: 'Sales, purchases, salaries, commissions', icon: <Package className="w-5 h-5" /> },
                  { label: 'Investing Activities',  value: cashFlow.investing,   desc: 'Asset purchases / disposals', icon: <Building2 className="w-5 h-5" /> },
                  { label: 'Financing Activities',  value: cashFlow.financing,   desc: 'Loans, capital injections', icon: <Landmark className="w-5 h-5" /> },
                ].map(r => (
                  <div key={r.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">{r.icon}</div>
                      <div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{r.label}</p>
                        <p className="text-[11px] text-slate-400">{r.desc}</p>
                      </div>
                    </div>
                    <p className={`text-xl font-black tabular-nums ${r.value >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {r.value >= 0 ? '+' : ''}{fmt(r.value, currency)}
                    </p>
                  </div>
                ))}
                <div className={`rounded-xl p-5 flex justify-between items-center ${cashFlow.net >= 0 ? 'bg-emerald-600' : 'bg-rose-600'} text-white`}>
                  <p className="font-black uppercase text-sm">Net Cash Flow</p>
                  <p className="text-2xl font-black tabular-nums">{fmt(cashFlow.net, currency)}</p>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════
              GST / TAX
          ════════════════════════════════════ */}
          {activeTab === 'GST' && (
            <div className="p-5 max-w-3xl mx-auto">
              <SectionHeader title="GST & Tax Summary" subtitle="Input tax credit vs output tax liability" />
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-center shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Input Tax (Purchases)</p>
                  <p className="text-2xl font-black text-sky-600 tabular-nums">{fmt(gst.input, currency)}</p>
                  <p className="text-xs text-slate-400 mt-1">ITC Available</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-center shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Output Tax (Sales)</p>
                  <p className="text-2xl font-black text-orange-600 tabular-nums">{fmt(gst.output, currency)}</p>
                  <p className="text-xs text-slate-400 mt-1">Collected from Customers</p>
                </div>
                <div className="bg-slate-800 dark:bg-slate-700 rounded-xl p-5 text-center text-white shadow-sm">
                  <p className="text-[10px] font-bold text-slate-300 uppercase mb-1">Net GST Payable</p>
                  <p className="text-2xl font-black text-amber-400 tabular-nums">{fmt(Math.max(0, gst.net), currency)}</p>
                  <p className="text-xs text-slate-400 mt-1">{gst.net < 0 ? `ITC Refund: ${fmt(Math.abs(gst.net), currency)}` : 'Due to Government'}</p>
                </div>
              </div>

              {/* GST rate breakdown */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">GST Slab Breakdown</p>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {[5, 12, 18].map(rate => {
                    const taxable = salesOrders.filter(o => (o.taxRate || 5) === rate).reduce((s, o) => s + o.totalAmount, 0);
                    const gstAmt = taxable * rate / 100;
                    return (
                      <div key={rate} className="flex items-center justify-between px-5 py-3 text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300 uppercase">GST @ {rate}%</span>
                        <span className="text-slate-400">Taxable: {fmt(taxable, currency)}</span>
                        <span className="font-black text-amber-600 tabular-nums">{fmt(gstAmt, currency)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════
              RECONCILIATION
          ════════════════════════════════════ */}
          {activeTab === 'RECONCILE' && (
            <div className="p-5 max-w-2xl mx-auto">
              <SectionHeader title="Bank Reconciliation" subtitle="Match bank statement against books" />
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Book Balance (Cash)</p>
                  <p className="text-2xl font-black text-indigo-600 tabular-nums">{fmt(cashBalance, currency)}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Book Balance (Bank)</p>
                  <p className="text-2xl font-black text-indigo-600 tabular-nums">{fmt(bankBalance, currency)}</p>
                </div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 mb-5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Reconciliation Note</p>
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                      Upload your bank statement CSV to auto-match entries. Unmatched transactions will appear below for manual review.
                      Connect to your bank via the Settings → Integrations menu for live sync.
                    </p>
                  </div>
                </div>
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Unreconciled Transactions</p>
                  <span className="text-[10px] font-bold text-slate-400">{transactions.filter(t => !t.subType?.includes('RECONCILED')).length} entries pending</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
                  {transactions.filter(t => !t.subType?.includes('RECONCILED')).slice(0,15).map(t => (
                    <div key={t.id} className="flex items-center justify-between px-5 py-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <div>
                        <p className="font-bold text-slate-700 dark:text-slate-300">{t.description}</p>
                        <p className="text-slate-400 font-mono">{t.date} · {t.paymentMethod}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-black tabular-nums ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {t.type === 'INCOME' ? '+' : '-'}{fmt(t.amount, currency)}
                        </span>
                        <button className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold hover:bg-indigo-100 transition-colors">Match</button>
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <div className="px-5 py-12 text-center text-slate-400 text-xs italic">No transactions to reconcile.</div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ════════════════════════════════════
          QUICK ENTRY MODAL
      ════════════════════════════════════ */}
      <BaseModal isOpen={isEntryModalOpen} onClose={() => setIsEntryModalOpen(false)} title="Quick Ledger Entry" size="md">
        <form onSubmit={handlePostEntry} className="space-y-4">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button type="button" onClick={() => setEntryForm({...entryForm, type: 'DEBIT'})}
              className={`flex-1 py-2 rounded-md text-xs font-bold uppercase transition-all ${entryForm.type === 'DEBIT' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm' : 'text-slate-500'}`}>
              Debit (Payment Out)
            </button>
            <button type="button" onClick={() => setEntryForm({...entryForm, type: 'CREDIT'})}
              className={`flex-1 py-2 rounded-md text-xs font-bold uppercase transition-all ${entryForm.type === 'CREDIT' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500'}`}>
              Credit (Payment In)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Date</label>
              <input type="date" required className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                value={entryForm.date} onChange={e => setEntryForm({...entryForm, date: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Payment Method</label>
              <select className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                value={entryForm.paymentMethod} onChange={e => setEntryForm({...entryForm, paymentMethod: e.target.value})}>
                <option value="CASH">Cash</option>
                <option value="BANK">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="CHEQUE">Cheque</option>
                <option value="NEFT">NEFT / RTGS</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Category</label>
              <select className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                value={entryForm.category} onChange={e => setEntryForm({...entryForm, category: e.target.value})}>
                <option value="SALES">Sales</option>
                <option value="PURCHASES">Purchases</option>
                <option value="SALARY">Salary / Wages</option>
                <option value="COMMISSION">Commission</option>
                <option value="TRANSPORT">Transport / Freight</option>
                <option value="DYEING">Dyeing / Processing</option>
                <option value="UTILITY">Utility / Rent</option>
                <option value="LOAN">Loan</option>
                <option value="CAPITAL">Capital</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Account</label>
              <div className="w-full bg-indigo-50 dark:bg-indigo-900/20 rounded-lg px-3 py-2 text-sm font-bold text-indigo-700 dark:text-indigo-300 uppercase truncate border border-indigo-200 dark:border-indigo-800">
                {activeAccount?.name || 'Select account in Ledger tab'}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount ({currency})</label>
            <input type="number" required step="0.01"
              className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-3 text-xl font-black bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
              value={entryForm.amount || ''} onChange={e => setEntryForm({...entryForm, amount: Number(e.target.value)})} placeholder="0.00" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Narration</label>
            <textarea required className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-3 text-sm bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500" rows={2}
              value={entryForm.description} onChange={e => setEntryForm({...entryForm, description: e.target.value})}
              placeholder="e.g. Payment received via UPI for Order #234" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setIsEntryModalOpen(false)} className="flex-1 px-4 py-2 rounded-lg text-sm font-bold text-slate-500 border hover:bg-slate-50 transition-colors uppercase">Cancel</button>
            <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all active:scale-95 uppercase">Post Entry</button>
          </div>
        </form>
      </BaseModal>

      {/* ════════════════════════════════════
          JOURNAL ENTRY MODAL
      ════════════════════════════════════ */}
      <BaseModal isOpen={isJournalModalOpen} onClose={() => setIsJournalModalOpen(false)} title="New Journal Voucher" size="md">
        <form onSubmit={handleAddJournal} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Voucher Type</label>
              <select className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                value={journalForm.voucherType}
                onChange={e => setJournalForm({...journalForm, voucherType: e.target.value as JournalEntry['voucherType']})}>
                <option value="PAYMENT">Payment Voucher</option>
                <option value="RECEIPT">Receipt Voucher</option>
                <option value="CONTRA">Contra (Cash↔Bank)</option>
                <option value="JOURNAL">Journal Voucher</option>
                <option value="SALES">Sales Entry</option>
                <option value="PURCHASE">Purchase Entry</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Date</label>
              <input type="date" required className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                value={journalForm.date} onChange={e => setJournalForm({...journalForm, date: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Narration</label>
            <input type="text" required className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
              value={journalForm.narration} onChange={e => setJournalForm({...journalForm, narration: e.target.value})}
              placeholder="Being amount paid / received for..." />
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Double Entry</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-rose-500 uppercase mb-1">Debit Account (Dr)</label>
                <input type="text" required className="w-full border border-rose-200 dark:border-rose-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 outline-none focus:ring-1 focus:ring-rose-500"
                  value={journalForm.debitAccount} onChange={e => setJournalForm({...journalForm, debitAccount: e.target.value})}
                  placeholder="e.g. Salary Expense" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">Credit Account (Cr)</label>
                <input type="text" required className="w-full border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 outline-none focus:ring-1 focus:ring-emerald-500"
                  value={journalForm.creditAccount} onChange={e => setJournalForm({...journalForm, creditAccount: e.target.value})}
                  placeholder="e.g. Cash / Bank" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount ({currency})</label>
              <input type="number" required step="0.01"
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-3 text-xl font-black bg-white dark:bg-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                value={journalForm.debitAmount || ''} onChange={e => setJournalForm({...journalForm, debitAmount: Number(e.target.value), creditAmount: Number(e.target.value)})}
                placeholder="0.00" />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setIsJournalModalOpen(false)} className="flex-1 px-4 py-2 rounded-lg text-sm font-bold text-slate-500 border hover:bg-slate-50 transition-colors uppercase">Cancel</button>
            <button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all active:scale-95 uppercase">Post Journal</button>
          </div>
        </form>
      </BaseModal>

    </div>
  );
};

export default Accounting;
