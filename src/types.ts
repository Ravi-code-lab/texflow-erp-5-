export type ViewState = string;
export type InventoryItem = any;
export interface Order extends BaseEntity {
    status?: string;
    [key: string]: any;
}
export type Customer = any;
export type TeamMember = any;
export type Supplier = any;
export type Design = any;
export type JobWork = any;
export type Warehouse = any;
export type Machine = any;
export type Project = any;
export type Transaction = any;
export type Agent = any;
export type JobSlip = any;
export type Karigar = any;
export type AttendanceRecord = any;
export type Cheque = any;
export type Budget = any;
export type Lead = any;
export type MaintenanceRecord = any;
export type QualityReport = any;
export type LoanRecord = any;
export type LeaveRequest = any;
export type GalleryItem = any;
export type UIPreferences = any;
export type CompanyInfo = any;
export type ProductionLog = any;
export type FabricInspection = any;
export type PurchaseOrder = any;
export type ProductionJob = any;
export interface BaseEntity {
    id: string;
    deleted?: boolean;
    doctype?: string;
    [key: string]: any;
}
export type GatePass = any;
export type StockAudit = any;
export type PayrollAdjustment = any;
export type SampleRequest = any;
export type Pack = any;
export type StockTransfer = any;
export type WasteLog = any;
export type BrokerageLog = any;
export type MarginCosting = any;
export type ShopifyConfig = any;
export type InvoiceConfig = any;
export type { NumberingSeriesConfig, SeriesRule, YearFormat } from './modules/numberingSeries';
export type SecurityConfig = any;
export type CommunicationConfig = any;
export type AdvancedConfig = any;
export type Notification = any;
export type Task = any;
export type Timesheet = any;
export type SupplierQuotation = any;
export type MaterialRequest = any;
export type SupportTicket = any;
export type ExpenseClaim = any;
export type Vehicle = any;
export type POSInvoice = any;
export type AuditLog = any;
export type YarnLot = any;
export type DyeingJob = any;
export type FabricCosting = any;
export type DispatchEntry = any;
export type PackingSlip = any;
export type RolePermission = any;
export type ReportItem = any;
export type ReportDefinition = any; // Just in case
export enum MaterialType {
  FABRIC = 'FABRIC',
  YARN = 'YARN',
  DYE = 'DYE',
  ACCESSORY = 'ACCESSORY',
  PACKAGING = 'PACKAGING',
  FINISHED = 'FINISHED'
}

export enum Unit {
  METER = 'METER',
  KG = 'KG',
  PIECE = 'PIECE',
  SET = 'SET',
  LITER = 'LITER',
  BOX = 'BOX'
}

export type GarmentWorkOrderOperation = any;
export type DeliveryNoteItem = any;
export type PurchaseOrderItem = any;
export type GarmentMeasurementCheck = any;
export type OrderItem = any;
export type UserRole = string;
export type GarmentRoutingTemplate = any;
export type GarmentRoutingOperation = any;
export type FabricCostingItem = any;
export type MaterialRequestItem = any;
export type RecipeItem = any;
export type ProjectTask = any;
export type KarigarLedgerEntry = any;
export type POSInvoiceItem = any;
export type JobWorkItem = any;
export type JobWorkSuppliedItem = any;
export type AgentLedgerEntry = any;
export type LeadActivity = any;
export type DesignLaborCost = any;
export type DispatchItem = any;
export type DispatchMode = any;
export type DispatchStatus = any;
export type CuttingLog = any;
export type GarmentOperationTemplate = any;
export type GarmentBundleTicket = any;


export enum AttendanceStatus {
    PRESENT = 'PRESENT',
    ABSENT = 'ABSENT',
    HALF_DAY = 'HALF_DAY',
    LATE = 'LATE',
    LEAVE = 'LEAVE',
    HOLIDAY = 'HOLIDAY'
}

export enum ShiftType {
    MORNING = 'MORNING',
    GENERAL = 'GENERAL',
    NIGHT = 'NIGHT'
}



