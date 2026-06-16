import React, { useState, useMemo, useEffect } from 'react';
import { uuidShort } from "../utils/uuid";
import { Order, Customer, CompanyInfo, Design, InventoryItem } from '../types';
import { 
  Search, Plus, Filter, MoreHorizontal, ArrowLeft, Save, 
  Trash2, ChevronLeft, ChevronRight, FileText, Download, Printer 
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ProductImageThumb from './ProductImageThumb';

interface DeliveryChallanProps {
  orders: Order[];
  customers: Customer[];
  designs?: Design[];
  inventory?: InventoryItem[];
  initialOrderId?: string;
  onAddChallan: (order: Order) => void;
  onUpdateChallan: (order: Order) => void;
  onAction?: (action: string, data: any) => void;
  currency?: string;
  companyInfo?: CompanyInfo;
}

const DeliveryChallan: React.FC<DeliveryChallanProps> = ({ 
  orders, customers, designs = [], inventory = [], initialOrderId, onAddChallan, onUpdateChallan, onAction, currency = '₹', 
  companyInfo = { name: 'RAVI-TEXTILE', address: 'Surat, GJ', gstin: '', email: '', website: '', logoUrl: '' }
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'ITEMS' | 'SHIPPING'>('DETAILS');
  const [filter, setFilter] = useState('');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  
  const [formData, setFormData] = useState<Partial<Order & { bundles?: number, totalWeight?: number }>>({ 
    status: 'DRAFT', 
    items: [], 
    orderDate: new Date().toISOString().split('T')[0],
    transportName: '',
    vehicleNo: '',
    shippingAddress: '',
    bundles: 1,
    totalWeight: 0
  });

  // Auto-open new challan form pre-linked to a source order (e.g. from CONVERT_TO_DELIVERY_NOTE)
  useEffect(() => {
    if (initialOrderId && orders.length > 0) {
      const sourceOrder = orders.find(o => o.id === initialOrderId);
      if (sourceOrder) {
        setFormData({
          status: 'DRAFT',
          items: sourceOrder.items || [],
          orderDate: new Date().toISOString().split('T')[0],
          customerName: sourceOrder.customerName,
          shippingAddress: sourceOrder.shippingAddress || '',
          transportName: sourceOrder.transportName || '',
          vehicleNo: '',
          bundles: 1,
          totalWeight: 0,
        });
        setViewMode('FORM');
      }
    }
  }, [initialOrderId, orders]);

  const challans = useMemo(() => orders.filter(o => o.id?.startsWith('DC')), [orders]);

  const filteredChallans = useMemo(() => {
    const q = filter.toLowerCase();
    return challans.filter(c => 
        c.customerName.toLowerCase().includes(q) || 
        c.id.toLowerCase().includes(q) ||
        (c.transportName || '').toLowerCase().includes(q)
    );
  }, [challans, filter]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName) return;
    
    if (formData.id) {
       onUpdateChallan(formData as Order);
    } else {
       onAddChallan({
         ...formData,
         id: `DC-${uuidShort(12)}`,
         totalAmount: 0,
         updatedAt: new Date().toISOString()
       } as Order);
    }
    setViewMode('LIST');
  };

  const openForm = (c?: any) => {
     if(c) {
         setFormData(c);
     } else {
         setFormData({ status: 'DRAFT', items: [], orderDate: new Date().toISOString().split('T')[0], bundles: 1, totalWeight: 0 });
     }
     setViewMode('FORM');
  };

  const linkOrder = (orderId: string) => {
     const sourceOrder = orders.find(o => o.id === orderId);
     if(sourceOrder) {
        setFormData(prev => ({
           ...prev,
           customerName: sourceOrder.customerName,
           items: sourceOrder.items,
           shippingAddress: sourceOrder.shippingAddress || prev.shippingAddress || '',
           transportName: sourceOrder.transportName || prev.transportName || ''
        }));
     }
  };

  const generateDCPDF = (challan: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Check if we render logo in jsPDF (we don't strictly render image here to avoid CORS/format issues, but we format the text properly like Packing Slip). Actually, since `logoUrl` might be a base64 from settings, we could try to add it, but text header is enough for PDF. Wait, the user asked for logo: "add company logo like erpnext it requied in all like invoces, packing list like all with name addres". I will just add the formatting like PackingList. Let's do similar to what I did for PackingSlip.

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("DELIVERY NOTE", 15, 20);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Delivery Note: ${challan.id}`, 15, 27);
    doc.text(`Date: ${challan.orderDate}`, 15, 32);

    if (companyInfo.logoUrl) {
       try {
          const format = companyInfo.logoUrl.substring("data:image/".length, companyInfo.logoUrl.indexOf(";base64")).toUpperCase() || 'PNG';
          doc.addImage(companyInfo.logoUrl, format, pageWidth - 35, 10, 20, 20);
       } catch(e) {
          console.error("Could not add image to PDF", e);
       }
    }

    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(companyInfo.name.toUpperCase(), pageWidth - 15, companyInfo.logoUrl ? 35 : 20, { align: 'right' });
    doc.setFont("helvetica", "normal");
    doc.text(companyInfo.address || "", pageWidth - 15, companyInfo.logoUrl ? 40 : 25, { align: 'right' });
    if(companyInfo.gstin) {
       doc.text(`GSTIN: ${companyInfo.gstin}`, pageWidth - 15, companyInfo.logoUrl ? 45 : 30, { align: 'right' });
    }

    doc.setDrawColor(220);
    doc.line(15, companyInfo.logoUrl ? 50 : 40, pageWidth - 15, companyInfo.logoUrl ? 50 : 40);

    const nextY = companyInfo.logoUrl ? 60 : 50;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Customer Name:", 15, nextY);
    doc.setFont("helvetica", "normal");
    doc.text(challan.customerName, 15, nextY + 5);

    doc.setFont("helvetica", "bold");
    doc.text("Transporter:", 120, nextY);
    doc.setFont("helvetica", "normal");
    doc.text(challan.transportName || '', 120, nextY + 5);

    autoTable(doc, {
        startY: nextY + 20,
        head: [['Item Code', 'Item Name', 'Quantity', 'UOM']],
        body: (challan.items || []).map((it: any) => [
            it.productId || '',
            it.productName || '',
            it.quantity,
            it.unit || 'PCS'
        ]),
        theme: 'grid',
        headStyles: { fillColor: [248, 249, 250], textColor: [50, 50, 50], fontStyle: 'bold', lineWidth: 0.1 },
        styles: { fontSize: 8.5, cellPadding: 3, lineWidth: 0.1 }
    });

    doc.save(`${challan.id}.pdf`);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'COMPLETED' || status === 'SHIPPED') return <span className="bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Completed</span>
    if (status === 'DRAFT') return <span className="bg-[#fef2f2] text-[#ef4444] border border-[#fecaca] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Draft</span>
    return <span className="bg-[#f4f5f6] text-[#525c66] border border-[#d1d8dd] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">{status}</span>
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">
       {viewMode === 'LIST' ? (
          <div className="flex flex-col h-full animate-fade-in">
            {/* ─── LIST HEADER ─── */}
            <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
               <div className="flex justify-between items-center h-8">
                  <div className="flex items-center gap-3">
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Delivery Note</span>
                     <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filteredChallans.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => openForm()} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                        <Plus className="w-4 h-4" />
                        Add Delivery Note
                     </button>
                  </div>
               </div>
               
               {/* ─── FILTER BAR ─── */}
               <div className="flex justify-between items-center mt-3 h-8">
                  <div className="flex items-center gap-2">
                      <button className="h-7 px-2.5 flex items-center gap-1.5 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f6] rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                      <button className="h-7 px-2.5 flex items-center gap-1.5 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f6] rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm">
                        <Filter className="w-3.5 h-3.5" /> Filter
                      </button>
                      <div className="relative">
                         <input
                            type="text"
                            placeholder="Name or ID"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="h-7 w-[280px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] transition-all placeholder-[#8d99a6]"
                         />
                         <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[13px] text-[#525c66]">{filteredChallans.length > 0 ? `1 of ${filteredChallans.length}` : '0 of 0'}</span>
                     <div className="flex border border-[#d1d8dd] rounded overflow-hidden">
                        <button className="h-7 px-2 bg-white hover:bg-[#f4f5f6] text-[#1c2126] border-r border-[#d1d8dd]"><ChevronLeft className="w-4 h-4"/></button>
                        <button className="h-7 px-2 bg-white hover:bg-[#f4f5f6] text-[#1c2126]"><ChevronRight className="w-4 h-4"/></button>
                     </div>
                  </div>
               </div>
            </div>

            {/* ─── LIST BODY ─── */}
            <div className="flex-1 overflow-auto p-5 pb-10">
               <div className="bg-white border border-[#d1d8dd] rounded shadow-sm flex flex-col min-w-[800px]">
                  {/* Table Header */}
                  <div className="flex items-center border-b border-[#d1d8dd] bg-[#f4f5f6] px-4 py-2.5 text-xs text-[#525c66] select-none rounded-t">
                     <div className="w-10 flex">
                        <input type="checkbox" className="rounded-sm border-[#d1d8dd] text-[#2490ef] focus:ring-[#2490ef] bg-white w-3.5 h-3.5 cursor-pointer"/>
                     </div>
                     <div className="w-32"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">ID</span></div>
                     <div className="w-64"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Customer Name</span></div>
                     <div className="w-32"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Status</span></div>
                     <div className="w-32"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Date</span></div>
                     <div className="flex-1 min-w-0 pr-4"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Transporter</span></div>
                  </div>
                  
                  {/* Table Body */}
                  <div className="divide-y divide-[#d1d8dd]/60">
                     {filteredChallans.length === 0 && (
                        <div className="px-4 py-12 flex flex-col items-center justify-center text-[#525c66]">
                           <FileText className="w-8 h-8 text-[#d1d8dd] mb-3" />
                           <p className="text-[13px]">No delivery notes found.</p>
                        </div>
                     )}
                     {filteredChallans.map((challan) => (
                        <div key={challan.id} className="group flex items-center px-4 py-[9px] hover:bg-[#f4f5f6] transition-colors cursor-pointer text-[13px]" onClick={() => openForm(challan)}>
                           <div className="w-10" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={checkedIds.has(challan.id)}
                                onChange={(e) => {
                                   const newSet = new Set(checkedIds);
                                   if(e.target.checked) newSet.add(challan.id);
                                   else newSet.delete(challan.id);
                                   setCheckedIds(newSet);
                                }}
                                className="rounded-sm border-[#d1d8dd] text-[#2490ef] focus:ring-[#2490ef] bg-white w-3.5 h-3.5 cursor-pointer"
                              />
                           </div>
                           <div className="w-32 pr-2 font-medium">
                               <a className="font-semibold text-[#1c2126] group-hover:underline cursor-pointer select-none">
                                 {challan.id}
                               </a>
                           </div>
                           <div className="w-64 pr-4 truncate font-medium text-[#1c2126]">{challan.customerName}</div>
                           <div className="w-32">{getStatusBadge(challan.status)}</div>
                           <div className="w-32 text-[#525c66]">{challan.orderDate}</div>
                           <div className="flex-1 pr-4 truncate text-[#525c66]">{challan.transportName}</div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          </div>
       ) : (
          <div className="flex flex-col h-full animate-fade-in">
             {/* ─── FORM HEADER ─── */}
             <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
               <div className="flex justify-between items-center h-8">
                  <div className="flex items-center gap-3">
                     <button onClick={() => setViewMode('LIST')} className="h-7 w-7 flex items-center justify-center rounded hover:bg-[#f4f5f6] text-[#525c66] transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                     </button>
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight truncate max-w-lg">
                        {formData.id ? formData.id : 'New Delivery Note'}
                     </span>
                     {formData.id && getStatusBadge(formData.status || 'DRAFT')}
                  </div>
                  <div className="flex items-center gap-2">
                     {formData.id && formData.status === 'DELIVERED' && onAction && (
                       <button type="button" onClick={() => onAction('CONVERT_TO_INVOICE', formData)} className="h-7 px-3 flex items-center gap-1.5 bg-[#f4f5f6] hover:bg-[#e2e6ea] border border-[#d1d8dd] text-[#1c2126] rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-[#2490ef]/50">
                          Create Invoice
                       </button>
                     )}
                     <button type="button" onClick={() => setViewMode('LIST')} className="h-7 px-3 flex items-center gap-1.5 bg-white hover:bg-[#f4f5f6] border border-[#d1d8dd] rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm">
                        Cancel
                     </button>
                     <button onClick={handleCreate} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                        <Save className="w-3.5 h-3.5" />
                        Save
                     </button>
                  </div>
               </div>

               <div className="flex gap-6 border-b border-transparent overflow-x-auto no-scrollbar mt-4">
                  {[
                    { id: 'DETAILS', label: 'Details' },
                    { id: 'ITEMS', label: 'Items' },
                    { id: 'SHIPPING', label: 'Transportation' }
                  ].map(tab => (
                     <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`pb-3 text-[13px] font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-[#2490ef] text-[#1c2126]' : 'border-transparent text-[#525c66] hover:text-[#1c2126]'}`}
                     >
                        {tab.label}
                     </button>
                  ))}
               </div>
               
               {formData.id && (
                  <div className="flex justify-end items-center mt-3 h-8 text-[13px]">
                     <div className="flex items-center gap-1">
                           <button onClick={() => generateDCPDF(formData)} className="text-[#525c66] hover:text-[#1c2126] font-semibold px-2 py-1 rounded hover:bg-[#f4f5f6] transition-colors flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" /> Print</button>
                           <button className="text-[#525c66] hover:text-[#1c2126] font-semibold px-2 py-1 rounded hover:bg-[#f4f5f6] transition-colors">Menu</button>
                     </div>
                  </div>
               )}
             </div>

             {/* ─── FORM BODY ─── */}
             <div className="flex-1 overflow-auto p-5 pb-16 flex justify-center">
                 <form onSubmit={handleCreate} className="w-full max-w-[850px] space-y-4">
                     
                     {activeTab === 'DETAILS' && (
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Customer Details</h4>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Fetch from Order</label>
                                    <select 
                                      onChange={(e) => linkOrder(e.target.value)}
                                      className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                    >
                                        <option value="">Select Order...</option>
                                        {orders.filter(o => !o.id.startsWith('DC') && o.status !== 'DELIVERED').map(o => (
                                           <option key={o.id} value={o.id}>{o.id} - {o.customerName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Customer <span className="text-[#ef4444] ml-0.5">*</span></label>
                                    <input 
                                      value={formData.customerName || ''} 
                                      onChange={e => setFormData({...formData, customerName: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium"
                                    />
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Date</label>
                                    <input 
                                      type="date"
                                      value={formData.orderDate || ''} 
                                      onChange={e => setFormData({...formData, orderDate: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                    />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Status</label>
                                    <select 
                                       value={formData.status || 'DRAFT'} 
                                       onChange={e => setFormData({...formData, status: e.target.value as any})}
                                       className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium"
                                    >
                                        <option value="DRAFT">Draft</option>
                                        <option value="COMPLETED">Completed</option>
                                    </select>
                                </div>
                            </div>
                         </div>
                     </div>
                     )}

                     {activeTab === 'ITEMS' && (
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <div className="flex justify-between items-center border-b border-[#d1d8dd] pb-2 mb-5">
                             <h4 className="font-semibold text-sm text-[#1c2126]">Items</h4>
                         </div>
                         <table className="w-full text-left border-collapse">
                            <thead>
                               <tr className="bg-[#f4f5f6] text-[#525c66] border-y border-[#d1d8dd]">
                                  <th className="py-2 pl-3 font-medium text-xs">Item Name</th>
                                  <th className="py-2 px-3 font-medium text-xs">Quantity</th>
                                  <th className="py-2 pr-3"></th>
                               </tr>
                            </thead>
                            <tbody>
                               {formData.items?.map((it, idx) => (
                                  <tr key={(it as any).id || `item-${idx}`} className="border-b border-[#d1d8dd]/50">
                                     <td className="py-2 pl-3 text-[#1c2126] font-medium">
                                        <div className="flex items-center gap-3">
                                          <ProductImageThumb productName={it.productName} designs={designs} inventory={inventory} size="sm" />
                                          <span>{it.productName}</span>
                                        </div>
                                     </td>
                                     <td className="py-2 px-3 text-[#525c66]">{it.quantity} {it.unit}</td>
                                     <td className="py-2 pr-3 text-right">
                                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, items: prev.items?.filter((_, i) => i !== idx) }))} className="text-[#ef4444] hover:bg-[#fef2f2] p-1 rounded">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                     </td>
                                  </tr>
                               ))}
                               {(!formData.items || formData.items.length === 0) && (
                                   <tr>
                                       <td colSpan={3} className="py-6 text-center text-[#525c66]">No items integrated in this Delivery Note. Link an order above to populate.</td>
                                   </tr>
                               )}
                            </tbody>
                         </table>
                     </div>
                     )}

                     {activeTab === 'SHIPPING' && (
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Transportation</h4>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Transporter Name</label>
                                    <input 
                                      value={formData.transportName || ''} 
                                      onChange={e => setFormData({...formData, transportName: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium"
                                    />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Vehicle No</label>
                                    <input 
                                      value={formData.vehicleNo || ''} 
                                      onChange={e => setFormData({...formData, vehicleNo: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                    />
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Shipping Address</label>
                                    <textarea 
                                      rows={2}
                                      value={formData.shippingAddress || ''} 
                                      onChange={e => setFormData({...formData, shippingAddress: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                    />
                                </div>
                            </div>
                         </div>
                     </div>
                     )}

                     <button type="submit" className="hidden">Submit</button>
                 </form>
             </div>
          </div>
       )}
    </div>
  );
};

export default DeliveryChallan;
