import React, { useState, useMemo } from 'react';
import { uuidShort } from "../utils/uuid";
import { PackingSlip, Order, Customer } from '../types';
import { 
  Search, Plus, Filter, MoreHorizontal, ArrowLeft, Save, 
  Trash2, ChevronLeft, ChevronRight, FileText, Printer, Box
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PackingSlipProps {
  slips: PackingSlip[];
  orders: Order[]; // to select Delivery Notes
  onAddSlip: (slip: PackingSlip) => void;
  onUpdateSlip: (slip: PackingSlip) => void;
  companyInfo?: any;
}

const PackingList: React.FC<PackingSlipProps> = ({ 
  slips, orders, onAddSlip, onUpdateSlip, companyInfo 
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  
  const [formData, setFormData] = useState<Partial<PackingSlip>>({ 
    items: [], 
    date: new Date().toISOString().split('T')[0],
    fromPackageNo: 1,
    toPackageNo: 1
  });

  const deliveryNotes = useMemo(() => orders.filter(o => o.id?.startsWith('DC')), [orders]);

  const filteredSlips = useMemo(() => {
    const q = filter.toLowerCase();
    return slips.filter(c => 
        c.customerName?.toLowerCase()?.includes(q) || 
        c.id?.toLowerCase()?.includes(q) ||
        c.deliveryNoteId?.toLowerCase()?.includes(q)
    );
  }, [slips, filter]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.deliveryNoteId || !formData.customerName) return;
    
    if (formData.id) {
       onUpdateSlip(formData as PackingSlip);
    } else {
       onAddSlip({
         ...formData,
         id: `PS-${uuidShort(12)}`,
         updatedAt: new Date().toISOString()
       } as PackingSlip);
    }
    setViewMode('LIST');
  };

  const openForm = (c?: any) => {
     if(c) {
         setFormData(c);
     } else {
         setFormData({ items: [], date: new Date().toISOString().split('T')[0], fromPackageNo: 1, toPackageNo: 1 });
     }
     setViewMode('FORM');
  };

  const linkDeliveryNote = (dcId: string) => {
     const sourceNote = orders.find(o => o.id === dcId);
     if(sourceNote) {
        setFormData(prev => ({
           ...prev,
           deliveryNoteId: dcId,
           customerName: sourceNote.customerName,
           // Initially prefill items from Delivery Note, user can remove what they don't pack
           items: sourceNote.items?.map(it => ({
               productName: it.productName,
               quantity: it.quantity,
               unit: it.unit || 'PCS'
           })) || []
        }));
     }
  };

  const generatePDF = (slip: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    if (companyInfo) {
       let startY = 15;
       if (companyInfo.logoUrl) {
          try {
             // Extract MIME type from base64 to determine format, fallback to PNG
             const format = companyInfo.logoUrl.substring("data:image/".length, companyInfo.logoUrl.indexOf(";base64")).toUpperCase() || 'PNG';
             doc.addImage(companyInfo.logoUrl, format, 15, 10, 20, 20);
             startY = 35;
          } catch(e) {
             console.error("Could not add image to PDF", e);
             startY = 15;
          }
       }
       doc.setFontSize(16);
       doc.setFont("helvetica", "bold");
       doc.text(companyInfo.name?.toUpperCase() || '', 15, startY + 5);
       doc.setFontSize(9);
       doc.setFont("helvetica", "normal");
       doc.text(companyInfo.address || '', 15, startY + 10);
       doc.text(`GSTIN: ${companyInfo.gstin || ''}`, 15, startY + 15);
    }
    
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("PACKING SLIP", 15, 45);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Slip ID: ${slip.id}`, 15, 52);
    doc.text(`Date: ${slip.date}`, 15, 57);

    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("DELIVERY DETAILS", pageWidth - 15, 45, { align: 'right' });
    doc.setFont("helvetica", "normal");
    doc.text(`Delivery Note: ${slip.deliveryNoteId}`, pageWidth - 15, 50, { align: 'right' });
    doc.text(`Package No: ${slip.fromPackageNo} to ${slip.toPackageNo}`, pageWidth - 15, 55, { align: 'right' });

    doc.setDrawColor(220);
    doc.line(15, 65, pageWidth - 15, 65);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Customer:", 15, 75);
    doc.setFont("helvetica", "normal");
    doc.text(slip.customerName || '', 15, 80);

    doc.setFont("helvetica", "bold");
    doc.text("Weight Information:", 120, 75);
    doc.setFont("helvetica", "normal");
    doc.text(`Net: ${slip.netWeight || 0} kg | Gross: ${slip.grossWeight || 0} kg`, 120, 80);

    autoTable(doc, {
        startY: 95,
        head: [['S.No.', 'Item Name', 'Quantity', 'UOM', 'Net Wt (kg)', 'Gross Wt (kg)']],
        body: (slip.items || []).map((it: any, index: number) => [
            index + 1,
            it.productName || '',
            it.quantity,
            it.unit || 'PCS',
            it.netWeight || '',
            it.grossWeight || ''
        ]),
        theme: 'grid',
        headStyles: { fillColor: [248, 249, 250], textColor: [50, 50, 50], fontStyle: 'bold', lineWidth: 0.1 },
        styles: { fontSize: 8.5, cellPadding: 3, lineWidth: 0.1 }
    });

    doc.save(`${slip.id}.pdf`);
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">
       {viewMode === 'LIST' ? (
          <div className="flex flex-col h-full animate-fade-in">
            {/* ─── LIST HEADER ─── */}
            <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
               <div className="flex justify-between items-center h-8">
                  <div className="flex items-center gap-3">
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Packing Slips</span>
                     <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filteredSlips.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => openForm()} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                        <Plus className="w-4 h-4" />
                        Add Packing Slip
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
                            placeholder="Slip ID, DN or Customer"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="h-7 w-[280px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] transition-all placeholder-[#8d99a6]"
                         />
                         <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[13px] text-[#525c66]">{filteredSlips.length > 0 ? `1 of ${filteredSlips.length}` : '0 of 0'}</span>
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
                     <div className="w-32"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Date</span></div>
                     <div className="w-48"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Linked DN</span></div>
                     <div className="w-64"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Customer</span></div>
                     <div className="flex-1 min-w-0 pr-4"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Packages</span></div>
                  </div>
                  
                  {/* Table Body */}
                  <div className="divide-y divide-[#d1d8dd]/60">
                     {filteredSlips.length === 0 && (
                        <div className="px-4 py-12 flex flex-col items-center justify-center text-[#525c66]">
                           <Box className="w-8 h-8 text-[#d1d8dd] mb-3" />
                           <p className="text-[13px]">No packing slips found.</p>
                        </div>
                     )}
                     {filteredSlips.map((slip) => (
                        <div key={slip.id} className="group flex items-center px-4 py-[9px] hover:bg-[#f4f5f6] transition-colors cursor-pointer text-[13px]" onClick={() => openForm(slip)}>
                           <div className="w-10" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={checkedIds.has(slip.id)}
                                onChange={(e) => {
                                   const newSet = new Set(checkedIds);
                                   if(e.target.checked) newSet.add(slip.id);
                                   else newSet.delete(slip.id);
                                   setCheckedIds(newSet);
                                }}
                                className="rounded-sm border-[#d1d8dd] text-[#2490ef] focus:ring-[#2490ef] bg-white w-3.5 h-3.5 cursor-pointer"
                              />
                           </div>
                           <div className="w-32 pr-2 font-medium">
                               <a className="font-semibold text-[#1c2126] group-hover:underline cursor-pointer select-none">
                                 {slip.id}
                               </a>
                           </div>
                           <div className="w-32 text-[#525c66]">{slip.date}</div>
                           <div className="w-48 pr-4 font-medium text-[#2490ef]">{slip.deliveryNoteId}</div>
                           <div className="w-64 pr-4 truncate font-medium text-[#1c2126]">{slip.customerName}</div>
                           <div className="flex-1 pr-4 truncate text-[#525c66]">{slip.fromPackageNo} to {slip.toPackageNo}</div>
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
                        {formData.id ? formData.id : 'New Packing Slip'}
                     </span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button type="button" onClick={() => setViewMode('LIST')} className="h-7 px-3 flex items-center gap-1.5 bg-white hover:bg-[#f4f5f6] border border-[#d1d8dd] rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm">
                        Cancel
                     </button>
                     <button onClick={handleCreate} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                        <Save className="w-3.5 h-3.5" />
                        Save
                     </button>
                  </div>
               </div>
               
               {formData.id && (
                  <div className="flex justify-start items-center mt-3 h-8 text-[13px]">
                     <div className="flex items-center gap-1">
                           <button type="button" onClick={() => generatePDF(formData)} className="text-[#525c66] hover:text-[#1c2126] font-semibold px-2 py-1 rounded hover:bg-[#f4f5f6] transition-colors flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" /> Print</button>
                           <button type="button" className="text-[#525c66] hover:text-[#1c2126] font-semibold px-2 py-1 rounded hover:bg-[#f4f5f6] transition-colors">Menu</button>
                     </div>
                  </div>
               )}
             </div>

             {/* ─── FORM BODY ─── */}
             <div className="flex-1 overflow-auto p-5 pb-16 flex justify-center">
                 <form onSubmit={handleCreate} className="w-full max-w-[850px] space-y-4">
                     
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Reference & Master Details</h4>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Delivery Note <span className="text-[#ef4444] ml-0.5">*</span></label>
                                    <select 
                                      value={formData.deliveryNoteId || ''}
                                      onChange={(e) => linkDeliveryNote(e.target.value)}
                                      className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium"
                                      required
                                    >
                                        <option value="">Select Delivery Note...</option>
                                        {deliveryNotes.map(o => (
                                           <option key={o.id} value={o.id}>{o.id} - {o.customerName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Customer</label>
                                    <input 
                                      value={formData.customerName || ''} 
                                      readOnly
                                      className="w-full px-2.5 py-[5px] bg-[#f4f5f6] border border-[#d1d8dd] rounded text-[#525c66] cursor-not-allowed font-medium"
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
                                    />
                                </div>
                            </div>
                         </div>
                     </div>

                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            <div className="space-y-5">
                                <div className="flex gap-4">
                                    <div className="space-y-1.5 flex flex-col flex-1">
                                        <label className="text-xs text-[#525c66]">From Package No.</label>
                                        <input 
                                          type="number"
                                          value={formData.fromPackageNo || ''} 
                                          onChange={e => setFormData({...formData, fromPackageNo: Number(e.target.value)})}
                                          className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                        />
                                    </div>
                                    <div className="space-y-1.5 flex flex-col flex-1">
                                        <label className="text-xs text-[#525c66]">To Package No.</label>
                                        <input 
                                          type="number"
                                          value={formData.toPackageNo || ''} 
                                          onChange={e => setFormData({...formData, toPackageNo: Number(e.target.value)})}
                                          className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div className="flex gap-4">
                                    <div className="space-y-1.5 flex flex-col flex-1">
                                        <label className="text-xs text-[#525c66]">Net Weight (kg)</label>
                                        <input 
                                          type="number"
                                          step="0.01"
                                          value={formData.netWeight || ''} 
                                          onChange={e => setFormData({...formData, netWeight: Number(e.target.value)})}
                                          className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                        />
                                    </div>
                                    <div className="space-y-1.5 flex flex-col flex-1">
                                        <label className="text-xs text-[#525c66]">Gross Weight (kg)</label>
                                        <input 
                                          type="number"
                                          step="0.01"
                                          value={formData.grossWeight || ''} 
                                          onChange={e => setFormData({...formData, grossWeight: Number(e.target.value)})}
                                          className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                        />
                                    </div>
                                </div>
                            </div>
                         </div>
                     </div>

                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <div className="flex justify-between items-center border-b border-[#d1d8dd] pb-2 mb-5">
                             <h4 className="font-semibold text-sm text-[#1c2126]">Items in Packages</h4>
                         </div>
                         <table className="w-full text-left border-collapse">
                            <thead>
                               <tr className="bg-[#f4f5f6] text-[#525c66] border-y border-[#d1d8dd]">
                                  <th className="py-2 pl-3 font-medium text-xs">Item Name</th>
                                  <th className="py-2 px-3 font-medium text-xs w-28">Quantity</th>
                                  <th className="py-2 px-3 font-medium text-xs w-28">Net Wt (kg)</th>
                                  <th className="py-2 px-3 font-medium text-xs w-28">Gross Wt (kg)</th>
                                  <th className="py-2 pr-3"></th>
                               </tr>
                            </thead>
                            <tbody>
                               {formData.items?.map((it, idx) => (
                                  <tr key={idx} className="border-b border-[#d1d8dd]/50 hover:bg-[#fdfdfd]">
                                     <td className="py-2 pl-3 text-[#1c2126]">
                                        <input 
                                          className="w-full bg-transparent outline-none font-medium text-[#1c2126]" 
                                          value={it.productName}
                                          onChange={e => {
                                              const newItems = [...(formData.items || [])];
                                              newItems[idx] = { ...it, productName: e.target.value };
                                              setFormData({...formData, items: newItems});
                                          }}
                                          placeholder="Item Description"
                                        />
                                     </td>
                                     <td className="py-2 px-3 border-l border-[#d1d8dd]/50">
                                         <input 
                                           type="number" 
                                           className="w-full bg-transparent outline-none text-[#525c66]" 
                                           value={it.quantity}
                                           onChange={e => {
                                               const newItems = [...(formData.items || [])];
                                               newItems[idx] = { ...it, quantity: Number(e.target.value) };
                                               setFormData({...formData, items: newItems});
                                           }}
                                         />
                                     </td>
                                     <td className="py-2 px-3 border-l border-[#d1d8dd]/50">
                                         <input 
                                           type="number" 
                                           step="0.01"
                                           className="w-full bg-transparent outline-none text-[#525c66]" 
                                           value={it.netWeight || ''}
                                           onChange={e => {
                                               const newItems = [...(formData.items || [])];
                                               newItems[idx] = { ...it, netWeight: Number(e.target.value) };
                                               setFormData({...formData, items: newItems});
                                           }}
                                         />
                                     </td>
                                     <td className="py-2 px-3 border-l border-[#d1d8dd]/50">
                                         <input 
                                           type="number" 
                                           step="0.01"
                                           className="w-full bg-transparent outline-none text-[#525c66]" 
                                           value={it.grossWeight || ''}
                                           onChange={e => {
                                               const newItems = [...(formData.items || [])];
                                               newItems[idx] = { ...it, grossWeight: Number(e.target.value) };
                                               setFormData({...formData, items: newItems});
                                           }}
                                         />
                                     </td>
                                     <td className="py-2 pr-3 text-right">
                                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, items: prev.items?.filter((_, i) => i !== idx) }))} className="text-[#ef4444] hover:bg-[#fef2f2] p-1 rounded">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                     </td>
                                  </tr>
                               ))}
                               <tr className="border-b border-[#d1d8dd]/50 hover:bg-[#fdfdfd]">
                                  <td colSpan={5} className="py-2 pl-3">
                                      <button 
                                        type="button" 
                                        onClick={() => setFormData(prev => ({ ...prev, items: [...(prev.items || []), { productName: '', quantity: 1, unit: 'PCS' }] }))}
                                        className="text-[13px] font-medium text-[#2490ef] hover:underline"
                                      >
                                        + Add Row
                                      </button>
                                  </td>
                               </tr>
                            </tbody>
                         </table>
                     </div>

                     <button type="submit" className="hidden">Submit</button>
                 </form>
             </div>
          </div>
       )}
    </div>
  );
};

export default PackingList;
