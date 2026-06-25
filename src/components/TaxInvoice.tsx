import React, { useState, useMemo, useCallback } from 'react';
import { FileText, Printer, ShieldCheck, Download, Award, CreditCard, CheckCircle2, Clock, AlertCircle, ChevronDown } from 'lucide-react';
import ProductImageThumb from './ProductImageThumb';

interface TaxInvoiceProps {
  orders: any[];
  customers: any[];
  onAddChallan?: (challan: any) => void;
  onUpdateChallan?: (challan: any) => void;
  currency?: string;
  companyInfo?: any;
  inventory?: any[];
  designs?: any[];
  onAddInvoice?: (item: any) => void;
  onUpdateOrder?: (order: any) => void;
  pendingOrderId?: string;
  onClearPending?: () => void;
}

type GSTMode = 'IGST' | 'CGST_SGST';
type PaymentMode = 'CASH' | 'CHEQUE' | 'NEFT' | 'UPI' | 'CREDIT';

function getStateCodeFromGSTIN(gstin: string): string {
  return gstin?.length >= 2 ? gstin.substring(0, 2) : '';
}

function detectGSTMode(companyGSTIN: string, customerGSTIN: string): GSTMode {
  const compState = getStateCodeFromGSTIN(companyGSTIN);
  const custState = getStateCodeFromGSTIN(customerGSTIN);
  if (!compState || !custState || compState !== custState) return 'IGST';
  return 'CGST_SGST';
}

function formatINR(val: number) {
  return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function amountInWords(amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (amount === 0) return 'Zero Rupees Only';
  const n = Math.round(amount);
  const paise = Math.round((amount - Math.floor(amount)) * 100);
  function toWords(num: number): string {
    if (num === 0) return '';
    if (num < 20) return ones[num] + ' ';
    if (num < 100) return tens[Math.floor(num / 10)] + ' ' + (num % 10 !== 0 ? ones[num % 10] + ' ' : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred ' + toWords(num % 100);
    if (num < 100000) return toWords(Math.floor(num / 1000)) + 'Thousand ' + toWords(num % 1000);
    if (num < 10000000) return toWords(Math.floor(num / 100000)) + 'Lakh ' + toWords(num % 100000);
    return toWords(Math.floor(num / 10000000)) + 'Crore ' + toWords(num % 10000000);
  }
  let result = toWords(n).trim() + ' Rupees';
  if (paise > 0) result += ' and ' + toWords(paise).trim() + ' Paise';
  return result + ' Only';
}

export default function TaxInvoice({
  orders, customers, currency = '₹', companyInfo, designs = [], inventory = [],
  onUpdateOrder, pendingOrderId, onClearPending, onAddInvoice
}: TaxInvoiceProps) {
  const [selectedOrderId, setSelectedOrderId] = useState(pendingOrderId || orders[0]?.id || '');
  const [taxRateOverride, setTaxRateOverride] = useState<number | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CREDIT');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentSaved, setPaymentSaved] = useState(false);
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [invoiceRemark, setInvoiceRemark] = useState('');

  React.useEffect(() => {
    if (pendingOrderId) {
      setSelectedOrderId(pendingOrderId);
      onClearPending?.();
    }
  }, [pendingOrderId]); // eslint-disable-line

  const order = useMemo(() =>
    orders.find(o => o.id === selectedOrderId) || orders[0],
    [orders, selectedOrderId]
  );
  const customer = useMemo(() =>
    customers.find(c => c.name === order?.customerName),
    [customers, order]
  );

  const companyGSTIN: string = companyInfo?.gstin || '';
  const customerGSTIN: string = customer?.gstin || '';
  const gstMode = detectGSTMode(companyGSTIN, customerGSTIN);

  const subtotal = useMemo(() =>
    (order?.items || []).reduce((s: number, i: any) => s + (i.quantity * i.unitPrice), 0),
    [order]
  );

  const effectiveTaxRate = taxRateOverride !== null ? taxRateOverride : (order?.taxRate ?? 5);
  const taxAmount = subtotal * effectiveTaxRate / 100;
  const igstAmt = gstMode === 'IGST' ? taxAmount : 0;
  const cgstAmt = gstMode === 'CGST_SGST' ? taxAmount / 2 : 0;
  const sgstAmt = gstMode === 'CGST_SGST' ? taxAmount / 2 : 0;
  const grandTotal = subtotal + taxAmount;

  const invoiceNo = `INV-${(order?.id || 'NEW').replace(/[^A-Z0-9]/gi, '').toUpperCase()}`;
  const invoiceDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const paidAmount = order?.paidAmount ?? 0;
  const outstanding = grandTotal - paidAmount;

  const paymentStatusBadge = useMemo(() => {
    if (paidAmount >= grandTotal) return { label: 'Paid', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (paidAmount > 0) return { label: 'Partial', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'Unpaid', color: 'bg-rose-50 text-rose-600 border-rose-200' };
  }, [paidAmount, grandTotal]);

  const handleRecordPayment = useCallback(() => {
    if (!order || !onUpdateOrder || !paymentAmount) return;
    const newPaid = (order.paidAmount ?? 0) + Number(paymentAmount);
    const newStatus = newPaid >= grandTotal ? 'PAID' : 'PARTIAL';
    onUpdateOrder({
      ...order,
      paidAmount: newPaid,
      paymentStatus: newStatus,
      lastPaymentMode: paymentMode,
      lastPaymentRef: paymentRef,
      lastPaymentDate: paymentDate,
    });
    setPaymentSaved(true);
    setPaymentAmount('');
    setPaymentRef('');
    setTimeout(() => setPaymentSaved(false), 2500);
  }, [order, onUpdateOrder, paymentAmount, paymentMode, paymentRef, paymentDate, grandTotal]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownloadPDF = useCallback(async () => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210; const margin = 14;

    // Header
    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text(companyInfo?.name || 'TexFlow ERP', margin, 20);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(companyInfo?.address || '', margin, 26);
    doc.text(`GSTIN: ${companyGSTIN}`, margin, 30);

    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text('TAX INVOICE', W - margin, 20, { align: 'right' });
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`Invoice No: ${invoiceNo}`, W - margin, 26, { align: 'right' });
    doc.text(`Date: ${invoiceDate}`, W - margin, 31, { align: 'right' });

    doc.line(margin, 34, W - margin, 34);

    // Bill to
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', margin, 40);
    doc.setFont('helvetica', 'normal');
    doc.text(order?.customerName || '', margin, 45);
    if (customer?.address) doc.text(customer.address, margin, 50, { maxWidth: 80 });
    if (customerGSTIN) doc.text(`GSTIN: ${customerGSTIN}`, margin, 58);

    // GST mode
    doc.setFont('helvetica', 'bold');
    doc.text(gstMode === 'IGST' ? 'IGST Invoice (Interstate)' : 'CGST+SGST Invoice (Intrastate)', W - margin, 40, { align: 'right' });

    // Items table
    autoTable(doc, {
      startY: 65,
      head: [['#', 'Description', 'Qty', 'Unit Price', 'Amount']],
      body: (order?.items || []).map((i: any, idx: number) => [
        idx + 1, i.productName, i.quantity,
        `${currency}${formatINR(i.unitPrice)}`,
        `${currency}${formatINR(i.quantity * i.unitPrice)}`
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: margin, right: margin },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 6;

    // Tax summary
    const taxRows: [string, string][] = [
      ['Subtotal', `${currency}${formatINR(subtotal)}`],
    ];
    if (gstMode === 'IGST') taxRows.push([`IGST (${effectiveTaxRate}%)`, `${currency}${formatINR(igstAmt)}`]);
    else {
      taxRows.push([`CGST (${effectiveTaxRate / 2}%)`, `${currency}${formatINR(cgstAmt)}`]);
      taxRows.push([`SGST (${effectiveTaxRate / 2}%)`, `${currency}${formatINR(sgstAmt)}`]);
    }
    taxRows.push(['Grand Total', `${currency}${formatINR(grandTotal)}`]);

    autoTable(doc, {
      startY: finalY,
      body: taxRows,
      styles: { fontSize: 8 },
      columnStyles: { 0: { halign: 'right', fontStyle: 'bold' }, 1: { halign: 'right' } },
      margin: { left: W / 2, right: margin },
      tableWidth: W / 2 - margin,
    });

    const finalY2 = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(8);
    doc.text(`Amount in Words: ${amountInWords(grandTotal)}`, margin, finalY2);
    if (invoiceRemark) doc.text(`Remark: ${invoiceRemark}`, margin, finalY2 + 5);

    doc.save(`${invoiceNo}.pdf`);
  }, [order, customer, companyInfo, companyGSTIN, customerGSTIN, gstMode, subtotal, taxAmount, igstAmt, cgstAmt, sgstAmt, grandTotal, effectiveTaxRate, currency, invoiceNo, invoiceDate, invoiceRemark]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-bold text-slate-800 dark:text-white">Tax Invoice</span>
          <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${paymentStatusBadge.color}`}>{paymentStatusBadge.label}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none cursor-pointer"
            value={selectedOrderId}
            onChange={e => { setSelectedOrderId(e.target.value); setTaxRateOverride(null); }}
          >
            {orders.map(o => (
              <option key={o.id} value={o.id}>{o.id} – {o.customerName}</option>
            ))}
          </select>
          <select
            className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
            value={taxRateOverride !== null ? String(taxRateOverride) : String(order?.taxRate ?? 5)}
            onChange={e => setTaxRateOverride(Number(e.target.value))}
          >
            {[0, 3, 5, 12, 18, 28].map(r => <option key={r} value={r}>GST {r}%</option>)}
          </select>
          <button onClick={handleDownloadPDF} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors">
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
          <button onClick={handlePrint} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 hover:bg-slate-50 transition-colors">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          <button
            onClick={() => setShowPaymentPanel(p => !p)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <CreditCard className="w-3.5 h-3.5" /> Record Payment
            <ChevronDown className={`w-3 h-3 transition-transform ${showPaymentPanel ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Payment Panel */}
      {showPaymentPanel && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wide">Record Payment</span>
            <div className="flex gap-4 text-xs text-slate-500">
              <span>Grand Total: <strong className="text-slate-800 dark:text-white">{currency}{formatINR(grandTotal)}</strong></span>
              <span>Paid: <strong className="text-emerald-600">{currency}{formatINR(paidAmount)}</strong></span>
              <span>Outstanding: <strong className={outstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}>{currency}{formatINR(outstanding)}</strong></span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Mode</label>
              <select value={paymentMode} onChange={e => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 outline-none">
                {(['CASH','CHEQUE','NEFT','UPI','CREDIT'] as PaymentMode[]).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Amount</label>
              <input type="number" value={paymentAmount} placeholder={String(Math.round(outstanding))}
                onChange={e => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Ref / UTR / Cheque</label>
              <input type="text" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} placeholder="Reference no."
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Date</label>
              <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 outline-none focus:border-indigo-400" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleRecordPayment}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors">
              Save Payment
            </button>
            {paymentSaved && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>
        </div>
      )}

      {/* Invoice Body */}
      {!order ? (
        <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-500">No orders found.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-7 shadow-sm max-w-3xl mx-auto space-y-6 print:shadow-none print:border-none">
          {/* Invoice Header */}
          <div className="flex justify-between items-start gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex gap-3">
              {companyInfo?.logoUrl && (
                <img src={companyInfo.logoUrl} alt="logo" className="w-14 h-14 object-contain rounded-lg border border-slate-100" />
              )}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  {!companyInfo?.logoUrl && <Award className="w-4 h-4 text-indigo-600" />}
                  <span className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                    {companyInfo?.name || 'TexFlow ERP'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed max-w-xs">
                  {companyInfo?.address}<br />
                  GSTIN: <span className="font-mono font-semibold">{companyGSTIN || '—'}</span>
                  {companyInfo?.phone && <> · {companyInfo.phone}</>}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-1">Tax Invoice</p>
              <p className="font-mono text-sm font-black text-slate-800 dark:text-white">{invoiceNo}</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{invoiceDate}</p>
              <div className="mt-2 flex items-center justify-end gap-1.5">
                <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wide ${gstMode === 'IGST' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                  {gstMode === 'IGST' ? 'Interstate · IGST' : 'Intrastate · CGST+SGST'}
                </span>
              </div>
            </div>
          </div>

          {/* Bill To / Ship To */}
          <div className="grid grid-cols-2 gap-6 text-xs">
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-1.5">Bill To</p>
              <p className="font-bold text-slate-800 dark:text-white text-sm">{order.customerName}</p>
              {customer?.address && <p className="text-slate-500 mt-1 leading-relaxed">{customer.address}</p>}
              {customerGSTIN && <p className="font-mono text-slate-500 mt-1">GSTIN: <strong>{customerGSTIN}</strong></p>}
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-1.5">Invoice Details</p>
              <p className="text-slate-500">SO Ref: <strong className="text-slate-700 dark:text-slate-300">{order.id}</strong></p>
              {order.dueDate && <p className="text-slate-500 mt-0.5">Due: <strong className="text-slate-700 dark:text-slate-300">{order.dueDate}</strong></p>}
              {order.agentName && <p className="text-slate-500 mt-0.5">Agent: <strong className="text-slate-700 dark:text-slate-300">{order.agentName}</strong></p>}
            </div>
          </div>

          {/* Line Items */}
          <div className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/30 text-[9px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                  <th className="py-2.5 pl-3 w-8">#</th>
                  <th className="py-2.5 pl-2 w-8"></th>
                  <th className="py-2.5 pl-1">Description</th>
                  <th className="py-2.5 px-3 text-right w-16">Qty</th>
                  <th className="py-2.5 px-3 text-right w-24">Rate</th>
                  <th className="py-2.5 pr-4 text-right w-28">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {(order.items || []).map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-2.5 pl-3 text-slate-400 tabular-nums">{idx + 1}</td>
                    <td className="py-2 pl-2">
                      <ProductImageThumb productName={item.productName} designs={designs} inventory={inventory} size="sm" />
                    </td>
                    <td className="py-2.5 pl-1 font-semibold text-slate-700 dark:text-slate-200">{item.productName}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{item.quantity} {item.unit || 'pcs'}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">{currency}{formatINR(item.unitPrice)}</td>
                    <td className="py-2.5 pr-4 text-right font-mono font-bold tabular-nums text-slate-800 dark:text-white">
                      {currency}{formatINR(item.quantity * item.unitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tax Breakdown + Totals */}
          <div className="flex justify-end">
            <div className="w-72 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal (excl. tax)</span>
                <span className="font-mono tabular-nums">{currency}{formatINR(subtotal)}</span>
              </div>
              {gstMode === 'IGST' ? (
                <div className="flex justify-between text-slate-500">
                  <span>IGST @ {effectiveTaxRate}%</span>
                  <span className="font-mono tabular-nums">{currency}{formatINR(igstAmt)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-slate-500">
                    <span>CGST @ {effectiveTaxRate / 2}%</span>
                    <span className="font-mono tabular-nums">{currency}{formatINR(cgstAmt)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>SGST @ {effectiveTaxRate / 2}%</span>
                    <span className="font-mono tabular-nums">{currency}{formatINR(sgstAmt)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-sm font-black text-slate-900 dark:text-white">
                <span>Grand Total</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">{currency}{formatINR(grandTotal)}</span>
              </div>
              {paidAmount > 0 && (
                <>
                  <div className="flex justify-between text-slate-500">
                    <span>Paid</span>
                    <span className="font-mono tabular-nums text-emerald-600">−{currency}{formatINR(paidAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-700 dark:text-slate-200">
                    <span>Outstanding</span>
                    <span className={`font-mono tabular-nums ${outstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {currency}{formatINR(outstanding)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Amount in Words */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-lg px-4 py-2.5 text-[10px] text-slate-500">
            <span className="font-bold text-slate-700 dark:text-slate-300">Amount in Words: </span>
            {amountInWords(grandTotal)}
          </div>

          {/* Remark */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wide block mb-1">Invoice Remark / Terms</label>
            <textarea
              value={invoiceRemark}
              onChange={e => setInvoiceRemark(e.target.value)}
              rows={2}
              placeholder="Payment terms, bank details, or notes…"
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 outline-none focus:border-indigo-400 resize-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[9px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-600 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" /> GST Compliant Invoice
            </span>
            <span>This is a computer-generated document. No signature required.</span>
          </div>
        </div>
      )}
    </div>
  );
}
