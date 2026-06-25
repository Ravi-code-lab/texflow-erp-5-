import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { uuidShort } from "../utils/uuid";
import { Order, Customer, InventoryItem, OrderItem, Design, Agent } from '../types';
import {
  Search, Plus, FileText, Filter,
  MoreHorizontal, ArrowLeft, Save, ChevronLeft, ChevronRight,
  Trash2, Download, Printer, Clock, AlertTriangle, CheckCircle2, Send
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

function validityLabel(dueDate?: string): { label: string; color: string } | null {
  if (!dueDate) return null;
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, color: 'text-rose-600 bg-rose-50 border-rose-200' };
  if (days === 0) return { label: 'Expires today', color: 'text-amber-600 bg-amber-50 border-amber-200' };
  if (days <= 3) return { label: `Expires in ${days}d`, color: 'text-amber-600 bg-amber-50 border-amber-200' };
  return { label: `Valid ${days}d`, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
}

const STATUS_BADGE: Record<string, string> = {
  CONVERTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SENT:      'bg-blue-50 text-blue-700 border-blue-200',
  DRAFT:     'bg-amber-50 text-amber-700 border-amber-200',
  CANCELLED: 'bg-rose-50 text-rose-600 border-rose-200',
};

const Quotation: React.FC<QuotationProps> = ({
  quotations, customers, inventory, designs, agents,
  onAddQuotation, onUpdateQuotation, onDeleteQuotation, onAction, currency = '₹', companyInfo
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM' | 'PREVIEW'>('LIST');
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [formData, setFormData] = useState<Partial<Order>>(EMPTY_FORM());
  const [newItem, setNewItem] = useState<OrderItem>({ productName: '', quantity: 1, unitPrice: 0, unit: 'PIECE' });
  const [saved, setSaved] = useState(false);

  const filteredQuotations = useMemo(() => {
    const q = (filter || '').toLowerCase();
    return (quotations || []).filter(o =>
      (statusFilter === 'ALL' || o.status === statusFilter) &&
      ((o.customerName || '').toLowerCase().includes(q) || (o.id || '').toLowerCase().includes(q))
    );
  }, [quotations, filter, statusFilter]);

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
    setTimeout(() => { setSaved(false); setViewMode('LIST'); }, 1000);
  }, [formData, commissionAmount, grandTotal, onUpdateQuotation, onAddQuotation]);

  const openForm = (o?: Order) => {
    setFormData(o ? { ...o } : EMPTY_FORM());
    setViewMode('FORM');
  };

  const handleAddItem = () => {
    if (newItem.productName && newItem.quantity > 0) {
      setFormData(prev => ({ ...prev, items: [...(prev.items || []), { ...newItem }] }));
      setNewItem({ productName: '', quantity: 1, unitPrice: 0, unit: 'PIECE' });
    }
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

    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text(companyInfo?.name || 'TexFlow ERP', margin, 18);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    if (companyInfo?.address) doc.text(companyInfo.address, margin, 24);
    if (companyInfo?.gstin) doc.text(`GSTIN: ${companyInfo.gstin}`, margin, 28);

    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text('QUOTATION', W - margin, 18, { align: 'right' });
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(`Ref: ${formData.id || 'DRAFT'}`, W - margin, 24, { align: 'right' });
    doc.text(`Date: ${formData.orderDate || ''}`, W - margin, 28, { align: 'right' });
    doc.text(`Valid Until: ${formData.dueDate || ''}`, W - margin, 32, { align: 'right' });
    doc.line(margin, 35, W - margin, 35);

    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text('To:', margin, 41);
    doc.setFont('helvetica', 'normal');
    doc.text(formData.customerName || '', margin, 46);

    autoTable(doc, {
      startY: 55,
      head: [['#', 'Description', 'Qty', 'Unit', 'Rate', 'Amount']],
      body: (formData.items || []).map((i, idx) => [
        idx + 1, i.productName, i.quantity, i.unit || 'PCS',
        `${currency}${i.unitPrice.toLocaleString('en-IN')}`,
        `${currency}${(i.quantity * i.unitPrice).toLocaleString('en-IN')}`
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: margin, right: margin },
    });

    const y = (doc as any).lastAutoTable.finalY + 6;
    const rows: [string, string][] = [
      ['Subtotal', `${currency}${subTotal.toLocaleString('en-IN')}`],
      [`GST (${formData.taxRate ?? 5}%)`, `${currency}${taxAmount.toFixed(2)}`],
      ['Grand Total', `${currency}${grandTotal.toLocaleString('en-IN')}`],
    ];
    if (commissionAmount > 0)
      rows.splice(2, 0, [`Agent Commission (${formData.agentCommissionRate}%)`, `${currency}${commissionAmount.toFixed(2)}`]);

    autoTable(doc, {
      startY: y, body: rows,
      styles: { fontSize: 8 },
      columnStyles: { 0: { halign: 'right', fontStyle: 'bold' }, 1: { halign: 'right' } },
      margin: { left: W / 2, right: margin }, tableWidth: W / 2 - margin,
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

  // LIST VIEW
  if (viewMode === 'LIST') return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">
      <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
        <div className="flex justify-between items-center h-8">
          <div className="flex items-center gap-3">
            <span className="text-xl text-[#1c2126] font-bold tracking-tight">Quotation</span>
            <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filteredQuotations.length}</span>
          </div>
          <button onClick={() => openForm()}
            className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] text-white rounded text-[13px] font-medium shadow-sm transition-all">
            <Plus className="w-4 h-4" /> Add Quotation
          </button>
        </div>
        <div className="flex justify-between items-center mt-3 h-8 gap-2">
          <div className="flex items-center gap-2">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="h-7 px-2 text-xs border border-[#d1d8dd] rounded bg-white outline-none">
              {['ALL', 'DRAFT', 'SENT', 'CONVERTED', 'CANCELLED'].map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Status' : s}</option>)}
            </select>
            <div className="relative">
              <input type="text" placeholder="Name or Quotation ID" value={filter}
                onChange={e => setFilter(e.target.value)}
                className="h-7 w-[240px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] placeholder-[#8d99a6]" />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
            </div>
          </div>
          <span className="text-[13px] text-[#525c66]">{filteredQuotations.length} records</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5 pb-10">
        <div className="bg-white border border-[#d1d8dd] rounded shadow-sm flex flex-col min-w-[900px]">
          <div className="flex items-center border-b border-[#d1d8dd] bg-[#f4f5f6] px-4 py-2.5 text-xs text-[#525c66] font-semibold rounded-t select-none">
            <div className="w-36">Quotation ID</div>
            <div className="w-56">Customer</div>
            <div className="w-28">Status</div>
            <div className="w-36">Date</div>
            <div className="w-32">Valid Until</div>
            <div className="flex-1 text-right pr-4">Grand Total</div>
          </div>
          <div className="divide-y divide-[#d1d8dd]/60">
            {filteredQuotations.length === 0 && (
              <div className="px-4 py-12 flex flex-col items-center text-[#525c66]">
                <FileText className="w-8 h-8 text-[#d1d8dd] mb-2" />
                <p className="text-[13px]">No quotations found.</p>
              </div>
            )}
            {filteredQuotations.map(o => {
              const vl = validityLabel(o.dueDate);
              return (
                <div key={o.id} className="group flex items-center px-4 py-[9px] hover:bg-[#f4f5f6] cursor-pointer text-[13px]" onClick={() => openForm(o)}>
                  <div className="w-36 font-mono font-medium text-[#1c2126]">{o.id}</div>
                  <div className="w-56 truncate font-medium text-[#1c2126]">{o.customerName}</div>
                  <div className="w-28">
                    <span className={`px-2 py-[2px] rounded border text-[10px] font-bold uppercase tracking-wide ${STATUS_BADGE[o.status || 'DRAFT'] || STATUS_BADGE['DRAFT']}`}>
                      {o.status || 'DRAFT'}
                    </span>
                  </div>
                  <div className="w-36 text-[#525c66]">{o.orderDate}</div>
                  <div className="w-32">
                    {vl && <span className={`px-1.5 py-[2px] rounded border text-[10px] font-semibold ${vl.color}`}>{vl.label}</span>}
                  </div>
                  <div className="flex-1 text-right pr-4 tabular-nums font-semibold text-[#1c2126]">
                    {currency}{(o.totalAmount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  // FORM VIEW
  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">
      <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
        <div className="flex justify-between items-center h-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setViewMode('LIST')} className="h-7 w-7 flex items-center justify-center rounded hover:bg-[#f4f5f6] text-[#525c66]">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-lg text-[#1c2126] font-bold tracking-tight">{formData.id || 'New Quotation'}</span>
            {formData.status && (
              <span className={`px-2 py-[2px] rounded border text-[10px] font-bold uppercase tracking-wide ${STATUS_BADGE[formData.status] || STATUS_BADGE['DRAFT']}`}>
                {formData.status}
              </span>
            )}
            {validityLabel(formData.dueDate) && (() => {
              const vl = validityLabel(formData.dueDate)!;
              return <span className={`px-2 py-[2px] rounded border text-[10px] font-semibold flex items-center gap-1 ${vl.color}`}>
                {vl.label.includes('Exp') ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {vl.label}
              </span>;
            })()}
          </div>
          <div className="flex items-center gap-2">
            {formData.id && formData.status !== 'SENT' && formData.status !== 'CONVERTED' && (
              <button type="button" onClick={handleMarkSent}
                className="h-7 px-3 flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded text-[13px] font-medium">
                <Send className="w-3.5 h-3.5" /> Mark Sent
              </button>
            )}
            {formData.id && onAction && formData.status !== 'CONVERTED' && formData.status !== 'CANCELLED' && (
              <button type="button" onClick={() => onAction('CONVERT_TO_SALES_ORDER', formData)}
                className="h-7 px-3 flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded text-[13px] font-medium">
                Convert to Order
              </button>
            )}
            <button type="button" onClick={handleDownloadPDF}
              className="h-7 px-3 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[13px] font-medium">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            {formData.id && (
              <button type="button" onClick={() => { onDeleteQuotation(formData.id!); setViewMode('LIST'); }}
                className="h-7 px-3 flex items-center gap-1.5 bg-white hover:bg-red-50 border border-[#d1d8dd] hover:border-red-200 hover:text-red-600 rounded text-[13px] font-medium text-[#1c2126]">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={handleSave}
              className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] text-white rounded text-[13px] font-medium">
              {saved ? <><CheckCircle2 className="w-3.5 h-3.5" /> Saved</> : <><Save className="w-3.5 h-3.5" /> Save</>}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5 pb-16 flex justify-center">
        <div className="w-full max-w-[860px] space-y-4">

          {/* Customer & Dates */}
          <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-5 text-[13px]">
            <h4 className="font-semibold text-sm mb-4 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Customer & Dates</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 space-y-1.5 flex flex-col">
                <label className="text-xs text-[#525c66]">Customer *</label>
                <input list="cust-list" required value={formData.customerName || ''}
                  onChange={e => setFormData(p => ({ ...p, customerName: e.target.value }))}
                  className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]" placeholder="Select customer…" />
                <datalist id="cust-list">{customers.map(c => <option key={c.id} value={c.name} />)}</datalist>
              </div>
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs text-[#525c66]">Quotation Date</label>
                <input type="date" value={formData.orderDate || ''}
                  onChange={e => setFormData(p => ({ ...p, orderDate: e.target.value }))}
                  className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]" />
              </div>
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs text-[#525c66]">Valid Until</label>
                <input type="date" value={formData.dueDate || ''}
                  onChange={e => setFormData(p => ({ ...p, dueDate: e.target.value }))}
                  className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]" />
              </div>
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs text-[#525c66]">Agent</label>
                <input list="agent-list" value={formData.agentName || ''}
                  onChange={e => setFormData(p => ({ ...p, agentName: e.target.value }))}
                  className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]" placeholder="Optional…" />
                <datalist id="agent-list">{agents.map(a => <option key={a.id} value={a.name} />)}</datalist>
              </div>
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs text-[#525c66]">GST Rate %</label>
                <select value={formData.taxRate ?? 5}
                  onChange={e => setFormData(p => ({ ...p, taxRate: Number(e.target.value) }))}
                  className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] bg-white">
                  {[0, 3, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                </select>
              </div>
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs text-[#525c66]">Status</label>
                <select value={formData.status || 'DRAFT'}
                  onChange={e => setFormData(p => ({ ...p, status: e.target.value as any }))}
                  className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] bg-white">
                  {['DRAFT', 'SENT', 'CONVERTED', 'CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-5 text-[13px]">
            <h4 className="font-semibold text-sm mb-4 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Items</h4>
            <div className="flex gap-2 mb-4">
              <input list="prod-list" className="px-2.5 py-1.5 border border-[#d1d8dd] rounded flex-1 focus:outline-none focus:border-[#2490ef] text-xs"
                placeholder="Product name…" value={newItem.productName}
                onChange={e => {
                  const d = designs.find(x => x.name === e.target.value) || inventory.find(i => i.name === e.target.value);
                  setNewItem(n => ({ ...n, productName: e.target.value, unitPrice: (d as any)?.processCostPerPiece ? (d as any).processCostPerPiece * 1.5 : (d as any)?.pricePerUnit || n.unitPrice }));
                }} />
              <datalist id="prod-list">{[...designs, ...inventory].map(x => <option key={x.id} value={x.name} />)}</datalist>
              <input type="number" className="px-2.5 py-1.5 border border-[#d1d8dd] rounded w-16 focus:outline-none focus:border-[#2490ef] text-xs" placeholder="Qty"
                value={newItem.quantity || ''} onChange={e => setNewItem(n => ({ ...n, quantity: Number(e.target.value) }))} />
              <select className="px-2 py-1.5 border border-[#d1d8dd] rounded w-20 focus:outline-none bg-white text-xs"
                value={newItem.unit || 'PIECE'} onChange={e => setNewItem(n => ({ ...n, unit: e.target.value as any }))}>
                {['PIECE', 'SET', 'METER', 'KG', 'BOX'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <input type="number" className="px-2.5 py-1.5 border border-[#d1d8dd] rounded w-28 focus:outline-none focus:border-[#2490ef] text-xs" placeholder="Price"
                value={newItem.unitPrice || ''} onChange={e => setNewItem(n => ({ ...n, unitPrice: Number(e.target.value) }))} />
              <button type="button" onClick={handleAddItem}
                className="h-[30px] px-3 bg-[#2490ef] hover:bg-[#2081d6] text-white rounded text-xs font-semibold">+ Add</button>
            </div>

            {(formData.items || []).length > 0 && (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f4f5f6] text-[#525c66] border-y border-[#d1d8dd]">
                    <th className="py-2 pl-2 w-8"></th>
                    <th className="py-2 pl-2 font-medium">Item</th>
                    <th className="py-2 px-3 font-medium text-right">Qty</th>
                    <th className="py-2 px-2 font-medium">Unit</th>
                    <th className="py-2 px-3 font-medium text-right">Rate</th>
                    <th className="py-2 pr-3 font-medium text-right">Amount</th>
                    <th className="py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {(formData.items || []).map((item, idx) => (
                    <tr key={idx} className="border-b border-[#d1d8dd]/50">
                      <td className="py-2 pl-2">
                        <ProductImageThumb productName={item.productName} designs={designs} inventory={inventory} size="sm" />
                      </td>
                      <td className="py-2 pl-2 font-semibold">{item.productName}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{item.quantity}</td>
                      <td className="py-2 px-2 text-slate-400">{item.unit || 'PCS'}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{currency}{item.unitPrice.toLocaleString('en-IN')}</td>
                      <td className="py-2 pr-3 text-right font-bold tabular-nums">{currency}{(item.quantity * item.unitPrice).toLocaleString('en-IN')}</td>
                      <td className="py-2 pr-2">
                        <button type="button" onClick={() => removeItem(idx)} className="text-rose-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Summary */}
          <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-5 text-[13px]">
            <div className="flex justify-between items-start gap-8">
              {/* Terms */}
              <div className="flex-1 space-y-1.5">
                <label className="text-xs text-[#525c66] font-semibold block">Terms & Conditions</label>
                <textarea rows={3} value={formData.terms || ''}
                  onChange={e => setFormData(p => ({ ...p, terms: e.target.value }))}
                  className="w-full px-2.5 py-2 border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] text-xs resize-none"
                  placeholder="Payment terms, delivery conditions…" />
              </div>
              {/* Totals */}
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-[#525c66]">
                  <span>Subtotal</span>
                  <span className="tabular-nums font-mono">{currency}{subTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-[#525c66]">
                  <span>GST ({formData.taxRate ?? 5}%)</span>
                  <span className="tabular-nums font-mono">{currency}{taxAmount.toFixed(2)}</span>
                </div>
                {commissionAmount > 0 && (
                  <div className="flex justify-between text-[#525c66]">
                    <span>Agent Commission ({formData.agentCommissionRate}%)</span>
                    <span className="tabular-nums font-mono">{currency}{commissionAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-[#d1d8dd] font-bold text-sm text-[#1c2126]">
                  <span>Grand Total</span>
                  <span className="tabular-nums font-mono text-[#2490ef]">{currency}{grandTotal.toLocaleString('en-IN')}</span>
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
