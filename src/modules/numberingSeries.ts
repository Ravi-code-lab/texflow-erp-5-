// TexFlow — Document Numbering Series
// Generates human-readable document IDs like SO-2526-0001, INV/25-26/001

export type YearFormat = 'YYYY' | 'YY' | 'FY-SHORT' | 'FY-LONG' | 'NONE';
// FY-SHORT = 25-26  (Apr–Mar Indian fiscal year)
// FY-LONG  = 2025-26

export interface SeriesRule {
  doctype: string;        // e.g. "ORDERS", "TAX_INVOICES"
  label: string;          // display name in settings
  prefix: string;         // e.g. "SO", "INV", "WO"
  separator: string;      // "-" or "/"
  yearFormat: YearFormat;
  padding: number;        // zero-pad width, e.g. 4 → 0001
  currentNumber: number;  // last used number (auto-incremented on each save)
  enabled: boolean;
}

export type NumberingSeriesConfig = Record<string, SeriesRule>;

// ── defaults ──────────────────────────────────────────────────────────────────
export const DEFAULT_NUMBERING_CONFIG: NumberingSeriesConfig = {
  ORDERS:             { doctype:'ORDERS',            label:'Sales Orders',        prefix:'SO',   separator:'-', yearFormat:'FY-SHORT', padding:4, currentNumber:0, enabled:true },
  TAX_INVOICES:       { doctype:'TAX_INVOICES',      label:'Tax Invoices',        prefix:'INV',  separator:'/', yearFormat:'FY-SHORT', padding:3, currentNumber:0, enabled:true },
  PURCHASE_ORDER:     { doctype:'PURCHASE_ORDER',    label:'Purchase Orders',     prefix:'PO',   separator:'-', yearFormat:'FY-SHORT', padding:4, currentNumber:0, enabled:true },
  PURCHASE_INWARD:    { doctype:'PURCHASE_INWARD',   label:'Purchase Receipts',   prefix:'GRN',  separator:'-', yearFormat:'FY-SHORT', padding:4, currentNumber:0, enabled:true },
  PURCHASE_INVOICE:   { doctype:'PURCHASE_INVOICE',  label:'Purchase Invoices',   prefix:'PINV', separator:'-', yearFormat:'FY-SHORT', padding:4, currentNumber:0, enabled:true },
  QUOTATION:          { doctype:'QUOTATION',         label:'Quotations',          prefix:'QT',   separator:'-', yearFormat:'FY-SHORT', padding:4, currentNumber:0, enabled:true },
  WORK_ORDER:         { doctype:'WORK_ORDER',        label:'Work Orders',         prefix:'WO',   separator:'-', yearFormat:'FY-SHORT', padding:4, currentNumber:0, enabled:true },
  JOB_WORK:           { doctype:'JOB_WORK',          label:'Job Work / Outsource',prefix:'JW',   separator:'-', yearFormat:'FY-SHORT', padding:4, currentNumber:0, enabled:true },
  MATERIAL_REQUEST:   { doctype:'MATERIAL_REQUEST',  label:'Material Requests',   prefix:'MR',   separator:'-', yearFormat:'FY-SHORT', padding:4, currentNumber:0, enabled:true },
  DELIVERY_CHALLAN:   { doctype:'DELIVERY_CHALLAN',  label:'Delivery Challans',   prefix:'DC',   separator:'-', yearFormat:'FY-SHORT', padding:4, currentNumber:0, enabled:true },
  GATE_PASS:          { doctype:'GATE_PASS',         label:'Gate Passes',         prefix:'GP',   separator:'-', yearFormat:'FY-SHORT', padding:4, currentNumber:0, enabled:true },
  CREDIT_NOTE:        { doctype:'CREDIT_NOTE',       label:'Credit Notes',        prefix:'CN',   separator:'-', yearFormat:'FY-SHORT', padding:4, currentNumber:0, enabled:true },
  DEBIT_NOTE:         { doctype:'DEBIT_NOTE',        label:'Debit Notes',         prefix:'DN',   separator:'-', yearFormat:'FY-SHORT', padding:4, currentNumber:0, enabled:true },
  SAMPLE:             { doctype:'SAMPLE',            label:'Sample Orders',       prefix:'SMP',  separator:'-', yearFormat:'FY-SHORT', padding:4, currentNumber:0, enabled:true },
};

// ── year segment ─────────────────────────────────────────────────────────────
function getYearSegment(fmt: YearFormat, date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1; // 1-indexed
  // Indian FY: Apr 1 – Mar 31
  const fyStart = m >= 4 ? y : y - 1;
  const fyEnd   = fyStart + 1;

  switch (fmt) {
    case 'YYYY':      return String(y);
    case 'YY':        return String(y).slice(-2);
    case 'FY-SHORT':  return `${String(fyStart).slice(-2)}-${String(fyEnd).slice(-2)}`; // 25-26
    case 'FY-LONG':   return `${fyStart}-${String(fyEnd).slice(-2)}`; // 2025-26
    case 'NONE':      return '';
    default:          return '';
  }
}

// ── generate next ID (does NOT mutate config — caller must persist) ────────────
export function generateNextId(rule: SeriesRule): { id: string; nextNumber: number } {
  const next = rule.currentNumber + 1;
  const numPart = String(next).padStart(rule.padding, '0');
  const yearPart = getYearSegment(rule.yearFormat);

  let id: string;
  if (yearPart) {
    id = `${rule.prefix}${rule.separator}${yearPart}${rule.separator}${numPart}`;
  } else {
    id = `${rule.prefix}${rule.separator}${numPart}`;
  }

  return { id, nextNumber: next };
}

// ── preview (for Settings UI) ─────────────────────────────────────────────────
export function previewId(rule: SeriesRule): string {
  return generateNextId({ ...rule, currentNumber: rule.currentNumber }).id;
}
