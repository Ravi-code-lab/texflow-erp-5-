import { ViewState } from "../types";

export interface DocField {
  fieldname: string;
  label: string;
  fieldtype:
    | "Data"
    | "Int"
    | "Float"
    | "Currency"
    | "Date"
    | "Datetime"
    | "Select"
    | "Check"
    | "Text"
    | "Small Text"
    | "Link"
    | "Table"
    | "Attach"
    | "Read Only";
  reqd?: boolean;
  required?: boolean; // alias for reqd
  options?: string[]; // array of choices for Select fields
  linkTo?: string; // doctype name for Link fields
  default?: any;
  hidden?: boolean;
  read_only?: boolean;
  description?: string;
}

export interface DocTypeSchema {
  view: ViewState;
  name: string;
  module: string;
  description?: string;
  fields: DocField[];
  namingSeriesPrefix?: string;
  namingSeries?: string; // full naming series pattern e.g. "SO-.YYYY.-.####"
  titleField?: string;
  statusField?: string;
  statuses?: string[];
  isSubmittable?: boolean;
}

export const DOCTYPE_SCHEMAS: DocTypeSchema[] = [
  {
    view: "ORDERS",
    name: "Sales Order",
    module: "Selling",
    description: "Customer sales orders",
    namingSeriesPrefix: "SO-",
    namingSeries: "SO-.YYYY.-.####",
    titleField: "customer",
    statusField: "status",
    statuses: [
      "Draft",
      "Confirmed",
      "In Production",
      "Dispatched",
      "Closed",
      "Cancelled",
    ],
    isSubmittable: true,
    fields: [
      {
        fieldname: "name",
        label: "Order ID",
        fieldtype: "Data",
        required: true,
      },
      {
        fieldname: "customer",
        label: "Customer",
        fieldtype: "Link",
        linkTo: "Customer",
        required: true,
      },
      { fieldname: "date", label: "Date", fieldtype: "Date", required: true },
      {
        fieldname: "status",
        label: "Status",
        fieldtype: "Select",
        options: [
          "Draft",
          "Confirmed",
          "In Production",
          "Dispatched",
          "Closed",
          "Cancelled",
        ],
        default: "Draft",
      },
      { fieldname: "total", label: "Total Amount", fieldtype: "Currency" },
      { fieldname: "notes", label: "Notes", fieldtype: "Text" },
    ],
  },
  {
    view: "INVENTORY",
    name: "Item",
    module: "Stock",
    description: "Inventory items and products",
    namingSeriesPrefix: "ITEM-",
    namingSeries: "ITEM-.####",
    titleField: "itemName",
    statusField: "status",
    statuses: ["Active", "Inactive", "Discontinued"],
    fields: [
      {
        fieldname: "itemCode",
        label: "Item Code",
        fieldtype: "Data",
        required: true,
      },
      {
        fieldname: "itemName",
        label: "Item Name",
        fieldtype: "Data",
        required: true,
      },
      {
        fieldname: "category",
        label: "Category",
        fieldtype: "Select",
        options: ["Fabric", "Yarn", "Accessory", "Finished Goods", "Packaging"],
      },
      {
        fieldname: "unit",
        label: "Unit",
        fieldtype: "Select",
        options: ["KG", "METER", "PIECE", "LITER", "YARD"],
      },
      { fieldname: "currentStock", label: "Current Stock", fieldtype: "Float" },
      { fieldname: "reorderLevel", label: "Reorder Level", fieldtype: "Float" },
      {
        fieldname: "status",
        label: "Status",
        fieldtype: "Select",
        options: ["Active", "Inactive", "Discontinued"],
        default: "Active",
      },
    ],
  },
  {
    view: "SUPPLIERS",
    name: "Supplier",
    module: "Buying",
    description: "Supplier master",
    namingSeriesPrefix: "SUP-",
    namingSeries: "SUP-.####",
    titleField: "name",
    fields: [
      {
        fieldname: "name",
        label: "Supplier Name",
        fieldtype: "Data",
        required: true,
      },
      { fieldname: "phone", label: "Phone", fieldtype: "Data" },
      { fieldname: "email", label: "Email", fieldtype: "Data" },
      { fieldname: "gstin", label: "GSTIN", fieldtype: "Data" },
    ],
  },
  {
    view: "CUSTOMERS",
    name: "Customer",
    module: "Selling",
    description: "Customer master",
    namingSeriesPrefix: "CUST-",
    namingSeries: "CUST-.####",
    titleField: "name",
    fields: [
      {
        fieldname: "name",
        label: "Customer Name",
        fieldtype: "Data",
        required: true,
      },
      { fieldname: "phone", label: "Phone", fieldtype: "Data" },
      { fieldname: "email", label: "Email", fieldtype: "Data" },
      { fieldname: "gstin", label: "GSTIN", fieldtype: "Data" },
    ],
  },
  {
    view: "PURCHASE_ORDER",
    name: "Purchase Order",
    module: "Buying",
    description: "Purchase orders to suppliers",
    namingSeriesPrefix: "PO-",
    namingSeries: "PO-.YYYY.-.####",
    statusField: "status",
    statuses: ["Draft", "Ordered", "Received", "Closed", "Cancelled"],
    isSubmittable: true,
    fields: [
      {
        fieldname: "supplier",
        label: "Supplier",
        fieldtype: "Link",
        linkTo: "Supplier",
        required: true,
      },
      { fieldname: "date", label: "Date", fieldtype: "Date", required: true },
      {
        fieldname: "status",
        label: "Status",
        fieldtype: "Select",
        options: ["Draft", "Ordered", "Received", "Closed", "Cancelled"],
        default: "Draft",
      },
      { fieldname: "total", label: "Total Amount", fieldtype: "Currency" },
    ],
  },
  {
    view: "PRODUCTION",
    name: "Work Order",
    module: "Manufacturing",
    description: "Production work orders",
    namingSeriesPrefix: "WO-",
    namingSeries: "WO-.YYYY.-.####",
    statusField: "status",
    statuses: [
      "Draft",
      "In Progress",
      "Quality Check",
      "Completed",
      "Cancelled",
    ],
    fields: [
      {
        fieldname: "productName",
        label: "Product",
        fieldtype: "Data",
        required: true,
      },
      {
        fieldname: "quantity",
        label: "Quantity",
        fieldtype: "Int",
        required: true,
      },
      {
        fieldname: "status",
        label: "Status",
        fieldtype: "Select",
        options: [
          "Draft",
          "In Progress",
          "Quality Check",
          "Completed",
          "Cancelled",
        ],
        default: "Draft",
      },
      { fieldname: "startDate", label: "Start Date", fieldtype: "Date" },
    ],
  },
  {
    view: "MATERIAL_REQUEST",
    name: "Material Request",
    module: "Stock",
    description: "Material requisitions",
    namingSeriesPrefix: "MR-",
    namingSeries: "MR-.YYYY.-.####",
    statusField: "status",
    statuses: ["Draft", "Pending", "Ordered", "Received", "Cancelled"],
    fields: [
      {
        fieldname: "purpose",
        label: "Purpose",
        fieldtype: "Select",
        options: ["Purchase", "Transfer", "Manufacture"],
        required: true,
      },
      {
        fieldname: "status",
        label: "Status",
        fieldtype: "Select",
        options: ["Draft", "Pending", "Ordered", "Received", "Cancelled"],
        default: "Draft",
      },
      { fieldname: "requestedDate", label: "Required By", fieldtype: "Date" },
    ],
  },
  {
    view: "TEAM",
    name: "Employee",
    module: "HR",
    description: "Employee details",
    namingSeriesPrefix: "EMP-",
    namingSeries: "EMP-.####",
    statusField: "status",
    statuses: ["Active", "Inactive", "Suspended", "Left"],
    fields: [],
  },

  {
    view: "KARIGARS",
    name: "Karigar",
    module: "Manufacturing",
    description: "Karigar/Worker details",
    namingSeriesPrefix: "WRK-",
    namingSeries: "WRK-.####",
    fields: [],
  },
  {
    view: "AGENTS",
    name: "Sales Partner",
    module: "Selling",
    description: "Sales Agent profiles",
    namingSeriesPrefix: "AGT-",
    namingSeries: "AGT-.####",
    fields: [],
  },
  {
    view: "OFFICES",
    name: "Warehouse",
    module: "Stock",
    description: "Warehouse and Storage locations",
    namingSeriesPrefix: "WH-",
    namingSeries: "WH-.####",
    statusField: "status",
    statuses: ["ACTIVE", "INACTIVE"],
    fields: [
      {
        fieldname: "name",
        label: "Warehouse Name",
        fieldtype: "Data",
        required: true,
      },
      { fieldname: "isGroup", label: "Is Group", fieldtype: "Check" },
      {
        fieldname: "parentWarehouse",
        label: "Parent Warehouse",
        fieldtype: "Link",
        linkTo: "Warehouse",
      },
      {
        fieldname: "type",
        label: "Type",
        fieldtype: "Select",
        options: ["Transit", "Storage", "Manufacturing", "Store", "Virtual"],
        default: "Store",
      },
      { fieldname: "manager", label: "Manager", fieldtype: "Data" },
      {
        fieldname: "status",
        label: "Status",
        fieldtype: "Select",
        options: ["ACTIVE", "INACTIVE"],
        default: "ACTIVE",
      },
    ],
  },
  {
    view: "SAMPLING",
    name: "Sample Request",
    module: "Manufacturing",
    description: "Manage pre-production sample development",
    namingSeriesPrefix: "SMP-",
    namingSeries: "SMP-.####",
    statusField: "status",
    statuses: [
      "REQUESTED",
      "DEVELOPING",
      "SENT",
      "DELIVERED",
      "APPROVED",
      "REJECTED",
    ],
    fields: [
      {
        fieldname: "designName",
        label: "Design Name",
        fieldtype: "Data",
        required: true,
      },
      { fieldname: "customerName", label: "Customer Name", fieldtype: "Data" },
      {
        fieldname: "status",
        label: "Status",
        fieldtype: "Select",
        options: [
          "REQUESTED",
          "DEVELOPING",
          "SENT",
          "DELIVERED",
          "APPROVED",
          "REJECTED",
        ],
        default: "REQUESTED",
      },
      {
        fieldname: "requestDate",
        label: "Request Date",
        fieldtype: "Date",
        required: true,
      },
      { fieldname: "sentDate", label: "Dispatch Date", fieldtype: "Date" },
      { fieldname: "version", label: "Version", fieldtype: "Int", default: 1 },
      { fieldname: "sampleCost", label: "Sample Cost", fieldtype: "Currency" },
      {
        fieldname: "artisanId",
        label: "Karigar",
        fieldtype: "Link",
        linkTo: "Karigar",
      },
      { fieldname: "description", label: "Notes", fieldtype: "Data" },
    ],
  },
];

const customSchemas: Map<string, DocTypeSchema> = new Map();

export function getDocTypeSchema(view: ViewState): DocTypeSchema | undefined {
  return (
    customSchemas.get(view) || DOCTYPE_SCHEMAS.find((s) => s.view === view)
  );
}

export function saveCustomDocTypeSchema(schema: DocTypeSchema): void {
  const existing = DOCTYPE_SCHEMAS.findIndex((s) => s.view === schema.view);
  if (existing !== -1) {
    DOCTYPE_SCHEMAS[existing] = schema;
  } else {
    customSchemas.set(schema.view, schema);
    DOCTYPE_SCHEMAS.push(schema);
  }
}
