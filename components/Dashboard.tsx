import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import {
  IndianRupee, AlertTriangle, Factory, Users,
  ShoppingCart, CheckCircle2, TrendingUp, Package,
  ArrowUpRight, ArrowDownRight, Activity, Settings, Plus,
  Truck, Receipt, FileText, ClipboardList,
  Briefcase, BookOpen, Layers, Wallet, ShieldCheck,
  FileSpreadsheet, Clock, ChevronRight, Zap,
  BarChart3, TrendingDown, Box, Scissors, RotateCcw,
  CheckCheck, Timer, Target, Star, Flame, Sparkles,
  ChevronDown, Search, Building2, Package2, Bell,
  LayoutDashboard, Calendar, LineChart, PieChartIcon, LucideIcon,
  BadgePercent, Coins, Fingerprint, MapPin, FlaskConical, BookMarked,
} from 'lucide-react';
import { InventoryItem, ProductionJob, Order, Machine, Karigar, ViewState } from '../types';
import { ERP_MODULE_GROUPS, MODULE_COLOR_MAP, ERPModuleGroupId } from '../modules/registry';

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

type WorkspaceTab = 'HOME' | 'SELLING' | 'BUYING' | 'MANUFACTURING' | 'STOCK' | 'ACCOUNTS' | 'HR';

const WORKSPACE_TABS: { id: WorkspaceTab; label: string; color: string; dot: string }[] = [
  { id: 'HOME',          label: 'Home',          color: 'text-slate-600 dark:text-slate-300',   dot: 'bg-slate-400' },
  { id: 'SELLING',       label: 'Selling',       color: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  { id: 'BUYING',        label: 'Buying',        color: 'text-amber-700 dark:text-amber-400',   dot: 'bg-amber-500' },
  { id: 'MANUFACTURING', label: 'Manufacturing', color: 'text-indigo-700 dark:text-indigo-400', dot: 'bg-indigo-500' },
  { id: 'STOCK',         label: 'Stock',         color: 'text-cyan-700 dark:text-cyan-400',     dot: 'bg-cyan-500' },
  { id: 'ACCOUNTS',      label: 'Accounts',      color: 'text-violet-700 dark:text-violet-400', dot: 'bg-violet-500' },
  { id: 'HR',            label: 'HR',            color: 'text-rose-700 dark:text-rose-400',     dot: 'bg-rose-500' },
];

interface ShortcutItem { label: string; view: ViewState; icon: LucideIcon; desc?: string }

const WORKSPACE_SHORTCUTS: Record<WorkspaceTab, ShortcutItem[]> = {
  HOME: [
    { label: 'Sales Order', view: 'ORDERS', icon: ShoppingCart, desc: 'New customer order' },
    { label: 'Purchase Order', view: 'PURCHASE_ORDER', icon: Package, desc: 'Reorder materials' },
    { label: 'Work Order', view: 'PRODUCTION', icon: Factory, desc: 'Start production' },
    { label: 'Material Request', view: 'MATERIAL_REQUEST', icon: ClipboardList, desc: 'Request materials' },
    { label: 'Quality Check', view: 'QUALITY', icon: ShieldCheck, desc: 'Inspect items' },
    { label: 'Stock Audit', view: 'STOCK_AUDIT', icon: FileSpreadsheet, desc: 'Physical count' },
    { label: 'Tax Invoice', view: 'TAX_INVOICE', icon: Receipt, desc: 'Create GST invoice' },
    { label: 'CRM / Leads', view: 'CRM', icon: Users, desc: 'Manage pipeline' },
  ],
  SELLING: [
    { label: 'Sales Order', view: 'ORDERS', icon: ShoppingCart, desc: 'New sale' },
    { label: 'Quotation', view: 'QUOTATION', icon: FileText, desc: 'Price quote' },
    { label: 'Tax Invoice', view: 'TAX_INVOICE', icon: Receipt, desc: 'GST invoice' },
    { label: 'Delivery Note', view: 'DELIVERY_CHALLAN', icon: Truck, desc: 'Dispatch goods' },
    { label: 'Sales Return', view: 'SALES_RETURN', icon: RotateCcw, desc: 'Customer return' },
    { label: 'Credit Note', view: 'CREDIT_NOTE', icon: Wallet, desc: 'Refund credit' },
    { label: 'Point of Sale', view: 'POS', icon: Zap, desc: 'Walk-in billing' },
    { label: 'CRM Leads', view: 'CRM', icon: Target, desc: 'Sales pipeline' },
  ],
  BUYING: [
    { label: 'Purchase Order', view: 'PURCHASE_ORDER', icon: Package, desc: 'Order materials' },
    { label: 'Material Request', view: 'MATERIAL_REQUEST', icon: ClipboardList, desc: 'Request stock' },
    { label: 'Supplier Quotation', view: 'SUPPLIER_QUOTATION', icon: FileText, desc: 'Get quotes' },
    { label: 'Purchase Receipt', view: 'PURCHASE_INWARD', icon: Box, desc: 'Receive goods' },
    { label: 'Purchase Invoice', view: 'PURCHASE_INVOICE', icon: Receipt, desc: 'Supplier bill' },
    { label: 'Purchase Return', view: 'PURCHASE_RETURN', icon: RotateCcw, desc: 'Return to supplier' },
    { label: 'Debit Note', view: 'DEBIT_NOTE', icon: Wallet, desc: 'Claim debit' },
    { label: 'Supplier List', view: 'SUPPLIERS', icon: Users, desc: 'Manage vendors' },
  ],
  MANUFACTURING: [
    { label: 'Work Order', view: 'PRODUCTION', icon: Factory, desc: 'Production job' },
    { label: 'Job Work', view: 'JOB_WORK', icon: Scissors, desc: 'Subcontract' },
    { label: 'Bill of Materials', view: 'DESIGN_RECIPE', icon: FlaskConical, desc: 'Material recipe' },
    { label: 'Sampling', view: 'SAMPLING', icon: Star, desc: 'Sample dev' },
    { label: 'Track Lots', view: 'TRACK_LOTS', icon: MapPin, desc: 'Lot traceability' },
    { label: 'Quality Control', view: 'QUALITY', icon: ShieldCheck, desc: 'QC inspection' },
    { label: 'Design Catalog', view: 'CATALOG', icon: FileSpreadsheet, desc: 'Product catalog' },
    { label: 'Workstations', view: 'PRODUCTION', icon: Settings, desc: 'Machine setup' },
  ],
  STOCK: [
    { label: 'Stock Entry', view: 'STOCK_TRANSFER', icon: Truck, desc: 'Transfer stock' },
    { label: 'Opening Stock', view: 'OPENING_STOCK', icon: Box, desc: 'Set balances' },
    { label: 'Item Master', view: 'INVENTORY', icon: Package, desc: 'Item list' },
    { label: 'Stock Reconciliation', view: 'STOCK_AUDIT', icon: CheckCheck, desc: 'Physical audit' },
    { label: 'Product Bundle', view: 'PACK_DESIGN', icon: Layers, desc: 'Bundle / kits' },
    { label: 'Product Catalog', view: 'CATALOG', icon: Star, desc: 'Design catalog' },
    { label: 'Lot Tracking', view: 'TRACK_LOTS', icon: Activity, desc: 'Batch trace' },
    { label: 'Material Request', view: 'MATERIAL_REQUEST', icon: ClipboardList, desc: 'Stock request' },
  ],
  ACCOUNTS: [
    { label: 'Journal Entry', view: 'ACCOUNTING', icon: BookOpen, desc: 'Manual posting' },
    { label: 'Payment Entry', view: 'CASH_BOOK', icon: Wallet, desc: 'Cash/bank entry' },
    { label: 'Chart of Accounts', view: 'CHART_OF_ACCOUNTS', icon: BarChart3, desc: 'Account tree' },
    { label: 'Sales Invoice', view: 'TAX_INVOICE', icon: Receipt, desc: 'GST invoice' },
    { label: 'Expense Claim', view: 'EXPENSE_CLAIM', icon: FileText, desc: 'Staff expenses' },
    { label: 'Karigar Ledger', view: 'KARIGAR_KHATA', icon: Coins, desc: 'Worker account' },
    { label: 'Agent Ledger', view: 'AGENT_KHATA', icon: BadgePercent, desc: 'Agent account' },
    { label: 'Credit Note', view: 'CREDIT_NOTE', icon: Wallet, desc: 'Refund credit' },
  ],
  HR: [
    { label: 'Attendance', view: 'ATTENDANCE', icon: Fingerprint, desc: 'Mark today' },
    { label: 'Employees', view: 'TEAM', icon: Users, desc: 'Staff list' },
    { label: 'Payroll', view: 'PAYROLL', icon: Wallet, desc: 'Salary slips' },
    { label: 'Karigars', view: 'KARIGARS', icon: Scissors, desc: 'Worker list' },
    { label: 'Leave Application', view: 'LEAVE_APP', icon: Clock, desc: 'Apply leave' },
    { label: 'Timesheets', view: 'TIMESHEET', icon: Timer, desc: 'Log hours' },
    { label: 'Expense Claims', view: 'EXPENSE_CLAIM', icon: Receipt, desc: 'Reimbursements' },
    { label: 'Agents', view: 'AGENTS', icon: Briefcase, desc: 'Sales agents' },
  ],
};

const MODULE_DOCTYPES: Record<WorkspaceTab, { label: string; view: ViewState; icon: LucideIcon }[]> = {
  HOME: [
    { label: 'Sales Order', view: 'ORDERS', icon: ShoppingCart },
    { label: 'Purchase Order', view: 'PURCHASE_ORDER', icon: Package },
    { label: 'Work Order', view: 'PRODUCTION', icon: Factory },
    { label: 'Stock Entry', view: 'STOCK_TRANSFER', icon: Truck },
    { label: 'Journal Entry', view: 'ACCOUNTING', icon: BookOpen },
    { label: 'Leave Application', view: 'LEAVE_APP', icon: Clock },
  ],
  SELLING: [
    { label: 'Quotation', view: 'QUOTATION', icon: FileText },
    { label: 'Sales Order', view: 'ORDERS', icon: ShoppingCart },
    { label: 'Delivery Note', view: 'DELIVERY_CHALLAN', icon: Truck },
    { label: 'Sales Invoice', view: 'TAX_INVOICE', icon: Receipt },
    { label: 'Customer', view: 'CUSTOMERS', icon: Users },
    { label: 'CRM Lead', view: 'CRM', icon: Target },
  ],
  BUYING: [
    { label: 'Material Request', view: 'MATERIAL_REQUEST', icon: ClipboardList },
    { label: 'Purchase Order', view: 'PURCHASE_ORDER', icon: Package },
    { label: 'Purchase Receipt', view: 'PURCHASE_INWARD', icon: Box },
    { label: 'Purchase Invoice', view: 'PURCHASE_INVOICE', icon: Receipt },
    { label: 'Supplier', view: 'SUPPLIERS', icon: Truck },
    { label: 'Supplier Quotation', view: 'SUPPLIER_QUOTATION', icon: FileText },
  ],
  MANUFACTURING: [
    { label: 'Work Order', view: 'PRODUCTION', icon: Factory },
    { label: 'Bill of Materials', view: 'DESIGN_RECIPE', icon: FlaskConical },
    { label: 'Quality Inspection', view: 'QUALITY', icon: ShieldCheck },
    { label: 'Subcontracting', view: 'JOB_WORK', icon: Scissors },
    { label: 'Sample Request', view: 'SAMPLING', icon: Star },
    { label: 'Lot Tracking', view: 'TRACK_LOTS', icon: MapPin },
  ],
  STOCK: [
    { label: 'Item', view: 'INVENTORY', icon: Package },
    { label: 'Stock Entry', view: 'STOCK_TRANSFER', icon: Truck },
    { label: 'Stock Reconciliation', view: 'STOCK_AUDIT', icon: CheckCheck },
    { label: 'Product Catalog', view: 'CATALOG', icon: Star },
    { label: 'Product Bundle', view: 'PACK_DESIGN', icon: Layers },
    { label: 'Fixed Asset', view: 'ASSETS', icon: Activity },
  ],
  ACCOUNTS: [
    { label: 'Journal Entry', view: 'ACCOUNTING', icon: BookOpen },
    { label: 'Payment Entry', view: 'CASH_BOOK', icon: Wallet },
    { label: 'Chart of Accounts', view: 'CHART_OF_ACCOUNTS', icon: BarChart3 },
    { label: 'Expense Claim', view: 'EXPENSE_CLAIM', icon: Receipt },
    { label: 'Karigar Ledger', view: 'KARIGAR_KHATA', icon: Coins },
    { label: 'Agent Ledger', view: 'AGENT_KHATA', icon: BadgePercent },
  ],
  HR: [
    { label: 'Employee', view: 'TEAM', icon: Users },
    { label: 'Attendance', view: 'ATTENDANCE', icon: Fingerprint },
    { label: 'Salary Slip', view: 'PAYROLL', icon: Wallet },
    { label: 'Leave Application', view: 'LEAVE_APP', icon: Clock },
    { label: 'Timesheet', view: 'TIMESHEET', icon: Timer },
    { label: 'Expense Claim', view: 'EXPENSE_CLAIM', icon: Receipt },
  ],
};

// Memoized stat card
const StatCard = React.memo(({
  label, value, subValue, icon: Icon, trend, color, onClick
}: {
  label: string; value: string | number; subValue?: string; icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral'; color: string; onClick?: () => void;
}) => {
  const colorMap: Record<string, string> = {
    emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    blue: 'from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-600 dark:text-blue-400',
    violet: 'from-violet-500/10 to-violet-500/5 border-violet-500/20 text-violet-600 dark:text-violet-400',
    amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400',
    rose: 'from-rose-500/10 to-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-400',
    indigo: 'from-indigo-500/10 to-indigo-500/5 border-indigo-500/20 text-indigo-600 dark:text-indigo-400',
  };
  const cls = colorMap[color] || colorMap.blue;
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      onClick={onClick}
      className={`rounded-2xl border bg-gradient-to-br p-4 cursor-pointer transition-shadow hover:shadow-md ${cls}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider opacity-70 mb-1">{label}</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-none">{value}</p>
          {subValue && <p className="text-[11px] opacity-60 mt-1 truncate">{subValue}</p>}
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/60 dark:bg-white/10`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
      {trend && (
        <div className={`mt-2 flex items-center gap-1 text-[11px] font-medium ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-500' : 'text-slate-400'}`}>
          {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : trend === 'down' ? <ArrowDownRight className="w-3 h-3" /> : null}
          <span>{trend === 'up' ? '+12% this month' : trend === 'down' ? '-3% this week' : 'Stable'}</span>
        </div>
      )}
    </motion.div>
  );
});

// Shortcut grid item
const ShortcutBtn = React.memo(({ item, onClick }: { item: ShortcutItem; onClick: () => void }) => (
  <motion.button
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-slate-200/70 dark:border-white/[0.07] bg-white dark:bg-white/[0.03] hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition-all group text-center"
  >
    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors">
      <item.icon className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-white" />
    </div>
    <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 leading-tight group-hover:text-slate-800 dark:group-hover:text-slate-200">{item.label}</p>
    {item.desc && <p className="text-[10px] text-slate-400 leading-tight hidden sm:block">{item.desc}</p>}
  </motion.button>
));

const Dashboard: React.FC<DashboardProps> = ({
  inventory, production, orders, currency = '₹',
  features, machines = [], karigars = [], setView,
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('HOME');

  const navigateTo = (view: ViewState) => setView?.(view);

  // Stats
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'PENDING').length;
  const completedOrders = orders.filter(o => o.status === 'FULFILLED' || o.status === 'COMPLETED').length;
  const totalRevenue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const lowStock = inventory.filter(i => i.quantity <= (i.minStockLevel || 10)).length;
  const inProduction = production.filter(p => p.status === 'IN_PROGRESS').length;
  const activeKarigars = karigars.filter(k => k.isActive !== false).length;

  // Chart data
  const monthlyData = useMemo(() => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const monthOrders = orders.filter(o => {
        const od = new Date(o.orderDate || o.createdAt || Date.now());
        return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
      });
      return {
        month: months[d.getMonth()],
        sales: monthOrders.reduce((s, o) => s + (o.totalAmount || 0), 0),
        orders: monthOrders.length,
      };
    });
  }, [orders]);

  const shortcuts = WORKSPACE_SHORTCUTS[activeTab];
  const doctypes = MODULE_DOCTYPES[activeTab];
  const activeTabInfo = WORKSPACE_TABS.find(t => t.id === activeTab)!;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Workspace Tabs — ERPNext-style */}
      <div className="shrink-0 border-b border-slate-200/60 dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.02] backdrop-blur-sm">
        <div className="flex items-center gap-0.5 px-4 overflow-x-auto scrollbar-none">
          {WORKSPACE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-[12px] font-semibold whitespace-nowrap border-b-2 transition-all relative ${
                activeTab === tab.id
                  ? `border-indigo-500 ${tab.color}`
                  : 'border-transparent text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${activeTab === tab.id ? tab.dot : 'bg-slate-300 dark:bg-slate-600'}`} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto"
          >
            {/* Home Tab — Stats + Charts */}
            {activeTab === 'HOME' && (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard label="Total Revenue" value={`${currency}${(totalRevenue/1000).toFixed(0)}K`} subValue={`${totalOrders} orders total`} icon={IndianRupee} color="emerald" trend="up" onClick={() => navigateTo('ORDERS')} />
                  <StatCard label="In Production" value={inProduction} subValue={`${production.length} work orders`} icon={Factory} color="indigo" trend="neutral" onClick={() => navigateTo('PRODUCTION')} />
                  <StatCard label="Pending Orders" value={pendingOrders} subValue={`${completedOrders} fulfilled`} icon={ShoppingCart} color="amber" trend={pendingOrders > 5 ? 'up' : 'neutral'} onClick={() => navigateTo('ORDERS')} />
                  <StatCard label="Low Stock Items" value={lowStock} subValue={`${inventory.length} total items`} icon={AlertTriangle} color={lowStock > 0 ? 'rose' : 'emerald'} trend={lowStock > 0 ? 'down' : 'neutral'} onClick={() => navigateTo('INVENTORY')} />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 rounded-2xl border border-slate-200/70 dark:border-white/[0.07] bg-white dark:bg-white/[0.02] p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Sales Trend</h3>
                        <p className="text-[11px] text-slate-400">Last 6 months revenue</p>
                      </div>
                      <button onClick={() => navigateTo('REPORTS')} className="text-[11px] text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1">
                        View Report <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                      <AreaChart data={monthlyData}>
                        <defs>
                          <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(255,255,255,0.95)' }} />
                        <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={2} fill="url(#salesGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rounded-2xl border border-slate-200/70 dark:border-white/[0.07] bg-white dark:bg-white/[0.02] p-4">
                    <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-100 mb-1">Activity</h3>
                    <p className="text-[11px] text-slate-400 mb-4">Quick metrics</p>
                    <div className="space-y-3">
                      {[
                        { label: 'Active Karigars', value: activeKarigars, icon: Scissors, color: 'text-indigo-500' },
                        { label: 'Active Machines', value: machines.length, icon: Settings, color: 'text-cyan-500' },
                        { label: 'Completed Orders', value: completedOrders, icon: CheckCircle2, color: 'text-emerald-500' },
                        { label: 'Stock Items', value: inventory.length, icon: Package2, color: 'text-amber-500' },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center shrink-0 ${row.color}`}>
                            <row.icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="flex-1 text-[12px] text-slate-600 dark:text-slate-400">{row.label}</span>
                          <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Shortcuts Grid — All Tabs */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
                    {activeTab === 'HOME' ? 'Quick Actions' : `${activeTabInfo.label} Shortcuts`}
                  </h2>
                  <p className="text-[11px] text-slate-400">Common tasks and documents</p>
                </div>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-2">
                {shortcuts.map((item) => (
                  <ShortcutBtn key={item.view + item.label} item={item} onClick={() => navigateTo(item.view)} />
                ))}
              </div>
            </div>

            {/* DocType List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Documents</h2>
                {activeTab !== 'HOME' && (
                  <button onClick={() => navigateTo('DOCUMENT_DESK')} className="text-[11px] text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1">
                    Open Desk <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {doctypes.map((dt) => (
                  <motion.button
                    key={dt.view}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => navigateTo(dt.view)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/70 dark:border-white/[0.07] bg-white dark:bg-white/[0.02] hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 transition-all group text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-indigo-500 transition-colors">
                      <dt.icon className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 truncate group-hover:text-slate-900 dark:group-hover:text-white">{dt.label}</p>
                      <p className="text-[10px] text-slate-400 truncate">→ Open list</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Module Overview Cards (Home only) */}
            {activeTab === 'HOME' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Modules</h2>
                  <button onClick={() => navigateTo('ERP_DESK')} className="text-[11px] text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1">
                    ERPNext Desk <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {ERP_MODULE_GROUPS.filter(g => features[g.id] !== false).map((group) => {
                    const colors = MODULE_COLOR_MAP[group.id as ERPModuleGroupId] || MODULE_COLOR_MAP['masters'];
                    const enabledCount = group.items.filter(i => features[i.id] !== false).length;
                    return (
                      <motion.div
                        key={group.id}
                        whileHover={{ y: -2, scale: 1.01 }}
                        onClick={() => setActiveTab((['workspace','selling','buying','manufacturing','stock','accounts_hr','masters'].indexOf(group.id) >= 0
                          ? ['HOME','SELLING','BUYING','MANUFACTURING','STOCK','ACCOUNTS','HR'][['workspace','selling','buying','manufacturing','stock','accounts_hr','masters'].indexOf(group.id)]
                          : 'HOME') as WorkspaceTab)}
                        className="rounded-2xl border border-slate-200/70 dark:border-white/[0.07] bg-white dark:bg-white/[0.02] p-3.5 cursor-pointer hover:shadow-md transition-all"
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${colors.bg}`}>
                          <group.icon className={`w-4.5 h-4.5 ${colors.text}`} />
                        </div>
                        <p className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{group.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{group.description}</p>
                        <div className={`mt-2 text-[10px] font-semibold ${colors.text}`}>{enabledCount} doctypes →</div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Dashboard;
