import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, ChevronRight, ChevronDown, BookOpen, FolderOpen, 
  Search, Trash2, Edit2, Save, Download, AlertCircle, CheckCircle, 
  Sliders, RefreshCw, Send, Check, Clock, X, HelpCircle, Building,
  Upload, FileText, Settings, Database, PlusCircle, RotateCcw, AlertTriangle
} from 'lucide-react';

// Single Account Item definition following ERPNext structure
interface AccountItem {
  id: string;
  parentId?: string;
  code: string;
  name: string;
  type: string; // 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense' | 'Bank' | 'Cash' | 'Tax' | 'Stock'
  isGroup: boolean;
  balance: number; // current balance
  currency: string;
  taxRate?: number;
  disabled?: boolean;
  notes?: string;
  costCenter?: string;
}

// Company Metadata Setup
interface CompanyConfig {
  name: string;
  currency: string;
  fiscalYear: string;
  templateType: 'indian_gst' | 'us_gaap' | 'manufacturing' | 'clean_slate';
  gstin?: string;
}

// Preset templates to satisfy BOTH instant onboarding AND "No Demo Data / custom" requests
const INDIAN_GST_TEMPLATE: AccountItem[] = [
  { id: 'assets', code: '1000', name: 'Application of Funds (Assets)', type: 'Asset', isGroup: true, balance: 0, currency: 'INR', notes: 'Root asset group containing current and fixed reserves.' },
  { id: 'current_assets', parentId: 'assets', code: '1100', name: 'Current Assets', type: 'Asset', isGroup: true, balance: 0, currency: 'INR' },
  { id: 'acc_receivable', parentId: 'current_assets', code: '1110', name: 'Accounts Receivable', type: 'Asset', isGroup: false, balance: 0, currency: 'INR', notes: 'Customer payment ledgers' },
  { id: 'bank_acc', parentId: 'current_assets', code: '1120', name: 'Current HDFC Bank Account', type: 'Bank', isGroup: false, balance: 0, currency: 'INR', notes: 'Primary bank account' },
  { id: 'cash_hand', parentId: 'current_assets', code: '1130', name: 'Cash In Hand', type: 'Cash', isGroup: false, balance: 0, currency: 'INR' },
  { id: 'stock_hand', parentId: 'current_assets', code: '1140', name: 'Stock in Hand', type: 'Stock', isGroup: false, balance: 0, currency: 'INR' },
  { id: 'fixed_assets', parentId: 'assets', code: '1200', name: 'Fixed Assets', type: 'Asset', isGroup: true, balance: 0, currency: 'INR' },
  
  { id: 'liabilities', code: '2000', name: 'Sources of Funds (Liabilities)', type: 'Liability', isGroup: true, balance: 0, currency: 'INR' },
  { id: 'current_liabilities', parentId: 'liabilities', code: '2100', name: 'Current Liabilities', type: 'Liability', isGroup: true, balance: 0, currency: 'INR' },
  { id: 'acc_payable', parentId: 'current_liabilities', code: '2110', name: 'Accounts Payable', type: 'Liability', isGroup: false, balance: 0, currency: 'INR' },
  { id: 'cgst_tax', parentId: 'current_liabilities', code: '2121', name: 'CGST Input Credit Ledger (9%)', type: 'Tax', isGroup: false, balance: 0, taxRate: 9, currency: 'INR' },
  { id: 'sgst_tax', parentId: 'current_liabilities', code: '2122', name: 'SGST Input Credit Ledger (9%)', type: 'Tax', isGroup: false, balance: 0, taxRate: 9, currency: 'INR' },

  { id: 'equity', code: '3000', name: 'Equity and Capital Accounts', type: 'Equity', isGroup: true, balance: 0, currency: 'INR' },
  { id: 'capital', parentId: 'equity', code: '3100', name: 'Shareholders Capital', type: 'Equity', isGroup: false, balance: 0, currency: 'INR' },

  { id: 'income', code: '4000', name: 'Income', type: 'Income', isGroup: true, balance: 0, currency: 'INR' },
  { id: 'sales_direct', parentId: 'income', code: '4100', name: 'Direct Sales Revenue', type: 'Income', isGroup: false, balance: 0, currency: 'INR' },

  { id: 'expenses', code: '5000', name: 'Expenses', type: 'Expense', isGroup: true, balance: 0, currency: 'INR' },
  { id: 'direct_expense', parentId: 'expenses', code: '5100', name: 'Direct Jobwork & Fabrication Cost', type: 'Expense', isGroup: false, balance: 0, currency: 'INR' }
];

const US_GAAP_TEMPLATE: AccountItem[] = [
  { id: 'assets', code: '10000', name: 'Assets (Current & Non-Current)', type: 'Asset', isGroup: true, balance: 0, currency: 'USD' },
  { id: 'current_assets', parentId: 'assets', code: '11000', name: 'Current Assets', type: 'Asset', isGroup: true, balance: 0, currency: 'USD' },
  { id: 'acc_receivable', parentId: 'current_assets', code: '11200', name: 'Trade Receivables (A/R)', type: 'Asset', isGroup: false, balance: 0, currency: 'USD' },
  { id: 'bank_acc', parentId: 'current_assets', code: '11100', name: 'Chase Operating Account', type: 'Bank', isGroup: false, balance: 0, currency: 'USD' },
  { id: 'inventory', parentId: 'current_assets', code: '11500', name: 'Inventory Asset Pool', type: 'Stock', isGroup: false, balance: 0, currency: 'USD' },
  
  { id: 'liabilities', code: '20000', name: 'Liabilities', type: 'Liability', isGroup: true, balance: 0, currency: 'USD' },
  { id: 'current_liabilities', parentId: 'liabilities', code: '21000', name: 'Current Liabilities', type: 'Liability', isGroup: true, balance: 0, currency: 'USD' },
  { id: 'acc_payable', parentId: 'current_liabilities', code: '21100', name: 'Accounts Payable (A/P)', type: 'Liability', isGroup: false, balance: 0, currency: 'USD' },

  { id: 'equity', code: '30000', name: 'Stockholders Equity', type: 'Equity', isGroup: true, balance: 0, currency: 'USD' },
  { id: 'retained', parentId: 'equity', code: '32000', name: 'Retained Earnings', type: 'Equity', isGroup: false, balance: 0, currency: 'USD' },

  { id: 'income', code: '40000', name: 'Revenue', type: 'Income', isGroup: true, balance: 0, currency: 'USD' },
  { id: 'sales', parentId: 'income', code: '41000', name: 'Gross Product Sales', type: 'Income', isGroup: false, balance: 0, currency: 'USD' },

  { id: 'expenses', code: '50000', name: 'Cost of Goods & Expenses', type: 'Expense', isGroup: true, balance: 0, currency: 'USD' },
  { id: 'cogs', parentId: 'expenses', code: '51000', name: 'Cost of Goods Sold (COGS)', type: 'Expense', isGroup: false, balance: 0, currency: 'USD' }
];

const MANUFACTURING_TEMPLATE: AccountItem[] = [
  { id: 'assets', code: '1000', name: 'Assets', type: 'Asset', isGroup: true, balance: 0, currency: 'INR' },
  { id: 'materials_stock', parentId: 'assets', code: '1100', name: 'Inventory Raw Materials', type: 'Stock', isGroup: false, balance: 0, currency: 'INR' },
  { id: 'work_in_progress', parentId: 'assets', code: '1110', name: 'Work in Progress Ledger', type: 'Stock', isGroup: false, balance: 0, currency: 'INR' },
  { id: 'finished_goods', parentId: 'assets', code: '1120', name: 'Finished Inventory Reserve', type: 'Stock', isGroup: false, balance: 0, currency: 'INR' },
  { id: 'bank_op', parentId: 'assets', code: '1200', name: 'Primary Factory Bank Ledger', type: 'Bank', isGroup: false, balance: 0, currency: 'INR' },

  { id: 'liabilities', code: '2000', name: 'Liabilities', type: 'Liability', isGroup: true, balance: 0, currency: 'INR' },
  { id: 'creditors', parentId: 'liabilities', code: '2100', name: 'Vendor Trade Payables', type: 'Liability', isGroup: false, balance: 0, currency: 'INR' },

  { id: 'equity', code: '3000', name: 'Partner Capital Reserves', type: 'Equity', isGroup: true, balance: 0, currency: 'INR' },
  { id: 'capital', parentId: 'equity', code: '3100', name: 'Partner Active Capitals', type: 'Equity', isGroup: false, balance: 0, currency: 'INR' },

  { id: 'income', code: '4000', name: 'Sales Income Stream', type: 'Income', isGroup: true, balance: 0, currency: 'INR' },
  { id: 'wholesale', parentId: 'income', code: '4100', name: 'Wholesale Fabric Sales', type: 'Income', isGroup: false, balance: 0, currency: 'INR' },

  { id: 'expenses', code: '5000', name: 'Factory Overheads and Costs', type: 'Expense', isGroup: true, balance: 0, currency: 'INR' },
  { id: 'labor_costs', parentId: 'expenses', code: '5100', name: 'Direct Weaving & Labor Wages', type: 'Expense', isGroup: false, balance: 0, currency: 'INR' },
  { id: 'power_fuel', parentId: 'expenses', code: '5200', name: 'Factory Power, Water and Coal Feed', type: 'Expense', isGroup: false, balance: 0, currency: 'INR' }
];

const CLEAN_SLATE_ROOTS: AccountItem[] = [
  { id: 'assets', code: '1000', name: 'Standard Assets Root', type: 'Asset', isGroup: true, balance: 0, currency: 'INR' },
  { id: 'liabilities', code: '2000', name: 'Standard Liabilities Root', type: 'Liability', isGroup: true, balance: 0, currency: 'INR' },
  { id: 'equity', code: '3000', name: 'Standard Equities Root', type: 'Equity', isGroup: true, balance: 0, currency: 'INR' },
  { id: 'income', code: '4000', name: 'Standard Revenues Root', type: 'Income', isGroup: true, balance: 0, currency: 'INR' },
  { id: 'expenses', code: '5000', name: 'Standard Operational Expenses Root', type: 'Expense', isGroup: true, balance: 0, currency: 'INR' },
];

const ACCOUNT_TYPES = [
  'Asset', 'Liability', 'Equity', 'Income', 'Expense', 'Bank', 'Cash', 'Tax', 'Stock'
];

const CURRENCIES = [
  'INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'CAD'
];

export const ChartOfAccounts: React.FC = () => {
  // Check if setup already exists in localStorage, if not show wizard installer
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig | null>(() => {
    try {
      const stored = localStorage.getItem('erp_company_coa_config');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return null; // Force show wizard first time
  });

  const [accounts, setAccounts] = useState<AccountItem[]>(() => {
    try {
      const stored = localStorage.getItem('erp_company_coa_entries');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    // Default fallback if no config yet is clean Indian GST (or empty array)
    return INDIAN_GST_TEMPLATE;
  });

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'details' | 'importer' | 'postings'>('details');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Wizard States
  const [wizardName, setWizardName] = useState<string>('Prestige Textiles Infrastructure');
  const [wizardCurrency, setWizardCurrency] = useState<string>('INR');
  const [wizardFiscalYear, setWizardFiscalYear] = useState<string>('2026-2027');
  const [wizardTemplate, setWizardTemplate] = useState<CompanyConfig['templateType']>('indian_gst');
  const [wizardGstin, setWizardGstin] = useState<string>('27AAAAA1111A1Z1');

  // Excel Bulk Paste Importer state
  const [importerText, setImporterText] = useState<string>(
    `# Format your TSV or paste spreadsheet columns:\n` +
    `# Code\tAccount Name\tClassType\tIsGroup(Y/N)\tParentCode\tOpeningBalance\n` +
    `1150\tSBI Current Account\tBank\tN\t1100\t1200000\n` +
    `1160\tPetty Cash Register\tCash\tN\t1100\t5000\n` +
    `2130\tWages Payable Reserve\tLiability\tN\t2100\t80000\n` +
    `5300\tTravel & Lodging Overhead\tExpense\tN\t5000\t12500`
  );
  const [importerLog, setImporterLog] = useState<string[]>([]);
  const [importerStats, setImporterStats] = useState<{ successes: number; errors: number }>({ successes: 0, errors: 0 });

  // Action / Journal voucher simulation state
  const [postAmount, setPostAmount] = useState<string>('150000');
  const [debitAccountId, setDebitAccountId] = useState<string>('');
  const [creditAccountId, setCreditAccountId] = useState<string>('');
  const [journalMemo, setJournalMemo] = useState<string>('Standard raw materials ledger procurement');
  const [postingHistory, setPostingHistory] = useState<{ id: string; timestamp: string; dr: string; cr: string; amnt: number; memo: string }[]>([
    { id: 'VOU-001', timestamp: '2026-05-30 14:10', dr: 'HDFC Current Bank Account', cr: 'Accounts Receivable', amnt: 45000, memo: 'Clearing customer outstanding invoice credit' }
  ]);

  // Form states for creating custom ledger
  const [newAccName, setNewAccName] = useState<string>('');
  const [newAccCode, setNewAccCode] = useState<string>('');
  const [newAccParentId, setNewAccParentId] = useState<string>('');
  const [newAccType, setNewAccType] = useState<string>('Asset');
  const [newAccIsGroup, setNewAccIsGroup] = useState<boolean>(false);
  const [newAccBalance, setNewAccBalance] = useState<string>('0');
  const [newAccCurrency, setNewAccCurrency] = useState<string>('INR');
  const [newAccCostCenter, setNewAccCostCenter] = useState<string>('');

  // Persist config and entries on state changes
  useEffect(() => {
    if (companyConfig) {
      localStorage.setItem('erp_company_coa_config', JSON.stringify(companyConfig));
    }
  }, [companyConfig]);

  useEffect(() => {
    localStorage.setItem('erp_company_coa_entries', JSON.stringify(accounts));
    
    // Auto populate debit and credit selectors if state has real leaf indicators
    const leaves = accounts.filter(a => !a.isGroup);
    if (leaves.length > 1) {
      if (!debitAccountId || !accounts.some(a => a.id === debitAccountId)) {
        setDebitAccountId(leaves[0].id);
      }
      if (!creditAccountId || !accounts.some(a => a.id === creditAccountId)) {
        setCreditAccountId(leaves[1].id);
      }
    }
  }, [accounts]);

  // Handle first time wizard installation
  const handleInitiateSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wizardName.trim()) {
      alert('You must provide a valid Company Name to initiate standard ERPNext ledger structures.');
      return;
    }

    let selectedBaseline: AccountItem[] = [];
    if (wizardTemplate === 'indian_gst') {
      selectedBaseline = INDIAN_GST_TEMPLATE.map(a => ({ ...a, currency: wizardCurrency }));
    } else if (wizardTemplate === 'us_gaap') {
      selectedBaseline = US_GAAP_TEMPLATE.map(a => ({ ...a, currency: wizardCurrency }));
    } else if (wizardTemplate === 'manufacturing') {
      selectedBaseline = MANUFACTURING_TEMPLATE.map(a => ({ ...a, currency: wizardCurrency }));
    } else {
      selectedBaseline = CLEAN_SLATE_ROOTS.map(a => ({ ...a, currency: wizardCurrency }));
    }

    const config: CompanyConfig = {
      name: wizardName,
      currency: wizardCurrency,
      fiscalYear: wizardFiscalYear,
      templateType: wizardTemplate,
      gstin: wizardGstin || undefined
    };

    setCompanyConfig(config);
    setAccounts(selectedBaseline);
    
    // Expand root items auto
    const expanded: Record<string, boolean> = {};
    selectedBaseline.forEach(b => {
      if (b.isGroup) expanded[b.id] = true;
    });
    setExpandedNodes(expanded);

    // Auto focus first item
    const firstLeaf = selectedBaseline.find(a => !a.isGroup);
    if (firstLeaf) {
      setSelectedAccountId(firstLeaf.id);
    } else {
      setSelectedAccountId(selectedBaseline[0]?.id || '');
    }
  };

  // Compute roll-up balances dynamically
  const computedBalances = useMemo(() => {
    const balances: Record<string, number> = {};

    // Base initial values
    accounts.forEach(acc => {
      balances[acc.id] = acc.isGroup ? 0 : (acc.balance || 0);
    });

    const sumSubtree = (id: string): number => {
      const parent = accounts.find(a => a.id === id);
      if (!parent) return 0;
      if (!parent.isGroup) {
        return parent.balance || 0;
      }
      const children = accounts.filter(c => c.parentId === id);
      const childTotal = children.reduce((sum, c) => sum + sumSubtree(c.id), 0);
      balances[id] = childTotal;
      return childTotal;
    };

    // Roll up roots
    accounts.forEach(acc => {
      if (!acc.parentId) {
        sumSubtree(acc.id);
      }
    });

    return balances;
  }, [accounts]);

  // Target Account
  const selectedAccount = useMemo(() => {
    return accounts.find(a => a.id === selectedAccountId);
  }, [accounts, selectedAccountId]);

  // Trial balance validation check
  const trialStat = useMemo(() => {
    const assetsBalance = computedBalances['assets'] || 0;
    const liabilitiesBalance = computedBalances['liabilities'] || 0;
    const equityBalance = computedBalances['equity'] || 0;
    const incomeBalance = computedBalances['income'] || 0;
    const expensesBalance = computedBalances['expenses'] || 0;

    // In modern accounting: Debits = Credits
    // Normal Debit balances: Assets + Expenses
    // Normal Credit balances: Liabilities + Equity + Revenue (Income)
    const debits = assetsBalance + expensesBalance;
    const credits = liabilitiesBalance + equityBalance + incomeBalance;
    const diff = debits - credits;
    const absoluteDiff = Math.abs(diff);

    return {
      debitsTotal: debits,
      creditsTotal: credits,
      isBalanced: absoluteDiff < 0.99, // Tolerance check
      difference: diff
    };
  }, [computedBalances]);

  // Search filter
  const filteredAccountIds = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    const matched = new Set<string>();

    accounts.forEach(acc => {
      if (
        acc.name.toLowerCase().includes(query) || 
        acc.code.toLowerCase().includes(query) || 
        acc.type.toLowerCase().includes(query)
      ) {
        matched.add(acc.id);
        let parent = accounts.find(p => p.id === acc.parentId);
        while (parent) {
          matched.add(parent.id);
          parent = accounts.find(p => p.id === parent?.parentId);
        }
      }
    });
    return matched;
  }, [accounts, searchQuery]);

  const formatValue = (num: number, targetCurr: string = companyConfig?.currency || 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: targetCurr,
      maximumFractionDigits: 0
    }).format(num);
  };

  const toggleNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleUpdateAccount = (updated: AccountItem) => {
    setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a));
  };

  const handleDeleteAccount = (id: string) => {
    const hasChildren = accounts.some(a => a.parentId === id);
    if (hasChildren) {
      alert(`ERPNext Safety Block: This is a Group node containing other ledgers. Move or delete children first before clearing parent category "${accounts.find(a => a.id === id)?.name}".`);
      return;
    }
    if (confirm('Are you absolutely sure you want to delete this accounting ledger row? Simulating journals with deleted logs will clear their values.')) {
      setAccounts(prev => prev.filter(b => b.id !== id));
      setSelectedAccountId('');
    }
  };

  // Add individual customized item
  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim() || !newAccCode.trim()) {
      alert('Both Account code and Ledger designation are required.');
      return;
    }

    const cleanedCode = newAccCode.trim();
    if (accounts.some(a => a.code === cleanedCode)) {
      alert(`Safety Override Block: Account Code "${cleanedCode}" is already in use by another ledger.`);
      return;
    }

    const stringId = 'acc_' + newAccName.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    if (accounts.some(a => a.id === stringId)) {
      alert(`Safety Override Block: Generated system identifier "${stringId}" already registered.`);
      return;
    }

    const newItem: AccountItem = {
      id: stringId,
      parentId: newAccParentId || undefined,
      code: cleanedCode,
      name: newAccName.trim(),
      type: newAccType,
      isGroup: newAccIsGroup,
      balance: newAccIsGroup ? 0 : parseFloat(newAccBalance) || 0,
      currency: newAccCurrency || companyConfig?.currency || 'INR',
      notes: 'Custom user account ledger',
      costCenter: newAccCostCenter || undefined
    };

    setAccounts(prev => [...prev, newItem]);
    setSelectedAccountId(stringId);
    setShowAddModal(false);

    if (newAccParentId) {
      setExpandedNodes(prev => ({ ...prev, [newAccParentId]: true }));
    }

    // Reset modals
    setNewAccName('');
    setNewAccCode('');
    setNewAccBalance('0');
    setNewAccCostCenter('');
  };

  // Simulated Vouchers Journal Entries posting
  const handlePostJournalVoucher = () => {
    const val = parseFloat(postAmount);
    if (isNaN(val) || val <= 0) {
      alert('Debit value must specify a real positive number.');
      return;
    }

    const dr = accounts.find(a => a.id === debitAccountId);
    const cr = accounts.find(a => a.id === creditAccountId);

    if (!dr || !cr) {
      alert('Please specify valid double entry ledger accounts.');
      return;
    }

    if (debitAccountId === creditAccountId) {
      alert('Accounting rules deny: Simultaneous debit/credit posting on the exact same account is forbidden.');
      return;
    }

    // Standard business transaction updates
    setAccounts(prev => prev.map(acc => {
      if (acc.id === debitAccountId) {
        // Debit normal adds (Asset, Expense, Stock, Bank, Cash). Else reduces.
        const isDebitNormal = ['Asset', 'Expense', 'Tax', 'Bank', 'Cash', 'Stock'].includes(acc.type);
        return { ...acc, balance: (acc.balance || 0) + (isDebitNormal ? val : -val) };
      }
      if (acc.id === creditAccountId) {
        // Credit normal adds (Liability, Equity, Income). Else reduces debits.
        const isCreditNormal = ['Liability', 'Equity', 'Income'].includes(acc.type);
        return { ...acc, balance: (acc.balance || 0) + (isCreditNormal ? val : -val) };
      }
      return acc;
    }));

    const jvId = `JV-${Math.floor(1000 + Math.random() * 9000)}`;
    setPostingHistory(prev => [
      {
        id: jvId,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        dr: dr.name,
        cr: cr.name,
        amnt: val,
        memo: journalMemo || 'Standard simulated voucher'
      },
      ...prev
    ]);

    setJournalMemo('');
  };

  // Excel Bulk upload text parser
  const handleParseImporterCSV = () => {
    const lines = importerText.split('\n');
    const parsedEntries: AccountItem[] = [];
    const logs: string[] = [];
    let successCount = 0;
    let errorCount = 0;

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('Code')) {
        return; // skip comments and header definitions
      }

      // Split by tab, or comma if csv
      let cols = trimmed.split('\t');
      if (cols.length < 3) {
        cols = trimmed.split(',');
      }

      if (cols.length < 3) {
        logs.push(`Line ${idx + 1} skipped: invalid columns count. Minimum requirements: Code, Name, LedgerType`);
        errorCount++;
        return;
      }

      const code = cols[0]?.trim();
      const name = cols[1]?.trim();
      const type = cols[2]?.trim();
      const isGroupRaw = cols[3]?.trim()?.toUpperCase() || 'N';
      const isGroup = isGroupRaw === 'Y' || isGroupRaw === 'YES' || isGroupRaw === 'TRUE' || isGroupRaw === '1';
      const parentCode = cols[4]?.trim() || '';
      const balance = parseFloat(cols[5]?.trim() || '0');

      if (!code || !name || !type) {
        logs.push(`Line ${idx + 1} skipped: Code Name or Type is empty.`);
        errorCount++;
        return;
      }

      // Find parent based on code if possible, else assign based on standard ledger type standard
      let finalParentId = undefined;
      if (parentCode) {
        const foundParent = accounts.find(a => a.code === parentCode) || parsedEntries.find(a => a.code === parentCode);
        if (foundParent) {
          finalParentId = foundParent.id;
        } else {
          // If parent is not created, fallback to root asset/liabilities based on type
          const lowerType = type.toLowerCase();
          if (lowerType === 'asset' || lowerType === 'bank' || lowerType === 'cash' || lowerType === 'stock') finalParentId = 'assets';
          else if (lowerType === 'liability' || lowerType === 'tax') finalParentId = 'liabilities';
          else if (lowerType === 'equity') finalParentId = 'equity';
          else if (lowerType === 'income') finalParentId = 'income';
          else if (lowerType === 'expense') finalParentId = 'expenses';
        }
      } else {
        // Fallback to roots
        const lowerType = type.toLowerCase();
        if (['asset', 'bank', 'cash', 'stock'].includes(lowerType)) finalParentId = 'assets';
        else if (['liability', 'tax'].includes(lowerType)) finalParentId = 'liabilities';
        else if (lowerType === 'equity') finalParentId = 'equity';
        else if (lowerType === 'income') finalParentId = 'income';
        else if (lowerType === 'expense') finalParentId = 'expenses';
      }

      const uniqueStringId = 'acc_imp_' + code + '_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_');

      parsedEntries.push({
        id: uniqueStringId,
        parentId: finalParentId || undefined,
        code,
        name,
        type: type.charAt(0).toUpperCase() + type.slice(1),
        isGroup,
        balance,
        currency: companyConfig?.currency || 'INR',
        notes: 'Imported dynamically via Bulk Text Mapper'
      });

      successCount++;
    });

    if (parsedEntries.length > 0) {
      // Avoid duplication with existing items if they share codes
      setAccounts(prev => {
        const filteredPrev = prev.filter(exist => !parsedEntries.some(p => p.code === exist.code));
        return [...filteredPrev, ...parsedEntries];
      });
      logs.push(`Successfully loaded and merged ${successCount} clean ledger records! Duplicate codes overridden if matching.`);
    }

    setImporterLog(logs);
    setImporterStats({ successes: successCount, errors: errorCount });
  };

  const handleExportJSON = () => {
    const data = {
      meta: companyConfig,
      accounts: accounts,
      postingLog: postingHistory
    };
    const output = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(output);
    const exportFileDefaultName = `${companyConfig?.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_coa_fixtures.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleResetToCleanInstallation = () => {
    if (confirm('Security verification: Choose YES to wipe out all custom chart adjustments and restore dynamic Wizard Setup?')) {
      setCompanyConfig(null);
      localStorage.removeItem('erp_company_coa_config');
      localStorage.removeItem('erp_company_coa_entries');
    }
  };

  // Recursive printer
  const renderTree = (nodeId: string, level: number = 0) => {
    const node = accounts.find(a => a.id === nodeId);
    if (!node) return null;

    const children = accounts.filter(a => a.parentId === nodeId);
    const isExpanded = !!expandedNodes[node.id];
    const isSelected = selectedAccountId === node.id;
    
    const isHighlit = filteredAccountIds ? filteredAccountIds.has(node.id) : true;
    const isExactMatch = searchQuery.trim() !== '' && (
      node.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      node.code.includes(searchQuery)
    );

    if (!isHighlit) return null;

    return (
      <div key={node.id} className="relative">
        <div 
          onClick={() => setSelectedAccountId(node.id)}
          className={`group flex items-center justify-between py-2.5 px-3 my-1 rounded-xl cursor-pointer transition-all ${
            isSelected 
              ? 'bg-indigo-600 text-white shadow-md font-semibold ring-1 ring-indigo-500' 
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 border border-transparent'
          } ${isExactMatch ? 'ring-2 ring-lime-500 bg-lime-50/50 dark:bg-lime-950/20' : ''}`}
          style={{ paddingLeft: `${Math.max(12, level * 20)}px` }}
        >
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <span 
              onClick={(e) => {
                if (node.isGroup) {
                  toggleNode(node.id, e);
                } else {
                  e.stopPropagation();
                  setSelectedAccountId(node.id);
                }
              }}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 shrink-0"
            >
              {node.isGroup ? (
                children.length > 0 ? (
                  isExpanded ? <ChevronDown className="w-4 h-4 shrink-0 text-slate-500" /> : <ChevronRight className="w-4 h-4 shrink-0 text-slate-500" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )
              ) : (
                <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-650 shrink-0" />
              )}
            </span>

            <span>
              {node.isGroup ? (
                <FolderOpen className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-amber-500'}`} />
              ) : (
                <BookOpen className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-sky-500'}`} />
              )}
            </span>

            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className={`font-mono text-[11px] font-bold shrink-0 ${isSelected ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'}`}>
                {node.code}
              </span>
              <span className="text-xs truncate font-medium">
                {node.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {node.costCenter && (
              <span className="text-[8px] font-black uppercase text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-200/50">
                {node.costCenter}
              </span>
            )}
            {node.disabled && (
              <span className="text-[9px] font-bold uppercase text-rose-500 bg-rose-50 px-1 rounded">Disabled</span>
            )}
            <span className={`text-[12px] font-mono font-bold tracking-tight ${
              isSelected ? 'text-white' : 'text-slate-900 dark:text-white'
            }`}>
              {formatValue(computedBalances[node.id] || 0, node.currency)}
            </span>
          </div>
        </div>

        {node.isGroup && isExpanded && children.length > 0 && (
          <div className="relative pl-1 border-l border-slate-200/60 dark:border-slate-800 ml-4">
            {children.map(child => renderTree(child.id, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // If no setup template exists, show immersive standard dynamic setup wizard instead of hardcoded demo data
  if (!companyConfig) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-4 font-sans text-slate-800 dark:text-slate-100">
        <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden animate-scale-up">
          <div className="bg-indigo-650 p-6 text-white relative">
            <div className="absolute right-6 top-6 bg-white/10 px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest leading-none">
              Setup Wizard
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">ERPNext Chart of Accounts Setup</h2>
                <p className="text-xs text-indigo-100 mt-1">Configure your corporate chart of accounts dynamic template</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleInitiateSetup} className="p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">Company Name</label>
                <input 
                  type="text"
                  required
                  placeholder="E.g. Raviraj Textiles Ltd."
                  value={wizardName}
                  onChange={(e) => setWizardName(e.target.value)}
                  className="w-full px-4 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 outline-none text-sm font-bold focus:ring-1 focus:ring-indigo-600 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">Active Fiscal Year</label>
                <select
                  value={wizardFiscalYear}
                  onChange={(e) => setWizardFiscalYear(e.target.value)}
                  className="w-full px-4 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 outline-none text-sm font-bold"
                >
                  <option value="2026-2027">2026 - 2027</option>
                  <option value="2025-2026">2025 - 2026</option>
                  <option value="2027-2028">2027 - 2028</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">Functional Base Currency</label>
                <select
                  value={wizardCurrency}
                  onChange={(e) => setWizardCurrency(e.target.value)}
                  className="w-full px-4 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 outline-none text-sm font-bold"
                >
                  {CURRENCIES.map(curr => (
                    <option key={curr} value={curr}>{curr}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">GSTIN / Corporate EIN Identification (Optional)</label>
                <input 
                  type="text"
                  placeholder="27AAAAA1111A1Z1"
                  value={wizardGstin}
                  onChange={(e) => setWizardGstin(e.target.value)}
                  className="w-full px-4 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 outline-none text-sm font-bold focus:ring-1 focus:ring-indigo-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Accounting Ledger Template Segment</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Indian Standard */}
                <button
                  type="button"
                  onClick={() => setWizardTemplate('indian_gst')}
                  className={`p-4 text-left border rounded-2xl transition-all flex flex-col justify-between h-28 ${
                    wizardTemplate === 'indian_gst'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm ring-1 ring-indigo-500'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
                  }`}
                >
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Indian GST Template</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">Preset with raw manufacturing stocks, CGST, SGST ledgers, and Indian banking codes.</p>
                  </div>
                  <span className="text-[10px] uppercase font-black text-indigo-600">Selected currency: {wizardCurrency}</span>
                </button>

                {/* US GAAP Standard */}
                <button
                  type="button"
                  onClick={() => {
                    setWizardTemplate('us_gaap');
                    setWizardCurrency('USD');
                  }}
                  className={`p-4 text-left border rounded-2xl transition-all flex flex-col justify-between h-28 ${
                    wizardTemplate === 'us_gaap'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm ring-1 ring-indigo-500'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
                  }`}
                >
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">US GAAP Standard</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">Configured for 5-digit US numbering system codes, trade Receivables, Chase bank presets.</p>
                  </div>
                  <span className="text-[10px] uppercase font-black text-indigo-600">Switches to USD</span>
                </button>

                {/* Manufacturing focus */}
                <button
                  type="button"
                  onClick={() => setWizardTemplate('manufacturing')}
                  className={`p-4 text-left border rounded-2xl transition-all flex flex-col justify-between h-28 ${
                    wizardTemplate === 'manufacturing'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm ring-1 ring-indigo-500'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
                  }`}
                >
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Manufacturing Overheads</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">Configured for work-in-progress materials, finished stock reserves, wages & utility expenses.</p>
                  </div>
                  <span className="text-[10px] uppercase font-black text-indigo-600">Selected currency: {wizardCurrency}</span>
                </button>

                {/* Completely blank slate */}
                <button
                  type="button"
                  onClick={() => setWizardTemplate('clean_slate')}
                  className={`p-4 text-left border rounded-2xl transition-all flex flex-col justify-between h-28 ${
                    wizardTemplate === 'clean_slate'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm ring-1 ring-indigo-500'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
                  }`}
                >
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white block hover:text-indigo-500">Completely Blank Slate</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">No default demo accounts. Ready for custom file mapping uploads or blank manually ledger creations.</p>
                  </div>
                  <span className="text-[11px] font-black tracking-wider text-indigo-550 uppercase">Manual ledger control</span>
                </button>

              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
              <button
                type="submit"
                className="px-6 py-3 bg-indigo-650 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-transform hover:-translate-y-0.5"
              >
                Assemble New ERP Ledger Workspace
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-slate-950 font-sans antialiased text-slate-900 dark:text-white absolute inset-0 rounded-tl-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
      
      {/* Top ERP Header and Settings Action Rail */}
      <div className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-850 px-6 py-4.5 z-20">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
               <div className="flex items-center gap-3">
                  <div className="bg-indigo-650 p-2 text-white rounded-xl shadow-md">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white uppercase">
                        {companyConfig.name}
                      </h1>
                      <span className="text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/30">
                        {companyConfig.templateType.replace('_', ' ')} COA
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2 mt-0.5">
                      <span>Accounting FY: {companyConfig.fiscalYear}</span>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <span>Default Denomination: {companyConfig.currency}</span>
                      {companyConfig.gstin && (
                        <>
                          <span className="text-slate-300 dark:text-slate-700">|</span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-mono">GSTIN: {companyConfig.gstin}</span>
                        </>
                      )}
                    </p>
                  </div>
               </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
               <button 
                 onClick={() => {
                   const list: Record<string, boolean> = {};
                   accounts.forEach(acc => {
                     if (acc.isGroup) {
                       list[acc.id] = true;
                     }
                   });
                   setExpandedNodes(list);
                 }}
                 className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
               >
                 Expand All
               </button>
               <button 
                 onClick={() => setExpandedNodes({})}
                 className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
               >
                 Collapse All
               </button>
               <button 
                 onClick={handleResetToCleanInstallation}
                 className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1"
               >
                 <RotateCcw className="w-3.5 h-3.5" />
                 Setup Wizard
               </button>
               <button 
                onClick={handleExportJSON}
                className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-transform hover:-translate-y-0.5"
               >
                 <Download className="w-3.5 h-3.5" />
                 Export JSON
               </button>
               <button 
                 onClick={() => {
                   // pre-fill some dynamic codes
                   setNewAccCode(String(Math.floor(1150 + Math.random() * 4000)));
                   setNewAccParentId(accounts.find(a => a.isGroup)?.id || '');
                   setShowAddModal(true);
                 }}
                 className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-transform hover:-translate-y-0.5"
               >
                 <Plus className="w-3.8 h-3.8" /> Add Account Leaf
               </button>
            </div>
         </div>
      </div>

      {/* Trial Balance Health Bar */}
      <div className="flex-none bg-slate-100/90 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-850 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto">
          {/* Asset Indicator */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Normal Debits (Assets + Expenses)</p>
            <p className="text-base font-black text-slate-950 dark:text-white font-mono mt-1 select-all">
              {formatValue(trialStat.debitsTotal, companyConfig.currency)}
            </p>
          </div>

          {/* Liabilities Indicator */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Normal Credits (Liabs + Equities + Revenues)</p>
            <p className="text-base font-black text-slate-950 dark:text-white font-mono mt-1 select-all">
              {formatValue(trialStat.creditsTotal, companyConfig.currency)}
            </p>
          </div>

          {/* Verification check status */}
          <div className={`p-3 rounded-xl border flex items-center gap-2.5 leading-tight shadow-sm transition-colors ${
            trialStat.isBalanced 
              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 text-emerald-800 dark:text-emerald-300' 
              : 'bg-rose-50/50 dark:bg-rose-955/20 border-rose-200 text-rose-800 dark:text-rose-300'
          }`}>
            <div>
              {trialStat.isBalanced ? (
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-500 animate-bounce shrink-0" />
              )}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide">
                {trialStat.isBalanced ? 'Trial Balance Verified' : 'Formula Discrepancy'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                {trialStat.isBalanced 
                  ? 'Double Entry equation matches flawlessly.' 
                  : `Disbalance: ${formatValue(trialStat.difference, companyConfig.currency)}`
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split Space Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        
        {/* Left Interactive Tree Layout Pane */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 border-r border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 flex flex-col space-y-4">
          
          {/* Fuzzy search input */}
          <div className="relative shrink-0">
            <Search className="w-4 h-4 pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-450" />
            <input 
              type="text"
              placeholder={`Fuzzy search standard corporate ledger items by code or names...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 outline-none text-sm font-semibold focus:ring-1 focus:ring-indigo-600 focus:bg-white"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 text-xs font-bold uppercase"
              >
                Clear
              </button>
            )}
          </div>

          {/* Account Root branches render wrapper */}
          <div className="flex-1 border border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl p-4 overflow-y-auto custom-scrollbar">
            {accounts.filter(a => !a.parentId).map(root => renderTree(root.id, 0))}
            {accounts.length === 0 && (
              <div className="text-center py-10">
                <AlertTriangle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-400">Your accounts directory is completely empty.</p>
                <button
                  type="button"
                  onClick={() => setAccounts(CLEAN_SLATE_ROOTS)}
                  className="mt-2 text-xs font-black text-indigo-650 hover:underline"
                >
                  Create Root Branches Standard
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side Control Pane tabs (Details, bulk importer tool, Journal Entries booking) */}
        <div className="w-full md:w-96 xl:w-115 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/10 p-4 md:p-6 shrink-0 flex flex-col gap-6 custom-scrollbar border-l border-slate-200 dark:border-slate-850">
          
          {/* Action Tabs selector bar */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all ${
                activeTab === 'details'
                  ? 'border-indigo-650 text-indigo-650 dark:border-indigo-400 dark:text-indigo-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Ledger Editor
            </button>
            <button
              onClick={() => setActiveTab('importer')}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all ${
                activeTab === 'importer'
                  ? 'border-indigo-650 text-indigo-650 dark:border-indigo-400 dark:text-indigo-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-emerald-555" />
              Excel / CSV Import
            </button>
            <button
              onClick={() => setActiveTab('postings')}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all ${
                activeTab === 'postings'
                  ? 'border-indigo-650 text-indigo-650 dark:border-indigo-400 dark:text-indigo-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-rose-500" />
              Journal Simulator
            </button>
          </div>

          {/* Render Active Tab */}
          {activeTab === 'details' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-start border-b border-slate-150 dark:border-slate-800 pb-3">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-650 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-0.5 rounded-md border border-indigo-100">
                    {selectedAccount?.type || 'Not selected'}
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mt-1.5 uppercase leading-tight select-all">
                    {selectedAccount ? selectedAccount.name : 'Select Account Group'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold font-mono mt-0.5">
                    Internal key: {selectedAccountId || 'N/A'}
                  </p>
                </div>
                
                {selectedAccount && !['assets', 'liabilities', 'equity', 'income', 'expenses'].includes(selectedAccount.id) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteAccount(selectedAccountId)}
                    className="p-1 px-2.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-black uppercase flex items-center gap-1 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}
              </div>

              {selectedAccount ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Account Code</label>
                      <input 
                        type="text"
                        value={selectedAccount.code}
                        onChange={(e) => handleUpdateAccount({ ...selectedAccount, code: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-205 dark:border-slate-800 outline-none text-xs font-bold focus:ring-1 focus:ring-indigo-650"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ledger Name</label>
                      <input 
                        type="text"
                        value={selectedAccount.name}
                        onChange={(e) => handleUpdateAccount({ ...selectedAccount, name: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-205 dark:border-slate-800 outline-none text-xs font-bold focus:ring-1 focus:ring-indigo-650"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Account Class</label>
                      <select
                        value={selectedAccount.type}
                        onChange={(e) => handleUpdateAccount({ ...selectedAccount, type: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-205 dark:border-slate-800 outline-none text-xs font-bold"
                      >
                        {ACCOUNT_TYPES.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Local Currency</label>
                      <select
                        value={selectedAccount.currency}
                        onChange={(e) => handleUpdateAccount({ ...selectedAccount, currency: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-205 dark:border-slate-800 outline-none text-xs font-bold"
                      >
                        {CURRENCIES.map(curr => (
                          <option key={curr} value={curr}>{curr}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {!selectedAccount.isGroup ? (
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Opening Balance ({selectedAccount.currency})
                      </label>
                      <input 
                        type="number"
                        value={selectedAccount.balance}
                        onChange={(e) => handleUpdateAccount({ ...selectedAccount, balance: parseFloat(e.target.value) || 0 })}
                        className="w-full mt-1 px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-205 dark:border-slate-800 outline-none text-xs font-bold select-all focus:ring-1 focus:ring-indigo-650"
                      />
                    </div>
                  ) : (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 leading-normal font-semibold">
                      This is a dynamic Group header node. Balance rolled aggregate: <span className="font-mono font-black">{formatValue(computedBalances[selectedAccount.id], selectedAccount.currency)}</span>. Balances must be configured on active leaf nodes instead.
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Corporate Dimensions Group</span>
                      <select
                        value={selectedAccount.parentId || ''}
                        onChange={(e) => handleUpdateAccount({ ...selectedAccount, parentId: e.target.value || undefined })}
                        className="px-2 py-1 max-w-[200px] border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 outline-none text-xs font-semibold"
                      >
                        <option value="">-- No Category Parent --</option>
                        {accounts.filter(a => a.isGroup && a.id !== selectedAccount.id).map(g => (
                          <option key={g.id} value={g.id}>{g.code} - {g.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Enable Cost Center Suffix</span>
                      <select
                        value={selectedAccount.costCenter || ''}
                        onChange={(e) => handleUpdateAccount({ ...selectedAccount, costCenter: e.target.value || undefined })}
                        className="px-2 py-1 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 outline-none text-xs font-semibold"
                      >
                        <option value="">-- Unassigned Cost Center --</option>
                        <option value="HQA">Headquarters Admin</option>
                        <option value="PRD">Manufacturing Facility</option>
                        <option value="SLS">Marketing and Retail</option>
                        <option value="LOG">Freight and Logistics</option>
                      </select>
                    </div>

                    {selectedAccount.type === 'Tax' && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Local Tax percentage (%)</span>
                        <input 
                          type="number"
                          value={selectedAccount.taxRate || 0}
                          onChange={(e) => handleUpdateAccount({ ...selectedAccount, taxRate: parseFloat(e.target.value) || 0 })}
                          className="w-20 px-2 py-1 text-right border rounded bg-slate-50 dark:bg-slate-950 border-slate-200 outline-none text-xs font-bold"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-450 font-medium">Temporarily disable account ledger</span>
                      <input 
                        type="checkbox"
                        checked={!!selectedAccount.disabled}
                        onChange={(e) => handleUpdateAccount({ ...selectedAccount, disabled: e.target.checked })}
                        className="w-4 h-4 ml-2 accent-indigo-650"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50 animate-pulse" />
                  <p className="text-xs text-slate-450 italic font-semibold">Select or search for any standard ledger account node on the hierarchy map to edit settings.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'importer' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-555 animate-pulse" />
                  Standard CSV & Tab Importer
                </h4>
                <p className="text-[11px] text-slate-405 mt-0.5 font-medium leading-relaxed">
                  Bulk set up by pasting columns straight from your actual Excel files or custom ERPNext configuration. Override prefilled template nodes automatically.
                </p>
              </div>

              <div className="space-y-2">
                <textarea
                  value={importerText}
                  onChange={(e) => setImporterText(e.target.value)}
                  className="w-full h-44 p-3 bg-slate-950 font-mono text-[10px] text-emerald-450 rounded-xl border border-slate-800 outline-none resize-none leading-relaxed"
                  spellCheck={false}
                />
              </div>

              <div className="flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setImporterText(
                    `# Paste clean space or tab separated row values:\n` +
                    `# Code\tName\tType\tIsGroup\tParentCode\tOpeningBalance\n` +
                    `1160\tPetty Cash Register\tCash\tN\t1100\t5000\n` +
                    `2130\tWages Payable Reserve\tLiability\tN\t2100\t80000`
                  )}
                  className="px-2.5 py-1.5 border hover:bg-slate-50 dark:hover:bg-slate-850 rounded text-[9px] font-bold uppercase tracking-wider text-slate-500"
                >
                  Clear & Use Sample template
                </button>
                <button
                  type="button"
                  onClick={handleParseImporterCSV}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider rounded-lg shadow-sm"
                >
                  Import Paste Rows
                </button>
              </div>

              {importerLog.length > 0 && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[9px] text-slate-400 space-y-1 max-h-28 overflow-y-auto">
                  <p className="text-emerald-500 font-bold uppercase">Success: {importerStats.successes} | Failed: {importerStats.errors}</p>
                  {importerLog.map((logStr, idx) => (
                    <p key={idx} className={logStr.includes('skipped') ? 'text-rose-400' : 'text-slate-300'}>{logStr}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'postings' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-rose-500" />
                  Simulated Double-Entry Postings
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Formulate live manual adjustments or clearing transactions. Standard journal checks verify trial match rules instantly.
                </p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Debit (DR) Account</label>
                    <select 
                      value={debitAccountId}
                      onChange={(e) => setDebitAccountId(e.target.value)}
                      className="w-full mt-1 p-2 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 text-xs font-bold text-slate-705 dark:text-slate-200 focus:outline-none"
                    >
                      {accounts.filter(a => !a.isGroup).map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Credit (CR) Account</label>
                    <select 
                      value={creditAccountId}
                      onChange={(e) => setCreditAccountId(e.target.value)}
                      className="w-full mt-1 p-2 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 text-xs font-bold text-slate-705 dark:text-slate-200 focus:outline-none"
                    >
                      {accounts.filter(a => !a.isGroup).map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 items-end">
                  <div className="col-span-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Voucher Description</label>
                    <input 
                      type="text"
                      value={journalMemo}
                      onChange={(e) => setJournalMemo(e.target.value)}
                      placeholder="Simulate clearing references..."
                      className="w-full mt-1 p-2 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-650"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sum ({companyConfig.currency})</label>
                    <input 
                      type="number"
                      value={postAmount}
                      onChange={(e) => setPostAmount(e.target.value)}
                      className="w-full mt-1 p-2 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 text-xs font-bold"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePostJournalVoucher}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <Send className="w-3.5 h-3.5" /> Post Balanced Voucher Entry
                </button>
              </div>

              {/* simulated ledger logs */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Transactional Ledger Logs</span>
                <div className="max-h-36 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                  {postingHistory.map((jv) => (
                    <div key={jv.id} className="p-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-[10px] space-y-1">
                      <div className="flex justify-between font-mono text-slate-400 font-bold">
                        <span className="text-slate-600 font-black">{jv.id}</span>
                        <span>{jv.timestamp}</span>
                      </div>
                      <div className="font-semibold text-slate-700 dark:text-indigo-300">
                        De_Debit Standard: <span className="font-bold text-slate-900 dark:text-white">{jv.dr}</span>
                      </div>
                      <div className="font-semibold text-slate-700 dark:text-rose-400">
                        Cr_Credit Normal: <span className="font-bold text-slate-900 dark:text-white">{jv.cr}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] font-black pt-1 border-t border-dashed border-slate-200 dark:border-slate-800 mt-1">
                        <span className="text-slate-450 italic truncate max-w-[150px]">{jv.memo}</span>
                        <span className="text-emerald-600 font-mono font-bold">{formatValue(jv.amnt, companyConfig.currency)}</span>
                      </div>
                    </div>
                  ))}
                  {postingHistory.length === 0 && (
                    <p className="text-[10px] text-slate-400 italic text-center py-2">No active postings registered yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* PopUp Create Account Leaf Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 animate-fade-in backdrop-blur-xs p-4">
          <form 
            onSubmit={handleCreateAccount}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 max-w-lg w-full space-y-4 animate-scale-up"
          >
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-100 dark:bg-emerald-950/40 p-1.5 rounded-xl text-emerald-600">
                  <Plus className="w-5 h-5 text-emerald-555" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-slate-900 dark:text-white tracking-wide">
                    New ERP Ledger Connection
                  </h3>
                  <p className="text-[11px] text-slate-400">Insert custom leaf ledger under group directories.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-404 block">Account Ledger Name</label>
                <input 
                  type="text"
                  required
                  placeholder="E.g. Cotton Processing Outsource"
                  value={newAccName}
                  onChange={(e) => {
                    setNewAccName(e.target.value);
                    if (!newAccCode) {
                      setNewAccCode(String(Math.floor(1150 + Math.random() * 4000)));
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 outline-none text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-404 block">Ledger Code (FRA_ID)</label>
                <input 
                  type="text"
                  required
                  placeholder="E.g. 5140"
                  value={newAccCode}
                  onChange={(e) => setNewAccCode(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 outline-none text-xs font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-404 block">Parent Category</label>
                <select 
                  value={newAccParentId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewAccParentId(val);
                    const parent = accounts.find(a => a.id === val);
                    if (parent) {
                      setNewAccType(parent.type);
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 text-xs font-bold outline-none"
                >
                  <option value="">-- No Parent (Root Category) --</option>
                  {accounts.filter(a => a.isGroup).map(g => (
                    <option key={g.id} value={g.id}>{g.code} - {g.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-404 block">Standard Account Class</label>
                <select 
                  value={newAccType}
                  onChange={(e) => setNewAccType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 text-xs font-bold outline-none"
                >
                  {ACCOUNT_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-black uppercase block text-slate-404">Opening Balance Entry Sum</label>
                <input 
                  type="number"
                  disabled={newAccIsGroup}
                  value={newAccBalance}
                  onChange={(e) => setNewAccBalance(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 text-xs font-bold outline-none disabled:opacity-40"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-404 block">Currency</label>
                <select 
                  value={newAccCurrency}
                  onChange={(e) => setNewAccCurrency(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 text-xs font-bold outline-none"
                >
                  {CURRENCIES.map(curr => (
                    <option key={curr} value={curr}>{curr}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-404 block">Cost Center assignment</label>
                <select 
                  value={newAccCostCenter}
                  onChange={(e) => setNewAccCostCenter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 text-xs font-bold outline-none"
                >
                  <option value="">-- No Cost Center --</option>
                  <option value="HQA">Administration (HQA)</option>
                  <option value="PRD">Manufacturing Facility (PRD)</option>
                  <option value="SLS">Retail Sales Hub (SLS)</option>
                  <option value="LOG">Transportation Logistics (LOG)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input 
                  type="checkbox"
                  id="cbIsGroup"
                  checked={newAccIsGroup}
                  onChange={(e) => setNewAccIsGroup(e.target.checked)}
                  className="w-4 h-4 accent-indigo-650"
                />
                <label htmlFor="cbIsGroup" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Mark as Group Account
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border text-slate-500 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-50"
              >
                Dismiss
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-transform hover:-translate-y-0.5"
              >
                Assemble Ledger
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default ChartOfAccounts;
