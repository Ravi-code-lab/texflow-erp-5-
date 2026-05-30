
import React, { useState, useEffect } from 'react';
import { 
  Building, RefreshCw, Landmark, LayoutGrid, Brush, Shield, 
  Save, Image as ImageIcon, Database, FolderSearch, Activity, History,
  Sun, Moon, Check, Download, Landmark as BankIcon, Settings2, Trash2,
  ShoppingCart, Truck, Factory, Boxes, Wallet, Briefcase, HardDrive, Terminal,
  FileDigit, Globe, Server, RotateCcw, IndianRupee, Coins, Undo2, Banknote,
  FlaskRound, MapPin, ShieldCheck, Layers, Palette, Archive, SearchCheck,
  BookOpen, Fingerprint, Store, Info, Plus, Minus, Monitor
} from 'lucide-react';
import { exportAllDataToZip, restoreDataFromZip } from '../utils/indexedDB';
import { 
  TeamMember, UIPreferences, CompanyInfo, 
  InvoiceConfig, ShopifyConfig, SecurityConfig, CommunicationConfig, AdvancedConfig
} from '../types';

const isElectron = typeof window !== 'undefined' && (window as any).process && (window as any).process.type === 'renderer';
const ipc = isElectron ? (window as any).require('electron').ipcRenderer : null;

interface SettingsProps {
  invoiceConfig?: InvoiceConfig;
  onUpdateInvoiceConfig?: (config: InvoiceConfig) => void;
  features?: Record<string, boolean>;
  onUpdateFeatures?: (features: Record<string, boolean>) => void;
  shopifyConfig?: ShopifyConfig;
  onUpdateShopifyConfig?: (config: ShopifyConfig) => void;
  securityConfig?: SecurityConfig;
  onUpdateSecurityConfig?: (config: SecurityConfig) => void;
  communicationConfig?: CommunicationConfig;
  onUpdateCommunicationConfig?: (config: CommunicationConfig) => void;
  advancedConfig?: AdvancedConfig;
  onUpdateAdvancedConfig?: (config: AdvancedConfig) => void;
  team: TeamMember[];
  uiPrefs: UIPreferences;
  onUpdateUiPrefs: (prefs: UIPreferences) => void;
  companyInfo: CompanyInfo;
  onUpdateCompanyInfo: (info: CompanyInfo) => void;
  lastSync: string;
}

const Settings: React.FC<SettingsProps> = ({ 
  uiPrefs, onUpdateUiPrefs, companyInfo, onUpdateCompanyInfo, 
  features = {}, onUpdateFeatures, invoiceConfig, onUpdateInvoiceConfig,
  shopifyConfig, onUpdateShopifyConfig,
  securityConfig, onUpdateSecurityConfig,
  communicationConfig, onUpdateCommunicationConfig,
  advancedConfig, onUpdateAdvancedConfig,
  lastSync
}) => {
  const [activeTab, setActiveTab] = useState<'COMPANY' | 'BILLING' | 'MODULES' | 'CUSTOMIZER' | 'THEME' | 'STORAGE' | 'INTEGRATIONS' | 'SECURITY' | 'COMMUNICATION' | 'ADVANCED'>('COMPANY');
  const [isSaving, setIsSaving] = useState(false);
  const [vaultStatus, setVaultStatus] = useState<any>(null);
  
  // Custom DocType Fields representation (ERPNext feature)
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [newField, setNewField] = useState({
    docType: 'Customer',
    label: '',
    type: 'text',
    options: '',
    placeholder: '',
    required: false
  });

  useEffect(() => {
    const raw = localStorage.getItem('erpnext_custom_fields');
    if (raw) {
      try { setCustomFields(JSON.parse(raw)); } catch (e) { console.error(e); }
    }
  }, []);

  const saveCustomFields = (fields: any[]) => {
    setCustomFields(fields);
    localStorage.setItem('erpnext_custom_fields', JSON.stringify(fields));
  };
  
  // Local form state
  const [localCompany, setLocalCompany] = useState<CompanyInfo>(companyInfo);
  const [localInvoice, setLocalInvoice] = useState<InvoiceConfig>(invoiceConfig || {
    prefix: 'INV/', 
    nextNumber: 1001, 
    defaultGst: 5, 
    terms: '', 
    bankDetails: '', 
    currency: '₹'
  });
  const [localShopify, setLocalShopify] = useState<ShopifyConfig>(shopifyConfig || { shopUrl: '', accessToken: '', enabled: false });
  const [localSecurity, setLocalSecurity] = useState<SecurityConfig>(securityConfig || { geminiApiKey: '', sessionTimeout: 30, twoFactorEnabled: false });
  const [localCommunication, setLocalCommunication] = useState<CommunicationConfig>(communicationConfig || { smtpHost: '', smtpPort: 587, smtpUser: '', smtpPass: '', whatsappEnabled: false });
  const [localAdvanced, setLocalAdvanced] = useState<AdvancedConfig>(advancedConfig || { enableAuditLogs: true, auditLogRetentionDays: 90, debugMode: false, autoBackupInterval: 24 });

  // Sync local state when props update
  useEffect(() => {
    setLocalCompany(companyInfo);
  }, [companyInfo]);

  useEffect(() => {
    if (invoiceConfig) setLocalInvoice(invoiceConfig);
  }, [invoiceConfig]);

  useEffect(() => {
    if (shopifyConfig) setLocalShopify(shopifyConfig);
  }, [shopifyConfig]);

  useEffect(() => {
    if (securityConfig) setLocalSecurity(securityConfig);
  }, [securityConfig]);

  useEffect(() => {
    if (communicationConfig) setLocalCommunication(communicationConfig);
  }, [communicationConfig]);

  useEffect(() => {
    if (advancedConfig) setLocalAdvanced(advancedConfig);
  }, [advancedConfig]);

  const refreshVaultInfo = async () => {
    if (isElectron && ipc) {
        const info = await ipc.invoke('storage:info');
        setVaultStatus(info);
    }
  };

  useEffect(() => {
    refreshVaultInfo();
    const interval = setInterval(() => {
        if (activeTab === 'STORAGE') refreshVaultInfo();
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsSaving(true);
    await onUpdateCompanyInfo(localCompany);
    await onUpdateInvoiceConfig?.(localInvoice);
    await onUpdateShopifyConfig?.(localShopify);
    await onUpdateSecurityConfig?.(localSecurity);
    await onUpdateCommunicationConfig?.(localCommunication);
    await onUpdateAdvancedConfig?.(localAdvanced);
    setTimeout(() => setIsSaving(false), 800);
  };

  const handleVaultAction = async (action: 'SELECT' | 'BACKUP' | 'RESTORE_ZIP' | 'RESTORE_FOLDER' | 'VERIFY') => {
    if (!ipc) {
        if (action === 'BACKUP') {
            try {
                await exportAllDataToZip();
            } catch (e) {
                alert("Backup failed: " + e);
            }
        } else if (action === 'RESTORE_ZIP') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.zip';
            input.onchange = async (e: any) => {
                const file = e.target.files[0];
                if (file) {
                    if (window.confirm("Are you sure? This will OVERWRITE all current data with the contents of the ZIP file.")) {
                        try {
                            await restoreDataFromZip(file);
                            window.location.reload();
                        } catch (err) {
                            alert("Restore failed. Ensure it's a valid TexFlow Backup ZIP.");
                        }
                    }
                }
            };
            input.click();
        } else {
            alert("This operation requires the Desktop (Electron) version of TexFlow ERP.");
        }
        return;
    }
    try {
        let res;
        if (action === 'SELECT') res = await ipc.invoke('storage:select-path');
        else if (action === 'BACKUP') res = await ipc.invoke('storage:backup');
        else if (action === 'RESTORE_ZIP') res = await ipc.invoke('storage:restore-zip');
        else if (action === 'RESTORE_FOLDER') res = await ipc.invoke('storage:restore-folder');
        else if (action === 'VERIFY') res = await ipc.invoke('storage:verify');

        if (res?.success) {
            await refreshVaultInfo();
            if (action === 'RESTORE_ZIP' || action === 'RESTORE_FOLDER') window.location.reload();
        } else if (res?.error) {
            alert(`Storage Error: ${res.error}`);
        }
    } catch (e) { console.error(e); }
  };

  const toggleFeature = (id: string) => {
    const isCurrentlyEnabled = features[id] !== false;
    onUpdateFeatures?.({
      ...features,
      [id]: !isCurrentlyEnabled
    });
  };

  const moduleGroups = [
    {
      id: 'SALES',
      label: 'Sales Matrix',
      icon: ShoppingCart,
      subs: [
        { id: 'ORDERS', label: 'Sales Orders' },
        { id: 'DELIVERY_CHALLAN', label: 'Delivery Challans' },
        { id: 'TAX_INVOICE', label: 'Tax Invoices' },
        { id: 'SALES_RETURN', label: 'Sales Returns' },
        { id: 'CREDIT_NOTE', label: 'Credit Notes' },
        { id: 'CRM', label: 'Lead & Sampling' }
      ]
    },
    {
      id: 'PURCHASING',
      label: 'Procurement Hub',
      icon: Truck,
      subs: [
        { id: 'PURCHASE_ORDER', label: 'Purchase Orders' },
        { id: 'PURCHASE_INWARD', label: 'Stock Inward (GRN)' },
        { id: 'PURCHASE_RETURN', label: 'Purchase Returns' },
        { id: 'DEBIT_NOTE', label: 'Debit Notes' }
      ]
    },
    {
      id: 'PRODUCTION',
      label: 'Manufacturing Unit',
      icon: Factory,
      subs: [
        { id: 'DESIGN_RECIPE', label: 'SKU Recipes / BOM' },
        { id: 'SAMPLING', label: 'Sample Tracker' },
        { id: 'PRODUCTION', label: 'Job Slips / Lots' },
        { id: 'TRACK_LOTS', label: 'Lot Convergence' },
        { id: 'JOB_WORK', label: 'External Jobwork' },
        { id: 'QUALITY', label: 'Quality Audit' }
      ]
    },
    {
      id: 'INVENTORY',
      label: 'Material & Assets',
      icon: Boxes,
      subs: [
        { id: 'INVENTORY', label: 'Opening Stock' },
        { id: 'CATALOG', label: 'Product Catalog' },
        { id: 'STOCK_TRANSFER', label: 'Godown Transfer' },
        { id: 'PACK_DESIGN', label: 'Set / Combo Design' },
        { id: 'STOCK_AUDIT', label: 'Physical Audit' },
        { id: 'ASSETS', label: 'Machine Assets' }
      ]
    },
    {
      id: 'FINANCE',
      label: 'Financial Khata Hub',
      icon: Wallet,
      subs: [
        { id: 'ACCOUNTING', label: 'Party Ledger' },
        { id: 'KARIGAR_KHATA', label: 'Karigar Settlement' },
        { id: 'AGENT_KHATA', label: 'Broker Payouts' },
        { id: 'CASH_BOOK', label: 'Cash / Bank Book' },
        { id: 'ATTENDANCE', label: 'Staff Attendance' },
        { id: 'PAYROLL', label: 'Payroll & Loans' }
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 animate-fade-in font-sans">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Settings2 className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">System Configuration</h2>
        </div>
        <div className="flex items-center gap-3">
           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded border dark:border-slate-700">Last Sync: {lastSync || '00:00:00'}</span>
           <button type="button" onClick={() => window.location.reload()} className="p-2 border rounded-lg text-slate-400 hover:text-indigo-600 transition-colors shadow-sm"><RefreshCw className="w-4 h-4"/></button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 overflow-x-auto flex-none scroll-smooth">
          <div className="flex gap-4 sm:gap-8 min-w-max">
              {[
                { id: 'COMPANY', label: 'Company', icon: Building },
                { id: 'BILLING', label: 'Billing', icon: Coins },
                { id: 'MODULES', label: 'Modules', icon: LayoutGrid },
                { id: 'CUSTOMIZER', label: 'DocType Customizer', icon: Settings2 },
                { id: 'INTEGRATIONS', label: 'Integrations', icon: Store },
                { id: 'SECURITY', label: 'Security', icon: ShieldCheck },
                { id: 'COMMUNICATION', label: 'Network', icon: Globe },
                { id: 'THEME', label: 'Display', icon: Brush },
                { id: 'STORAGE', label: 'Backup & Restore', icon: Shield },
                { id: 'ADVANCED', label: 'Advanced', icon: Terminal }
              ].map(t => (
                  <button 
                    key={t.id} 
                    onClick={() => setActiveTab(t.id as any)} 
                    className={`py-4 px-1 text-xs font-bold border-b-2 transition-all uppercase tracking-normal flex items-center gap-2 whitespace-nowrap ${activeTab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                     <t.icon className="w-3.5 h-3.5"/> {t.label}
                  </button>
              ))}
          </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <form onSubmit={handleSave} className="flex flex-col lg:flex-row gap-6 pb-20 max-w-6xl mx-auto">
              <div className="flex-1 space-y-6">
                  {activeTab === 'COMPANY' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-5 animate-fade-in">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase border-b pb-2 mb-4">Organization Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 px-1">Legal Company Name</label>
                                <input className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-bold bg-white dark:bg-slate-950 outline-none focus:ring-1 focus:ring-indigo-500" value={localCompany.name} onChange={e => setLocalCompany({...localCompany, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 px-1">GST Registration No.</label>
                                <input className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-mono bg-white dark:bg-slate-950 uppercase" value={localCompany.gstin} onChange={e => setLocalCompany({...localCompany, gstin: e.target.value.toUpperCase()})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 px-1">Official Email Address</label>
                                <input className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-950" value={localCompany.email} onChange={e => setLocalCompany({...localCompany, email: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 px-1">Contact Phone</label>
                                <input className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-950" value={localCompany.phone || ''} onChange={e => setLocalCompany({...localCompany, phone: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 px-1">PAN Number</label>
                                <input className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-mono bg-white dark:bg-slate-950 uppercase" value={localCompany.pan || ''} onChange={e => setLocalCompany({...localCompany, pan: e.target.value.toUpperCase()})} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 px-1">Office Address</label>
                                <textarea className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-950 outline-none focus:ring-1 focus:ring-indigo-500" rows={2} value={localCompany.address} onChange={e => setLocalCompany({...localCompany, address: e.target.value})} />
                            </div>
                        </div>

                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase border-b pb-2 mt-8 mb-4">Bank Details (For Invoicing)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 px-1">Bank Name</label>
                                <input className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-bold bg-white dark:bg-slate-950" value={localCompany.bankName || ''} onChange={e => setLocalCompany({...localCompany, bankName: e.target.value.toUpperCase()})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 px-1">Account Number</label>
                                <input className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-mono bg-white dark:bg-slate-950" value={localCompany.accountNumber || ''} onChange={e => setLocalCompany({...localCompany, accountNumber: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 px-1">IFSC Code</label>
                                <input className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-mono bg-white dark:bg-slate-950 uppercase" value={localCompany.ifscCode || ''} onChange={e => setLocalCompany({...localCompany, ifscCode: e.target.value.toUpperCase()})} />
                            </div>
                        </div>
                    </div>
                  )}

                  {activeTab === 'CUSTOMIZER' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6 animate-fade-in text-left">
                        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">Frappe DocType CRM & Custom Fields</h3>
                                <p className="text-xs text-slate-500 mt-1">Design and inject custom metadata fields into primary ERP documents (DocTypes).</p>
                            </div>
                            <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded">ERPNext engine</span>
                        </div>

                        {/* Add Field Section */}
                        <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                            <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Add Custom Field Entry</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Target DocType</label>
                                    <select 
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs font-bold"
                                        value={newField.docType}
                                        onChange={e => setNewField({...newField, docType: e.target.value})}
                                    >
                                        <option value="Customer">Customer Master</option>
                                        <option value="Order">Sales Order (Invoice)</option>
                                        <option value="InventoryItem">Yarn/Stock Item</option>
                                        <option value="ProductionJob">Production Lot</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Field Title / Label</label>
                                    <input 
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs font-bold outline-none ring-offset-current focus:ring-1 focus:ring-indigo-500"
                                        placeholder="e.g. Quality Grade"
                                        value={newField.label}
                                        onChange={e => setNewField({...newField, label: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Information Type</label>
                                    <select 
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs font-bold"
                                        value={newField.type}
                                        onChange={e => setNewField({...newField, type: e.target.value})}
                                    >
                                        <option value="text">Single Line Text</option>
                                        <option value="number">Numeric</option>
                                        <option value="date">Date Selector</option>
                                        <option value="select">Dropdown Selection</option>
                                    </select>
                                </div>
                                {newField.type === 'select' && (
                                    <div className="md:col-span-2 space-y-1">
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Options (Comma separated list)</label>
                                        <input 
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs font-medium"
                                            placeholder="Standard, Premium, Gold Label, Super Luxury"
                                            value={newField.options}
                                            onChange={e => setNewField({...newField, options: e.target.value})}
                                        />
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Placeholder Guidance</label>
                                    <input 
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                                        placeholder="e.g. Choose grade value..."
                                        value={newField.placeholder}
                                        onChange={e => setNewField({...newField, placeholder: e.target.value})}
                                    />
                                </div>
                                <div className="flex items-center gap-2 pt-4">
                                    <input 
                                        type="checkbox" 
                                        id="cf_required"
                                        className="rounded border-slate-200 dark:border-slate-800 focus:ring-indigo-500"
                                        checked={newField.required}
                                        onChange={e => setNewField({...newField, required: e.target.checked})}
                                    />
                                    <label htmlFor="cf_required" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer">Required input</label>
                                </div>
                            </div>
                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!newField.label.trim()) return;
                                        const key = newField.label.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
                                        const parsedField = {
                                            id: `cf_${Date.now()}`,
                                            key,
                                            docType: newField.docType,
                                            label: newField.label.trim(),
                                            type: newField.type,
                                            options: newField.type === 'select' ? newField.options.split(',').map(s => s.trim()).filter(Boolean) : [],
                                            placeholder: newField.placeholder || `Enter ${newField.label}`,
                                            required: newField.required
                                        };
                                        saveCustomFields([...customFields, parsedField]);
                                        setNewField({
                                            docType: 'Customer',
                                            label: '',
                                            type: 'text',
                                            options: '',
                                            placeholder: '',
                                            required: false
                                        });
                                    }}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                                >
                                    + Inject Custom Column
                                </button>
                            </div>
                        </div>

                        {/* List of custom fields */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Active Custom Field Extensions</h4>
                            {customFields.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">No custom field extensions defined yet. Add fields above to upgrade your documents with Frappe capabilities.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {customFields.map(f => (
                                        <div key={f.id} className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg flex justify-between items-center text-xs group hover:border-indigo-500/50 transition-all">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-tight">{f.label}</span>
                                                    <span className="text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase font-bold px-1 rounded">{f.type}</span>
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">
                                                    DocType: <strong className="text-slate-600 dark:text-slate-400 font-bold">{f.docType}</strong> | Required: {f.required ? 'YES' : 'NO'}
                                                </div>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => saveCustomFields(customFields.filter(cf => cf.id !== f.id))}
                                                className="text-slate-400 hover:text-red-500 p-1.5 rounded bg-transparent opacity-100 dark:opacity-80 transition-opacity"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                  )}

                  {activeTab === 'BILLING' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-5 animate-fade-in">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase border-b pb-2 mb-4 flex items-center gap-2">
                           <IndianRupee className="w-4 h-4" /> Global Currency & Tax Protocol
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 px-1">Global Currency Symbol</label>
                                <div className="flex gap-2">
                                   <input 
                                      className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-black bg-slate-50 dark:bg-slate-950 outline-none focus:ring-1 focus:ring-indigo-500" 
                                      value={localInvoice.currency} 
                                      onChange={e => setLocalInvoice({...localInvoice, currency: e.target.value})} 
                                      placeholder="₹"
                                   />
                                   <div className="flex gap-1">
                                      {['₹', '$', '€', '£'].map(sym => (
                                         <button 
                                            key={sym}
                                            type="button"
                                            onClick={() => setLocalInvoice({...localInvoice, currency: sym})}
                                            className={`w-10 h-10 rounded-lg border font-bold text-sm transition-all ${localInvoice.currency === sym ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-400 hover:border-indigo-400'}`}
                                         >
                                            {sym}
                                         </button>
                                      ))}
                                   </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 px-1">Default Sales Tax (%)</label>
                                <input type="number" className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-bold bg-white dark:bg-slate-950 outline-none" value={localInvoice.defaultGst} onChange={e => setLocalInvoice({...localInvoice, defaultGst: Number(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 px-1">Invoice Prefix</label>
                                <input className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-mono font-bold bg-white dark:bg-slate-950" value={localInvoice.prefix} onChange={e => setLocalInvoice({...localInvoice, prefix: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 px-1">Next Sequence No.</label>
                                <input type="number" className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-black bg-white dark:bg-slate-950" value={localInvoice.nextNumber} onChange={e => setLocalInvoice({...localInvoice, nextNumber: Number(e.target.value)})} />
                            </div>
                        </div>
                    </div>
                  )}

                  {activeTab === 'INTEGRATIONS' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6 animate-fade-in">
                        <div className="flex items-center justify-between border-b pb-4">
                           <div className="flex items-center gap-3">
                              <div className="p-3 bg-green-500 rounded-2xl text-white shadow-lg"><Store className="w-6 h-6"/></div>
                              <div>
                                 <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">Shopify Integration</h3>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Connect your online store for seamless fulfillment</p>
                              </div>
                           </div>
                           <div className="relative">
                               <input type="checkbox" className="sr-only peer" checked={localShopify.enabled} onChange={e => setLocalShopify({...localShopify, enabled: e.target.checked})} id="shopify-toggle" />
                               <label htmlFor="shopify-toggle" className="block w-12 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer-checked:bg-green-500 cursor-pointer relative transition-colors shadow-inner">
                                  <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-6 shadow-md"></div>
                               </label>
                           </div>
                        </div>

                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity ${localShopify.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 px-1 tracking-widest">Shop Domain URL</label>
                                <input className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-bold bg-white dark:bg-slate-950 outline-none" value={localShopify.shopUrl} onChange={e => setLocalShopify({...localShopify, shopUrl: e.target.value})} placeholder="your-store.myshopify.com" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 px-1 tracking-widest">Custom App Admin API Access Token</label>
                                <input type="password" className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-mono bg-white dark:bg-slate-950 outline-none" value={localShopify.accessToken} onChange={e => setLocalShopify({...localShopify, accessToken: e.target.value})} placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxx" />
                            </div>
                        </div>
                        
                        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex gap-3">
                           {/* Fix: Info icon imported from lucide-react below */}
                           <Info className="w-5 h-5 text-blue-500 shrink-0"/>
                           <p className="text-[10px] text-slate-500 uppercase font-medium leading-relaxed">
                               Enable Shopify integration to fetch online orders directly into the Delivery Challan module. This requires a "Custom App" to be created in your Shopify Admin Settings with "Read Orders" permissions.
                           </p>
                        </div>
                    </div>
                  )}

                  {activeTab === 'SECURITY' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6 animate-fade-in">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase border-b pb-2 mb-4 flex items-center gap-2">
                           <ShieldCheck className="w-4 h-4" /> Security & API Protocols
                        </h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 px-1 tracking-widest">Session Timeout (Minutes)</label>
                                    <input type="number" className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-bold bg-white dark:bg-slate-950 outline-none" value={localSecurity.sessionTimeout} onChange={e => setLocalSecurity({...localSecurity, sessionTimeout: Number(e.target.value)})} />
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase">Two-Factor Auth</h4>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Enhanced login security</p>
                                    </div>
                                    <div className="relative">
                                        <input type="checkbox" className="sr-only peer" checked={localSecurity.twoFactorEnabled} onChange={e => setLocalSecurity({...localSecurity, twoFactorEnabled: e.target.checked})} id="2fa-toggle" />
                                        <label htmlFor="2fa-toggle" className="block w-10 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer-checked:bg-indigo-600 cursor-pointer relative transition-colors">
                                            <div className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-sm"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                  )}

                  {activeTab === 'COMMUNICATION' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6 animate-fade-in">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase border-b pb-2 mb-4 flex items-center gap-2">
                           <Globe className="w-4 h-4" /> Communication Gateways
                        </h3>
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SMTP Email Configuration</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 px-1">SMTP Host</label>
                                        <input className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-bold bg-white dark:bg-slate-950 outline-none" value={localCommunication.smtpHost} onChange={e => setLocalCommunication({...localCommunication, smtpHost: e.target.value})} placeholder="smtp.gmail.com" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 px-1">SMTP Port</label>
                                        <input type="number" className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-bold bg-white dark:bg-slate-950 outline-none" value={localCommunication.smtpPort} onChange={e => setLocalCommunication({...localCommunication, smtpPort: Number(e.target.value)})} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 px-1">User / Email</label>
                                        <input className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-bold bg-white dark:bg-slate-950 outline-none" value={localCommunication.smtpUser} onChange={e => setLocalCommunication({...localCommunication, smtpUser: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 px-1">Password / App Key</label>
                                        <input type="password" className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-bold bg-white dark:bg-slate-950 outline-none" value={localCommunication.smtpPass} onChange={e => setLocalCommunication({...localCommunication, smtpPass: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/20">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-500 rounded-lg text-white"><Globe className="w-4 h-4"/></div>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase">WhatsApp Integration</h4>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Send automated order updates via WhatsApp</p>
                                    </div>
                                </div>
                                <div className="relative">
                                    <input type="checkbox" className="sr-only peer" checked={localCommunication.whatsappEnabled} onChange={e => setLocalCommunication({...localCommunication, whatsappEnabled: e.target.checked})} id="wa-toggle" />
                                    <label htmlFor="wa-toggle" className="block w-10 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer-checked:bg-green-500 cursor-pointer relative transition-colors">
                                        <div className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-sm"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                  )}

                  {activeTab === 'ADVANCED' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6 animate-fade-in">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase border-b pb-2 mb-4 flex items-center gap-2">
                           <Terminal className="w-4 h-4" /> Advanced System Matrix
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase">Audit Logging</h4>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Track every system modification</p>
                                </div>
                                <div className="relative">
                                    <input type="checkbox" className="sr-only peer" checked={localAdvanced.enableAuditLogs} onChange={e => setLocalAdvanced({...localAdvanced, enableAuditLogs: e.target.checked})} id="audit-toggle" />
                                    <label htmlFor="audit-toggle" className="block w-10 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer-checked:bg-indigo-600 cursor-pointer relative transition-colors">
                                        <div className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-sm"></div>
                                    </label>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20">
                                <div>
                                    <h4 className="text-xs font-bold text-red-600 uppercase">Debug Mode</h4>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Enable verbose console logging</p>
                                </div>
                                <div className="relative">
                                    <input type="checkbox" className="sr-only peer" checked={localAdvanced.debugMode} onChange={e => setLocalAdvanced({...localAdvanced, debugMode: e.target.checked})} id="debug-toggle" />
                                    <label htmlFor="debug-toggle" className="block w-10 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer-checked:bg-red-500 cursor-pointer relative transition-colors">
                                        <div className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-sm"></div>
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 px-1 tracking-widest">Audit Log Retention (Days)</label>
                                <input type="number" className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-bold bg-white dark:bg-slate-950 outline-none" value={localAdvanced.auditLogRetentionDays} onChange={e => setLocalAdvanced({...localAdvanced, auditLogRetentionDays: Number(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 px-1 tracking-widest">Auto-Backup Interval (Hours)</label>
                                <input type="number" className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-bold bg-white dark:bg-slate-950 outline-none" value={localAdvanced.autoBackupInterval} onChange={e => setLocalAdvanced({...localAdvanced, autoBackupInterval: Number(e.target.value)})} />
                            </div>
                        </div>
                    </div>
                  )}

                  {activeTab === 'MODULES' && (
                    <div className="space-y-6 animate-fade-in">
                        {moduleGroups.map(group => (
                          <div key={group.id} className="space-y-2">
                             <div className="flex items-center gap-2 mb-2">
                                <group.icon className="w-4 h-4 text-slate-400" />
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{group.label}</h3>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {group.subs.map(sub => (
                                   <div key={sub.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
                                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">{sub.label}</span>
                                      <div className="relative">
                                         <input type="checkbox" className="sr-only peer" checked={features[sub.id] !== false} onChange={() => toggleFeature(sub.id)} id={`feat-${sub.id}`} />
                                         <label htmlFor={`feat-${sub.id}`} className="block w-10 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer-checked:bg-indigo-600 cursor-pointer relative transition-colors">
                                            <div className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-sm"></div>
                                         </label>
                                      </div>
                                   </div>
                                ))}
                             </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {activeTab === 'THEME' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button type="button" onClick={() => onUpdateUiPrefs({...uiPrefs, theme: 'light'})} className={`p-8 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 ${uiPrefs.theme === 'light' ? 'border-indigo-600 bg-white shadow-sm' : 'bg-slate-100 dark:bg-slate-900 border-transparent text-slate-400 grayscale'}`}>
                               <Sun className="w-10 h-10" />
                               <span className="font-bold uppercase tracking-widest text-[10px]">Standard Light Mode</span>
                            </button>
                            <button type="button" onClick={() => onUpdateUiPrefs({...uiPrefs, theme: 'dark'})} className={`p-8 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 ${uiPrefs.theme === 'dark' ? 'border-indigo-600 bg-slate-900 shadow-sm' : 'bg-slate-100 dark:bg-slate-900 border-transparent text-slate-400 grayscale'}`}>
                               <Moon className="w-10 h-10" />
                               <span className="font-bold uppercase tracking-widest text-[10px]">Industrial Dark Mode</span>
                            </button>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase border-b pb-2 mb-4">Regional & Notifications</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 px-1">System Language</label>
                                    <select className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-bold bg-white dark:bg-slate-950 outline-none" value={uiPrefs.language || 'en'} onChange={e => onUpdateUiPrefs({...uiPrefs, language: e.target.value})}>
                                        <option value="en">English (US)</option>
                                        <option value="hi">Hindi (हिन्दी)</option>
                                        <option value="gu">Gujarati (ગુજરાતી)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 px-1">Date Format</label>
                                    <select className="w-full border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-sm font-bold bg-white dark:bg-slate-950 outline-none" value={uiPrefs.dateFormat || 'DD/MM/YYYY'} onChange={e => onUpdateUiPrefs({...uiPrefs, dateFormat: e.target.value})}>
                                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2 flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase">Enable Push Notifications</h4>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Receive alerts for low stock and production delays</p>
                                    </div>
                                    <div className="relative">
                                        <input type="checkbox" className="sr-only peer" checked={uiPrefs.enableNotifications !== false} onChange={e => onUpdateUiPrefs({...uiPrefs, enableNotifications: e.target.checked})} id="notif-toggle" />
                                        <label htmlFor="notif-toggle" className="block w-10 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer-checked:bg-indigo-600 cursor-pointer relative transition-colors">
                                            <div className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-sm"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg"><Monitor className="w-6 h-6"/></div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">Software Interface Scale</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Adjust the overall size of text and UI elements</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button 
                                    type="button" 
                                    onClick={() => onUpdateUiPrefs({...uiPrefs, scale: Math.max(0.8, (uiPrefs.scale || 1) - 0.1)})}
                                    className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <div className="flex flex-col items-center min-w-[80px]">
                                    <span className="text-lg font-black text-indigo-600 uppercase">
                                        {(uiPrefs.scale || 1) <= 0.8 ? 'XS' : 
                                         (uiPrefs.scale || 1) <= 0.9 ? 'SM' : 
                                         (uiPrefs.scale || 1) <= 1.0 ? 'MD' : 
                                         (uiPrefs.scale || 1) <= 1.1 ? 'LG' : 'XL'}
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Interface Size</span>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => onUpdateUiPrefs({...uiPrefs, scale: Math.min(1.2, (uiPrefs.scale || 1) + 0.1)})}
                                    className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex gap-4">
                                {[
                                    { s: 0.8, l: 'XS' }, 
                                    { s: 0.9, l: 'SM' }, 
                                    { s: 1.0, l: 'MD' }, 
                                    { s: 1.1, l: 'LG' }, 
                                    { s: 1.2, l: 'XL' }
                                ].map(item => (
                                    <button 
                                        key={item.l}
                                        type="button"
                                        onClick={() => onUpdateUiPrefs({...uiPrefs, scale: item.s})}
                                        className={`flex-1 py-2 rounded-lg border font-bold text-[10px] transition-all ${Math.abs((uiPrefs.scale || 1) - item.s) < 0.05 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-transparent hover:border-indigo-400'}`}
                                    >
                                        {item.l}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                  )}

                  {activeTab === 'STORAGE' && (
                    <div className="space-y-6 animate-fade-in">
                       <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl border border-white/5">
                          <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><Shield className="w-48 h-48"/></div>
                          <div className="relative z-10 flex-1">
                             <div className="flex items-center gap-3 mb-3">
                                <Database className="w-6 h-6 text-indigo-400" />
                                <h3 className="text-xl font-black uppercase tracking-tight">Database Storage Control</h3>
                             </div>
                             <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.2em] leading-relaxed">Compressed local backup system with journaled integrity logging.</p>
                             
                             <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
                                <HardDrive className="w-4 h-4 text-indigo-400" />
                                <div className="overflow-hidden">
                                   <p className="text-[8px] text-indigo-400 font-extrabold uppercase tracking-widest">Active Mount Point</p>
                                   <p className="text-[10px] font-mono font-medium truncate opacity-80" title={vaultStatus?.vaultRoot || 'PENDING'}>
                                       {vaultStatus?.vaultRoot || (isElectron ? 'PLEASE SELECT PATH' : 'BROWSER_SIMULATED_SESSION')}
                                   </p>
                                </div>
                             </div>
                          </div>
                             <div className="flex gap-3 shrink-0 relative z-10 font-bold">
                               <button type="button" onClick={() => handleVaultAction('SELECT')} className="bg-white text-slate-900 px-6 py-3 rounded-xl uppercase text-[10px] hover:bg-slate-100 transition-all flex items-center gap-2 shadow-lg"><FolderSearch className="w-4 h-4"/> Select Path</button>
                               <button type="button" onClick={() => handleVaultAction('RESTORE_ZIP')} className="bg-slate-800 text-white px-6 py-3 rounded-xl uppercase text-[10px] hover:bg-slate-700 transition-all flex items-center gap-2 shadow-lg"><Download className="w-4 h-4"/> Restore ZIP</button>
                               <button type="button" onClick={() => handleVaultAction('BACKUP')} className="bg-indigo-600 text-white px-6 py-3 rounded-xl uppercase text-[10px] hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg"><RefreshCw className="w-4 h-4"/> Backup (ZIP)</button>
                             </div>
                       </div>
                       
                       {/* Backup Logs */}
                       <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                             <div className="flex items-center gap-3">
                                <Activity className="w-4 h-4 text-slate-400" />
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Journaled Backup Logs</h3>
                             </div>
                             <button type="button" onClick={refreshVaultInfo} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-tighter">Refresh Logs</button>
                          </div>
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                             {vaultStatus?.logs && vaultStatus.logs.length > 0 ? (
                               vaultStatus.logs.map((log: string, idx: number) => (
                                  <div key={idx} className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800 font-mono text-[10px] items-start">
                                     <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1 shrink-0"></div>
                                     <span className="text-slate-600 dark:text-slate-400 break-all">{log}</span>
                                  </div>
                               ))
                             ) : (
                               <div className="flex flex-col items-center py-8 text-slate-400">
                                  <History className="w-8 h-8 opacity-20 mb-2" />
                                  <p className="text-[10px] font-bold uppercase tracking-widest">No recent backup logs found</p>
                               </div>
                             )}
                          </div>
                       </div>
                    </div>
                  )}
              </div>

              {/* Sidebar Action Block */}
              <div className="w-full lg:w-64 space-y-4 shrink-0">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Control Matrix</h4>
                      <button 
                        type="submit" 
                        disabled={isSaving}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
                      >
                         {isSaving ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>} Commit State
                      </button>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-3">System Health</h4>
                      <div className="space-y-4">
                         <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-slate-400 uppercase tracking-tighter">Shards</span>
                            <span className="text-slate-700 dark:text-white">{vaultStatus?.shardCount || 0} Functional Nodes</span>
                         </div>
                         <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" style={{width: '100%'}}></div>
                         </div>
                         <p className="text-[8px] text-slate-400 uppercase font-medium italic text-center">Physical integrity verified via manifest</p>
                      </div>
                  </div>
              </div>
          </form>
      </div>
    </div>
  );
};

export default Settings;
