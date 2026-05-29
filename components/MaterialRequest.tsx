import React, { useState, useMemo } from 'react';
import { MaterialRequest, InventoryItem, MaterialRequestItem } from '../types';
import { 
  Search, Plus, FileCheck, Filter, 
  MoreHorizontal, ArrowLeft, Save, ChevronLeft, ChevronRight,
  Trash2, X, Check
} from 'lucide-react';

interface MaterialRequestProps {
  requests: MaterialRequest[];
  inventory: InventoryItem[];
  onAdd: (req: MaterialRequest) => void;
  onUpdate: (req: MaterialRequest) => void;
  onDelete: (id: string) => void;
  onAction?: (action: string, data: any) => void;
}

const MaterialRequestComp: React.FC<MaterialRequestProps> = ({ 
  requests, inventory, onAdd, onUpdate, onDelete, onAction
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  
  const [formData, setFormData] = useState<Partial<MaterialRequest>>({
    status: 'DRAFT', items: [],
    date: new Date().toISOString().split('T')[0],
  });

  const [newItem, setNewItem] = useState<MaterialRequestItem>({ productName: '', quantity: 1, unit: 'PIECE', purpose: '' });

  const filteredRequests = useMemo(() => {
    const searchLower = (filter || '').toLowerCase();
    return (requests || []).filter(o => 
      (o.requestedBy || '').toLowerCase().includes(searchLower) || 
      (o.id || '').toLowerCase().includes(searchLower) ||
      (o.department || '').toLowerCase().includes(searchLower)
    );
  }, [requests, filter]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.requestedBy || !formData.items?.length) return;

    const oData = {
      ...formData,
      id: formData.id || `MR-${Date.now().toString().slice(-4)}`,
    } as MaterialRequest;

    if (formData.id) onUpdate(oData);
    else onAdd(oData);
    
    setViewMode('LIST');
  };

  const openForm = (o?: MaterialRequest) => {
    if (o) {
       setFormData(o);
    } else {
       setFormData({
         status: 'DRAFT', items: [],
         date: new Date().toISOString().split('T')[0],
       });
    }
    setViewMode('FORM');
  };

  const handleAddItem = () => {
    if(newItem.productName && newItem.quantity > 0) {
      setFormData({
        ...formData,
        items: [...(formData.items || []), { ...newItem }]
      });
      setNewItem({ productName: '', quantity: 1, unit: 'PIECE', purpose: '' });
    }
  };

  const removeItem = (idx: number) => {
    const updated = [...(formData.items || [])];
    updated.splice(idx, 1);
    setFormData({ ...formData, items: updated });
  };

  const getStatusBadge = (status: string) => {
    if (status === 'RECEIVED') return <span className="bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Received</span>
    if (status === 'ORDERED') return <span className="bg-[#eff6ff] text-[#3b82f6] border border-[#bfdbfe] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Ordered</span>
    return <span className="bg-[#fffbeb] text-[#f59e0b] border border-[#fde68a] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">{status}</span>
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">
       {viewMode === 'LIST' ? (
          <div className="flex flex-col h-full animate-fade-in">
            <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
               <div className="flex justify-between items-center h-8">
                  <div className="flex items-center gap-3">
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Material Request</span>
                     <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filteredRequests.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => openForm()} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                        <Plus className="w-4 h-4" /> New Request
                     </button>
                  </div>
               </div>
               
               <div className="flex justify-between items-center mt-3 h-8">
                  <div className="flex items-center gap-2">
                      <div className="relative">
                         <input type="text" placeholder="Search Request..." value={filter} onChange={(e) => setFilter(e.target.value)} className="h-7 w-[280px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] transition-all placeholder-[#8d99a6]" />
                         <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[13px] text-[#525c66]">{filteredRequests.length > 0 ? `1 of ${filteredRequests.length}` : '0 of 0'}</span>
                     <div className="flex border border-[#d1d8dd] rounded overflow-hidden">
                        <button className="h-7 px-2 bg-white hover:bg-[#f4f5f6] text-[#1c2126] border-r border-[#d1d8dd]"><ChevronLeft className="w-4 h-4"/></button>
                        <button className="h-7 px-2 bg-white hover:bg-[#f4f5f6] text-[#1c2126]"><ChevronRight className="w-4 h-4"/></button>
                     </div>
                  </div>
               </div>
            </div>

            <div className="flex-1 overflow-auto p-5 pb-10">
               <div className="bg-white border border-[#d1d8dd] rounded shadow-sm flex flex-col min-w-[900px]">
                  <div className="flex items-center border-b border-[#d1d8dd] bg-[#f4f5f6] px-4 py-2.5 text-xs text-[#525c66] select-none rounded-t">
                     <div className="w-10"></div>
                     <div className="w-32">Req ID</div>
                     <div className="w-48">Requested By</div>
                     <div className="w-32">Department</div>
                     <div className="w-32">Status</div>
                     <div className="flex-1">Date</div>
                  </div>
                  
                  <div className="divide-y divide-[#d1d8dd]/60">
                     {filteredRequests.length === 0 && (
                        <div className="px-4 py-12 flex flex-col items-center justify-center text-[#525c66]">
                           <FileCheck className="w-8 h-8 text-[#d1d8dd] mb-3" />
                           <p className="text-[13px]">No material requests found.</p>
                        </div>
                     )}
                     {filteredRequests.map((o) => (
                        <div key={o.id} className="group flex items-center px-4 py-[9px] hover:bg-[#f4f5f6] transition-colors cursor-pointer text-[13px]" onClick={() => openForm(o)}>
                           <div className="w-10"></div>
                           <div className="w-32 font-medium text-[#1c2126]">{o.id}</div>
                           <div className="w-48 truncate text-[#1c2126]">{o.requestedBy}</div>
                           <div className="w-32 truncate text-[#525c66]">{o.department}</div>
                           <div className="w-32">{getStatusBadge(o.status)}</div>
                           <div className="flex-1 text-[#525c66]">{o.date}</div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          </div>
       ) : (
          <div className="flex flex-col h-full animate-fade-in">
             <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
               <div className="flex justify-between items-center h-8">
                  <div className="flex items-center gap-3">
                     <button onClick={() => setViewMode('LIST')} className="h-7 w-7 flex items-center justify-center rounded hover:bg-[#f4f5f6] text-[#525c66] transition-colors"><ArrowLeft className="w-4 h-4" /></button>
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight truncate max-w-lg">{formData.id ? formData.id : 'New Material Request'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     {formData.id && onAction && (
                       <button type="button" onClick={() => onAction('CONVERT_TO_PO', formData)} className="h-7 px-3 flex items-center gap-1.5 bg-[#f4f5f6] hover:bg-[#e2e6ea] border border-[#d1d8dd] text-[#1c2126] rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-[#2490ef]/50">
                          Create PO
                       </button>
                     )}
                     <button onClick={handleCreate} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all">
                        <Save className="w-3.5 h-3.5" /> Save
                     </button>
                  </div>
               </div>
             </div>

             <div className="flex-1 overflow-auto p-5 pb-16 flex justify-center">
                 <form onSubmit={handleCreate} className="w-full max-w-[850px] space-y-4">
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Details</h4>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Requested By <span className="text-[#ef4444] ml-0.5">*</span></label>
                                    <input required value={formData.requestedBy || ''} onChange={e => setFormData({...formData, requestedBy: e.target.value})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]" />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Department</label>
                                    <input value={formData.department || ''} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]" />
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Date</label>
                                    <input type="date" required value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]" />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Status</label>
                                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]">
                                       <option value="DRAFT">Draft</option>
                                       <option value="PENDING">Pending</option>
                                       <option value="ORDERED">Ordered</option>
                                       <option value="RECEIVED">Received</option>
                                    </select>
                                </div>
                            </div>
                         </div>
                     </div>

                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Items</h4>
                         <div className="flex gap-2 mb-4">
                            <input list="inv-list" className="px-2.5 py-1.5 border border-[#d1d8dd] rounded flex-1 focus:outline-none focus:border-[#2490ef]" placeholder="Material Name..." value={newItem.productName} onChange={e => setNewItem({...newItem, productName: e.target.value})}/>
                            <datalist id="inv-list">{inventory.map(x => <option key={x.id} value={x.name}/>)}</datalist>
                            <input type="number" className="px-2.5 py-1.5 border border-[#d1d8dd] rounded w-20 focus:outline-none focus:border-[#2490ef]" placeholder="Qty" value={newItem.quantity || ''} onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})} />
                            <input type="text" className="px-2.5 py-1.5 border border-[#d1d8dd] rounded w-32 focus:outline-none focus:border-[#2490ef]" placeholder="Purpose (Optional)" value={newItem.purpose || ''} onChange={e => setNewItem({...newItem, purpose: e.target.value})} />
                            <button type="button" onClick={handleAddItem} className="h-[30px] px-3 bg-[#2490ef] hover:bg-[#2081d6] text-white rounded text-xs font-semibold">Add</button>
                         </div>
                         
                         {formData.items && formData.items.length > 0 && (
                             <table className="w-full mt-4 text-left border-collapse">
                                <thead>
                                   <tr className="bg-[#f4f5f6] text-xs text-[#525c66] border-y border-[#d1d8dd]">
                                      <th className="py-2 pl-3 font-medium">Item</th>
                                      <th className="py-2 px-3 font-medium text-right">Quantity</th>
                                      <th className="py-2 px-3 font-medium">Purpose</th>
                                      <th className="py-2 pr-2 font-medium w-8"></th>
                                   </tr>
                                </thead>
                                <tbody>
                                   {formData.items.map((item, idx) => (
                                      <tr key={idx} className="border-b border-[#d1d8dd]/50">
                                         <td className="py-2 pl-3 font-semibold text-[#1c2126]">{item.productName}</td>
                                         <td className="py-2 px-3 text-right">{item.quantity}</td>
                                         <td className="py-2 px-3 text-[#525c66]">{item.purpose}</td>
                                         <td className="py-2 pr-2 text-right">
                                            <button type="button" onClick={() => removeItem(idx)} className="text-[#ef4444] hover:text-[#dc2626]"><Trash2 className="w-3.5 h-3.5"/></button>
                                         </td>
                                      </tr>
                                   ))}
                                </tbody>
                             </table>
                         )}
                     </div>
                 </form>
             </div>
          </div>
       )}
    </div>
  );
};

export default MaterialRequestComp;
