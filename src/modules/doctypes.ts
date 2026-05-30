import { ViewState } from '../types';

export type DocFieldType =
  | 'Data'
  | 'Date'
  | 'Currency'
  | 'Float'
  | 'Int'
  | 'Select'
  | 'Table'
  | 'Link'
  | 'Check';

export interface DocField {
  fieldname: string;
  label: string;
  fieldtype: DocFieldType;
  required?: boolean;
  options?: string[];
  linkTo?: string;
}

export interface DocTypeSchema {
  name: string;
  view: ViewState;
  module: string;
  namingSeries: string;
  statusField?: string;
  statuses?: string[];
  fields: DocField[];
}

let storedCustomSchemas: DocTypeSchema[] = [];
try {
  const custom = localStorage.getItem('custom_doctypes');
  if (custom) {
    storedCustomSchemas = JSON.parse(custom);
  }
} catch (e) {}

export const DOCTYPE_SCHEMAS: DocTypeSchema[] = (
  [
    {
      name: 'Quotation',
      view: 'QUOTATION',
      module: 'Selling',
      namingSeries: 'QTN-.YYYY.-.####',
      statusField: 'status',
      statuses: ['DRAFT', 'PENDING', 'CONFIRMED', 'CANCELLED'],
      fields: [
        { fieldname: 'customerName', label: 'Customer', fieldtype: 'Link', linkTo: 'Customer', required: true },
        { fieldname: 'orderDate', label: 'Quotation Date', fieldtype: 'Date', required: true },
        { fieldname: 'dueDate', label: 'Valid Till', fieldtype: 'Date' },
        { fieldname: 'items', label: 'Items', fieldtype: 'Table', required: true },
        { fieldname: 'totalAmount', label: 'Grand Total', fieldtype: 'Currency' },
      ],
    },
    {
      name: 'Sales Order',
      view: 'ORDERS',
      module: 'Selling',
      namingSeries: 'SO-.YYYY.-.####',
      statusField: 'status',
      statuses: ['DRAFT', 'PENDING', 'CONFIRMED', 'FULFILLED', 'CANCELLED'],
      fields: [
        { fieldname: 'customerName', label: 'Customer', fieldtype: 'Link', linkTo: 'Customer', required: true },
        { fieldname: 'orderDate', label: 'Order Date', fieldtype: 'Date', required: true },
        { fieldname: 'dueDate', label: 'Due Date', fieldtype: 'Date' },
        { fieldname: 'items', label: 'Items', fieldtype: 'Table', required: true },
        { fieldname: 'totalAmount', label: 'Grand Total', fieldtype: 'Currency' },
      ],
    },
    {
      name: 'Work Order',
      view: 'PRODUCTION',
      module: 'Manufacturing',
      namingSeries: 'WO-.YYYY.-.####',
      statusField: 'status',
      statuses: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      fields: [
        { fieldname: 'productName', label: 'Item To Manufacture', fieldtype: 'Link', linkTo: 'Item', required: true },
        { fieldname: 'styleCode', label: 'Style Code', fieldtype: 'Data' },
        { fieldname: 'color', label: 'Color / Shade', fieldtype: 'Data' },
        { fieldname: 'fabricLot', label: 'Fabric Lot', fieldtype: 'Data' },
        { fieldname: 'season', label: 'Season', fieldtype: 'Data' },
        { fieldname: 'quantity', label: 'Quantity', fieldtype: 'Float', required: true },
        { fieldname: 'deadline', label: 'Planned End Date', fieldtype: 'Date' },
        { fieldname: 'routingTemplateId', label: 'Routing Template', fieldtype: 'Data' },
        { fieldname: 'operations', label: 'Operations', fieldtype: 'Table' },
        { fieldname: 'bundles', label: 'Bundle Tickets', fieldtype: 'Table' },
        { fieldname: 'priority', label: 'Priority', fieldtype: 'Select', options: ['LOW', 'NORMAL', 'HIGH'] },
        { fieldname: 'progress', label: 'Progress', fieldtype: 'Int' },
      ],
    },
    {
      name: 'BOM',
      view: 'DESIGN_RECIPE',
      module: 'Manufacturing',
      namingSeries: 'BOM-.YYYY.-.####',
      statusField: 'status',
      statuses: ['DRAFT', 'ACTIVE', 'ARCHIVED', 'DISCONTINUED'],
      fields: [
        { fieldname: 'name', label: 'Style / Design Name', fieldtype: 'Data', required: true },
        { fieldname: 'sku', label: 'Style Code', fieldtype: 'Data', required: true },
        { fieldname: 'category', label: 'Garment Category', fieldtype: 'Select', options: ['SAREE', 'KURTI', 'SUIT', 'FABRIC'] },
        { fieldname: 'routingTemplateId', label: 'Manufacturing Routing', fieldtype: 'Data' },
        { fieldname: 'finishedWidth', label: 'Finished Width', fieldtype: 'Data' },
        { fieldname: 'finishedGsm', label: 'Finished GSM', fieldtype: 'Data' },
        { fieldname: 'recipe', label: 'BOM Items', fieldtype: 'Table' },
        { fieldname: 'processCostPerPiece', label: 'Process Cost / Piece', fieldtype: 'Currency' },
      ],
    },
    {
      name: 'Subcontracting Order',
      view: 'JOB_WORK',
      module: 'Manufacturing',
      namingSeries: 'JC-.YYYY.-.####',
      statusField: 'status',
      statuses: ['ISSUED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      fields: [
        { fieldname: 'vendorName', label: 'Supplier', fieldtype: 'Link', linkTo: 'Supplier' },
        { fieldname: 'process', label: 'Operation', fieldtype: 'Select', options: ['CUTTING', 'STITCHING', 'DYEING', 'FINISHING'] },
        { fieldname: 'sourceWorkOrderId', label: 'Source Work Order', fieldtype: 'Link', linkTo: 'Work Order' },
        { fieldname: 'sourceOperationId', label: 'Source Operation', fieldtype: 'Data' },
        { fieldname: 'styleCode', label: 'Style Code', fieldtype: 'Data' },
        { fieldname: 'color', label: 'Color / Shade', fieldtype: 'Data' },
        { fieldname: 'fabricLot', label: 'Fabric Lot', fieldtype: 'Data' },
        { fieldname: 'issueDate', label: 'Issue Date', fieldtype: 'Date' },
        { fieldname: 'expectedDate', label: 'Expected Date', fieldtype: 'Date' },
        { fieldname: 'items', label: 'Items', fieldtype: 'Table' },
      ],
    },
    {
      name: 'Material Request',
      view: 'MATERIAL_REQUEST',
      module: 'Buying',
      namingSeries: 'MR-.YYYY.-.####',
      statusField: 'status',
      statuses: ['DRAFT', 'PENDING', 'ORDERED', 'RECEIVED', 'REJECTED'],
      fields: [
        { fieldname: 'date', label: 'Date', fieldtype: 'Date' },
        { fieldname: 'requestedBy', label: 'Requested By', fieldtype: 'Data' },
        { fieldname: 'department', label: 'Department', fieldtype: 'Data' },
        { fieldname: 'items', label: 'Items', fieldtype: 'Table', required: true },
      ],
    },
    {
      name: 'Supplier Quotation',
      view: 'SUPPLIER_QUOTATION',
      module: 'Buying',
      namingSeries: 'SQTN-.YYYY.-.####',
      statusField: 'status',
      statuses: ['DRAFT', 'SUBMITTED', 'ACCEPTED', 'REJECTED'],
      fields: [
        { fieldname: 'supplierName', label: 'Supplier', fieldtype: 'Link', linkTo: 'Supplier', required: true },
        { fieldname: 'date', label: 'Date', fieldtype: 'Date', required: true },
        { fieldname: 'validTill', label: 'Valid Till', fieldtype: 'Date' },
        { fieldname: 'items', label: 'Items', fieldtype: 'Table', required: true },
        { fieldname: 'totalAmount', label: 'Grand Total', fieldtype: 'Currency' },
        { fieldname: 'notes', label: 'Notes', fieldtype: 'Data' },
      ],
    },
    {
      name: 'Purchase Order',
      view: 'PURCHASE_ORDER',
      module: 'Buying',
      namingSeries: 'PO-.YYYY.-.####',
      statusField: 'status',
      statuses: ['DRAFT', 'SENT', 'RECEIVED', 'CANCELLED'],
      fields: [
        { fieldname: 'supplierName', label: 'Supplier', fieldtype: 'Link', linkTo: 'Supplier', required: true },
        { fieldname: 'date', label: 'Date', fieldtype: 'Date', required: true },
        { fieldname: 'expectedDate', label: 'Required By', fieldtype: 'Date' },
        { fieldname: 'items', label: 'Items', fieldtype: 'Table', required: true },
        { fieldname: 'totalAmount', label: 'Grand Total', fieldtype: 'Currency' },
      ],
    },
    {
      name: 'Purchase Invoice',
      view: 'PURCHASE_INVOICE',
      module: 'Buying',
      namingSeries: 'PINV-.YYYY.-.####',
      statusField: 'status',
      statuses: ['DRAFT', 'SENT', 'RECEIVED', 'CANCELLED'],
      fields: [
        { fieldname: 'supplierName', label: 'Supplier', fieldtype: 'Link', linkTo: 'Supplier', required: true },
        { fieldname: 'date', label: 'Posting Date', fieldtype: 'Date', required: true },
        { fieldname: 'items', label: 'Items', fieldtype: 'Table', required: true },
        { fieldname: 'totalAmount', label: 'Grand Total', fieldtype: 'Currency' },
        { fieldname: 'taxRate', label: 'Tax Rate', fieldtype: 'Float' },
      ],
    },
    {
      name: 'Item',
      view: 'INVENTORY',
      module: 'Stock',
      namingSeries: 'ITEM-.####',
      fields: [
        { fieldname: 'name', label: 'Item Name', fieldtype: 'Data', required: true },
        { fieldname: 'type', label: 'Item Group', fieldtype: 'Select', options: ['YARN', 'FABRIC', 'ACCESSORY', 'DYE', 'PACKAGING'] },
        { fieldname: 'quantity', label: 'Actual Qty', fieldtype: 'Float' },
        { fieldname: 'unit', label: 'Stock UOM', fieldtype: 'Select', options: ['KG', 'METER', 'PIECE', 'LITER', 'BOX', 'YARD'] },
        { fieldname: 'location', label: 'Warehouse', fieldtype: 'Link', linkTo: 'Warehouse' },
      ],
    },
    {
      name: 'Customer',
      view: 'CUSTOMERS',
      module: 'Masters',
      namingSeries: 'CUST-.####',
      statusField: 'status',
      statuses: ['ACTIVE', 'INACTIVE', 'BLOCKED'],
      fields: [
        { fieldname: 'name', label: 'Customer Name', fieldtype: 'Data', required: true },
        { fieldname: 'contactPerson', label: 'Contact Person', fieldtype: 'Data' },
        { fieldname: 'phone', label: 'Phone', fieldtype: 'Data' },
        { fieldname: 'email', label: 'Email', fieldtype: 'Data' },
        { fieldname: 'gstin', label: 'GSTIN', fieldtype: 'Data' },
        { fieldname: 'type', label: 'Customer Type', fieldtype: 'Select', options: ['RETAILER', 'WHOLESALER', 'BRAND'] },
        { fieldname: 'creditLimit', label: 'Credit Limit', fieldtype: 'Currency' },
        { fieldname: 'balance', label: 'Outstanding Balance', fieldtype: 'Currency' },
      ],
    },
    {
      name: 'Supplier',
      view: 'SUPPLIERS',
      module: 'Masters',
      namingSeries: 'SUP-.####',
      fields: [
        { fieldname: 'name', label: 'Supplier Name', fieldtype: 'Data', required: true },
        { fieldname: 'contactPerson', label: 'Contact Person', fieldtype: 'Data' },
        { fieldname: 'email', label: 'Email', fieldtype: 'Data' },
        { fieldname: 'phone', label: 'Phone', fieldtype: 'Data' },
        { fieldname: 'location', label: 'Location', fieldtype: 'Data' },
        { fieldname: 'reliabilityScore', label: 'Reliability Score', fieldtype: 'Int' },
        { fieldname: 'materialsProvided', label: 'Materials Provided', fieldtype: 'Table' },
      ],
    },
    {
      name: 'Quality Inspection',
      view: 'QUALITY',
      module: 'Manufacturing',
      namingSeries: 'QI-.YYYY.-.####',
      statusField: 'status',
      statuses: ['PASSED', 'FAILED', 'RE-WORK'],
      fields: [
        { fieldname: 'jobId', label: 'Reference Work Order', fieldtype: 'Link', linkTo: 'Work Order', required: true },
        { fieldname: 'operationId', label: 'Operation', fieldtype: 'Data' },
        { fieldname: 'productName', label: 'Product', fieldtype: 'Data' },
        { fieldname: 'styleCode', label: 'Style Code', fieldtype: 'Data' },
        { fieldname: 'color', label: 'Color / Shade', fieldtype: 'Data' },
        { fieldname: 'size', label: 'Size', fieldtype: 'Data' },
        { fieldname: 'inspectorName', label: 'Inspector', fieldtype: 'Data' },
        { fieldname: 'checkedQuantity', label: 'Inspected Quantity', fieldtype: 'Float' },
        { fieldname: 'defectsFound', label: 'Rejected Quantity', fieldtype: 'Float' },
        { fieldname: 'measurements', label: 'Measurement Checks', fieldtype: 'Table' },
        { fieldname: 'date', label: 'Inspection Date', fieldtype: 'Date' },
      ],
    },
    {
      name: 'Task',
      view: 'TASKS',
      module: 'Workspace',
      namingSeries: 'TASK-.YYYY.-.####',
      statusField: 'status',
      statuses: ['TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED'],
      fields: [
        { fieldname: 'title', label: 'Subject', fieldtype: 'Data', required: true },
        { fieldname: 'description', label: 'Description', fieldtype: 'Data' },
        { fieldname: 'priority', label: 'Priority', fieldtype: 'Select', options: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
        { fieldname: 'dueDate', label: 'Due Date', fieldtype: 'Date' },
        { fieldname: 'assignedTo', label: 'Assigned To', fieldtype: 'Link', linkTo: 'Employee' },
      ],
    },
    {
      name: 'Project',
      view: 'PROJECTS',
      module: 'Workspace',
      namingSeries: 'PROJ-.YYYY.-.####',
      statusField: 'status',
      statuses: ['PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'],
      fields: [
        { fieldname: 'name', label: 'Project Name', fieldtype: 'Data', required: true },
        { fieldname: 'clientName', label: 'Customer', fieldtype: 'Link', linkTo: 'Customer' },
        { fieldname: 'startDate', label: 'Start Date', fieldtype: 'Date' },
        { fieldname: 'endDate', label: 'End Date', fieldtype: 'Date' },
        { fieldname: 'budget', label: 'Budget', fieldtype: 'Currency' },
        { fieldname: 'spent', label: 'Spent', fieldtype: 'Currency' },
        { fieldname: 'description', label: 'Description', fieldtype: 'Data' },
        { fieldname: 'tasks', label: 'Tasks', fieldtype: 'Table' },
      ],
    }
  ] as DocTypeSchema[]).filter(s => !storedCustomSchemas.find(cs => cs.name === s.name)).concat(storedCustomSchemas);

export const saveCustomDocTypeSchema = (schema: DocTypeSchema) => {
  const existingIndex = storedCustomSchemas.findIndex(s => s.name === schema.name);
  if (existingIndex >= 0) {
    storedCustomSchemas[existingIndex] = schema;
  } else {
    storedCustomSchemas.push(schema);
  }
  localStorage.setItem('custom_doctypes', JSON.stringify(storedCustomSchemas));
  
  const inMemoryIndex = DOCTYPE_SCHEMAS.findIndex(s => s.name === schema.name);
  if (inMemoryIndex >= 0) {
    DOCTYPE_SCHEMAS[inMemoryIndex] = schema;
  } else {
    DOCTYPE_SCHEMAS.push(schema);
  }
};

export const getDocTypeSchema = (view: ViewState) =>
  DOCTYPE_SCHEMAS.find((schema) => schema.view === view);
