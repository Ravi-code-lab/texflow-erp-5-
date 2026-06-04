import React, { useState, useMemo } from 'react';
import { Order, Design, ProductionJob, OrderItem, RecipeItem } from '../types';
import { 
  Layers, Plus, Factory, ShoppingCart, ArrowRight, Settings, 
  CheckCircle2, AlertCircle, TrendingUp, DollarSign, Box, 
  Calendar, Cpu, FileText, ChevronRight, Scale, Sparkles, Scissors, Info
} from 'lucide-react';

interface ProductionPlanProps {
  orders: Order[];
  designs: Design[];
  jobs: ProductionJob[];
  inventory?: any[];
  onAction?: (action: string, data: any) => void;
}

// Simulated current raw material physical stock in godown storage
// Allows calculating real-time material shortages on the fly
const SIMULATED_MATERIAL_STOCK: Record<string, { stock: number; unit: string; ratePerUnit: number }> = {
  'Rayon Liva (140 GSM)': { stock: 1250, unit: 'Meters', ratePerUnit: 85 },
  'Cotton Cambric (80 GSM)': { stock: 3400, unit: 'Meters', ratePerUnit: 65 },
  'Premium Slub-Cotton': { stock: 680, unit: 'Meters', ratePerUnit: 110 },
  'Indigo Block dye paste': { stock: 25, unit: 'KG', ratePerUnit: 240 },
  'Standard polyester threads': { stock: 180, unit: 'Cones', ratePerUnit: 40 },
  'Zari Gold thread lace': { stock: 310, unit: 'Meters', ratePerUnit: 18 },
  'Designer Kurti neck buttons': { stock: 5000, unit: 'Pcs', ratePerUnit: 2 },
  'Summer Print Rayon Kurti (A-Line)': { stock: 200, unit: 'Meters', ratePerUnit: 85 },
  'Teal Neck Floral print': { stock: 1500, unit: 'Meters', ratePerUnit: 5 },
  'Ivory Cambric Office Shirt': { stock: 300, unit: 'Meters', ratePerUnit: 65 }
};

export default function ProductionPlan({ orders, designs, jobs, inventory = [], onAction }: ProductionPlanProps) {
  const [activePlan, setActivePlan] = useState<any | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const pendingOrders = useMemo(() => {
     return orders.filter(o => o.status !== 'FULFILLED' && o.status !== 'CANCELLED');
  }, [orders]);

  // Aggregate standard demand across all active sales orders to initiate a plan
  const handleCreatePlan = () => {
     const flatItems = pendingOrders.flatMap(o => (o.items || []).map((i: OrderItem) => {
       const design = designs.find(d => d.name === i.productName);
       return {
         orderId: o.id,
         customerName: o.customerName || 'Standard Client',
         dueDate: o.dueDate ? o.dueDate.split('T')[0] : 'N/A',
         productName: i.productName,
         quantity: i.quantity,
         plannedQuantity: i.quantity // default plan quantity matches the full outstanding order demand
       };
     }));

     setActivePlan({
       id: `PLAN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,5).toUpperCase()}`,
       date: new Date().toISOString().split('T')[0],
       items: flatItems
     });
  };

  // Creates a clean, empty micro-draft plan for manual item entry
  const handleCreateDraftPlan = () => {
    setActivePlan({
      id: `PLAN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,5).toUpperCase()}`,
      date: new Date().toISOString().split('T')[0],
      items: designs.slice(0, 2).map(d => ({
        orderId: 'MANUAL',
        customerName: 'Internal Buffer Stock',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        productName: d.name,
        quantity: 200,
        plannedQuantity: 200
      }))
    });
  };

  // Calculate detailed Bill of Material requirements and physical shortages
  const materialAnalysis = useMemo(() => {
    if (!activePlan || !activePlan.items) return [];

    // Build a live stock lookup from real inventory prop (name → qty, price)
    const liveStock: Record<string, { stock: number; unit: string; ratePerUnit: number }> = {};
    (inventory || []).forEach((item: any) => {
      if (item.name) {
        liveStock[item.name] = {
          stock: Number(item.quantity ?? 0),
          unit: item.unit || 'Units',
          ratePerUnit: Number(item.pricePerUnit ?? item.costPrice ?? 0),
        };
      }
    });

    const requirementsMap: Record<string, { materialName: string; requiredQty: number; unit: string; availableQty: number; ratePerUnit: number }> = {};

    (activePlan.items || []).forEach((item: any) => {
      const quantity = Number(item.plannedQuantity || 0);
      if (quantity <= 0) return;

      const design = designs.find(d => d.name === item.productName);
      
      // If the design has a detailed Bill of Materials (BOM) recipe, parse it
      if (design && design.recipe && design.recipe.length > 0) {
        design.recipe.forEach((r: RecipeItem) => {
          const name = r.materialName;
          const consumption = Number(r.quantity || 0);
          const totalNeeded = consumption * quantity;
          const unitStr = String(r.unit || 'Units');

          if (!requirementsMap[name]) {
            const stockData = liveStock[name] || { stock: 0, unit: unitStr, ratePerUnit: 0 };
            requirementsMap[name] = {
              materialName: name,
              requiredQty: 0,
              unit: stockData.unit,
              availableQty: stockData.stock,
              ratePerUnit: stockData.ratePerUnit
            };
          }
          requirementsMap[name].requiredQty += totalNeeded;
        });
      } else {
        // Fallback recipe (Standard fabric 1.8 meters per dress + thread)
        const principalFabricName = design?.composition || `${item.productName} Fabric`;
        if (!requirementsMap[principalFabricName]) {
          const stockData = liveStock[principalFabricName] || { stock: 0, unit: 'Meters', ratePerUnit: 0 };
          requirementsMap[principalFabricName] = {
            materialName: principalFabricName,
            requiredQty: 0,
            unit: stockData.unit,
            availableQty: stockData.stock,
            ratePerUnit: stockData.ratePerUnit
          };
        }
        requirementsMap[principalFabricName].requiredQty += (1.8 * quantity);

        const threadName = 'Standard polyester threads';
        if (!requirementsMap[threadName]) {
          const stockData = liveStock[threadName] || { stock: 0, unit: 'Cones', ratePerUnit: 0 };
          requirementsMap[threadName] = {
            materialName: threadName,
            requiredQty: 0,
            unit: stockData.unit,
            availableQty: stockData.stock,
            ratePerUnit: stockData.ratePerUnit
          };
        }
        requirementsMap[threadName].requiredQty += (0.05 * quantity);
      }
    });

    return Object.values(requirementsMap);
  }, [activePlan, designs, inventory]);

  // Total calculated material and labor costing to fabricate the plan
  const valuationTotals = useMemo(() => {
    let materialCostNum = 0;
    let laborCostNum = 0;

    materialAnalysis.forEach(item => {
      materialCostNum += (item.requiredQty * item.ratePerUnit);
    });

    if (activePlan?.items) {
      (activePlan.items || []).forEach((item: any) => {
        const qty = Number(item.plannedQuantity || 0);
        const design = designs.find(d => d.name === item.productName);
        if (design && design.laborCosts) {
          const pieceLabor = 
            Number(design.laborCosts.cutting || 0) +
            Number(design.laborCosts.stitching || 0) +
            Number(design.laborCosts.embroidery || 0) +
            Number(design.laborCosts.washing || 0) +
            Number(design.laborCosts.finishing || 0) +
            Number(design.laborCosts.printing || 0) +
            Number(design.laborCosts.packing || 0);
          laborCostNum += (pieceLabor > 0 ? pieceLabor * qty : 145 * qty);
        } else {
          laborCostNum += (145 * qty); // fallback estimated average labor rate
        }
      });
    }

    return {
      materialCost: Math.round(materialCostNum),
      laborCost: Math.round(laborCostNum),
      estimatedTotal: Math.round(materialCostNum + laborCostNum)
    };
  }, [materialAnalysis, activePlan, designs]);

  // Bulk converts planned quantities into workstation jobs and purchase material requests
  const handleGenerate = () => {
     if (!activePlan) return;
     
     if (onAction) {
       let raisedWorkOrdersCount = 0;

       // 1. Convert to individual work order jobs
       (activePlan.items || []).filter((i: any) => Number(i.plannedQuantity || 0) > 0).forEach((item: any) => {
          onAction('CONVERT_TO_WORK_ORDER_FROM_RECIPE', {
              name: item.productName,
              quantity: Number(item.plannedQuantity),
              priority: 'NORMAL',
              orderId: item.orderId !== 'MANUAL' ? item.orderId : undefined
          });
          raisedWorkOrdersCount++;
       });

       // 2. Aggregate raw material requirements to trigger consolidated purchase requests
       const materialShortages = materialAnalysis
         .filter(item => item.requiredQty > item.availableQty)
         .map(item => ({
            productName: item.materialName,
            quantity: Math.ceil(item.requiredQty - item.availableQty),
            unit: item.unit
         }));

       if (materialShortages.length > 0) {
          onAction('CONVERT_TO_MATERIAL_REQUEST', {
             id: activePlan.id,
             recipe: materialShortages
          });
       }

       setSuccessMsg(`Draft verified! Successfully generated ${raisedWorkOrdersCount} Work Order lines under ${activePlan.id}. Raised Material Purchase Request for shortage items.`);
       setTimeout(() => setSuccessMsg(null), 8000);
       setActivePlan(null);
     }
  };

  const handleAddNewItemToPlan = () => {
    if (!activePlan) return;
    const defaultDesign = designs[0]?.name || '';
    const updated = [
      ...activePlan.items,
      {
        orderId: 'MANUAL',
        customerName: 'Internal stock buffer',
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        productName: defaultDesign,
        quantity: 100,
        plannedQuantity: 100
      }
    ];
    setActivePlan({ ...activePlan, items: updated });
  };

  const handleRemoveItemFromPlan = (idx: number) => {
    if (!activePlan) return;
    const filtered = (activePlan.items || []).filter((_: any, i: number) => i !== idx);
    setActivePlan({ ...activePlan, items: filtered });
  };

  return (
    <div className="space-y-6">
      
      {/* Top statistical summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Fulfillable Demand', value: `${pendingOrders.length} Sales Orders`, icon: ShoppingCart, color: 'text-indigo-600', desc: 'Awaiting shop floor dispatch' },
          { label: 'Calculated Deficiencies', value: materialAnalysis.filter(item => item.requiredQty > item.availableQty).length, icon: AlertCircle, color: 'text-amber-500', desc: 'Items with raw material shortages' },
          { label: 'Shop Floor Queue', value: `${jobs.length} Active Jobs`, icon: Factory, color: 'text-emerald-600', desc: 'Units currently in workstation pipeline' },
          { label: 'Estimated Plan Valuation', value: `₹${valuationTotals.estimatedTotal.toLocaleString()}`, icon: DollarSign, color: 'text-slate-700', desc: 'Labor + raw fabric aggregate' }
        ].map((item) => (
          <div key={item.label} className="bg-white border rounded-2xl p-4 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-slate-50 ${item.color}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</span>
              <p className="text-base font-extrabold text-slate-800 tracking-tight mt-0.5">{item.value}</p>
              <p className="text-[9px] text-slate-400 font-medium mt-0.5">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-250 text-emerald-900 rounded-xl p-4 text-xs flex items-center gap-2 font-bold animate-pulse">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main planner board toggle */}
      {!activePlan ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          
          {/* Fulfillable Demand / Sales Orders list */}
          <div className="xl:col-span-2 bg-white border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-indigo-500" />
                  Outstanding Demand Book (Sales Orders)
                </h3>
                <p className="text-xs text-slate-400 font-semibold mt-1">Pending order quantities from clients requesting custom garment batches.</p>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={handleCreateDraftPlan}
                  className="px-3.5 py-2 hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                >
                  Create Trial Plan
                </button>
                <button 
                  onClick={handleCreatePlan}
                  className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold tracking-tight px-3.5 py-2 rounded-lg transition-colors shadow-sm"
                >
                  <Layers className="w-4 h-4" />
                  <span>Pull Active Demand</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {pendingOrders.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-xl text-slate-400 text-xs font-bold">
                  All active sales order batches are dispatched to production or completed!
                </div>
              ) : (
                pendingOrders.map(order => (
                  <div key={order.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/20 hover:border-slate-300 hover:bg-slate-50/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                     <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-indigo-600 font-mono">#{order.id}</span>
                          <span className="text-xs font-bold text-slate-800">{order.customerName}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                           <Calendar className="w-3.5 h-3.5" /> Due Date: {order.dueDate ? order.dueDate.split('T')[0] : 'Not specified'}
                        </p>
                     </div>
                     <div className="flex items-center gap-4">
                        <div className="text-right">
                           <span className="bg-slate-100 px-2 py-0.5 rounded text-[9px] font-black uppercase text-slate-500 tracking-wider">
                             Fulfill Pending
                           </span>
                           <p className="text-sm font-black text-slate-800 mt-1">
                             {(order.items || []).reduce((s, i) => s + i.quantity, 0)} Units
                           </p>
                        </div>
                        <span className="p-1 px-2 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg select-none cursor-pointer" onClick={handleCreatePlan}>
                          Load
                        </span>
                     </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Job List summary */}
          <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
              <Factory className="w-4 h-4 text-indigo-500" />
              Active Job Slots
            </h3>
            <p className="text-[11px] text-slate-400 font-black tracking-wider uppercase">Pipeline Queue</p>

            <div className="space-y-2.5 max-h-72 overflow-y-auto no-scrollbar">
              {jobs.slice(0, 10).map(j => (
                <div key={j.id} className="p-3 border border-slate-100 bg-slate-50/20 rounded-xl flex items-center justify-between text-xs hover:border-slate-200 transition-colors">
                  <div>
                    <p className="font-extrabold text-slate-800 font-mono">#{j.id}</p>
                    <p className="text-[10px] text-slate-400 font-bold truncate max-w-[150px]">{j.productName}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase">
                      {j.status}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1 font-semibold">{j.quantity} Pcs</p>
                  </div>
                </div>
              ))}
              {jobs.length === 0 && (
                <p className="text-slate-400 text-xs font-bold text-center py-6">No jobs currently loaded.</p>
              )}
            </div>
          </div>

        </div>
      ) : (
        /* Plan Workbench Active Workspace */
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          
          {/* Active quantities workbench */}
          <div className="xl:col-span-2 bg-white border rounded-2xl p-6 shadow-sm space-y-6">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-600 animate-pulse" />
                    Production Plan: {activePlan.id}
                  </h2>
                  <p className="text-xs text-slate-400 font-bold mt-1">Creation Date: {activePlan.date} • Adjust planned limits to verify material load allocation</p>
                </div>
                
                <div className="flex gap-2">
                   <button 
                     onClick={() => setActivePlan(null)} 
                     className="px-3.5 py-2 hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                   >
                     Abort Draft
                   </button>
                   <button 
                     onClick={handleGenerate} 
                     className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold tracking-tight px-4 py-2 rounded-lg transition-colors shadow-sm"
                   >
                      <Settings className="w-4 h-4 animate-spin"/> 
                      <span>Verify & Release Jobs</span>
                   </button>
                </div>
             </div>

             <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">Garments in planning scope</h3>
                  <button 
                    onClick={handleAddNewItemToPlan}
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {(activePlan.items || []).map((item: any, idx: number) => (
                    <div key={(item as any).id || (item as any).designName + idx} className="p-4 border border-slate-200 hover:border-slate-300 rounded-xl bg-slate-50/10 flex flex-col sm:flex-row sm:items-center gap-4">
                       <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-extrabold uppercase text-indigo-600 tracking-tight">SO Ref: {item.orderId || 'Manual Build'}</p>
                          
                          <select 
                            value={item.productName}
                            onChange={(e) => {
                              const newItems = [...activePlan.items];
                              newItems[idx].productName = e.target.value;
                              setActivePlan({...activePlan, items: newItems});
                            }}
                            className="bg-transparent border-b border-dashed border-slate-300 focus:outline-none text-sm font-black text-slate-800 py-1"
                          >
                            {designs.map(d => (
                              <option key={d.id} value={d.name}>{d.name}</option>
                            ))}
                          </select>
                          
                          <p className="text-[10px] text-slate-400 font-bold mt-1">Due Date: {item.dueDate} • Customer: {item.customerName}</p>
                       </div>

                       <div className="flex items-center gap-4 shrink-0">
                          <div className="text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">SO Target</span>
                            <span className="text-xs font-bold text-slate-500">{item.quantity} units</span>
                          </div>
                          
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Plan Quantity</span>
                            <div className="flex items-center gap-2 mt-1">
                              <input 
                                type="number" 
                                value={item.plannedQuantity}
                                onChange={(e) => {
                                   const newItems = [...activePlan.items];
                                   newItems[idx].plannedQuantity = Number(e.target.value);
                                   setActivePlan({...activePlan, items: newItems});
                                }}
                                className="w-24 text-xs px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 border border-slate-200 rounded-lg text-slate-700 font-bold tabular-nums bg-white shadow-inner"
                              />
                              <button 
                                onClick={() => handleRemoveItemFromPlan(idx)}
                                className="p-1 px-1.5 rounded-md hover:bg-rose-50 text-rose-500 transition-colors"
                                title="Exclude from scope"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                       </div>
                    </div>
                  ))}
                  {activePlan.items.length === 0 && (
                    <p className="text-center py-8 text-xs text-slate-400">Add garment items to the planning scope to run BOM calculations.</p>
                  )}
                </div>
             </div>

             {/* Gantt Schedule visual simulation */}
             <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/20 space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Simulated Gantt Route Milestones</h4>
                </div>
                
                <div className="space-y-3.5">
                  {[
                    { op: 'Fabric Allocation & Sizing', days: 'Day 1-2', percent: 22, color: 'bg-indigo-600' },
                    { op: 'Dyeing / Embroidery / Block Prints', days: 'Day 3-5', percent: 45, color: 'bg-amber-500' },
                    { op: 'Stitching / In-Line Assembly', days: 'Day 6-8', percent: 80, color: 'bg-rose-500' },
                    { op: 'Finishing & Final Ready Pack', days: 'Day 9+', percent: 100, color: 'bg-emerald-500' }
                  ].map((phase, i) => (
                    <div key={phase.op} className="space-y-1.5">
                      <div className="flex justify-between items-center text-[11px] font-bold text-slate-600">
                        <span>Phase {i+1}: {phase.op}</span>
                        <span className="font-mono text-[10px] text-slate-400">{phase.days}</span>
                      </div>
                      <div className="h-1 bg-slate-200/60 rounded-full overflow-hidden">
                        <div className={`h-full ${phase.color}`} style={{ width: `${phase.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>

          {/* Dynamic bill of materials breakdown and physical stocks */}
          <div className="space-y-6">
            
            {/* BOM Shortage checker */}
            <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b pb-2">
                <Box className="w-4.5 h-4.5 text-indigo-500 animate-pulse" />
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">Raw Material Stock Audit</h3>
              </div>
              <p className="text-xs text-slate-400 font-semibold">Real-time allocation requirements and shortage diagnostics across godown inventories.</p>

              <div className="space-y-3">
                {materialAnalysis.map(item => {
                  const shortage = item.requiredQty > item.availableQty ? item.requiredQty - item.availableQty : 0;
                  const ratio = Math.min(100, (item.availableQty / (item.requiredQty || 1)) * 100);
                  
                  return (
                    <div key={item.materialName} className="p-3 rounded-xl border border-slate-100 bg-slate-50/20 space-y-2">
                      <div className="flex justify-between items-start text-xs font-bold">
                        <span className="text-slate-800 text-xs truncate max-w-[150px]">{item.materialName}</span>
                        {shortage > 0 ? (
                          <span className="text-[10px] bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded text-rose-600 font-extrabold">
                            Shortage: {Math.ceil(shortage).toLocaleString()} {item.unit}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded text-emerald-600 font-extrabold">
                            Stock Secured
                          </span>
                        )}
                      </div>

                      <div className="flex items-end justify-between text-[11px] text-slate-500">
                        <span>Required: {Math.ceil(item.requiredQty).toLocaleString()} {item.unit}</span>
                        <span className="font-mono text-[10px]">Stock: {item.availableQty.toLocaleString()}</span>
                      </div>

                      <div className="h-1 bg-slate-200/50 rounded-full overflow-hidden">
                        <div className={`h-full ${shortage > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${ratio}%` }} />
                      </div>
                    </div>
                  );
                })}
                {materialAnalysis.length === 0 && (
                  <p className="text-center py-6 text-xs text-slate-400">Add plan items to run dynamic stock audits.</p>
                )}
              </div>
            </div>

            {/* Plan Valuation detailed summary & profitability */}
            <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b pb-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider font-sans">Valuation Estimation Breakdown</h3>
              </div>

              <div className="space-y-2.5">
                {[
                  { label: 'Raw Fabrics & Materials', val: valuationTotals.materialCost },
                  { label: 'Estimated Tailoring/Labor Fees', val: valuationTotals.laborCost },
                  { label: 'Overhead & Machinery Wear (Sim.)', val: Math.round(valuationTotals.estimatedTotal * 0.08) }
                ].map((cost, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs font-bold text-slate-600">
                    <span>{cost.label}</span>
                    <span className="tabular-nums text-slate-700">₹{cost.val.toLocaleString()}</span>
                  </div>
                ))}
                
                <div className="border-t pt-3 flex justify-between items-center text-sm font-black text-indigo-900">
                  <span className="uppercase tracking-wide">Grand Job Setup Valuation</span>
                  <span className="tabular-nums">₹{valuationTotals.estimatedTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

// Help type-safety import of Trash2
function Trash2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}
