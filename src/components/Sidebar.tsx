import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Palette,
  Factory,
  Boxes,
  ShoppingCart,
  Settings as SettingsIcon,
  LogOut,
  ChevronDown,
  Scissors,
  Truck,
  Receipt,
  FileText,
  ClipboardList,
  Briefcase,
  Archive,
  ArrowRightLeft,
  SearchCheck,
  Layers,
  UserCircle,
  Wallet,
  Fingerprint,
  Home,
  FlaskConical,
  BookOpen,
  MapPin,
  UserCog,
  Megaphone,
  ShieldCheck,
  Banknote,
  Undo2,
  ShoppingBag,
  Activity,
  FlaskRound,
  Coins,
  Landmark,
  Bell,
  CheckSquare,
  Users,
  Database,
  Send,
  PhoneCall,
  FileCheck,
  Car,
  Monitor,
  Image,
  MessageSquare,
  Mail,
  Recycle,
  Calculator,
  BarChart2,
  Settings2,
  LayoutGrid,
  CalendarDays,
  Hammer,
  GitBranch,
  Shield,
  Workflow,
} from "lucide-react";
import { ViewState, TeamMember, UIPreferences, CompanyInfo } from "../types";

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  onLogout: () => void;
  user?: TeamMember;
  uiPrefs?: UIPreferences;
  onUpdateUiPrefs?: (prefs: UIPreferences) => void;
  companyInfo: CompanyInfo;
  features?: Record<string, boolean>;
  isGitHubConnected?: boolean;
  onProfileClick?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  onCommandPalette?: () => void;
  notificationCount?: number;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setView,
  onLogout,
  user,
  companyInfo,
  onProfileClick,
  features = {},
  isOpen,
  onClose,
}) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Workspace: true,
    "Sales Matrix": true,
    "Procurement Hub": true,
    "Manufacturing Unit": true,
    "Material & Assets": true,
    "Financial Hub": true,
    Registries: true,
  });

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const isEnabled = (id: string) => features[id] !== false;

  const menu = [
    { id: "DASHBOARD", label: "Home", icon: Home },
    {
      title: "Workspace",
      icon: LayoutDashboard,
      items: [
        { id: "TASKS", label: "Tasks", icon: CheckSquare },
        { id: "TIMESHEET", label: "Timesheet", icon: FileText },
        { id: "NOTIFICATIONS", label: "Notifications", icon: Bell },
        { id: "TEAM", label: "Team", icon: Users },
        { id: "PROJECTS", label: "Projects", icon: Briefcase },
      ].filter((item) => isEnabled(item.id)),
    },
    {
      title: "Sales Matrix",
      icon: ShoppingCart,
      items: [
        { id: "CRM", label: "Leads", icon: Megaphone },
        { id: "QUOTATION", label: "Quotation", icon: FileText },
        { id: "ORDERS", label: "Sales Order", icon: FileText },
        { id: "POS", label: "Point of Sale", icon: Monitor },
        { id: "DELIVERY_CHALLAN", label: "Delivery Note", icon: Truck },
        { id: "PACKING_SLIPS", label: "Packing Slips", icon: Archive },
        { id: "TAX_INVOICE", label: "Sales Invoice", icon: Receipt },
        { id: "SALES_RETURN", label: "Returns", icon: Undo2 },
        { id: "CREDIT_NOTE", label: "Credit Notes", icon: Banknote },
        { id: "SUPPORT_TICKET", label: "Support", icon: PhoneCall },
        { id: "EMAIL_HUB", label: "Email Hub", icon: Mail },
      ].filter((item) => isEnabled(item.id)),
    },
    {
      title: "Procurement Hub",
      icon: ShoppingBag,
      items: [
        { id: "MATERIAL_REQUEST", label: "Material Request", icon: FileCheck },
        {
          id: "SUPPLIER_QUOTATION",
          label: "Supplier Quotation",
          icon: Receipt,
        },
        { id: "PURCHASE_ORDER", label: "Purchase Order", icon: FileText },
        {
          id: "PURCHASE_INWARD",
          label: "Purchase Receipt",
          icon: ArrowRightLeft,
        },
        { id: "PURCHASE_INVOICE", label: "Purchase Invoice", icon: Receipt },
        { id: "PURCHASE_RETURN", label: "Returns", icon: Undo2 },
        { id: "DEBIT_NOTE", label: "Debit Notes", icon: Banknote },
      ].filter((item) => isEnabled(item.id)),
    },
    {
      title: "Manufacturing Unit",
      icon: Factory,
      items: [
        { id: "DESIGN_RECIPE", label: "BOM", icon: FlaskConical },
        { id: "SAMPLING", label: "Samples", icon: FlaskRound },
        { id: "MFG_DASHBOARD", label: "Mfg Dashboard", icon: LayoutGrid },
        { id: "PRODUCTION_PLAN", label: "Production Plan", icon: CalendarDays },
        { id: "PRODUCTION", label: "Work Orders", icon: ClipboardList },
        { id: "WORK_ORDER_TASKS", label: "Task Pages", icon: Layers },
        { id: "JOB_CARD_SUMMARY", label: "Job Card Summary", icon: BarChart2 },
        { id: "WORKSTATIONS", label: "Workstations", icon: Hammer },
        { id: "OPERATIONS_MASTER", label: "Operations Master", icon: Settings2 },
        { id: "ROUTING_MASTER", label: "Routing Master", icon: Workflow },
        { id: "TRACK_LOTS", label: "Tracking", icon: MapPin },
        { id: "FABRIC_COSTING", label: "Garment Costing", icon: Coins },
        {
          id: "MARGIN_COSTING",
          label: "Real-Time Margin Costing Engine",
          icon: Calculator,
        },
        { id: "JOB_WORK", label: "Subcontracting", icon: ArrowRightLeft },
        { id: "QUALITY", label: "Quality Inspection", icon: ShieldCheck },
        { id: "WASTE_MANAGEMENT", label: "Waste Management", icon: Recycle },
      ].filter((item) => isEnabled(item.id)),
    },
    {
      title: "Material & Assets",
      icon: Boxes,
      items: [
        { id: "INVENTORY", label: "Raw Materials", icon: Layers },
        { id: "OPENING_STOCK", label: "Opening Stock", icon: Database },
        { id: "CATALOG", label: "Product Item", icon: Palette },
        { id: "GALLERY", label: "Image Gallery", icon: Image },
        { id: "STOCK_TRANSFER", label: "Stock Entry", icon: ArrowRightLeft },
        { id: "GATE_PASS", label: "Gate Pass (RGP/NRGP)", icon: Truck },
        { id: "STOCK_AUDIT", label: "Stock Reconciliation", icon: SearchCheck },
        { id: "DISPATCH_PLANNER", label: "Dispatch Planner", icon: Truck },
        { id: "ASSETS", label: "Assets", icon: Activity },
        { id: "VEHICLES", label: "Vehicle Log", icon: Car },
      ].filter((item) => isEnabled(item.id)),
    },
    {
      title: "Finance & HR",
      icon: Wallet,
      items: [
        { id: "CHART_OF_ACCOUNTS", label: "Chart of Accounts", icon: Wallet },
        { id: "ACCOUNTING", label: "Journal Entry", icon: Wallet },
        { id: "KARIGAR_KHATA", label: "Karigars", icon: BookOpen },
        { id: "AGENT_KHATA", label: "Agents", icon: Coins },
        { id: "BROKERAGE", label: "Brokerage Tracker", icon: Banknote },
        { id: "CASH_BOOK", label: "Payment Entry", icon: Landmark },
        { id: "TALLY_INTEGRATION", label: "Tally Sync", icon: ArrowRightLeft },
        { id: "EXPENSE_CLAIM", label: "Expense Claim", icon: Receipt },
        { id: "ATTENDANCE", label: "Attendance", icon: Fingerprint },
        { id: "LEAVE_APP", label: "Leave Application", icon: BookOpen },
        { id: "PAYROLL", label: "Salary Slip", icon: Banknote },
      ].filter((item) => isEnabled(item.id)),
    },
    {
      title: "Registries",
      icon: Briefcase,
      items: [
        { id: "CUSTOMERS", label: "Customer", icon: UserCircle },
        { id: "SUPPLIERS", label: "Supplier", icon: Truck },
        { id: "TEAM", label: "Employee", icon: UserCircle },
        { id: "KARIGARS", label: "Karigars", icon: Scissors },
        { id: "AGENTS", label: "Agents", icon: Briefcase },
        { id: "OFFICES", label: "Warehouse", icon: Home },
      ].filter((item) => isEnabled(item.id)),
    },
    {
      title: "System Tools",
      icon: Activity,
      items: [
        { id: "DATA_IMPORT", label: "Data Import Tool", icon: Archive },
        { id: "WORKFLOW_INBOX", label: "Workflow Inbox", icon: CheckSquare },
        { id: "REPORT_BUILDER", label: "Report Builder", icon: FileText },
        { id: "ROLE_ACCESS", label: "Role Access Control", icon: Shield },
        { id: "SETTINGS", label: "Settings", icon: ShieldCheck },
      ],
    },
  ];

  return (
    <aside
      className={`
      fixed inset-y-0 left-0 lg:relative h-full w-64 flex flex-col glass border-r border-macos-border dark:border-macos-darkBorder shrink-0 z-50 transition-all duration-500
      ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
    `}
    >
      <div className="h-16 flex flex-col justify-center px-4 gap-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-macos-accent rounded-lg flex items-center justify-center text-white shadow-sm shrink-0">
            <Scissors className="w-4 h-4" />
          </div>
          <h1 className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate uppercase tracking-tight">
            {companyInfo.name}
          </h1>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
        {menu.map((item, idx) => {
          if ("items" in item && item.items) {
            if (item.items.length === 0) return null;
            const isOpen = openGroups[item.title || ""];
            return (
              <div key={idx} className="space-y-1 mb-4">
                <button
                  onClick={() => toggleGroup(item.title || "")}
                  className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-macos-accent transition-colors group"
                >
                  <span className="flex items-center gap-2">{item.title}</span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="space-y-0.5 overflow-hidden"
                    >
                      {item.items.map((sub, sIdx) => (
                        <motion.button
                          key={sub.id}
                          initial={{ x: -10, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: sIdx * 0.03 }}
                          whileHover={{ x: 4 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setView(sub.id as ViewState)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                            currentView === sub.id
                              ? "bg-macos-accent text-white shadow-sm"
                              : "text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
                          }`}
                        >
                          <div className="w-5 flex justify-center shrink-0">
                            <sub.icon
                              className={`w-4 h-4 ${currentView === sub.id ? "text-white" : "opacity-60"}`}
                            />
                          </div>
                          <span className="truncate">{sub.label}</span>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }
          const singleItem = item as any;
          return (
            <motion.button
              key={singleItem.id}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setView(singleItem.id as ViewState)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all mb-1 text-left ${
                currentView === singleItem.id
                  ? "bg-macos-accent text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <div className="w-5 flex justify-center shrink-0">
                <singleItem.icon
                  className={`w-4 h-4 ${currentView === singleItem.id ? "text-white" : "opacity-60"}`}
                />
              </div>
              <span className="truncate">{singleItem.label}</span>
            </motion.button>
          );
        })}

        <div className="pt-2 mt-2 border-t border-macos-border dark:border-macos-darkBorder">
          <button
            onClick={() => setView("SETTINGS")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              currentView === "SETTINGS"
                ? "bg-macos-accent text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            <div className="w-5 flex justify-center shrink-0">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <span>Settings</span>
          </button>
        </div>
      </nav>

      <div className="p-4 border-t border-macos-border dark:border-macos-darkBorder shrink-0">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-black/5 dark:bg-white/5">
          <button
            onClick={onProfileClick}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-macos-accent to-indigo-600 text-white flex items-center justify-center text-xs font-bold uppercase shrink-0 shadow-sm"
          >
            {user?.name?.charAt(0) || "A"}
          </button>
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={onProfileClick}
          >
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              {user?.name || "Admin"}
            </p>
            <p className="text-[10px] text-slate-500 truncate uppercase tracking-widest">
              {user?.role || "Root"}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
