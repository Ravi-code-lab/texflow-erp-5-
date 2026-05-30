
export type ViewState = 
  | 'DASHBOARD' 
  | 'CATALOG' 
  | 'SAMPLING'
  | 'DESIGN_RECIPE'
  | 'INVENTORY' 
  | 'SUPPLIERS' 
  | 'JOB_WORK' 
  | 'PRODUCTION' 
  | 'QUALITY' 
  | 'ASSETS' 
  | 'ORDERS' 
  | 'DELIVERY_CHALLAN'
  | 'TAX_INVOICE' 
  | 'SALES_RETURN'
  | 'CREDIT_NOTE'
  | 'PURCHASE_ORDER'
  | 'PURCHASE_INWARD'
  | 'PURCHASE_RETURN'
  | 'DEBIT_NOTE'
  | 'TRACK_LOTS'
  | 'PACK_DESIGN'
  | 'STOCK_TRANSFER'
  | 'STOCK_AUDIT'
  | 'KARIGARS'
  | 'KARIGAR_KHATA'
  | 'CUSTOMERS'
  | 'AGENTS'
  | 'AGENT_KHATA'
  | 'OFFICES'
  | 'CRM'
  | 'ATTENDANCE' 
  | 'ACCOUNTING' 
  | 'CASH_BOOK'
  | 'PAYROLL'
  | 'REPORTS' 
  | 'TEAM'
  | 'SETTINGS'
  | 'NOTIFICATIONS'
  | 'TASKS'
  | 'PROJECTS'
  | 'OPENING_STOCK'
  | 'YARN_MANAGEMENT'
  | 'DYEING_PROCESSING'
  | 'FABRIC_COSTING'
  | 'DISPATCH_PLANNER'
  | 'QUOTATION'
  | 'MATERIAL_REQUEST'
  | 'SUPPLIER_QUOTATION'
  | 'PURCHASE_INVOICE'
  | 'SUPPORT_TICKET'
  | 'CHART_OF_ACCOUNTS'
  | 'EXPENSE_CLAIM'
  | 'LEAVE_APP'
  | 'TIMESHEET'
  | 'POS'
  | 'VEHICLES';

export enum Unit { KG = 'KG', METER = 'METER', PIECE = 'PIECE', LITER = 'LITER', BOX = 'BOX', YARD = 'YARD' }
export enum MaterialType { YARN = 'YARN', FABRIC = 'FABRIC', ACCESSORY = 'ACCESSORY', DYE = 'DYE', PACKAGING = 'PACKAGING' }

export interface BaseEntity {
  id: string;
  updatedAt?: string; 
  createdAt?: string;
  updatedBy?: string;
  deleted?: boolean;  
  version?: number;
}

export interface ShopifyConfig {
  shopUrl: string;
  accessToken: string;
  enabled: boolean;
}

export interface PayrollAdjustment {
  bonus: number;
  deduction: number;
  loanRepayment: number;
  status?: 'PENDING' | 'DISBURSED';
  disbursedAt?: string;
}

export interface AuditLog extends BaseEntity {
    entityType: string;
    entityId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';
    previousState?: any;
    newState?: any;
    timestamp: string;
}

export enum AttendanceStatus { PRESENT = 'PRESENT', ABSENT = 'ABSENT', HALF_DAY = 'HALF_DAY', LEAVE = 'LEAVE', HOLIDAY = 'HOLIDAY' }
export type UserRole = 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'SALES' | 'WORKER';
export type ShiftType = 'GENERAL' | 'MORNING' | 'EVENING' | 'NIGHT';
export type EmploymentType = 'FULL_TIME' | 'CONTRACT' | 'PIECE_RATE' | 'PROBATION';

export interface TeamMember extends BaseEntity { 
  name: string; 
  role: UserRole; 
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE'; 
  dailyWage?: number; 
  email?: string; 
  phone?: string; 
  department?: string; 
  profileImageUrl?: string; 
  defaultShift?: ShiftType;
  employmentType?: EmploymentType;
  joiningDate?: string;
  emergencyContact?: string;
}

export interface InventoryRoll { id: string; rollNumber: string; initialQuantity: number; currentQuantity: number; dyeLot?: string; grade: 'A' | 'B' | 'C'; status: 'AVAILABLE' | 'CONSUMED' | 'REJECTED'; }
export interface InventoryItem extends BaseEntity { name: string; type: MaterialType | string; unit: Unit | string; quantity: number; minStockLevel: number; pricePerUnit: number; location: string; imageUrl?: string; hsnCode?: string; abcGrade?: string; taxRate?: number; openingStock?: number; batchNumber?: string; expiryDate?: string; inwardDate?: string; rolls?: InventoryRoll[]; tags?: string[]; }

export interface DesignOption { id: string; name: string; values: string[]; }
export interface DesignVariant { 
    id: string; 
    title: string; 
    sku: string; 
    barcode?: string; 
    price?: number; 
    openingStock?: number; 
    inventoryQuantity?: number; 
    reservedQuantity?: number; 
    availableQuantity?: number; 
    imageUrl?: string; 
    optionValues: Record<string, string>; 
}

export interface RecipeItem { materialId?: string; materialName: string; quantity: number; unit: Unit | string; estimatedCost?: number; wastagePercent?: number; }
export type WorkType = 'DIGITAL_PRINT' | 'EMBROIDERY' | 'HANDWORK' | 'ROTARY' | 'PLAIN' | 'DYED';
export interface DesignLaborCost { cutting?: number; stitching?: number; embroidery?: number; washing?: number; finishing?: number; folding?: number; packing?: number; other?: number; }

export interface Design extends BaseEntity { 
    name: string; 
    sku: string; 
    category: 'SAREE' | 'KURTI' | 'SUIT' | 'FABRIC'; 
    status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'DISCONTINUED'; 
    imageUrl?: string; 
    composition?: string;
    recipe?: RecipeItem[]; 
    laborCosts?: DesignLaborCost; 
    processLossPercent?: number; 
    commissionPercent?: number; 
    processCostPerPiece?: number; 
    targetMargin?: number; 
    hasVariants?: boolean; 
    options?: DesignOption[]; 
    variants?: DesignVariant[]; 
    description?: string; 
    hsnCode?: string;
    shrinkage?: string;
    finishedWidth?: string;
    finishedGsm?: string;
    tags?: string[];
    brandId?: string;
    brandName?: string;
}

export interface JobWorkItem { description: string; issuedQuantity: number; receivedQuantity: number; rate: number; unit: Unit | string; quantity: number; wastagePercent: number; rejectedQuantity: number; receiptHistory: any[]; }
export interface JobWork extends BaseEntity { challanNumber: string; vendorName: string; process: string; issueDate: string; expectedDate: string; status: string; items: JobWorkItem[]; totalCost: number; paymentStatus: string; }
export interface Transaction extends BaseEntity { date: string; description: string; amount: number; type: 'INCOME' | 'EXPENSE'; category: string; paymentMethod: string; referenceId?: string; subType?: string; }

export interface MaterialRequestItem {
  productName: string;
  quantity: number;
  unit: Unit | string;
  requiredByDate?: string;
  purpose?: string;
}

export interface MaterialRequest extends BaseEntity {
  date: string;
  requestedBy: string;
  status: 'DRAFT' | 'PENDING' | 'ORDERED' | 'RECEIVED' | 'REJECTED';
  items: MaterialRequestItem[];
  department?: string;
}

export interface ExpenseClaim extends BaseEntity {
  employeeId: string;
  date: string;
  expenseType: 'TRAVEL' | 'MEALS' | 'SUPPLIES' | 'OTHER';
  amount: number;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  description: string;
  approverId?: string;
}

export interface SupportTicket extends BaseEntity {
  customerId?: string;
  customerName?: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  date: string;
  assignedTo?: string;
}

export interface TimesheetEntry {
  projectId?: string;
  projectName?: string;
  taskId?: string;
  taskTitle?: string;
  date: string;
  hours: number;
  description: string;
  billable: boolean;
}

export interface Timesheet extends BaseEntity {
  employeeId: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  entries: TimesheetEntry[];
  totalHours: number;
  totalBillableHours: number;
}

export interface SupplierQuotationItem {
  productName: string;
  quantity: number;
  unit: Unit | string;
  rate: number;
}

export interface SupplierQuotation extends BaseEntity {
  supplierId: string;
  supplierName: string;
  date: string;
  validTill: string;
  status: 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  items: SupplierQuotationItem[];
  totalAmount: number;
  notes?: string;
}

export interface POSInvoiceItem {
  productName: string;
  quantity: number;
  rate: number;
  discount: number;
  amount: number;
}

export interface POSInvoice extends BaseEntity {
  customerName?: string;
  customerPhone?: string;
  date: string;
  items: POSInvoiceItem[];
  subTotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'OTHER';
  status: 'PAID' | 'DRAFT' | 'CANCELLED';
  cashier: string;
}

export interface VehicleLogEntry {
  date: string;
  odometer: number;
  fuelAdded: number;
  fuelCost: number;
  notes?: string;
}

export interface Vehicle extends BaseEntity {
  registrationNumber: string;
  make: string;
  model: string;
  type: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'SOLD';
  assignedDriver?: string;
  insuranceExpiry?: string;
  logs: VehicleLogEntry[];
}

export interface OrderItem { productName: string; quantity: number; unitPrice: number; unit: Unit | string; sizeWise?: Record<string, number>; }
export interface Order extends BaseEntity { customerName: string; status: string; paymentStatus: string; items: OrderItem[]; orderDate: string; totalAmount: number; agentName?: string; agentId?: string; agentCommissionRate?: number; agentCommissionAmount?: number; taxRate?: number; shippingAddress?: string; dueDate?: string; vehicleNo?: string; transportName?: string; isShopify?: boolean; shopifyOrderId?: string; brandId?: string; brandName?: string; }
export interface CuttingLog extends BaseEntity {
  date: string;
  quantity: number;
  notes?: string;
  operatorName?: string;
  sizeWise?: Record<string, number>;
}

export interface ProductionJob extends BaseEntity { 
  productName: string; 
  quantity: number; 
  status: string; 
  startDate: string; 
  deadline: string; 
  priority: 'LOW' | 'NORMAL' | 'HIGH'; 
  progress: number; 
  assignedMachine?: string; 
  imageUrl?: string; 
  sampleId?: string;
  orderId?: string;
  batchNo?: string;
  cuttingLogs?: CuttingLog[];
  productionLogs?: ProductionLog[];
  sizeWise?: Record<string, number>;
}
export interface KarigarLedgerEntry extends BaseEntity { date: string; type: 'WORK_RECEIVED' | 'PAYMENT_GIVEN'; description: string; amount: number; quantity?: number; rate?: number; }
export interface Karigar extends BaseEntity { name: string; skill: string; balance: number; phone?: string; ledger: KarigarLedgerEntry[]; profileImageUrl?: string; }
export interface Supplier extends BaseEntity { name: string; contactPerson: string; email: string; phone?: string; location: string; reliabilityScore: number; materialsProvided: string[]; }
export interface PurchaseOrderItem { productName: string; quantity: number; unit: Unit | string; unitPrice: number; }
export interface PurchaseOrder extends BaseEntity { supplierId: string; supplierName: string; date: string; status: 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED'; items: PurchaseOrderItem[]; totalAmount: number; taxRate?: number; expectedDate?: string; }
export interface Machine extends BaseEntity { name: string; model?: string; type: string; status: string; purchaseDate: string; lastServiceDate?: string; nextServiceDate: string; capacity?: string; hourlyCost?: number; }
export interface MaintenanceRecord extends BaseEntity { machineId: string; date: string; type: 'ROUTINE' | 'BREAKDOWN' | 'REPAIR'; description: string; cost: number; performedBy: string; }
export interface ProjectTask extends BaseEntity { title: string; status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'; assignee?: string; dueDate: string; }
export interface Project extends BaseEntity { name: string; status: string; clientName?: string; startDate: string; endDate: string; budget: number; spent: number; description: string; tasks: ProjectTask[]; teamMembers: string[]; isTemplate?: boolean; }
export interface StockAudit extends BaseEntity { date: string; godown: string; items: any[]; performedBy: string; status: string; }
export interface AttendanceRecord extends BaseEntity { date: string; employeeId: string; status: AttendanceStatus; shift: ShiftType; checkIn?: string; checkOut?: string; overtimeHours?: number; note?: string; payMultiplier?: number; }
export interface UIPreferences { 
  theme: 'light' | 'dark'; 
  sidebarStyle: string; 
  backgroundPattern: string; 
  reduceMotion: boolean; 
  primaryColor: string; 
  borderRadius: string; 
  density: string; 
  scale: number; 
  language?: string;
  dateFormat?: string;
  timezone?: string;
  enableNotifications?: boolean;
}
export interface CompanyInfo { 
  name: string; 
  address: string; 
  gstin: string; 
  email: string; 
  website: string; 
  logoUrl: string; 
  phone?: string;
  pan?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
}
export interface QualityReport extends BaseEntity { jobId: string; inspectorName: string; defectType: 'SHADE_VARIATION' | 'WEAVING_ERROR' | 'STAIN' | 'OTHER'; defectsFound: number; checkedQuantity: number; status: 'PASSED' | 'FAILED' | 'RE-WORK'; date: string; }
export interface ProductionLog extends BaseEntity { jobId: string; machineId: string; operatorId: string; quantityProduced: number; wasteProduced: number; timestamp: string; efficiency?: number; }
export interface Customer extends BaseEntity { 
  name: string; 
  type: 'RETAILER' | 'WHOLESALER' | 'BRAND'; 
  contactPerson: string; 
  phone: string; 
  email?: string; 
  address?: string; 
  gstin?: string; 
  status?: 'ACTIVE' | 'INACTIVE';
  balance?: number;
  creditLimit?: number;
  tags?: string[];
}
export interface AgentLedgerEntry extends BaseEntity { date: string; type: 'COMMISSION_EARNED' | 'PAYMENT_RECEIVED'; description: string; amount: number; orderId?: string; }
export interface Agent extends BaseEntity { name: string; phone: string; area: string; commissionRate?: number; balance?: number; ledger?: AgentLedgerEntry[]; }
export interface InvoiceConfig { 
  prefix: string; 
  nextNumber: number; 
  defaultGst: number; 
  terms: string; 
  bankDetails: string; 
  currency: string; 
  footerText?: string;
  showLogo?: boolean;
}
export interface ShopifyConfig {
  enabled: boolean;
  shopUrl: string;
  accessToken: string;
}
export interface SecurityConfig {
  geminiApiKey: string;
  sessionTimeout: number; // in minutes
  twoFactorEnabled: boolean;
}
export interface CommunicationConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  whatsappEnabled: boolean;
  whatsappApiKey?: string;
}
export interface AdvancedConfig {
  enableAuditLogs: boolean;
  auditLogRetentionDays: number;
  debugMode: boolean;
  autoBackupInterval: number; // in hours
}

export interface Notification extends BaseEntity {
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  read: boolean;
  userId?: string;
  link?: string;
}

export interface Task extends BaseEntity {
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'ARCHIVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string;
  assignedTo?: string;
  projectId?: string;
  tags?: string[];
}

export interface LoanRecord extends BaseEntity { employeeId: string; date: string; type: 'GIVEN' | 'REPAID'; amount: number; notes: string; }
export interface LoanHistoryEntry extends BaseEntity { employeeId: string; date: string; type: 'GIVEN' | 'REPAID'; amount: number; notes: string; }
export interface LeaveRequest extends BaseEntity { employeeId: string; startDate: string; endDate: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; reason?: string; }
export interface GalleryItem extends BaseEntity { title: string; url: string; category: string; date: string; description?: string; }
export interface FabricInspection extends BaseEntity { rollNumber: string; fabricName: string; date: string; lengthYds: number; widthInch: number; defects: { points: 1 | 2 | 3 | 4; description: string; locationYds: number; }[]; totalPoints: number; pointsPer100SqYds: number; grade: 'A' | 'B' | 'REJECT'; }
export interface GatePass extends BaseEntity { number: string; date: string; type: 'INWARD' | 'OUTWARD'; referenceId: string; vehicleNo?: string; driverName?: string; }
export interface SampleRequest { id: string; designId?: string; customerId?: string; designName: string; customerName?: string; status: 'REQUESTED' | 'DEVELOPING' | 'SENT' | 'DELIVERED' | 'APPROVED' | 'REJECTED'; requestDate: string; expectedDate?: string; sentDate?: string; courierName?: string; trackingNumber?: string; courierCost?: number; sampleCost?: number; rejectionReason?: string; feedback?: string; artisanId?: string; version?: number; description?: string; imageUrl?: string; }
export interface LeadActivity { id: string; date: string; type: 'NOTE' | 'CALL' | 'EMAIL' | 'MEETING'; description: string; performedBy: string; }
export interface Lead extends BaseEntity { 
  companyName: string; 
  contactPerson: string; 
  phone: string; 
  email?: string; 
  address?: string;
  status: 'NEW' | 'SAMPLING' | 'QUOTED' | 'NEGOTIATION' | 'WON' | 'LOST'; 
  source: string; 
  potentialValue: number; 
  lastContactDate?: string; 
  priority: 'HOT' | 'WARM' | 'COLD'; 
  nextFollowUp?: string; 
  interest?: string; 
  activities?: LeadActivity[]; 
  samples?: SampleRequest[]; 
}

export interface PackItem { variantId: string; variantTitle: string; quantity: number; rate: number; }
export interface Pack extends BaseEntity { name: string; designId: string; designName: string; sku: string; items: PackItem[]; totalQuantity: number; totalPrice: number; weight?: number; status: 'ACTIVE' | 'ARCHIVED'; }

export interface StockTransfer extends BaseEntity {
  date: string;
  fromGodown: string;
  toGodown: string;
  items: { sku: string; quantity: number; unit: string }[];
  totalItems: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  carrierDetails?: string;
  gatePassId?: string;
}

// Fix: Added missing JobSlip interface to resolve App.tsx import error.
export interface JobSlip extends BaseEntity {
  jobId: string;
  karigarId: string;
  date: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  items: any[];
}

// Fix: Added missing Cheque interface to resolve App.tsx import error.
export interface Cheque extends BaseEntity {
  chequeNumber: string;
  bankName: string;
  amount: number;
  date: string;
  status: 'PENDING' | 'CLEARED' | 'BOUNCED';
  referenceId?: string;
}

// Fix: Added missing Budget interface to resolve App.tsx import error.
export interface Budget extends BaseEntity {
  name: string;
  amount: number;
  spent: number;
  period: string;
  category: string;
}

// ─── YARN MANAGEMENT ──────────────────────────────────────────────────────────
export type YarnType = 'COTTON' | 'POLYESTER' | 'SILK' | 'WOOL' | 'VISCOSE' | 'LINEN' | 'NYLON' | 'ACRYLIC' | 'BLENDED';
export type YarnStatus = 'AVAILABLE' | 'ISSUED' | 'CONSUMED' | 'REJECTED' | 'HOLD';

export interface YarnLot extends BaseEntity {
  lotNumber: string;
  type: YarnType | string;
  count: string;           // e.g. '30s', '40s'
  twist: string;           // 'S-Twist' | 'Z-Twist'
  shade?: string;
  supplierName?: string;
  supplierId?: string;
  receivedQty: number;     // kg
  currentQty: number;      // kg remaining
  pricePerKg: number;
  receivedDate: string;
  location?: string;
  notes?: string;
  status: YarnStatus;
  dyeLotRef?: string;
  tenacity?: number;       // cN/tex
  elongation?: number;     // %
  moisture?: number;       // %
  evenness?: number;       // Uster %
  batchCertificate?: string;
}

export interface YarnBlendComponent {
  yarnType: string;
  percentage: number;
  lotId?: string;
}

export interface YarnBlend extends BaseEntity {
  name: string;           // e.g. 'PC 65/35'
  components: YarnBlendComponent[];
  targetCount?: string;
  twist?: string;
  status: 'ACTIVE' | 'ARCHIVED';
  notes?: string;
  description?: string;
}

// ─── DYEING & PROCESSING ─────────────────────────────────────────────────────
export type DyeingProcess = 'YARN_DYEING' | 'FABRIC_DYEING' | 'PIECE_DYEING' | 'PRINTING' | 'BLEACHING' | 'MERCERIZING' | 'CALENDERING' | 'SANFORIZING';
export type DyeClass = 'REACTIVE' | 'VATS' | 'DIRECT' | 'ACID' | 'DISPERSE' | 'PIGMENT' | 'INDIGO';

export interface DyeingChemical {
  name: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
}

export interface DyeingJob extends BaseEntity {
  jobNumber: string;
  process: DyeingProcess;
  dyeClass?: DyeClass;
  shade: string;
  pantoneRef?: string;
  fabricName?: string;
  yarnLotId?: string;
  inputQty: number;       // meters or kg
  inputUnit: 'METER' | 'KG';
  outputQty?: number;
  shrinkagePercent?: number;
  lotId?: string;
  machineId?: string;
  machineName?: string;
  operatorId?: string;
  operatorName?: string;
  vendorId?: string;
  vendorName?: string;    // for job-work dyeing
  isJobWork: boolean;
  issueDate: string;
  expectedDate: string;
  completedDate?: string;
  status: 'PENDING' | 'IN_PROCESS' | 'COMPLETED' | 'FAILED' | 'RE-PROCESS';
  chemicals?: DyeingChemical[];
  temperature?: number;   // °C
  duration?: number;      // minutes
  ph?: number;
  fastness?: {
    washing?: number;     // 1-5
    rubbing?: number;
    light?: number;
  };
  laborCost?: number;
  chemicalCost?: number;
  machineCost?: number;
  totalCost?: number;
  remarks?: string;
  colorMatchStatus?: 'PASS' | 'FAIL' | 'PENDING';
}

// ─── FABRIC COSTING ───────────────────────────────────────────────────────────
export interface FabricCostingItem {
  id: string;
  name: string;           // e.g. 'Warp Yarn', 'Weft Yarn'
  category: 'YARN' | 'DYEING' | 'WEAVING' | 'FINISHING' | 'PACKING' | 'OVERHEAD' | 'OTHER';
  qty: number;
  unit: string;
  ratePerUnit: number;
  wastagePercent: number;
  amount: number;
}

export interface FabricCosting extends BaseEntity {
  name: string;           // e.g. 'Saree Costing - Banarasi 2024'
  designId?: string;
  designName?: string;
  fabricType: string;
  width: number;          // cm
  gsm?: number;
  construction?: string;  // e.g. '60x60 / 40x40'
  items: FabricCostingItem[];
  overheadPercent: number;
  profitPercent: number;
  taxPercent: number;
  rawMaterialCost: number;
  processingCost: number;
  totalCost: number;
  sellingPrice: number;
  marginPercent: number;
  currency?: string;
  status: 'DRAFT' | 'APPROVED' | 'ARCHIVED';
  notes?: string;
  version?: number;
}

// ─── DISPATCH PLANNER ────────────────────────────────────────────────────────
export type DispatchMode = 'ROAD' | 'RAIL' | 'AIR' | 'COURIER' | 'HAND_DELIVERY';
export type DispatchStatus = 'PENDING' | 'PACKED' | 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED' | 'CANCELLED';

export interface DispatchItem {
  orderId: string;
  orderNumber?: string;
  customerName: string;
  productName: string;
  qty: number;
  unit: string;
  weight?: number;        // kg
  value?: number;
  packed?: boolean;
}

export interface DispatchEntry extends BaseEntity {
  dispatchNumber: string;
  date: string;
  mode: DispatchMode;
  status: DispatchStatus;
  items: DispatchItem[];
  totalQty: number;
  totalWeight?: number;   // kg
  totalValue?: number;
  carrierName?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  lrNumber?: string;      // Lorry Receipt
  ewayBillNumber?: string;
  expectedDelivery?: string;
  actualDelivery?: string;
  fromAddress?: string;
  toAddress?: string;
  freightCost?: number;
  insuranceCost?: number;
  challanRef?: string;
  invoiceRef?: string;
  remarks?: string;
  trackingEvents?: { timestamp: string; location: string; status: string }[];
}
