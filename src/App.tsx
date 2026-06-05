import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { hashPassword } from "./utils/crypto";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Inventory from "./components/Inventory";
import WorkOrderPage from "./components/WorkOrderPage";
import Customers from "./components/Customers";
import Karigars from "./components/Karigars";
import KarigarKhata from "./components/KarigarKhata";
import Agents from "./components/Agents";
import Gallery from "./components/Gallery";
import Offices from "./components/Offices";
import Employees from "./components/Employees";
import Accounting from "./components/Accounting";
import Attendance from "./components/Attendance";
import AgentKhata from "./components/AgentKhata";
import CashBook from "./components/CashBook";
import Settings from "./components/Settings";
import Login from "./components/Login";
import DesignCatalog from "./components/DesignCatalog";
import DesignRecipe from "./components/DesignRecipe";
import JobWorkComp from "./components/JobWork";
import Assets from "./components/Assets";
import CRM from "./components/CRM";
import Reports from "./components/Reports";
import Suppliers from "./components/Suppliers";
import QualityControl from "./components/QualityControl";
import Projects from "./components/Projects";
import UserProfileModal from "./components/UserProfileModal";
import CommandPalette from "./components/CommandPalette";
import DataImportTool, {
  DataImportCollection,
} from "./components/DataImportTool";
import OpeningStock from "./components/OpeningStock";
import StockTransferComp from "./components/StockTransfer";
import PhysicalAudit from "./components/PhysicalAudit";
import TaxInvoice from "./components/TaxInvoice";
import Quotation from "./components/Quotation";
import PurchaseInvoiceComp from "./components/PurchaseInvoice";
import LeaveApplication from "./components/LeaveApplication";
import WasteManagement from "./components/WasteManagement";
import BrokerageTracker from "./components/BrokerageTracker";
import MarginCostingEngine from "./components/MarginCostingEngine";
import GatePassSystem from "./components/GatePassSystem";
import ChartOfAccounts from "./components/ChartOfAccounts";
import MaterialRequestComp from "./components/MaterialRequest";
import ExpenseClaimComp from "./components/ExpenseClaim";
import SupportTicketsComp from "./components/SupportTickets";
import TimesheetComp from "./components/Timesheet";
import SupplierQuotationComp from "./components/SupplierQuotation";
import POS from "./components/POS";
import Vehicles from "./components/Vehicles";
import SalesReturn from "./components/SalesReturn";
import PurchaseOrderComp from "./components/PurchaseOrder";
import PurchaseInward from "./components/PurchaseInward";
import PurchaseReturn from "./components/PurchaseReturn";
import CreditDebitNotes from "./components/CreditDebitNotes";
import TrackLots from "./components/TrackLots";
import SalesOrder from "./components/SalesOrder";
import DeliveryChallan from "./components/DeliveryChallan";
import PackingList from "./components/PackingList";
import Sampling from "./components/Sampling";
import NotificationCenter from "./components/NotificationCenter";
import TaskManager from "./components/TaskManager";
import EmailHub from "./components/EmailHub";
import AuditTrail from "./components/AuditTrail";
import DocTypeCenter, { DocTypeStat } from "./components/DocTypeCenter";
import DocumentDesk, {
  DocumentDeskCollection,
} from "./components/DocumentDesk";
import ERPNextWorkbench from "./components/ERPNextWorkbench";
import WorkflowInbox, {
  WorkflowInboxCollection,
} from "./components/WorkflowInbox";
import ReportBuilder, { ReportCollection } from "./components/ReportBuilder";
import UpgradeModule from "./components/UpgradeModule";
import { TallyIntegration } from "./components/TallyIntegration";
import { PrintFormatBuilder } from "./components/PrintFormatBuilder";
import { FabricCostingWorkspace } from "./components/FabricCosting";
import { DispatchPlanner } from "./components/DispatchPlanner";
import WorkOrderTaskHub from "./components/work-orders/WorkOrderTaskHub";
import MfgDashboard from "./components/work-orders/MfgDashboard";
import JobCardSummary from "./components/work-orders/JobCardSummary";
import OperationsMaster from "./components/work-orders/OperationsMaster";
import RoleAccessManager from "./components/RoleAccessManager";
import RoutingMaster from "./components/work-orders/RoutingMaster";
import ProductionPlan from "./components/ProductionPlan";
import WorkstationsComp from "./components/Workstations";
import { GenericListPage } from "./components/GenericListPage";
import {
  InventoryItem,
  Order,
  Customer,
  TeamMember,
  Supplier,
  Design,
  JobWork,
  Warehouse,
  Machine,
  Project,
  Transaction,
  Agent,
  JobSlip,
  Karigar,
  AttendanceRecord,
  Cheque,
  Budget,
  Lead,
  MaintenanceRecord,
  QualityReport,
  LoanRecord,
  LeaveRequest,
  GalleryItem,
  UIPreferences,
  CompanyInfo,
  ViewState,
  ProductionLog,
  FabricInspection,
  PurchaseOrder,
  ProductionJob,
  BaseEntity,
  GatePass,
  StockAudit,
  PayrollAdjustment,
  SampleRequest,
  Pack,
  StockTransfer,
  WasteLog,
  BrokerageLog,
  MarginCosting,
  ShopifyConfig,
  InvoiceConfig,
  SecurityConfig,
  CommunicationConfig,
  AdvancedConfig,
  Notification,
  Task,
  Timesheet,
  SupplierQuotation,
  MaterialRequest,
  SupportTicket,
  ExpenseClaim,
  Vehicle,
  POSInvoice,
  AuditLog,
  YarnLot,
  DyeingJob,
  FabricCosting,
  DispatchEntry,
  PackingSlip,
  RolePermission,
} from "./types";
import {
  getItem,
  setItem,
  hydrateFromNative,
  getVaultSnapshot,
} from "./utils/networkClient";
import {
  Loader2,
  Command,
  Menu,
  Search,
  Bell,
  CheckCircle2,
  AlertCircle,
  Info,
  XCircle,
  Check,
  Clock,
  ExternalLink,
  BellOff,
  X,
} from "lucide-react";
import { getViewTitle } from "./modules/registry";
import { getDocTypeSchema, DOCTYPE_SCHEMAS } from "./modules/doctypes";
import { createERPDocument } from "./modules/documentEngine";
import {
  createAuditLog,
  prepareDocumentCreate,
  prepareDocumentDelete,
  prepareDocumentUpdate,
} from "./modules/documentLifecycle";

// ── ForcePasswordChangeModal ────────────────────────────────────────────────
// Shown on first boot after seed-admin login. Cannot be dismissed.
const ForcePasswordChangeModal: React.FC<{
  onSave: (pw: string) => Promise<void>;
}> = ({ onSave }) => {
  const [pw, setPw] = React.useState("");
  const [pw2, setPw2] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");

  const handleSave = async () => {
    if (pw.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    if (pw !== pw2) {
      setErr("Passwords do not match.");
      return;
    }
    if (pw === "admin123") {
      setErr("Please choose a different password from the default.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      await onSave(pw);
    } catch {
      setErr("Failed to save. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-7">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-amber-600 dark:text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white text-base">
              Set Admin Password
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              First-time setup — required before continuing
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
          You're logged in with the default seed credentials. Please create a
          secure password for the <strong>admin</strong> account before
          proceeding.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1 block">
              New Password
            </label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={pw}
                onChange={(e) => {
                  setPw(e.target.value);
                  setErr("");
                }}
                placeholder="Min. 6 characters"
                className="w-full px-3 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                {show ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1 block">
              Confirm Password
            </label>
            <input
              type={show ? "text" : "password"}
              value={pw2}
              onChange={(e) => {
                setPw2(e.target.value);
                setErr("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="Repeat password"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {err && (
            <div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl text-red-700 dark:text-red-300 text-xs">
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="12" cy="12" r="10" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4m0 4h.01"
                />
              </svg>
              {err}
            </div>
          )}

          {pw.length >= 6 && pw === pw2 && pw !== "admin123" && (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs">
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Passwords match — ready to save
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-5 w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3 rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />{" "}
              Saving…
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>{" "}
              Save Password & Continue
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>("DASHBOARD");
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] =
    useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lastSync, setLastSync] = useState<string>("");
  // Tracks source order id when navigating to Delivery Challan via CONVERT_TO_DELIVERY_NOTE
  const [pendingDeliveryOrderId, setPendingDeliveryOrderId] = useState<string | undefined>(undefined);

  const [uiPrefs, setUiPrefs] = useState<UIPreferences>({
    theme: "light",
    sidebarStyle: "modern",
    backgroundPattern: "mesh",
    reduceMotion: false,
    primaryColor: "indigo",
    borderRadius: "md",
    density: "comfortable",
    scale: 1,
  });
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: "Ravi-Textile",
    address: "",
    gstin: "",
    email: "",
    website: "",
    logoUrl: "",
    phone: "",
    pan: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
  });
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [shopifyConfig, setShopifyConfig] = useState<ShopifyConfig>({
    enabled: false,
    shopUrl: "",
    accessToken: "",
  });
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>({
    geminiApiKey: "",
    sessionTimeout: 30,
    twoFactorEnabled: false,
  });
  const [communicationConfig, setCommunicationConfig] =
    useState<CommunicationConfig>({
      smtpHost: "",
      smtpPort: 587,
      smtpUser: "",
      smtpPass: "",
      whatsappEnabled: false,
    });
  const [advancedConfig, setAdvancedConfig] = useState<AdvancedConfig>({
    enableAuditLogs: true,
    auditLogRetentionDays: 90,
    debugMode: false,
    autoBackupInterval: 24,
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [invoiceConfig, setInvoiceConfig] = useState<InvoiceConfig>({
    prefix: "INV",
    nextNumber: 1001,
    defaultGst: 5,
    terms: "",
    bankDetails: "",
    currency: "INR",
    footerText: "",
    showLogo: true,
  });

  // Data States
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [gatePasses, setGatePasses] = useState<GatePass[]>([]);
  const [wasteLogs, setWasteLogs] = useState<WasteLog[]>([]);
  const [brokerLogs, setBrokerLogs] = useState<BrokerageLog[]>([]);
  const [marginCostings, setMarginCostings] = useState<MarginCosting[]>([]);
  const [production, setProduction] = useState<ProductionJob[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [jobWorks, setJobWorks] = useState<JobWork[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [slips, setSlips] = useState<JobSlip[]>([]);
  const [packingSlips, setPackingSlips] = useState<PackingSlip[]>([]);
  const [quotations, setQuotations] = useState<Order[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseOrder[]>([]);
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>(
    [],
  );
  const [supplierQuotations, setSupplierQuotations] = useState<
    SupplierQuotation[]
  >([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [posInvoices, setPosInvoices] = useState<POSInvoice[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [expenseClaims, setExpenseClaims] = useState<ExpenseClaim[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [qualityReports, setQualityReports] = useState<QualityReport[]>([]);
  const [inspections, setInspections] = useState<FabricInspection[]>([]);
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>([]);
  const [samples, setSamples] = useState<SampleRequest[]>([]);
  const [karigars, setKarigars] = useState<Karigar[]>([]);
  const [stockAudits, setStockAudits] = useState<StockAudit[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [yarnLots, setYarnLots] = useState<YarnLot[]>([]);
  const [dyeingJobs, setDyeingJobs] = useState<DyeingJob[]>([]);
  const [fabricCostings, setFabricCostings] = useState<FabricCosting[]>([]);
  const [dispatchEntries, setDispatchEntries] = useState<DispatchEntry[]>([]);
  const [payrollAdjustments, setPayrollAdjustments] = useState<
    Record<string, PayrollAdjustment>
  >({});
  const [dynamicDocuments, setDynamicDocuments] = useState<
    Record<string, any[]>
  >({});

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Hydrate from physical vault if on Electron
      await hydrateFromNative();

      // FIX #6: In LAN-client mode, fetch the entire vault in ONE HTTP call instead
      // of 61 sequential round-trips. getVaultSnapshot() returns null in Electron/
      // local mode so individual getItem() calls fall through to IndexedDB as before.
      const snapshot = await getVaultSnapshot();
      const g = async <T,>(key: string, fallback: T): Promise<T> => {
        if (snapshot) return (snapshot[key] as T) ?? fallback;
        return (await getItem<T>(key)) ?? fallback;
      };

      setUiPrefs(await g<UIPreferences>("uiPrefs", uiPrefs));
      setCompanyInfo(await g<CompanyInfo>("companyInfo", companyInfo));
      setFeatures(await g<Record<string, boolean>>("texflow_features", {}));
      setInvoiceConfig(
        await g<InvoiceConfig>("texflow_invoice_config", invoiceConfig),
      );
      setShopifyConfig(
        await g<ShopifyConfig>("texflow_shopify_config", shopifyConfig),
      );
      setSecurityConfig(
        await g<SecurityConfig>("texflow_security_config", securityConfig),
      );
      setCommunicationConfig(
        await g<CommunicationConfig>(
          "texflow_communication_config",
          communicationConfig,
        ),
      );
      setAdvancedConfig(
        await g<AdvancedConfig>("texflow_advanced_config", advancedConfig),
      );

      setInventory(await g<InventoryItem[]>("inventory", []));
      setGatePasses(await g<GatePass[]>("gatePasses", []));
      setWasteLogs(await g<WasteLog[]>("wasteLogs", []));
      setBrokerLogs(await g<BrokerageLog[]>("brokerLogs", []));
      setMarginCostings(await g<MarginCosting[]>("marginCostings", []));
      setProduction(await g<ProductionJob[]>("production", []));
      setOrders(await g<Order[]>("orders", []));
      setPurchaseOrders(await g<PurchaseOrder[]>("purchaseOrders", []));
      setCustomers(await g<Customer[]>("customers", []));
      setSuppliers(await g<Supplier[]>("suppliers", []));
      setWarehouses(await g<Warehouse[]>("warehouses", []));
      setTeam(await g<TeamMember[]>("team", []));
      setRolePermissions(await g<RolePermission[]>("rolePermissions", []));
      setDesigns(await g<Design[]>("designs", []));
      setJobWorks(await g<JobWork[]>("jobWorks", []));
      setMachines(
        await g<Machine[]>("machines", [
          {
            id: "MAC-JET-A",
            name: "Jet Dyehouse Chamber A",
            model: "Fong ECO-8 Jet",
            type: "Dyeing",
            status: "ACTIVE",
            purchaseDate: "2025-01-10",
            nextServiceDate: "2026-12-10",
            capacity: "500 KG/day",
            hourlyCost: 450,
          },
          {
            id: "MAC-JET-B",
            name: "Jet Dyehouse Chamber B",
            model: "Thies Lufter-T",
            type: "Dyeing",
            status: "ACTIVE",
            purchaseDate: "2025-03-15",
            nextServiceDate: "2026-09-15",
            capacity: "300 KG/day",
            hourlyCost: 350,
          },
          {
            id: "MAC-CAL-01",
            name: "Santex Calendering Finishing Machine",
            model: "Santashrink-Standard",
            type: "Finishing",
            status: "ACTIVE",
            purchaseDate: "2024-06-20",
            nextServiceDate: "2026-06-20",
            capacity: "1000 MTR/H",
            hourlyCost: 200,
          },
          {
            id: "MAC-CUT-01",
            name: "Gerber Paragon High-Ply CNC Cutter",
            model: "Paragon HX-75",
            type: "Cutting",
            status: "ACTIVE",
            purchaseDate: "2025-05-12",
            nextServiceDate: "2026-11-12",
            capacity: "4000 pcs/day",
            hourlyCost: 650,
          },
          {
            id: "MAC-STITCH-01",
            name: "Brother Double Needle Sewing Row 1",
            model: "Brother Nexio S-7300A",
            type: "Stitching",
            status: "ACTIVE",
            purchaseDate: "2025-02-18",
            nextServiceDate: "2026-08-18",
            capacity: "800 pcs/day",
            hourlyCost: 150,
          },
          {
            id: "MAC-STITCH-02",
            name: "Juki Heavy Duty Stitching Line",
            model: "Juki DDL-9000C",
            type: "Stitching",
            status: "ACTIVE",
            purchaseDate: "2025-04-10",
            nextServiceDate: "2026-10-10",
            capacity: "1200 pcs/day",
            hourlyCost: 180,
          },
          {
            id: "MAC-PRESS-01",
            name: "Ramsons Steam Pressing Station 1A",
            model: "Ramsons Rotopress-V3",
            type: "Packaging",
            status: "ACTIVE",
            purchaseDate: "2024-08-05",
            nextServiceDate: "2026-04-05",
            capacity: "1500 pcs/day",
            hourlyCost: 120,
          },
          {
            id: "MAC-QC-01",
            name: "Backlit Inspection & Measurement Unit",
            model: "Fab-Inspect Master II",
            type: "Quality",
            status: "ACTIVE",
            purchaseDate: "2025-01-20",
            nextServiceDate: "2026-07-20",
            capacity: "3000 pcs/day",
            hourlyCost: 100,
          },
        ]),
      );
      setProjects(await g<Project[]>("projects", []));
      setTransactions(await g<Transaction[]>("transactions", []));
      setAgents(await g<Agent[]>("agents", []));
      setSlips(await g<JobSlip[]>("slips", []));
      setQuotations(await g<Order[]>("quotations", []));
      setPurchaseInvoices(await g<PurchaseOrder[]>("purchaseInvoices", []));
      setMaterialRequests(await g<MaterialRequest[]>("materialRequests", []));
      setSupplierQuotations(
        await g<SupplierQuotation[]>("supplierQuotations", []),
      );
      setTimesheets(await g<Timesheet[]>("timesheets", []));
      setPosInvoices(await g<POSInvoice[]>("posInvoices", []));
      setVehicles(await g<Vehicle[]>("vehicles", []));
      setExpenseClaims(await g<ExpenseClaim[]>("expenseClaims", []));
      setSupportTickets(await g<SupportTicket[]>("supportTickets", []));
      setAttendance(await g<AttendanceRecord[]>("attendance", []));
      setCheques(await g<Cheque[]>("cheques", []));
      setBudgets(await g<Budget[]>("budgets", []));
      setLeads(await g<Lead[]>("leads", []));
      setMaintenance(await g<MaintenanceRecord[]>("maintenance", []));
      setQualityReports(await g<QualityReport[]>("qualityReports", []));
      setInspections(await g<FabricInspection[]>("inspections", []));
      setLoans(await g<LoanRecord[]>("loans", []));
      setLeaves(await g<LeaveRequest[]>("leaves", []));
      setGallery(await g<GalleryItem[]>("gallery", []));
      setProductionLogs(await g<ProductionLog[]>("productionLogs", []));
      setSamples(await g<SampleRequest[]>("samples", []));
      setKarigars(await g<Karigar[]>("karigars", []));
      setStockAudits(await g<StockAudit[]>("stockAudits", []));
      setTransfers(await g<StockTransfer[]>("transfers", []));
      setPacks(await g<Pack[]>("packs", []));
      setYarnLots(
        await g<YarnLot[]>("yarnLots", [
          {
            id: "ROLL-RAYON-140-101",
            lotNumber: "BATCH-RAYON-LIVA-140",
            type: "VISCOSE",
            count: "140 GSM",
            twist: 'Width 44"',
            shade: "Teal Floral Print Base",
            receivedQty: 1500,
            currentQty: 1150,
            pricePerKg: 85,
            receivedDate: "2026-05-15",
            location: "Main Fabric Roll Storage",
            supplierName: "Liva Rayon Fabrics Corp",
            status: "AVAILABLE",
            tenacity: 22.1,
            elongation: 15.2,
            moisture: 11.5,
            evenness: 1.2,
          },
          {
            id: "ROLL-COT-60S-205",
            lotNumber: "BATCH-COTTON-CAMBRIC-60S",
            type: "COTTON",
            count: "80 GSM",
            twist: 'Width 44"',
            shade: "Off-White Ivory Basis",
            receivedQty: 2500,
            currentQty: 2500,
            pricePerKg: 65,
            receivedDate: "2026-05-18",
            location: "Basement Roll Godown 2",
            supplierName: "Vardhman Cottons Ltd",
            status: "AVAILABLE",
            tenacity: 28.4,
            elongation: 6.5,
            moisture: 7.8,
            evenness: 1.4,
          },
        ]),
      );
      setDyeingJobs(
        await g<DyeingJob[]>("dyeingJobs", [
          {
            id: "DYE-101",
            jobNumber: "EMB-KRT-CHIKAN-101",
            process: "FABRIC_DYEING",
            dyeClass: "REACTIVE",
            shade: "Teal Neck Chikankari Embroidery",
            pantoneRef: "EMB-CHIK-V3",
            yarnLotId: "ROLL-RAYON-140-101",
            inputQty: 450,
            inputUnit: "KG",
            outputQty: 450,
            shrinkagePercent: 0,
            temperature: 0,
            ph: 7.0,
            duration: 240,
            isJobWork: false,
            issueDate: "2026-05-20",
            expectedDate: "2026-05-22",
            completedDate: "2026-05-22",
            status: "COMPLETED",
            colorMatchStatus: "PASS",
            fastness: { washing: 5, rubbing: 4, light: 5 },
            laborCost: 12000,
            chemicalCost: 800,
            machineCost: 2500,
            totalCost: 15300,
          },
          {
            id: "DYE-102",
            jobNumber: "PRINT-KRT-JAIPURI-102",
            process: "PRINTING",
            dyeClass: "VATS",
            shade: "Jaipuri Indigo block stamps",
            pantoneRef: "PRNT-DABU-02",
            yarnLotId: "ROLL-COT-60S-205",
            inputQty: 300,
            inputUnit: "METER",
            isJobWork: true,
            vendorName: "Classic Handprint Karigars",
            issueDate: "2026-05-29",
            expectedDate: "2026-05-31",
            status: "IN_PROCESS",
            laborCost: 7500,
            chemicalCost: 1200,
            machineCost: 0,
            totalCost: 8700,
          },
        ]),
      );
      setFabricCostings(
        await g<FabricCosting[]>("fabricCostings", [
          {
            id: "FC-101",
            name: "Summer Print Rayon Kurti (A-Line)",
            fabricType: "Rayon Liva (140 GSM)",
            width: 44,
            gsm: 140,
            construction: "60-s Cambric weave",
            items: [
              {
                id: "item-1",
                name: "Rayon Liva Base Fabric (140 GSM)",
                category: "YARN",
                qty: 2.25,
                unit: "METER",
                ratePerUnit: 85,
                wastagePercent: 4,
                amount: 198.9,
              },
              {
                id: "item-2",
                name: "Gota/Lace Trim & Branded Labels",
                category: "OTHER",
                qty: 1,
                unit: "SET",
                ratePerUnit: 24,
                wastagePercent: 0,
                amount: 24.0,
              },
              {
                id: "item-3",
                name: "Master Tailor Stitching Charge",
                category: "WEAVING",
                qty: 1,
                unit: "PIECE",
                ratePerUnit: 75,
                wastagePercent: 0,
                amount: 75.0,
              },
              {
                id: "item-4",
                name: "Front Neck Chikan Embroidery",
                category: "DYEING",
                qty: 1,
                unit: "PIECE",
                ratePerUnit: 55,
                wastagePercent: 0,
                amount: 55.0,
              },
              {
                id: "item-5",
                name: "Post-stitch Softener Wash & Iron",
                category: "FINISHING",
                qty: 1,
                unit: "PIECE",
                ratePerUnit: 15,
                wastagePercent: 0,
                amount: 15.0,
              },
              {
                id: "item-6",
                name: "Hanger, Polybag + Printed Barcode Box",
                category: "PACKING",
                qty: 1,
                unit: "PIECE",
                ratePerUnit: 20,
                wastagePercent: 0,
                amount: 20.0,
              },
            ],
            overheadPercent: 8,
            profitPercent: 20,
            taxPercent: 5,
            rawMaterialCost: 222.9,
            processingCost: 165.0,
            totalCost: 387.9,
            sellingPrice: 502.72,
            marginPercent: 20,
            status: "APPROVED",
          },
        ]),
      );
      setDispatchEntries(
        await g<DispatchEntry[]>("dispatchEntries", [
          {
            id: "DISP-101",
            dispatchNumber: "DISP-MAY-041",
            date: "2026-05-28",
            mode: "ROAD",
            status: "DISPATCHED",
            items: [
              {
                orderId: "SO-1001",
                orderNumber: "SO-1001",
                customerName: "Raimond Garments Retail",
                productName: "Designer Saree Banarasi Silk",
                qty: 250,
                unit: "PIECE",
                packed: true,
              },
            ],
            totalQty: 250,
            totalWeight: 140,
            totalValue: 125000,
            carrierName: "Gati Freight",
            vehicleNumber: "MH-12-PQ-8842",
            driverName: "Sanjay Dutt",
            driverPhone: "+91 91122 33445",
            lrNumber: "LR-882193",
            ewayBillNumber: "EWAY-9921004821",
            freightCost: 2800,
            remarks: "Loaded meticulously in dry truck bed.",
            trackingEvents: [
              {
                timestamp: "2026-05-28 10:00",
                location: "Factory Loading Chute",
                status: "Waybill Generated & Packed",
              },
              {
                timestamp: "2026-05-28 16:30",
                location: "State Border Toll Plaza",
                status: "Parcel advanced to: DISPATCHED",
              },
            ],
          },
        ]),
      );
      setPayrollAdjustments(
        await g<Record<string, PayrollAdjustment>>("payrollAdjustments", {}),
      );
      setDynamicDocuments(
        await g<Record<string, any[]>>("dynamicDocuments", {}),
      );
      setNotifications(await g<Notification[]>("notifications", []));
      setTasks(await g<Task[]>("tasks", []));
      setAuditLogs(await g<AuditLog[]>("auditLogs", []));
      setPackingSlips(await g<PackingSlip[]>("packingSlips", []));

      setLastSync(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Critical Error loading local data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (uiPrefs.theme === "dark")
      document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");

    // Apply global scale
    document.documentElement.style.setProperty(
      "--app-scale",
      (uiPrefs.scale || 1).toString(),
    );
    document.documentElement.style.fontSize = `${(uiPrefs.scale || 1) * 16}px`;
  }, [uiPrefs.theme, uiPrefs.scale]);

  const active = <T extends BaseEntity>(items: T[]) =>
    items.filter((i) => !i.deleted);

  const writeAuditLog = (
    entityType: string,
    entityId: string,
    action: AuditLog["action"],
    previousState?: unknown,
    newState?: unknown,
  ) => {
    if (!advancedConfig.enableAuditLogs) return;

    const nextLog = createAuditLog(
      entityType,
      entityId,
      action,
      previousState,
      newState,
      currentUser?.name || "Administrator",
    );
    const retentionWindow = Math.max(
      1,
      advancedConfig.auditLogRetentionDays || 90,
    );
    const cutoff = Date.now() - retentionWindow * 24 * 60 * 60 * 1000;
    const updatedLogs = [nextLog, ...auditLogs].filter(
      (log) => new Date(log.timestamp).getTime() >= cutoff,
    );

    setAuditLogs(updatedLogs);
    setItem("auditLogs", updatedLogs);
  };

  const handleCollection = <T extends BaseEntity & { id: string }>(
    key: string,
    data: T[],
    setter: React.Dispatch<React.SetStateAction<T[]>>,
  ) => ({
    add: (item: T) => {
      const nextItem = prepareDocumentCreate(
        item as T & Record<string, any>,
        currentUser?.name || "Administrator",
      ) as T;
      const newData = [nextItem, ...data];
      setter(newData);
      setItem(key, newData).catch(console.error);
      setLastSync(new Date().toLocaleTimeString());
      writeAuditLog(
        nextItem.doctype || key,
        nextItem.id,
        "CREATE",
        undefined,
        nextItem,
      );
    },
    update: (item: T) => {
      const previous = data.find((i) => (i as any).id === (item as any).id);
      const nextItem = prepareDocumentUpdate(
        item as T & Record<string, any>,
        previous as (T & Record<string, any>) | undefined,
        currentUser?.name || "Administrator",
      ) as T;
      const newData = data.map((i) =>
        (i as any).id === (item as any).id ? nextItem : i,
      );
      setter(newData);
      setItem(key, newData).catch(console.error);
      setLastSync(new Date().toLocaleTimeString());
      writeAuditLog(
        nextItem.doctype || key,
        nextItem.id,
        "UPDATE",
        previous,
        nextItem,
      );
    },
    upsert: (item: T) => {
      const exists = data.some((i) => (i as any).id === (item as any).id);
      if (exists) {
        const previous = data.find((i) => (i as any).id === (item as any).id);
        const nextItem = prepareDocumentUpdate(
          item as T & Record<string, any>,
          previous as (T & Record<string, any>) | undefined,
          currentUser?.name || "Administrator",
        ) as T;
        const newData = data.map((i) =>
          (i as any).id === (item as any).id ? nextItem : i,
        );
        setter(newData);
        setItem(key, newData).catch(console.error);
        setLastSync(new Date().toLocaleTimeString());
        writeAuditLog(
          nextItem.doctype || key,
          nextItem.id,
          "UPDATE",
          previous,
          nextItem,
        );
      } else {
        const nextItem = prepareDocumentCreate(
          item as T & Record<string, any>,
          currentUser?.name || "Administrator",
        ) as T;
        const newData = [nextItem, ...data];
        setter(newData);
        setItem(key, newData).catch(console.error);
        setLastSync(new Date().toLocaleTimeString());
        writeAuditLog(
          nextItem.doctype || key,
          nextItem.id,
          "CREATE",
          undefined,
          nextItem,
        );
      }
    },
    upsertMany: (items: T[]) => {
      const newData = [...data];
      items.forEach((item) => {
        const idx = newData.findIndex(
          (i) => (i as any).id === (item as any).id,
        );
        if (idx > -1) {
          newData[idx] = prepareDocumentUpdate(
            item as T & Record<string, any>,
            newData[idx] as T & Record<string, any>,
            currentUser?.name || "Administrator",
          ) as T;
        } else {
          newData.unshift(
            prepareDocumentCreate(
              item as T & Record<string, any>,
              currentUser?.name || "Administrator",
            ) as T,
          );
        }
      });
      setter(newData);
      setItem(key, newData).catch(console.error);
      setLastSync(new Date().toLocaleTimeString());
      writeAuditLog(key, `${items.length} records`, "UPDATE", undefined, {
        count: items.length,
        collection: key,
      });
    },
    remove: (id: string) => {
      const previous = data.find((i) => (i as any).id === id);
      const deletedItem = previous
        ? (prepareDocumentDelete(
            previous as T & Record<string, any>,
            currentUser?.name || "Administrator",
          ) as T)
        : undefined;
      const newData = data.map((i) =>
        (i as any).id === id && deletedItem ? deletedItem : i,
      );
      setter(newData);
      setItem(key, newData).catch(console.error);
      setLastSync(new Date().toLocaleTimeString());
      if (deletedItem)
        writeAuditLog(
          deletedItem.doctype || key,
          deletedItem.id,
          "DELETE",
          previous,
          deletedItem,
        );
    },
  });

  const ordMgr = handleCollection("orders", orders, setOrders);
  const prodMgr = handleCollection("production", production, setProduction);
  const designMgr = handleCollection("designs", designs, setDesigns);
  const karigarMgr = handleCollection("karigars", karigars, setKarigars);
  const agentMgr = handleCollection("agents", agents, setAgents);
  const quotationMgr = handleCollection(
    "quotations",
    quotations,
    setQuotations,
  );
  const purchaseInvoiceMgr = handleCollection(
    "purchaseInvoices",
    purchaseInvoices,
    setPurchaseInvoices,
  );
  const materialReqMgr = handleCollection(
    "materialRequests",
    materialRequests,
    setMaterialRequests,
  );
  const supplierQuotationsMgr = handleCollection(
    "supplierQuotations",
    supplierQuotations,
    setSupplierQuotations,
  );
  const timesheetMgr = handleCollection(
    "timesheets",
    timesheets,
    setTimesheets,
  );
  const posInvoiceMgr = handleCollection(
    "posInvoices",
    posInvoices,
    setPosInvoices,
  );
  const vehicleMgr = handleCollection("vehicles", vehicles, setVehicles);
  const expenseClaimMgr = handleCollection(
    "expenseClaims",
    expenseClaims,
    setExpenseClaims,
  );
  const supportTicketMgr = handleCollection(
    "supportTickets",
    supportTickets,
    setSupportTickets,
  );
  const custMgr = handleCollection("customers", customers, setCustomers);
  const supplierMgr = handleCollection("suppliers", suppliers, setSuppliers);
  const warehouseMgr = handleCollection(
    "warehouses",
    warehouses,
    setWarehouses,
  );
  const teamMgr = handleCollection("team", team, setTeam);
  const invMgr = handleCollection("inventory", inventory, setInventory);
  const txnMgr = handleCollection(
    "transactions",
    transactions,
    setTransactions,
  );
  const jobWorkMgr = handleCollection("jobWorks", jobWorks, setJobWorks);
  const sampleMgr = handleCollection("samples", samples, setSamples);
  const qualityMgr = handleCollection(
    "qualityReports",
    qualityReports,
    setQualityReports,
  );
  const inspectionMgr = handleCollection(
    "inspections",
    inspections,
    setInspections,
  );
  const attendanceMgr = handleCollection(
    "attendance",
    attendance,
    setAttendance,
  );
  const loanMgr = handleCollection("loans", loans, setLoans);
  const leaveMgr = handleCollection("leaves", leaves, setLeaves);
  const packMgr = handleCollection("packs", packs, setPacks);
  const transferMgr = handleCollection("transfers", transfers, setTransfers);
  const gatePassMgr = handleCollection("gatePasses", gatePasses, setGatePasses);
  const wasteMgr = handleCollection("wasteLogs", wasteLogs, setWasteLogs);
  const brokerMgr = handleCollection("brokerLogs", brokerLogs, setBrokerLogs);
  const marginCostingMgr = handleCollection(
    "marginCostings",
    marginCostings,
    setMarginCostings,
  );
  const auditMgr = handleCollection("stockAudits", stockAudits, setStockAudits);
  const projectMgr = handleCollection("projects", projects, setProjects);
  const machineMgr = handleCollection("machines", machines, setMachines);
  const yarnMgr = handleCollection("yarnLots", yarnLots, setYarnLots);
  const dyeingMgr = handleCollection("dyeingJobs", dyeingJobs, setDyeingJobs);
  const costingMgr = handleCollection(
    "fabricCostings",
    fabricCostings,
    setFabricCostings,
  );
  const dispatchMgr = handleCollection(
    "dispatchEntries",
    dispatchEntries,
    setDispatchEntries,
  );
  const packingSlipMgr = handleCollection(
    "packingSlips",
    packingSlips,
    setPackingSlips,
  );
  const rolePermMgr = handleCollection(
    "rolePermissions",
    rolePermissions,
    setRolePermissions,
  );
  // Additional named managers to avoid inline handleCollection stale-closure bugs
  const leadMgr = handleCollection("leads", leads, setLeads);
  const maintenanceMgr = handleCollection("maintenance", maintenance, setMaintenance);
  const poMgr = handleCollection("purchaseOrders", purchaseOrders, setPurchaseOrders);
  const galleryMgr = handleCollection("gallery", gallery, setGallery);

  const effectiveFeatures = useMemo(() => {
    let ef = { ...features };
    if (currentUser && currentUser.role !== "ADMIN") {
      rolePermissions.forEach((rp) => {
        if (rp.role === currentUser.role && rp.canRead === false) {
          ef[rp.module] = false;
        }
      });
    }
    return ef;
  }, [features, currentUser, rolePermissions]);

  /** Returns CRUD flags for a given module for the current user */
  const checkPermission = (module: string) => {
    if (!currentUser || currentUser.role === "ADMIN") {
      return { canRead: true, canCreate: true, canUpdate: true, canDelete: true };
    }
    const rp = rolePermissions.find(p => p.role === currentUser.role && p.module === module);
    if (!rp) return { canRead: true, canCreate: true, canUpdate: true, canDelete: true }; // default full
    return { canRead: rp.canRead, canCreate: rp.canCreate, canUpdate: rp.canUpdate, canDelete: rp.canDelete };
  };

  const handleDyeingJobUpdate = (job: DyeingJob) => {
    dyeingMgr.update(job);

    if (job.status === "COMPLETED") {
      const rawLot = yarnLots.find((l) => l.id === job.yarnLotId);
      if (rawLot) {
        const updatedRawQty = Math.max(
          0,
          Number((rawLot.currentQty - job.inputQty).toFixed(2)),
        );
        const rawLotStatus = updatedRawQty <= 1 ? "CONSUMED" : rawLot.status;

        const updatedRawLot: YarnLot = {
          ...rawLot,
          currentQty: updatedRawQty,
          status: rawLotStatus as any,
        };
        yarnMgr.update(updatedRawLot);

        const dyedLotId = `LOT-DYED-${Date.now().toString().slice(-4)}`;
        const dyedLotNum = `${rawLot.lotNumber}-${job.shade || "DYED"}-LOT`;

        const newDyedLot: YarnLot = {
          id: dyedLotId,
          lotNumber: dyedLotNum,
          type: rawLot.type,
          count: rawLot.count,
          twist: rawLot.twist,
          shade: job.shade || "Dyed Shade",
          currentQty: job.outputQty || job.inputQty,
          receivedQty: job.outputQty || job.inputQty,
          receivedDate: new Date().toISOString().split("T")[0],
          pricePerKg:
            rawLot.pricePerKg +
            Number(
              ((job.totalCost || 0) / (job.outputQty || job.inputQty)).toFixed(
                2,
              ),
            ),
          location: "Dye-House Buffer",
          supplierName: "Internal Dyeing & Wet Processing",
          status: "AVAILABLE",
          notes: `Dyed from source lot ${rawLot.lotNumber} via Job card ${job.jobNumber}. Sourced price ${currencySymbol}${rawLot.pricePerKg} + chemical/machine overhead.`,
          tenacity: job.fastness
            ? (rawLot.tenacity || 20) * 0.95
            : rawLot.tenacity,
          elongation: rawLot.elongation,
          moisture: 7.5,
          evenness: rawLot.evenness,
        };
        yarnMgr.add(newDyedLot);
      }
    }
  };

  const handleUpdatePayrollAdjustment = (
    key: string,
    adjustment: PayrollAdjustment,
  ) => {
    const previous = payrollAdjustments[key];
    const newAdjustments = { ...payrollAdjustments, [key]: adjustment };
    setPayrollAdjustments(newAdjustments);
    setItem("payrollAdjustments", newAdjustments);
    setLastSync(new Date().toLocaleTimeString());
    writeAuditLog(
      "payrollAdjustments",
      key,
      previous ? "UPDATE" : "CREATE",
      previous,
      adjustment,
    );
  };

  const handleUpdateUiPrefs = (prefs: UIPreferences) => {
    setUiPrefs(prefs);
    setItem("uiPrefs", prefs);
  };

  const handleUpdateCompanyInfo = (info: CompanyInfo) => {
    setCompanyInfo(info);
    setItem("companyInfo", info);
  };

  const handleUpdateFeatures = (newFeatures: Record<string, boolean>) => {
    setFeatures(newFeatures);
    setItem("texflow_features", newFeatures);
  };

  const handleUpdateShopifyConfig = (config: ShopifyConfig) => {
    setShopifyConfig(config);
    setItem("texflow_shopify_config", config);
  };

  const handleUpdateSecurityConfig = (config: SecurityConfig) => {
    setSecurityConfig(config);
    setItem("texflow_security_config", config);
  };

  const handleUpdateCommunicationConfig = (config: CommunicationConfig) => {
    setCommunicationConfig(config);
    setItem("texflow_communication_config", config);
  };

  const handleUpdateAdvancedConfig = (config: AdvancedConfig) => {
    setAdvancedConfig(config);
    setItem("texflow_advanced_config", config);
  };

  const handleAddNotification = (notification: Partial<Notification>) => {
    const newNotif: Notification = {
      id: Date.now().toString(),
      title: notification.title || "Notification",
      message: notification.message || "",
      type: notification.type || "INFO",
      read: false,
      createdAt: new Date().toISOString(),
      ...notification,
    };
    const updated = [newNotif, ...notifications];
    setNotifications(updated);
    setItem("notifications", updated);
  };

  const handleMarkAsRead = (id: string) => {
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n,
    );
    setNotifications(updated);
    setItem("notifications", updated);
  };

  const handleMarkAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    setItem("notifications", updated);
  };

  const handleDeleteNotification = (id: string) => {
    const updated = notifications.filter((n) => n.id !== id);
    setNotifications(updated);
    setItem("notifications", updated);
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
    setItem("notifications", []);
  };

  const handleAddTask = (task: Partial<Task>) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: task.title || "New Task",
      description: task.description || "",
      status: task.status || "TODO",
      priority: task.priority || "MEDIUM",
      dueDate: task.dueDate || new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
      ...task,
    };
    const updated = [newTask, ...tasks];
    setTasks(updated);
    setItem("tasks", updated);
  };

  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, ...updates } : t));
    setTasks(updated);
    setItem("tasks", updated);
  };

  const handleDeleteTask = (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    setItem("tasks", updated);
  };

  const handleUpdateInvoiceConfig = (config: InvoiceConfig) => {
    setInvoiceConfig(config);
    setItem("texflow_invoice_config", config);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const handleJobUpdate = (updatedJob: ProductionJob) => {
    const oldJob = production.find((p) => p.id === updatedJob.id);
    prodMgr.update(updatedJob);

    if (oldJob?.status !== "COMPLETED" && updatedJob.status === "COMPLETED") {
      // Match design by designId first (stable), then fall back to name (legacy)
      const design = designs.find(
        (d) => (updatedJob as any).designId
          ? d.id === (updatedJob as any).designId
          : d.name.trim().toLowerCase() === updatedJob.productName?.trim().toLowerCase()
      );
      if (design && design.recipe) {
        const newInv = [...inventory];
        design.recipe.forEach((rm) => {
          const idx = newInv.findIndex(
            (i) => i.name.trim().toLowerCase() === rm.materialName.trim().toLowerCase()
          );
          if (idx >= 0) {
            newInv[idx] = {
              ...newInv[idx],
              quantity: Math.max(
                0,
                newInv[idx].quantity - rm.quantity * updatedJob.quantity,
              ),
            };
          }
        });
        const fgIdx = newInv.findIndex(
          (i) => i.name.trim().toLowerCase() === updatedJob.productName?.trim().toLowerCase(),
        );
        if (fgIdx >= 0) {
          newInv[fgIdx] = {
            ...newInv[fgIdx],
            quantity: newInv[fgIdx].quantity + updatedJob.quantity,
          };
        } else {
          newInv.push({
            id: `INV-${Date.now()}`,
            name: updatedJob.productName,
            type: "FABRIC",
            unit: "PIECE",
            quantity: updatedJob.quantity,
            minStockLevel: 5,
            pricePerUnit: design.processCostPerPiece || 0,
            location: "Finished Goods",
          } as InventoryItem);
        }
        setInventory(newInv);
        setItem("inventory", newInv);
      }
    }
  };

  const handleAction = (action: string, data: any) => {
    switch (action) {
      case "CONVERT_TO_SALES_ORDER":
        const newSalesOrder = createERPDocument("ORDERS", {
          ...data,
          status: "PENDING",
          orderDate: new Date().toISOString().split("T")[0],
        });
        ordMgr.add(newSalesOrder);
        setCurrentView("ORDERS");
        break;
      case "CONVERT_TO_DELIVERY_NOTE":
        // Store the source order id so DeliveryChallan can pre-populate the form
        setPendingDeliveryOrderId(data?.id || undefined);
        setCurrentView("DELIVERY_CHALLAN");
        break;
      case "CONVERT_TO_INVOICE":
        setCurrentView("TAX_INVOICE");
        break;
      case "CONVERT_TO_WORK_ORDER_FROM_SAMPLE":
        const productionFromSample = createERPDocument("PRODUCTION", {
          productName: data.designName || "Custom Product",
          quantity: data.quantity || 1,
          status: "PLANNED",
          startDate: new Date().toISOString().split("T")[0],
          deadline: data.targetDate || new Date().toISOString().split("T")[0],
          currentStage: "PLANNING",
          qualityStatus: "PENDING",
          priority: data.priority || "NORMAL",
          progress: 0,
          styleCode:
            data.styleCode ||
            `STL-${Math.floor(1000 + Math.random() * 9000).toString()}`,
          sourceDoc: `Sample Request #${data.id}`,
          sizeWise: data.sizeWise || { M: data.quantity || 1 },
        });
        prodMgr.add(
          productionFromSample,
        );
        handleAddNotification({
          title: "Work Order Triggered",
          message: `Successfully spawned Work Order from approved Sample Request #${data.id} (${data.designName}).`,
          type: "SUCCESS",
        });
        setCurrentView("PRODUCTION");
        break;
      case "CONVERT_TO_WORK_ORDER":
        const productionBase = createERPDocument("PRODUCTION", {
          productName: data.items?.[0]?.productName || "Custom Product",
          quantity: data.items?.[0]?.quantity || 1,
          status: "PLANNED",
          startDate: new Date().toISOString().split("T")[0],
          deadline: data.dueDate || new Date().toISOString().split("T")[0],
          currentStage: "PLANNING",
          qualityStatus: "PENDING",
          priority: data.priority || "NORMAL",
          progress: 0,
        });
        prodMgr.add(
          productionBase,
        );
        setCurrentView("PRODUCTION");
        break;
      case "CONVERT_TO_JOB_CARD":
        const jobCardBase = createERPDocument("JOB_WORK", {
          status: "ISSUED",
          process:
            data.status === "CUTTING"
              ? "CUTTING"
              : data.status === "STITCHING"
                ? "STITCHING"
                : "DYEING",
          issueDate: new Date().toISOString().split("T")[0],
          expectedDate: data.deadline || new Date().toISOString().split("T")[0],
          paymentStatus: "UNPAID",
          notes: `Auto-generated from Work Order: ${data.id}`,
          items: [
            {
              id: `JCI-${Date.now()}`,
              description: data.productName || "Fabric/Garment Item",
              issuedQuantity: data.quantity || 0,
              unit: "PIECE", // default to piece for apparel
              rate: 0,
              receivedQuantity: 0,
            },
          ],
        });
        jobWorkMgr.add(
          jobCardBase as any,
        );
        setCurrentView("JOB_WORK");
        break;
      case "CONVERT_TO_SUBCONTRACTING_FROM_ROUTE":
        const jobWorkOperations = (data.operations || []).filter(
          (operation: any) => operation.processType === "JOB_WORK",
        );
        const generatedJobWorks = jobWorkOperations.map(
          (operation: any, index: number) =>
            createERPDocument("JOB_WORK", {
              challanNumber: `SC-${String(Date.now()).slice(-6)}-${index + 1}`,
              vendorName: operation.assignedTo
                ? karigars.find((k) => k.id === operation.assignedTo)?.name ||
                  "Subcontract Vendor"
                : "Subcontract Vendor",
              process: operation.name || operation.stage || "JOB_WORK",
              issueDate: new Date().toISOString().split("T")[0],
              expectedDate:
                data.deadline || new Date().toISOString().split("T")[0],
              status: "ISSUED",
              paymentStatus: "UNPAID",
              sourceWorkOrderId: data.id,
              sourceOperationId: operation.id,
              styleCode: data.styleCode,
              color: data.color,
              fabricLot: data.fabricLot,
              items: [
                {
                  id: `JCI-${Date.now()}-${index}`,
                  description: `${data.productName || "Garment"} - ${operation.name}`,
                  issuedQuantity:
                    data.quantity || operation.completedQuantity || 0,
                  receivedQuantity: 0,
                  quantity: data.quantity || 0,
                  unit: "PIECE",
                  rate: operation.defaultRate || 0,
                  wastagePercent: 0,
                  rejectedQuantity: 0,
                  receiptHistory: [],
                },
              ],
              totalCost: (data.quantity || 0) * (operation.defaultRate || 0),
            }),
        );
        if (generatedJobWorks.length) {
          jobWorkMgr.upsertMany(
            generatedJobWorks as any[],
          );
          const updatedOperations = (data.operations || []).map(
            (operation: any) =>
              operation.processType === "JOB_WORK"
                ? {
                    ...operation,
                    status:
                      operation.status === "PENDING"
                        ? "IN_PROGRESS"
                        : operation.status,
                  }
                : operation,
          );
          prodMgr.update({
            ...data,
            operations: updatedOperations,
          });
        }
        setCurrentView("JOB_WORK");
        break;
      case "CONVERT_TO_MATERIAL_REQUEST":
        const mrBase = createERPDocument("MATERIAL_REQUEST", {
          status: "PENDING",
          date: new Date().toISOString().split("T")[0],
          requestedBy: currentUser?.name || "Administrator",
          items: (data.recipe || data.materials || []).map((i: any) => ({
            productName: i.materialName || i.productName || "Raw Material",
            quantity: i.totalRequired || i.quantity || 1,
            unit: i.unit || "PIECE",
            purpose: data.id
              ? `For Work Order: ${data.id}`
              : "Production Purpose",
          })),
        });
        if (!mrBase.items.length) {
          mrBase.items.push({
            productName: "Raw Material",
            quantity: 1,
            unit: "PIECE",
            purpose: "Production Purpose",
          });
        }
        materialReqMgr.add(mrBase as any);
        setCurrentView("MATERIAL_REQUEST");
        break;
      case "CONVERT_TO_WORK_ORDER_FROM_RECIPE":
        const productionBaseRec = createERPDocument("PRODUCTION", {
          productName: data.name || "Custom Product",
          quantity: data.quantity || 1,
          status: "PLANNED",
          startDate: new Date().toISOString().split("T")[0],
          deadline: new Date().toISOString().split("T")[0],
          currentStage: "PLANNING",
          qualityStatus: "PENDING",
          priority: data.priority || "NORMAL",
          progress: 0,
        });
        prodMgr.add(
          productionBaseRec,
        );
        setCurrentView("PRODUCTION");
        break;
      case "CONVERT_TO_PO":
        const poBase = createERPDocument("PURCHASE_ORDER", {
          ...data,
          status: "DRAFT",
          date: new Date().toISOString().split("T")[0],
          items: (data.items || []).map((i: any) => ({
            ...i,
            received: 0,
            returned: 0,
          })),
        });
        poMgr.add(poBase);
        setCurrentView("PURCHASE_ORDER");
        break;
      case "CONVERT_TO_PURCHASE_RECEIPT":
        setCurrentView("PURCHASE_INWARD");
        break;
      case "CONVERT_TO_PURCHASE_INVOICE":
        setCurrentView("PURCHASE_INVOICE");
        break;
      case "CONVERT_TO_PURCHASE_RETURN":
        // Mark PO as cancelled and create a debit note transaction
        const retPO = purchaseOrders.find((p) => p.id === data.id);
        if (retPO) {
          poMgr.update({
            ...retPO,
            status: "CANCELLED",
          });
          txnMgr.add({
            id: `DN-${Date.now()}`,
            date: new Date().toISOString().split("T")[0],
            description: `Purchase Return: ${retPO.supplierName} - PO ${retPO.id}`,
            amount: retPO.totalAmount,
            type: "INCOME",
            category: "PURCHASE_RETURN",
            paymentMethod: "ADJUSTMENT",
            subType: "DEBIT_NOTE",
            referenceId: retPO.id,
          } as Transaction);
          handleAddNotification({
            title: "Purchase Return Initiated",
            message: `PO ${retPO.id} cancelled and debit note created.`,
            type: "SUCCESS",
          });
        }
        setCurrentView("PURCHASE_RETURN");
        break;
      case "CONVERT_TO_SALES_RETURN":
        // Pre-populate a return order from the sales order and navigate to Sales Return
        const retOrder = createERPDocument("ORDERS", {
          ...data,
          id: `RET-${Date.now().toString().slice(-4)}`,
          status: "RETURNED",
          paymentStatus: "REFUND_PENDING",
          shippingAddress: `Reason: Customer Return. Original Order: ${data.id}`,
        });
        ordMgr.add(retOrder);
        handleAddNotification({
          title: "Sales Return Created",
          message: `Return ${retOrder.id} created from Order ${data.id}.`,
          type: "SUCCESS",
        });
        setCurrentView("SALES_RETURN");
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-macos-bg dark:bg-black text-slate-900 dark:text-white gap-8">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-macos-accent animate-spin opacity-20" />
          <Loader2
            className="w-16 h-16 text-macos-accent animate-spin absolute top-0 left-0"
            style={{ animationDuration: "3s" }}
          />
        </div>
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight">
            Ravi-Textile ERP
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm animate-pulse">
            Initializing macOS Interface...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // FIX #1: Credentials are validated against the team list stored in the vault.
    // The seed admin account uses a stored password hash (SHA-256 of the password).
    // The actual comparison happens here so the password never leaves as a plaintext literal.
    const handleLogin = async (
      username: string,
      password: string,
    ): Promise<boolean> => {
      const hashHex = await hashPassword(password);

      let currentTeam = team;
      try {
        const { getVaultSnapshot, getItem } =
          await import("./utils/networkClient");
        const snapshot = await getVaultSnapshot();
        if (snapshot && snapshot.team) {
          currentTeam = snapshot.team;
        } else {
          // Verify via indexedDB fallback in server/local mode just in case team is stale
          const localTeam = await getItem("team");
          if (localTeam) currentTeam = localTeam as TeamMember[];
        }
      } catch (err) {
        console.warn("Failed to update team list before login validation", err);
      }

      // Check against team members who have a stored passwordHash
      // FIX: match by id OR name so that 'admin' matches the admin member (id='admin', name='Administrator')
      // FIX: also ensure member is ACTIVE and not soft-deleted
      const member = currentTeam.find(
        (t) =>
          (t.username?.toLowerCase() === username.toLowerCase() ||
            t.name?.toLowerCase() === username.toLowerCase() ||
            (t as any).id?.toLowerCase() === username.toLowerCase()) &&
          (t as any).passwordHash === hashHex &&
          t.status === "ACTIVE" &&
          !t.deleted,
      );
      if (member) {
        setIsAuthenticated(true);
        setCurrentUser(member);
        refreshData();
        return true;
      }

      // Seed admin: only works when NO team members exist yet (first boot).
      // Uses a well-known default — user is forced to change it immediately after.
      const SEED_HASH =
        "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9"; // admin123
      const activeTeam = currentTeam.filter((t) => !t.deleted);
      if (
        username === "admin" &&
        hashHex === SEED_HASH &&
        activeTeam.length === 0
      ) {
        setIsAuthenticated(true);
        setCurrentUser({
          id: "admin",
          name: "Administrator",
          role: "ADMIN",
          status: "ACTIVE",
        } as TeamMember);
        setMustChangePassword(true);
        refreshData();
        return true;
      }

      return false;
    };

    return (
      <Login
        onLogin={handleLogin}
        companyInfo={companyInfo}
        teamCount={team.length}
      />
    );
  }

  const currencySymbol =
    (invoiceConfig.currency === "INR"
      ? "₹"
      : invoiceConfig.currency === "USD"
        ? "$"
        : invoiceConfig.currency === "EUR"
          ? "€"
          : invoiceConfig.currency) || "₹";
  const currentDocType = getDocTypeSchema(currentView);
  const buildDocTypeStat = (items: BaseEntity[]): DocTypeStat => {
    const activeItems = active(items);
    const statusCounts = activeItems.reduce<Record<string, number>>(
      (acc, item) => {
        const status = String((item as any).status || item.docstatus || "OPEN");
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {},
    );

    return {
      total: activeItems.length,
      draft: activeItems.filter((item) => (item.docstatus ?? 0) === 0).length,
      submitted: activeItems.filter((item) => item.docstatus === 1).length,
      cancelled: items.filter((item) => item.deleted || item.docstatus === 2)
        .length,
      statusCounts,
    };
  };
  const docTypeStats: Partial<Record<ViewState, DocTypeStat>> = {
    QUOTATION: buildDocTypeStat(quotations),
    ORDERS: buildDocTypeStat(orders),
    POS: buildDocTypeStat(posInvoices),
    PRODUCTION: buildDocTypeStat(production),
    JOB_WORK: buildDocTypeStat(jobWorks),
    MATERIAL_REQUEST: buildDocTypeStat(materialRequests),
    SUPPLIER_QUOTATION: buildDocTypeStat(supplierQuotations),
    PURCHASE_ORDER: buildDocTypeStat(purchaseOrders),
    PURCHASE_INVOICE: buildDocTypeStat(purchaseInvoices),
    INVENTORY: buildDocTypeStat(inventory),
    STOCK_TRANSFER: buildDocTypeStat(transfers),
    STOCK_AUDIT: buildDocTypeStat(stockAudits),
    QUALITY: buildDocTypeStat(qualityReports),
    CUSTOMERS: buildDocTypeStat(customers),
    SUPPLIERS: buildDocTypeStat(suppliers),
    TEAM: buildDocTypeStat(team),
    KARIGARS: buildDocTypeStat(karigars),
    AGENTS: buildDocTypeStat(agents),
    CRM: buildDocTypeStat(leads),
    SUPPORT_TICKET: buildDocTypeStat(supportTickets),
    PROJECTS: buildDocTypeStat(projects),
    TASKS: buildDocTypeStat(tasks),
    TIMESHEET: buildDocTypeStat(timesheets),
    EXPENSE_CLAIM: buildDocTypeStat(expenseClaims),
    LEAVE_APP: buildDocTypeStat(leaves),
    ATTENDANCE: buildDocTypeStat(attendance),
    ASSETS: buildDocTypeStat(machines),
    VEHICLES: buildDocTypeStat(vehicles),
  };
  const workflowCollections: WorkflowInboxCollection[] = [
    {
      view: "ORDERS",
      label: "Sales Order",
      documents: active(orders),
      onUpdate: (document) => ordMgr.update(document as Order),
    },
    {
      view: "PRODUCTION",
      label: "Work Order",
      documents: active(production),
      onUpdate: (document) => handleJobUpdate(document as ProductionJob),
    },
    {
      view: "PURCHASE_ORDER",
      label: "Purchase Order",
      documents: active(purchaseOrders),
      onUpdate: (document) =>
        poMgr.update(document as PurchaseOrder),
    },
    {
      view: "MATERIAL_REQUEST",
      label: "Material Request",
      documents: active(materialRequests),
      onUpdate: (document) =>
        materialReqMgr.update(document as MaterialRequest),
    },
  ];
  const reportCollections: ReportCollection[] = [
    { view: "ORDERS", label: "Sales Order", documents: active(orders) },
    { view: "PRODUCTION", label: "Work Order", documents: active(production) },
    {
      view: "PURCHASE_ORDER",
      label: "Purchase Order",
      documents: active(purchaseOrders),
    },
    {
      view: "MATERIAL_REQUEST",
      label: "Material Request",
      documents: active(materialRequests),
    },
    { view: "INVENTORY", label: "Item", documents: active(inventory) },
    {
      view: "QUALITY",
      label: "Quality Inspection",
      documents: active(qualityReports),
    },
  ];
  const documentDeskCollections: DocumentDeskCollection[] = [
    {
      view: "QUOTATION",
      label: "Quotation",
      documents: active(quotations),
      onAdd: (document) => quotationMgr.add(document as Order),
      onUpdate: (document) => quotationMgr.update(document as Order),
      onDelete: quotationMgr.remove,
    },
    {
      view: "ORDERS",
      label: "Sales Order",
      documents: active(orders),
      onAdd: (document) => ordMgr.add(document as Order),
      onUpdate: (document) => ordMgr.update(document as Order),
      onDelete: ordMgr.remove,
    },
    {
      view: "MATERIAL_REQUEST",
      label: "Material Request",
      documents: active(materialRequests),
      onAdd: (document) => materialReqMgr.add(document as MaterialRequest),
      onUpdate: (document) =>
        materialReqMgr.update(document as MaterialRequest),
      onDelete: materialReqMgr.remove,
    },
    {
      view: "SUPPLIER_QUOTATION",
      label: "Supplier Quotation",
      documents: active(supplierQuotations),
      onAdd: (document) =>
        supplierQuotationsMgr.add(document as SupplierQuotation),
      onUpdate: (document) =>
        supplierQuotationsMgr.update(document as SupplierQuotation),
      onDelete: supplierQuotationsMgr.remove,
    },
    {
      view: "PURCHASE_ORDER",
      label: "Purchase Order",
      documents: active(purchaseOrders),
      onAdd: (document) =>
        poMgr.add(document as PurchaseOrder),
      onUpdate: (document) =>
        poMgr.update(document as PurchaseOrder),
      onDelete: poMgr.remove,
    },
    {
      view: "PURCHASE_INVOICE",
      label: "Purchase Invoice",
      documents: active(purchaseInvoices),
      onAdd: (document) => purchaseInvoiceMgr.add(document as PurchaseOrder),
      onUpdate: (document) =>
        purchaseInvoiceMgr.update(document as PurchaseOrder),
    },
    {
      view: "PRODUCTION",
      label: "Work Order",
      documents: active(production),
      onAdd: (document) => prodMgr.add(document as ProductionJob),
      onUpdate: (document) => handleJobUpdate(document as ProductionJob),
      onDelete: prodMgr.remove,
    },
    {
      view: "JOB_WORK",
      label: "Subcontracting Order",
      documents: active(jobWorks),
      onAdd: (document) => jobWorkMgr.add(document as JobWork),
      onUpdate: (document) => jobWorkMgr.update(document as JobWork),
      onDelete: jobWorkMgr.remove,
    },
    {
      view: "INVENTORY",
      label: "Item",
      documents: active(inventory),
      onAdd: (document) => invMgr.add(document as InventoryItem),
      onUpdate: (document) => invMgr.update(document as InventoryItem),
      onDelete: invMgr.remove,
    },
    {
      view: "QUALITY",
      label: "Quality Inspection",
      documents: active(qualityReports),
      onAdd: (document) => qualityMgr.add(document as QualityReport),
      onUpdate: (document) => qualityMgr.update(document as QualityReport),
    },
    {
      view: "CUSTOMERS",
      label: "Customer",
      documents: active(customers),
      onAdd: (document) => custMgr.add(document as Customer),
      onUpdate: (document) => custMgr.update(document as Customer),
      onDelete: custMgr.remove,
    },
    {
      view: "SUPPLIERS",
      label: "Supplier",
      documents: active(suppliers),
      onAdd: (document) => supplierMgr.add(document as Supplier),
      onUpdate: (document) => supplierMgr.update(document as Supplier),
      onDelete: supplierMgr.remove,
    },
    {
      view: "OFFICES",
      label: "Warehouse",
      documents: active(warehouses),
      onAdd: (document) => warehouseMgr.add(document as Warehouse),
      onUpdate: (document) => warehouseMgr.update(document as Warehouse),
      onDelete: warehouseMgr.remove,
    },
    {
      view: "TASKS",
      label: "Task",
      documents: active(tasks),
      onAdd: (document) => handleAddTask(document as Task),
      onUpdate: (document) => handleUpdateTask(document.id, document as Task),
      onDelete: handleDeleteTask,
    },
    {
      view: "PROJECTS",
      label: "Project",
      documents: active(projects),
      onAdd: (document) => projectMgr.add(document as Project),
      onUpdate: (document) => projectMgr.update(document as Project),
      onDelete: projectMgr.remove,
    },
  ];
  const dataImportCollections: DataImportCollection[] = [
    {
      view: "QUOTATION",
      label: "Quotation",
      documents: active(quotations),
      onImport: (documents) => quotationMgr.upsertMany(documents as Order[]),
    },
    {
      view: "ORDERS",
      label: "Sales Order",
      documents: active(orders),
      onImport: (documents) => ordMgr.upsertMany(documents as Order[]),
    },
    {
      view: "MATERIAL_REQUEST",
      label: "Material Request",
      documents: active(materialRequests),
      onImport: (documents) =>
        materialReqMgr.upsertMany(documents as MaterialRequest[]),
    },
    {
      view: "SUPPLIER_QUOTATION",
      label: "Supplier Quotation",
      documents: active(supplierQuotations),
      onImport: (documents) =>
        supplierQuotationsMgr.upsertMany(documents as SupplierQuotation[]),
    },
    {
      view: "PURCHASE_ORDER",
      label: "Purchase Order",
      documents: active(purchaseOrders),
      onImport: (documents) =>
        poMgr.upsertMany(documents as PurchaseOrder[]),
    },
    {
      view: "PURCHASE_INVOICE",
      label: "Purchase Invoice",
      documents: active(purchaseInvoices),
      onImport: (documents) =>
        purchaseInvoiceMgr.upsertMany(documents as PurchaseOrder[]),
    },
    {
      view: "PRODUCTION",
      label: "Work Order",
      documents: active(production),
      onImport: (documents) => prodMgr.upsertMany(documents as ProductionJob[]),
    },
    {
      view: "JOB_WORK",
      label: "Subcontracting Order",
      documents: active(jobWorks),
      onImport: (documents) => jobWorkMgr.upsertMany(documents as JobWork[]),
    },
    {
      view: "INVENTORY",
      label: "Item",
      documents: active(inventory),
      onImport: (documents) => invMgr.upsertMany(documents as InventoryItem[]),
    },
    {
      view: "QUALITY",
      label: "Quality Inspection",
      documents: active(qualityReports),
      onImport: (documents) =>
        qualityMgr.upsertMany(documents as QualityReport[]),
    },
    {
      view: "CUSTOMERS",
      label: "Customer",
      documents: active(customers),
      onImport: (documents) => custMgr.upsertMany(documents as Customer[]),
    },
    {
      view: "SUPPLIERS",
      label: "Supplier",
      documents: active(suppliers),
      onImport: (documents) => supplierMgr.upsertMany(documents as Supplier[]),
    },
    {
      view: "OFFICES",
      label: "Warehouse",
      documents: active(warehouses),
      onImport: (documents) =>
        warehouseMgr.upsertMany(documents as Warehouse[]),
    },
    {
      view: "TASKS",
      label: "Task",
      documents: active(tasks),
      onImport: (documents) => {
        const normalized = documents.map((document) => ({
          status: "TODO",
          priority: "MEDIUM",
          dueDate: new Date().toISOString().split("T")[0],
          ...document,
        })) as Task[];
        const merged = [
          ...normalized,
          ...tasks.filter(
            (task) => !normalized.some((document) => document.id === task.id),
          ),
        ];
        setTasks(merged);
        setItem("tasks", merged);
      },
    },
    {
      view: "PROJECTS",
      label: "Project",
      documents: active(projects),
      onImport: (documents) => projectMgr.upsertMany(documents as Project[]),
    },
  ];

  const dynamicDocMgr = {
    add: (view: string, doc: any) => {
      setDynamicDocuments((prev) => {
        const list = prev[view] || [];
        const nextItem = prepareDocumentCreate(
          doc,
          currentUser?.name || "User",
        );
        const newData = { ...prev, [view]: [nextItem, ...list] };
        setItem("dynamicDocuments", newData);
        setLastSync(new Date().toLocaleTimeString());
        writeAuditLog(view, nextItem.id, "CREATE", undefined, nextItem);
        return newData;
      });
    },
    update: (view: string, doc: any) => {
      setDynamicDocuments((prev) => {
        const list = prev[view] || [];
        const previous = list.find((i: any) => i.id === doc.id);
        const nextItem = prepareDocumentUpdate(
          doc,
          previous,
          currentUser?.name || "User",
        );
        const newData = {
          ...prev,
          [view]: list.map((i: any) => (i.id === doc.id ? nextItem : i)),
        };
        setItem("dynamicDocuments", newData);
        setLastSync(new Date().toLocaleTimeString());
        writeAuditLog(view, nextItem.id, "UPDATE", previous, nextItem);
        return newData;
      });
    },
    remove: (view: string, id: string) => {
      setDynamicDocuments((prev) => {
        const list = prev[view] || [];
        const previous = list.find((i: any) => i.id === id);
        const deletedItem = previous
          ? prepareDocumentDelete(previous, currentUser?.name || "User")
          : undefined;
        const newData = {
          ...prev,
          [view]: list.map((i: any) =>
            i.id === id && deletedItem ? deletedItem : i,
          ),
        };
        setItem("dynamicDocuments", newData);
        setLastSync(new Date().toLocaleTimeString());
        if (deletedItem)
          writeAuditLog(view, id, "DELETE", previous, deletedItem);
        return newData;
      });
    },
  };

  const isHardcodedView = [
    "DASHBOARD",
    "ERP_DESK",
    "DOCUMENT_DESK",
    "DATA_IMPORT",
    "DOCTYPE_CENTER",
    "WORKFLOW_INBOX",
    "REPORT_BUILDER",
    "AUDIT_TRAIL",
    "TASKS",
    "WORK_ORDER_TASKS",
    "TASK_CUTTING",
    "TASK_STITCHING",
    "TASK_EMBROIDERY",
    "TASK_PRINTING",
    "TASK_WASHING",
    "TASK_FINISHING",
    "TASK_PACKING",
    "MFG_DASHBOARD",
    "JOB_CARD_SUMMARY",
    "OPERATIONS_MASTER",
    "ROUTING_MASTER",
    "ROLE_ACCESS",
    "PRODUCTION_PLAN",
    "WORKSTATIONS",
    "TIMESHEET",
    "PROJECTS",
    "OPENING_STOCK",
    "SETTINGS",
    "NOTIFICATIONS",
    "INVENTORY",
    "PRODUCTION",
    "KARIGARS",
    "KARIGAR_KHATA",
    "AGENTS",
    "OFFICES",
    "TEAM",
    "ACCOUNTING",
    "ATTENDANCE",
    "AGENT_KHATA",
    "CASH_BOOK",
    "CATALOG",
    "DESIGN_RECIPE",
    "JOB_WORK",
    "ASSETS",
    "CRM",
    "REPORTS",
    "SUPPLIERS",
    "QUALITY",
    "STOCK_TRANSFER",
    "STOCK_AUDIT",
    "TAX_INVOICE",
    "QUOTATION",
    "PURCHASE_INVOICE",
    "LEAVE_APP",
    "CHART_OF_ACCOUNTS",
    "MATERIAL_REQUEST",
    "EXPENSE_CLAIM",
    "SUPPORT_TICKET",
    "SUPPLIER_QUOTATION",
    "POS",
    "VEHICLES",
    "SALES_RETURN",
    "PURCHASE_ORDER",
    "PURCHASE_INWARD",
    "PURCHASE_RETURN",
    "CREDIT_NOTE",
    "DEBIT_NOTE",
    "TRACK_LOTS",
    "ORDERS",
    "DELIVERY_CHALLAN",
    "PACKING_SLIPS",
    "SAMPLING",
    "PAYROLL",
    "FABRIC_COSTING",
    "DISPATCH_PLANNER",
    "UPGRADE",
    "PRINT_FORMATS",
    "CUSTOMERS",
    "TALLY_INTEGRATION",
    "GALLERY",
    "EMAIL_HUB",
    "MARGIN_COSTING",
    "WASTE_MANAGEMENT",
    "BROKERAGE",
    "GATE_PASS",
  ].includes(currentView);

  const customSchemas = DOCTYPE_SCHEMAS.filter(
    (schema) =>
      ![
        "DASHBOARD",
        "ERP_DESK",
        "DOCUMENT_DESK",
        "DATA_IMPORT",
        "DOCTYPE_CENTER",
        "WORKFLOW_INBOX",
        "REPORT_BUILDER",
        "AUDIT_TRAIL",
        "TASKS",
        "TIMESHEET",
        "PROJECTS",
        "OPENING_STOCK",
        "SETTINGS",
        "NOTIFICATIONS",
        "INVENTORY",
        "PRODUCTION",
        "MASTERS",
        "KARIGARS",
        "KARIGAR_KHATA",
        "AGENTS",
        "OFFICES",
        "TEAM",
        "ACCOUNTING",
        "ATTENDANCE",
        "AGENT_KHATA",
        "CASH_BOOK",
        "LOGIN",
        "CATALOG",
        "DESIGN_RECIPE",
        "JOB_WORK",
        "ASSETS",
        "CRM",
        "REPORTS",
        "SUPPLIERS",
        "QUALITY",
        "STOCK_TRANSFER",
        "STOCK_AUDIT",
        "TAX_INVOICE",
        "QUOTATION",
        "PURCHASE_INVOICE",
        "LEAVE_APP",
        "CHART_OF_ACCOUNTS",
        "MATERIAL_REQUEST",
        "EXPENSE_CLAIM",
        "SUPPORT_TICKET",
        "SUPPLIER_QUOTATION",
        "POS",
        "VEHICLES",
        "SALES_RETURN",
        "PURCHASE_ORDER",
        "PURCHASE_INWARD",
        "PURCHASE_RETURN",
        "CREDIT_NOTE",
        "DEBIT_NOTE",
        "TRACK_LOTS",
        "ORDERS",
        "DELIVERY_CHALLAN",
        "PACKING_SLIPS",
        "SAMPLING",
        "PAYROLL",
        "DESIGN_CATALOG",
        "FABRIC_COSTING",
        "DISPATCH_PLANNER",
        "UPGRADE",
        "PRINT_FORMATS",
        "CUSTOMERS",
        "TALLY_INTEGRATION",
        "EMAIL_HUB",
        "MARGIN_COSTING",
        "WASTE_MANAGEMENT",
        "BROKERAGE",
        "GATE_PASS",
      ].includes(schema.view),
  );

  const dynamicDeskCollections: DocumentDeskCollection[] = customSchemas.map(
    (schema) => ({
      view: schema.view,
      label: schema.name,
      documents: active(dynamicDocuments[schema.view] || []),
      onAdd: (doc: any) => dynamicDocMgr.add(schema.view, doc),
      onUpdate: (doc: any) => dynamicDocMgr.update(schema.view, doc),
      onDelete: (id: string) => dynamicDocMgr.remove(schema.view, id),
    }),
  );

  const allDocumentDeskCollections = [
    ...documentDeskCollections,
    ...dynamicDeskCollections,
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0f1115] text-slate-900 dark:text-white font-sans overflow-hidden transition-all duration-500">
      <Sidebar
        currentView={currentView}
        setView={(v) => {
          setCurrentView(v);
          setIsSidebarOpen(false);
        }}
        onLogout={handleLogout}
        user={currentUser || undefined}
        onProfileClick={() => setIsProfileOpen(true)}
        uiPrefs={uiPrefs}
        onUpdateUiPrefs={handleUpdateUiPrefs}
        companyInfo={companyInfo}
        features={effectiveFeatures}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onCommandPalette={() => setIsCommandPaletteOpen(true)}
        notificationCount={notifications.filter((n) => !n.read).length}
      />

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[45] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-12 flex items-center justify-between px-4 lg:px-5 bg-white/90 dark:bg-[#0d0d10]/95 backdrop-blur-xl border-b border-slate-200/60 dark:border-white/[0.06] shrink-0 z-40">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>
            {/* ERPNext-style breadcrumb */}
            <div className="flex items-center gap-1.5 min-w-0">
              <h2 className="text-[14px] font-bold text-slate-800 dark:text-slate-100 truncate">
                {getViewTitle(currentView)}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-2 pl-2.5 pr-2 py-1.5 bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-600 dark:hover:text-slate-300 transition-all cursor-pointer group"
            >
              <Search className="w-3.5 h-3.5 group-hover:text-indigo-500 transition-colors" />
              <span className="hidden sm:inline text-[11px] font-medium">
                Search
              </span>
              <kbd className="hidden sm:flex h-4 px-1 items-center justify-center text-[9px] font-bold text-slate-400 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded ml-1">
                ⌘K
              </kbd>
            </button>
            <div className="relative">
              <button
                onClick={() =>
                  setIsNotificationDropdownOpen(!isNotificationDropdownOpen)
                }
                className="relative p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
              >
                <Loader2 className="w-4 h-4" style={{ display: "none" }} />
                <Bell className="w-4 h-4" />
                {notifications.filter((n) => !n.read).length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-rose-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center">
                    {notifications.filter((n) => !n.read).length > 9
                      ? "9+"
                      : notifications.filter((n) => !n.read).length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isNotificationDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsNotificationDropdownOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden flex flex-col max-h-[85vh]"
                    >
                      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">
                            Notifications
                          </h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {notifications.filter((n) => !n.read).length} unread
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              handleMarkAllAsRead();
                              setIsNotificationDropdownOpen(false);
                            }}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                            title="Mark all as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setIsNotificationDropdownOpen(false)}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {notifications.length > 0 ? (
                          notifications.slice(0, 50).map((n) => (
                            <div
                              key={n.id}
                              className={`group relative p-3 rounded-xl border transition-all ${
                                n.read
                                  ? "bg-transparent border-transparent opacity-75"
                                  : "bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30"
                              }`}
                            >
                              <div className="flex gap-3">
                                <div
                                  className={`p-2 rounded-lg border shrink-0 h-min ${
                                    n.type === "SUCCESS"
                                      ? "bg-green-50 text-green-500 border-green-100"
                                      : n.type === "WARNING"
                                        ? "bg-amber-50 text-amber-500 border-amber-100"
                                        : n.type === "ERROR"
                                          ? "bg-red-50 text-red-500 border-red-100"
                                          : "bg-blue-50 text-blue-500 border-blue-100"
                                  }`}
                                >
                                  {n.type === "SUCCESS" && (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  )}
                                  {n.type === "WARNING" && (
                                    <AlertCircle className="w-3.5 h-3.5" />
                                  )}
                                  {n.type === "ERROR" && (
                                    <XCircle className="w-3.5 h-3.5" />
                                  )}
                                  {(!n.type || n.type === "INFO") && (
                                    <Info className="w-3.5 h-3.5" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 mb-0.5">
                                    <h4
                                      className={`text-xs font-bold leading-tight uppercase tracking-tight truncate ${n.read ? "text-slate-600 dark:text-slate-400" : "text-slate-800 dark:text-white"}`}
                                    >
                                      {n.title}
                                    </h4>
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-1 line-clamp-2">
                                    {n.message}
                                  </p>
                                  <div className="flex items-center justify-between mt-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {new Date(
                                        n.createdAt || "",
                                      ).toLocaleString()}
                                    </span>
                                    {!n.read && (
                                      <button
                                        onClick={() => handleMarkAsRead(n.id)}
                                        className="text-[10px] font-medium text-indigo-600 hover:text-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        Mark Read
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-12 flex flex-col items-center justify-center text-center">
                            <BellOff className="w-8 h-8 text-slate-300 mb-3" />
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                              No Notifications
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <button
                          onClick={() => {
                            setCurrentView("NOTIFICATIONS");
                            setIsNotificationDropdownOpen(false);
                          }}
                          className="w-full py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-300 dark:hover:border-slate-700 uppercase tracking-widest"
                        >
                          Open Notification Center
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-white/[0.06]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                Synced {lastSync}
              </span>
            </div>
          </div>
        </header>

        <main
          className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar relative"
          id="main-content"
        >
          <div
            className={
              currentView === "DASHBOARD"
                ? ""
                : "max-w-[1500px] mx-auto px-4 py-5 lg:px-6 lg:py-6"
            }
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {currentView === "DASHBOARD" && (
                  <Dashboard
                    inventory={active(inventory)}
                    production={active(production)}
                    orders={active(orders)}
                    karigars={active(karigars)}
                    machines={active(machines)}
                    features={effectiveFeatures}
                    currency={currencySymbol}
                    setView={setCurrentView}
                  />
                )}

                {/* Master Hubs */}
                {currentView === "KARIGARS" && (
                  <Karigars
                    karigars={active(karigars)}
                    onAdd={karigarMgr.add}
                    onUpdate={karigarMgr.update}
                    onDelete={karigarMgr.remove}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "KARIGAR_KHATA" && (
                  <KarigarKhata
                    karigars={active(karigars)}
                    onUpdateKarigar={karigarMgr.update}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "AGENTS" && (
                  <GenericListPage
                    collectionKey="agents"
                    schema={getDocTypeSchema("AGENTS")}
                    onSave={async (doc) => agentMgr.upsert(doc as any)}
                    onDelete={async (ids) =>
                      ids.forEach((id) => agentMgr.remove(id))
                    }
                    collections={{}}
                  />
                )}
                {currentView === "OFFICES" && (
                  <GenericListPage
                    collectionKey="warehouses"
                    schema={getDocTypeSchema("OFFICES")}
                    onSave={async (doc) => warehouseMgr.upsert(doc as any)}
                    onDelete={async (ids) =>
                      ids.forEach((id) => warehouseMgr.remove(id))
                    }
                    collections={{ warehouses: active(warehouses) }}
                  />
                )}
                {currentView === "TEAM" && (
                  <Employees
                    team={active(team)}
                    onAdd={teamMgr.add}
                    onUpdate={teamMgr.update}
                    onDelete={teamMgr.remove}
                    currency={currencySymbol}
                    records={active(attendance)}
                    loans={active(loans)}
                    leaves={active(leaves)}
                    payrollAdjustments={payrollAdjustments}
                    onSaveRecord={attendanceMgr.upsert}
                    onSaveManyRecords={attendanceMgr.upsertMany}
                    onUpdateTeamMember={teamMgr.update}
                    onAddLoan={loanMgr.upsert}
                    onDeleteLoan={loanMgr.remove}
                    onAddLeave={leaveMgr.upsert}
                    onUpdateLeave={leaveMgr.upsert}
                    onUpdatePayrollAdjustment={handleUpdatePayrollAdjustment}
                    companyInfo={companyInfo}
                  />
                )}
                {currentView === "CUSTOMERS" && (
                  <Customers
                    customers={active(customers)}
                    onAdd={custMgr.add}
                    onUpdate={custMgr.update}
                    onDelete={custMgr.remove}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "SUPPLIERS" && (
                  <Suppliers
                    suppliers={active(suppliers)}
                    purchaseOrders={active(purchaseOrders)}
                    inventory={active(inventory)}
                    onAddPO={poMgr.add}
                    onUpdatePO={poMgr.update}
                    onAddSupplier={supplierMgr.add}
                    onUpdateSupplier={supplierMgr.update}
                    onDeleteSupplier={supplierMgr.remove}
                    currency={currencySymbol}
                  />
                )}

                {/* Sales & Orders */}
                {currentView === "ORDERS" && (
                  <SalesOrder
                    orders={active(orders)}
                    customers={active(customers)}
                    inventory={active(inventory)}
                    designs={active(designs)}
                    agents={active(agents)}
                    onAddOrder={ordMgr.add}
                    onUpdateOrder={ordMgr.update}
                    onDeleteOrder={ordMgr.remove}
                    onAction={handleAction}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "POS" && (
                  <POS
                    posInvoices={active(posInvoices)}
                    inventory={active(inventory)}
                    onAdd={posInvoiceMgr.add}
                    onUpdate={posInvoiceMgr.update}
                    onDelete={posInvoiceMgr.remove}
                    currency={currencySymbol}
                    companyInfo={companyInfo}
                  />
                )}
                {currentView === "DELIVERY_CHALLAN" && (
                  <DeliveryChallan
                    orders={active(orders)}
                    customers={active(customers)}
                    designs={active(designs)}
                    inventory={active(inventory)}
                    initialOrderId={pendingDeliveryOrderId}
                    onAddChallan={(c) => { ordMgr.add(c); setPendingDeliveryOrderId(undefined); }}
                    onUpdateChallan={(c) => { ordMgr.update(c); setPendingDeliveryOrderId(undefined); }}
                    onAction={handleAction}
                    currency={currencySymbol}
                    companyInfo={companyInfo}
                  />
                )}
                {currentView === "PACKING_SLIPS" && (
                  <PackingList
                    slips={active(packingSlips)}
                    orders={active(orders)}
                    onAddSlip={packingSlipMgr.add}
                    onUpdateSlip={packingSlipMgr.update}
                    companyInfo={companyInfo}
                  />
                )}

                {/* Production & Inventory */}
                {currentView === "PRODUCTION" && (
                  <WorkOrderPage
                    jobs={active(production)}
                    karigars={active(karigars)}
                    designs={active(designs)}
                    inventory={active(inventory)}
                    machines={active(machines)}
                    samples={active(samples)}
                    orders={active(orders)}
                    onAddJob={prodMgr.add}
                    onUpdateJob={handleJobUpdate}
                    onDeleteJob={(id) => prodMgr.remove(id)}
                    currency={currencySymbol}
                  />
                )}
                {(currentView === "WORK_ORDER_TASKS" ||
                  currentView === "TASK_CUTTING" ||
                  currentView === "TASK_STITCHING" ||
                  currentView === "TASK_EMBROIDERY" ||
                  currentView === "TASK_PRINTING" ||
                  currentView === "TASK_WASHING" ||
                  currentView === "TASK_FINISHING" ||
                  currentView === "TASK_PACKING") && (
                  <WorkOrderTaskHub
                    production={active(production)}
                    onUpdateWorkOrder={handleJobUpdate}
                    karigars={active(karigars)}
                    initialTab={
                      currentView === "TASK_CUTTING" ? "Cutting"
                      : currentView === "TASK_STITCHING" ? "Stitching"
                      : currentView === "TASK_EMBROIDERY" ? "Embroidery"
                      : currentView === "TASK_PRINTING" ? "Printing"
                      : currentView === "TASK_WASHING" ? "Washing"
                      : currentView === "TASK_FINISHING" ? "Finishing"
                      : currentView === "TASK_PACKING" ? "Packing"
                      : "Fabric Inspection"
                    }
                  />
                )}
                {currentView === "MFG_DASHBOARD" && (
                  <MfgDashboard
                    production={active(production)}
                    karigars={active(karigars)}
                    onNavigate={setCurrentView}
                  />
                )}
                {currentView === "JOB_CARD_SUMMARY" && (
                  <JobCardSummary
                    production={active(production)}
                  />
                )}
                {currentView === "OPERATIONS_MASTER" && (
                  <OperationsMaster />
                )}
                {currentView === "ROUTING_MASTER" && (
                  <RoutingMaster />
                )}
                {currentView === "ROLE_ACCESS" && (
                  <RoleAccessManager
                    rolePermissions={rolePermissions}
                    onAddRolePermission={rolePermMgr.add}
                    onUpdateRolePermission={rolePermMgr.update}
                    onDeleteRolePermission={(id) => rolePermMgr.remove(id)}
                  />
                )}
                {currentView === "PRODUCTION_PLAN" && (
                  <ProductionPlan
                    orders={active(orders)}
                    designs={active(designs)}
                    jobs={active(production)}
                    inventory={active(inventory)}
                    onAction={handleAction}
                  />
                )}
                {currentView === "WORKSTATIONS" && (
                  <WorkstationsComp
                    workstations={active(machines)}
                    onAdd={machineMgr.add}
                    onUpdate={machineMgr.update}
                    onDelete={(id) => machineMgr.remove(id)}
                  />
                )}
                {currentView === "SAMPLING" && (
                  <Sampling
                    samples={active(samples)}
                    designs={active(designs)}
                    karigars={active(karigars)}
                    customers={active(customers)}
                    onAdd={sampleMgr.add}
                    onUpdate={sampleMgr.update}
                    onDelete={sampleMgr.remove}
                    onAction={handleAction}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "TRACK_LOTS" && (
                  <TrackLots
                    jobs={active(production)}
                    onUpdateJob={handleJobUpdate}
                  />
                )}
                {currentView === "QUALITY" && (
                  <QualityControl
                    reports={active(qualityReports)}
                    inspections={active(inspections)}
                    jobs={active(production)}
                    designs={active(designs)}
                    inventory={active(inventory)}
                    onAddReport={qualityMgr.add}
                    onUpdateReport={qualityMgr.update}
                    onAddInspection={inspectionMgr.add}
                    currency={currencySymbol}
                    geminiApiKey={securityConfig.geminiApiKey}
                  />
                )}
                {currentView === "INVENTORY" && (
                  <Inventory
                    items={active(inventory)}
                    production={active(production)}
                    designs={active(designs)}
                    onAdd={invMgr.add}
                    onUpdate={invMgr.update}
                    onDelete={invMgr.remove}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "CATALOG" && (
                  <DesignCatalog
                    designs={active(designs)}
                    inventory={active(inventory)}
                    onAdd={designMgr.add}
                    onUpdate={designMgr.update}
                    onDelete={designMgr.remove}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "GALLERY" && (
                  <Gallery
                    items={active(gallery)}
                    onAdd={galleryMgr.add}
                    onUpdate={galleryMgr.update}
                    onDelete={(id) => {
                      const updated = gallery.filter((g) => g.id !== id);
                      setGallery(updated);
                      setItem("gallery", updated);
                    }}
                  />
                )}
                {currentView === "DESIGN_RECIPE" && (
                  <DesignRecipe
                    designs={active(designs)}
                    inventory={active(inventory)}
                    onAdd={designMgr.add}
                    onUpdate={designMgr.update}
                    onDelete={designMgr.remove}
                    onAction={handleAction}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "JOB_WORK" && (
                  <JobWorkComp
                    jobs={active(jobWorks)}
                    designs={active(designs)}
                    inventory={active(inventory)}
                    onAdd={jobWorkMgr.add}
                    onUpdate={jobWorkMgr.update}
                    onDelete={jobWorkMgr.remove}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "STOCK_TRANSFER" && (
                  <StockTransferComp
                    inventory={active(inventory)}
                    transfers={active(transfers)}
                    warehouses={active(warehouses)}
                    onAdd={transferMgr.add}
                    onUpdate={transferMgr.update}
                    onDelete={transferMgr.remove}
                  />
                )}
                {currentView === "GATE_PASS" && (
                  <GatePassSystem
                    gatePasses={active(gatePasses)}
                    onAdd={gatePassMgr.add}
                    onUpdate={gatePassMgr.update}
                  />
                )}
                {currentView === "STOCK_AUDIT" && (
                  <PhysicalAudit
                    items={active(inventory)}
                    audits={active(stockAudits)}
                    onCommitAudit={auditMgr.add}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "ASSETS" && (
                  <Assets
                    machines={active(machines)}
                    maintenance={active(maintenance)}
                    onAddMachine={machineMgr.add}
                    onUpdateMachine={machineMgr.update}
                    onDeleteMachine={machineMgr.remove}
                    onAddMaintenance={maintenanceMgr.add}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "VEHICLES" && (
                  <Vehicles
                    vehicles={active(vehicles)}
                    onAdd={vehicleMgr.add}
                    onUpdate={vehicleMgr.update}
                    onDelete={vehicleMgr.remove}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "UPGRADE" && <UpgradeModule />}
                {currentView === "PRINT_FORMATS" && <PrintFormatBuilder />}
                {currentView === "FABRIC_COSTING" && (
                  <FabricCostingWorkspace
                    costings={active(fabricCostings)}
                    designs={active(designs)}
                    inventory={active(inventory)}
                    yarnLots={active(yarnLots)}
                    onAddCosting={costingMgr.add}
                    onUpdateCosting={costingMgr.update}
                    onDeleteCosting={costingMgr.remove}
                    currency={currencySymbol}
                    companyInfo={companyInfo}
                  />
                )}
                {currentView === "MARGIN_COSTING" && (
                  <MarginCostingEngine
                    costings={active(marginCostings)}
                    designs={active(designs)}
                    inventory={active(inventory)}
                    onAdd={marginCostingMgr.add}
                    onUpdate={marginCostingMgr.update}
                  />
                )}
                {currentView === "DISPATCH_PLANNER" && (
                  <DispatchPlanner
                    entries={active(dispatchEntries)}
                    orders={active(orders)}
                    onAddEntry={dispatchMgr.add}
                    onUpdateEntry={dispatchMgr.update}
                    onDeleteEntry={dispatchMgr.remove}
                    currency={currencySymbol}
                  />
                )}

                {/* Utilities & Settings */}
                {currentView === "QUOTATION" && (
                  <Quotation
                    quotations={active(quotations)}
                    customers={active(customers)}
                    inventory={active(inventory)}
                    designs={active(designs)}
                    agents={active(agents)}
                    onAddQuotation={quotationMgr.add}
                    onUpdateQuotation={quotationMgr.update}
                    onDeleteQuotation={quotationMgr.remove}
                    onAction={handleAction}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "TAX_INVOICE" && (
                  <TaxInvoice
                    orders={active(orders)}
                    customers={active(customers)}
                    inventory={active(inventory)}
                    designs={active(designs)}
                    onAddInvoice={ordMgr.add}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "SALES_RETURN" && (
                  <SalesReturn
                    orders={active(orders)}
                    customers={active(customers)}
                    designs={active(designs)}
                    inventory={active(inventory)}
                    onAddReturn={(ret) => {
                      ordMgr.add(ret);
                      handleAddNotification({
                        title: "Sales Return Logged",
                        message: `Return ${ret.id} logged for ${ret.customerName}.`,
                        type: "SUCCESS",
                      });
                    }}
                    onUpdateInventory={(item) => invMgr.update(item)}
                    onAddNote={(note) => txnMgr.add(note)}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "MATERIAL_REQUEST" && (
                  <MaterialRequestComp
                    requests={active(materialRequests)}
                    inventory={active(inventory)}
                    onAdd={materialReqMgr.add}
                    onUpdate={materialReqMgr.update}
                    onDelete={materialReqMgr.remove}
                    onAction={handleAction}
                  />
                )}
                {currentView === "SUPPLIER_QUOTATION" && (
                  <SupplierQuotationComp
                    quotations={active(supplierQuotations)}
                    suppliers={active(suppliers)}
                    inventory={active(inventory)}
                    onAdd={supplierQuotationsMgr.add}
                    onUpdate={supplierQuotationsMgr.update}
                    onDelete={supplierQuotationsMgr.remove}
                    onAction={handleAction}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "PURCHASE_ORDER" && (
                  <PurchaseOrderComp
                    purchaseOrders={active(purchaseOrders)}
                    suppliers={active(suppliers)}
                    inventory={active(inventory)}
                    onAddPO={poMgr.add}
                    onUpdatePO={poMgr.update}
                    onAction={handleAction}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "PURCHASE_INWARD" && (
                  <PurchaseInward
                    purchaseOrders={active(purchaseOrders)}
                    inventory={active(inventory)}
                    onUpdateInventory={invMgr.update}
                    onUpdatePO={poMgr.update}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "PURCHASE_INVOICE" && (
                  <PurchaseInvoiceComp
                    purchaseInvoices={active(purchaseInvoices)}
                    suppliers={active(suppliers)}
                    inventory={active(inventory)}
                    onAddPI={purchaseInvoiceMgr.add}
                    onUpdatePI={purchaseInvoiceMgr.update}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "PURCHASE_RETURN" && (
                  <PurchaseReturn
                    purchaseOrders={active(purchaseOrders)}
                    suppliers={active(suppliers)}
                    onAddReturn={(poId, reason) => {
                      const po = purchaseOrders.find((p) => p.id === poId);
                      if (po) {
                        poMgr.update({ ...po, status: "CANCELLED" });
                        const resolvedSupplierName = suppliers.find(s => s.id === po.supplierId)?.name || po.supplierName;
                        txnMgr.add({
                          id: `DN-${Date.now()}`,
                          date: new Date().toISOString().split("T")[0],
                          description: `Purchase Return: ${resolvedSupplierName} - ${reason}`,
                          amount: po.totalAmount,
                          type: "INCOME",
                          category: "PURCHASE_RETURN",
                          paymentMethod: "ADJUSTMENT",
                          subType: "DEBIT_NOTE",
                          referenceId: po.supplierId,
                        } as Transaction);
                      }
                    }}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "CREDIT_NOTE" && (
                  <CreditDebitNotes
                    type="CREDIT"
                    transactions={active(transactions)}
                    customers={active(customers)}
                    suppliers={active(suppliers)}
                    onAddNote={txnMgr.add}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "DEBIT_NOTE" && (
                  <CreditDebitNotes
                    type="DEBIT"
                    transactions={active(transactions)}
                    customers={active(customers)}
                    suppliers={active(suppliers)}
                    onAddNote={txnMgr.add}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "CRM" && (
                  <CRM
                    leads={active(leads)}
                    designs={active(designs)}
                    onAddLead={leadMgr.add}
                    onUpdateLead={leadMgr.update}
                    onDeleteLead={leadMgr.remove}
                    onConvertToCustomer={(lead) => {
                      const customer: Customer = {
                        id: `CUST-${Date.now().toString().slice(-4)}`,
                        name: lead.companyName,
                        contactPerson: lead.contactPerson,
                        phone: lead.phone || "",
                        email: lead.email || "",
                        address: lead.address || "",
                        gstin: "",
                        type: "RETAILER",
                        status: "ACTIVE",
                        creditLimit: 0,
                        balance: 0,
                        tags: ["FROM_LEAD"],
                      };
                      custMgr.add(customer);
                      leadMgr.update({
                        ...lead,
                        status: "WON",
                      });
                    }}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "SUPPORT_TICKET" && (
                  <SupportTicketsComp
                    tickets={active(supportTickets)}
                    customers={active(customers)}
                    onAdd={supportTicketMgr.add}
                    onUpdate={supportTicketMgr.update}
                    onDelete={supportTicketMgr.remove}
                  />
                )}
                {currentView === "REPORTS" && (
                  <Reports
                    inventory={active(inventory)}
                    production={active(production)}
                    orders={active(orders)}
                    suppliers={active(suppliers)}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "CHART_OF_ACCOUNTS" && <ChartOfAccounts />}
                {currentView === "WASTE_MANAGEMENT" && (
                  <WasteManagement
                    wasteLogs={active(wasteLogs)}
                    onAdd={wasteMgr.add}
                    onUpdate={wasteMgr.update}
                  />
                )}
                {currentView === "BROKERAGE" && (
                  <BrokerageTracker
                    brokerLogs={active(brokerLogs)}
                    onAdd={brokerMgr.add}
                    onUpdate={brokerMgr.update}
                  />
                )}
                {currentView === "TALLY_INTEGRATION" && (
                  <TallyIntegration
                    transactions={active(transactions)}
                    onAddTransaction={txnMgr.add}
                    customers={active(customers)}
                    suppliers={active(suppliers)}
                    orders={active(orders)}
                    purchaseOrders={active(purchaseOrders)}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "ACCOUNTING" && (
                  <Accounting
                    transactions={active(transactions)}
                    onAddTransaction={txnMgr.add}
                    customers={active(customers)}
                    karigars={active(karigars)}
                    agents={active(agents)}
                    team={active(team)}
                    loans={active(loans)}
                    purchaseOrders={active(purchaseOrders)}
                    salesOrders={active(orders)}
                    suppliers={active(suppliers)}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "CASH_BOOK" && (
                  <CashBook
                    transactions={active(transactions)}
                    customers={active(customers)}
                    suppliers={active(suppliers)}
                    team={active(team)}
                    onAddTransaction={txnMgr.add}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "EXPENSE_CLAIM" && (
                  <ExpenseClaimComp
                    claims={active(expenseClaims)}
                    team={active(team)}
                    onAdd={expenseClaimMgr.add}
                    onUpdate={expenseClaimMgr.update}
                    onDelete={expenseClaimMgr.remove}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "AGENT_KHATA" && (
                  <AgentKhata
                    agents={active(agents)}
                    onUpdateAgent={agentMgr.update}
                    currency={currencySymbol}
                  />
                )}
                {currentView === "ATTENDANCE" && (
                  <Attendance
                    team={active(team)}
                    records={active(attendance)}
                    loans={active(loans)}
                    leaves={active(leaves)}
                    payrollAdjustments={payrollAdjustments}
                    onSaveRecord={attendanceMgr.upsert}
                    onSaveManyRecords={attendanceMgr.upsertMany}
                    onUpdateTeamMember={teamMgr.update}
                    onAddLoan={loanMgr.upsert}
                    onDeleteLoan={loanMgr.remove}
                    onAddLeave={leaveMgr.upsert}
                    onUpdateLeave={leaveMgr.upsert}
                    onUpdatePayrollAdjustment={handleUpdatePayrollAdjustment}
                    currency={currencySymbol}
                    companyInfo={companyInfo}
                  />
                )}
                {currentView === "LEAVE_APP" && (
                  <LeaveApplication
                    leaves={active(leaves)}
                    team={active(team)}
                    onAddLeave={leaveMgr.add}
                    onUpdateLeave={leaveMgr.update}
                    onDeleteLeave={leaveMgr.remove}
                  />
                )}
                {currentView === "PAYROLL" && (
                  <Attendance
                    team={active(team)}
                    records={active(attendance)}
                    loans={active(loans)}
                    leaves={active(leaves)}
                    payrollAdjustments={payrollAdjustments}
                    onSaveRecord={attendanceMgr.upsert}
                    onSaveManyRecords={attendanceMgr.upsertMany}
                    onUpdateTeamMember={teamMgr.update}
                    onAddLoan={loanMgr.upsert}
                    onDeleteLoan={loanMgr.remove}
                    onAddLeave={leaveMgr.upsert}
                    onUpdateLeave={leaveMgr.upsert}
                    onUpdatePayrollAdjustment={handleUpdatePayrollAdjustment}
                    currency={currencySymbol}
                    companyInfo={companyInfo}
                    initialTab="PAYROLL"
                  />
                )}
                {currentView === "EMAIL_HUB" && (
                  <EmailHub
                    communicationConfig={communicationConfig}
                    customers={active(customers)}
                    suppliers={active(suppliers)}
                  />
                )}
                {currentView === "SETTINGS" && (
                  <Settings
                    uiPrefs={uiPrefs}
                    onUpdateUiPrefs={handleUpdateUiPrefs}
                    companyInfo={companyInfo}
                    onUpdateCompanyInfo={handleUpdateCompanyInfo}
                    features={features}
                    onUpdateFeatures={handleUpdateFeatures}
                    shopifyConfig={shopifyConfig}
                    onUpdateShopifyConfig={handleUpdateShopifyConfig}
                    securityConfig={securityConfig}
                    onUpdateSecurityConfig={handleUpdateSecurityConfig}
                    communicationConfig={communicationConfig}
                    onUpdateCommunicationConfig={
                      handleUpdateCommunicationConfig
                    }
                    advancedConfig={advancedConfig}
                    onUpdateAdvancedConfig={handleUpdateAdvancedConfig}
                    invoiceConfig={invoiceConfig}
                    onUpdateInvoiceConfig={handleUpdateInvoiceConfig}
                    team={active(team)}
                    lastSync={lastSync}
                    rolePermissions={rolePermissions}
                    onAddRolePermission={rolePermMgr.add}
                    onUpdateRolePermission={rolePermMgr.update}
                    onDeleteRolePermission={rolePermMgr.remove}
                  />
                )}
                {currentView === "NOTIFICATIONS" && (
                  <NotificationCenter
                    notifications={notifications}
                    onMarkAsRead={handleMarkAsRead}
                    onMarkAllAsRead={handleMarkAllAsRead}
                    onDelete={handleDeleteNotification}
                    onClearAll={handleClearAllNotifications}
                  />
                )}
                {currentView === "ERP_DESK" && (
                  <ERPNextWorkbench
                    stats={docTypeStats}
                    features={effectiveFeatures}
                    userRole={currentUser?.role}
                    onNavigate={setCurrentView}
                  />
                )}
                {currentView === "DOCUMENT_DESK" && (
                  <DocumentDesk collections={allDocumentDeskCollections} />
                )}
                {currentView === "DATA_IMPORT" && (
                  <DataImportTool collections={dataImportCollections} />
                )}
                {currentView === "DOCTYPE_CENTER" && (
                  <DocTypeCenter
                    stats={docTypeStats}
                    userRole={currentUser?.role}
                    onNavigate={setCurrentView}
                  />
                )}
                {currentView === "WORKFLOW_INBOX" && (
                  <WorkflowInbox
                    collections={workflowCollections}
                    userRole={currentUser?.role}
                    onNavigate={setCurrentView}
                  />
                )}
                {currentView === "REPORT_BUILDER" && (
                  <ReportBuilder collections={reportCollections} />
                )}
                {currentView === "AUDIT_TRAIL" && (
                  <AuditTrail logs={auditLogs} />
                )}
                {currentView === "TASKS" && (
                  <TaskManager
                    tasks={tasks}
                    team={active(team)}
                    onAddTask={handleAddTask}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                  />
                )}
                {currentView === "TIMESHEET" && (
                  <TimesheetComp
                    timesheets={active(timesheets)}
                    team={active(team)}
                    projects={active(projects)}
                    tasks={active(tasks)}
                    onAdd={timesheetMgr.add}
                    onUpdate={timesheetMgr.update}
                    onDelete={timesheetMgr.remove}
                  />
                )}
                {currentView === "PROJECTS" && (
                  <Projects
                    projects={active(projects)}
                    team={active(team)}
                    customers={active(customers)}
                    onAddProject={projectMgr.add}
                    onUpdateProject={projectMgr.update}
                    onDeleteProject={projectMgr.remove}
                    currency={currencySymbol}
                    geminiApiKey={securityConfig.geminiApiKey}
                  />
                )}
                {currentView === "OPENING_STOCK" && (
                  <OpeningStock
                    items={active(inventory)}
                    onAdd={invMgr.add}
                    onUpdate={invMgr.update}
                    onDelete={invMgr.remove}
                    currency={currencySymbol}
                  />
                )}

                {!isHardcodedView && (
                  <DocumentDesk
                    collections={
                      allDocumentDeskCollections.filter(
                        (c) => c.view === currentView,
                      ).length > 0
                        ? allDocumentDeskCollections
                        : [
                            {
                              view: currentView,
                              label: currentView,
                              documents: [],
                              onAdd: () => {},
                              onUpdate: () => {},
                            },
                          ]
                    }
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
      {currentUser && (
        <UserProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          user={currentUser}
          onUpdate={(u) => {
            setCurrentUser(u);
            teamMgr.update(u);
          }}
          onLogout={handleLogout}
        />
      )}
      {mustChangePassword && (
        <ForcePasswordChangeModal
          onSave={async (newPassword: string) => {
            const hashHex = await hashPassword(newPassword);
            const adminMember: TeamMember = {
              id: "admin",
              name: "Administrator",
              role: "ADMIN",
              status: "ACTIVE",
              passwordHash: hashHex,
            } as TeamMember;
            await setItem("admin_seed_changed", true);
            // FIX: persist the admin member with new password hash so it survives app restarts
            await teamMgr.add(adminMember);
            setCurrentUser(adminMember);
            setMustChangePassword(false);
          }}
        />
      )}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={setCurrentView}
        inventory={active(inventory)}
        orders={active(orders)}
        jobs={active(production)}
        userRole={currentUser?.role}
      />
    </div>
  );
};

export default App;
