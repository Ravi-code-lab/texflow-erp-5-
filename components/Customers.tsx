import React, { useState, useMemo } from 'react';
import { Customer } from '../types';
import { 
  Search, Plus, Filter, ChevronLeft, ChevronRight,
  MoreHorizontal, ArrowLeft, Save, Trash2, List
} from 'lucide-react';
import { motion } from 'motion/react';

interface CustomersProps {
  customers: Customer[];
  onAdd: (c: Customer) => void;
  onUpdate?: (c: Customer) => void;
  onDelete?: (id: string) => void;
  currency?: string;
}

const Customers: React.FC<CustomersProps> = ({ 
  customers = [], onAdd, onUpdate, onDelete, currency = '₹' 
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  const [formData, setFormData] = useState<Partial<Customer>>({ 
    type: 'RETAILER', name: '', contactPerson: '', phone: '', email: '', address: '', gstin: '', status: 'ACTIVE'
  });
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // Check for custom fields optionally saved by the user
  const customFields = useMemo(() => {
    const raw = localStorage.getItem('erpnext_custom_fields');
    if (raw) {
      try {
        return JSON.parse(raw).filter((f: any) => f.docType === 'Customer');
      } catch (e) {}
    }
    return [];
  }, [viewMode]);

  const filteredCustomers = useMemo(() => {
    const searchLower = (filter || '').toLowerCase();
    return (customers || []).filter(c => 
      (c.name || '').toLowerCase().includes(searchLower) || 
      (c.contactPerson || '').toLowerCase().includes(searchLower) ||
      (c.gstin || '').toLowerCase().includes(searchLower)
    );
  }, [customers, filter]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    const customer = { 
      ...formData, 
      id: formData.id || `CUST-${Date.now().toString().slice(-4)}`,
      updatedAt: new Date().toISOString()
    } as Customer;
    
    if (formData.id && onUpdate) onUpdate(customer);
    else onAdd(customer);
    
    setViewMode('LIST');
  };

  const openForm = (c?: Customer) => {
    if (c) {
      setFormData(c);
    } else {
      setFormData({ type: 'RETAILER', name: '', contactPerson: '', phone: '', email: '', address: '', gstin: '', status: 'ACTIVE' });
    }
    setViewMode('FORM');
  };

  // ───────────────────────────────────────────────────────────────────────────
  // ERPNEXT (FRAPPE) FULL UI RECREATION
  // Emulates frappe desk: grey background, crisp white cards, small fonts, 
  // precise standard blue colors.
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">
       {viewMode === 'LIST' ? (
          <div className="flex flex-col h-full animate-fade-in">
            {/* ─── LIST HEADER ─── */}
            <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
               <div className="flex justify-between items-center h-8">
                  <div className="flex items-center gap-3">
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Customer</span>
                     <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filteredCustomers.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button className="h-7 px-2.5 flex items-center gap-1.5 bg-[#f4f5f6] hover:bg-[#e2e6e9] border border-transparent rounded text-xs font-semibold text-[#1c2126] transition-colors">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                     </button>
                     <button onClick={() => openForm()} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                        <Plus className="w-4 h-4" />
                        Add Customer
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
                            placeholder="ID, Name, or GSTIN"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="h-7 w-[280px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] transition-all placeholder-[#8d99a6]"
                         />
                         <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[13px] text-[#525c66]">{filteredCustomers.length > 0 ? `1 of ${filteredCustomers.length}` : '0 of 0'}</span>
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
                     <div className="w-24"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Status</span></div>
                     <div className="w-72"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Customer Name</span></div>
                     <div className="w-48"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Customer Type</span></div>
                     <div className="w-48"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Customer Group</span></div>
                     <div className="flex-1 min-w-0"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Territory</span></div>
                  </div>
                  
                  {/* Table Body */}
                  <div className="divide-y divide-[#d1d8dd]/60">
                     {filteredCustomers.length === 0 && (
                        <div className="px-4 py-12 flex flex-col items-center justify-center text-[#525c66]">
                           <List className="w-8 h-8 text-[#d1d8dd] mb-3" />
                           <p className="text-[13px]">No customers found.</p>
                        </div>
                     )}
                     {filteredCustomers.map((c, idx) => (
                        <div key={c.id} className="group flex items-center px-4 py-[9px] hover:bg-[#f4f5f6] transition-colors cursor-pointer text-[13px]" onClick={() => openForm(c)}>
                           <div className="w-10" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={checkedIds.has(c.id)}
                                onChange={(e) => {
                                   const newSet = new Set(checkedIds);
                                   if(e.target.checked) newSet.add(c.id);
                                   else newSet.delete(c.id);
                                   setCheckedIds(newSet);
                                }}
                                className="rounded-sm border-[#d1d8dd] text-[#2490ef] focus:ring-[#2490ef] bg-white w-3.5 h-3.5 cursor-pointer"
                              />
                           </div>
                           <div className="w-24">
                              <span className={`inline-flex items-center px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide ${
                                 c.status === 'INACTIVE' ? 'bg-[#fef2f2] text-[#ef4444]' : 'bg-[#ecfdf5] text-[#10b981]'
                              }`}>
                                 {c.status || 'Active'}
                              </span>
                           </div>
                           <div className="w-72 pr-4 truncate">
                              <a className="font-semibold text-[#1c2126] group-hover:underline cursor-pointer select-none">
                                 {c.name}
                              </a>
                           </div>
                           <div className="w-48 truncate text-[#525c66]">{c.type || 'Retailer'}</div>
                           <div className="w-48 truncate text-[#525c66]">{c.contactPerson || '-'}</div>
                           <div className="flex-1 truncate text-[#525c66]">{c.address ? c.address.substring(0,25) + '...' : 'India'}</div>
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
                        {formData.id ? formData.name : 'New Customer 1'}
                     </span>
                     {formData.id && (
                         <span className="bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">
                            Enabled
                         </span>
                     )}
                  </div>
                  <div className="flex items-center gap-2">
                     {formData.id && onDelete && (
                         <button 
                            type="button"
                            onClick={(e) => { e.preventDefault(); onDelete(formData.id!); setViewMode('LIST'); }} 
                            className="h-7 px-3 flex items-center gap-1.5 bg-white hover:bg-[#fef2f2] hover:text-[#ef4444] border border-[#d1d8dd] hover:border-[#ef4444] rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm"
                         >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                         </button>
                     )}
                     <button type="button" onClick={() => setViewMode('LIST')} className="h-7 px-3 flex items-center gap-1.5 bg-white hover:bg-[#f4f5f6] border border-[#d1d8dd] rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm">
                        Cancel
                     </button>
                     <button onClick={handleSave} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                        <Save className="w-3.5 h-3.5" />
                        Save
                     </button>
                  </div>
               </div>

               {formData.id && (
                  <div className="flex justify-between items-center mt-3 h-8 text-[13px]">
                     <div className="flex items-center gap-4 text-[#1c2126] font-medium">
                           <a className="hover:underline cursor-pointer opacity-80 border-b-2 border-transparent hover:border-[#1c2126] pb-1 transition-all">Details</a>
                           <a className="hover:underline cursor-pointer opacity-80 border-b-2 border-transparent hover:border-[#1c2126] pb-1 transition-all">Connections</a>
                     </div>
                     <div className="flex items-center gap-1">
                           <button className="text-[#525c66] hover:text-[#1c2126] font-semibold px-2 py-1 rounded hover:bg-[#f4f5f6] transition-colors">Print</button>
                           <button className="text-[#525c66] hover:text-[#1c2126] font-semibold px-2 py-1 rounded hover:bg-[#f4f5f6] transition-colors">Email</button>
                           <span className="text-[#d1d8dd] px-1">|</span>
                           <button className="text-[#525c66] hover:text-[#1c2126] font-semibold px-2 py-1 rounded hover:bg-[#f4f5f6] transition-colors">Menu</button>
                     </div>
                  </div>
               )}
             </div>

             {/* ─── FORM BODY ─── */}
             <div className="flex-1 overflow-auto p-5 pb-16 flex justify-center">
                 <form onSubmit={handleSave} className="w-full max-w-[850px] space-y-4">

                     {/* Details Card */}
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Naming & Types</h4>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            {/* Column 1 */}
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                   <label className="text-xs text-[#525c66]">Customer Name <span className="text-[#ef4444] ml-0.5">*</span></label>
                                   <input 
                                      value={formData.name || ''} 
                                      onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium"
                                   />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                   <label className="text-xs text-[#525c66]">Customer Type</label>
                                   <div className="relative">
                                      <select 
                                         value={formData.type || 'RETAILER'} 
                                         onChange={e => setFormData({...formData, type: e.target.value as any})}
                                         className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium appearance-none"
                                      >
                                          <option value="RETAILER">Company</option>
                                          <option value="WHOLESALER">Individual</option>
                                          <option value="BRAND">Brand</option>
                                      </select>
                                      <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                                   </div>
                                </div>
                                <div className="space-y-1.5 flex flex-col pt-2">
                                    <div className="flex items-center gap-2">
                                      <input type="checkbox" id="disabled" className="rounded-sm border-[#d1d8dd] text-[#2490ef] focus:ring-[#2490ef] w-3.5 h-3.5" 
                                          checked={formData.status === 'INACTIVE'}
                                          onChange={e => setFormData({...formData, status: e.target.checked ? 'INACTIVE' : 'ACTIVE'})}
                                      />
                                      <label htmlFor="disabled" className="text-[#1c2126] cursor-pointer font-medium">Disabled</label>
                                    </div>
                                    <p className="text-xs text-[#8d99a6] ml-5">Check to prevent further transactions</p>
                                </div>
                            </div>
                            
                            {/* Column 2 */}
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                   <label className="text-xs text-[#525c66]">Customer Group</label>
                                   <div className="relative">
                                      <select 
                                         value="Commercial" onChange={()=>{}}
                                         className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium appearance-none"
                                      >
                                          <option value="Commercial">Commercial</option>
                                          <option value="Government">Government</option>
                                          <option value="Non Profit">Non Profit</option>
                                      </select>
                                      <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                                   </div>
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                   <label className="text-xs text-[#525c66]">Territory</label>
                                   <div className="relative">
                                      <select 
                                         value="India" onChange={()=>{}}
                                         className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium appearance-none"
                                      >
                                          <option value="India">India</option>
                                          <option value="Rest of the World">Rest of the World</option>
                                      </select>
                                      <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                                   </div>
                                </div>
                            </div>

                         </div>
                     </div>

                     {/* Contact & Address Card */}
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <div className="flex items-center justify-between border-b border-[#d1d8dd] pb-2 mb-5">
                             <h4 className="font-semibold text-sm text-[#1c2126]">Contacts And Addresses</h4>
                         </div>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                   <label className="text-xs text-[#525c66]">Primary Contact</label>
                                   <input 
                                      value={formData.contactPerson || ''} 
                                      onChange={e => setFormData({...formData, contactPerson: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                   />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                   <label className="text-xs text-[#525c66]">Mobile No</label>
                                   <input 
                                      value={formData.phone || ''} 
                                      onChange={e => setFormData({...formData, phone: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                   />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                   <label className="text-xs text-[#525c66]">Email Id</label>
                                   <input 
                                      type="email"
                                      value={formData.email || ''} 
                                      onChange={e => setFormData({...formData, email: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                   />
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                   <label className="text-xs text-[#525c66]">Tax ID (GSTIN)</label>
                                   <input 
                                      value={formData.gstin || ''} 
                                      onChange={e => setFormData({...formData, gstin: e.target.value.toUpperCase()})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-mono uppercase"
                                   />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                   <label className="text-xs text-[#525c66]">Primary Address</label>
                                   <textarea 
                                      rows={4}
                                      value={formData.address || ''} 
                                      onChange={e => setFormData({...formData, address: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] resize-none"
                                   />
                                </div>
                            </div>
                         </div>
                     </div>

                     {/* Hidden button to capture enter press */}
                     <button type="submit" className="hidden">Submit</button>
                 </form>
             </div>
          </div>
       )}
    </div>
  );
};
export default Customers;
