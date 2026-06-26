import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { uuidShort } from "../utils/uuid";
import { Order, Customer, InventoryItem, OrderItem, Design, Agent } from '../types';
import {
  Search, Plus, FileText, Filter,
  ArrowLeft, Save, ChevronLeft, ChevronRight,
  Trash2, Download, Printer, Clock, AlertTriangle, CheckCircle2, Send,
  ChevronDown, MoreHorizontal, ExternalLink, Copy, RefreshCw,
  User, Calendar, Tag, Activity, Link2, Mail, Phone, MapPin,
  ArrowRight, TrendingUp, Package, Layers
} from 'lucide-react';
import ProductImageThumb from './ProductImageThumb';

interface QuotationProps {
  quotations: Order[];
  customers: Customer[];
  inventory: InventoryItem[];
  designs: Design[];
  agents: Agent[];
  onAddQuotation: (order: Order) => void;
  onUpdateQuotation: (order: Order) => void;
  onDeleteQuotation: (id: string) => void;
  onAction?: (action: string, data: any) => void;
  currency?: string;
  companyInfo?: any;
}

const EMPTY_FORM = (): Partial<Order> => ({
  status: 'DRAFT',
  paymentStatus: 'UNPAID',
  items: [],
  orderDate: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
  taxRate: 5,
  vehicleNo: '', transportName: '', agentName: '',
  agentCommissionRate: 2, agentCommissionAmount: 0,
  terms: 'Payment due within 15 days of invoice. Goods once sold cannot be returned without prior approval.',
});

function formatINR(val: number, currency = '₹') {
  return currency + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function validityLabel(dueDate?: string): { label: string; color: string; pct: number } | null {
  if (!dueDate) return null;
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, color: 'text-rose-600 bg-rose-50 border-rose-200', pct: 0 };
  if (days === 0) return { label: 'Expires today', color: 'text-amber-600 bg-amber-50 border-amber-200', pct: 5 };
  if (days <= 3) return { label: `Expires in ${days}d`, color: 'text-amber-600 bg-amber-50 border-amber-200', pct: Math.round((days / 15) * 100) };
  return { label: `Valid ${days}d`, color: 'text-emerald-600 bg-emerald-50 border-emerald-200', pct: Math.round((days / 15) * 100) };
}

const STATUS_META: Record<string, { color: string; dot: string }> = {
  CONVERTED: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  SENT:      { color: 'bg-blue-50 text-blue-700 border-blue-200',           dot: 'bg-blue-500' },
  DRAFT:     { color: 'bg-amber-50 text-amber-700 border-amber-200',        dot: 'bg-amber-400' },
  CANCELLED: { color: 'bg-rose-50 text-rose-600 border-rose-200',           dot: 'bg-rose-400' },
};

const PIPELINE_STEPS = ['DRAFT', 'SENT', 'CONVERTED'];

const StatusBadge = ({ status }: { status: string }) => {
  const m = STATUS_META[status] || STATUS_META['DRAFT'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-[2px] rounded border text-[10px] font-bold uppercase tracking-wide ${m.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`}></span>
      {status}
    </span>
  );
};

// ─── Pipeline stepper ────────────────────────────────────────────────────────
const PipelineStepper = ({ status }: { status: string }) => {
  const idx = PIPELINE_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-0">
      {PIPELINE_STEPS.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <React.Fragment key={step}>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-semibold transition-all
              ${active ? 'bg-[#2490ef] text-white' : done ? 'bg-emerald-50 text-emerald-700' : 'bg-[#f4f5f6] text-[#8d99a6]'}`}>
              {done && <CheckCircle2 className="w-3 h-3" />}
              {step}
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <ArrowRight className={`w-3.5 h-3.5 mx-0.5 ${done ? 'text-emerald-400' : 'text-[#d1d8dd]'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ─── Inline-editable table cell ──────────────────────────────────────────────
const EditableCell = ({ value, onChange, type = 'text', className = '' }: {
  value: string | number; onChange: (v: any) => void; type?: string; className?: string;
}) => {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(String(value));
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) ref.current?.select(); }, [editing]);
  const commit = () => { setEditing(false); onChange(type === 'number' ? Number(local) : local); };
  return editing ? (
    <input ref={ref} type={type} value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
      className={`w-full border border-[#2490ef] rounded px-1.5 py-0.5 text-xs outline-none bg-blue-50 ${className}`} />
  ) : (
    <span onDoubleClick={() => { setLocal(String(value)); setEditing(true); }}
      className={`cursor-text rounded px-1 hover:bg-[#e8f4fd] transition-colors ${className}`}>{value}</span>
  );
};

const Quotation: React.FC<QuotationProps> = ({
  quotations, customers, inventory, designs, agents,
  onAddQuotation, onUpdateQuotation, onDeleteQuotation, onAction, currency = '₹', companyInfo
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [formData, setFormData] = useState<Partial<Order>>(EMPTY_FORM());
  const [newItem, setNewItem] = useState<OrderItem>({ productName: '', quantity: 1, unitPrice: 0, unit: 'PIECE' });
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'TERMS' | 'CONNECTIONS'>('ITEMS');
  const [sortCol, setSortCol] = useState<string>('orderDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [activityLog] = useState<Array<{ when: string; msg: string; user: string }>>([
    { when: '2 hrs ago', msg: 'Quotation created', user: 'Admin' },
  ]);

  const filteredQuotations = useMemo(() => {
    const q = (filter || '').toLowerCase();
    let list = (quotations || []).filter(o =>
      (statusFilter === 'ALL' || o.status === statusFilter) &&
      ((o.customerName || '').toLowerCase().includes(q) || (o.id || '').toLowerCase().includes(q))
    );
    list = [...list].sort((a: any, b: any) => {
      const va = a[sortCol] ?? ''; const vb = b[sortCol] ?? '';
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    return list;
  }, [quotations, filter, statusFilter, sortCol, sortDir]);

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: string }) => (
    <span className="ml-0.5 opacity-50">{sortCol === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
  );

  useEffect(() => {
    if (formData.agentName) {
      const agent = agents.find(a => a.name === formData.agentName);
      if (agent) setFormData(prev => ({ ...prev, agentCommissionRate: agent.commissionRate || 2 }));
    }
  }, [formData.agentName, agents]);

  const subTotal = useMemo(() =>
    (formData.items || []).reduce((s, i) => s + (i.quantity * i.unitPrice), 0),
    [formData.items]
  );
  const taxAmount = (subTotal * (formData.taxRate || 5)) / 100;
  const commissionAmount = (subTotal * (formData.agentCommissionRate || 0)) / 100;
  const grandTotal = subTotal + taxAmount;

  // Summary stats for list header
  const stats = useMemo(() => {
    const all = quotations || [];
    return {
      total: all.length,
      draft: all.filter(o => o.status === 'DRAFT').length,
      sent: all.filter(o => o.status === 'SENT').length,
      converted: all.filter(o => o.status === 'CONVERTED').length,
      totalValue: all.reduce((s, o) => s + (o.totalAmount || 0), 0),
    };
  }, [quotations]);

  const handleSave = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!formData.customerName || !formData.items?.length) return;
    const oData = {
      ...formData,
      id: formData.id || `QTN-${uuidShort(8)}`,
      agentCommissionAmount: commissionAmount,
      totalAmount: grandTotal,
    } as Order;
    if (formData.id) onUpdateQuotation(oData);
    else onAddQuotation(oData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [formData, commissionAmount, grandTotal, onUpdateQuotation, onAddQuotation]);

  const openForm = (o?: Order) => {
    setFormData(o ? { ...o } : EMPTY_FORM());
    setActiveTab('ITEMS');
    setViewMode('FORM');
  };

  const handleAddItem = () => {
    if (newItem.productName && newItem.quantity > 0) {
      setFormData(prev => ({ ...prev, items: [...(prev.items || []), { ...newItem }] }));
      setNewItem({ productName: '', quantity: 1, unitPrice: 0, unit: 'PIECE' });
    }
  };

  const updateItem = (idx: number, field: keyof OrderItem, value: any) => {
    const updated = (formData.items || []).map((it, i) => i === idx ? { ...it, [field]: value } : it);
    setFormData(prev => ({ ...prev, items: updated }));
  };

  const removeItem = (idx: number) => {
    const updated = [...(formData.items || [])];
    updated.splice(idx, 1);
    setFormData(prev => ({ ...prev, items: updated }));
  };

  const handleMarkSent = () => {
    if (!formData.id) return;
    const updated = { ...formData, status: 'SENT' } as Order;
    onUpdateQuotation(updated);
    setFormData(updated);
  };

  const handleDownloadPDF = useCallback(async () => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const margin = 14; const W = 210;

    // Header band
    doc.setFillColor(36, 144, 239);
    doc.rect(0, 0, W, 38, 'F');
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text(companyInfo?.name || 'TexFlow ERP', margin, 16);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    if (companyInfo?.address) doc.text(companyInfo.address, margin, 22);
    if (companyInfo?.gstin) doc.text(`GSTIN: ${companyInfo.gstin}`, margin, 27);
    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text('QUOTATION', W - margin, 16, { align: 'right' });
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(`Ref: ${formData.id || 'DRAFT'}`, W - margin, 22, { align: 'right' });
    doc.text(`Date: ${formData.orderDate || ''}  |  Valid: ${formData.dueDate || ''}`, W - margin, 27, { align: 'right' });

    doc.setTextColor(28, 33, 38);
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', margin, 46);
    doc.setFont('helvetica', 'normal');
    doc.text(formData.customerName || '', margin, 52);

    autoTable(doc, {
      startY: 62,
      head: [['#', 'Description', 'Qty', 'Unit', 'Rate', 'Amount']],
      body: (formData.items || []).map((i, idx) => [
        idx + 1, i.productName, i.quantity, i.unit || 'PCS',
        formatINR(i.unitPrice, currency),
        formatINR(i.quantity * i.unitPrice, currency)
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [36, 144, 239], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      margin: { left: margin, right: margin },
    });

    const y = (doc as any).lastAutoTable.finalY + 6;
    const rows: [string, string][] = [
      ['Subtotal', formatINR(subTotal, currency)],
      [`GST (${formData.taxRate ?? 5}%)`, formatINR(taxAmount, currency)],
    ];
    if (commissionAmount > 0) rows.push([`Agent Comm. (${formData.agentCommissionRate}%)`, formatINR(commissionAmount, currency)]);
    rows.push(['Grand Total', formatINR(grandTotal, currency)]);

    autoTable(doc, {
      startY: y, body: rows,
      styles: { fontSize: 8 },
      columnStyles: { 0: { halign: 'right', fontStyle: 'bold' }, 1: { halign: 'right' } },
      margin: { left: W / 2, right: margin }, tableWidth: W / 2 - margin,
      didDrawCell: (data: any) => {
        if (data.row.index === rows.length - 1) {
          doc.setFillColor(36, 144, 239);
        }
      }
    });

    if (formData.terms) {
      const y2 = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(7); doc.setFont('helvetica', 'bold');
      doc.text('Terms & Conditions:', margin, y2);
      doc.setFont('helvetica', 'normal');
      doc.text(formData.terms, margin, y2 + 5, { maxWidth: W - margin * 2 });
    }

    doc.save(`${formData.id || 'quotation'}.pdf`);
  }, [formData, subTotal, taxAmount, grandTotal, commissionAmount, currency, companyInfo]);

  const linkedSO = useMemo(() =>
    formData.id ? ([] as Order[]) : [],
    [formData.id]
  );

  // ─── LIST VIEW ───────────────────────────────────────────────────────────
  if (viewMode === 'LIST') return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">

      {/* Header */}
      <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 pt-4 pb-0 sticky top-0 z-20">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tight">Quotation</span>
            <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{stats.total}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-7 px-2.5 flex items-center gap-1.5 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f6] rounded text-[13px] font-medium text-[#525c66]">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button onClick={() => openForm()}
              className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] text-white rounded text-[13px] font-medium shadow-sm">
              <Plus className="w-4 h-4" /> Add Quotation
            </button>
          </div>
        </div>

        {/* KPI bar */}
        <div className="flex items-center gap-4 mb-3 text-[12px]">
          {[
            { label: 'Draft', val: stats.draft, color: 'text-amber-600' },
            { label: 'Sent', val: stats.sent, color: 'text-blue-600' },
            { label: 'Converted', val: stats.converted, color: 'text-emerald-600' },
            { label: 'Total Value', val: formatINR(stats.totalValue, currency), color: 'text-[#1c2126]', bold: true },
          ].map(k => (
            <div key={k.label} className="flex items-center gap-1.5">
              <span className="text-[#8d99a6]">{k.label}:</span>
              <span className={`font-semibold ${k.color} ${k.bold ? 'font-bold' : ''}`}>{k.val}</span>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex justify-between items-center h-8 gap-2 border-t border-[#f4f5f6] pt-2 pb-2">
          <div className="flex items-center gap-2">
            {['ALL', 'DRAFT', 'SENT', 'CONVERTED', 'CANCELLED'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`h-7 px-3 text-[12px] font-medium rounded transition-colors
                  ${statusFilter === s ? 'bg-[#2490ef] text-white' : 'bg-white border border-[#d1d8dd] text-[#525c66] hover:bg-[#f4f5f6]'}`}>
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
            <div className="relative ml-1">
              <input type="text" placeholder="Search customer or ID…" value={filter}
                onChange={e => setFilter(e.target.value)}
                className="h-7 w-[220px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] placeholder-[#8d99a6]" />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
            </div>
          </div>
          <span className="text-[13px] text-[#525c66]">{filteredQuotations.length} records</span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-5 pb-10">
        <div className="bg-white border border-[#d1d8dd] rounded shadow-sm min-w-[960px]">
          {/* Column headers */}
          <div className="flex items-center border-b border-[#d1d8dd] bg-[#f4f5f6] px-4 py-2.5 text-xs text-[#525c66] font-semibold rounded-t select-none">
            <div className="w-8">
              <input type="checkbox" className="w-3.5 h-3.5 rounded-sm border-[#d1d8dd]" />
            </div>
            {[
              { key: 'id', label: 'Quotation ID', w: 'w-36' },
              { key: 'customerName', label: 'Customer', w: 'w-52' },
              { key: 'status', label: 'Status', w: 'w-28' },
              { key: 'orderDate', label: 'Date', w: 'w-28' },
              { key: 'dueDate', label: 'Valid Until', w: 'w-32' },
              { key: 'agentName', label: 'Agent', w: 'w-32' },
            ].map(col => (
              <div key={col.key} className={`${col.w} cursor-pointer hover:text-[#1c2126]`} onClick={() => toggleSort(col.key)}>
                {col.label}<SortIcon col={col.key} />
              </div>
            ))}
            <div className="flex-1 text-right pr-4 cursor-pointer hover:text-[#1c2126]" onClick={() => toggleSort('totalAmount')}>
              Grand Total<SortIcon col="totalAmount" />
            </div>
          </div>

          <div className="divide-y divide-[#d1d8dd]/60">
            {filteredQuotations.length === 0 && (
              <div className="px-4 py-16 flex flex-col items-center text-[#525c66]">
                <FileText className="w-10 h-10 text-[#d1d8dd] mb-3" />
                <p className="text-[14px] font-medium mb-1">No quotations found</p>
                <p className="text-[12px] text-[#8d99a6]">Create your first quotation to get started</p>
                <button onClick={() => openForm()} className="mt-4 h-8 px-4 bg-[#2490ef] text-white rounded text-[13px] font-medium">
                  + New Quotation
                </button>
              </div>
            )}
            {filteredQuotations.map(o => {
              const vl = validityLabel(o.dueDate);
              const checked = checkedIds.has(o.id || '');
              return (
                <div key={o.id} className={`group flex items-center px-4 py-[9px] hover:bg-[#f4f5f6] cursor-pointer text-[13px] transition-colors
                  ${checked ? 'bg-blue-50' : ''}`}>
                  <div className="w-8" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={checked}
                      onChange={e => {
                        const s = new Set(checkedIds);
                        e.target.checked ? s.add(o.id || '') : s.delete(o.id || '');
                        setCheckedIds(s);
                      }}
                      className="w-3.5 h-3.5 rounded-sm border-[#d1d8dd] text-[#2490ef]" />
                  </div>
                  <div className="w-36 font-mono font-semibold text-[#2490ef] hover:underline cursor-pointer" onClick={() => openForm(o)}>{o.id}</div>
                  <div className="w-52 truncate font-medium text-[#1c2126]">{o.customerName}</div>
                  <div className="w-28"><StatusBadge status={o.status || 'DRAFT'} /></div>
                  <div className="w-28 text-[#525c66]">{o.orderDate}</div>
                  <div className="w-32">
                    {vl && (
                      <div>
                        <span className={`text-[10px] font-semibold ${vl.color.split(' ')[0]}`}>{vl.label}</span>
                        <div className="mt-0.5 h-1 rounded-full bg-[#e2e6ea] overflow-hidden w-20">
                          <div className={`h-full rounded-full transition-all ${vl.pct > 50 ? 'bg-emerald-400' : vl.pct > 20 ? 'bg-amber-400' : 'bg-rose-400'}`}
                            style={{ width: `${vl.pct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="w-32 text-[#525c66] truncate">{o.agentName || '—'}</div>
                  <div className="flex-1 text-right pr-4 tabular-nums font-bold text-[#1c2126]">
                    {formatINR(o.totalAmount || 0, currency)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer total */}
          {filteredQuotations.length > 0 && (
            <div className="flex items-center px-4 py-2.5 border-t border-[#d1d8dd] bg-[#f4f5f6] rounded-b text-xs text-[#525c66] font-semibold">
              <div className="flex-1">Total ({filteredQuotations.length} records)</div>
              <div className="pr-4 tabular-nums text-[#1c2126] font-bold">
                {formatINR(filteredQuotations.reduce((s, o) => s + (o.totalAmount || 0), 0), currency)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ─── FORM VIEW ────────────────────────────────────────────────────────────
  const vl = validityLabel(formData.dueDate);
  const custInfo = customers.find(c => c.name === formData.customerName);

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">

      {/* Form header */}
      <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 pt-3 pb-0 sticky top-0 z-20">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[11px] text-[#8d99a6] mb-2">
          <button onClick={() => setViewMode('LIST')} className="hover:text-[#2490ef] transition-colors">Quotation</button>
          <span>/</span>
          <span className="text-[#1c2126] font-medium">{formData.id || 'New'}</span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => setViewMode('LIST')}
              className="h-7 w-7 flex items-center justify-center rounded hover:bg-[#f4f5f6] text-[#525c66]">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight">{formData.id || 'New Quotation'}</span>
                <StatusBadge status={formData.status || 'DRAFT'} />
                {vl && (
                  <span className={`text-[10px] font-semibold flex items-center gap-1 ${vl.color.split(' ')[0]}`}>
                    {vl.label.includes('Exp') ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {vl.label}
                  </span>
                )}
              </div>
              {/* Pipeline stepper */}
              <div className="mt-1.5">
                <PipelineStepper status={formData.status || 'DRAFT'} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {formData.id && formData.status === 'DRAFT' && (
              <button type="button" onClick={handleMarkSent}
                className="h-7 px-3 flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded text-[13px] font-medium">
                <Send className="w-3.5 h-3.5" /> Mark Sent
              </button>
            )}
            {formData.id && onAction && formData.status !== 'CONVERTED' && formData.status !== 'CANCELLED' && (
              <button type="button" onClick={() => onAction('CONVERT_TO_SALES_ORDER', formData)}
                className="h-7 px-3 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[13px] font-medium">
                <ArrowRight className="w-3.5 h-3.5" /> Convert to SO
              </button>
            )}
            <button type="button" onClick={handleDownloadPDF}
              className="h-7 px-3 flex items-center gap-1.5 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f6] text-[#525c66] rounded text-[13px] font-medium">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            {formData.id && (
              <button type="button" onClick={() => { onDeleteQuotation(formData.id!); setViewMode('LIST'); }}
                className="h-7 px-3 flex items-center gap-1.5 bg-white hover:bg-red-50 border border-[#d1d8dd] hover:border-red-200 hover:text-red-600 rounded text-[13px] font-medium text-[#525c66]">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={handleSave}
              className={`h-7 px-4 flex items-center gap-1.5 rounded text-[13px] font-medium transition-all
                ${saved ? 'bg-emerald-500 text-white' : 'bg-[#2490ef] hover:bg-[#2081d6] text-white'}`}>
              {saved ? <><CheckCircle2 className="w-3.5 h-3.5" /> Saved</> : <><Save className="w-3.5 h-3.5" /> Save</>}
            </button>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-0 mt-3 border-t border-[#f4f5f6]">
          {(['ITEMS', 'TERMS', 'CONNECTIONS'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-[12px] font-medium border-b-2 transition-colors
                ${activeTab === tab ? 'border-[#2490ef] text-[#2490ef]' : 'border-transparent text-[#525c66] hover:text-[#1c2126]'}`}>
              {tab === 'ITEMS' ? 'Items' : tab === 'TERMS' ? 'Terms & More' : 'Connections'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-16">
        <div className="flex gap-4 p-5 max-w-[1100px] mx-auto">

          {/* Left: main content */}
          <div className="flex-1 space-y-4">

            {/* Customer & Dates card */}
            <div className="bg-white border border-[#d1d8dd] rounded shadow-sm overflow-hidden">
              <div className="bg-[#f4f5f6] px-5 py-2.5 border-b border-[#d1d8dd] flex items-center justify-between">
                <span className="text-[12px] font-bold text-[#525c66] uppercase tracking-wide">Customer & Dates</span>
                {custInfo && <span className="text-[11px] text-[#8d99a6]">{custInfo.phone || ''}</span>}
              </div>
              <div className="p-5 grid grid-cols-3 gap-4 text-[13px]">
                <div className="col-span-1 space-y-1">
                  <label className="text-[11px] text-[#8d99a6] font-medium uppercase tracking-wide flex items-center gap-1"><User className="w-3 h-3"/>Customer *</label>
                  <input list="cust-list" required value={formData.customerName || ''}
                    onChange={e => setFormData(p => ({ ...p, customerName: e.target.value }))}
                    className="w-full px-2.5 py-[6px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef]/30 bg-[#fdfdfd]"
                    placeholder="Select customer…" />
                  <datalist id="cust-list">{customers.map(c => <option key={c.id} value={c.name} />)}</datalist>
                  {custInfo?.address && <p className="text-[11px] text-[#8d99a6] flex items-start gap-1 mt-1"><MapPin className="w-3 h-3 mt-0.5 flex-shrink-0"/>{custInfo.address}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#8d99a6] font-medium uppercase tracking-wide flex items-center gap-1"><Calendar className="w-3 h-3"/>Quotation Date</label>
                  <input type="date" value={formData.orderDate || ''}
                    onChange={e => setFormData(p => ({ ...p, orderDate: e.target.value }))}
                    className="w-full px-2.5 py-[6px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] bg-[#fdfdfd]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#8d99a6] font-medium uppercase tracking-wide flex items-center gap-1"><Calendar className="w-3 h-3"/>Valid Until</label>
                  <input type="date" value={formData.dueDate || ''}
                    onChange={e => setFormData(p => ({ ...p, dueDate: e.target.value }))}
                    className="w-full px-2.5 py-[6px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] bg-[#fdfdfd]" />
                  {vl && (
                    <div className="mt-1">
                      <div className="h-1.5 rounded-full bg-[#e2e6ea] overflow-hidden">
                        <div className={`h-full rounded-full ${vl.pct > 50 ? 'bg-emerald-400' : vl.pct > 20 ? 'bg-amber-400' : 'bg-rose-400'}`}
                          style={{ width: `${vl.pct}%` }} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#8d99a6] font-medium uppercase tracking-wide">Agent</label>
                  <input list="agent-list" value={formData.agentName || ''}
                    onChange={e => setFormData(p => ({ ...p, agentName: e.target.value }))}
                    className="w-full px-2.5 py-[6px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] bg-[#fdfdfd]" placeholder="Optional…" />
                  <datalist id="agent-list">{agents.map(a => <option key={a.id} value={a.name} />)}</datalist>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#8d99a6] font-medium uppercase tracking-wide">GST Rate %</label>
                  <select value={formData.taxRate ?? 5}
                    onChange={e => setFormData(p => ({ ...p, taxRate: Number(e.target.value) }))}
                    className="w-full px-2.5 py-[6px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] bg-[#fdfdfd]">
                    {[0, 3, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#8d99a6] font-medium uppercase tracking-wide">Status</label>
                  <select value={formData.status || 'DRAFT'}
                    onChange={e => setFormData(p => ({ ...p, status: e.target.value as any }))}
                    className="w-full px-2.5 py-[6px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] bg-[#fdfdfd]">
                    {['DRAFT', 'SENT', 'CONVERTED', 'CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Items tab */}
            {activeTab === 'ITEMS' && (
              <div className="bg-white border border-[#d1d8dd] rounded shadow-sm overflow-hidden">
                <div className="bg-[#f4f5f6] px-5 py-2.5 border-b border-[#d1d8dd] flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#525c66] uppercase tracking-wide">Items Table</span>
                  <span className="text-[11px] text-[#8d99a6]">Double-click a cell to edit</span>
                </div>
                <div className="p-5">
                  {/* Add item row */}
                  <div className="flex gap-2 mb-4 p-3 bg-[#f4f5f6] rounded border border-[#d1d8dd]">
                    <input list="prod-list"
                      className="px-2.5 py-1.5 border border-[#d1d8dd] rounded flex-1 focus:outline-none focus:border-[#2490ef] text-xs bg-white"
                      placeholder="Product name…" value={newItem.productName}
                      onChange={e => {
                        const d = designs.find(x => x.name === e.target.value) || inventory.find(i => i.name === e.target.value);
                        setNewItem(n => ({ ...n, productName: e.target.value, unitPrice: (d as any)?.processCostPerPiece ? (d as any).processCostPerPiece * 1.5 : (d as any)?.pricePerUnit || n.unitPrice }));
                      }} />
                    <datalist id="prod-list">{[...designs, ...inventory].map(x => <option key={x.id} value={x.name} />)}</datalist>
                    <input type="number" className="px-2.5 py-1.5 border border-[#d1d8dd] rounded w-16 focus:outline-none focus:border-[#2490ef] text-xs bg-white" placeholder="Qty"
                      value={newItem.quantity || ''} onChange={e => setNewItem(n => ({ ...n, quantity: Number(e.target.value) }))} />
                    <select className="px-2 py-1.5 border border-[#d1d8dd] rounded w-20 focus:outline-none bg-white text-xs"
                      value={newItem.unit || 'PIECE'} onChange={e => setNewItem(n => ({ ...n, unit: e.target.value as any }))}>
                      {['PIECE', 'SET', 'METER', 'KG', 'BOX'].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <input type="number" className="px-2.5 py-1.5 border border-[#d1d8dd] rounded w-28 focus:outline-none focus:border-[#2490ef] text-xs bg-white" placeholder="Rate ₹"
                      value={newItem.unitPrice || ''} onChange={e => setNewItem(n => ({ ...n, unitPrice: Number(e.target.value) }))} />
                    <button type="button" onClick={handleAddItem}
                      className="h-[30px] px-4 bg-[#2490ef] hover:bg-[#2081d6] text-white rounded text-xs font-semibold">+ Add</button>
                  </div>

                  {(formData.items || []).length > 0 && (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#f4f5f6] text-[#525c66] border-y border-[#d1d8dd]">
                          <th className="py-2 pl-2 w-8"></th>
                          <th className="py-2 pl-2 font-semibold">Item</th>
                          <th className="py-2 px-3 font-semibold text-right w-16">Qty</th>
                          <th className="py-2 px-2 font-semibold w-20">Unit</th>
                          <th className="py-2 px-3 font-semibold text-right w-28">Rate</th>
                          <th className="py-2 pr-3 font-semibold text-right w-28">Amount</th>
                          <th className="py-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(formData.items || []).map((item, idx) => (
                          <tr key={idx} className="border-b border-[#d1d8dd]/50 hover:bg-[#f9fafb] group">
                            <td className="py-2 pl-2">
                              <ProductImageThumb productName={item.productName} designs={designs} inventory={inventory} size="sm" />
                            </td>
                            <td className="py-2 pl-2 font-semibold">
                              <EditableCell value={item.productName} onChange={v => updateItem(idx, 'productName', v)} />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <EditableCell value={item.quantity} onChange={v => updateItem(idx, 'quantity', v)} type="number" className="w-16 text-right" />
                            </td>
                            <td className="py-2 px-2 text-[#8d99a6]">{item.unit || 'PCS'}</td>
                            <td className="py-2 px-3 text-right">
                              <EditableCell value={item.unitPrice} onChange={v => updateItem(idx, 'unitPrice', v)} type="number" className="w-24 text-right" />
                            </td>
                            <td className="py-2 pr-3 text-right font-bold tabular-nums">{formatINR(item.quantity * item.unitPrice, currency)}</td>
                            <td className="py-2 pr-2">
                              <button type="button" onClick={() => removeItem(idx)} className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 transition-opacity">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {(formData.items || []).length === 0 && (
                    <div className="py-10 text-center text-[#8d99a6]">
                      <Package className="w-8 h-8 mx-auto mb-2 text-[#d1d8dd]" />
                      <p className="text-[12px]">No items added yet. Use the form above to add items.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Terms tab */}
            {activeTab === 'TERMS' && (
              <div className="bg-white border border-[#d1d8dd] rounded shadow-sm overflow-hidden">
                <div className="bg-[#f4f5f6] px-5 py-2.5 border-b border-[#d1d8dd]">
                  <span className="text-[12px] font-bold text-[#525c66] uppercase tracking-wide">Terms & Shipping</span>
                </div>
                <div className="p-5 grid grid-cols-2 gap-4 text-[13px]">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[11px] text-[#8d99a6] font-medium uppercase tracking-wide">Terms & Conditions</label>
                    <textarea rows={4} value={formData.terms || ''}
                      onChange={e => setFormData(p => ({ ...p, terms: e.target.value }))}
                      className="w-full px-2.5 py-2 border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] text-xs resize-none bg-[#fdfdfd]"
                      placeholder="Payment terms, delivery conditions…" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8d99a6] font-medium uppercase tracking-wide">Transport</label>
                    <input value={formData.transportName || ''} onChange={e => setFormData(p => ({ ...p, transportName: e.target.value }))}
                      className="w-full px-2.5 py-[6px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] bg-[#fdfdfd]" placeholder="Transport name…" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8d99a6] font-medium uppercase tracking-wide">Vehicle No.</label>
                    <input value={formData.vehicleNo || ''} onChange={e => setFormData(p => ({ ...p, vehicleNo: e.target.value }))}
                      className="w-full px-2.5 py-[6px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] bg-[#fdfdfd]" placeholder="GJ01AB1234…" />
                  </div>
                </div>
              </div>
            )}

            {/* Connections tab */}
            {activeTab === 'CONNECTIONS' && (
              <div className="bg-white border border-[#d1d8dd] rounded shadow-sm overflow-hidden">
                <div className="bg-[#f4f5f6] px-5 py-2.5 border-b border-[#d1d8dd]">
                  <span className="text-[12px] font-bold text-[#525c66] uppercase tracking-wide">Linked Documents</span>
                </div>
                <div className="p-5">
                  {formData.status === 'CONVERTED' ? (
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded text-[13px]">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <div>
                        <p className="font-semibold text-emerald-700">Converted to Sales Order</p>
                        <p className="text-[11px] text-emerald-600">This quotation has been converted. View it in Sales Orders.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[13px] text-[#8d99a6] text-center py-6">
                      <Link2 className="w-6 h-6 mx-auto mb-2 text-[#d1d8dd]" />
                      <p>No linked documents yet.</p>
                      <p className="text-[11px] mt-1">Convert this quotation to a Sales Order to see connections here.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="w-64 space-y-4 flex-shrink-0">

            {/* Totals */}
            <div className="bg-white border border-[#d1d8dd] rounded shadow-sm overflow-hidden">
              <div className="bg-[#2490ef] px-4 py-2.5">
                <span className="text-[12px] font-bold text-white uppercase tracking-wide">Summary</span>
              </div>
              <div className="p-4 space-y-2 text-[12px]">
                <div className="flex justify-between text-[#525c66]">
                  <span>Subtotal</span>
                  <span className="tabular-nums font-mono">{formatINR(subTotal, currency)}</span>
                </div>
                <div className="flex justify-between text-[#525c66]">
                  <span>GST ({formData.taxRate ?? 5}%)</span>
                  <span className="tabular-nums font-mono">{formatINR(taxAmount, currency)}</span>
                </div>
                {commissionAmount > 0 && (
                  <div className="flex justify-between text-[#525c66]">
                    <span>Commission ({formData.agentCommissionRate}%)</span>
                    <span className="tabular-nums font-mono text-rose-500">-{formatINR(commissionAmount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2.5 border-t border-[#d1d8dd] font-bold text-[14px] text-[#1c2126]">
                  <span>Grand Total</span>
                  <span className="tabular-nums font-mono text-[#2490ef]">{formatINR(grandTotal, currency)}</span>
                </div>
                <div className="pt-2 text-[11px] text-[#8d99a6]">
                  {(formData.items || []).length} items · {(formData.items || []).reduce((s, i) => s + i.quantity, 0)} units
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-white border border-[#d1d8dd] rounded shadow-sm overflow-hidden">
              <div className="bg-[#f4f5f6] px-4 py-2.5 border-b border-[#d1d8dd]">
                <span className="text-[12px] font-bold text-[#525c66] uppercase tracking-wide">Quick Actions</span>
              </div>
              <div className="p-3 space-y-1.5">
                <button type="button" onClick={handleDownloadPDF}
                  className="w-full h-8 flex items-center gap-2 px-3 text-[12px] text-[#525c66] hover:bg-[#f4f5f6] rounded transition-colors">
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </button>
                <button type="button"
                  className="w-full h-8 flex items-center gap-2 px-3 text-[12px] text-[#525c66] hover:bg-[#f4f5f6] rounded transition-colors">
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button type="button"
                  className="w-full h-8 flex items-center gap-2 px-3 text-[12px] text-[#525c66] hover:bg-[#f4f5f6] rounded transition-colors">
                  <Mail className="w-3.5 h-3.5" /> Send Email
                </button>
                <button type="button"
                  className="w-full h-8 flex items-center gap-2 px-3 text-[12px] text-[#525c66] hover:bg-[#f4f5f6] rounded transition-colors">
                  <Copy className="w-3.5 h-3.5" /> Duplicate
                </button>
              </div>
            </div>

            {/* Activity */}
            <div className="bg-white border border-[#d1d8dd] rounded shadow-sm overflow-hidden">
              <div className="bg-[#f4f5f6] px-4 py-2.5 border-b border-[#d1d8dd] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#8d99a6]" />
                <span className="text-[12px] font-bold text-[#525c66] uppercase tracking-wide">Activity</span>
              </div>
              <div className="p-3 space-y-3">
                {activityLog.map((a, i) => (
                  <div key={i} className="flex gap-2 text-[11px]">
                    <div className="w-5 h-5 rounded-full bg-[#2490ef] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white font-bold text-[8px]">{a.user[0]}</span>
                    </div>
                    <div>
                      <p className="text-[#1c2126]">{a.msg}</p>
                      <p className="text-[#8d99a6]">{a.when} · {a.user}</p>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 text-[11px]">
                  <div className="w-5 h-5 rounded-full bg-[#d1d8dd] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Plus className="w-2.5 h-2.5 text-[#525c66]" />
                  </div>
                  <input placeholder="Add comment…" className="flex-1 text-[11px] border-none outline-none bg-transparent text-[#525c66] placeholder-[#8d99a6]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Quotation;
