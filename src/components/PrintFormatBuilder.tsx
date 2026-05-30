import React, { useState } from 'react';
import { Settings, Printer, FormInput, Type, Layout, CreditCard, DivideSquare, Edit2, Code, ArrowRight, Plus, Search, FileText, ChevronLeft, Save } from 'lucide-react';
import { ViewState } from '../types';

interface PrintFormat {
  id: string;
  name: string;
  docType: string;
  default: boolean;
  type: 'Custom' | 'Standard';
}

export const PrintFormatBuilder: React.FC = () => {
  const [view, setView] = useState<'LIST' | 'BUILDER'>('LIST');
  const [selectedFormat, setSelectedFormat] = useState('Tax Invoice');
  const [activeTab, setActiveTab] = useState<'visual' | 'html' | 'css'>('visual');
  const [formats, setFormats] = useState<PrintFormat[]>([
    { id: '1', name: 'Standard Tax Invoice', docType: 'Tax Invoice', default: true, type: 'Standard' },
    { id: '2', name: 'Retail POS Receipt', docType: 'Tax Invoice', default: false, type: 'Custom' },
    { id: '3', name: 'Standard Job Slip', docType: 'Work Order', default: true, type: 'Standard' },
    { id: '4', name: 'Standard Delivery Challan', docType: 'Delivery Challan', default: true, type: 'Standard' },
  ]);

  const [currentFormat, setCurrentFormat] = useState<PrintFormat | null>(null);

  const handleEdit = (format: PrintFormat) => {
    setCurrentFormat(format);
    setSelectedFormat(format.docType);
    setView('BUILDER');
  };

  const handleNew = () => {
    setCurrentFormat({ id: Date.now().toString(), name: 'New Print Format', docType: 'Tax Invoice', default: false, type: 'Custom' });
    setView('BUILDER');
  };

  if (view === 'LIST') {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-md">
                <Printer className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Core Engine</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Print Formats</h1>
            <p className="text-sm text-slate-500 mt-1">Manage Jinja templates and visual layouts for documents.</p>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={handleNew} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow-sm hover:bg-indigo-700 flex items-center gap-2">
               <Plus className="w-4 h-4" /> Add Print Format
             </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
             <div className="relative max-w-sm w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search Formats..." className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500" />
             </div>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-slate-50 dark:bg-slate-950/50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                   <th className="p-4">Name</th>
                   <th className="p-4">DocType</th>
                   <th className="p-4">Type</th>
                   <th className="p-4">Default</th>
                   <th className="p-4 text-right">Action</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                 {formats.map((f) => (
                   <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                     <td className="p-4">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                           <FileText className="w-4 h-4" />
                         </div>
                         <span className="font-bold text-slate-900 dark:text-white">{f.name}</span>
                       </div>
                     </td>
                     <td className="p-4">
                        <span className="inline-block px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-md border border-slate-200 dark:border-slate-700">
                          {f.docType}
                        </span>
                     </td>
                     <td className="p-4">
                        <span className={`text-[10px] uppercase font-black tracking-widest px-2 py-1 rounded-full ${f.type === 'Standard' ? 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'}`}>
                           {f.type}
                        </span>
                     </td>
                     <td className="p-4 text-slate-500 text-sm">
                       {f.default ? <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div> : <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700"></div>}
                     </td>
                     <td className="p-4 text-right">
                       <button onClick={() => handleEdit(f)} className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-sm hover:border-indigo-500 hover:text-indigo-600 transition-colors">Edit Builder</button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <button onClick={() => setView('LIST')} className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600 uppercase tracking-widest mb-4 transition-colors">
             <ChevronLeft className="w-4 h-4" /> Back to List
          </button>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-md">
              <Printer className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Print Format</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{currentFormat?.name}</h1>
          <p className="text-sm text-slate-500 mt-1">Design and customize PDF layouts for your documents.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setView('LIST')} className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Close</button>
          <button className="px-4 py-2 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 font-bold rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors flex items-center gap-2">
            <Printer className="w-4 h-4" /> Simulate Print
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2">
            <Save className="w-4 h-4" /> Save Format
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[750px] relative">
        {/* Left Sidebar */}
        <div className="col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 px-1">Setup / DocType</label>
              <select 
                 value={selectedFormat}
                 onChange={(e) => setSelectedFormat(e.target.value)}
                 className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold bg-white dark:bg-slate-900"
              >
                <option>Tax Invoice</option>
                <option>Purchase Order</option>
                <option>Quotation</option>
                <option>Delivery Challan</option>
                <option>Work Order</option>
              </select>
            </div>
            <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 px-1">Letter Head</label>
                <select className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900">
                  <option>Standard Header</option>
                  <option>No Header</option>
                </select>
            </div>
             <div className="flex items-center gap-2 px-1 pt-1 border-t border-slate-200 dark:border-slate-800">
                <input type="checkbox" id="is_default" defaultChecked={currentFormat?.default} className="border-slate-300 rounded" />
                <label htmlFor="is_default" className="text-xs font-bold text-slate-700 dark:text-slate-300">Default Print Format</label>
             </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Layout Blocks</h3>
                 <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">DRAG TO ADD</span>
              </div>
              <div className="space-y-2">
                {[
                  { icon: Type, label: 'Text Block' },
                  { icon: Layout, label: 'Grid / Columns' },
                  { icon: CreditCard, label: 'Header & Logo' },
                  { icon: DivideSquare, label: 'Item Table' },
                  { icon: Printer, label: 'Barcode / QR' },
                  { icon: FormInput, label: 'Data Field' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm rounded-lg cursor-grab hover:border-indigo-400 hover:shadow-md transition-all active:scale-95 active:cursor-grabbing">
                    <div className="w-6 h-6 rounded bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center">
                       <item.icon className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block">Available Doc Fields</h3>
              <div className="flex flex-wrap gap-2">
                {['customer_name', 'date', 'grand_total', 'tax_amount', 'shipping_address', 'gstin'].map(f => (
                  <div key={f} className="text-xs font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1.5 rounded border border-indigo-100 dark:border-indigo-900/50 cursor-copy active:scale-95 transition-transform hover:bg-indigo-100 dark:hover:bg-indigo-900/40">
                    {`{{ doc.${f} }}`}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Builder Canvas */}
        <div className="col-span-1 lg:col-span-3 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col shadow-inner overflow-hidden">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-slate-900 shrink-0">
             <button onClick={() => setActiveTab('visual')} className={`px-4 py-2 border-b-2 font-bold text-xs uppercase tracking-widest ${activeTab === 'visual' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Visual Builder</button>
             <button onClick={() => setActiveTab('html')} className={`px-4 py-2 border-b-2 font-bold text-xs uppercase tracking-widest ${activeTab === 'html' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Custom HTML</button>
             <button onClick={() => setActiveTab('css')} className={`px-4 py-2 border-b-2 font-bold text-xs uppercase tracking-widest ${activeTab === 'css' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Custom CSS</button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center items-start">
             {activeTab === 'visual' && (
                <div className="bg-white w-full max-w-[21cm] min-h-[29.7cm] shadow-xl p-12 border border-slate-200 space-y-6">
                   {/* Dummy A4 Canvas */}
                   <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4">
                     <div>
                       <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{selectedFormat}</h2>
                       <p className="text-slate-500 mt-1 font-mono font-bold">{"{{ doc.name }}"}</p>
                     </div>
                     <div className="text-right flex flex-col items-end gap-2">
                        <div className="w-32 h-16 bg-slate-50 border-2 border-dashed border-slate-300 rounded flex items-center justify-center text-[10px] font-bold text-slate-400">Letter Head Logo</div>
                        {selectedFormat === 'Work Order' && (
                          <div className="border border-slate-900 px-2 py-1 flex flex-col items-center">
                             <div className="h-6 w-24 bg-slate-800" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, #1e293b 2px, #1e293b 4px)' }}></div>
                             <span className="text-[8px] font-mono mt-0.5">{"{{ doc.name }}"}</span>
                          </div>
                        )}
                     </div>
                   </div>
                   
                   {selectedFormat === 'Work Order' ? (
                     <>
                        <div className="grid grid-cols-3 gap-4 text-sm mb-6">
                           <div className="col-span-1 p-3 border-2 border-dashed border-indigo-200/50 bg-indigo-50/30 hover:bg-indigo-50/50 outline-2 outline-indigo-500 relative group cursor-pointer rounded-lg transition-colors">
                              <p className="font-bold text-slate-500 text-[10px] uppercase tracking-widest mb-1">Production Item</p>
                              <p className="font-mono text-indigo-600 font-bold mb-1">{"{{ doc.production_item }}"}</p>
                              <p className="text-xs text-slate-600">Qty to Manufacture: <span className="font-bold text-slate-900 font-mono">{"{{ doc.qty }}"}</span></p>
                           </div>
                           <div className="col-span-2 p-3 border-2 border-dashed border-transparent hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer rounded-lg transition-colors">
                              <table className="w-full text-xs">
                                <tbody>
                                  <tr><td className="py-1 text-slate-500">Planned Start Date</td><td className="py-1 text-right font-mono font-bold text-slate-800">{"{{ doc.planned_start_date }}"}</td></tr>
                                  <tr><td className="py-1 text-slate-500">Expected Delivery</td><td className="py-1 text-right font-mono font-bold text-slate-800">{"{{ doc.expected_delivery_date }}"}</td></tr>
                                  <tr><td className="py-1 text-slate-500">BOM No</td><td className="py-1 text-right font-mono font-bold text-slate-800">{"{{ doc.bom_no }}"}</td></tr>
                                </tbody>
                              </table>
                           </div>
                        </div>

                        <div className="border border-slate-300 rounded-lg overflow-hidden mb-6">
                           <div className="bg-slate-100 p-2 text-xs font-black uppercase tracking-widest text-slate-700 border-b border-slate-300">Required Materials</div>
                           <div className="p-4 text-center border-dashed border-2 border-amber-200 bg-amber-50/30 m-4 rounded hover:bg-amber-50/60 cursor-pointer transition-colors py-6">
                              <div className="text-amber-600 font-mono text-xs font-bold">
                                {"{% for item in doc.required_items %}"}<br/>
                                <span className="text-slate-500 text-[10px] italic font-sans my-1 block">Material Issue Items</span>
                                {"{% endfor %}"}
                              </div>
                           </div>
                        </div>

                        <div className="border border-slate-300 rounded-lg overflow-hidden">
                           <div className="bg-slate-100 p-2 text-xs font-black uppercase tracking-widest text-slate-700 border-b border-slate-300">Operations / Process Routing</div>
                           <div className="p-4 text-center border-dashed border-2 border-emerald-200 bg-emerald-50/30 m-4 rounded hover:bg-emerald-50/60 cursor-pointer transition-colors py-6">
                              <div className="text-emerald-600 font-mono text-xs font-bold">
                                {"{% for op in doc.operations %}"}<br/>
                                <span className="text-slate-500 text-[10px] italic font-sans my-1 block">Routing Operations (Cutting, Stitching, etc)</span>
                                {"{% endfor %}"}
                              </div>
                           </div>
                        </div>
                     </>
                   ) : (
                     <>
                       <div className="grid grid-cols-2 gap-8 text-sm">
                         <div className="p-4 border-2 border-dashed border-indigo-200/50 bg-indigo-50/30 hover:bg-indigo-50/50 outline-2 outline-indigo-500 relative group cursor-pointer rounded-lg transition-colors">
                            <div className="absolute top-2 right-2 bg-indigo-500 text-white rounded text-[10px] font-black px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shadow-md"><Edit2 className="w-3 h-3"/> EDIT</div>
                            <p className="font-bold text-slate-800 text-xs uppercase tracking-widest mb-2">Billed To</p>
                            <p className="font-mono text-indigo-600 leading-relaxed font-semibold">{"{{ doc.customer_name }}"}</p>
                            <p className="font-mono text-slate-600 mt-1">{"{{ doc.billing_address }}"}</p>
                         </div>
                         <div className="p-4 border-2 border-dashed border-transparent hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer rounded-lg transition-colors">
                            <p className="font-bold text-slate-800 text-xs uppercase tracking-widest mb-2">Details</p>
                            <table className="w-full text-sm">
                              <tbody>
                                <tr><td className="py-1 text-slate-500">Date</td><td className="py-1 text-right font-mono font-bold text-slate-800">{"{{ doc.date }}"}</td></tr>
                                <tr><td className="py-1 text-slate-500">Valid Till</td><td className="py-1 text-right font-mono font-bold text-slate-800">{"{{ doc.valid_till }}"}</td></tr>
                              </tbody>
                            </table>
                         </div>
                       </div>
                       
                       <div className="border border-slate-300 rounded-lg overflow-hidden mt-6">
                         <div className="bg-slate-100 grid grid-cols-12 gap-2 p-3 border-b border-slate-300 text-xs font-black uppercase tracking-widest text-slate-700">
                           <div className="col-span-6">Item Description</div>
                           <div className="col-span-2 text-right">Qty</div>
                           <div className="col-span-2 text-right">Rate</div>
                           <div className="col-span-2 text-right">Amount</div>
                         </div>
                         <div className="p-4 text-center border-dashed border-2 border-indigo-200 bg-indigo-50/30 m-4 rounded hover:bg-indigo-50/60 cursor-pointer transition-colors relative group py-8">
                            <div className="absolute top-2 right-2 bg-indigo-500 text-white rounded text-[10px] font-black px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shadow-md"><Edit2 className="w-3 h-3"/> CONFIGURE TABLE</div>
                            <div className="text-indigo-400 font-mono text-sm font-bold">
                              {"{% for item in doc.items %}"}<br/>
                              <span className="text-slate-500 text-xs italic font-sans my-2 block">Item Row Data</span>
                              {"{% endfor %}"}
                            </div>
                         </div>
                       </div>
                       
                       <div className="flex justify-end pt-4">
                         <div className="w-72 space-y-3 text-sm p-4 border-2 border-dashed border-transparent hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer rounded-lg transition-colors">
                            <div className="flex justify-between items-center text-slate-600 font-medium"><span>Subtotal</span> <span className="font-mono">{"{{ doc.sub_total }}"}</span></div>
                            <div className="flex justify-between items-center text-slate-600 font-medium"><span>Tax</span> <span className="font-mono">{"{{ doc.tax_amount }}"}</span></div>
                            <div className="flex justify-between items-center font-black text-xl border-t-2 border-slate-300 pt-3 text-slate-900"><span>Total</span> <span className="font-mono">{"{{ doc.grand_total }}"}</span></div>
                         </div>
                       </div>
                     </>
                   )}
                   
                   <div className="pt-20 border-t-2 border-slate-200 mt-20 text-center">
                     <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Terms & Conditions</p>
                     <p className="text-xs text-slate-500 font-serif italic">{"{{ doc.terms }}"}</p>
                   </div>
                </div>
             )}
             
             {activeTab === 'html' && (
                <div className="w-full h-full bg-[#1e1e1e] rounded-lg shadow-xl font-mono text-[#d4d4d4] text-sm flex flex-col border border-slate-800 overflow-hidden">
                   <div className="flex justify-between items-center bg-[#252526] px-4 py-2 border-b border-[#333]">
                      <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                        <Code className="w-4 h-4 text-emerald-500"/> HTML (Jinja Templating)
                      </div>
                      <div className="flex gap-2">
                         <button className="px-2 py-1 text-[10px] bg-[#333] hover:bg-[#444] rounded text-slate-300 transition-colors uppercase font-bold tracking-widest">Beautify</button>
                      </div>
                   </div>
                   <textarea 
                     className="w-full flex-1 bg-transparent border-none outline-none resize-none leading-relaxed p-6 focus:ring-0 selection:bg-indigo-500/30 font-mono"
                     spellCheck={false}
                     defaultValue={
`<div class="print-format">
  <div class="header">
    <h1>${selectedFormat}</h1>
    <h3>{{ doc.name }}</h3>
  </div>
  
  <div class="customer-details pt-6">
    <strong>Billed To:</strong>
    <p>{{ doc.customer_name }}</p>
  </div>
  
  <table class="table w-full mt-8">
     <thead>
        <tr>
           <th class="text-left">Item Name</th>
           <th class="text-right">Qty</th>
        </tr>
     </thead>
     <tbody>
        {% for item in doc.items %}
        <tr>
           <td>{{ item.item_name }}</td>
           <td class="text-right">{{ item.qty }}</td>
        </tr>
        {% endfor %}
     </tbody>
  </table>
</div>`
                     }
                   />
                </div>
             )}
             
             {activeTab === 'css' && (
                <div className="w-full h-full bg-[#1e1e1e] rounded-lg shadow-xl font-mono text-[#d4d4d4] text-sm flex flex-col border border-slate-800 overflow-hidden">
                   <div className="flex justify-between items-center bg-[#252526] px-4 py-2 border-b border-[#333]">
                      <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                        <Layout className="w-4 h-4 text-sky-500"/> Custom CSS
                      </div>
                   </div>
                   <textarea 
                     className="w-full flex-1 bg-transparent border-none outline-none resize-none leading-relaxed p-6 focus:ring-0 selection:bg-indigo-500/30 text-sky-300 font-mono"
                     spellCheck={false}
                     defaultValue={
`.print-format {
  font-family: 'Inter', sans-serif;
  color: #1e293b;
  line-height: 1.5;
}

.table th {
  background-color: #f8fafc;
  border-bottom: 2px solid #cbd5e1;
  padding: 8px;
}

.table td {
  border-bottom: 1px solid #e2e8f0;
  padding: 8px;
}

.header h1 {
  font-size: 24pt;
  font-weight: 900;
  color: #0f172a;
}
`
                     }
                   />
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

