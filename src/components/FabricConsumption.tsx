import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { InventoryItem, ProductionJob } from '../types';
import {
  Layers, Search, Download, AlertTriangle, TrendingDown,
  Package, Plus, ChevronDown, ChevronRight, Info, BarChart2, RefreshCw
} from 'lucide-react';
import { toast } from '../utils/toast';
import { getItem, setItem } from '../utils/indexedDB';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const DB_KEY = 'fabricConsumptionEntries';

interface FabricConsumptionProps {
  inventory: InventoryItem[];
  production: ProductionJob[];
  currency?: string;
  onUpdateInventory?: (item: InventoryItem) => void;
  onUpdateJob?: (job: ProductionJob) => void;
}

interface ConsumptionEntry {
  id: string;
  date: string;
  fabricId: string;
  fabricName: string;
  rollNumber?: string;
  dyeLot?: string;
  jobId?: string;
  jobName?: string;
  issuedQty: number;
  usedQty: number;
  wastageQty: number;
  wastagePercent: number;
  unit: string;
  remark?: string;
}

const FABRIC_TYPES = ['Fabric', 'FABRIC', 'Raw Material', 'RAW_MATERIAL'];

const FabricConsumption: React.FC<FabricConsumptionProps> = ({
  inventory, production, currency = '₹', onUpdateInventory, onUpdateJob,
}) => {
  const [tab, setTab] = useState<'dashboard' | 'rollwise' | 'issue' | 'history'>('dashboard');
  const [search, setSearch] = useState('');
  const [entries, setEntries] = useState<ConsumptionEntry[]>([]);
  const [expandedFabric, setExpandedFabric] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Issue form state
  const [issueForm, setIssueForm] = useState({
    fabricId: '', rollId: '', jobId: '', issuedQty: '', usedQty: '',
    remark: '', date: new Date().toISOString().slice(0, 10)
  });

  // ── Load from IndexedDB on mount ──────────────────────────────────────────
  useEffect(() => {
    getItem<ConsumptionEntry[]>(DB_KEY)
      .then(stored => {
        if (stored && Array.isArray(stored)) setEntries(stored);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Persist to IndexedDB whenever entries change ──────────────────────────
  const persistEntries = useCallback((updated: ConsumptionEntry[]) => {
    setEntries(updated);
    setItem(DB_KEY, updated).catch(() => {});
  }, []);

  // Fabrics only
  const fabrics = useMemo(() =>
    inventory.filter(i => FABRIC_TYPES.some(t => String(i.type || '').toUpperCase().includes(t.toUpperCase())) && !i.deleted),
    [inventory]);

  const filteredFabrics = useMemo(() =>
    fabrics.filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()) || (f.batchNumber || '').toLowerCase().includes(search.toLowerCase())),
    [fabrics, search]);

  // Per-fabric stats from entries
  const fabricStats = useMemo(() => {
    const m: Record<string, { issued: number; used: number; wastage: number; entries: number }> = {};
    entries.forEach(e => {
      if (!m[e.fabricId]) m[e.fabricId] = { issued: 0, used: 0, wastage: 0, entries: 0 };
      m[e.fabricId].issued += e.issuedQty;
      m[e.fabricId].used += e.usedQty;
      m[e.fabricId].wastage += e.wastageQty;
      m[e.fabricId].entries++;
    });
    return m;
  }, [entries]);

  // Dashboard metrics
  const totalFabricValue = fabrics.reduce((s, f) => s + f.quantity * f.pricePerUnit, 0);
  const totalIssued = entries.reduce((s, e) => s + e.issuedQty, 0);
  const totalUsed = entries.reduce((s, e) => s + e.usedQty, 0);
  const totalWastage = entries.reduce((s, e) => s + e.wastageQty, 0);
  const avgWastage = totalIssued > 0 ? (totalWastage / totalIssued) * 100 : 0;
  const lowStockFabrics = fabrics.filter(f => f.quantity <= f.minStockLevel);

  // Chart data: wastage by fabric
  const wastageChartData = useMemo(() =>
    fabrics.map(f => {
      const s = fabricStats[f.id];
      return { name: f.name.slice(0, 14), wastage: s ? parseFloat(((s.wastage / (s.issued || 1)) * 100).toFixed(1)) : 0, issued: s?.issued || 0 };
    }).filter(d => d.issued > 0).sort((a, b) => b.wastage - a.wastage).slice(0, 8),
    [fabrics, fabricStats]);

  const handleIssue = () => {
    if (!issueForm.fabricId || !issueForm.issuedQty || !issueForm.usedQty) {
      toast.error('Fabric, Issued Qty and Used Qty are required.');
      return;
    }
    const fabric = fabrics.find(f => f.id === issueForm.fabricId);
    const roll = fabric?.rolls?.find(r => r.id === issueForm.rollId);
    const job = production.find(j => j.id === issueForm.jobId);
    const issued = parseFloat(issueForm.issuedQty);
    const used = parseFloat(issueForm.usedQty);
    const wastage = Math.max(0, issued - used);
    const wastagePercent = issued > 0 ? parseFloat(((wastage / issued) * 100).toFixed(1)) : 0;

    const entry: ConsumptionEntry = {
      id: `FC-${Date.now()}`,
      date: issueForm.date,
      fabricId: issueForm.fabricId,
      fabricName: fabric?.name || '',
      rollNumber: roll?.rollNumber,
      dyeLot: roll?.dyeLot,
      jobId: issueForm.jobId,
      jobName: job?.productName,
      issuedQty: issued,
      usedQty: used,
      wastageQty: wastage,
      wastagePercent,
      unit: fabric?.unit || 'MTR',
      remark: issueForm.remark,
    };

    const updated = [entry, ...entries];
    persistEntries(updated);

    // ── Write back to linked ProductionJob so TaskBoard Cutting card reflects it ──
    if (job && onUpdateJob) {
      // Accumulate across all entries for this job
      const allJobEntries = updated.filter(e => e.jobId === job.id);
      const totalIssuedForJob = allJobEntries.reduce((s, e) => s + e.issuedQty, 0);
      const totalWasteForJob  = allJobEntries.reduce((s, e) => s + e.wastageQty, 0);
      const totalWastePct     = totalIssuedForJob > 0
        ? parseFloat(((totalWasteForJob / totalIssuedForJob) * 100).toFixed(1))
        : 0;

      const updatedJob: ProductionJob = {
        ...job,
        customData: {
          ...(job.customData || {}),
          fabricIssuedMeters: String(totalIssuedForJob),
          wasteKg:   String(totalWasteForJob),
          wastePct:  String(totalWastePct),
          fabricLot: fabric?.batchNumber || (job.customData?.fabricLot ?? ''),
        },
      };
      onUpdateJob(updatedJob);
    }

    setIssueForm(f => ({ ...f, issuedQty: '', usedQty: '', remark: '', rollId: '', jobId: '' }));
    toast.success(`Consumption recorded. Wastage: ${wastagePercent}%`);
  };

  const exportCSV = () => {
    const rows = [
      ['Date', 'Fabric', 'Roll', 'Dye Lot', 'Job', 'Issued Qty', 'Used Qty', 'Wastage Qty', 'Wastage %', 'Unit', 'Remark'],
      ...entries.map(e => [e.date, e.fabricName, e.rollNumber || '', e.dyeLot || '', e.jobName || '', e.issuedQty, e.usedQty, e.wastageQty, e.wastagePercent + '%', e.unit, e.remark || '']),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `FabricConsumption_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const fmt = (n: number, unit?: string) => `${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}${unit ? ' ' + unit : ''}`;
  const fmtCur = (n: number) => `${currency}${Math.round(n).toLocaleString('en-IN')}`;

  const TABS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'rollwise', label: 'Roll-wise Stock' },
    { id: 'issue', label: '+ Issue Fabric' },
    { id: 'history', label: 'Consumption Log' },
  ] as const;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading consumption data…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full -mx-4 -my-5 lg:-m-6 bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-600 rounded-xl text-white shadow"><Layers className="w-5 h-5" /></div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Fabric Consumption</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Roll-wise issuance · Wastage tracking · Yield analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-bold">{entries.length} entries · auto-saved</span>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-bold uppercase">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex gap-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-[11px] font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Fabric Stock Value', val: fmtCur(totalFabricValue), icon: Package, color: 'text-teal-600' },
                { label: 'Total Issued (all time)', val: fmt(totalIssued, 'MTR'), icon: TrendingDown, color: 'text-indigo-600' },
                { label: 'Average Wastage %', val: `${avgWastage.toFixed(1)}%`, icon: AlertTriangle, color: avgWastage > 8 ? 'text-rose-600' : 'text-amber-500' },
                { label: 'Low Stock Fabrics', val: String(lowStockFabrics.length), icon: AlertTriangle, color: lowStockFabrics.length > 0 ? 'text-rose-600' : 'text-emerald-600' },
              ].map(({ label, val, icon: Icon, color }) => (
                <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{label}</p>
                    <Icon className={`w-4 h-4 shrink-0 ${color}`} />
                  </div>
                  <p className={`text-xl font-black tabular-nums ${color}`}>{val}</p>
                </div>
              ))}
            </div>

            {wastageChartData.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-teal-500" /> Wastage % by Fabric
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={wastageChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="%" />
                      <Tooltip formatter={(v: any) => [`${v}%`, 'Wastage']} contentStyle={{ borderRadius: '10px', border: 'none', fontSize: 11 }} />
                      <Bar dataKey="wastage" radius={[4, 4, 0, 0]}>
                        {wastageChartData.map((d, i) => (
                          <Cell key={i} fill={d.wastage > 8 ? '#ef4444' : d.wastage > 5 ? '#f59e0b' : '#10b981'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">🟢 &lt;5% Good · 🟡 5–8% Acceptable · 🔴 &gt;8% High — industry standard target is 5%</p>
              </div>
            )}

            {lowStockFabrics.length > 0 && (
              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4">
                <p className="text-xs font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Low Stock — {lowStockFabrics.length} fabric(s) below minimum
                </p>
                <div className="flex flex-wrap gap-2">
                  {lowStockFabrics.map(f => (
                    <span key={f.id} className="text-xs bg-white dark:bg-rose-900/40 border border-rose-200 dark:border-rose-700 text-rose-700 dark:text-rose-300 px-2.5 py-1 rounded-lg font-bold">
                      {f.name} — {fmt(f.quantity, String(f.unit))} (min: {f.minStockLevel})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {entries.length === 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-xs text-blue-700 dark:text-blue-300 flex gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                No consumption entries yet. Go to "Issue Fabric" tab to record fabric issuance for a production job.
              </div>
            )}
          </div>
        )}

        {/* ── ROLL-WISE STOCK ── */}
        {tab === 'rollwise' && (
          <div className="space-y-4">
            <div className="flex gap-3 items-center">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search fabric…"
                  className="pl-8 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 w-full focus:outline-none focus:border-teal-400" />
              </div>
              <p className="text-xs text-slate-500">{filteredFabrics.length} fabric(s)</p>
            </div>

            {filteredFabrics.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-sm">No fabric items found. Add fabric in Inventory module (type = Fabric).</div>
            )}

            <div className="space-y-3">
              {filteredFabrics.map(fabric => {
                const rolls = fabric.rolls || [];
                const availableRolls = rolls.filter(r => r.status === 'AVAILABLE');
                const stats = fabricStats[fabric.id];
                const isExpanded = expandedFabric === fabric.id;

                return (
                  <div key={fabric.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <button onClick={() => setExpandedFabric(isExpanded ? null : fabric.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left">
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{fabric.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{fabric.batchNumber ? `Batch: ${fabric.batchNumber} · ` : ''}{String(fabric.unit)} · {fabric.location}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <p className="text-xs text-slate-500">In Stock</p>
                          <p className={`font-black text-sm ${fabric.quantity <= fabric.minStockLevel ? 'text-rose-600' : 'text-teal-600'}`}>{fmt(fabric.quantity, String(fabric.unit))}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Rolls</p>
                          <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">{availableRolls.length}/{rolls.length} avail</p>
                        </div>
                        {stats && (
                          <div>
                            <p className="text-xs text-slate-500">Wastage</p>
                            <p className={`font-bold text-sm ${(stats.wastage / (stats.issued || 1)) * 100 > 8 ? 'text-rose-600' : 'text-amber-500'}`}>
                              {((stats.wastage / (stats.issued || 1)) * 100).toFixed(1)}%
                            </p>
                          </div>
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-100 dark:border-slate-800">
                        {rolls.length === 0 ? (
                          <p className="px-5 py-4 text-xs text-slate-400">No rolls added. Add rolls via Inventory → Edit Item → Rolls tab.</p>
                        ) : (
                          <table className="w-full text-sm">
                            <thead className="text-[10px] uppercase text-slate-500 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                              <tr>{['Roll No', 'Dye Lot', 'Grade', 'Opening', 'Current', 'Status'].map(h => <th key={h} className="px-4 py-2 text-left font-black">{h}</th>)}</tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {rolls.map(roll => (
                                <tr key={roll.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                  <td className="px-4 py-2.5 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{roll.rollNumber}</td>
                                  <td className="px-4 py-2.5 text-xs text-slate-500">{roll.dyeLot || '—'}</td>
                                  <td className="px-4 py-2.5">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${roll.grade === 'A' ? 'bg-emerald-100 text-emerald-700' : roll.grade === 'B' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{roll.grade}</span>
                                  </td>
                                  <td className="px-4 py-2.5 font-mono text-xs">{fmt(roll.initialQuantity)}</td>
                                  <td className="px-4 py-2.5 font-mono text-xs font-bold text-teal-600">{fmt(roll.currentQuantity)}</td>
                                  <td className="px-4 py-2.5">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${roll.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' : roll.status === 'CONSUMED' ? 'bg-slate-100 text-slate-600' : 'bg-rose-100 text-rose-700'}`}>
                                      {roll.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ISSUE FABRIC ── */}
        {tab === 'issue' && (
          <div className="max-w-xl space-y-5">
            <h2 className="text-sm font-black text-slate-800 dark:text-white">Issue Fabric to Production Job</h2>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300 flex gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              Issuing fabric here will automatically update the linked Work Order's fabric data so it appears in job card prints.
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Date *</label>
                  <input type="date" value={issueForm.date} onChange={e => setIssueForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-teal-400" />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Production Job</label>
                  <select value={issueForm.jobId} onChange={e => setIssueForm(f => ({ ...f, jobId: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-teal-400">
                    <option value="">— Select Job —</option>
                    {production.filter(j => !j.deleted && j.status !== 'COMPLETED').map(j => (
                      <option key={j.id} value={j.id}>{j.batchNo || j.id} — {j.productName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Fabric *</label>
                <select value={issueForm.fabricId} onChange={e => setIssueForm(f => ({ ...f, fabricId: e.target.value, rollId: '' }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-teal-400">
                  <option value="">— Select Fabric —</option>
                  {fabrics.map(f => <option key={f.id} value={f.id}>{f.name} ({fmt(f.quantity, String(f.unit))})</option>)}
                </select>
              </div>

              {issueForm.fabricId && (() => {
                const fabric = fabrics.find(f => f.id === issueForm.fabricId);
                const availRolls = (fabric?.rolls || []).filter(r => r.status === 'AVAILABLE');
                return availRolls.length > 0 ? (
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Roll (optional)</label>
                    <select value={issueForm.rollId} onChange={e => setIssueForm(f => ({ ...f, rollId: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-teal-400">
                      <option value="">— All rolls —</option>
                      {availRolls.map(r => <option key={r.id} value={r.id}>Roll {r.rollNumber} · Lot {r.dyeLot || 'N/A'} · {fmt(r.currentQuantity)} avail</option>)}
                    </select>
                  </div>
                ) : null;
              })()}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Issued Qty (MTR) *</label>
                  <input type="number" min="0" step="0.01" value={issueForm.issuedQty} onChange={e => setIssueForm(f => ({ ...f, issuedQty: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-teal-400" />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Actually Used (MTR) *</label>
                  <input type="number" min="0" step="0.01" value={issueForm.usedQty} onChange={e => setIssueForm(f => ({ ...f, usedQty: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-teal-400" />
                </div>
              </div>

              {issueForm.issuedQty && issueForm.usedQty && (
                <div className={`px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-2 ${
                  parseFloat(issueForm.issuedQty) > 0
                    ? ((parseFloat(issueForm.issuedQty) - parseFloat(issueForm.usedQty)) / parseFloat(issueForm.issuedQty)) * 100 > 8
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-50 text-slate-600'
                }`}>
                  Wastage: {Math.max(0, parseFloat(issueForm.issuedQty) - parseFloat(issueForm.usedQty)).toFixed(2)} MTR
                  {' '}({parseFloat(issueForm.issuedQty) > 0 ? (((parseFloat(issueForm.issuedQty) - parseFloat(issueForm.usedQty)) / parseFloat(issueForm.issuedQty)) * 100).toFixed(1) : 0}%)
                </div>
              )}

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Remark</label>
                <input value={issueForm.remark} onChange={e => setIssueForm(f => ({ ...f, remark: e.target.value }))}
                  placeholder="e.g. End bits returned, Shrinkage from wash…"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-teal-400" />
              </div>

              <button onClick={handleIssue}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-black uppercase tracking-wide transition-colors flex items-center justify-center gap-2 shadow">
                <Plus className="w-4 h-4" /> Record Consumption
              </button>
            </div>
          </div>
        )}

        {/* ── HISTORY ── */}
        {tab === 'history' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-600 dark:text-slate-400"><span className="font-bold">{entries.length}</span> consumption entries</p>
              {entries.length > 0 && (
                <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
              )}
            </div>

            {entries.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">No consumption records. Use "Issue Fabric" tab to add entries.</div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-[10px] uppercase text-slate-500 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                      <tr>{['Date', 'Fabric', 'Roll', 'Dye Lot', 'Job', 'Issued', 'Used', 'Wastage', '%', 'Remark'].map(h => <th key={h} className="px-4 py-2.5 text-left font-black">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {entries.map(e => (
                        <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{e.date}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200 text-xs">{e.fabricName}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{e.rollNumber || '—'}</td>
                          <td className="px-4 py-2.5 text-xs text-slate-500">{e.dyeLot || '—'}</td>
                          <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-400">{e.jobName || '—'}</td>
                          <td className="px-4 py-2.5 font-mono text-xs">{fmt(e.issuedQty)} {e.unit}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-teal-600">{fmt(e.usedQty)} {e.unit}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-amber-600">{fmt(e.wastageQty)} {e.unit}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded ${e.wastagePercent > 8 ? 'bg-rose-100 text-rose-700' : e.wastagePercent > 5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {e.wastagePercent}%
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-400">{e.remark || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default FabricConsumption;
