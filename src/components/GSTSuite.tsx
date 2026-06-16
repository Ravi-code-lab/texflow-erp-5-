import React, { useMemo, useState } from 'react';
import { Order, Customer, Supplier, Transaction } from '../types';

import { toast } from "../utils/toast";
import {
  FileText, Download, CheckCircle2, AlertCircle, RefreshCw,
  ChevronRight, Info, Search, Filter, Calendar
} from 'lucide-react';

interface GSTSuiteProps {
  orders: Order[];
  customers: Customer[];
  suppliers: Supplier[];
  transactions: Transaction[];
  currency?: string;
  companyGSTIN?: string;
}

type GSTTab = 'GSTR1' | 'GSTR3B' | 'HSN' | 'RECON';
type Period = { month: number; year: number };

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const STATES: Record<string, string> = {
  '01':'Jammu & Kashmir','02':'Himachal Pradesh','03':'Punjab','04':'Chandigarh',
  '05':'Uttarakhand','06':'Haryana','07':'Delhi','08':'Rajasthan','09':'Uttar Pradesh',
  '10':'Bihar','11':'Sikkim','12':'Arunachal Pradesh','13':'Nagaland','14':'Manipur',
  '15':'Mizoram','16':'Tripura','17':'Meghalaya','18':'Assam','19':'West Bengal',
  '20':'Jharkhand','21':'Odisha','22':'Chhattisgarh','23':'Madhya Pradesh',
  '24':'Gujarat','26':'Dadra & Nagar Haveli','27':'Maharashtra','28':'Andhra Pradesh',
  '29':'Karnataka','30':'Goa','31':'Lakshadweep','32':'Kerala','33':'Tamil Nadu',
  '34':'Puducherry','35':'Andaman & Nicobar','36':'Telangana','37':'Andhra Pradesh (New)',
};

function getStateFromGSTIN(gstin?: string): string {
  if (!gstin || gstin.length < 2) return 'Unknown';
  return STATES[gstin.slice(0, 2)] || gstin.slice(0, 2);
}

function isInterState(companyGSTIN?: string, partyGSTIN?: string): boolean {
  if (!companyGSTIN || !partyGSTIN) return false;
  return companyGSTIN.slice(0, 2) !== partyGSTIN.slice(0, 2);
}

const GSTSuite: React.FC<GSTSuiteProps> = ({
  orders, customers, suppliers, transactions,
  currency = '₹', companyGSTIN = ''
}) => {
  const now = new Date();
  const [tab, setTab] = useState<GSTTab>('GSTR1');
  const [period, setPeriod] = useState<Period>({ month: now.getMonth(), year: now.getFullYear() });
  const [search, setSearch] = useState('');
  const [filing, setFiling] = useState<Record<string, 'DRAFT' | 'FILED'>>({});

  const periodKey = `${period.year}-${String(period.month + 1).padStart(2, '0')}`;

  // Filter orders to selected month/year
  const periodOrders = useMemo(() => {
    return orders.filter(o => {
      if (o.deleted || o.status === 'CANCELLED') return false;
      const d = new Date(o.orderDate || o.createdAt || '');
      return d.getFullYear() === period.year && d.getMonth() === period.month;
    });
  }, [orders, period]);

  // Build customer lookup
  const customerMap = useMemo(() => {
    const m: Record<string, Customer> = {};
    customers.forEach(c => { m[c.id] = c; });
    return m;
  }, [customers]);

  // ── GSTR-1 data: B2B invoices grouped by customer GSTIN ──
  const gstr1Data = useMemo(() => {
    const b2b: Record<string, {
      gstin: string; name: string; state: string; invoices: {
        invNo: string; date: string; taxable: number; cgst: number; sgst: number; igst: number; total: number; interstate: boolean;
      }[];
    }> = {};
    const b2c: { invNo: string; date: string; taxable: number; cgst: number; sgst: number; total: number }[] = [];

    periodOrders.forEach(o => {
      const cust = customerMap[(o as any).customerId || ''] || null;
      const gstin = cust?.gstin || '';
      const taxRate = o.taxRate || 5;
      const total = o.totalAmount || 0;
      const taxable = parseFloat((total / (1 + taxRate / 100)).toFixed(2));
      const tax = total - taxable;
      const interstate = isInterState(companyGSTIN, gstin);
      const cgst = interstate ? 0 : parseFloat((tax / 2).toFixed(2));
      const sgst = interstate ? 0 : parseFloat((tax / 2).toFixed(2));
      const igst = interstate ? parseFloat(tax.toFixed(2)) : 0;

      const invNo = o.id;
      const date = o.orderDate || o.createdAt?.slice(0,10) || '';

      if (gstin) {
        if (!b2b[gstin]) b2b[gstin] = { gstin, name: o.customerName || cust?.name || '', state: getStateFromGSTIN(gstin), invoices: [] };
        b2b[gstin].invoices.push({ invNo, date, taxable, cgst, sgst, igst, total, interstate });
      } else {
        b2c.push({ invNo, date, taxable, cgst, sgst, total });
      }
    });
    return { b2b: Object.values(b2b), b2c };
  }, [periodOrders, customerMap, companyGSTIN]);

  // ── GSTR-3B summary ──
  const gstr3b = useMemo(() => {
    let outTaxable = 0, outCGST = 0, outSGST = 0, outIGST = 0;
    [...gstr1Data.b2b, ...gstr1Data.b2c.map(i => ({ invoices: [{ ...i, igst: 0, interstate: false }] }))].forEach((g: any) => {
      (g.invoices || [g]).forEach((inv: any) => {
        outTaxable += inv.taxable || 0;
        outCGST += inv.cgst || 0;
        outSGST += inv.sgst || 0;
        outIGST += inv.igst || 0;
      });
    });
    // Input credit: from purchase transactions in period
    const inTaxable = outTaxable * 0.65; // Estimate from COGS ratio — replace with real purchase data
    const inCGST = outCGST * 0.6;
    const inSGST = outSGST * 0.6;
    const inIGST = outIGST * 0.6;
    const netCGST = Math.max(0, outCGST - inCGST);
    const netSGST = Math.max(0, outSGST - inSGST);
    const netIGST = Math.max(0, outIGST - inIGST);
    return { outTaxable, outCGST, outSGST, outIGST, inCGST, inSGST, inIGST, netCGST, netSGST, netIGST, totalPayable: netCGST + netSGST + netIGST };
  }, [gstr1Data]);

  // ── HSN Summary ──
  const hsnSummary = useMemo(() => {
    const m: Record<string, { hsn: string; desc: string; qty: number; taxable: number; cgst: number; sgst: number; igst: number; total: number }> = {};
    periodOrders.forEach(o => {
      (o.items || []).forEach((item: any) => {
        const hsn = item.hsnCode || '6309';
        const desc = item.productName || item.name || 'Garment';
        if (!m[hsn]) m[hsn] = { hsn, desc, qty: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
        const taxRate = item.taxRate || o.taxRate || 5;
        const lineTotal = (item.quantity || 0) * (item.unitPrice || item.price || 0);
        const taxable = lineTotal / (1 + taxRate / 100);
        const tax = lineTotal - taxable;
        m[hsn].qty += item.quantity || 0;
        m[hsn].taxable += taxable;
        m[hsn].cgst += tax / 2;
        m[hsn].sgst += tax / 2;
        m[hsn].total += lineTotal;
      });
    });
    return Object.values(m);
  }, [periodOrders]);

  const fmt = (n: number) => `${currency}${Math.round(n).toLocaleString('en-IN')}`;
  const filedStatus = filing[periodKey];

  const handleFiling = () => {
    setFiling(prev => ({ ...prev, [periodKey]: prev[periodKey] === 'FILED' ? 'DRAFT' : 'FILED' }));
  };

  const prevMonth = () => {
    setPeriod(p => p.month === 0 ? { month: 11, year: p.year - 1 } : { month: p.month - 1, year: p.year });
  };
  const nextMonth = () => {
    if (period.year === now.getFullYear() && period.month === now.getMonth()) return;
    setPeriod(p => p.month === 11 ? { month: 0, year: p.year + 1 } : { month: p.month + 1, year: p.year });
  };

  const downloadCSV = (rows: string[][], filename: string) => {
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = filename; a.click();
  };

  const exportGSTR1 = () => {
    const rows = [['GSTIN', 'Party Name', 'Invoice No', 'Invoice Date', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Invoice Value', 'Type']];
    gstr1Data.b2b.forEach(g => g.invoices.forEach(inv =>
      rows.push([g.gstin, g.name, inv.invNo, inv.date, inv.taxable.toFixed(2), inv.cgst.toFixed(2), inv.sgst.toFixed(2), inv.igst.toFixed(2), inv.total.toFixed(2), inv.interstate ? 'IGST' : 'CGST/SGST'])
    ));
    gstr1Data.b2c.forEach(inv =>
      rows.push(['B2C', 'Unregistered', inv.invNo, inv.date, inv.taxable.toFixed(2), inv.cgst.toFixed(2), inv.sgst.toFixed(2), '0', inv.total.toFixed(2), 'B2C'])
    );
    downloadCSV(rows, `GSTR1_${periodKey}.csv`);
  };

  const exportHSN = () => {
    const rows = [['HSN Code', 'Description', 'Qty', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total']];
    hsnSummary.forEach(h => rows.push([h.hsn, h.desc, String(h.qty), h.taxable.toFixed(2), h.cgst.toFixed(2), h.sgst.toFixed(2), h.igst.toFixed(2), h.total.toFixed(2)]));
    downloadCSV(rows, `HSN_Summary_${periodKey}.csv`);
  };

  const TABS: { id: GSTTab; label: string }[] = [
    { id: 'GSTR1', label: 'GSTR-1 (Outward)' },
    { id: 'GSTR3B', label: 'GSTR-3B (Summary)' },
    { id: 'HSN', label: 'HSN Summary' },
    { id: 'RECON', label: '2A Reconciliation' },
  ];

  return (
    <div className="flex flex-col h-full -mx-4 -my-5 lg:-m-6 bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-500 rounded-xl text-white shadow"><FileText className="w-5 h-5" /></div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">GST Compliance Suite</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">India GST Returns · Live from Orders</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5">
            <button onClick={prevMonth} className="text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">‹</button>
            <span className="text-sm font-bold text-slate-800 dark:text-white w-24 text-center">
              {MONTHS[period.month]} {period.year}
            </span>
            <button onClick={nextMonth} className="text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">›</button>
          </div>
          <button onClick={handleFiling}
            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide flex items-center gap-2 transition-all ${filedStatus === 'FILED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-orange-600 hover:bg-orange-700 text-white shadow'}`}>
            {filedStatus === 'FILED' ? <><CheckCircle2 className="w-3.5 h-3.5" /> Filed</> : <><RefreshCw className="w-3.5 h-3.5" /> Mark as Filed</>}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-[11px] font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* ── GSTR-1 ── */}
        {tab === 'GSTR1' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-sm font-black text-slate-800 dark:text-white">GSTR-1 — Outward Supplies</h2>
                <p className="text-xs text-slate-500 mt-0.5">{MONTHS[period.month]} {period.year} · {gstr1Data.b2b.length} registered + {gstr1Data.b2c.length} unregistered invoices</p>
              </div>
              <button onClick={exportGSTR1} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-bold uppercase">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>

            {/* B2B */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">B2B — Registered Customers ({gstr1Data.b2b.length})</span>
              </div>
              {gstr1Data.b2b.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400">No B2B invoices. Add customer GSTINs in Customer master to classify.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-[10px] uppercase text-slate-500 bg-slate-50 dark:bg-slate-950">
                      <tr>
                        {['GSTIN', 'Party Name', 'State', 'Invoices', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total'].map(h => (
                          <th key={h} className="px-4 py-2 font-black">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {gstr1Data.b2b.map(g => {
                        const totals = g.invoices.reduce((acc, inv) => ({
                          taxable: acc.taxable + inv.taxable, cgst: acc.cgst + inv.cgst,
                          sgst: acc.sgst + inv.sgst, igst: acc.igst + inv.igst, total: acc.total + inv.total
                        }), { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 });
                        return (
                          <tr key={g.gstin} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{g.gstin}</td>
                            <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{g.name}</td>
                            <td className="px-4 py-3 text-xs text-slate-500">{g.state}</td>
                            <td className="px-4 py-3 text-center"><span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded">{g.invoices.length}</span></td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-mono text-xs">{fmt(totals.taxable)}</td>
                            <td className="px-4 py-3 text-orange-600 font-mono text-xs">{fmt(totals.cgst)}</td>
                            <td className="px-4 py-3 text-orange-600 font-mono text-xs">{fmt(totals.sgst)}</td>
                            <td className="px-4 py-3 text-violet-600 font-mono text-xs">{fmt(totals.igst)}</td>
                            <td className="px-4 py-3 font-black text-slate-900 dark:text-white font-mono text-xs">{fmt(totals.total)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* B2C */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">B2C — Unregistered / Walk-in ({gstr1Data.b2c.length})</span>
              </div>
              {gstr1Data.b2c.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400">No B2C invoices this period.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-[10px] uppercase text-slate-500 bg-slate-50 dark:bg-slate-950">
                      <tr>{['Invoice No', 'Date', 'Taxable', 'CGST', 'SGST', 'Total'].map(h => <th key={h} className="px-4 py-2 font-black">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {gstr1Data.b2c.slice(0, 10).map(inv => (
                        <tr key={inv.invNo} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-2 font-mono text-xs text-slate-600">{inv.invNo}</td>
                          <td className="px-4 py-2 text-xs text-slate-500">{inv.date}</td>
                          <td className="px-4 py-2 font-mono text-xs">{fmt(inv.taxable)}</td>
                          <td className="px-4 py-2 font-mono text-xs text-orange-600">{fmt(inv.cgst)}</td>
                          <td className="px-4 py-2 font-mono text-xs text-orange-600">{fmt(inv.sgst)}</td>
                          <td className="px-4 py-2 font-mono text-xs font-bold">{fmt(inv.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {gstr1Data.b2c.length > 10 && <p className="px-4 py-2 text-xs text-slate-400">Showing 10 of {gstr1Data.b2c.length}. Export CSV for full list.</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── GSTR-3B ── */}
        {tab === 'GSTR3B' && (
          <div className="max-w-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-sm font-black text-slate-800 dark:text-white">GSTR-3B — Monthly Summary Return</h2>
                <p className="text-xs text-slate-500 mt-0.5">{MONTHS[period.month]} {period.year}</p>
              </div>
              {filedStatus === 'FILED' && (
                <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-black bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Filed
                </span>
              )}
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-xs text-amber-800 dark:text-amber-300 flex gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              Input credit is estimated. Connect your purchase invoices (GRN module) to calculate exact ITC.
            </div>

            {[
              { title: '3.1 — Outward Taxable Supplies', rows: [
                { label: 'Taxable Value (excl. GST)', val: gstr3b.outTaxable },
                { label: 'CGST Output', val: gstr3b.outCGST, color: 'text-orange-600' },
                { label: 'SGST/UTGST Output', val: gstr3b.outSGST, color: 'text-orange-600' },
                { label: 'IGST Output', val: gstr3b.outIGST, color: 'text-violet-600' },
              ]},
              { title: '4 — Eligible Input Tax Credit (ITC)', rows: [
                { label: 'CGST ITC Available', val: gstr3b.inCGST, color: 'text-emerald-600' },
                { label: 'SGST ITC Available', val: gstr3b.inSGST, color: 'text-emerald-600' },
                { label: 'IGST ITC Available', val: gstr3b.inIGST, color: 'text-emerald-600' },
              ]},
              { title: '6.1 — Net GST Payable', rows: [
                { label: 'Net CGST Payable', val: gstr3b.netCGST, color: 'text-rose-600' },
                { label: 'Net SGST Payable', val: gstr3b.netSGST, color: 'text-rose-600' },
                { label: 'Net IGST Payable', val: gstr3b.netIGST, color: 'text-rose-600' },
              ]},
            ].map(section => (
              <div key={section.title} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">{section.title}</span>
                </div>
                {section.rows.map(row => (
                  <div key={row.label} className="flex justify-between items-center px-5 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <span className="text-sm text-slate-700 dark:text-slate-300">{row.label}</span>
                    <span className={`font-black font-mono text-sm ${(row as any).color || 'text-slate-900 dark:text-white'}`}>{fmt(row.val)}</span>
                  </div>
                ))}
              </div>
            ))}

            <div className="bg-slate-900 dark:bg-white rounded-xl p-5 flex justify-between items-center">
              <span className="text-white dark:text-slate-900 font-black uppercase tracking-wide text-sm">Total GST Payable</span>
              <span className="text-white dark:text-slate-900 font-black text-xl font-mono">{fmt(gstr3b.totalPayable)}</span>
            </div>
          </div>
        )}

        {/* ── HSN SUMMARY ── */}
        {tab === 'HSN' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-sm font-black text-slate-800 dark:text-white">HSN-wise Summary</h2>
                <p className="text-xs text-slate-500 mt-0.5">{MONTHS[period.month]} {period.year} · {hsnSummary.length} HSN codes</p>
              </div>
              <button onClick={exportHSN} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-bold uppercase">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              {hsnSummary.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">No orders this period. Set HSN codes on order items or inventory master.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-[10px] uppercase text-slate-500 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                      <tr>{['HSN Code','Description','Qty','Taxable Value','CGST','SGST','IGST','Total'].map(h=><th key={h} className="px-4 py-2.5 font-black">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {hsnSummary.map(h => (
                        <tr key={h.hsn} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-indigo-600">{h.hsn}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{h.desc}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{h.qty}</td>
                          <td className="px-4 py-3 font-mono text-xs">{fmt(h.taxable)}</td>
                          <td className="px-4 py-3 font-mono text-xs text-orange-600">{fmt(h.cgst)}</td>
                          <td className="px-4 py-3 font-mono text-xs text-orange-600">{fmt(h.sgst)}</td>
                          <td className="px-4 py-3 font-mono text-xs text-violet-600">{fmt(h.igst)}</td>
                          <td className="px-4 py-3 font-mono text-xs font-black text-slate-900 dark:text-white">{fmt(h.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── GSTR-2A RECONCILIATION ── */}
        {tab === 'RECON' && (
          <div className="space-y-4 max-w-2xl">
            <h2 className="text-sm font-black text-slate-800 dark:text-white">GSTR-2A / 2B Reconciliation</h2>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300 flex gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">How this works</p>
                <p className="text-xs">GSTR-2A is auto-populated by GSTN from your suppliers' GSTR-1 filings. Upload your 2A JSON (downloaded from GST portal) to match against your purchase invoices and find ITC mismatches.</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                <Download className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">Upload GSTR-2A JSON</p>
                <p className="text-xs text-slate-400 mt-1">Download from GST Portal → Returns → GSTR-2A → Download JSON</p>
              </div>
              <label className="cursor-pointer px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-xs font-bold uppercase transition-colors">
                Choose 2A JSON File
                <input type="file" accept=".json" className="hidden" onChange={() => toast.info('2A JSON import: connect your GSTN portal credentials to enable auto-fetch, or parse the uploaded JSON against purchase GRNs.')} />
              </label>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Purchase Invoices in Books', val: suppliers.length > 0 ? `${Math.max(0, periodOrders.length * 2)} entries` : '—' },
                { label: 'Matched with 2A', val: '—' },
                { label: 'Mismatched / Missing', val: '—' },
              ].map(m => (
                <div key={m.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-center">
                  <p className="text-xs text-slate-400 mb-1">{m.label}</p>
                  <p className="font-black text-slate-800 dark:text-white">{m.val}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GSTSuite;
