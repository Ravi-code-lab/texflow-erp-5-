import {
  Activity, Archive, ArrowRightLeft, ArrowUpCircle, Banknote, BarChart4, Bell, BookOpen,
  Boxes, Briefcase, Car, CheckSquare, ClipboardList, Coins, Database, Factory,
  FileCheck, FileSpreadsheet, FileText, Fingerprint, FlaskConical, FlaskRound,
  GitBranch, Home, Landmark, Layers, LayoutDashboard, LucideIcon, MapPin,
  Megaphone, Monitor, Palette, PhoneCall, Receipt, Scissors, SearchCheck,
  Settings, ShieldCheck, ShoppingBag, ShoppingCart, Truck, Undo2, UserCircle,
  Users, Wallet, TrendingUp, PieChart, CalendarDays, FileBarChart2,
  Workflow, BarChart2, PackageSearch, Tag, Building2, BadgePercent,
  CreditCard, Inbox, Star, HelpCircle, Globe, Zap, LifeBuoy, ChevronRight,
  MessageSquare, Clock, Award, BarChart3,
} from 'lucide-react';
import { ViewState } from '../types';

export type ERPModuleGroupId =
  | 'workspace'
  | 'selling'
  | 'buying'
  | 'manufacturing'
  | 'stock'
  | 'accounts_hr'
  | 'masters'
  | 'analytics';

export interface ERPModuleItem {
  id: ViewState;
  label: string;
  doctype: string;
  module: ERPModuleGroupId | 'core';
  icon: LucideIcon;
  color?: string;
  description?: string;
  keywords?: string[];
  badge?: string;
}

export interface ERPModuleGroup {
  id: ERPModuleGroupId;
  title: string;
  icon: LucideIcon;
  color: string;
  accentColor: string;
  description: string;
  items: ERPModuleItem[];
}

export const HOME_MODULE: ERPModuleItem = {
  id: 'DASHBOARD',
  label: 'Home',
  doctype: 'Workspace',
  module: 'core',
  icon: Home,
  keywords: ['dashboard', 'desk', 'home'],
};

export const SETTINGS_MODULE: ERPModuleItem = {
  id: 'SETTINGS',
  label: 'Settings',
  doctype: 'System Settings',
  module: 'core',
  icon: Settings,
  keywords: ['setup', 'company', 'preferences'],
};

export const UPGRADE_MODULE: ERPModuleItem = {
  id: 'UPGRADE',
  label: 'Software Upgrade',
  doctype: 'Patch Log',
  module: 'core',
  icon: ArrowUpCircle,
  keywords: ['update', 'version', 'changelog', 'migration', 'patch', 'release'],
};

export const ERP_MODULE_GROUPS: ERPModuleGroup[] = [
  {
    id: 'workspace',
    title: 'Workspace',
    icon: LayoutDashboard,
    color: 'sky',
    accentColor: '#0284c7',
    description: 'Manage tasks, documents, workflows and team collaboration',
    items: [
      { id: 'TASKS', label: 'Tasks', doctype: 'Task', module: 'workspace', icon: CheckSquare, description: 'Manage team tasks and to-dos', keywords: ['todo', 'checklist', 'to-do'] },
      { id: 'TIMESHEET', label: 'Timesheet', doctype: 'Timesheet', module: 'workspace', icon: Clock, description: 'Log hours against projects and tasks' },
      { id: 'PROJECTS', label: 'Projects', doctype: 'Project', module: 'workspace', icon: Briefcase, description: 'Track projects and milestones' },
      { id: 'ERP_DESK', label: 'ERPNext Desk', doctype: 'Module Def', module: 'workspace', icon: LayoutDashboard, description: 'ERPNext-style module manager and workspace', keywords: ['erpnext', 'module manager', 'workspace', 'desk', 'frappe'] },
      { id: 'DOCUMENT_DESK', label: 'Document Desk', doctype: 'Document', module: 'workspace', icon: FileCheck, description: 'Generic form view for any doctype', keywords: ['form view', 'list view', 'document entry'] },
      { id: 'DATA_IMPORT', label: 'Data Import', doctype: 'Data Import', module: 'workspace', icon: FileSpreadsheet, description: 'Bulk import records from CSV/Excel', keywords: ['csv', 'xlsx', 'excel', 'bulk import', 'template'] },
      { id: 'DOCTYPE_CENTER', label: 'DocType Center', doctype: 'DocType', module: 'workspace', icon: Database, description: 'View and manage DocType schemas', keywords: ['doctype', 'schema', 'metadata', 'form builder'] },
      { id: 'WORKFLOW_INBOX', label: 'Workflow Inbox', doctype: 'Workflow Action', module: 'workspace', icon: GitBranch, description: 'Pending approvals and workflow actions', keywords: ['approval', 'workflow', 'submit', 'pending'] },
      { id: 'REPORT_BUILDER', label: 'Report Builder', doctype: 'Report', module: 'workspace', icon: BarChart4, description: 'Build custom query and script reports', keywords: ['query report', 'script report', 'export', 'analytics'] },
      { id: 'NOTIFICATIONS', label: 'Notifications', doctype: 'Notification Log', module: 'workspace', icon: Bell, description: 'System alerts and notifications' },
      { id: 'AUDIT_TRAIL', label: 'Audit Trail', doctype: 'Version', module: 'workspace', icon: ShieldCheck, description: 'Full activity and version history log', keywords: ['activity log', 'version history', 'audit'] },
      { id: 'TEAM', label: 'Team', doctype: 'Employee', module: 'workspace', icon: Users, description: 'Manage team members and employees' },
    ],
  },
  {
    id: 'selling',
    title: 'Selling',
    icon: ShoppingCart,
    color: 'emerald',
    accentColor: '#059669',
    description: 'Manage sales orders, invoices, customers and CRM',
    items: [
      { id: 'QUOTATION', label: 'Quotation', doctype: 'Quotation', module: 'selling', icon: FileText, description: 'Create price quotations for customers' },
      { id: 'ORDERS', label: 'Sales Order', doctype: 'Sales Order', module: 'selling', icon: ShoppingCart, description: 'Confirmed customer purchase orders' },
      { id: 'POS', label: 'Point of Sale', doctype: 'POS Invoice', module: 'selling', icon: Monitor, description: 'Walk-in retail billing and invoicing' },
      { id: 'DELIVERY_CHALLAN', label: 'Delivery Note', doctype: 'Delivery Note', module: 'selling', icon: Truck, description: 'Record goods dispatched to customers' },
      { id: 'TAX_INVOICE', label: 'Sales Invoice', doctype: 'Sales Invoice', module: 'selling', icon: Receipt, description: 'GST tax invoices and billing' },
      { id: 'SALES_RETURN', label: 'Sales Return', doctype: 'Sales Return', module: 'selling', icon: Undo2, description: 'Process customer returns and refunds' },
      { id: 'CREDIT_NOTE', label: 'Credit Note', doctype: 'Credit Note', module: 'selling', icon: Banknote, description: 'Issue credit notes against sales invoices' },
      { id: 'CRM', label: 'CRM / Leads', doctype: 'Lead', module: 'selling', icon: Megaphone, description: 'Track leads and sales opportunities', keywords: ['lead', 'opportunity', 'prospect', 'pipeline'] },
      { id: 'SUPPORT_TICKET', label: 'Support Ticket', doctype: 'Issue', module: 'selling', icon: PhoneCall, description: 'Customer support issues and requests' },
    ],
  },
  {
    id: 'buying',
    title: 'Buying',
    icon: ShoppingBag,
    color: 'amber',
    accentColor: '#d97706',
    description: 'Manage procurement, purchase orders and suppliers',
    items: [
      { id: 'MATERIAL_REQUEST', label: 'Material Request', doctype: 'Material Request', module: 'buying', icon: FileCheck, description: 'Request materials from warehouse or vendor' },
      { id: 'SUPPLIER_QUOTATION', label: 'Supplier Quotation', doctype: 'Supplier Quotation', module: 'buying', icon: Receipt, description: 'Compare supplier price quotes' },
      { id: 'PURCHASE_ORDER', label: 'Purchase Order', doctype: 'Purchase Order', module: 'buying', icon: FileText, description: 'Formal orders placed with suppliers' },
      { id: 'PURCHASE_INWARD', label: 'Purchase Receipt', doctype: 'Purchase Receipt', module: 'buying', icon: ArrowRightLeft, description: 'Record goods received from suppliers' },
      { id: 'PURCHASE_INVOICE', label: 'Purchase Invoice', doctype: 'Purchase Invoice', module: 'buying', icon: Receipt, description: 'Supplier bills and purchase invoices' },
      { id: 'PURCHASE_RETURN', label: 'Purchase Return', doctype: 'Purchase Return', module: 'buying', icon: Undo2, description: 'Return goods to suppliers' },
      { id: 'DEBIT_NOTE', label: 'Debit Note', doctype: 'Debit Note', module: 'buying', icon: Banknote, description: 'Issue debit notes against purchase invoices' },
    ],
  },
  {
    id: 'manufacturing',
    title: 'Manufacturing',
    icon: Factory,
    color: 'indigo',
    accentColor: '#4f46e5',
    description: 'Work orders, BOM, job cards and production planning',
    items: [
      { id: 'DESIGN_RECIPE', label: 'Bill of Materials', doctype: 'BOM', module: 'manufacturing', icon: FlaskConical, description: 'Define raw material compositions for products', keywords: ['bom', 'recipe', 'formula'] },
      { id: 'SAMPLING', label: 'Sample Request', doctype: 'Sample Request', module: 'manufacturing', icon: FlaskRound, description: 'Manage pre-production sample development' },
      { id: 'PRODUCTION', label: 'Work Order', doctype: 'Work Order', module: 'manufacturing', icon: ClipboardList, description: 'Production job scheduling and tracking' },
      { id: 'TRACK_LOTS', label: 'Lot Tracking', doctype: 'Batch', module: 'manufacturing', icon: MapPin, description: 'Track raw material and production lots/batches' },
      { id: 'JOB_WORK', label: 'Subcontracting', doctype: 'Subcontracting Order', module: 'manufacturing', icon: ArrowRightLeft, description: 'Outsource production processes to job workers' },
      { id: 'QUALITY', label: 'Quality Inspection', doctype: 'Quality Inspection', module: 'manufacturing', icon: ShieldCheck, description: 'QC checks for materials and finished goods' },
    ],
  },
  {
    id: 'stock',
    title: 'Stock',
    icon: Boxes,
    color: 'cyan',
    accentColor: '#0891b2',
    description: 'Inventory management, stock entries and item ledgers',
    items: [
      { id: 'INVENTORY', label: 'Item Master', doctype: 'Item', module: 'stock', icon: PackageSearch, description: 'Manage raw material and item records', keywords: ['item', 'material', 'product', 'fabric', 'yarn'] },
      { id: 'OPENING_STOCK', label: 'Opening Stock', doctype: 'Stock Opening', module: 'stock', icon: Database, description: 'Set initial stock quantities and valuations' },
      { id: 'CATALOG', label: 'Product Catalog', doctype: 'Item Variant', module: 'stock', icon: Palette, description: 'Design catalog with variants and images', keywords: ['design', 'catalog', 'product'] },
      { id: 'STOCK_TRANSFER', label: 'Stock Entry', doctype: 'Stock Entry', module: 'stock', icon: ArrowRightLeft, description: 'Material transfers between warehouses' },
      { id: 'PACK_DESIGN', label: 'Product Bundle', doctype: 'Product Bundle', module: 'stock', icon: Archive, description: 'Define product bundles and kit structures' },
      { id: 'STOCK_AUDIT', label: 'Stock Reconciliation', doctype: 'Stock Reconciliation', module: 'stock', icon: SearchCheck, description: 'Physical audit and stock reconciliation' },
      { id: 'ASSETS', label: 'Fixed Assets', doctype: 'Asset', module: 'stock', icon: Activity, description: 'Track and depreciate company assets' },
      { id: 'VEHICLES', label: 'Vehicle Log', doctype: 'Vehicle Log', module: 'stock', icon: Car, description: 'Company vehicle maintenance and fuel logs' },
    ],
  },
  {
    id: 'accounts_hr',
    title: 'Accounts & HR',
    icon: Wallet,
    color: 'rose',
    accentColor: '#e11d48',
    description: 'Accounting, payroll, attendance and HR operations',
    items: [
      { id: 'CHART_OF_ACCOUNTS', label: 'Chart of Accounts', doctype: 'Account', module: 'accounts_hr', icon: Wallet, description: 'Manage the company account hierarchy' },
      { id: 'ACCOUNTING', label: 'Journal Entry', doctype: 'Journal Entry', module: 'accounts_hr', icon: BookOpen, description: 'Manual accounting entries and ledger' },
      { id: 'CASH_BOOK', label: 'Payment Entry', doctype: 'Payment Entry', module: 'accounts_hr', icon: Landmark, description: 'Record payments received and made' },
      { id: 'KARIGAR_KHATA', label: 'Karigar Ledger', doctype: 'Worker Ledger', module: 'accounts_hr', icon: Coins, description: 'Worker payment and advance ledger' },
      { id: 'AGENT_KHATA', label: 'Agent Ledger', doctype: 'Agent Ledger', module: 'accounts_hr', icon: BadgePercent, description: 'Agent commission and payment ledger' },
      { id: 'EXPENSE_CLAIM', label: 'Expense Claim', doctype: 'Expense Claim', module: 'accounts_hr', icon: Receipt, description: 'Employee expense reimbursement requests' },
      { id: 'ATTENDANCE', label: 'Attendance', doctype: 'Attendance', module: 'accounts_hr', icon: Fingerprint, description: 'Daily employee attendance tracking' },
      { id: 'LEAVE_APP', label: 'Leave Application', doctype: 'Leave Application', module: 'accounts_hr', icon: CalendarDays, description: 'Employee leave requests and approvals' },
      { id: 'PAYROLL', label: 'Salary Slip', doctype: 'Salary Slip', module: 'accounts_hr', icon: Banknote, description: 'Generate and manage employee payroll' },
    ],
  },
  {
    id: 'masters',
    title: 'Masters',
    icon: Briefcase,
    color: 'slate',
    accentColor: '#64748b',
    description: 'Core master data: customers, suppliers, employees and warehouses',
    items: [
      { id: 'CUSTOMERS', label: 'Customer', doctype: 'Customer', module: 'masters', icon: UserCircle, description: 'Manage customer master records' },
      { id: 'SUPPLIERS', label: 'Supplier', doctype: 'Supplier', module: 'masters', icon: Truck, description: 'Manage supplier and vendor records' },
      { id: 'TEAM', label: 'Employee', doctype: 'Employee', module: 'masters', icon: Users, description: 'Employee profiles and information' },
      { id: 'KARIGARS', label: 'Karigar', doctype: 'Worker', module: 'masters', icon: Scissors, description: 'Artisan and job worker records' },
      { id: 'AGENTS', label: 'Sales Agent', doctype: 'Sales Partner', module: 'masters', icon: Briefcase, description: 'Sales agents and commission partners' },
      { id: 'OFFICES', label: 'Warehouse', doctype: 'Warehouse', module: 'masters', icon: Building2, description: 'Warehouse and storage location master' },
    ],
  },
];

export const ERP_MODULE_ITEMS: ERPModuleItem[] = [
  HOME_MODULE,
  ...ERP_MODULE_GROUPS.flatMap((group) => group.items),
  SETTINGS_MODULE,
  UPGRADE_MODULE,
];

export const getERPModuleByView = (view: ViewState) =>
  ERP_MODULE_ITEMS.find((item) => item.id === view);

export const getViewTitle = (view: ViewState) =>
  getERPModuleByView(view)?.label || view.replace(/_/g, ' ');

export const getViewDescription = (view: ViewState) =>
  getERPModuleByView(view)?.description || '';

export const getEnabledERPModuleGroups = (features: Record<string, boolean>) =>
  ERP_MODULE_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => features[item.id] !== false),
  })).filter((group) => group.items.length > 0);

export const getModuleGroupByView = (view: ViewState): ERPModuleGroup | undefined =>
  ERP_MODULE_GROUPS.find((g) => g.items.some((item) => item.id === view));

export const MODULE_COLOR_MAP: Record<ERPModuleGroupId, { dot: string; bg: string; text: string; ring: string }> = {
  workspace:    { dot: 'bg-sky-500',     bg: 'bg-sky-500/10',     text: 'text-sky-600 dark:text-sky-400',     ring: 'ring-sky-500/30' },
  selling:      { dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500/30' },
  buying:       { dot: 'bg-amber-500',   bg: 'bg-amber-500/10',   text: 'text-amber-600 dark:text-amber-400',   ring: 'ring-amber-500/30' },
  manufacturing:{ dot: 'bg-indigo-500',  bg: 'bg-indigo-500/10',  text: 'text-indigo-600 dark:text-indigo-400',  ring: 'ring-indigo-500/30' },
  stock:        { dot: 'bg-cyan-500',    bg: 'bg-cyan-500/10',    text: 'text-cyan-600 dark:text-cyan-400',    ring: 'ring-cyan-500/30' },
  accounts_hr:  { dot: 'bg-rose-500',    bg: 'bg-rose-500/10',    text: 'text-rose-600 dark:text-rose-400',    ring: 'ring-rose-500/30' },
  masters:      { dot: 'bg-slate-400',   bg: 'bg-slate-500/10',   text: 'text-slate-600 dark:text-slate-400',   ring: 'ring-slate-500/30' },
  analytics:    { dot: 'bg-violet-500',  bg: 'bg-violet-500/10',  text: 'text-violet-600 dark:text-violet-400',  ring: 'ring-violet-500/30' },
};
