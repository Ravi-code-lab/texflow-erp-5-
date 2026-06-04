
import React, { useState, useEffect } from 'react';
import { Order, Customer, Design, InventoryItem } from '../types';
import { User, MapPin, CreditCard, FileText, Phone, Mail, Printer, Share2, Calendar, Package, Box, Sparkles } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import BaseModal from './BaseModal';
import ProductImageThumb from './ProductImageThumb';

interface OrderDetailsModalProps {
  order: Order;
  customer?: Customer;
  onClose: () => void;
  currency?: string;
  designs?: Design[];
  inventory?: InventoryItem[];
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ order, customer, onClose, currency = '₹', designs = [], inventory = [] }) => {
  const [customFields, setCustomFields] = useState<any[]>([]);

  useEffect(() => {
    let raw: string | null = null;
    try { raw = localStorage.getItem('erpnext_custom_fields'); } catch {}
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setCustomFields(parsed.filter((f: any) => f.docType === 'Order'));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);
  
  const generateInvoice = () => {
    const doc = new jsPDF();
    
    // Header Strip
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 5, 'F');

    doc.setFontSize(28);
    doc.setTextColor(0);
    doc.text("INVOICE", 14, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Invoice #: ${order.id}`, 14, 32);
    doc.text(`Date: ${order.orderDate}`, 14, 37);

    // Company Logo/Text
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229);
    doc.text("Ravi-Textile", 140, 25);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Surat, Gujarat, India", 140, 30);
    doc.text("GSTIN: 24ABCDE1234", 140, 35);

    // Bill To
    doc.setDrawColor(230);
    doc.line(14, 45, 196, 45);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text("BILL TO", 14, 55);
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(customer?.name || order.customerName, 14, 62);
    if(customer?.address) {
        doc.setFontSize(9);
        doc.setTextColor(100);
        const splitAddr = doc.splitTextToSize(customer.address, 80);
        doc.text(splitAddr, 14, 68);
    }

    // Table
    autoTable(doc, {
      startY: 90,
      head: [["Item Description", "Qty", "Price", "Amount"]],
      body: (order.items || []).map(item => [
          item.productName,
          item.quantity,
          `${currency}${item.unitPrice}`,
          `${currency}${(item.quantity * item.unitPrice).toFixed(2)}`
      ]),
      theme: 'plain',
      headStyles: { fillColor: [245, 247, 255], textColor: [79, 70, 229], fontStyle: 'bold' },
      styles: { cellPadding: 4, fontSize: 10 },
      columnStyles: { 3: { halign: 'right' }, 2: { halign: 'right' } }
    });

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    
    const subTotal = (order.items || []).reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    
    doc.text("Subtotal:", 140, finalY);
    doc.text(`${currency}${subTotal.toFixed(2)}`, 190, finalY, { align: 'right' });
    
    if(order.taxRate) {
        doc.text(`Tax (${order.taxRate}%):`, 140, finalY + 6);
        doc.text(`${currency}${(subTotal * order.taxRate/100).toFixed(2)}`, 190, finalY + 6, { align: 'right' });
    }
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text("Total:", 140, finalY + 14);
    doc.text(`${currency}${order.totalAmount.toFixed(2)}`, 190, finalY + 14, { align: 'right' });

    // Footer terms
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Thank you for your business!", 14, 280);
    
    doc.save(`Invoice_${order.id}.pdf`);
  };

  const generatePackingList = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(50, 50, 50);
    doc.text("PACKING LIST", 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Order #: ${order.id}`, 14, 35);
    doc.text(`Dispatch Date: ${new Date().toLocaleDateString()}`, 14, 40);
    
    doc.text("Ship To:", 14, 55);
    doc.setFont("helvetica", "bold");
    doc.text(customer?.name || order.customerName, 14, 60);
    doc.setFont("helvetica", "normal");
    
    // Simulate Address splitting
    const splitAddr = doc.splitTextToSize(order.shippingAddress || customer?.address || '', 80);
    doc.text(splitAddr, 14, 65);

    const tableColumn = ["Item Description", "SKU / Code", "Ordered Qty", "Shipped Qty", "Box #"];
    const tableRows = (order.items || []).map((item, i) => [
        item.productName, 
        `SKU-${1000+i}`, // Mock SKU
        `${item.quantity} ${item.unit}`,
        `________`, // Space for manual check
        `________`  // Space for box number
    ]);

    autoTable(doc, {
      startY: 85,
      head: [tableColumn],
      body: tableRows,
      theme: 'plain',
      headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold' },
      styles: { cellPadding: 3, fontSize: 10 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.text("Prepared By: _________________", 14, finalY);
    doc.text("Verified By: _________________", 140, finalY);

    doc.save(`PackingList_${order.id}.pdf`);
  };

  const shareOnWhatsApp = () => {
      const message = `Hello ${order.customerName},\nYour Order *#${order.id}* is *${order.status}*.\nAmount: ${currency}${order.totalAmount}.\n\n- Ravi-Textile`;
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <BaseModal isOpen={true} onClose={onClose} title="Order Document" size="xl">
      <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Main Document Area */}
          <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-8 relative overflow-hidden">
             {/* Decorative Top Border */}
             <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
             
             {/* Header */}
             <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
                <div>
                   <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">INVOICE</h1>
                   <p className="text-slate-500 mt-1 font-mono text-xs sm:text-sm">#{order.id}</p>
                </div>
                <div className="sm:text-right">
                   <h3 className="font-bold text-slate-700 text-base sm:text-lg">Ravi-Textile</h3>
                   <p className="text-[10px] sm:text-xs text-slate-500">Surat, Gujarat</p>
                   <p className="text-[10px] sm:text-xs text-slate-500">GST: 24ABCDE1234</p>
                </div>
             </div>

             {/* Bill To / Ship To */}
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-8 pb-8 border-b border-slate-100">
                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Bill To</p>
                   <h4 className="font-bold text-slate-800 text-base sm:text-lg">{customer?.name || order.customerName}</h4>
                   <p className="text-xs sm:text-sm text-slate-500 mt-1">{customer?.address || 'No registered address'}</p>
                   <div className="mt-3 space-y-1">
                      {customer?.email && <p className="text-[10px] sm:text-xs text-slate-500 flex items-center gap-2"><Mail className="w-3 h-3"/> {customer.email}</p>}
                      {customer?.phone && <p className="text-[10px] sm:text-xs text-slate-500 flex items-center gap-2"><Phone className="w-3 h-3"/> {customer.phone}</p>}
                   </div>
                </div>
                <div className="sm:text-right">
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Date</p>
                         <p className="text-xs sm:text-sm font-medium text-slate-700">{order.orderDate}</p>
                      </div>
                      <div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Due Date</p>
                         <p className="text-xs sm:text-sm font-medium text-slate-700">{order.dueDate || '-'}</p>
                      </div>
                      <div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Agent</p>
                         <p className="text-xs sm:text-sm font-medium text-slate-700">{order.agentName || 'Direct'}</p>
                      </div>
                      <div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Payment</p>
                         <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {order.paymentStatus}
                         </span>
                      </div>
                   </div>
                </div>
             </div>

             {/* Dynamic ERPNext Fields in Invoice Details */}
             {customFields.some((f: any) => (order as any)[f.key]) && (
                <div className="mb-6 p-4 bg-indigo-50/20 dark:bg-slate-900/40 rounded-lg border border-indigo-100/35 dark:border-slate-850 flex flex-wrap gap-x-8 gap-y-2 text-[11px]">
                   <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-extrabold uppercase tracking-wider w-full mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> ERPNext Spec Columns
                   </div>
                   {customFields.map((f: any) => (order as any)[f.key] && (
                      <div key={f.id} className="flex gap-2">
                         <span className="font-bold text-slate-400 uppercase">{f.label}:</span>
                         <span className="font-extrabold text-slate-700 dark:text-slate-200 uppercase">{(order as any)[f.key]}</span>
                      </div>
                   ))}
                </div>
             )}

             {/* Items Table */}
             <div className="mb-8 overflow-x-auto">
                <table className="w-full text-left min-w-[500px]">
                   <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold">
                      <tr>
                         <th className="py-3 px-4 rounded-l-lg">Item Description</th>
                         <th className="py-3 px-4 text-center">Qty</th>
                         <th className="py-3 px-4 text-right">Price</th>
                         <th className="py-3 px-4 rounded-r-lg text-right">Total</th>
                      </tr>
                   </thead>
                   <tbody className="text-xs sm:text-sm">
                      {(order.items || []).map((item, idx) => (
                         <tr key={idx} className="border-b border-slate-50 last:border-0">
                            <td className="py-4 px-4 font-medium text-slate-700">
                              <div className="flex items-center gap-3">
                                <ProductImageThumb productName={item.productName} designs={designs} inventory={inventory} size="sm" />
                                <span>{item.productName}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center text-slate-600">{item.quantity} {item.unit}</td>
                            <td className="py-4 px-4 text-right text-slate-600">{currency}{item.unitPrice}</td>
                            <td className="py-4 px-4 text-right font-bold text-slate-800">{currency}{item.quantity * item.unitPrice}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>

             {/* Total */}
             <div className="flex justify-end">
                <div className="w-full sm:w-64 space-y-3">
                   <div className="flex justify-between text-xs sm:text-sm text-slate-500">
                      <span>Subtotal</span>
                      <span>{currency}{order.totalAmount}</span>
                   </div>
                   {order.taxRate && (
                      <div className="flex justify-between text-xs sm:text-sm text-slate-500">
                         <span>Tax ({order.taxRate}%)</span>
                         <span>+{currency}{(order.totalAmount * order.taxRate/100).toFixed(2)}</span>
                      </div>
                   )}
                   <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                      <span className="font-bold text-slate-800 text-base sm:text-lg">Total</span>
                      <span className="font-bold text-indigo-600 text-xl sm:text-2xl">{currency}{order.totalAmount}</span>
                   </div>
                </div>
             </div>
          </div>

          {/* Sidebar Actions */}
          <div className="w-full lg:w-72 flex flex-col gap-4">
             <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><FileText className="w-4 h-4"/> Actions</h4>
                <button 
                  onClick={generateInvoice}
                  className="w-full bg-white border border-slate-300 text-slate-700 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 mb-3 shadow-sm"
                >
                   <Printer className="w-4 h-4"/> Download Invoice
                </button>
                <button 
                  onClick={generatePackingList}
                  className="w-full bg-white border border-slate-300 text-slate-700 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 mb-3 shadow-sm"
                >
                   <Box className="w-4 h-4"/> Packing List
                </button>
                <button 
                  onClick={shareOnWhatsApp}
                  className="w-full bg-green-500 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-green-600 transition-colors flex items-center justify-center gap-2 shadow-md shadow-green-200"
                >
                   <Share2 className="w-4 h-4"/> Share WhatsApp
                </button>
             </div>

             <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex-1">
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><MapPin className="w-4 h-4"/> Shipment</h4>
                <div className="relative pl-4 border-l-2 border-slate-200 space-y-6">
                   <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
                      <p className="text-xs font-bold text-slate-700">Order Placed</p>
                      <p className="text-[10px] text-slate-400">{order.orderDate}</p>
                   </div>
                   <div className="relative">
                      <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white shadow-sm ${['SHIPPED', 'DELIVERED'].includes(order.status) ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                      <p className={`text-xs font-bold ${['SHIPPED', 'DELIVERED'].includes(order.status) ? 'text-slate-700' : 'text-slate-400'}`}>Dispatched</p>
                   </div>
                   <div className="relative">
                      <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white shadow-sm ${order.status === 'DELIVERED' ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
                      <p className={`text-xs font-bold ${order.status === 'DELIVERED' ? 'text-slate-700' : 'text-slate-400'}`}>Delivered</p>
                   </div>
                </div>
                {order.shippingAddress && (
                   <div className="mt-6 p-3 bg-white rounded border border-slate-100 text-xs text-slate-500">
                      <p className="font-bold mb-1 text-slate-700">Destination:</p>
                      {order.shippingAddress}
                   </div>
                )}
             </div>
          </div>
      </div>
    </BaseModal>
  );
};

export default OrderDetailsModal;
