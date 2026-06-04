import React, { useState, useMemo } from 'react';
import { Calculator, ArrowUpRight, TrendingUp, DollarSign, Activity, FileText, CheckCircle, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { MarginCosting, Design, InventoryItem, RecipeItem } from '../types';

export default function MarginCostingEngine({ costings, designs = [], inventory = [], onAdd, onUpdate }: { costings: MarginCosting[], designs?: Design[], inventory?: InventoryItem[], onAdd: any, onUpdate: any }) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<MarginCosting>>({
     design: '',
     baseCost: 0,
     totalOverhead: 0,
     totalCost: 0,
     salePrice: 0,
     marginPct: 0,
     status: 'PROFITABLE'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      ...formData,
      id: formData.id || `MC-${Date.now().toString(36).toUpperCase()}`,
      updatedAt: new Date().toISOString()
    });
    setShowModal(false);
  };

  const getRealtimeMetrics = (c: MarginCosting) => {
    // Attempt to match design
    const currentDesign = designs?.find(d => d.name === c.design);
    if (!currentDesign) return { liveBaseCost: c.baseCost || 0, liveOverhead: c.totalOverhead || 0, liveTotal: c.totalCost || 0, liveMargin: c.marginPct || 0 };

    let baseRmCost = 0;
    if (currentDesign.recipe) {
       currentDesign.recipe.forEach((item: RecipeItem) => {
          const invItem = inventory?.find(i => i.name === item.materialName || i.id === item.materialId);
          const price = invItem?.pricePerUnit || item.estimatedCost || 0;
          const mult = 1 + (item.wastagePercent || 0) / 100;
          baseRmCost += (item.quantity * price * mult);
       });
    } else {
       baseRmCost = c.baseCost || 0;
    }

    let overhead = 0;
    if (currentDesign.laborCosts) {
       overhead += (currentDesign.laborCosts.cutting || 0);
       overhead += (currentDesign.laborCosts.stitching || 0);
       overhead += (currentDesign.laborCosts.embroidery || 0);
       overhead += (currentDesign.laborCosts.printing || 0);
       overhead += (currentDesign.laborCosts.washing || 0);
       overhead += (currentDesign.laborCosts.finishing || 0);
       overhead += (currentDesign.laborCosts.folding || 0);
       overhead += (currentDesign.laborCosts.packing || 0);
       overhead += (currentDesign.laborCosts.other || 0);
    } else if ((currentDesign as any).operations && Array.isArray((currentDesign as any).operations)) {
       (currentDesign as any).operations.forEach((op: any) => {
          const rate = op.taskBaseRate || op.hourlyRate || 0;
          overhead += rate;
       });
    } else {
       overhead = c.totalOverhead || 0;
    }

    const liveTotal = baseRmCost + overhead;
    const salePrice = c.salePrice || 0;
    const liveMargin = salePrice ? ((salePrice - liveTotal) / salePrice) * 100 : 0;

    return { liveBaseCost: baseRmCost, liveOverhead: overhead, liveTotal, liveMargin };
  };

  const enhancedCostings = costings.map(c => {
    const liveMetrics = getRealtimeMetrics(c);
    return { ...c, ...liveMetrics };
  });

  const avgMargin = enhancedCostings.length > 0 ? enhancedCostings.reduce((sum, c) => sum + (c.liveMargin || 0), 0) / enhancedCostings.length : 0;
  const warningsCount = enhancedCostings.filter(c => (c.liveMargin || 0) < 35).length;
  const mostProfitable = enhancedCostings.length > 0 ? enhancedCostings.reduce((max, c) => (c.liveMargin || 0) > (max.liveMargin || 0) ? c : max, enhancedCostings[0]) : null;

  const handleDesignChange = (designId: string) => {
    const selectedDesign = designs.find(d => d.id === designId || d.name === designId);
    if (!selectedDesign) {
       setFormData({ ...formData, design: designId });
       return;
    }

    let baseRmCost = 0;
    if (selectedDesign.recipe) {
       selectedDesign.recipe.forEach((item: RecipeItem) => {
          const invItem = inventory.find(i => i.name === item.materialName || i.id === item.materialId);
          const price = invItem?.pricePerUnit || item.estimatedCost || 0;
          const mult = 1 + (item.wastagePercent || 0) / 100;
          baseRmCost += (item.quantity * price * mult);
       });
    }

    let overhead = 0;
    if (selectedDesign.laborCosts) {
       overhead += (selectedDesign.laborCosts.cutting || 0);
       overhead += (selectedDesign.laborCosts.stitching || 0);
       overhead += (selectedDesign.laborCosts.embroidery || 0);
       overhead += (selectedDesign.laborCosts.printing || 0);
       overhead += (selectedDesign.laborCosts.washing || 0);
       overhead += (selectedDesign.laborCosts.finishing || 0);
       overhead += (selectedDesign.laborCosts.folding || 0);
       overhead += (selectedDesign.laborCosts.packing || 0);
       overhead += (selectedDesign.laborCosts.other || 0);
    }
    
    // Add additional generic operations if available in some designs
    if ((selectedDesign as any).operations && Array.isArray((selectedDesign as any).operations)) {
       (selectedDesign as any).operations.forEach((op: any) => {
          const rate = op.taskBaseRate || op.hourlyRate || 0;
          overhead += rate;
       });
    }

    const totalCost = baseRmCost + overhead;
    const salePrice = formData.salePrice || 0;
    const marginPct = salePrice ? ((salePrice - totalCost) / salePrice) * 100 : 0;

    setFormData({
       ...formData,
       design: selectedDesign.name,
       baseCost: baseRmCost,
       totalOverhead: overhead,
       totalCost,
       marginPct
    });
  };

  return (
    <div className="max-w-[1200px] w-full mx-auto p-4 md:p-8 space-y-6 bg-[#FAFAFA] min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 border border-slate-200 rounded-md">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            Margin Costing Engine
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">Live profitability tracking factoring in live yarn rates, job-work losses, and real labor costs</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors shadow-sm focus:ring-2 focus:ring-blue-500/30 outline-none">
          + New Simulation
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-md border border-slate-200">
           <div className="text-slate-500 text-sm mb-1 font-medium">Average Margin</div>
           <div className="text-2xl font-semibold text-slate-800">{avgMargin.toFixed(1)}%</div>
           <p className="text-xs text-slate-400 mt-2">Across all simulations</p>
        </div>
        <div className="bg-white p-4 rounded-md border border-slate-200">
           <div className="text-slate-500 text-sm mb-1 font-medium">Min Margin Target</div>
           <div className="text-2xl font-semibold text-slate-800">35.0%</div>
           <p className="text-xs text-slate-400 mt-2">Global baseline threshold</p>
        </div>
        <div className="bg-white p-4 rounded-md border border-slate-200">
           <div className="text-slate-500 text-sm mb-1 font-medium">Most Profitable</div>
           <div className="text-lg font-semibold text-slate-800 truncate">{mostProfitable ? mostProfitable.design : '-'}</div>
           <p className="text-xs text-blue-600 mt-2 font-medium">{mostProfitable ? mostProfitable.liveMargin?.toFixed(1) : '0'}% Net Margin</p>
        </div>
        <div className="bg-white p-4 rounded-md border border-slate-200">
           <div className="text-slate-500 text-sm mb-1 font-medium">Margin Warnings</div>
           <div className="text-2xl font-semibold text-red-600">{warningsCount}</div>
           <p className="text-xs text-slate-400 mt-2">Products below threshold</p>
        </div>
      </div>

      <div className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50">
           <h3 className="font-semibold text-slate-700 text-sm">Live Item Profitability</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="px-4 py-2 font-medium w-[120px]">Costing ID</th>
                <th className="px-4 py-2 font-medium">Product / Design</th>
                <th className="px-4 py-2 font-medium text-right">Raw Material</th>
                <th className="px-4 py-2 font-medium text-right">JobWork/Overhead</th>
                <th className="px-4 py-2 font-medium text-right">Total Cost</th>
                <th className="px-4 py-2 font-medium text-right">Sale Price</th>
                <th className="px-4 py-2 font-medium text-right">Live Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enhancedCostings.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No simulations recorded yet.</td></tr>
              ) : enhancedCostings.map((c: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-2 text-slate-700">
                      {c.id?.slice(0, 8) || `CST-${i}`}
                  </td>
                  <td className="px-4 py-2 text-slate-900 font-medium">{c.design}</td>
                  <td className="px-4 py-2 text-right text-slate-600">₹{(c.liveBaseCost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 text-right text-slate-600">₹{(c.liveOverhead || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 text-right font-medium text-slate-900">₹{(c.liveTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 text-right font-medium text-blue-700">₹{(c.salePrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 text-right">
                      <div className="flex flex-col items-end">
                         <div className="flex items-center gap-1.5 border border-slate-200 px-2 py-0.5 rounded shadow-sm bg-white">
                            <div className={`w-2 h-2 rounded-full ${(c.liveMargin || 0) >= 35 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="font-semibold text-slate-800">
                               {(c.liveMargin || 0).toFixed(1)}%
                            </span>
                            {Math.abs((c.liveMargin || 0) - (c.marginPct || 0)) > 0.1 && (
                               <span className={`text-[10px] ml-1 ${(c.liveMargin || 0) > (c.marginPct || 0) ? 'text-green-600' : 'text-red-500'}`} title={`Original simulation was ${(c.marginPct || 0).toFixed(1)}%`}>
                                  {(c.liveMargin || 0) > (c.marginPct || 0) ? '▲' : '▼'}
                               </span>
                            )}
                         </div>
                      </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-md shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                 <div className="px-6 py-4 flex justify-between items-center border-b border-slate-200">
                     <h3 className="font-semibold text-lg text-slate-800">New Costing Simulation</h3>
                     <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">×</button>
                 </div>
                 <div className="overflow-y-auto p-6 flex-1">
                   <form id="costing-form" onSubmit={handleSubmit} className="space-y-5">
                       <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Product / Design</label>
                           {designs && designs.length > 0 ? (
                             <select 
                               required 
                               className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                               value={formData.design}
                               onChange={e => handleDesignChange(e.target.value)}
                             >
                               <option value="">Select a Design</option>
                               {designs.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                               <option value="custom">-- Custom Product --</option>
                             </select>
                           ) : (
                             <input type="text" required className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" value={formData.design} onChange={e => setFormData({...formData, design: e.target.value})} placeholder="e.g. Silk Kurti A-Line" />
                           )}
                           {formData.design === 'custom' && (
                             <input type="text" required className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 mt-2" onChange={e => setFormData({...formData, design: e.target.value})} placeholder="Custom Design Name" />
                           )}
                       </div>
                       <div className="grid grid-cols-2 gap-5">
                           <div>
                               <label className="block text-sm font-medium text-slate-700 mb-1">Base RM Cost (₹)</label>
                               <input type="number" required className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" value={formData.baseCost || ''} onChange={e => {
                                   const val = Number(e.target.value);
                                   const totalCost = val + (formData.totalOverhead || 0);
                                   const marginPct = formData.salePrice ? ((formData.salePrice - totalCost) / formData.salePrice) * 100 : 0;
                                   setFormData({...formData, baseCost: val, totalCost, marginPct});
                               }} />
                           </div>
                           <div>
                               <label className="block text-sm font-medium text-slate-700 mb-1">Overhead/JobWork (₹)</label>
                               <input type="number" required className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" value={formData.totalOverhead || ''} onChange={e => {
                                   const val = Number(e.target.value);
                                   const totalCost = val + (formData.baseCost || 0);
                                   const marginPct = formData.salePrice ? ((formData.salePrice - totalCost) / formData.salePrice) * 100 : 0;
                                   setFormData({...formData, totalOverhead: val, totalCost, marginPct});
                               }} />
                           </div>
                       </div>
                       <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Target Sale Price (₹)</label>
                           <input type="number" required className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" value={formData.salePrice || ''} onChange={e => {
                               const val = Number(e.target.value);
                               const marginPct = val ? ((val - (formData.totalCost || 0)) / val) * 100 : 0;
                               setFormData({...formData, salePrice: val, marginPct});
                           }} />
                       </div>
                       
                       <div className="bg-slate-50 border border-slate-200 rounded p-4 flex justify-between items-center mt-2">
                           <div>
                              <span className="font-medium text-slate-600 text-sm">Simulated Margin</span>
                              <span className="text-xs text-slate-500 block">Total cost: ₹{(formData.totalCost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                           </div>
                           <span className={`font-semibold text-lg ${(formData.marginPct || 0) >= 35 ? 'text-green-600' : 'text-red-500'}`}>{(formData.marginPct || 0).toFixed(1)}%</span>
                       </div>
                   </form>
                 </div>
                 <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                     <button type="button" onClick={() => setShowModal(false)} className="px-4 py-1.5 border border-slate-300 rounded text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">Cancel</button>
                     <button type="submit" form="costing-form" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-medium shadow-sm transition-colors">Save Engine Log</button>
                 </div>
             </div>
          </div>
      )}
    </div>
  );
}
