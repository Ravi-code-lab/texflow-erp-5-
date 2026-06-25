import React, { useMemo, useState } from 'react';
import { ArrowRight, Database, FileText, GitBranch, KeyRound, Layers, Search, ShieldCheck, Plus, Edit2, Save, X, Trash2, Cpu, Terminal, AlertTriangle, CheckCircle, Sliders, Play, Code } from 'lucide-react';
import { ViewState, UserRole } from '../types';
import { DOCTYPE_SCHEMAS, DocTypeSchema, DocField, saveCustomDocTypeSchema } from '../modules/doctypes';
import { ERP_MODULE_ITEMS, MODULE_COLOR_MAP } from '../modules/registry';
import { canAccessView } from '../modules/permissions';
import { getWorkflowForView } from '../modules/workflows';

export interface DocTypeStat {
  total: number;
  draft: number;
  submitted: number;
  cancelled: number;
  statusCounts: Record<string, number>;
}

interface DocTypeCenterProps {
  stats: Partial<Record<ViewState, DocTypeStat>>;
  userRole?: UserRole;
  onNavigate: (view: ViewState) => void;
}

const emptyStat: DocTypeStat = {
  total: 0,
  draft: 0,
  submitted: 0,
  cancelled: 0,
  statusCounts: {},
};

const fieldTone: Record<string, string> = {
  Data: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Date: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  Currency: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  Float: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
  Int: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
  Select: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  Table: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  Link: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  Check: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
};

const SCRIPT_PRESETS: Record<string, { name: string; trigger: string; description: string; mockData: Record<string, any>; code: string }[]> = {
  ORDERS: [
    {
      name: 'Credit Limit Safeguard',
      trigger: 'validate',
      description: 'Check if sales order exceeds customer remaining limit.',
      mockData: { customer_name: 'Shree Balaji Apparels', total_amount: 125000, credit_limit: 80000 },
      code: `frappe.ui.form.on('Sales Order', {
  validate: function(frm) {
    if (frm.doc.total_amount > frm.doc.credit_limit) {
      frappe.msgprint({
        title: 'Credit Limit Exceeded',
        message: 'Order total (₹' + frm.doc.total_amount + ') exceeds customer outstanding limit (₹' + frm.doc.credit_limit + ')',
        indicator: 'red'
      });
      frappe.validated = false;
    } else {
      frappe.msgprint('Credit limit check passed! Clear for order confirmation.');
    }
  }
});`
    },
    {
      name: 'GST Automated Breakdown',
      trigger: 'onload_post_render',
      description: 'Automatically divide tax totals into local SGST and CGST values.',
      mockData: { total_amount: 50000, cgst_tax: 0, sgst_tax: 0 },
      code: `frappe.ui.form.on('Sales Order', {
  validate: function(frm) {
    const rawTotal = frm.doc.total_amount;
    // Split 5% total tax into 2.5% CGST and 2.5% SGST
    frm.doc.cgst_tax = rawTotal * 0.025;
    frm.doc.sgst_tax = rawTotal * 0.025;
    
    frappe.msgprint({
      title: 'Tax Distributed',
      message: 'CGST and SGST populated with standard local rates (2.5% each).',
      indicator: 'green'
    });
  }
});`
    }
  ],
  PRODUCTION: [
    {
      name: 'Batch Yield Validator',
      trigger: 'validate',
      description: 'Validate output vs input weight during manufacturing lot completion.',
      mockData: { batch_no: 'B2026-YARN-82', yarn_inputs_kg: 500, fabric_yield_kg: 540 },
      code: `frappe.ui.form.on('Work Order', {
  validate: function(frm) {
    if (frm.doc.fabric_yield_kg > frm.doc.yarn_inputs_kg * 1.05) {
      frappe.msgprint({
        title: 'Yield Discrepancy Error',
        message: 'Batch finished fabric yield cannot exceed raw inputs by major weight gain margins.',
        indicator: 'red'
      });
      frappe.validated = false;
    } else {
      frappe.msgprint('Yield tolerance calculations approved.');
    }
  }
});`
    }
  ],
  ATTENDANCE: [
    {
      name: 'Double Punch Blocker',
      trigger: 'before_save',
      description: 'Verify punch sequence hours logic to prevent double check-ins.',
      mockData: { time_in: '09:00', time_out: '08:30' },
      code: `frappe.ui.form.on('Attendance', {
  validate: function(frm) {
    if (frm.doc.time_out < frm.doc.time_in) {
      frappe.msgprint({
        title: 'Clock In / Out Order Refused',
        message: 'Clock-out timestamp cannot trigger prior to designated clock-in schedules.',
        indicator: 'red'
      });
      frappe.validated = false;
    } else {
      frappe.msgprint('Attendance schedule duration verified successfully.');
    }
  }
});`
    }
  ]
};

const getMeta = (schema: DocTypeSchema) =>
  ERP_MODULE_ITEMS.find((item) => item.id === schema.view);

const DocTypeCenter: React.FC<DocTypeCenterProps> = ({ stats, userRole = 'ADMIN', onNavigate }) => {
  const [query, setQuery] = useState('');
  const [activeModule, setActiveModule] = useState('All');
  const [selectedView, setSelectedView] = useState<ViewState>(DOCTYPE_SCHEMAS[0]?.view || 'DASHBOARD');
  
  const [editingSchema, setEditingSchema] = useState<DocTypeSchema | null>(null);

  // Frappe Scripting Sandbox states
  const [centerSubTab, setCenterSubTab] = useState<'details' | 'scripts'>('details');
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [scriptCode, setScriptCode] = useState<string>('');
  const [mockFields, setMockFields] = useState<Record<string, any>>({});
  const [scriptConsoleLogs, setScriptConsoleLogs] = useState<string[]>([]);
  const [frappeMsg, setFrappeMsg] = useState<{ title: string; message: string; indicator: 'red' | 'green' | 'orange' | 'blue' } | null>(null);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);

  const modules = useMemo(() => ['All', ...Array.from(new Set(DOCTYPE_SCHEMAS.map((schema) => schema.module)))], [DOCTYPE_SCHEMAS.length]);

  const filteredSchemas = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return DOCTYPE_SCHEMAS.filter((schema) => activeModule === 'All' || schema.module === activeModule)
      .filter((schema) => {
        if (!normalized) return true;
        return [
          schema.name,
          schema.module,
          schema.namingSeries,
          getMeta(schema)?.label,
          ...schema.fields.map((field) => field.label),
        ].join(' ').toLowerCase().includes(normalized);
      });
  }, [query, activeModule, DOCTYPE_SCHEMAS]);

  const selectedSchema = DOCTYPE_SCHEMAS.find((schema) => schema.view === selectedView) || filteredSchemas[0] || DOCTYPE_SCHEMAS[0];
  const selectedStat = selectedSchema ? stats[selectedSchema.view] || emptyStat : emptyStat;
  const selectedWorkflow = selectedSchema ? getWorkflowForView(selectedSchema.view) : undefined;
  const totalRecords = Object.values(stats).reduce((sum, item) => sum + ((item as any)?.total || 0), 0);
  const schemaCoverage = ERP_MODULE_ITEMS.filter((item) => item.module !== 'core').length;

  const activePresets = useMemo(() => {
    if (!selectedSchema) return [];
    const viewKey = String(selectedSchema.view);
    return SCRIPT_PRESETS[viewKey] || [
      {
        name: 'Auto Column Auditor',
        trigger: 'validate',
        description: 'Verify critical custom user inputs before submission state changes.',
        mockData: { document_owner: 'ERP System Manager', is_approved: 1, quality_score: 95 },
        code: `frappe.ui.form.on('${selectedSchema.name}', {
  validate: function(frm) {
    if (!frm.doc.document_owner) {
      frappe.msgprint({
        title: 'Form Validation Incomplete',
        message: 'Owner or active worker identifier must be explicitly logged.',
        indicator: 'red'
      });
      frappe.validated = false;
    } else {
      frappe.msgprint('DocType sanity validation succeeded!');
    }
  }
});`
      }
    ];
  }, [selectedSchema?.view]);

  React.useEffect(() => {
    if (activePresets && activePresets.length > 0) {
      const idx = selectedPresetIndex < activePresets.length ? selectedPresetIndex : 0;
      setScriptCode(activePresets[idx].code);
      setMockFields(activePresets[idx].mockData);
      setScriptConsoleLogs([
        `[${new Date().toLocaleTimeString()}] Frappe system agent attached. Ready for form triggers on "${selectedSchema?.name}".`
      ]);
      setFrappeMsg(null);
    }
  }, [selectedSchema?.view, selectedPresetIndex, activePresets]);

  const handleExecuteScript = () => {
    setIsCompiling(true);
    setScriptConsoleLogs(prev => [
      `[${new Date().toLocaleTimeString()}] Initialize execution run...`,
      `[${new Date().toLocaleTimeString()}] Attached event hook: "${activePresets[selectedPresetIndex]?.trigger || 'validate'}"`,
      ...prev
    ]);

    setTimeout(() => {
      let validated = true;
      let mockConsole: string[] = [];
      let popupMsg: any = null;

      const currentPresetName = activePresets[selectedPresetIndex]?.name || '';

      if (currentPresetName.includes('Credit Limit')) {
        const total = parseFloat(mockFields.total_amount || 0);
        const limit = parseFloat(mockFields.credit_limit || 0);
        mockConsole.push(`AST parsed successfully.`);
        mockConsole.push(`Running hooks ... validate()`);
        mockConsole.push(`Check condition: frm.doc.total_amount (${total}) > frm.doc.credit_limit (${limit})`);
        
        if (total > limit) {
          validated = false;
          popupMsg = {
            title: 'Credit Limit Exceeded',
            message: `Order total (₹${total}) exceeds customer credit limit (₹${limit})`,
            indicator: 'red'
          };
          mockConsole.push(`[CRITICAL] validate failed: frappe.validated set to false`);
        } else {
          popupMsg = {
            title: 'Audit Complete',
            message: 'Credit limit check passed! Clear for order confirmation.',
            indicator: 'green'
          };
          mockConsole.push(`validate succeeded. Event completed without warnings.`);
        }
      } else if (currentPresetName.includes('GST Automated')) {
        const total = parseFloat(mockFields.total_amount || 0);
        const cgst = total * 0.025;
        const sgst = total * 0.025;
        setMockFields(prev => ({ ...prev, cgst_tax: cgst, sgst_tax: sgst }));
        popupMsg = {
          title: 'Tax Computed',
          message: `Local components split (CGST: ₹${cgst.toFixed(2)}, SGST: ₹${sgst.toFixed(2)}).`,
          indicator: 'green'
        };
        mockConsole.push(`Running hooks ... onload()`);
        mockConsole.push(`State mutated: cgst_tax updated to ${cgst}`);
        mockConsole.push(`State mutated: sgst_tax updated to ${sgst}`);
        mockConsole.push(`validate completed.`);
      } else if (currentPresetName.includes('Batch Yield')) {
        const inputs = parseFloat(mockFields.yarn_inputs_kg || 0);
        const yieldKg = parseFloat(mockFields.fabric_yield_kg || 0);
        mockConsole.push(`Running hooks ... validate()`);
        mockConsole.push(`Assert: yield (${yieldKg} kg) <= inputs (${inputs} kg) * 1.05`);

        if (yieldKg > inputs * 1.05) {
          validated = false;
          popupMsg = {
            title: 'Yield Tolerance Violated',
            message: `Manufacturing output fabric (${yieldKg} KG) exceeds maximum acceptable yield margin limit from raw yarn outputs (${inputs} KG + 5% max).`,
            indicator: 'red'
          };
          mockConsole.push(`[CRITICAL] validate failed: yield exceeded inputs by ${(yieldKg / inputs * 100 - 100).toFixed(1)}%`);
        } else {
          popupMsg = {
            title: 'Yield Confirmed',
            message: 'Finished fabric material yield calculations are well in limits.',
            indicator: 'green'
          };
          mockConsole.push(`validate succeeded. Finished output approved.`);
        }
      } else if (currentPresetName.includes('Double Punch')) {
        const timeIn = mockFields.time_in || '';
        const timeOut = mockFields.time_out || '';
        mockConsole.push(`Running hooks ... validate()`);
        mockConsole.push(`Validate punch sequence... ${timeIn} to ${timeOut}`);

        if (timeOut < timeIn) {
          validated = false;
          popupMsg = {
            title: 'Clock Sequence Refused',
            message: 'punch_out timestamp cannot predate punch_in schedule record.',
            indicator: 'red'
          };
          mockConsole.push(`[CRITICAL] validate failed: time_out earlier than time_in`);
        } else {
          popupMsg = {
            title: 'Punches Validated',
            message: 'Employee punch schedule sequence verified successfully.',
            indicator: 'green'
          };
          mockConsole.push(`validate succeeded. Entry approved.`);
        }
      } else {
        const owner = mockFields.document_owner || '';
        mockConsole.push(`Running hooks ... validate()`);
        mockConsole.push(`Assert presence: document_owner (${owner})`);
        if (!owner.trim()) {
          validated = false;
          popupMsg = {
            title: 'Missing Identifier',
            message: 'Owner or active worker identifier must be explicitly logged.',
            indicator: 'red'
          };
          mockConsole.push(`[CRITICAL] validate failed: Null identifier field.`);
        } else {
          popupMsg = {
            title: 'Success',
            message: 'Standard metadata validation check passed.',
            indicator: 'green'
          };
          mockConsole.push(`validate succeeded.`);
        }
      }

      setIsCompiling(false);
      setScriptConsoleLogs(prev => [
        `[${new Date().toLocaleTimeString()}] Runtime simulation ended. Exit Code: ${validated ? '0 (OK)' : '1 (ERROR)'}`,
        ...mockConsole.map(line => `[${new Date().toLocaleTimeString()}] ${line}`),
        ...prev
      ]);
      if (popupMsg) {
        setFrappeMsg(popupMsg);
      }
    }, 850);
  };

  const handleSaveSchema = () => {
    if (editingSchema) {
      if (!editingSchema.view) {
         // Create a generic view state name
         editingSchema.view = editingSchema.name.toUpperCase().replace(/\s+/g, '_') as ViewState;
      }
      saveCustomDocTypeSchema(editingSchema);
      setSelectedView(editingSchema.view);
      setEditingSchema(null);
    }
  };

  if (editingSchema) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <h2 className="text-xl font-black text-slate-800 dark:text-white">
            {editingSchema.name ? `Edit Schema: ${editingSchema.name}` : 'New DocType Schema'}
          </h2>
          <div className="flex gap-2">
            <button onClick={() => setEditingSchema(null)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold shadow-sm">Cancel</button>
            <button onClick={handleSaveSchema} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 hover:bg-indigo-700"><Save className="w-4 h-4"/> Save DocType</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div>
             <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">DocType Name</label>
             <input type="text" value={editingSchema.name} onChange={e => setEditingSchema({...editingSchema, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-sm font-medium focus:ring-1 focus:ring-indigo-500 outline-none"/>
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Module</label>
             <select value={editingSchema.module} onChange={e => setEditingSchema({...editingSchema, module: e.target.value})} className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-sm font-medium focus:ring-1 focus:ring-indigo-500 outline-none">
                {Object.keys(MODULE_COLOR_MAP).map(m => (
                    <option key={m} value={m.charAt(0).toUpperCase() + m.slice(1)}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
             </select>
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Naming Series</label>
             <input type="text" value={editingSchema.namingSeries} onChange={e => setEditingSchema({...editingSchema, namingSeries: e.target.value})} placeholder="e.g. INV-.YYYY.-.####" className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-sm font-medium font-mono focus:ring-1 focus:ring-indigo-500 outline-none"/>
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Statuses (Comma separated)</label>
             <input type="text" value={editingSchema.statuses?.join(', ') || ''} onChange={e => setEditingSchema({...editingSchema, statuses: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} placeholder="DRAFT, COMPLETED" className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-sm font-medium focus:ring-1 focus:ring-indigo-500 outline-none"/>
           </div>
        </div>

        <div className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl overflow-hidden mt-6">
           <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
             <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Fields</h3>
             <button onClick={() => setEditingSchema({
                 ...editingSchema,
                 fields: [...editingSchema.fields, {fieldname: '', label: '', fieldtype: 'Data'}]
             })} className="text-xs font-bold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded flex items-center gap-1 hover:bg-indigo-100"><Plus className="w-3 h-3"/> Add Field</button>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                        <th className="px-4 py-3 font-bold text-slate-500 text-xs uppercase tracking-widest">Label</th>
                        <th className="px-4 py-3 font-bold text-slate-500 text-xs uppercase tracking-widest">Fieldname</th>
                        <th className="px-4 py-3 font-bold text-slate-500 text-xs uppercase tracking-widest">Type</th>
                        <th className="px-4 py-3 font-bold text-slate-500 text-xs uppercase tracking-widest">Mandatory</th>
                        <th className="px-4 py-3 font-bold text-slate-500 text-xs uppercase tracking-widest">Options / Link</th>
                        <th className="px-4 py-3"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {editingSchema.fields.map((field, idx) => (
                        <tr key={idx}>
                            <td className="px-4 py-2">
                                <input type="text" value={field.label} onChange={e => {
                                    const next = [...editingSchema.fields];
                                    next[idx].label = e.target.value;
                                    setEditingSchema({...editingSchema, fields: next});
                                }} placeholder="e.g. Customer Name" className="w-full px-2 py-1 border border-slate-200 dark:border-slate-800 rounded bg-transparent focus:ring-1 focus:ring-indigo-500 outline-none"/>
                            </td>
                            <td className="px-4 py-2">
                                <input type="text" value={field.fieldname} onChange={e => {
                                    const next = [...editingSchema.fields];
                                    next[idx].fieldname = e.target.value.replace(/\s+/g, '_').toLowerCase();
                                    setEditingSchema({...editingSchema, fields: next});
                                }} placeholder="customer_name" className="w-full px-2 py-1 font-mono text-xs border border-slate-200 dark:border-slate-800 rounded bg-transparent focus:ring-1 focus:ring-indigo-500 outline-none"/>
                            </td>
                            <td className="px-4 py-2">
                                <select value={field.fieldtype} onChange={e => {
                                    const next = [...editingSchema.fields];
                                    next[idx].fieldtype = e.target.value as any;
                                    setEditingSchema({...editingSchema, fields: next});
                                }} className="w-full px-2 py-1 border border-slate-200 dark:border-slate-800 rounded bg-transparent focus:ring-1 focus:ring-indigo-500 outline-none">
                                    {Object.keys(fieldTone).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </td>
                            <td className="px-4 py-2 text-center">
                                <input type="checkbox" checked={field.required || false} onChange={e => {
                                    const next = [...editingSchema.fields];
                                    next[idx].required = e.target.checked;
                                    setEditingSchema({...editingSchema, fields: next});
                                }} className="rounded text-indigo-600 focus:ring-indigo-500"/>
                            </td>
                            <td className="px-4 py-2">
                                {field.fieldtype === 'Select' && (
                                   <input type="text" value={field.options?.join(', ') || ''} onChange={e => {
                                       const next = [...editingSchema.fields];
                                       next[idx].options = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                       setEditingSchema({...editingSchema, fields: next});
                                   }} placeholder="A, B, C" className="w-full px-2 py-1 border border-slate-200 dark:border-slate-800 rounded bg-transparent focus:ring-1 outline-none text-xs"/>
                                )}
                                {field.fieldtype === 'Link' && (
                                   <input type="text" value={field.linkTo || ''} onChange={e => {
                                       const next = [...editingSchema.fields];
                                       next[idx].linkTo = e.target.value;
                                       setEditingSchema({...editingSchema, fields: next});
                                   }} placeholder="DocType Name" className="w-full px-2 py-1 border border-slate-200 dark:border-slate-800 rounded bg-transparent focus:ring-1 outline-none text-xs"/>
                                )}
                            </td>
                            <td className="px-4 py-2 text-right">
                                <button onClick={() => {
                                    const next = [...editingSchema.fields];
                                    next.splice(idx, 1);
                                    setEditingSchema({...editingSchema, fields: next});
                                }} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors"><Trash2 className="w-4 h-4"/></button>
                            </td>
                        </tr>
                    ))}
                    {editingSchema.fields.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">No fields defined yet.</td></tr>
                    )}
                </tbody>
             </table>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
              <Database className="w-3 h-3" />
              Meta Desk
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">ERPNext-style DocType registry</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">DocType Center</h1>
          <p className="text-sm text-slate-500 mt-1">Explore schemas, naming series, workflows, permissions, and build new forms visually.</p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setEditingSchema({
              id: '',
              name: '',
              view: '' as any,
              module: 'Workspace',
              namingSeries: '',
              fields: []
          })} className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors">
            <Plus className="w-4 h-4" />
            New DocType
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col max-h-[800px]">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:border-indigo-500"
                placeholder="Search DocType, field, module..."
              />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {modules.map((module) => (
                <button
                  key={module}
                  onClick={() => setActiveModule(module)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-colors ${
                    activeModule === module
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  {module}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {filteredSchemas.map((schema) => {
              const meta = getMeta(schema);
              const itemStat = stats[schema.view] || emptyStat;
              const isSelected = selectedSchema?.view === schema.view;

              return (
                <button
                  key={schema.name}
                  onClick={() => setSelectedView(schema.view)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors mb-2 ${
                    isSelected
                      ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-900 shadow-sm'
                      : 'bg-white dark:bg-slate-950/30 border-transparent hover:border-slate-200 dark:hover:border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 dark:text-white truncate">{schema.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">{schema.module}</p>
                    </div>
                    {itemStat.total > 0 && <span className="text-[10px] font-black text-indigo-600 bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-400 px-2 py-0.5 rounded-full tabular-nums shrink-0">{itemStat.total}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {selectedSchema && (
          <div className="space-y-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 inline-block px-2 py-0.5 rounded-sm">{selectedSchema.module}</p>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-2 flex items-center gap-3">
                      {selectedSchema.name}
                      <button onClick={() => setEditingSchema(selectedSchema)} className="p-1.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-md transition-colors group">
                          <Edit2 className="w-4 h-4"/>
                          <span className="sr-only">Edit Schema</span>
                      </button>
                  </h2>
                  <p className="text-xs font-mono text-slate-400 mt-1">Series: {selectedSchema.namingSeries}</p>
                </div>
                <button
                  onClick={() => onNavigate(selectedSchema.view)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors"
                >
                  View Records
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
                {[
                  { label: 'Total', value: selectedStat.total },
                  { label: 'Draft', value: selectedStat.draft },
                  { label: 'Submitted', value: selectedStat.submitted },
                  { label: 'Cancelled', value: selectedStat.cancelled },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tab Selector */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 mt-4">
              <button
                onClick={() => setCenterSubTab('details')}
                className={`px-5 py-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
                  centerSubTab === 'details'
                    ? 'border-indigo-650 text-indigo-650 dark:border-indigo-400 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                Structural Design & Workflows
              </button>
              <button
                onClick={() => setCenterSubTab('scripts')}
                className={`px-5 py-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
                  centerSubTab === 'scripts'
                    ? 'border-indigo-650 text-indigo-650 dark:border-indigo-400 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Sliders className="w-4 h-4 text-rose-500 animate-pulse" />
                Frappe Client Scripts & Validator Sandbox
              </button>
            </div>

            {centerSubTab === 'details' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col shadow-sm h-[600px] overflow-hidden">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      Data Dictionary ({selectedSchema.fields.length})
                      </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/50 dark:bg-slate-950/20">
                    {selectedSchema.fields.map((field) => (
                      <div key={field.fieldname} className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{field.label}</p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">{field.fieldname}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide border border-transparent ${fieldTone[field.fieldtype] || fieldTone.Data}`}>
                              {field.fieldtype}
                              {field.fieldtype === 'Link' && field.linkTo && ` → ${field.linkTo}`}
                          </span>
                          {field.options && field.options.length > 0 && (
                              <span className="text-[9px] text-slate-400 uppercase font-black truncate max-w-[100px]">{field.options.length} options</span>
                          )}
                          {field.required && <span className="text-[9px] font-black uppercase tracking-widest text-rose-500">MANDATORY</span>}
                        </div>
                      </div>
                    ))}
                    {selectedSchema.fields.length === 0 && (
                        <p className="text-sm text-center text-slate-500 py-10">No fields configured.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-indigo-500" />
                      Lifecycle Workflow
                    </h3>
                    {selectedWorkflow ? (
                      <div className="mt-4 space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {selectedWorkflow.states.map((state) => (
                            <span key={state} className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                                state === 'DRAFT' || state === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                state === 'COMPLETED' || state === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                state === 'CANCELLED' || state === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                            }`}>{state}</span>
                          ))}
                        </div>
                        <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 p-2 overflow-hidden">
                          {selectedWorkflow.transitions.map((transition, index) => (
                            <div key={`${transition.from}-${transition.to}-${index}`} className="flex items-center justify-between gap-3 text-xs bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 rounded p-2.5">
                              <span className="font-bold text-slate-500">{transition.from}</span>
                              <div className="flex-1 border-t-2 border-dashed border-slate-200 dark:border-slate-700 mx-2 relative">
                                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-50 dark:bg-slate-950 px-1 text-indigo-600 dark:text-indigo-400 font-black tracking-widest text-[9px] uppercase">{transition.action}</span>
                              </div>
                              <span className="font-bold text-slate-900 dark:text-white">{transition.to}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-5 p-4 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-lg text-center">
                          <p className="text-sm text-slate-500">Standard CRUD operations only. No active workflow defined.</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-indigo-500" />
                      Role Based Access Control
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                      {(['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES', 'WORKER'] as UserRole[]).map((role) => (
                        <div key={role} className={`rounded-lg border p-2 text-center transition-colors ${
                          canAccessView(role, selectedSchema.view)
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300 shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-950 dark:border-slate-800 opacity-60'
                        }`}>
                          <p className="text-[10px] font-black uppercase tracking-widest">{role}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                {/* Visual script editor column */}
                <div className="xl:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col space-y-4">
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Code className="w-4 h-4 text-rose-500" />
                      Client Script Hook Editor
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Write Javascript triggers that fire on form events like <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">validate</code> or <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">before_save</code>.
                    </p>
                  </div>

                  {/* Preset Selector */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available ERP Hook Presets</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activePresets.map((preset, idx) => (
                        <button
                          key={preset.name}
                          onClick={() => {
                            setSelectedPresetIndex(idx);
                            setScriptCode(preset.code);
                            setMockFields(preset.mockData);
                          }}
                          className={`p-3 text-left border rounded-lg transition-all ${
                            selectedPresetIndex === idx
                              ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-250 dark:border-slate-800 hover:border-slate-350'
                          }`}
                        >
                          <p className="text-xs font-black text-slate-800 dark:text-slate-200">{preset.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{preset.description}</p>
                          <span className="inline-block mt-2 text-[9px] font-black uppercase tracking-widest bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                            Trigger: {preset.trigger}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Code TextArea Container */}
                  <div className="flex-1 min-h-[350px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex flex-col font-mono text-xs text-indigo-300">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900">
                      <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">client_script.js</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>
                    <div className="flex-1 flex overflow-hidden">
                      {/* Simulation of gutter/line count */}
                      <div className="w-10 bg-slate-950 text-slate-600 text-right select-none pr-2 py-3 border-r border-slate-800 shrink-0">
                        {Array.from({ length: 22 }).map((_, i) => (
                          <div key={i}>{i + 1}</div>
                        ))}
                      </div>
                      <textarea
                        value={scriptCode}
                        onChange={(e) => setScriptCode(e.target.value)}
                        className="flex-1 bg-transparent px-3 py-3 outline-none resize-none font-mono text-xs text-indigo-200 dark:text-emerald-100 leading-relaxed overflow-y-auto"
                        spellCheck={false}
                      />
                    </div>
                  </div>

                  {/* Control triggers */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={handleExecuteScript}
                      disabled={isCompiling}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-black shadow-sm flex items-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isCompiling ? (
                        <>
                          <Cpu className="w-4 h-4 animate-spin text-indigo-205" />
                          Executing Hook...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          Compile & Test Sandbox Hook
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Right columns: variables edit & visual terminal logs */}
                <div className="xl:col-span-5 flex flex-col gap-5">
                  {/* Variables editor */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-rose-500" />
                      Active Mock Form DocFields
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Alter raw fields values below to test how validation constraints behave.
                    </p>

                    <div className="space-y-3 pt-2">
                      {Object.keys(mockFields).map((fieldKey) => (
                        <div key={fieldKey} className="flex flex-col space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">
                            frm.doc.{fieldKey}
                          </label>
                          {typeof mockFields[fieldKey] === 'number' ? (
                            <input
                              type="number"
                              value={mockFields[fieldKey]}
                              onChange={(e) =>
                                setMockFields((prev) => ({
                                  ...prev,
                                  [fieldKey]: parseFloat(e.target.value) || 0,
                                }))
                              }
                              className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-820 outline-none text-sm font-medium focus:ring-1 focus:ring-rose-500"
                            />
                          ) : (
                            <input
                              type="text"
                              value={mockFields[fieldKey]}
                              onChange={(e) =>
                                setMockFields((prev) => ({
                                  ...prev,
                                  [fieldKey]: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-820 outline-none text-sm font-medium focus:ring-1 focus:ring-rose-500"
                            />
                          )}
                        </div>
                      ))}
                      {Object.keys(mockFields).length === 0 && (
                        <p className="text-xs text-slate-400 italic">No variables registered for this template preset.</p>
                      )}
                    </div>
                  </div>

                  {/* Visual Terminal Debugger Console */}
                  <div className="bg-slate-950 border border-slate-850 rounded-xl h-[300px] flex flex-col overflow-hidden text-slate-300 font-mono text-[11px]">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-900 bg-slate-900 shrink-0">
                      <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-rose-505" />
                        Frappe System Debugger Output
                      </span>
                      <button
                        onClick={() =>
                          setScriptConsoleLogs([
                            `[${new Date().toLocaleTimeString()}] Console logs cleared.`
                          ])
                        }
                        className="text-[9px] hover:text-slate-100 bg-slate-800 text-slate-400 px-2 py-0.5 rounded transition-colors"
                      >
                        Clear logs
                      </button>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto space-y-1.5 custom-scrollbar bg-slate-950">
                      {scriptConsoleLogs.map((log, idx) => (
                        <div
                          key={idx}
                          className={`leading-relaxed ${
                            log.includes('[CRITICAL]') || log.includes('failed')
                              ? 'text-rose-455 font-bold'
                              : log.includes('[SUCCESS]') || log.includes('succeeded')
                              ? 'text-emerald-400 font-bold'
                              : log.includes('State mutated')
                              ? 'text-cyan-400'
                              : 'text-slate-350'
                          }`}
                        >
                          <span className="text-slate-600 mr-1.5">❯</span>
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Simulated Frappe PopUp modal */}
            {frappeMsg && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 animate-fade-in">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 space-y-4 animate-scale-up">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      frappeMsg.indicator === 'red'
                        ? 'bg-rose-550/10 text-rose-600'
                        : 'bg-emerald-550/10 text-emerald-600'
                    }`}>
                      {frappeMsg.indicator === 'red' ? (
                        <AlertTriangle className="w-6 h-6" />
                      ) : (
                        <CheckCircle className="w-6 h-6" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">{frappeMsg.title}</h3>
                      <p className="text-sm text-slate-550 dark:text-slate-400 leading-relaxed font-semibold">{frappeMsg.message}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end border-t border-slate-100 dark:border-slate-800 pt-3">
                    <button
                      onClick={() => setFrappeMsg(null)}
                      className={`px-4 py-2 rounded-lg text-xs font-black tracking-wide uppercase transition-colors ${
                        frappeMsg.indicator === 'red'
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-slate-900 hover:bg-slate-850 dark:bg-slate-850 dark:hover:bg-slate-750 text-white'
                      }`}
                    >
                      Dismiss Error
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocTypeCenter;
