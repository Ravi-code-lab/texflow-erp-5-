import {
  Activity,
  Archive,
  ArrowRightLeft,
  Banknote,
  BarChart4,
  Bell,
  BookOpen,
  Boxes,
  Briefcase,
  Car,
  CheckSquare,
  ClipboardList,
  Coins,
  Database,
  Factory,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Fingerprint,
  FlaskConical,
  FlaskRound,
  GitBranch,
  Home,
  Landmark,
  Layers,
  LayoutDashboard,
  LucideIcon,
  MapPin,
  Megaphone,
  Monitor,
  Palette,
  PhoneCall,
  Receipt,
  Scissors,
  SearchCheck,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Undo2,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react';
import { ViewState } from '../types';

export type ERPModuleGroupId =
  | 'workspace'
  | 'selling'
  | 'buying'
  | 'manufacturing'
  | 'stock'
  | 'accounts_hr'
  | 'masters';

export interface ERPModuleItem {
  id: ViewState;
  label: string;
  doctype: string;
  module: ERPModuleGroupId | 'core';
  icon: LucideIcon;
  keywords?: string[];
}

export interface ERPModuleGroup {
  id: ERPModuleGroupId;
  title: string;
  icon: LucideIcon;
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

export const ERP_MODULE_GROUPS: ERPModuleGroup[] = [
  {
    id: 'workspace',
    title: 'Workspace',
    icon: LayoutDashboard,
    items: [
      { id: 'TASKS', label: 'Tasks', doctype: 'Task', module: 'workspace', icon: CheckSquare },
      { id: 'TIMESHEET', label: 'Timesheet', doctype: 'Timesheet', module: 'workspace', icon: FileText },
      { id: 'ERP_DESK', label: 'ERPNext Desk', doctype: 'Module Def', module: 'workspace', icon: LayoutDashboard, keywords: ['erpnext', 'module manager', 'workspace', 'desk', 'frappe'] },
      { id: 'DOCUMENT_DESK', label: 'Document Desk', doctype: 'Document', module: 'workspace', icon: FileCheck, keywords: ['form view', 'list view', 'document entry', 'generic form', 'doctype form'] },
      { id: 'DATA_IMPORT', label: 'Data Import', doctype: 'Data Import', module: 'workspace', icon: FileSpreadsheet, keywords: ['csv', 'xlsx', 'excel', 'bulk import', 'template'] },
      { id: 'DOCTYPE_CENTER', label: 'DocType Center', doctype: 'DocType', module: 'workspace', icon: Database, keywords: ['doctype', 'schema', 'metadata', 'form builder'] },
      { id: 'WORKFLOW_INBOX', label: 'Workflow Inbox', doctype: 'Workflow Action', module: 'workspace', icon: GitBranch, keywords: ['approval', 'workflow', 'submit', 'pending'] },
      { id: 'REPORT_BUILDER', label: 'Report Builder', doctype: 'Report', module: 'workspace', icon: BarChart4, keywords: ['query report', 'script report', 'export', 'analytics'] },
      { id: 'NOTIFICATIONS', label: 'Notifications', doctype: 'Notification Log', module: 'workspace', icon: Bell },
      { id: 'AUDIT_TRAIL', label: 'Audit Trail', doctype: 'Version', module: 'workspace', icon: ShieldCheck, keywords: ['activity log', 'version history', 'audit'] },
      { id: 'TEAM', label: 'Team', doctype: 'Employee', module: 'workspace', icon: Users },
      { id: 'PROJECTS', label: 'Projects', doctype: 'Project', module: 'workspace', icon: Briefcase },
    ],
  },
  {
    id: 'selling',
    title: 'Selling',
    icon: ShoppingCart,
    items: [
      { id: 'QUOTATION', label: 'Quotation', doctype: 'Quotation', module: 'selling', icon: FileText },
      { id: 'ORDERS', label: 'Sales Order', doctype: 'Sales Order', module: 'selling', icon: FileText },
      { id: 'POS', label: 'Point of Sale', doctype: 'POS Invoice', module: 'selling', icon: Monitor },
      { id: 'DELIVERY_CHALLAN', label: 'Delivery Note', doctype: 'Delivery Note', module: 'selling', icon: Truck },
      { id: 'TAX_INVOICE', label: 'Sales Invoice', doctype: 'Sales Invoice', module: 'selling', icon: Receipt },
      { id: 'SALES_RETURN', label: 'Sales Return', doctype: 'Sales Return', module: 'selling', icon: Undo2 },
      { id: 'CREDIT_NOTE', label: 'Credit Note', doctype: 'Credit Note', module: 'selling', icon: Banknote },
      { id: 'CRM', label: 'Lead', doctype: 'Lead', module: 'selling', icon: Megaphone },
      { id: 'SUPPORT_TICKET', label: 'Support Ticket', doctype: 'Issue', module: 'selling', icon: PhoneCall },
    ],
  },
  {
    id: 'buying',
    title: 'Buying',
    icon: ShoppingBag,
    items: [
      { id: 'MATERIAL_REQUEST', label: 'Material Request', doctype: 'Material Request', module: 'buying', icon: FileCheck },
      { id: 'SUPPLIER_QUOTATION', label: 'Supplier Quotation', doctype: 'Supplier Quotation', module: 'buying', icon: Receipt },
      { id: 'PURCHASE_ORDER', label: 'Purchase Order', doctype: 'Purchase Order', module: 'buying', icon: FileText },
      { id: 'PURCHASE_INWARD', label: 'Purchase Receipt', doctype: 'Purchase Receipt', module: 'buying', icon: ArrowRightLeft },
      { id: 'PURCHASE_INVOICE', label: 'Purchase Invoice', doctype: 'Purchase Invoice', module: 'buying', icon: Receipt },
      { id: 'PURCHASE_RETURN', label: 'Purchase Return', doctype: 'Purchase Return', module: 'buying', icon: Undo2 },
      { id: 'DEBIT_NOTE', label: 'Debit Note', doctype: 'Debit Note', module: 'buying', icon: Banknote },
    ],
  },
  {
    id: 'manufacturing',
    title: 'Manufacturing',
    icon: Factory,
    items: [
      { id: 'DESIGN_RECIPE', label: 'BOM', doctype: 'BOM', module: 'manufacturing', icon: FlaskConical },
      { id: 'SAMPLING', label: 'Sample Request', doctype: 'Sample Request', module: 'manufacturing', icon: FlaskRound },
      { id: 'PRODUCTION', label: 'Work Order', doctype: 'Work Order', module: 'manufacturing', icon: ClipboardList },
      { id: 'TRACK_LOTS', label: 'Lot Tracking', doctype: 'Batch', module: 'manufacturing', icon: MapPin },
      { id: 'JOB_WORK', label: 'Subcontracting', doctype: 'Subcontracting Order', module: 'manufacturing', icon: ArrowRightLeft },
      { id: 'QUALITY', label: 'Quality Inspection', doctype: 'Quality Inspection', module: 'manufacturing', icon: ShieldCheck },
    ],
  },
  {
    id: 'stock',
    title: 'Stock',
    icon: Boxes,
    items: [
      { id: 'INVENTORY', label: 'Raw Materials', doctype: 'Item', module: 'stock', icon: Layers },
      { id: 'OPENING_STOCK', label: 'Opening Stock', doctype: 'Stock Opening', module: 'stock', icon: Database },
      { id: 'CATALOG', label: 'Product Item', doctype: 'Item Variant', module: 'stock', icon: Palette },
      { id: 'STOCK_TRANSFER', label: 'Stock Entry', doctype: 'Stock Entry', module: 'stock', icon: ArrowRightLeft },
      { id: 'PACK_DESIGN', label: 'Product Bundle', doctype: 'Product Bundle', module: 'stock', icon: Archive },
      { id: 'STOCK_AUDIT', label: 'Stock Reconciliation', doctype: 'Stock Reconciliation', module: 'stock', icon: SearchCheck },
      { id: 'ASSETS', label: 'Assets', doctype: 'Asset', module: 'stock', icon: Activity },
      { id: 'VEHICLES', label: 'Vehicle Log', doctype: 'Vehicle Log', module: 'stock', icon: Car },
    ],
  },
  {
    id: 'accounts_hr',
    title: 'Accounts & HR',
    icon: Wallet,
    items: [
      { id: 'CHART_OF_ACCOUNTS', label: 'Chart of Accounts', doctype: 'Account', module: 'accounts_hr', icon: Wallet },
      { id: 'ACCOUNTING', label: 'Journal Entry', doctype: 'Journal Entry', module: 'accounts_hr', icon: Wallet },
      { id: 'KARIGAR_KHATA', label: 'Karigar Ledger', doctype: 'Worker Ledger', module: 'accounts_hr', icon: BookOpen },
      { id: 'AGENT_KHATA', label: 'Agent Ledger', doctype: 'Agent Ledger', module: 'accounts_hr', icon: Coins },
      { id: 'CASH_BOOK', label: 'Payment Entry', doctype: 'Payment Entry', module: 'accounts_hr', icon: Landmark },
      { id: 'EXPENSE_CLAIM', label: 'Expense Claim', doctype: 'Expense Claim', module: 'accounts_hr', icon: Receipt },
      { id: 'ATTENDANCE', label: 'Attendance', doctype: 'Attendance', module: 'accounts_hr', icon: Fingerprint },
      { id: 'LEAVE_APP', label: 'Leave Application', doctype: 'Leave Application', module: 'accounts_hr', icon: BookOpen },
      { id: 'PAYROLL', label: 'Salary Slip', doctype: 'Salary Slip', module: 'accounts_hr', icon: Banknote },
    ],
  },
  {
    id: 'masters',
    title: 'Masters',
    icon: Briefcase,
    items: [
      { id: 'CUSTOMERS', label: 'Customer', doctype: 'Customer', module: 'masters', icon: UserCircle },
      { id: 'SUPPLIERS', label: 'Supplier', doctype: 'Supplier', module: 'masters', icon: Truck },
      { id: 'TEAM', label: 'Employee', doctype: 'Employee', module: 'masters', icon: UserCircle },
      { id: 'KARIGARS', label: 'Karigar', doctype: 'Worker', module: 'masters', icon: Scissors },
      { id: 'AGENTS', label: 'Agent', doctype: 'Sales Partner', module: 'masters', icon: Briefcase },
      { id: 'OFFICES', label: 'Warehouse', doctype: 'Warehouse', module: 'masters', icon: Home },
    ],
  },
];

export const ERP_MODULE_ITEMS: ERPModuleItem[] = [
  HOME_MODULE,
  ...ERP_MODULE_GROUPS.flatMap((group) => group.items),
  SETTINGS_MODULE,
];

export const getERPModuleByView = (view: ViewState) =>
  ERP_MODULE_ITEMS.find((item) => item.id === view);

export const getViewTitle = (view: ViewState) =>
  getERPModuleByView(view)?.label || view.replace(/_/g, ' ');

export const getEnabledERPModuleGroups = (features: Record<string, boolean>) =>
  ERP_MODULE_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => features[item.id] !== false),
  })).filter((group) => group.items.length > 0);
