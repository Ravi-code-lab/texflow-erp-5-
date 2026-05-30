import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  IndianRupee, AlertTriangle, Factory, Users, 
  History, ShoppingCart, 
  CheckCircle2, TrendingUp, Package,
  ArrowUpRight, ArrowDownRight, Activity,
  ChevronDown, Settings, Plus, LayoutDashboard,
  Truck, Receipt, FileText, ClipboardList,
  Briefcase, Archive, BookOpen, Layers,
  Wallet, Megaphone, ShieldCheck, Mail, Phone,
  FileSpreadsheet, Sparkles, Filter, CheckCircle, Clock
} from 'lucide-react';
import { InventoryItem, ProductionJob, Order, Machine, Karigar, ViewState } from '../types';

interface DashboardProps {
  inventory: InventoryItem[];
  production: ProductionJob[];
  orders: Order[];
  currency?: string;
  features: Record<string, boolean>;
  machines?: Machine[];
  karigars?: Karigar[];
  setView?: (view: ViewState) => void;
}

type ERPWorkspaceType = 'HOME' | 'SELLING' | 'BUYING' | 'MANUFACTURING' | 'STOCK' | 'ACCOUNTS' | 'HR';

const Dashboard: React.FC<DashboardProps> = ({ 
  inventory, production, orders, currency = '₹', machines = [], karigars = [], setView 
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeWorkspace, setActiveWorkspace] = useState<ERPWorkspaceType>('HOME');
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);

  // Custom workspace items (Shortcuts or Cards added by user)
  const [customShortcuts, setCustomShortcuts] = useState<any[]>([]);
  const [shortcutName, setShortcutName] = useState('');
  const [shortcutTarget, setShortcutTarget] = useState<ViewState>('ORDERS');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    // Load custom dashboard items
    const saved = localStorage.getItem('erpnext_custom_shortcuts');
    if (saved) {
      try {
        setCustomShortcuts(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
    return () => clearInterval(timer);
  }, []);

  const handleAddShortcut = () => {
    if (!shortcutName.trim()) return;
    const newList = [...customShortcuts, { label: shortcutName.trim(), view: shortcutTarget }];
    setCustomShortcuts(newList);
    localStorage.setItem('erpnext_custom_shortcuts', JSON.stringify(newList));
    setShortcutName('');
    setIsCustomizeModalOpen(false);
  };

  const handleResetShortcuts = () => {
    setCustomShortcuts([]);
    localStorage.removeItem('erpnext_custom_shortcuts');
  };

  // --- Dynamic KPI Calculations ---
  const totalRevenue = useMemo(() => orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0), [orders]);
  const activeJobsCount = useMemo(() => production.filter(j => j.status !== 'READY').length, [production]);
  const lowStockItemsCount = useMemo(() => inventory.filter(i => i.quantity <= i.minStockLevel).length, [inventory]);
  const totalKarigarsCount = useMemo(() => karigars.length, [karigars]);

  // Pricing calculations
  const orderCount = orders.length;
  const pendingDeliveries = orders.filter(o => o.status === 'PENDING').length;
  const completedJobs = production.filter(j => j.status === 'READY').length;

  // --- Dynamic Revenue Trend Data (Last 7 Days) ---
  const revenueTrendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const dayTotal = orders
        .filter(o => o.orderDate === date)
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      
      const label = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { date: label, amount: dayTotal };
    });
  }, [orders]);

  // --- Dynamic Recent Activity Feed ---
  const recentActivity = useMemo(() => {
    const activities: { label: string; time: string; icon: any; color: string; timestamp: number }[] = [];

    orders.slice(0, 5).forEach(o => {
      activities.push({
        label: `Order #${o.id} for ${o.customerName}`,
        time: o.orderDate,
        icon: ShoppingCart,
        color: 'text-blue-500',
        timestamp: new Date(o.updatedAt || o.orderDate).getTime()
      });
    });

    production.slice(0, 5).forEach(j => {
      activities.push({
        label: `Job ${j.id}: ${j.status.toLowerCase()}`,
        time: j.startDate,
        icon: j.status === 'READY' ? CheckCircle2 : Factory,
        color: j.status === 'READY' ? 'text-emerald-500' : 'text-indigo-500',
        timestamp: new Date(j.updatedAt || j.startDate).getTime()
      });
    });

    inventory.filter(i => i.quantity <= i.minStockLevel).slice(0, 3).forEach(i => {
      activities.push({
        label: `Low Stock Request: ${i.name}`,
        time: 'Action Required',
        icon: AlertTriangle,
        color: 'text-amber-500',
        timestamp: Date.now()
      });
    });

    return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }, [orders, production, inventory]);

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 120 } }
  };

  const handleNav = (v: ViewState) => {
    if (setView) setView(v);
  };

  return (
    <div className="space-y-6 pb-12 text-left">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">ERPNext Workspace v15</span>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
               <Sparkles className="w-3 h-3 text-amber-500"/> Frappe Framework Engine Enabled
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2 tracking-tight">
            {activeWorkspace === 'HOME' ? 'Home Workspace' : `${activeWorkspace} Dashboard`}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {activeWorkspace === 'HOME' ? 'Real-time overview of your enterprise documents' : `Complete directory schema, stats and rapid launch points for ${activeWorkspace}`}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button 
             onClick={() => setIsCustomizeModalOpen(true)}
             className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
          >
             <Settings className="w-4 h-4 text-slate-500 animate-spin-slow"/> Customize Workspace
          </button>
          
          <div className="text-right hidden xl:block border-l border-slate-200 dark:border-slate-800 pl-4">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Frappe Clock</p>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      {/* Workspace Tabs Navigation (ERPNext Sidebar Style converted to top-tabs) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shrink-0 shadow-sm overflow-x-auto no-scrollbar">
         <div className="flex gap-1 min-w-max">
            {[
               { id: 'HOME', label: 'Home Workspace', emoji: '🏠' },
               { id: 'SELLING', label: 'Selling', emoji: '🛒' },
               { id: 'BUYING', label: 'Buying', emoji: '📦' },
               { id: 'MANUFACTURING', label: 'Manufacturing', emoji: '🏭' },
               { id: 'STOCK', label: 'Stock & Materials', emoji: '💠' },
               { id: 'ACCOUNTS', label: 'Accounting', emoji: '💳' },
               { id: 'HR', label: 'HR & Staffing', emoji: '👥' },
            ].map(ws => (
               <button 
                  key={ws.id} 
                  onClick={() => setActiveWorkspace(ws.id as ERPWorkspaceType)} 
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                     activeWorkspace === ws.id 
                       ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25' 
                       : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
               >
                 <span>{ws.emoji}</span> {ws.label}
               </button>
            ))}
         </div>
      </div>

      {/* Workspace Area render */}
      <AnimatePresence mode="wait">
        <motion.div 
           key={activeWorkspace}
           initial={{ opacity: 0, y: 5 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -5 }}
           transition={{ duration: 0.2 }}
           className="space-y-6"
        >
          {/* USER CUSTOMIZATIONS BAR */}
          {customShortcuts.length > 0 && (
             <div className="bg-gradient-to-r from-amber-500/5 to-yellow-500/5 border border-amber-500/20 rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase text-amber-600 tracking-wider mb-2 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5"/> User Custom Workspace Row</p>
                <div className="flex flex-wrap gap-2">
                   {customShortcuts.map((cs, idx) => (
                      <button 
                         key={idx} 
                         onClick={() => handleNav(cs.view)}
                         className="px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-amber-500/30 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-amber-500/10 transition-all flex items-center gap-1.5"
                      >
                         <Plus className="w-3 h-3 text-amber-500 rotate-45"/> {cs.label}
                      </button>
                   ))}
                </div>
             </div>
          )}

          {/* HOME WORKSPACE VIEW */}
          {activeWorkspace === 'HOME' && (
             <>
               {/* Stat cards (Frappe Number Cards) */}
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Annual Revenue (FY26)', val: `${currency}${totalRevenue.toLocaleString()}`, icon: IndianRupee, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', trend: 'Active Ledger' },
                    { label: 'Active Job Orders', val: activeJobsCount, icon: Factory, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', trend: 'In Manufacturing' },
                    { label: 'Total Registered Staff', val: totalKarigarsCount, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40', trend: 'Staff Module' },
                    { label: 'Low Stock Warnings', val: lowStockItemsCount, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/40', trend: 'Stock Module' }
                  ].map((card, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
                       <div className="flex justify-between items-start">
                         <div className={`p-2.5 rounded-xl ${card.bg} ${card.color} shrink-0`}>
                           <card.icon className="w-5 h-5" />
                         </div>
                         <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 px-2 py-0.5 rounded-md">{card.trend}</span>
                       </div>
                       <div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{card.label}</p>
                         <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums tracking-tight">{card.val}</h3>
                       </div>
                    </div>
                  ))}
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Revenue Chart */}
                 <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                   <div className="flex justify-between items-center mb-8">
                     <div>
                       <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wide">
                         <TrendingUp className="w-4 h-4 text-indigo-600" />
                         Revenue Performance Overview
                       </h3>
                       <p className="text-xs text-slate-500 mt-1">Frappe analytic tracker over current sales transactions</p>
                     </div>
                     <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-150 dark:border-slate-750">
                       7 Day Trend
                     </div>
                   </div>
                   <div className="h-[300px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={revenueTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                         <defs>
                           <linearGradient id="dashGradient" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                             <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                           </linearGradient>
                         </defs>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                         <XAxis 
                           dataKey="date" 
                           axisLine={false} 
                           tickLine={false} 
                           tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 500}} 
                           dy={10}
                         />
                         <YAxis 
                           axisLine={false} 
                           tickLine={false} 
                           tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 500}} 
                           tickFormatter={(v) => `${v/1000}k`} 
                         />
                         <Tooltip 
                           formatter={(val: any) => [`${currency}${Number(val).toLocaleString()}`, 'Revenue']}
                           cursor={{stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4'}} 
                           contentStyle={{
                             backgroundColor: 'rgba(255, 255, 255, 0.9)',
                             backdropFilter: 'blur(10px)',
                             borderRadius: '12px', 
                             border: '1px solid rgba(0, 0, 0, 0.1)', 
                             boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                             fontSize: '12px',
                             fontWeight: 'bold'
                           }}
                         />
                         <Area 
                           type="monotone" 
                           dataKey="amount" 
                           stroke="#6366f1" 
                           strokeWidth={3} 
                           fill="url(#dashGradient)" 
                           animationDuration={1000}
                         />
                       </AreaChart>
                     </ResponsiveContainer>
                   </div>
                 </div>

                 {/* Status Lists */}
                 <div className="space-y-6">
                    {/* Recent Activity */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col min-h-[380px] shadow-sm">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2 uppercase tracking-wide">
                        <History className="w-4 h-4 text-indigo-500" />
                        Live Feed Log
                      </h3>
                      <div className="space-y-1 flex-1 overflow-y-auto custom-scrollbar pr-1">
                        <AnimatePresence mode="popLayout">
                          {recentActivity.map((act, i) => (
                            <div 
                              key={act.timestamp + i}
                              className="flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group cursor-default"
                            >
                              <div className={`p-2 rounded-lg bg-slate-100 dark:bg-slate-800 ${act.color} shrink-0`}>
                                <act.icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug truncate">{act.label}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-medium">{act.time}</p>
                              </div>
                            </div>
                          ))}
                        </AnimatePresence>
                        {recentActivity.length === 0 && (
                          <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                            <Package className="w-10 h-10 mb-2"/>
                            <p className="text-[9px] font-bold uppercase tracking-widest">No Recent Activity</p>
                          </div>
                        )}
                      </div>
                    </div>
                 </div>
               </div>
             </>
          )}

          {/* DYNAMIC MODULES WORKSPACES (SELLING, BUYING, ETC.) */}
          {activeWorkspace !== 'HOME' && (
             <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* Left columns - Stats & Shortcuts */}
                <div className="lg:col-span-3 space-y-6">
                   
                   {/* Module Performance Number Cards */}
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {activeWorkspace === 'SELLING' && (
                         <>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Sales Invoiced</p>
                               <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{currency}{totalRevenue.toLocaleString()}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Order Documents</p>
                               <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{orderCount} Invoices</p>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Pending Orders</p>
                               <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{pendingDeliveries} Deliveries</p>
                            </div>
                         </>
                      )}
                      {activeWorkspace === 'BUYING' && (
                         <>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Active Raw Materials Items</p>
                               <p className="text-2xl font-black text-indigo-600 dark:text-white mt-1">{inventory.length} SKUs</p>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Supplier Contacts</p>
                               <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">Linked Records</p>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">GRN Status</p>
                               <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">Auto tracked</p>
                            </div>
                         </>
                      )}
                      {activeWorkspace === 'MANUFACTURING' && (
                         <>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Factory Machine Shards</p>
                               <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{machines.length} Mounted</p>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Active Lots Cutting</p>
                               <p className="text-2xl font-black text-indigo-600 mt-1">{production.filter(p => p.status === 'CUTTING').length} Lots</p>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Quality Passes</p>
                               <p className="text-2xl font-black text-emerald-600 mt-1">{completedJobs} Finished</p>
                            </div>
                         </>
                      )}
                      {activeWorkspace === 'STOCK' && (
                         <>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Global Inventory Balance</p>
                               <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{inventory.reduce((sum, item) => sum + (item.quantity || 0), 0).toLocaleString()} Units</p>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Critical Inventory Alerts</p>
                               <p className="text-2xl font-black text-rose-500 mt-1">{lowStockItemsCount} SKUs</p>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Custom Combo Packs</p>
                               <p className="text-2xl font-black text-indigo-600 mt-1">Multi pack active</p>
                            </div>
                         </>
                      )}
                      {activeWorkspace === 'ACCOUNTS' && (
                         <>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">General Ledger Entries</p>
                               <p className="text-2xl font-black text-indigo-600 dark:text-white mt-1">Indexed</p>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Gross Billings (Total)</p>
                               <p className="text-2xl font-black text-emerald-600 mt-1">{currency}{totalRevenue.toLocaleString()}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Cash Register Ledger</p>
                               <p className="text-2xl font-black text-slate-800 mt-1">Daily Logged</p>
                            </div>
                         </>
                      )}
                      {activeWorkspace === 'HR' && (
                         <>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Employee Roster Size</p>
                               <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">Active Staff</p>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Karigars Master count</p>
                               <p className="text-2xl font-black text-indigo-600 mt-1">{karigars.length} Contacts</p>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Timesheet Compliance</p>
                               <p className="text-2xl font-black text-emerald-600 mt-1">98% Logged</p>
                            </div>
                         </>
                      )}
                   </div>

                   {/* ERPNext Action Cards Shortcuts Hub */}
                   <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                      <div className="flex justify-between items-center border-b pb-3 mb-4">
                         <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse"/> Standard Frappe Shortcuts
                         </h3>
                         <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold tracking-tight">Rapid form launch</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                         {activeWorkspace === 'SELLING' && (
                            <>
                               {[
                                  { label: '+ Add Sales Order', view: 'ORDERS' as ViewState },
                                  { label: '+ Add Customer', view: 'CUSTOMERS' as ViewState },
                                  { label: '+ Dispatch Delivery', view: 'DELIVERY_CHALLAN' as ViewState },
                                  { label: 'View Invoices', view: 'TAX_INVOICE' as ViewState },
                                  { label: 'Sales Returns', view: 'SALES_RETURN' as ViewState },
                                  { label: 'Credit Note Grid', view: 'CREDIT_NOTE' as ViewState },
                                  { label: 'Lead CRM Portal', view: 'CRM' as ViewState }
                               ].map((sc, i) => (
                                  <button key={i} onClick={() => handleNav(sc.view)} className="p-4 bg-slate-50 dark:bg-slate-950 hover:bg-indigo-50 dark:hover:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-xl text-left text-xs font-black text-slate-700 dark:text-slate-300 transition-all uppercase tracking-tight">
                                     {sc.label}
                                  </button>
                               ))}
                            </>
                         )}
                         {activeWorkspace === 'BUYING' && (
                            <>
                               {[
                                  { label: '+ New Purchase Order', view: 'PURCHASE_ORDER' as ViewState },
                                  { label: '+ New Inward Receipt', view: 'PURCHASE_INWARD' as ViewState },
                                  { label: '+ New Supplier profile', view: 'SUPPLIERS' as ViewState },
                                  { label: 'Debit Notes Console', view: 'DEBIT_NOTE' as ViewState },
                                  { label: 'Vendor Returns List', view: 'PURCHASE_RETURN' as ViewState }
                               ].map((sc, i) => (
                                  <button key={i} onClick={() => handleNav(sc.view)} className="p-4 bg-slate-50 dark:bg-slate-950 hover:bg-indigo-50 dark:hover:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-xl text-left text-xs font-black text-slate-700 dark:text-slate-300 transition-all uppercase tracking-tight">
                                     {sc.label}
                                  </button>
                               ))}
                            </>
                         )}
                         {activeWorkspace === 'MANUFACTURING' && (
                            <>
                               {[
                                  { label: '+ New Production Job', view: 'PRODUCTION' as ViewState },
                                  { label: '+ New Formula BOM', view: 'DESIGN_RECIPE' as ViewState },
                                  { label: '+ Launch Sample order', view: 'SAMPLING' as ViewState },
                                  { label: 'Fabric Quality Check', view: 'QUALITY' as ViewState },
                                  { label: 'Godown Jobwork logs', view: 'JOB_WORK' as ViewState },
                                  { label: 'Active Lot Map', view: 'TRACK_LOTS' as ViewState }
                               ].map((sc, i) => (
                                  <button key={i} onClick={() => handleNav(sc.view)} className="p-4 bg-slate-50 dark:bg-slate-950 hover:bg-indigo-50 dark:hover:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-xl text-left text-xs font-black text-slate-700 dark:text-slate-300 transition-all uppercase tracking-tight">
                                     {sc.label}
                                  </button>
                               ))}
                            </>
                         )}
                         {activeWorkspace === 'STOCK' && (
                            <>
                               {[
                                  { label: '+ Record Stock Audit', view: 'STOCK_AUDIT' as ViewState },
                                  { label: '+ Move Stock (Transit)', view: 'STOCK_TRANSFER' as ViewState },
                                  { label: '+ Record Opening Stock', view: 'OPENING_STOCK' as ViewState },
                                  { label: 'Combo Creator', view: 'PACK_DESIGN' as ViewState },
                                  { label: 'Stock Levels Matrix', view: 'INVENTORY' as ViewState },
                                  { label: 'Catalog Lookup', view: 'CATALOG' as ViewState }
                               ].map((sc, i) => (
                                  <button key={i} onClick={() => handleNav(sc.view)} className="p-4 bg-slate-50 dark:bg-slate-950 hover:bg-indigo-50 dark:hover:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-xl text-left text-xs font-black text-slate-700 dark:text-slate-300 transition-all uppercase tracking-tight">
                                     {sc.label}
                                  </button>
                               ))}
                            </>
                         )}
                         {activeWorkspace === 'ACCOUNTS' && (
                            <>
                               {[
                                  { label: 'Ledger Audit List', view: 'ACCOUNTING' as ViewState },
                                  { label: 'Cash Book Journal', view: 'CASH_BOOK' as ViewState },
                                  { label: 'Karigars Ledger', view: 'KARIGAR_KHATA' as ViewState },
                                  { label: 'Agents ledger log', view: 'AGENT_KHATA' as ViewState },
                                  { label: 'Invoices grid view', view: 'TAX_INVOICE' as ViewState }
                               ].map((sc, i) => (
                                  <button key={i} onClick={() => handleNav(sc.view)} className="p-4 bg-slate-50 dark:bg-slate-950 hover:bg-indigo-50 dark:hover:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-xl text-left text-xs font-black text-slate-700 dark:text-slate-300 transition-all uppercase tracking-tight">
                                     {sc.label}
                                  </button>
                               ))}
                            </>
                         )}
                         {activeWorkspace === 'HR' && (
                            <>
                               {[
                                  { label: 'Staff Roster console', view: 'TEAM' as ViewState },
                                  { label: 'Check in / Shift grid', view: 'ATTENDANCE' as ViewState },
                                  { label: 'Karigars piece registers', view: 'KARIGARS' as ViewState },
                                  { label: 'Payroll adjustments', view: 'PAYROLL' as ViewState }
                               ].map((sc, i) => (
                                  <button key={i} onClick={() => handleNav(sc.view)} className="p-4 bg-slate-50 dark:bg-slate-950 hover:bg-indigo-50 dark:hover:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-xl text-left text-xs font-black text-slate-700 dark:text-slate-300 transition-all uppercase tracking-tight">
                                     {sc.label}
                                  </button>
                               ))}
                            </>
                         )}
                      </div>
                   </div>
                </div>

                {/* Right Column - Unified Document & Report Directories */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-6">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2 mb-2">DocType Directories</h4>
                   
                   {/* Documents Group */}
                   <div>
                      <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest pl-1">Documents / Lists</p>
                      <div className="mt-2 space-y-1">
                         {activeWorkspace === 'SELLING' && (
                            <>
                               {[
                                  { label: 'Customer Master', view: 'CUSTOMERS' as ViewState },
                                  { label: 'Sales Orders', view: 'ORDERS' as ViewState },
                                  { label: 'Delivery Challan', view: 'DELIVERY_CHALLAN' as ViewState },
                                  { label: 'Credit Note Ledger', view: 'CREDIT_NOTE' as ViewState },
                                  { label: 'Sales Returns', view: 'SALES_RETURN' as ViewState },
                               ].map((doc, idx) => (
                                  <button key={idx} onClick={() => handleNav(doc.view)} className="w-full text-left py-1.5 px-2 bg-slate-50 dark:bg-slate-950/20 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter flex justify-between items-center">
                                     <span>📄 {doc.label}</span>
                                     <span className="text-[8px] bg-slate-200 dark:bg-slate-800 px-1 rounded text-slate-500">DocType</span>
                                  </button>
                               ))}
                            </>
                         )}
                         {activeWorkspace === 'BUYING' && (
                            <>
                               {[
                                  { label: 'Supplier List', view: 'SUPPLIERS' as ViewState },
                                  { label: 'Purchase Orders', view: 'PURCHASE_ORDER' as ViewState },
                                  { label: 'Goods Inward Receipt', view: 'PURCHASE_INWARD' as ViewState },
                                  { label: 'Debit Notes Logs', view: 'DEBIT_NOTE' as ViewState },
                               ].map((doc, idx) => (
                                  <button key={idx} onClick={() => handleNav(doc.view)} className="w-full text-left py-1.5 px-2 bg-slate-50 dark:bg-slate-950/20 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter flex justify-between items-center">
                                     <span>📄 {doc.label}</span>
                                     <span className="text-[8px] bg-slate-200 dark:bg-slate-800 px-1 rounded text-slate-500">DocType</span>
                                  </button>
                               ))}
                            </>
                         )}
                         {activeWorkspace === 'MANUFACTURING' && (
                            <>
                               {[
                                  { label: 'Bill of Materials (BOM)', view: 'DESIGN_RECIPE' as ViewState },
                                  { label: 'Yarn Dyeing Process', view: 'DYEING_PROCESSING' as ViewState },
                                  { label: 'Manufacturing Job Card', view: 'PRODUCTION' as ViewState },
                                  { label: 'QC Audit Reports', view: 'QUALITY' as ViewState },
                               ].map((doc, idx) => (
                                  <button key={idx} onClick={() => handleNav(doc.view)} className="w-full text-left py-1.5 px-2 bg-slate-50 dark:bg-slate-950/20 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter flex justify-between items-center">
                                     <span>📄 {doc.label}</span>
                                     <span className="text-[8px] bg-slate-200 dark:bg-slate-800 px-1 rounded text-slate-500">DocType</span>
                                  </button>
                               ))}
                            </>
                         )}
                         {activeWorkspace === 'STOCK' && (
                            <>
                               {[
                                  { label: 'Stock Ledger List', view: 'INVENTORY' as ViewState },
                                  { label: 'Stock Reconciliation', view: 'STOCK_AUDIT' as ViewState },
                                  { label: 'Stock Transfers Log', view: 'STOCK_TRANSFER' as ViewState },
                                  { label: 'Combo Design Packs', view: 'PACK_DESIGN' as ViewState },
                               ].map((doc, idx) => (
                                  <button key={idx} onClick={() => handleNav(doc.view)} className="w-full text-left py-1.5 px-2 bg-slate-50 dark:bg-slate-950/20 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter flex justify-between items-center">
                                     <span>📄 {doc.label}</span>
                                     <span className="text-[8px] bg-slate-200 dark:bg-slate-800 px-1 rounded text-slate-500">DocType</span>
                                  </button>
                               ))}
                            </>
                         )}
                         {activeWorkspace === 'ACCOUNTS' && (
                            <>
                               {[
                                  { label: 'Acc Ledger Statement', view: 'ACCOUNTING' as ViewState },
                                  { label: 'Cash Register Ledger', view: 'CASH_BOOK' as ViewState },
                                  { label: 'Customer Invoices', view: 'TAX_INVOICE' as ViewState },
                                  { label: 'Supplier Ledger Accounts', view: 'SUPPLIERS' as ViewState },
                               ].map((doc, idx) => (
                                  <button key={idx} onClick={() => handleNav(doc.view)} className="w-full text-left py-1.5 px-2 bg-slate-50 dark:bg-slate-950/20 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter flex justify-between items-center">
                                     <span>📄 {doc.label}</span>
                                     <span className="text-[8px] bg-slate-200 dark:bg-slate-800 px-1 rounded text-slate-500">DocType</span>
                                  </button>
                               ))}
                            </>
                         )}
                         {activeWorkspace === 'HR' && (
                            <>
                               {[
                                  { label: 'Employee Registry', view: 'TEAM' as ViewState },
                                  { label: 'Timesheet Attendance', view: 'ATTENDANCE' as ViewState },
                                  { label: 'Karigar Piece Registry', view: 'KARIGARS' as ViewState },
                                  { label: 'Salary Ledger Slip', view: 'PAYROLL' as ViewState },
                               ].map((doc, idx) => (
                                  <button key={idx} onClick={() => handleNav(doc.view)} className="w-full text-left py-1.5 px-2 bg-slate-50 dark:bg-slate-950/20 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter flex justify-between items-center">
                                     <span>📄 {doc.label}</span>
                                     <span className="text-[8px] bg-slate-200 dark:bg-slate-800 px-1 rounded text-slate-500">DocType</span>
                                  </button>
                               ))}
                            </>
                         )}
                      </div>
                   </div>

                   {/* Configuration Setup Links */}
                   <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Configuration & Setup</p>
                      <div className="mt-2 space-y-1">
                         <button onClick={() => handleNav('SETTINGS')} className="w-full text-left py-1 p-2 bg-slate-50/50 dark:bg-slate-950/10 hover:bg-indigo-50 rounded text-[11px] font-bold text-slate-500 flex items-center justify-between">
                            <span>⚙️ System Preferences</span>
                            <span className="text-[8px] opacity-60">Frappe</span>
                         </button>
                         <button onClick={() => handleNav('SETTINGS')} className="w-full text-left py-1 p-2 bg-slate-50/50 dark:bg-slate-950/10 hover:bg-indigo-50 rounded text-[11px] font-bold text-slate-500 flex items-center justify-between">
                            <span>🛠️ DocType Field Designer</span>
                            <span className="text-[8px] text-indigo-500 font-extrabold">NEW</span>
                         </button>
                      </div>
                   </div>

                </div>
             </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* FRA-CUSTOMIZE MODAL DESIGN */}
      {isCustomizeModalOpen && (
         <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsCustomizeModalOpen(false)} />
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 text-slate-800 dark:text-slate-200">
               <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                     <Settings className="w-4 h-4 text-indigo-500 animate-spin-slow" /> Customize Workspace Dashboard
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Configure custom quick-action shortcut tiles for your unique operator desk.</p>
               </div>

               <div className="space-y-4">
                  <div className="space-y-1">
                     <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Button Label</label>
                     <input 
                        type="text"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                        placeholder="e.g. Add Cotton Dyeing Job"
                        value={shortcutName}
                        onChange={e => setShortcutName(e.target.value)}
                     />
                  </div>
                  
                  <div className="space-y-1">
                     <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">ERP Target View</label>
                     <select 
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold"
                        value={shortcutTarget}
                        onChange={e => setShortcutTarget(e.target.value as ViewState)}
                     >
                        <option value="ORDERS">Sales Orders Master</option>
                        <option value="PRODUCTION">Manufacturing Unit</option>
                        <option value="YARN_MANAGEMENT">Yarn Stock Console</option>
                        <option value="DYEING_PROCESSING">Dyeing Processing</option>
                        <option value="INVENTORY">Inventory Master Ledger</option>
                        <option value="SAMPLING">Samples Register</option>
                        <option value="TEAM">Employee Desk</option>
                     </select>
                  </div>
               </div>

               <div className="flex gap-3 pt-2">
                  <button 
                     type="button" 
                     onClick={handleResetShortcuts}
                     className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold uppercase hover:bg-red-500/10 hover:text-red-600 transition-all flex items-center gap-1"
                  >
                     Reset Saved
                  </button>
                  <button 
                     type="button" 
                     onClick={() => setIsCustomizeModalOpen(false)}
                     className="ml-auto px-4 py-2 text-xs font-bold uppercase text-slate-400 hover:text-slate-600"
                  >
                     Cancel
                  </button>
                  <button 
                     type="button" 
                     onClick={handleAddShortcut}
                     className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase"
                  >
                     Save Tile
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default Dashboard;
