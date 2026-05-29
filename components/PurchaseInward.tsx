import React, { useState, useMemo } from 'react';
import { InventoryItem, PurchaseOrder } from '../types';
import { 
  Search, Plus, Filter, MoreHorizontal, ArrowLeft, Save, 
  Trash2, ChevronLeft, ChevronRight, FileText, Printer, CheckCircle
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PurchaseInwardProps {
  purchaseOrders: PurchaseOrder[];
  inventory: InventoryItem[];
  onUpdateInventory: (item: InventoryItem) => void;
  onUpdatePO: (po: PurchaseOrder) => void;
  currency?: string;
}

const PurchaseInward: React.FC<PurchaseInwardProps> = ({ 
  purchaseOrders, inventory, onUpdateInventory, onUpdatePO, currency = '₹' 
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  
  const [selectedPOId, setSelectedPOId] = useState<string>('');
  
  const [formData, setFormData] = useState<Partial<PurchaseOrder>>({ 
    status: 'DRAFT', 
    items: [], 
    date: new Date().toISOString().split('T')[0],
  });

  // Only receipts (inwards) - let's identify "Purchase Receipts" by their status being "RECEIVED" from the POs.
  // In ERPNext, PR is a separate doctype. Here we are using POs with RECEIVED status or creating them as GRNs.
  const receipts = useMemo(() => purchaseOrders.filter(po => po.id?.startsWith('GRN') || po.status === 'RECEIVED'), [purchaseOrders]);
  const pendingPos = useMemo(() => purchaseOrders.filter(po => !po.id?.startsWith('GRN') && po.status !== 'RECEIVED' && po.status !== 'CANCELLED'), [purchaseOrders]);

  const filteredReceipts = useMemo(() => {
    const q = filter.toLowerCase();
    return receipts.filter(r => 
        r.supplierName.toLowerCase().includes(q) || 
        r.id.toLowerCase().includes(q)
    );
  }, [receipts, filter]);

  const openForm = (r?: any) => {
     if(r) {
         setFormData(r);
         setSelectedPOId('');
     } else {
         setFormData({ status: 'DRAFT', items: [], date: new Date().toISOString().split('T')[0], totalAmount: 0 });
         setSelectedPOId('');
     }
     setViewMode('FORM');
  };

  const linkPO = (poId: string) => {
     setSelectedPOId(poId);
     const sourcePO = purchaseOrders.find(o => o.id === poId);
     if(sourcePO) {
        setFormData({
           ...formData,
           supplierName: sourcePO.supplierName,
           supplierId: sourcePO.supplierId,
           items: sourcePO.items,
           totalAmount: sourcePO.totalAmount
        });
     }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierName || !formData.items?.length) return;
    
    const pr: PurchaseOrder = {
       ...formData,
       id: formData.id || `GRN-${Date.now().toString().slice(-4)}`,
       status: 'RECEIVED',
       updatedAt: new Date().toISOString()
    } as PurchaseOrder;

    if (formData.id) {
       onUpdatePO(pr);
    } else {
       onUpdatePO(pr); // Acts as add
       // Standard behavior: Mark original PO as received and update stock
       if (selectedPOId) {
          const originalPO = purchaseOrders.find(o => o.id === selectedPOId);
          if (originalPO) {
             onUpdatePO({ ...originalPO, status: 'RECEIVED', updatedAt: new Date().toISOString() });
          }
       }
       // Update inventory quantities
       pr.items.forEach(item => {
          const invItem = inventory.find(i => i.name === item.productName);
          if (invItem) {
             onUpdateInventory({
                ...invItem,
                quantity: invItem.quantity + item.quantity,
                updatedAt: new Date().toISOString()
             });
          }
       });
    }
    setViewMode('LIST');
  };

  const generatePDF = (r: any) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("PURCHASE RECEIPT", 15, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Receipt No: ${r.id}`, 15, 28);
    doc.text(`Date: ${r.date}`, 15, 33);
    doc.text(`Supplier: ${r.supplierName}`, 15, 38);
    
    autoTable(doc, {
        startY: 50,
        head: [['Item Name', 'Quantity', 'Rate', 'Amount']],
        body: r.items.map((it: any) => [
            it.productName,
            `${it.quantity} ${it.unit}`,
            `${currency}${it.unitPrice}`,
            `${currency}${it.quantity * it.unitPrice}`
        ]),
        theme: 'grid',
        headStyles: { fillColor: [248, 249, 250], textColor: [50, 50, 50], fontStyle: 'bold' }
    });
    
    doc.save(`${r.id}.pdf`);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'RECEIVED') return <span className="bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Completed</span>
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
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Purchase Receipt</span>
                     <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filteredReceipts.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => openForm()} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                        <Plus className="w-4 h-4" />
                        Add Purchase Receipt
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
                            placeholder="Supplier or ID"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="h-7 w-[280px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] transition-all placeholder-[#8d99a6]"
                         />
                         <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[13px] text-[#525c66]">{filteredReceipts.length > 0 ? `1 of ${filteredReceipts.length}` : '0 of 0'}</span>
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
                     <div className="w-64"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Supplier Name</span></div>
                     <div className="w-32"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Status</span></div>
                     <div className="w-32"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Date</span></div>
                     <div className="flex-1 min-w-0 pr-4 text-right"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Grand Total</span></div>
                  </div>
                  
                  {/* Table Body */}
                  <div className="divide-y divide-[#d1d8dd]/60">
                     {filteredReceipts.length === 0 && (
                        <div className="px-4 py-12 flex flex-col items-center justify-center text-[#525c66]">
                           <FileText className="w-8 h-8 text-[#d1d8dd] mb-3" />
                           <p className="text-[13px]">No purchase receipts found.</p>
                        </div>
                     )}
                     {filteredReceipts.map((r) => (
                        <div key={r.id} className="group flex items-center px-4 py-[9px] hover:bg-[#f4f5f6] transition-colors cursor-pointer text-[13px]" onClick={() => openForm(r)}>
                           <div className="w-10" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={checkedIds.has(r.id)}
                                onChange={(e) => {
                                   const newSet = new Set(checkedIds);
                                   if(e.target.checked) newSet.add(r.id);
                                   else newSet.delete(r.id);
                                   setCheckedIds(newSet);
                                }}
                                className="rounded-sm border-[#d1d8dd] text-[#2490ef] focus:ring-[#2490ef] bg-white w-3.5 h-3.5 cursor-pointer"
                              />
                           </div>
                           <div className="w-32 pr-2 font-medium">
                               <a className="font-semibold text-[#1c2126] group-hover:underline cursor-pointer select-none">
                                 {r.id}
                               </a>
                           </div>
                           <div className="w-64 pr-4 truncate font-medium text-[#1c2126]">{r.supplierName}</div>
                           <div className="w-32">{getStatusBadge(r.status)}</div>
                           <div className="w-32 text-[#525c66]">{r.date}</div>
                           <div className="flex-1 pr-4 truncate text-[#1c2126] text-right font-medium">{currency}{(r.totalAmount || 0).toLocaleString()}</div>
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
                        {formData.id ? formData.id : 'New Purchase Receipt'}
                     </span>
                     {formData.id && getStatusBadge(formData.status || 'DRAFT')}
                  </div>
                  <div className="flex items-center gap-2">
                     <button type="button" onClick={() => setViewMode('LIST')} className="h-7 px-3 flex items-center gap-1.5 bg-white hover:bg-[#f4f5f6] border border-[#d1d8dd] rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm">
                        Cancel
                     </button>
                     {(!formData.id || formData.status === 'DRAFT') && (
                        <button onClick={handleCreate} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                           <Save className="w-3.5 h-3.5" />
                           Save & Submit
                        </button>
                     )}
                  </div>
               </div>

               {formData.id && (
                  <div className="flex justify-between items-center mt-3 h-8 text-[13px]">
                     <div className="flex items-center gap-4 text-[#1c2126] font-medium">
                           <a className="hover:underline cursor-pointer opacity-80 border-b-2 border-transparent hover:border-[#1c2126] pb-1 transition-all">Details</a>
                           <a className="hover:underline cursor-pointer opacity-80 border-b-2 border-transparent hover:border-[#1c2126] pb-1 transition-all">Ledger</a>
                     </div>
                     <div className="flex items-center gap-1">
                           <button onClick={() => generatePDF(formData)} className="text-[#525c66] hover:text-[#1c2126] font-semibold px-2 py-1 rounded hover:bg-[#f4f5f6] transition-colors flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" /> Print</button>
                     </div>
                  </div>
               )}
             </div>

             {/* ─── FORM BODY ─── */}
             <div className="flex-1 overflow-auto p-5 pb-16 flex justify-center">
                 <form onSubmit={handleCreate} className="w-full max-w-[850px] space-y-4">
                     
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Supplier Details</h4>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            <div className="space-y-5">
                                {!formData.id && (
                                   <div className="space-y-1.5 flex flex-col border-b border-[#d1d8dd] pb-4">
                                       <label className="text-xs text-[#525c66] font-bold">Get Items from Purchase Order</label>
                                       <select 
                                         value={selectedPOId}
                                         onChange={(e) => linkPO(e.target.value)}
                                         className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                       >
                                           <option value="">Select PO...</option>
                                           {pendingPos.map(po => (
                                              <option key={po.id} value={po.id}>{po.id} - {po.supplierName}</option>
                                           ))}
                                       </select>
                                   </div>
                                )}
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Supplier <span className="text-[#ef4444] ml-0.5">*</span></label>
                                    <input 
                                      value={formData.supplierName || ''} 
                                      onChange={e => setFormData({...formData, supplierName: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium"
                                      disabled={!!formData.id}
                                    />
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Date</label>
                                    <input 
                                      type="date"
                                      value={formData.date || ''} 
                                      onChange={e => setFormData({...formData, date: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                      disabled={!!formData.id}
                                    />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Status</label>
                                    <select 
                                       value={formData.status || 'DRAFT'} 
                                       onChange={e => setFormData({...formData, status: e.target.value as any})}
                                       className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium"
                                       disabled
                                    >
                                        <option value="DRAFT">Draft</option>
                                        <option value="RECEIVED">Completed</option>
                                    </select>
                                </div>
                            </div>
                         </div>
                     </div>

                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <div className="flex justify-between items-center border-b border-[#d1d8dd] pb-2 mb-5">
                             <h4 className="font-semibold text-sm text-[#1c2126]">Items</h4>
                         </div>
                         <table className="w-full text-left border-collapse">
                            <thead>
                               <tr className="bg-[#f4f5f6] text-[#525c66] border-y border-[#d1d8dd]">
                                  <th className="py-2 pl-3 font-medium text-xs">Item Name</th>
                                  <th className="py-2 px-3 font-medium text-xs text-right">Accepted Qty</th>
                                  <th className="py-2 px-3 font-medium text-xs text-right">Rate</th>
                                  <th className="py-2 px-3 font-medium text-xs text-right">Amount</th>
                                  <th className="py-2 pr-3"></th>
                               </tr>
                            </thead>
                            <tbody>
                               {formData.items?.map((it, idx) => (
                                  <tr key={idx} className="border-b border-[#d1d8dd]/50">
                                     <td className="py-2 pl-3 text-[#1c2126] font-medium">{it.productName}</td>
                                     <td className="py-2 px-3 text-[#1c2126] tabular-nums text-right">
                                        <input 
                                           disabled={!!formData.id}
                                           type="number" 
                                           value={it.quantity} 
                                           onChange={e => {
                                              const qty = Number(e.target.value);
                                              const items = [...(formData.items || [])];
                                              items[idx].quantity = qty;
                                              const t = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
                                              setFormData({...formData, items: items, totalAmount: t});
                                           }}
                                           className="w-20 px-2 py-1 bg-transparent border border-transparent hover:border-[#d1d8dd] focus:border-[#2490ef] rounded outline-none text-right" 
                                        />
                                        <span className="text-[#525c66] ml-1">{it.unit}</span>
                                     </td>
                                     <td className="py-2 px-3 text-[#525c66] tabular-nums text-right">{currency}{it.unitPrice}</td>
                                     <td className="py-2 px-3 text-[#1c2126] font-medium tabular-nums text-right">{currency}{(it.quantity * it.unitPrice).toLocaleString()}</td>
                                     <td className="py-2 pr-3 text-right">
                                        {!formData.id && (
                                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, items: prev.items?.filter((_, i) => i !== idx) }))} className="text-[#ef4444] hover:bg-[#fef2f2] p-1 rounded">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                     </td>
                                  </tr>
                               ))}
                               {(!formData.items || formData.items.length === 0) && (
                                   <tr>
                                       <td colSpan={5} className="py-6 text-center text-[#525c66]">No receipt items listed. Connect to a PO above.</td>
                                   </tr>
                               )}
                            </tbody>
                         </table>
                         <div className="pt-4 flex justify-end">
                            <div className="w-64 space-y-2">
                               <div className="flex justify-between text-sm font-bold border-t border-[#d1d8dd] pt-2 text-[#1c2126]">
                                   <span>Grand Total</span>
                                   <span>{currency}{(formData.totalAmount || 0).toLocaleString()}</span>
                               </div>
                            </div>
                         </div>
                     </div>
                 </form>
             </div>
          </div>
       )}
    </div>
  );
};

export default PurchaseInward;
