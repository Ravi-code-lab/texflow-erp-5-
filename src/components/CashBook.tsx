import React, { useState, useMemo } from 'react';
import { Transaction, Customer, Supplier, TeamMember } from '../types';
import { 
  Landmark, Wallet, ArrowDownLeft, ArrowUpRight, Search, Plus, 
  Printer, Download, Filter, FileText, Check, X,
  TrendingUp, TrendingDown, History, CreditCard, Calendar,
  Table as TableIcon, LayoutGrid, ChevronRight, FileArchive
} from 'lucide-react';
import BaseModal from './BaseModal';

interface CashBookProps {
  transactions: Transaction[];
  customers?: Customer[];
  suppliers?: Supplier[];
  team?: TeamMember[];
  onAddTransaction: (t: Transaction) => void;
  currency?: string;
}

const CashBook: React.FC<CashBookProps> = ({ 
  transactions, customers = [], suppliers = [], team = [], onAddTransaction, currency = '₹' 
}) => {
  const [filter, setFilter] = useState('');
  const [modeFilter, setModeFilter] = useState<'ALL' | 'RECEIVE' | 'PAY' | 'INTERNAL_TRANSFER'>('ALL');
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Transaction>>({
    type: 'RECEIVE',
    paymentMethod: 'CASH',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    category: 'SALES',
    description: '',
    partyType: 'Customer',
    partyName: '',
    paidTo: 'Cash',
    paidFrom: '',
    referenceNo: '',
    referenceDate: new Date().toISOString().split('T')[0],
    allocatedAmount: 0,
    unallocatedAmount: 0
  });

  const [activeTab, setActiveTab] = useState<'DETAILS'>('DETAILS');

  // Business Logic
  const stats = useMemo(() => {
    const cashIn = transactions.filter(t => (t.paymentMethod === 'CASH' && (t.type === 'INCOME' || t.type === 'RECEIVE'))).reduce((s, t) => s + t.amount, 0);
    const cashOut = transactions.filter(t => (t.paymentMethod === 'CASH' && (t.type === 'EXPENSE' || t.type === 'PAY'))).reduce((s, t) => s + t.amount, 0);
    const bankIn = transactions.filter(t => (t.paymentMethod === 'BANK' && (t.type === 'INCOME' || t.type === 'RECEIVE'))).reduce((s, t) => s + t.amount, 0);
    const bankOut = transactions.filter(t => (t.paymentMethod === 'BANK' && (t.type === 'EXPENSE' || t.type === 'PAY'))).reduce((s, t) => s + t.amount, 0);
    
    return {
      cashBalance: cashIn - cashOut,
      bankBalance: bankIn - bankOut,
      todayIn: transactions.filter(t => t.date === new Date().toISOString().split('T')[0] && (t.type === 'INCOME' || t.type === 'RECEIVE')).reduce((s,t) => s + t.amount, 0),
      todayOut: transactions.filter(t => t.date === new Date().toISOString().split('T')[0] && (t.type === 'EXPENSE' || t.type === 'PAY')).reduce((s,t) => s + t.amount, 0)
    };
  }, [transactions]);

  const filteredTxns = useMemo(() => {
    return transactions.filter(t => {
      const searchLower = filter.toLowerCase();
      const description = t.description || '';
      const category = t.category || '';
      const pn = t.partyName || '';
      const matchesSearch = description.toLowerCase().includes(searchLower) || 
                          category.toLowerCase().includes(searchLower) ||
                          pn.toLowerCase().includes(searchLower);
      const matchesMode = modeFilter === 'ALL' || t.type === modeFilter || (modeFilter === 'RECEIVE' && t.type === 'INCOME') || (modeFilter === 'PAY' && t.type === 'EXPENSE');
      return matchesSearch && matchesMode;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filter, modeFilter]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) return;

    onAddTransaction({
      ...formData,
      id: `PAY-${Date.now()}`,
      updatedAt: new Date().toISOString()
    } as Transaction);
    
    setViewMode('LIST');
  };

  const getPartyOptions = () => {
     if (formData.partyType === 'Customer') return customers.map(c => c.name);
     if (formData.partyType === 'Supplier') return suppliers.map(s => s.name);
     if (formData.partyType === 'Employee') return team.map(t => t.name);
     return [];
  };

  const openNewForm = () => {
      setFormData({ 
        type: 'RECEIVE', 
        paymentMethod: 'BANK', 
        date: new Date().toISOString().split('T')[0], 
        amount: 0, 
        category: 'SALES', 
        description: '',
        partyType: 'Customer',
        partyName: '',
        paidTo: 'Bank',
        paidFrom: '',
        referenceNo: '',
        referenceDate: new Date().toISOString().split('T')[0],
        allocatedAmount: 0,
        unallocatedAmount: 0
      });
      setViewMode('FORM');
  };

  if (viewMode === 'FORM') {
      return (
          <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 animate-fade-in font-sans">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                  <div>
                      <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                          <button onClick={() => setViewMode('LIST')} className="hover:text-indigo-600 transition-colors">Payment Entry</button>
                          <ChevronRight className="w-3 h-3" />
                          <span className="font-bold text-slate-700 dark:text-slate-300">New Payment Entry</span>
                      </div>
                      <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">New Payment Entry</h2>
                  </div>
                  <div className="flex gap-2">
                       <button onClick={() => setViewMode('LIST')} className="px-4 py-2 border bg-white dark:bg-slate-900 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors uppercase border-slate-200 dark:border-slate-800">Cancel</button>
                       <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md transition-all active:scale-95 uppercase flex items-center gap-2"><Check className="w-4 h-4"/> Save</button>
                  </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex-1 overflow-y-auto custom-scrollbar">
                  {/* Top Form section */}
                  <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                          {/* Left Column */}
                          <div className="space-y-4">
                              <div className="flex items-center">
                                  <label className="w-1/3 text-xs font-bold text-slate-500 uppercase">Series</label>
                                  <input disabled value="PAY-.YYYY.-" className="w-2/3 border dark:border-slate-700 rounded p-2 text-sm bg-slate-50 dark:bg-slate-800 outline-none font-mono text-slate-400" />
                              </div>
                              <div className="flex items-center">
                                  <label className="w-1/3 text-xs font-bold text-slate-500 uppercase">Payment Type</label>
                                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-2/3 border dark:border-slate-700 rounded p-2 text-sm bg-white dark:bg-slate-800 font-bold outline-none focus:border-indigo-500">
                                      <option value="RECEIVE">Receive</option>
                                      <option value="PAY">Pay</option>
                                      <option value="INTERNAL_TRANSFER">Internal Transfer</option>
                                  </select>
                              </div>
                              <div className="flex items-center">
                                  <label className="w-1/3 text-xs font-bold text-slate-500 uppercase">Party Type</label>
                                  <select value={formData.partyType} onChange={e => setFormData({...formData, partyType: e.target.value})} className="w-2/3 border dark:border-slate-700 rounded p-2 text-sm bg-white dark:bg-slate-800 outline-none focus:border-indigo-500">
                                      <option value="Customer">Customer</option>
                                      <option value="Supplier">Supplier</option>
                                      <option value="Employee">Employee</option>
                                      <option value="Shareholder">Shareholder</option>
                                  </select>
                              </div>
                              <div className="flex items-center">
                                  <label className="w-1/3 text-xs font-bold text-slate-500 uppercase">Party</label>
                                  <input list="partyList" value={formData.partyName} onChange={e => setFormData({...formData, partyName: e.target.value})} className="w-2/3 border dark:border-slate-700 rounded p-2 text-sm bg-white dark:bg-slate-800 outline-none focus:border-indigo-500 font-bold" placeholder={`Select ${formData.partyType}`} />
                                  <datalist id="partyList">
                                      {getPartyOptions().map((p, i) => <option key={i} value={p} />)}
                                  </datalist>
                              </div>
                          </div>

                          {/* Right Column */}
                          <div className="space-y-4">
                              <div className="flex items-center">
                                  <label className="w-1/3 text-xs font-bold text-slate-500 uppercase">Posting Date</label>
                                  <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-2/3 border dark:border-slate-700 rounded p-2 text-sm bg-white dark:bg-slate-800 outline-none focus:border-indigo-500" />
                              </div>
                              <div className="flex items-center">
                                  <label className="w-1/3 text-xs font-bold text-slate-500 uppercase">Mode of Payment</label>
                                  <select value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} className="w-2/3 border dark:border-slate-700 rounded p-2 text-sm bg-white dark:bg-slate-800 outline-none focus:border-indigo-500 font-bold">
                                      <option value="CASH">Cash</option>
                                      <option value="BANK">Bank Transfer</option>
                                      <option value="CHEQUE">Cheque</option>
                                      <option value="UPI">UPI</option>
                                      <option value="CREDIT_CARD">Credit Card</option>
                                  </select>
                              </div>
                          </div>
                      </div>

                      {/* Accounts & Amount Section */}
                      <div className="mt-8 mb-6 pb-2 border-b border-slate-200 dark:border-slate-800">
                          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Account & Amounts</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center">
                                    <label className="w-1/3 text-xs font-bold text-slate-500 uppercase">Account Paid From</label>
                                    <input value={formData.paidFrom} onChange={e => setFormData({...formData, paidFrom: e.target.value})} className="w-2/3 border dark:border-slate-700 rounded p-2 text-sm bg-white dark:bg-slate-800 outline-none focus:border-indigo-500" placeholder={formData.type === 'RECEIVE' ? 'Debtors' : 'Bank / Cash'} />
                                </div>
                                <div className="flex items-center">
                                    <label className="w-1/3 text-xs font-bold text-slate-500 uppercase">Account Paid To</label>
                                    <input value={formData.paidTo} onChange={e => setFormData({...formData, paidTo: e.target.value})} className="w-2/3 border dark:border-slate-700 rounded p-2 text-sm bg-white dark:bg-slate-800 outline-none focus:border-indigo-500" placeholder={formData.type === 'PAY' ? 'Creditors' : 'Bank / Cash'} />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800">
                                    <label className="w-1/3 text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase">Amount ({currency})</label>
                                    <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} className="w-2/3 border dark:border-slate-700 rounded p-2 text-xl font-black bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 text-right" />
                                </div>
                                {formData.type === 'RECEIVE' && (
                                  <div className="flex items-center p-3">
                                      <label className="w-1/3 text-xs font-bold text-slate-500 uppercase">Received Amount ({currency})</label>
                                      <input type="number" value={formData.amount} readOnly className="w-2/3 border dark:border-slate-700 rounded p-2 text-sm font-bold bg-slate-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 text-right text-slate-400" />
                                  </div>
                                )}
                            </div>
                      </div>

                       {/* Reference Section */}
                       <div className="mt-8 mb-6 pb-2 border-b border-slate-200 dark:border-slate-800">
                          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Reference</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center">
                                    <label className="w-1/3 text-xs font-bold text-slate-500 uppercase">Reference No</label>
                                    <input value={formData.referenceNo} onChange={e => setFormData({...formData, referenceNo: e.target.value})} className="w-2/3 border dark:border-slate-700 rounded p-2 text-sm bg-white dark:bg-slate-800 outline-none focus:border-indigo-500" placeholder="Cheque / Ref No" />
                                </div>
                                <div className="flex items-center">
                                    <label className="w-1/3 text-xs font-bold text-slate-500 uppercase">Reference Date</label>
                                    <input type="date" value={formData.referenceDate} onChange={e => setFormData({...formData, referenceDate: e.target.value})} className="w-2/3 border dark:border-slate-700 rounded p-2 text-sm bg-white dark:bg-slate-800 outline-none focus:border-indigo-500" />
                                </div>
                            </div>
                            <div className="space-y-4">
                               <div className="flex items-start">
                                    <label className="w-1/3 text-xs font-bold text-slate-500 uppercase pt-2">Remarks</label>
                                    <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-2/3 border dark:border-slate-700 rounded p-2 text-sm bg-white dark:bg-slate-800 outline-none focus:border-indigo-500" placeholder="Optional notes" />
                                </div>
                            </div>
                      </div>

                       {/* Deductions Section */}
                       <div className="mt-8 mb-6 pb-2 border-b border-slate-200 dark:border-slate-800">
                          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Deductions or Loss</h3>
                      </div>
                      <table className="w-full text-left border-collapse text-sm mb-4">
                          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold border rounded-t-lg">
                              <tr>
                                  <th className="p-2 border">1</th>
                                  <th className="p-2 border">Account</th>
                                  <th className="p-2 border">Cost Center</th>
                                  <th className="p-2 border">Amount</th>
                                  <th className="p-2 border text-center">Delete</th>
                              </tr>
                          </thead>
                          <tbody>
                              <tr>
                                  <td className="p-2 border" colSpan={5}>
                                      <button type="button" className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Add Row</button>
                                  </td>
                              </tr>
                          </tbody>
                      </table>

                       {/* Allocate Payment Amount Section */}
                       <div className="mt-8 mb-6 pb-2 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Allocate Payment Amount</h3>
                          <button className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-xs font-bold">Get Outstanding Invoices</button>
                      </div>
                      <table className="w-full text-left border-collapse text-sm mb-8">
                          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold border rounded-t-lg">
                              <tr>
                                  <th className="p-2 border">Type</th>
                                  <th className="p-2 border">Reference Name</th>
                                  <th className="p-2 border text-right">Total Amount</th>
                                  <th className="p-2 border text-right">Outstanding</th>
                                  <th className="p-2 border text-right">Allocated</th>
                              </tr>
                          </thead>
                          <tbody>
                              <tr>
                                  <td className="p-4 border text-center text-slate-400 font-bold" colSpan={5}>
                                      No outstanding invoices fetched.
                                  </td>
                              </tr>
                          </tbody>
                      </table>

                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 animate-fade-in font-sans">
      
      {/* Standard Clean Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Payment Entry</h2>
          <p className="text-xs text-slate-500 font-medium">Manage receipts, payments, and internal transfers</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border bg-white dark:bg-slate-900 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-2 border-slate-200 dark:border-slate-800">
            <Download className="w-4 h-4"/> Export
          </button>
          <button 
            onClick={openNewForm} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-md transition-all active:scale-95 flex items-center gap-2"
          >
             <Plus className="w-4 h-4" /> Add Payment Entry
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cash Balance</p>
                <Wallet className="w-4 h-4 text-indigo-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white tabular-nums">{currency}{stats.cashBalance.toLocaleString()}</h3>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bank Balance</p>
                <Landmark className="w-4 h-4 text-blue-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white tabular-nums">{currency}{stats.bankBalance.toLocaleString()}</h3>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Receipts (In)</p>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-emerald-600 tabular-nums">{currency}{stats.todayIn.toLocaleString()}</h3>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">Payments (Out)</p>
                <TrendingDown className="w-4 h-4 text-rose-500" />
              </div>
              <h3 className="text-lg font-bold text-rose-600 tabular-nums">{currency}{stats.todayOut.toLocaleString()}</h3>
          </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
          {/* List Controls */}
          <div className="p-3 border-b flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button onClick={() => setModeFilter('ALL')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${modeFilter === 'ALL' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>All</button>
                    <button onClick={() => setModeFilter('RECEIVE')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${modeFilter === 'RECEIVE' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Receive</button>
                    <button onClick={() => setModeFilter('PAY')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${modeFilter === 'PAY' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Pay</button>
                    <button onClick={() => setModeFilter('INTERNAL_TRANSFER')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${modeFilter === 'INTERNAL_TRANSFER' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Transfer</button>
                </div>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      className="pl-9 pr-4 py-1.5 bg-white dark:bg-slate-800 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500/20 w-48 sm:w-64" 
                      placeholder="Search Name, ID..." 
                      value={filter} 
                      onChange={e => setFilter(e.target.value)}
                    />
                </div>
              </div>
              
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                  <button onClick={() => {}} className={`p-1.5 rounded-md transition-all bg-white dark:bg-slate-700 text-indigo-600 shadow-sm`}><TableIcon className="w-4 h-4"/></button>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold border-b sticky top-0 z-10">
                        <tr>
                          <th className="p-4">Name</th>
                          <th className="p-4">Party Name</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Mode of Payment</th>
                          <th className="p-4 text-right">Payment Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredTxns.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-500">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <FileArchive className="w-8 h-8 text-slate-300" />
                                        <p>No Payment Entries found</p>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredTxns.map(txn => (
                            <tr key={txn.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer">
                                <td className="p-4">
                                     <div className="font-bold text-indigo-600 hover:underline">{txn.id}</div>
                                     <div className="text-[10px] text-slate-400 font-mono mt-0.5">{txn.date}</div>
                                </td>
                                <td className="p-4 font-bold text-slate-700 dark:text-slate-300">
                                   {txn.partyName || '-'}
                                   <div className="text-[10px] text-slate-400">{txn.partyType}</div>
                                </td>
                                <td className="p-4">
                                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shadow-sm">Submitted</span>
                                </td>
                                <td className="p-4 font-medium text-slate-600 dark:text-slate-400">
                                    {txn.paymentMethod}
                                </td>
                                <td className="p-4 text-right font-black text-slate-800 dark:text-white">
                                    {currency}{txn.amount.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
          </div>
      </div>
    </div>
  );
};

export default CashBook;
