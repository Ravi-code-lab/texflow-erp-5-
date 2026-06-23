import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { getItem, setItem } from '../utils/networkClient';
import {
  Plus, ChevronRight, ChevronDown, BookOpen, FolderOpen,
  Search, Trash2, Edit2, Save, Download, AlertCircle, CheckCircle,
  Sliders, RefreshCw, Send, Check, Clock, X, HelpCircle, Building,
  Upload, FileText, Settings, Database, PlusCircle, RotateCcw,
  AlertTriangle, ArrowUpRight, ArrowDownLeft, DollarSign, TrendingUp,
  TrendingDown, Layers, Filter, Eye, EyeOff, MoreVertical,
  ChevronsUpDown, ChevronUp, Info, Printer, Copy, List,
  Grid3x3, Activity, BarChart2, Target, Wallet, CreditCard,
  Landmark, ShoppingCart, Package, Users, Briefcase, Shield,
  ArrowRight, Hash, Percent, Globe, Lock, Unlock, Star
} from 'lucide-react';
import { toast, useConfirm } from "../utils/toast";

// ──────────────────────────────────────────────
// Types & Interfaces
// ──────────────────────────────────────────────
type AccountRootType = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
type AccountSubType =
  | 'Bank' | 'Cash' | 'Stock' | 'Tax' | 'Receivable' | 'Payable'
  | 'Fixed Asset' | 'Accumulated Depreciation' | 'Investments'
  | 'Loans (Liability)' | 'Capital Stock' | 'Retained Earnings'
  | 'Direct Income' | 'Indirect Income' | 'Direct Expense' | 'Indirect Expense'
  | 'Cost of Goods Sold' | 'Depreciation' | 'Payroll Payable' | 'Other';

interface AccountItem {
  id: string;
  parentId?: string;
  code: string;
  name: string;
  rootType: AccountRootType;
  accountType: AccountSubType | string;
  isGroup: boolean;
  balance: number;
  currency: string;
  taxRate?: number;
  disabled?: boolean;
  notes?: string;
  costCenter?: string;
  reportType?: 'Balance Sheet' | 'Profit and Loss';
  isFrozen?: boolean;
  createdOn?: string;
  isReconciliable?: boolean;
}

interface CompanyConfig {
  name: string;
  abbr: string;
  currency: string;
  fiscalYearStart: string;
  fiscalYearEnd: string;
  templateType: 'indian_gst' | 'us_gaap' | 'manufacturing' | 'retail' | 'clean_slate';
  country: string;
  gstin?: string;
  pan?: string;
  logo?: string;
}

interface JournalEntryRow {
  id: string;
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
  costCenter?: string;
  userRemark?: string;
}

interface JournalEntry {
  id: string;
  timestamp: string;
  postingDate?: string;
  rows: JournalEntryRow[];
  totalDebit: number;
  totalCredit: number;
  memo: string;
  voucherType: 'Journal Entry' | 'Payment Entry' | 'Purchase Invoice' | 'Sales Invoice';
  status: 'Submitted' | 'Draft' | 'Cancelled';
}

// ──────────────────────────────────────────────
// ERPNext-style Full Account Trees
// ──────────────────────────────────────────────
const INDIAN_GST_COA: AccountItem[] = [
  // ─── ASSETS ───
  { id: 'assets', code: '1000', name: 'Application of Funds (Assets)', rootType: 'Asset', accountType: 'Other', isGroup: true, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },

  { id: 'current_assets', parentId: 'assets', code: '1100', name: 'Current Assets', rootType: 'Asset', accountType: 'Other', isGroup: true, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },
  { id: 'cash_bank', parentId: 'current_assets', code: '1110', name: 'Cash and Cash Equivalents', rootType: 'Asset', accountType: 'Other', isGroup: true, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },
  { id: 'hdfc_bank', parentId: 'cash_bank', code: '1111', name: 'HDFC Bank - Current Account', rootType: 'Asset', accountType: 'Bank', isGroup: false, balance: 0, currency: 'INR', reportType: 'Balance Sheet', isReconciliable: true },
  { id: 'sbi_bank', parentId: 'cash_bank', code: '1112', name: 'SBI Bank - OD Account', rootType: 'Asset', accountType: 'Bank', isGroup: false, balance: 0, currency: 'INR', reportType: 'Balance Sheet', isReconciliable: true },
  { id: 'petty_cash', parentId: 'cash_bank', code: '1113', name: 'Petty Cash', rootType: 'Asset', accountType: 'Cash', isGroup: false, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },
  { id: 'acc_receivable', parentId: 'current_assets', code: '1120', name: 'Accounts Receivable', rootType: 'Asset', accountType: 'Receivable', isGroup: false, balance: 0, currency: 'INR', reportType: 'Balance Sheet', isReconciliable: true },
  { id: 'advance_tax', parentId: 'current_assets', code: '1130', name: 'Advance Tax & TDS Receivable', rootType: 'Asset', accountType: 'Tax', isGroup: false, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },
  { id: 'gst_input', parentId: 'current_assets', code: '1140', name: 'GST Input Credit', rootType: 'Asset', accountType: 'Tax', isGroup: true, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },
  { id: 'cgst_input', parentId: 'gst_input', code: '1141', name: 'CGST Input - 9%', rootType: 'Asset', accountType: 'Tax', isGroup: false, balance: 0, currency: 'INR', taxRate: 9, reportType: 'Balance Sheet' },
  { id: 'sgst_input', parentId: 'gst_input', code: '1142', name: 'SGST Input - 9%', rootType: 'Asset', accountType: 'Tax', isGroup: false, balance: 0, currency: 'INR', taxRate: 9, reportType: 'Balance Sheet' },
  { id: 'igst_input', parentId: 'gst_input', code: '1143', name: 'IGST Input - 18%', rootType: 'Asset', accountType: 'Tax', isGroup: false, balance: 0, currency: 'INR', taxRate: 18, reportType: 'Balance Sheet' },
  { id: 'inventory', parentId: 'current_assets', code: '1150', name: 'Inventories', rootType: 'Asset', accountType: 'Stock', isGroup: true, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },
  { id: 'raw_material', parentId: 'inventory', code: '1151', name: 'Raw Material Stock', rootType: 'Asset', accountType: 'Stock', isGroup: false, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },
  { id: 'wip', parentId: 'inventory', code: '1152', name: 'Work In Progress', rootType: 'Asset', accountType: 'Stock', isGroup: false, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },
  { id: 'finished_goods', parentId: 'inventory', code: '1153', name: 'Finished Goods Stock', rootType: 'Asset', accountType: 'Stock', isGroup: false, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },
  { id: 'prepaid_exp', parentId: 'current_assets', code: '1160', name: 'Prepaid Expenses', rootType: 'Asset', accountType: 'Other', isGroup: false, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },

  { id: 'fixed_assets', parentId: 'assets', code: '1200', name: 'Fixed Assets', rootType: 'Asset', accountType: 'Fixed Asset', isGroup: true, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },
  { id: 'plant_mach', parentId: 'fixed_assets', code: '1210', name: 'Plant & Machinery', rootType: 'Asset', accountType: 'Fixed Asset', isGroup: false, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },
  { id: 'acc_dep_pm', parentId: 'fixed_assets', code: '1211', name: 'Accumulated Depreciation - P&M', rootType: 'Asset', accountType: 'Accumulated Depreciation', isGroup: false, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },
  { id: 'furniture', parentId: 'fixed_assets', code: '1220', name: 'Furniture & Fixtures', rootType: 'Asset', accountType: 'Fixed Asset', isGroup: false, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },
  { id: 'computers', parentId: 'fixed_assets', code: '1230', name: 'Computer & Peripherals', rootType: 'Asset', accountType: 'Fixed Asset', isGroup: false, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },
  { id: 'vehicles', parentId: 'fixed_assets', code: '1240', name: 'Vehicles', rootType: 'Asset', accountType: 'Fixed Asset', isGroup: false, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },
  { id: 'acc_dep_v', parentId: 'fixed_assets', code: '1241', name: 'Accumulated Depreciation - Vehicles', rootType: 'Asset', accountType: 'Accumulated Depreciation', isGroup: false, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },

  { id: 'investments_grp', parentId: 'assets', code: '1300', name: 'Investments', rootType: 'Asset', accountType: 'Investments', isGroup: true, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },
  { id: 'fd_investments', parentId: 'investments_grp', code: '1310', name: 'Fixed Deposits', rootType: 'Asset', accountType: 'Investments', isGroup: false, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },

  // ─── LIABILITIES ───
  { id: 'liabilities', code: '2000', name: 'Sources of Funds (Liabilities)', rootType: 'Liability', accountType: 'Other', isGroup: true, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },

  { id: 'current_liab', parentId: 'liabilities', code: '2100', name: 'Current Liabilities', rootType: 'Liability', accountType: 'Other', isGroup: true, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },
  { id: 'acc_payable', parentId: 'current_liab', code: '2110', name: 'Accounts Payable', rootType: 'Liability', accountType: 'Payable', isGroup: false, balance: 0, currency: 'INR', reportType: 'Balance Sheet', isReconciliable: true },
  { id: 'gst_output', parentId: 'current_liab', code: '2120', name: 'GST Output Payable', rootType: 'Liability', accountType: 'Tax', isGroup: true, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },
  { id: 'cgst_output', parentId: 'gst_output', code: '2121', name: 'CGST Output - 9%', rootType: 'Liability', accountType: 'Tax', isGroup: false, balance: 0, currency: 'INR', taxRate: 9, reportType: 'Balance Sheet' },
  { id: 'sgst_output', parentId: 'gst_output', code: '2122', name: 'SGST Output - 9%', rootType: 'Liability', accountType: 'Tax', isGroup: false, balance: 0, currency: 'INR', taxRate: 9, reportType: 'Balance Sheet' },
  { id: 'igst_output', parentId: 'gst_output', code: '2123', name: 'IGST Output - 18%', rootType: 'Liability', accountType: 'Tax', isGroup: false, balance: 0, currency: 'INR', taxRate: 18, reportType: 'Balance Sheet' },
  { id: 'tds_payable', parentId: 'current_liab', code: '2130', name: 'TDS Payable', rootType: 'Liability', accountType: 'Tax', isGroup: false, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },
  { id: 'salary_payable', parentId: 'current_liab', code: '2140', name: 'Salary & Wages Payable', rootType: 'Liability', accountType: 'Payroll Payable', isGroup: false, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },
  { id: 'advances_received', parentId: 'current_liab', code: '2150', name: 'Customer Advances Received', rootType: 'Liability', accountType: 'Payable', isGroup: false, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },

  { id: 'long_term_liab', parentId: 'liabilities', code: '2200', name: 'Long-Term Liabilities', rootType: 'Liability', accountType: 'Other', isGroup: true, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },
  { id: 'bank_loan', parentId: 'long_term_liab', code: '2210', name: 'Term Loan - HDFC Bank', rootType: 'Liability', accountType: 'Loans (Liability)', isGroup: false, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },
  { id: 'vehicle_loan', parentId: 'long_term_liab', code: '2220', name: 'Vehicle Loan - Kotak Finance', rootType: 'Liability', accountType: 'Loans (Liability)', isGroup: false, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },

  // ─── EQUITY ───
  { id: 'equity', code: '3000', name: 'Equity and Capital Accounts', rootType: 'Equity', accountType: 'Other', isGroup: true, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },
  { id: 'share_capital', parentId: 'equity', code: '3100', name: 'Share Capital', rootType: 'Equity', accountType: 'Capital Stock', isGroup: false, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },
  { id: 'reserves', parentId: 'equity', code: '3200', name: 'Reserves and Surplus', rootType: 'Equity', accountType: 'Retained Earnings', isGroup: true, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },
  { id: 'general_reserve', parentId: 'reserves', code: '3210', name: 'General Reserve', rootType: 'Equity', accountType: 'Retained Earnings', isGroup: false, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },
  { id: 'retained_earnings', parentId: 'reserves', code: '3220', name: 'Retained Earnings (P&L)', rootType: 'Equity', accountType: 'Retained Earnings', isGroup: false, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },
  { id: 'partners_cap', parentId: 'equity', code: '3300', name: 'Partners Capital Account', rootType: 'Equity', accountType: 'Capital Stock', isGroup: false, balance: 0, currency: 'INR', reportType: 'Balance Sheet' },

  // ─── INCOME ───
  { id: 'income', code: '4000', name: 'Income', rootType: 'Income', accountType: 'Direct Income', isGroup: true, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },
  { id: 'direct_income', parentId: 'income', code: '4100', name: 'Direct Income', rootType: 'Income', accountType: 'Direct Income', isGroup: true, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },
  { id: 'sales_textile', parentId: 'direct_income', code: '4110', name: 'Sales - Textile Products', rootType: 'Income', accountType: 'Direct Income', isGroup: false, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },
  { id: 'sales_export', parentId: 'direct_income', code: '4120', name: 'Export Sales', rootType: 'Income', accountType: 'Direct Income', isGroup: false, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },
  { id: 'service_income', parentId: 'direct_income', code: '4130', name: 'Job Work & Service Income', rootType: 'Income', accountType: 'Direct Income', isGroup: false, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },
  { id: 'sales_return', parentId: 'direct_income', code: '4140', name: 'Sales Returns (Contra)', rootType: 'Income', accountType: 'Direct Income', isGroup: false, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },

  { id: 'indirect_income', parentId: 'income', code: '4200', name: 'Indirect Income', rootType: 'Income', accountType: 'Indirect Income', isGroup: true, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },
  { id: 'interest_income', parentId: 'indirect_income', code: '4210', name: 'Interest Received on FD', rootType: 'Income', accountType: 'Indirect Income', isGroup: false, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },
  { id: 'discount_received', parentId: 'indirect_income', code: '4220', name: 'Discount Received from Suppliers', rootType: 'Income', accountType: 'Indirect Income', isGroup: false, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },
  { id: 'misc_income', parentId: 'indirect_income', code: '4230', name: 'Miscellaneous Income', rootType: 'Income', accountType: 'Indirect Income', isGroup: false, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },

  // ─── EXPENSES ───
  { id: 'expenses', code: '5000', name: 'Expenses', rootType: 'Expense', accountType: 'Direct Expense', isGroup: true, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },

  { id: 'direct_exp', parentId: 'expenses', code: '5100', name: 'Direct Expenses (COGS)', rootType: 'Expense', accountType: 'Cost of Goods Sold', isGroup: true, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },
  { id: 'raw_mat_cons', parentId: 'direct_exp', code: '5110', name: 'Raw Material Consumption', rootType: 'Expense', accountType: 'Cost of Goods Sold', isGroup: false, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },
  { id: 'direct_wages', parentId: 'direct_exp', code: '5120', name: 'Direct Labour & Wages', rootType: 'Expense', accountType: 'Direct Expense', isGroup: false, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },
  { id: 'jobwork_exp', parentId: 'direct_exp', code: '5130', name: 'Job Work Charges Paid', rootType: 'Expense', accountType: 'Direct Expense', isGroup: false, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },
  { id: 'freight_in', parentId: 'direct_exp', code: '5140', name: 'Freight Inward', rootType: 'Expense', accountType: 'Direct Expense', isGroup: false, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },
  { id: 'factory_power', parentId: 'direct_exp', code: '5150', name: 'Factory Power & Water', rootType: 'Expense', accountType: 'Direct Expense', isGroup: false, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },

  { id: 'indirect_exp', parentId: 'expenses', code: '5200', name: 'Indirect Expenses', rootType: 'Expense', accountType: 'Indirect Expense', isGroup: true, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },
  { id: 'salaries_adm', parentId: 'indirect_exp', code: '5210', name: 'Salaries - Administrative', rootType: 'Expense', accountType: 'Indirect Expense', isGroup: false, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },
  { id: 'office_rent', parentId: 'indirect_exp', code: '5220', name: 'Office Rent & Utilities', rootType: 'Expense', accountType: 'Indirect Expense', isGroup: false, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },
  { id: 'depreciation', parentId: 'indirect_exp', code: '5230', name: 'Depreciation (Annual)', rootType: 'Expense', accountType: 'Depreciation', isGroup: false, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },
  { id: 'bank_charges', parentId: 'indirect_exp', code: '5240', name: 'Bank Charges & Interest', rootType: 'Expense', accountType: 'Indirect Expense', isGroup: false, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },
  { id: 'travel_exp', parentId: 'indirect_exp', code: '5250', name: 'Travel & Conveyance', rootType: 'Expense', accountType: 'Indirect Expense', isGroup: false, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },
  { id: 'professional_fees', parentId: 'indirect_exp', code: '5260', name: 'Professional & Legal Fees', rootType: 'Expense', accountType: 'Indirect Expense', isGroup: false, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },
  { id: 'selling_dist', parentId: 'indirect_exp', code: '5270', name: 'Selling & Distribution Exp', rootType: 'Expense', accountType: 'Indirect Expense', isGroup: true, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },
  { id: 'freight_out', parentId: 'selling_dist', code: '5271', name: 'Freight Outward', rootType: 'Expense', accountType: 'Indirect Expense', isGroup: false, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },
  { id: 'commission_sales', parentId: 'selling_dist', code: '5272', name: 'Sales Commission', rootType: 'Expense', accountType: 'Indirect Expense', isGroup: false, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },
  { id: 'advertisement', parentId: 'selling_dist', code: '5273', name: 'Advertisement & Branding', rootType: 'Expense', accountType: 'Indirect Expense', isGroup: false, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },
  { id: 'other_exp', parentId: 'indirect_exp', code: '5280', name: 'Other Miscellaneous Expenses', rootType: 'Expense', accountType: 'Indirect Expense', isGroup: false, balance: 0, currency: 'INR', reportType: 'Profit and Loss' },
];

const DEFAULT_COMPANY: CompanyConfig = {
  name: 'Prestige Textiles Pvt. Ltd.',
  abbr: 'PTPL',
  currency: 'INR',
  fiscalYearStart: '2026-04-01',
  fiscalYearEnd: '2027-03-31',
  templateType: 'indian_gst',
  country: 'India',
  gstin: '27AABCP1234Q1ZA',
  pan: 'AABCP1234Q',
};

const ACCOUNT_ROOT_TYPES: AccountRootType[] = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];
const ACCOUNT_SUB_TYPES: string[] = [
  'Bank', 'Cash', 'Stock', 'Tax', 'Receivable', 'Payable',
  'Fixed Asset', 'Accumulated Depreciation', 'Investments',
  'Loans (Liability)', 'Capital Stock', 'Retained Earnings',
  'Direct Income', 'Indirect Income', 'Direct Expense', 'Indirect Expense',
  'Cost of Goods Sold', 'Depreciation', 'Payroll Payable', 'Other'
];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'CAD', 'JPY'];

const ROOT_TYPE_COLORS: Record<AccountRootType, { bg: string; text: string; badge: string; accent: string; icon: React.FC<any> }> = {
  Asset:     { bg: 'bg-blue-50 dark:bg-blue-950/20',    text: 'text-blue-700 dark:text-blue-300',   badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',   accent: '#3b82f6', icon: Wallet },
  Liability: { bg: 'bg-orange-50 dark:bg-orange-950/20', text: 'text-orange-700 dark:text-orange-300', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', accent: '#f97316', icon: CreditCard },
  Equity:    { bg: 'bg-purple-50 dark:bg-purple-950/20', text: 'text-purple-700 dark:text-purple-300', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', accent: '#a855f7', icon: Shield },
  Income:    { bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-300', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', accent: '#10b981', icon: TrendingUp },
  Expense:   { bg: 'bg-rose-50 dark:bg-rose-950/20',    text: 'text-rose-700 dark:text-rose-300',   badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',   accent: '#f43f5e', icon: TrendingDown },
};

const VOUCHER_TYPES = ['Journal Entry', 'Payment Entry', 'Purchase Invoice', 'Sales Invoice'] as const;

// ──────────────────────────────────────────────
// Utility helpers
// ──────────────────────────────────────────────
function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getAccountIcon(acc: AccountItem): React.ReactNode {
  if (acc.isGroup) return <FolderOpen className="w-3.5 h-3.5 shrink-0 text-amber-500" />;
  const t = acc.accountType;
  if (t === 'Bank') return <Landmark className="w-3.5 h-3.5 shrink-0 text-sky-500" />;
  if (t === 'Cash') return <DollarSign className="w-3.5 h-3.5 shrink-0 text-emerald-500" />;
  if (t === 'Stock') return <Package className="w-3.5 h-3.5 shrink-0 text-amber-500" />;
  if (t === 'Tax') return <Percent className="w-3.5 h-3.5 shrink-0 text-violet-500" />;
  if (t === 'Receivable') return <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-blue-500" />;
  if (t === 'Payable') return <ArrowDownLeft className="w-3.5 h-3.5 shrink-0 text-orange-500" />;
  if (t === 'Fixed Asset') return <Briefcase className="w-3.5 h-3.5 shrink-0 text-indigo-500" />;
  return <BookOpen className="w-3.5 h-3.5 shrink-0 text-slate-400" />;
}

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────
const ChartOfAccounts: React.FC = () => {
  const { confirm, ConfirmModal } = useConfirm();
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig>(DEFAULT_COMPANY);
  const [accounts, setAccounts] = useState<AccountItem[]>(INDIAN_GST_COA);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from indexedDB on mount
  useEffect(() => {
    (async () => {
      try {
        const [savedCompany, savedAccounts, savedJournals] = await Promise.all([
          getItem<CompanyConfig>('coa_company_v2'),
          getItem<AccountItem[]>('coa_accounts_v2'),
          getItem<JournalEntry[]>('coa_journals_v2'),
        ]);
        if (savedCompany) setCompanyConfig(savedCompany);
        if (savedAccounts && savedAccounts.length > 0) setAccounts(savedAccounts);
        if (savedJournals) setJournalEntries(savedJournals);
      } catch (e) {
        console.error('[CoA] Failed to load from storage:', e);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  // UI state
  const [selectedId, setSelectedId] = useState<string>('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>(() => {
    const ex: Record<string, boolean> = {};
    INDIAN_GST_COA.filter(a => !a.parentId).forEach(r => (ex[r.id] = true));
    return ex;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRightTab, setActiveRightTab] = useState<'ledger' | 'journal' | 'import' | 'summary'>('ledger');
  const [filterRootType, setFilterRootType] = useState<AccountRootType | 'All'>('All');
  const [showDisabled, setShowDisabled] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree');

  // Journal form (ERPNext style)
  const [jRows, setJRows] = useState<JournalEntryRow[]>([
    { id: '1', accountId: '', accountName: '', debit: 0, credit: 0, costCenter: '', userRemark: '' },
    { id: '2', accountId: '', accountName: '', debit: 0, credit: 0, costCenter: '', userRemark: '' },
  ]);
  const [jPostingDate, setJPostingDate] = useState(new Date().toISOString().split('T')[0]);
  const [jMemo, setJMemo] = useState('');
  const [jVoucherType, setJVoucherType] = useState<typeof VOUCHER_TYPES[number]>('Journal Entry');

  // Add account form
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newParentId, setNewParentId] = useState('');
  const [newRootType, setNewRootType] = useState<AccountRootType>('Asset');
  const [newAccountType, setNewAccountType] = useState<string>('Other');
  const [newIsGroup, setNewIsGroup] = useState(false);
  const [newBalance, setNewBalance] = useState('0');
  const [newCurrency, setNewCurrency] = useState('INR');

  // Persist to indexedDB (skip until initial load is complete to avoid overwriting with defaults)
  useEffect(() => { if (isLoaded) setItem('coa_company_v2', companyConfig); }, [companyConfig, isLoaded]);
  useEffect(() => { if (isLoaded) setItem('coa_accounts_v2', accounts); }, [accounts, isLoaded]);
  useEffect(() => { if (isLoaded) setItem('coa_journals_v2', journalEntries); }, [journalEntries, isLoaded]);

  // Computed balances (rollup)
  const computedBalances = useMemo(() => {
    const map: Record<string, number> = {};
    accounts.forEach(a => { map[a.id] = a.isGroup ? 0 : (a.balance || 0); });
    const sum = (id: string): number => {
      const a = accounts.find(x => x.id === id);
      if (!a) return 0;
      if (!a.isGroup) return a.balance || 0;
      const ch = accounts.filter(x => x.parentId === id);
      const total = ch.reduce((s, c) => s + sum(c.id), 0);
      map[id] = total;
      return total;
    };
    accounts.filter(a => !a.parentId).forEach(r => sum(r.id));
    return map;
  }, [accounts]);

  // Trial balance
  const trialBalance = useMemo(() => {
    const totalAssets = computedBalances['assets'] || 0;
    const totalLiab = computedBalances['liabilities'] || 0;
    const totalEquity = computedBalances['equity'] || 0;
    const totalIncome = computedBalances['income'] || 0;
    const totalExpenses = computedBalances['expenses'] || 0;
    const debits = totalAssets + totalExpenses;
    const credits = totalLiab + totalEquity + totalIncome;
    return {
      assets: totalAssets, liabilities: totalLiab, equity: totalEquity,
      income: totalIncome, expenses: totalExpenses,
      debits, credits, diff: Math.abs(debits - credits),
      isBalanced: Math.abs(debits - credits) < 1,
    };
  }, [computedBalances]);

  // Search filtering
  const matchedIds = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    const matched = new Set<string>();
    accounts.forEach(a => {
      if (a.name?.toLowerCase()?.includes(q) || a.code.includes(q) || a.accountType?.toLowerCase()?.includes(q) || a.rootType?.toLowerCase()?.includes(q)) {
        matched.add(a.id);
        let parent = accounts.find(p => p.id === a.parentId);
        while (parent) { matched.add(parent.id); parent = accounts.find(p => p.id === parent?.parentId); }
      }
    });
    return matched;
  }, [accounts, searchQuery]);

  const selectedAccount = useMemo(() => accounts.find(a => a.id === selectedId), [accounts, selectedId]);

  const toggleNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(p => ({ ...p, [id]: !p[id] }));
  };

  const expandAll = () => {
    const ex: Record<string, boolean> = {};
    accounts.filter(a => a.isGroup).forEach(a => (ex[a.id] = true));
    setExpandedNodes(ex);
  };

  const handleUpdateAccount = (updated: AccountItem) => {
    setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a));
  };

  const handleDeleteAccount = async (id: string) => {
    if (accounts.some(a => a.parentId === id)) {
      toast.error('Cannot delete a group account that has child accounts. Move or delete children first.');
      return;
    }
    const ok = await confirm({ title: 'Delete ledger account?', message: 'This action cannot be undone.' });
    if (ok) {
      setAccounts(prev => prev.filter(a => a.id !== id));
      setSelectedId('');
    }
  };

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCode.trim()) { toast.error('Name and Code are required.'); return; }
    if (accounts.some(a => a.code === newCode.trim())) { toast.error('Account code already exists.'); return; }
    const id = 'acc_' + Date.now();
    const parent = accounts.find(a => a.id === newParentId);
    const item: AccountItem = {
      id, parentId: newParentId || undefined,
      code: newCode.trim(), name: newName.trim(),
      rootType: parent?.rootType || newRootType,
      accountType: newAccountType,
      isGroup: newIsGroup,
      balance: newIsGroup ? 0 : parseFloat(newBalance) || 0,
      currency: newCurrency,
      reportType: ['Asset', 'Liability', 'Equity'].includes(newRootType) ? 'Balance Sheet' : 'Profit and Loss',
      createdOn: new Date().toISOString().substring(0, 10),
    };
    setAccounts(prev => [...prev, item]);
    setSelectedId(id);
    if (newParentId) setExpandedNodes(p => ({ ...p, [newParentId]: true }));
    setShowAddModal(false);
    setNewName(''); setNewCode(''); setNewBalance('0');
  };

  const handlePostJournal = () => {
    const validRows = jRows.filter(r => r.accountId && (r.debit > 0 || r.credit > 0));
    if (validRows.length < 2) { toast.error('Journal Entry must have at least two valid rows.'); return; }
    
    // Ensure total debit == total credit
    const totalDebit = validRows.reduce((sum, r) => sum + r.debit, 0);
    const totalCredit = validRows.reduce((sum, r) => sum + r.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) { 
      toast.error(`Debit and Credit amounts must balance! Difference: ₹${Math.abs(totalDebit - totalCredit).toFixed(2)}`); 
      return; 
    }

    setAccounts(prev => {
      const next = [...prev];
      validRows.forEach(row => {
        const idx = next.findIndex(a => a.id === row.accountId);
        if (idx !== -1) {
          const acc = { ...next[idx] };
          const isDebitNormal = ['Asset', 'Expense'].includes(acc.rootType);
          const isCreditNormal = ['Liability', 'Equity', 'Income'].includes(acc.rootType);
          
          if (row.debit > 0) acc.balance = (acc.balance || 0) + (isDebitNormal ? row.debit : -row.debit);
          if (row.credit > 0) acc.balance = (acc.balance || 0) + (isCreditNormal ? row.credit : -row.credit);
          next[idx] = acc;
        }
      });
      return next;
    });

    const entry: JournalEntry = {
      id: `JV-${Date.now()}`,
      timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }),
      postingDate: jPostingDate,
      rows: validRows.map(r => ({ ...r, accountName: accounts.find(a => a.id === r.accountId)?.name || 'Unknown' })),
      totalDebit,
      totalCredit,
      memo: jMemo || 'Manual journal entry',
      voucherType: jVoucherType, status: 'Submitted',
    };
    
    setJournalEntries(prev => [entry, ...prev]);
    setJRows([
      { id: Date.now().toString(), accountId: '', accountName: '', debit: 0, credit: 0, costCenter: '', userRemark: '' },
      { id: (Date.now() + 1).toString(), accountId: '', accountName: '', debit: 0, credit: 0, costCenter: '', userRemark: '' }
    ]);
    setJMemo('');
  };

  const handleExportJSON = () => {
    const data = { company: companyConfig, accounts, journals: journalEntries, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `${companyConfig.abbr}_chart_of_accounts.json`; a.click();
  };

  // ──────────────────────────────────────────────
  // Tree node renderer
  // ──────────────────────────────────────────────
  const renderNode = useCallback((nodeId: string, depth = 0): React.ReactNode => {
    const node = accounts.find(a => a.id === nodeId);
    if (!node) return null;
    if (!showDisabled && node.disabled) return null;
    if (filterRootType !== 'All' && node.rootType !== filterRootType && !node.isGroup) return null;

    const children = accounts.filter(a => a.parentId === nodeId);
    const isExpanded = !!expandedNodes[nodeId];
    const isSelected = selectedId === nodeId;
    const isHighlighted = matchedIds ? matchedIds.has(nodeId) : true;
    const isExactMatch = searchQuery && (node.name?.toLowerCase()?.includes(searchQuery.toLowerCase()) || node.code.includes(searchQuery));

    if (!isHighlighted) return null;

    const rootColor = ROOT_TYPE_COLORS[node.rootType];
    const bal = computedBalances[node.id] || 0;
    const isNegative = bal < 0;

    return (
      <div key={nodeId}>
        <div
          onClick={() => setSelectedId(nodeId)}
          className={`group flex items-center justify-between py-1.5 px-2 my-0.5 rounded-lg cursor-pointer transition-all select-none ${
            isSelected
              ? 'bg-indigo-600 text-white shadow-md'
              : isExactMatch
                ? 'bg-yellow-50 dark:bg-yellow-950/30 ring-1 ring-yellow-400 text-slate-800 dark:text-slate-200'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Expand toggle */}
            <span
              onClick={e => node.isGroup ? toggleNode(nodeId, e) : e.stopPropagation()}
              className="w-4 h-4 flex items-center justify-center shrink-0"
            >
              {node.isGroup ? (
                isExpanded
                  ? <ChevronDown className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                  : <ChevronRight className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
              ) : (
                <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-indigo-200' : 'bg-slate-300'}`} />
              )}
            </span>

            {/* Account icon */}
            <span className={isSelected ? '[&_svg]:text-white' : ''}>
              {getAccountIcon(node)}
            </span>

            {/* Code + name */}
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className={`font-mono text-[10px] font-bold shrink-0 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                {node.code}
              </span>
              <span className={`text-xs truncate ${node.isGroup ? 'font-semibold' : 'font-medium'} ${node.disabled ? 'line-through opacity-60' : ''}`}>
                {node.name}
              </span>
            </div>

            {/* Badges */}
            {node.isFrozen && <Lock className={`w-3 h-3 shrink-0 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`} />}
            {node.isReconciliable && !isSelected && <span className="text-[9px] bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 px-1 rounded font-bold shrink-0">RECON</span>}
          </div>

          {/* Balance */}
          <span className={`text-[11px] font-mono font-bold shrink-0 ml-2 ${
            isSelected ? 'text-white' : isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'
          }`}>
            {formatCurrency(bal, node.currency)}
          </span>
        </div>

        {node.isGroup && isExpanded && children.length > 0 && (
          <div className="ml-3 border-l border-slate-200 dark:border-slate-700/50 pl-0">
            {children.map(c => renderNode(c.id, depth + 1))}
          </div>
        )}
      </div>
    );
  }, [accounts, expandedNodes, selectedId, matchedIds, searchQuery, computedBalances, showDisabled, filterRootType]);

  // ──────────────────────────────────────────────
  // Summary stats
  // ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const leafAccounts = accounts.filter(a => !a.isGroup);
    return {
      total: accounts.length,
      groups: accounts.filter(a => a.isGroup).length,
      leaves: leafAccounts.length,
      banks: leafAccounts.filter(a => a.accountType === 'Bank').length,
      taxAccounts: leafAccounts.filter(a => a.accountType === 'Tax').length,
    };
  }, [accounts]);

  const leafAccounts = useMemo(() => accounts.filter(a => !a.isGroup), [accounts]);

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
          <Database className="w-8 h-8 animate-pulse" />
          <span className="text-sm">Loading Chart of Accounts…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950 font-sans antialiased absolute inset-0 overflow-hidden">
      <ConfirmModal />

      {/* ── Top Header ── */}
      <div className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-3 z-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 bg-indigo-600 rounded-lg shadow">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                  Chart of Accounts
                </h1>
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded">
                  {companyConfig.name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                  FY {companyConfig.fiscalYearStart.substring(0, 4)}–{companyConfig.fiscalYearEnd.substring(2, 4)}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                {companyConfig.gstin && (
                  <span className="text-[10px] font-mono text-slate-400">GSTIN: {companyConfig.gstin}</span>
                )}
                <span className="text-[10px] text-slate-400">{stats.total} accounts · {stats.banks} banks · {stats.taxAccounts} tax ledgers</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* View toggle */}
            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <button onClick={() => setViewMode('tree')} className={`px-2.5 py-1.5 text-[10px] font-bold uppercase flex items-center gap-1 transition-colors ${viewMode === 'tree' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                <List className="w-3 h-3" /> Tree
              </button>
              <button onClick={() => setViewMode('flat')} className={`px-2.5 py-1.5 text-[10px] font-bold uppercase flex items-center gap-1 transition-colors ${viewMode === 'flat' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                <Grid3x3 className="w-3 h-3" /> Flat
              </button>
            </div>
            <button onClick={expandAll} className="px-2.5 py-1.5 text-[10px] font-bold uppercase text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700">
              Expand All
            </button>
            <button onClick={() => setExpandedNodes({})} className="px-2.5 py-1.5 text-[10px] font-bold uppercase text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700">
              Collapse
            </button>
            <button onClick={handleExportJSON} className="px-3 py-1.5 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 flex items-center gap-1">
              <Download className="w-3 h-3" /> Export
            </button>
            <button
              onClick={() => {
                // Deterministic: find highest existing numeric code and add 10
                const maxCode = accounts
                  .map(a => parseInt(a.code, 10))
                  .filter(n => !isNaN(n))
                  .reduce((m, n) => Math.max(m, n), 1000);
                setNewCode(String(Math.ceil((maxCode + 10) / 10) * 10));
                setShowAddModal(true);
              }}
              className="px-3 py-1.5 text-[10px] font-bold uppercase bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> New Account
            </button>
          </div>
        </div>
      </div>

      {/* ── Trial Balance Summary Bar ── */}
      <div className="flex-none border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-2">
        <div className="flex items-center gap-4 overflow-x-auto pb-0.5">
          {(['assets', 'liabilities', 'equity', 'income', 'expenses'] as const).map(key => {
            const labels: Record<string, string> = { assets: 'Assets', liabilities: 'Liabilities', equity: 'Equity', income: 'Income', expenses: 'Expenses' };
            const colors: Record<string, string> = { assets: 'text-blue-600', liabilities: 'text-orange-600', equity: 'text-purple-600', income: 'text-emerald-600', expenses: 'text-rose-600' };
            const val = trialBalance[key as keyof typeof trialBalance] as number;
            return (
              <div key={key} className="flex items-center gap-2 shrink-0">
                <div>
                  <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">{labels[key]}</div>
                  <div className={`text-sm font-black font-mono ${colors[key]}`}>{formatCurrency(val)}</div>
                </div>
                {key !== 'expenses' && <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1" />}
              </div>
            );
          })}
          <div className="ml-auto shrink-0">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
              trialBalance.isBalanced
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
            }`}>
              {trialBalance.isBalanced ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {trialBalance.isBalanced ? 'Balanced' : `Off by ${formatCurrency(trialBalance.diff)}`}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Body ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* ── Left: Account Tree ── */}
        <div className="flex-1 overflow-hidden flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">

          {/* Search & Filters */}
          <div className="flex-none p-3 border-b border-slate-100 dark:border-slate-800 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search accounts by name, code, or type..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Root type filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <button
                onClick={() => setFilterRootType('All')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase shrink-0 transition-colors ${filterRootType === 'All' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'}`}
              >
                All
              </button>
              {ACCOUNT_ROOT_TYPES.map(rt => {
                const c = ROOT_TYPE_COLORS[rt];
                return (
                  <button
                    key={rt}
                    onClick={() => setFilterRootType(filterRootType === rt ? 'All' : rt)}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase shrink-0 transition-colors ${filterRootType === rt ? 'bg-indigo-600 text-white' : `${c.badge} hover:opacity-80`}`}
                  >
                    {rt}
                  </button>
                );
              })}
              <div className="ml-auto flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setShowDisabled(!showDisabled)}
                  className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded transition-colors ${showDisabled ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {showDisabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  Disabled
                </button>
              </div>
            </div>
          </div>

          {/* Account tree / flat list */}
          <div className="flex-1 overflow-y-auto p-3">
            {viewMode === 'tree' ? (
              accounts.filter(a => !a.parentId).map(root => renderNode(root.id, 0))
            ) : (
              // Flat view: sorted by code
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 px-2 font-bold text-slate-400 uppercase text-[10px]">Code</th>
                    <th className="text-left py-2 px-2 font-bold text-slate-400 uppercase text-[10px]">Name</th>
                    <th className="text-left py-2 px-2 font-bold text-slate-400 uppercase text-[10px]">Type</th>
                    <th className="text-right py-2 px-2 font-bold text-slate-400 uppercase text-[10px]">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {[...accounts]
                    .sort((a, b) => a.code.localeCompare(b.code))
                    .filter(a => matchedIds ? matchedIds.has(a.id) : true)
                    .map(a => (
                      <tr
                        key={a.id}
                        onClick={() => setSelectedId(a.id)}
                        className={`cursor-pointer border-b border-slate-100 dark:border-slate-800 transition-colors ${selectedId === a.id ? 'bg-indigo-50 dark:bg-indigo-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                      >
                        <td className="py-1.5 px-2 font-mono text-slate-400">{a.code}</td>
                        <td className={`py-1.5 px-2 font-medium ${a.isGroup ? 'font-semibold text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>
                          {a.isGroup && <span className="text-[9px] font-black text-slate-400 mr-1">[GRP]</span>}
                          {a.name}
                        </td>
                        <td className="py-1.5 px-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ROOT_TYPE_COLORS[a.rootType].badge}`}>{a.rootType}</span>
                        </td>
                        <td className={`py-1.5 px-2 text-right font-mono ${(computedBalances[a.id] || 0) < 0 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}`}>
                          {formatCurrency(computedBalances[a.id] || 0, a.currency)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Right: Detail Panel ── */}
        <div className="w-[380px] xl:w-[420px] flex-none flex flex-col bg-gray-50 dark:bg-slate-950 overflow-hidden">

          {/* Tabs */}
          <div className="flex-none flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3">
            {([ ['ledger', FileText, 'Ledger'], ['journal', Sliders, 'Journal Entry'], ['import', Upload, 'Import'], ['summary', BarChart2, 'Summary'] ] as const).map(([id, Icon, label]) => (
              <button
                key={id}
                onClick={() => setActiveRightTab(id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-[10px] font-bold uppercase border-b-2 transition-all whitespace-nowrap ${
                  activeRightTab === id
                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Icon className="w-3 h-3" /> {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* ── LEDGER DETAIL TAB ── */}
            {activeRightTab === 'ledger' && (
              selectedAccount ? (
                <div className="space-y-4">
                  {/* Account header card */}
                  <div className={`rounded-xl p-4 border ${ROOT_TYPE_COLORS[selectedAccount.rootType].bg} border-current/10`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${ROOT_TYPE_COLORS[selectedAccount.rootType].badge}`}>
                            {selectedAccount.rootType}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 bg-white/60 dark:bg-slate-800/60 px-2 py-0.5 rounded">
                            {selectedAccount.accountType}
                          </span>
                          {selectedAccount.isGroup && <span className="text-[9px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">GROUP</span>}
                          {selectedAccount.disabled && <span className="text-[9px] font-black text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">DISABLED</span>}
                          {selectedAccount.isFrozen && <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Lock className="w-2.5 h-2.5" /> FROZEN</span>}
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{selectedAccount.name}</h3>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">{selectedAccount.code}</p>
                      </div>
                      {!['assets','liabilities','equity','income','expenses'].includes(selectedAccount.id) && (
                        <button onClick={() => handleDeleteAccount(selectedAccount.id)} className="ml-2 p-1.5 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-colors shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/30 dark:border-slate-700/30">
                      <div className="text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        {selectedAccount.isGroup ? 'Aggregate Balance' : 'Current Balance'}
                      </div>
                      <div className={`text-xl font-black font-mono ${ROOT_TYPE_COLORS[selectedAccount.rootType].text}`}>
                        {formatCurrency(computedBalances[selectedAccount.id] || 0, selectedAccount.currency)}
                      </div>
                      {selectedAccount.reportType && (
                        <div className="text-[10px] text-slate-400 mt-0.5">Reported in: {selectedAccount.reportType}</div>
                      )}
                    </div>
                  </div>

                  {/* Edit fields */}
                  <div className="space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Account Properties</h4>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Account Code</label>
                        <input type="text" value={selectedAccount.code} onChange={e => handleUpdateAccount({ ...selectedAccount, code: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 font-mono" />
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Currency</label>
                        <select value={selectedAccount.currency} onChange={e => handleUpdateAccount({ ...selectedAccount, currency: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500">
                          {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Account Name</label>
                      <input type="text" value={selectedAccount.name} onChange={e => handleUpdateAccount({ ...selectedAccount, name: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 font-medium" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Root Type</label>
                        <select value={selectedAccount.rootType} onChange={e => handleUpdateAccount({ ...selectedAccount, rootType: e.target.value as AccountRootType })}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500">
                          {ACCOUNT_ROOT_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Account Type</label>
                        <select value={selectedAccount.accountType} onChange={e => handleUpdateAccount({ ...selectedAccount, accountType: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500">
                          {ACCOUNT_SUB_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>

                    {!selectedAccount.isGroup && (
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Opening Balance</label>
                        <input type="number" value={selectedAccount.balance}
                          onChange={e => handleUpdateAccount({ ...selectedAccount, balance: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 font-mono" />
                      </div>
                    )}

                    {selectedAccount.accountType === 'Tax' && (
                      <div>
                        <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Tax Rate (%)</label>
                        <input type="number" value={selectedAccount.taxRate || 0}
                          onChange={e => handleUpdateAccount({ ...selectedAccount, taxRate: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 font-mono" />
                      </div>
                    )}

                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Parent Account</label>
                      <select value={selectedAccount.parentId || ''} onChange={e => handleUpdateAccount({ ...selectedAccount, parentId: e.target.value || undefined })}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500">
                        <option value="">-- No Parent (Root) --</option>
                        {accounts.filter(a => a.isGroup && a.id !== selectedAccount.id).map(g => (
                          <option key={g.id} value={g.id}>{g.code} - {g.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!selectedAccount.disabled} onChange={e => handleUpdateAccount({ ...selectedAccount, disabled: e.target.checked })}
                          className="w-3.5 h-3.5 accent-indigo-600" />
                        <span className="text-xs text-slate-600 dark:text-slate-400">Disabled</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!selectedAccount.isFrozen} onChange={e => handleUpdateAccount({ ...selectedAccount, isFrozen: e.target.checked })}
                          className="w-3.5 h-3.5 accent-indigo-600" />
                        <span className="text-xs text-slate-600 dark:text-slate-400">Frozen</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!!selectedAccount.isReconciliable} onChange={e => handleUpdateAccount({ ...selectedAccount, isReconciliable: e.target.checked })}
                          className="w-3.5 h-3.5 accent-indigo-600" />
                        <span className="text-xs text-slate-600 dark:text-slate-400">Reconciliable</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={selectedAccount.isGroup} onChange={e => handleUpdateAccount({ ...selectedAccount, isGroup: e.target.checked })}
                          className="w-3.5 h-3.5 accent-indigo-600" />
                        <span className="text-xs text-slate-600 dark:text-slate-400">Is Group</span>
                      </label>
                    </div>
                  </div>

                  {/* Children summary if group */}
                  {selectedAccount.isGroup && (() => {
                    const children = accounts.filter(a => a.parentId === selectedAccount.id);
                    return children.length > 0 ? (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">Child Accounts ({children.length})</h4>
                        <div className="space-y-1">
                          {children.map(c => (
                            <div key={c.id} onClick={() => setSelectedId(c.id)}
                              className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                              <div className="flex items-center gap-2">
                                {getAccountIcon(c)}
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{c.code} — {c.name}</span>
                              </div>
                              <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400">
                                {formatCurrency(computedBalances[c.id] || 0, c.currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-400">No account selected</p>
                  <p className="text-xs text-slate-400 mt-1">Click on any account in the tree to view and edit details</p>
                </div>
              )
            )}

            {/* ── JOURNAL ENTRY TAB ── */}
            {activeRightTab === 'journal' && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-500" /> New Journal Voucher
                  </h4>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Voucher Type</label>
                      <select value={jVoucherType} onChange={e => setJVoucherType(e.target.value as typeof jVoucherType)}
                        className="w-full px-2.5 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500">
                        {VOUCHER_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Posting Date</label>
                      <input type="date" value={jPostingDate} onChange={e => setJPostingDate(e.target.value)}
                        className="w-full px-2.5 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 font-mono" />
                    </div>
                  </div>
                  
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-950 px-3 py-2 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-black uppercase text-slate-500">Accounting Entries</span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {jRows.map((row, index) => (
                        <div key={row.id} className="p-3 bg-white dark:bg-slate-900 relative">
                           <div className="grid grid-cols-6 gap-2 mb-2">
                             <div className="col-span-3">
                               <label className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">Account</label>
                               <select value={row.accountId} onChange={e => {
                                 const nr = [...jRows]; nr[index].accountId = e.target.value; setJRows(nr);
                               }}
                                 className="w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500">
                                 <option value="">-- Select --</option>
                                 {leafAccounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                               </select>
                             </div>
                             <div className="col-span-3">
                               <label className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">Cost Center (Optional)</label>
                               <input type="text" value={row.costCenter || ''} onChange={e => {
                                 const nr = [...jRows]; nr[index].costCenter = e.target.value; setJRows(nr);
                               }} placeholder="Main"
                                 className="w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500" />
                             </div>
                           </div>
                           <div className="grid grid-cols-6 gap-2 items-center">
                             <div className="col-span-2">
                               <label className="text-[8px] font-black uppercase text-blue-500 block mb-0.5">Debit</label>
                               <input type="number" min="0" step="0.01" value={row.debit || ''} onChange={e => {
                                 const nr = [...jRows]; nr[index].debit = parseFloat(e.target.value) || 0; 
                                 if (nr[index].debit > 0) nr[index].credit = 0;
                                 setJRows(nr);
                               }} placeholder="0.00"
                                 className="w-full px-2 py-1.5 text-xs font-mono border border-blue-200 dark:border-blue-900 rounded bg-blue-50/50 dark:bg-blue-950/30 outline-none focus:ring-1 focus:ring-blue-500" />
                             </div>
                             <div className="col-span-2">
                               <label className="text-[8px] font-black uppercase text-orange-500 block mb-0.5">Credit</label>
                               <input type="number" min="0" step="0.01" value={row.credit || ''} onChange={e => {
                                 const nr = [...jRows]; nr[index].credit = parseFloat(e.target.value) || 0; 
                                 if (nr[index].credit > 0) nr[index].debit = 0;
                                 setJRows(nr);
                               }} placeholder="0.00"
                                 className="w-full px-2 py-1.5 text-xs font-mono border border-orange-200 dark:border-orange-900 rounded bg-orange-50/50 dark:bg-orange-950/30 outline-none focus:ring-1 focus:ring-orange-500" />
                             </div>
                             <div className="col-span-2 flex items-end justify-end">
                               {jRows.length > 2 && (
                                 <button onClick={() => setJRows(jRows.filter(r => r.id !== row.id))} className="text-[10px] text-rose-500 hover:text-rose-600 font-bold uppercase transition-colors">
                                   Remove Row
                                 </button>
                               )}
                             </div>
                           </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 px-3 py-2 border-t border-slate-200 dark:border-slate-800">
                       <button onClick={() => setJRows([...jRows, { id: Date.now().toString(), accountId: '', accountName: '', debit: 0, credit: 0, costCenter: '', userRemark: '' }])}
                         className="text-[10px] font-bold text-indigo-600 uppercase hover:text-indigo-700 transition-colors">
                         + Add Row
                       </button>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                    <span className="text-[10px] font-black uppercase text-slate-500">Totals</span>
                    <div className="flex gap-4 font-mono font-bold text-sm">
                      <span className="text-blue-600 dark:text-blue-400">Dr {formatCurrency(jRows.reduce((s, r) => s + (r.debit||0), 0))}</span>
                      <span className="text-orange-600 dark:text-orange-400">Cr {formatCurrency(jRows.reduce((s, r) => s + (r.credit||0), 0))}</span>
                      <span className={Math.abs(jRows.reduce((s,r)=>s+(r.debit||0),0) - jRows.reduce((s,r)=>s+(r.credit||0),0)) < 0.01 ? "text-emerald-500" : "text-rose-500"}>
                        Diff: {formatCurrency(Math.abs(jRows.reduce((s,r)=>s+(r.debit||0),0) - jRows.reduce((s,r)=>s+(r.credit||0),0)))}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">User Remarks</label>
                    <input type="text" value={jMemo} onChange={e => setJMemo(e.target.value)} placeholder="Describe the transaction..."
                      className="w-full px-2.5 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500" />
                  </div>

                  <button onClick={handlePostJournal}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm mt-2">
                    <Send className="w-3.5 h-3.5" /> Post Journal Entry
                  </button>
                </div>

                {/* Journal history */}
                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">Posted Entries ({journalEntries.length})</h4>
                  <div className="space-y-2">
                    {journalEntries.length === 0 && (
                      <div className="text-center py-8 text-xs text-slate-400 italic">No journal entries posted yet.</div>
                    )}
                    {journalEntries.map(j => (
                      <div key={j.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{j.id}</span>
                            <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase">{j.status}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">{j.timestamp}</div>
                        </div>
                        <div className="space-y-1 text-[11px] mb-2">
                          <table className="w-full">
                            <thead>
                              <tr className="text-[9px] text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                <th className="text-left font-semibold pb-1">Account</th>
                                <th className="text-right font-semibold pb-1">Debit</th>
                                <th className="text-right font-semibold pb-1">Credit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {j.rows.map((r, i) => (
                                <tr key={i} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                                  <td className="py-1">
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">{r.accountName}</span>
                                    {r.costCenter && <span className="ml-1 text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 rounded">{r.costCenter}</span>}
                                  </td>
                                  <td className="py-1 text-right text-blue-600 dark:text-blue-400 font-mono">{r.debit > 0 ? formatCurrency(r.debit) : ''}</td>
                                  <td className="py-1 text-right text-orange-600 dark:text-orange-400 font-mono">{r.credit > 0 ? formatCurrency(r.credit) : ''}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-slate-400 italic truncate max-w-[60%]">{j.memo}</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(j.totalDebit)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── IMPORT TAB ── */}
            {activeRightTab === 'import' && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <h4 className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-3">
                    <Upload className="w-4 h-4 text-emerald-500" /> Bulk CSV / TSV Import
                  </h4>
                  <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                    Paste tab-separated or comma-separated rows from Excel. Columns: <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">Code, Name, RootType, AccountType, IsGroup, ParentCode, OpeningBalance</span>
                  </p>
                  <BulkImporter accounts={accounts} setAccounts={setAccounts} currency={companyConfig.currency} />
                </div>
              </div>
            )}

            {/* ── SUMMARY TAB ── */}
            {activeRightTab === 'summary' && (
              <div className="space-y-4">
                {/* Company info */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3">Company Profile</h4>
                  <div className="space-y-2">
                    {([
                      ['Company', companyConfig.name],
                      ['Abbreviation', companyConfig.abbr],
                      ['Country', companyConfig.country],
                      ['Currency', companyConfig.currency],
                      ['Fiscal Year', `${companyConfig.fiscalYearStart} → ${companyConfig.fiscalYearEnd}`],
                      ['GSTIN', companyConfig.gstin || '—'],
                      ['PAN', companyConfig.pan || '—'],
                    ] as [string, string][]).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">{k}</span>
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 font-mono">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['Total Accounts', stats.total, 'bg-slate-50 dark:bg-slate-800'],
                    ['Groups', stats.groups, 'bg-amber-50 dark:bg-amber-950/20'],
                    ['Leaf Accounts', stats.leaves, 'bg-blue-50 dark:bg-blue-950/20'],
                    ['Bank Accounts', stats.banks, 'bg-emerald-50 dark:bg-emerald-950/20'],
                    ['Tax Ledgers', stats.taxAccounts, 'bg-violet-50 dark:bg-violet-950/20'],
                    ['Journals Posted', journalEntries.length, 'bg-rose-50 dark:bg-rose-950/20'],
                  ] as [string, number, string][]).map(([label, val, bg]) => (
                    <div key={label} className={`${bg} rounded-xl p-3 border border-slate-200/50 dark:border-slate-700/30`}>
                      <div className="text-[10px] font-black uppercase text-slate-400 mb-0.5">{label}</div>
                      <div className="text-lg font-black text-slate-800 dark:text-slate-200">{val}</div>
                    </div>
                  ))}
                </div>

                {/* Balance Sheet summary */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3">Balance Sheet Preview</h4>
                  {ACCOUNT_ROOT_TYPES.map(rt => {
                    const rootAccs = accounts.filter(a => a.rootType === rt && !a.parentId);
                    const total = rootAccs.reduce((s, a) => s + (computedBalances[a.id] || 0), 0);
                    const c = ROOT_TYPE_COLORS[rt];
                    return (
                      <div key={rt} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <div className="flex items-center gap-2">
                          <c.icon className={`w-3.5 h-3.5 ${c.text}`} />
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{rt}</span>
                        </div>
                        <span className={`text-xs font-mono font-bold ${c.text}`}>{formatCurrency(total)}</span>
                      </div>
                    );
                  })}
                  <div className={`flex items-center justify-between mt-2 pt-2 border-t-2 border-slate-200 dark:border-slate-700 ${trialBalance.isBalanced ? 'text-emerald-600' : 'text-rose-600'}`}>
                    <span className="text-xs font-black uppercase">Trial Balance</span>
                    <span className="text-xs font-black">{trialBalance.isBalanced ? '✓ Balanced' : `Diff: ${formatCurrency(trialBalance.diff)}`}</span>
                  </div>
                </div>

                <button onClick={() => { setAccounts(INDIAN_GST_COA); setJournalEntries([]); }}
                  className="w-full py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900/30 flex items-center justify-center gap-1.5 transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" /> Reset to Default COA
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Add Account Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <form onSubmit={handleAddAccount} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add New Account</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Create a new ledger account in your chart</p>
              </div>
              <button type="button" onClick={() => setShowAddModal(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Account Code *</label>
                <input required type="text" value={newCode} onChange={e => setNewCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 font-mono" placeholder="e.g. 5290" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Currency</label>
                <select value={newCurrency} onChange={e => setNewCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500">
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Account Name *</label>
              <input required type="text" value={newName} onChange={e => setNewName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500" placeholder="e.g. Marketing Software Expenses" />
            </div>

            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Parent Account</label>
              <select value={newParentId} onChange={e => {
                setNewParentId(e.target.value);
                const p = accounts.find(a => a.id === e.target.value);
                if (p) { setNewRootType(p.rootType); }
              }}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500">
                <option value="">-- Root Level --</option>
                {accounts.filter(a => a.isGroup).map(g => <option key={g.id} value={g.id}>{g.code} - {g.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Root Type</label>
                <select value={newRootType} onChange={e => setNewRootType(e.target.value as AccountRootType)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500">
                  {ACCOUNT_ROOT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Account Type</label>
                <select value={newAccountType} onChange={e => setNewAccountType(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500">
                  {ACCOUNT_SUB_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newIsGroup} onChange={e => setNewIsGroup(e.target.checked)} className="w-3.5 h-3.5 accent-indigo-600" />
                <span className="text-xs text-slate-600 dark:text-slate-400">Is Group Account</span>
              </label>
              {!newIsGroup && (
                <div className="flex-1">
                  <input type="number" value={newBalance} onChange={e => setNewBalance(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 font-mono" placeholder="Opening balance" />
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 text-xs font-bold text-slate-600 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                Cancel
              </button>
              <button type="submit"
                className="flex-1 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
                Create Account
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────
// Bulk Importer Sub-component
// ──────────────────────────────────────────────
interface BulkImporterProps {
  accounts: AccountItem[];
  setAccounts: React.Dispatch<React.SetStateAction<AccountItem[]>>;
  currency: string;
}

const BulkImporter: React.FC<BulkImporterProps> = ({ accounts, setAccounts, currency }) => {
  const SAMPLE = `# Format: Code\tName\tRootType\tAccountType\tIsGroup\tParentCode\tBalance
5290\tCloud Software Subscriptions\tExpense\tIndirect Expense\tN\t5200\t0
5291\tMobile & Internet Charges\tExpense\tIndirect Expense\tN\t5200\t0
1165\tSecurity Deposit Paid\tAsset\tOther\tN\t1100\t50000
2160\tEmployee Provident Fund Payable\tLiability\tPayroll Payable\tN\t2100\t0`;

  const [text, setText] = useState(SAMPLE);
  const [log, setLog] = useState<{ msg: string; ok: boolean }[]>([]);

  const handleImport = () => {
    const lines = text.split('\n');
    const newItems: AccountItem[] = [];
    const logs: { msg: string; ok: boolean }[] = [];

    lines.forEach((line, i) => {
      const t = line.trim();
      if (!t || t.startsWith('#')) return;
      let cols = t.split('\t');
      if (cols.length < 3) cols = t.split(',');
      if (cols.length < 3) { logs.push({ msg: `Line ${i + 1}: insufficient columns`, ok: false }); return; }

      const [code, name, rootType, accountType, isGroupRaw, parentCode, bal] = cols.map(c => c?.trim());
      if (!code || !name) { logs.push({ msg: `Line ${i + 1}: missing code or name`, ok: false }); return; }
      if (accounts.some(a => a.code === code) || newItems.some(a => a.code === code)) {
        logs.push({ msg: `Line ${i + 1}: code ${code} already exists, skipped`, ok: false }); return;
      }

      const parentAcc = parentCode ? (accounts.find(a => a.code === parentCode) || newItems.find(a => a.code === parentCode)) : undefined;
      const rt = (rootType || 'Asset') as AccountRootType;
      const isGroup = ['y', 'yes', '1', 'true'].includes((isGroupRaw || '').toLowerCase());

      newItems.push({
        id: 'imp_' + Date.now() + '_' + i,
        parentId: parentAcc?.id,
        code, name,
        rootType: rt,
        accountType: accountType || 'Other',
        isGroup,
        balance: parseFloat(bal || '0') || 0,
        currency,
        reportType: ['Asset', 'Liability', 'Equity'].includes(rt) ? 'Balance Sheet' : 'Profit and Loss',
        createdOn: new Date().toISOString().substring(0, 10),
        notes: 'Bulk imported',
      });
      logs.push({ msg: `Line ${i + 1}: imported "${name}" (${code})`, ok: true });
    });

    if (newItems.length > 0) {
      setAccounts(prev => [...prev, ...newItems]);
    }
    setLog(logs);
  };

  return (
    <div className="space-y-3">
      <textarea value={text} onChange={e => setText(e.target.value)}
        className="w-full h-40 p-3 text-[10px] font-mono bg-slate-950 text-emerald-400 rounded-xl border border-slate-800 outline-none resize-none leading-relaxed"
        spellCheck={false} />
      <div className="flex gap-2">
        <button type="button" onClick={() => setText(SAMPLE)}
          className="flex-1 py-1.5 text-[10px] font-bold uppercase text-slate-500 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
          Load Sample
        </button>
        <button type="button" onClick={handleImport}
          className="flex-1 py-1.5 text-[10px] font-bold uppercase bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm">
          Import Rows
        </button>
      </div>
      {log.length > 0 && (
        <div className="max-h-28 overflow-y-auto bg-slate-950 rounded-xl p-3 space-y-0.5">
          {log.map((l, i) => (
            <div key={i} className={`text-[10px] font-mono ${l.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
              {l.ok ? '✓' : '✗'} {l.msg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChartOfAccounts;
