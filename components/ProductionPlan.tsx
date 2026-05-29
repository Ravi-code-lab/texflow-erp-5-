import React, { useState, useMemo } from 'react';
import { Order as SalesOrder, Design, ProductionJob } from '../types';
import { Layers, Plus, Factory, ShoppingCart, ArrowRight, Settings } from 'lucide-react';

interface ProductionPlanProps {
  orders: SalesOrder[];
  designs: Design[];
  jobs: ProductionJob[];
  onAction?: (action: string, data: any) => void;
}

export default function ProductionPlan({ orders, designs, jobs, onAction }: ProductionPlanProps) {
  const [plans, setPlans] = useState<any[]>([]); // simplified local state for active session planning
  const [activePlan, setActivePlan] = useState<any | null>(null);

  const pendingOrders = useMemo(() => {
     return orders.filter(o => o.status !== 'FULFILLED' && o.status !== 'CANCELLED');
  }, [orders]);

  const handleCreatePlan = () => {
     setActivePlan({
       id: `PLAN-${Date.now().toString().slice(-4)}`,
       date: new Date().toISOString().split('T')[0],
       items: pendingOrders.flatMap((o: any) => o.items.map((i: any) => ({
         orderId: o.id,
         productName: i.productName,
         quantity: i.quantity,
         plannedQuantity: 0
       })))
     });
  };

  const handleGenerate = () => {
     if (!activePlan) return;
     if (onAction) {
       // Create work orders
       activePlan.items.filter((i: any) => i.plannedQuantity > 0).forEach((item: any) => {
          onAction('CONVERT_TO_WORK_ORDER_FROM_RECIPE', {
              name: item.productName,
              quantity: item.plannedQuantity,
              priority: 'NORMAL'
          });
       });

       // Create consolidated MR
       const combinedReqs: any[] = [];
       activePlan.items.filter((i: any) => i.plannedQuantity > 0).forEach((item: any) => {
          const design = designs.find((d: any) => d.name === item.productName);
          if (design && design.recipe) {
              design.recipe.forEach((r: any) => {
                 const req = {
                    productName: r.materialName,
                    quantity: r.quantity * item.plannedQuantity,
                 };
                 combinedReqs.push(req);
              });
          }
       });

       if (combinedReqs.length > 0) {
           onAction('CONVERT_TO_MATERIAL_REQUEST', {
              id: activePlan.id,
              recipe: combinedReqs
           });
       }

       alert('Work Orders and Material Requests Generated!');
       setActivePlan(null);
     }
  };

  if (!activePlan) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center bg-white p-6 rounded border border-[#d1d8dd] shadow-sm">
           <div>
              <h3 className="text-xl font-bold text-[#1c2126] flex items-center gap-2"><Layers className="w-6 h-6 text-[#2490ef]" /> Production Planning</h3>
              <p className="text-sm text-[#525c66] mt-1">Aggregate sales demand and generate bulk Work Orders & Material Requests.</p>
           </div>
           <button onClick={handleCreatePlan} className="h-9 px-4 bg-[#2490ef] hover:bg-[#2081d6] text-white rounded font-medium shadow-sm flex items-center gap-2 transition-all">
             <Plus className="w-4 h-4" /> New Production Plan
           </button>
        </div>

        <div className="grid grid-cols-3 gap-6">
           <div className="col-span-2 bg-white rounded border border-[#d1d8dd] shadow-sm p-5">
              <h4 className="font-bold text-[#1c2126] mb-4 flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Pending Demand (Sales Orders)</h4>
              <div className="space-y-3">
                 {pendingOrders.length === 0 && <p className="text-[#525c66] text-sm">No pending sales orders to fulfill.</p>}
                 {pendingOrders.map(o => (
                   <div key={o.id} className="p-3 border border-[#d1d8dd] rounded bg-[#fdfdfd] flex justify-between items-center text-sm">
                      <div>
                         <p className="font-bold text-[#1c2126]">Order {o.id}</p>
                         <p className="text-[#525c66] text-xs">Due: {o.dueDate ? o.dueDate.split('T')[0] : 'N/A'}</p>
                      </div>
                      <div className="text-right">
                         <span className="bg-[#e2e6ea] px-2 py-0.5 rounded text-xs font-bold text-[#525c66] uppercase">{o.status}</span>
                         <p className="font-medium text-[#1c2126] mt-1">{o.items.reduce((s: number,i: any)=>s+i.quantity,0)} Units</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
           <div className="bg-white rounded border border-[#d1d8dd] shadow-sm p-5">
              <h4 className="font-bold text-[#1c2126] mb-4 flex items-center gap-2"><Factory className="w-4 h-4" /> Active Work Orders</h4>
              <div className="space-y-2">
                 {jobs.slice(0, 5).map(j => (
                   <div key={j.id} className="p-2 bg-[#f4f5f6] rounded border border-[#d1d8dd] text-xs flex justify-between">
                     <span className="font-medium text-[#1c2126]">{j.id}</span>
                     <span className="text-[#525c66]">{j.status}</span>
                   </div>
                 ))}
                 {jobs.length === 0 && <p className="text-[#525c66] text-xs">No active work orders</p>}
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in bg-white p-6 rounded border border-[#d1d8dd] shadow-sm">
       <div className="flex justify-between items-center border-b border-[#d1d8dd] pb-4">
          <div>
            <h3 className="text-xl font-bold text-[#1c2126]">{activePlan.id}</h3>
            <p className="text-sm text-[#525c66]">Date: {activePlan.date}</p>
          </div>
          <div className="flex gap-2">
             <button onClick={() => setActivePlan(null)} className="px-4 py-2 bg-[#f4f5f6] hover:bg-[#e2e6ea] border border-[#d1d8dd] rounded font-medium text-[13px] text-[#1c2126] transition-all">Cancel</button>
             <button onClick={handleGenerate} className="px-4 py-2 bg-[#2490ef] hover:bg-[#2081d6] text-white rounded font-medium text-[13px] shadow-sm flex items-center gap-2 transition-all">
                <Settings className="w-4 h-4"/> Generate Work Orders
             </button>
          </div>
       </div>

       <div>
         <table className="w-full text-left text-sm">
            <thead className="bg-[#f4f5f6] text-[#525c66] uppercase text-[11px] font-bold">
               <tr>
                  <th className="p-3">Order Ref</th>
                  <th className="p-3">Item (BOM)</th>
                  <th className="p-3">Demand Qty</th>
                  <th className="p-3">Planned Qty</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-[#d1d8dd]">
               {activePlan.items.map((item: any, idx: number) => (
                 <tr key={idx} className="hover:bg-[#fdfdfd]">
                    <td className="p-3 text-[#525c66]">{item.orderId || 'Manual'}</td>
                    <td className="p-3 font-medium text-[#1c2126]">{item.productName}</td>
                    <td className="p-3 text-[#525c66]">{item.quantity}</td>
                    <td className="p-3">
                       <input 
                         type="number" 
                         value={item.plannedQuantity}
                         onChange={(e) => {
                            const newItems = [...activePlan.items];
                            newItems[idx].plannedQuantity = Number(e.target.value);
                            setActivePlan({...activePlan, items: newItems});
                         }}
                         className="w-24 px-2 py-1 bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] tabular-nums"
                       />
                    </td>
                 </tr>
               ))}
            </tbody>
         </table>
       </div>
    </div>
  );
}
