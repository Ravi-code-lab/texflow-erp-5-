import React, { useState, useMemo } from 'react';
import { uuidShort } from "../utils/uuid";
import {
  Truck, Plus, FileText, ArrowUpRight, ArrowDownLeft,
  Printer, Search, MoreHorizontal, CheckCircle2,
  AlertTriangle, X, Eye, Edit2,
  RefreshCw, BarChart2, Inbox, Send
} from 'lucide-react';
import { GatePass } from '../types';

// ─── Props ───────────────────────────────────────────────────────────────────
interface GatePassSystemProps {
  gatePasses: GatePass[];
  onAdd: (gp: GatePass) => void;
  onUpdate: (gp: GatePass) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const GP_TYPES = [
  { value: 'RETURNABLE',     label: 'RGP – Returnable',         color: 'amber',  icon: RefreshCw },
  { value: 'NON_RETURNABLE', label: 'NRGP – Non-Returnable',    color: 'rose',   icon: Send },
  { value: 'INWARD',         label: 'Inward – Gate Entry',      color: 'indigo', icon: ArrowDownLeft },
  { value: 'OUTWARD',        label: 'Outward – Dispatch',       color: 'emerald',icon: ArrowUpRight },
] as const;

const STATUS_META: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: 'Draft',    color: 'slate'   },
  ISSUED:    { label: 'Issued',   color: 'amber'   },
  IN_TRANSIT:{ label: 'Transit',  color: 'indigo'  },
  RECEIVED:  { label: 'Received', color: 'emerald' },
  RETURNED:  { label: 'Returned', color: 'teal'    },
  CANCELLED: { label: 'Cancelled',color: 'red'     },
};

const WORKFLOW_TRANSITIONS: Record<string, string[]> = {
  DRAFT:      ['ISSUED'],
  ISSUED:     ['IN_TRANSIT', 'RECEIVED', 'CANCELLED'],
  IN_TRANSIT: ['RECEIVED', 'RETURNED'],
  RECEIVED:   ['RETURNED'],
  RETURNED:   [],
  CANCELLED:  [],
};

const DEPT_OPTIONS = ['Dyeing','Cutting','Stitching','Embroidery','Printing','Washing','Finishing','QC','Packing','Admin','Store'];
const UNIT_OPTIONS = ['PCS','MTR','KG','SET','BOX','ROLL','BUNDLE'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const typeMeta = (t: string) => GP_TYPES.find(x => x.value === t) ?? GP_TYPES[0];

const colorCls = (color: string, kind: 'badge' | 'row' | 'btn') => {
  const map: Record<string, Record<string, string>> = {
    amber:   { badge:'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',   row:'border-l-amber-400',   btn:'bg-amber-600 hover:bg-amber-700' },
    rose:    { badge:'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',        row:'border-l-rose-400',    btn:'bg-rose-600 hover:bg-rose-700' },
    indigo:  { badge:'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',row:'border-l-indigo-400',  btn:'bg-indigo-600 hover:bg-indigo-700' },
    emerald: { badge:'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',row:'border-l-emerald-400',btn:'bg-emerald-600 hover:bg-emerald-700' },
    teal:    { badge:'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',        row:'border-l-teal-400',    btn:'bg-teal-600 hover:bg-teal-700' },
    red:     { badge:'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',            row:'border-l-red-400',     btn:'bg-red-600 hover:bg-red-700' },
    slate:   { badge:'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',       row:'border-l-slate-400',   btn:'bg-slate-600 hover:bg-slate-700' },
  };
  return map[color]?.[kind] ?? '';
};

const today = () => new Date().toISOString().split('T')[0];

// ─── Print helper ─────────────────────────────────────────────────────────────
function printGatePass(gp: GatePass, companyName = 'RAVI-TEXTILE') {
  const tm = typeMeta(gp.type);
  const win = window.open('', '_blank', 'width=800,height=600');
  if (!win) return;
  win.document.write(`
<!DOCTYPE html><html><head><title>Gate Pass – ${gp.number}</title>
<style>
  body{font-family:'Segoe UI',sans-serif;margin:0;padding:24px;color:#1e293b;font-size:13px}
  h1{font-size:20px;margin:0 0 2px}
  .sub{color:#64748b;font-size:12px;margin:0 0 16px}
  .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-weight:700;font-size:11px;background:#fef3c7;color:#b45309}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th{background:#f8fafc;text-align:left;padding:6px 10px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;border-bottom:1px solid #e2e8f0}
  td{padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}
  .field label{font-size:10px;text-transform:uppercase;color:#94a3b8;font-weight:700}
  .field p{margin:2px 0 0;font-weight:600;color:#0f172a}
  .footer{margin-top:32px;display:flex;justify-content:space-between}
  .sign{border-top:1px solid #cbd5e1;padding-top:4px;font-size:11px;color:#94a3b8;text-align:center;width:140px}
  hr{border:none;border-top:1px solid #e2e8f0;margin:16px 0}
  @media print{body{padding:0}}
</style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div><h1>${companyName}</h1><p class="sub">Gate Pass – ${tm.label}</p></div>
    <div style="text-align:right">
      <div style="font-size:18px;font-weight:900;color:#1e293b">${gp.number}</div>
      <div class="badge">${gp.status || 'ISSUED'}</div>
    </div>
  </div>
  <hr/>
  <div class="grid">
    <div class="field"><label>Date</label><p>${gp.date}</p></div>
    <div class="field"><label>Type</label><p>${tm.label}</p></div>
    <div class="field"><label>Party / Vendor</label><p>${gp.partyName || '—'}</p></div>
    <div class="field"><label>Reference Doc</label><p>${gp.referenceId || '—'}</p></div>
    <div class="field"><label>Vehicle No</label><p>${gp.vehicleNo || '—'}</p></div>
    <div class="field"><label>Driver</label><p>${gp.driverName || '—'}</p></div>
    ${gp.department ? `<div class="field"><label>Department</label><p>${gp.department}</p></div>` : ''}
    ${gp.authorizedBy ? `<div class="field"><label>Authorized By</label><p>${gp.authorizedBy}</p></div>` : ''}
    ${gp.expectedReturnDate ? `<div class="field"><label>Expected Return</label><p>${gp.expectedReturnDate}</p></div>` : ''}
    ${gp.outTime ? `<div class="field"><label>Out Time</label><p>${gp.outTime}</p></div>` : ''}
  </div>
  <table>
    <thead><tr><th>#</th><th>Item / Description</th><th>Qty</th><th>Unit</th><th>Purpose</th></tr></thead>
    <tbody>
      ${(gp.items || []).map((it, i) => `
        <tr><td>${i + 1}</td><td>${it.itemName}</td><td>${it.qty}</td><td>${it.unit}</td><td>${it.purpose || '—'}</td></tr>
      `).join('')}
    </tbody>
  </table>
  ${gp.remarks ? `<p style="margin-top:12px;font-size:12px;color:#64748b"><strong>Remarks:</strong> ${gp.remarks}</p>` : ''}
  <div class="footer">
    <div class="sign">Security In-Charge</div>
    <div class="sign">Authorized Signatory</div>
    <div class="sign">Receiver Signature</div>
  </div>
  <script>window.onload=()=>{window.print();window.close()}<\/script>
</body></html>`);
  win.document.close();
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color }: { label: string; value: number; sub: string; color: string }) {
  const dot: Record<string, string> = {
    amber: 'text-amber-500', indigo: 'text-indigo-500', emerald: 'text-emerald-500', rose: 'text-rose-500'
  };
  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{label}</div>
      <div className="text-3xl font-black text-slate-800 dark:text-white">{value}</div>
      <p className={`text-xs font-bold mt-1.5 ${dot[color] ?? 'text-slate-500'}`}>{sub}</p>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.ISSUED;
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${colorCls(m.color, 'badge')}`}>{m.label}</span>;
}

// ─── Item Row Editor ──────────────────────────────────────────────────────────
function ItemRows({ items, onChange }: {
  items: { id?: string; itemName: string; qty: number; unit: string; purpose?: string }[];
  onChange: (items: any[]) => void;
}) {
  const add = () => onChange([...items, { id: `item-${Date.now()}`, itemName: '', qty: 1, unit: 'PCS', purpose: '' }]);
  const remove = (id: string) => onChange(items.filter(it => it.id !== id));
  const update = (id: string, key: string, val: any) =>
    onChange(items.map(it => it.id === id ? { ...it, [key]: val } : it));

  const inp = 'border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm bg-slate-50 dark:bg-slate-950 w-full focus:ring-1 focus:ring-amber-400 outline-none';

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-1 text-[10px] font-bold uppercase text-slate-400 px-1">
        <div className="col-span-4">Item / Description</div>
        <div className="col-span-2">Qty</div>
        <div className="col-span-2">Unit</div>
        <div className="col-span-3">Purpose / Process</div>
        <div className="col-span-1"></div>
      </div>
      {items.map((it) => (
        <div key={it.id ?? it.itemName} className="grid grid-cols-12 gap-1 items-center">
          <input className={`col-span-4 ${inp}`} placeholder="Item name" value={it.itemName}
            onChange={e => update(it.id!, 'itemName', e.target.value)} />
          <input className={`col-span-2 ${inp}`} type="number" min={0} placeholder="Qty" value={it.qty}
            onChange={e => update(it.id!, 'qty', Number(e.target.value))} />
          <select className={`col-span-2 ${inp}`} value={it.unit} onChange={e => update(it.id!, 'unit', e.target.value)}>
            {UNIT_OPTIONS.map(u => <option key={u}>{u}</option>)}
          </select>
          <input className={`col-span-3 ${inp}`} placeholder="e.g. Dyeing" value={it.purpose || ''}
            onChange={e => update(it.id!, 'purpose', e.target.value)} />
          <button onClick={() => remove(it.id!)} className="col-span-1 text-slate-400 hover:text-red-500 flex justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button onClick={add} className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 mt-1">
        <Plus className="w-3.5 h-3.5" /> Add Item
      </button>
    </div>
  );
}

// ─── Gate Pass Form (Create / Edit / View) ────────────────────────────────────
type FormMode = 'CREATE' | 'EDIT' | 'VIEW';

function GatePassForm({
  initial, mode, onSave, onClose
}: {
  initial?: Partial<GatePass>;
  mode: FormMode;
  onSave: (gp: GatePass) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'BASIC' | 'ITEMS' | 'LOGISTICS'>('BASIC');
  const [fd, setFd] = useState<Partial<GatePass>>({
    type: 'RETURNABLE',
    date: today(),
    status: 'DRAFT',
    items: [{ id: `item-${Date.now()}`, itemName: '', qty: 1, unit: 'PCS', purpose: '' }],
    ...initial,
  });

  const readonly = mode === 'VIEW';
  const set = (k: keyof GatePass, v: any) => setFd(p => ({ ...p, [k]: v }));

  const lbl = 'block text-[10px] font-bold uppercase text-slate-500 mb-1';
  const inp = `w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm font-medium
    bg-slate-50 dark:bg-slate-950 focus:ring-1 focus:ring-amber-400 outline-none
    ${readonly ? 'opacity-70 cursor-not-allowed' : ''}`;

  const handleSave = () => {
    if (!fd.partyName) { alert('Party / Vendor name is required'); return; }
    if (!fd.items?.length || !fd.items[0].itemName) { alert('At least one item is required'); return; }
    onSave({
      ...fd,
      id: fd.id ?? `GP-${Date.now()}`,
      number: fd.number ?? `GP-${uuidShort(10)}`,
      status: fd.status ?? (mode === 'CREATE' ? 'ISSUED' : 'DRAFT'),
    } as GatePass);
    onClose();
  };

  const TABS = [
    { id: 'BASIC',     label: 'Details' },
    { id: 'ITEMS',     label: `Items (${fd.items?.length ?? 0})` },
    { id: 'LOGISTICS', label: 'Logistics' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 rounded-t-2xl flex-shrink-0">
          <div>
            <h3 className="font-black text-lg text-slate-800 dark:text-white">
              {mode === 'CREATE' ? 'New Gate Pass' : mode === 'EDIT' ? `Edit – ${fd.number}` : fd.number}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{typeMeta(fd.type ?? 'RETURNABLE').label}</p>
          </div>
          <div className="flex items-center gap-2">
            {mode !== 'CREATE' && fd.id && (
              <button onClick={() => printGatePass(fd as GatePass)} className="p-2 text-slate-400 hover:text-slate-700">
                <Printer className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors ${
                tab === t.id
                  ? 'bg-white dark:bg-slate-800 border border-b-0 border-slate-200 dark:border-slate-700 text-amber-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {tab === 'BASIC' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Pass Type</label>
                  <select className={inp} value={fd.type} disabled={readonly}
                    onChange={e => set('type', e.target.value as any)}>
                    {GP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Date</label>
                  <input type="date" className={inp} value={fd.date} readOnly={readonly}
                    onChange={e => set('date', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Party / Job-Worker *</label>
                  <input type="text" className={inp} placeholder="e.g. Star Dyers" value={fd.partyName ?? ''}
                    readOnly={readonly} onChange={e => set('partyName', e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Reference Doc (Challan / PO)</label>
                  <input type="text" className={inp} placeholder="CH-001 / PO-002" value={fd.referenceId ?? ''}
                    readOnly={readonly} onChange={e => set('referenceId', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Department</label>
                  <select className={inp} value={fd.department ?? ''} disabled={readonly}
                    onChange={e => set('department', e.target.value)}>
                    <option value="">— None —</option>
                    {DEPT_OPTIONS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Authorized By</label>
                  <input type="text" className={inp} placeholder="Manager name" value={fd.authorizedBy ?? ''}
                    readOnly={readonly} onChange={e => set('authorizedBy', e.target.value)} />
                </div>
              </div>
              {(fd.type === 'RETURNABLE') && (
                <div>
                  <label className={lbl}>Expected Return Date</label>
                  <input type="date" className={inp} value={fd.expectedReturnDate ?? ''}
                    readOnly={readonly} onChange={e => set('expectedReturnDate', e.target.value)} />
                </div>
              )}
              <div>
                <label className={lbl}>Remarks / Notes</label>
                <textarea rows={2} className={`${inp} resize-none`} placeholder="Any additional notes…"
                  value={fd.remarks ?? ''} readOnly={readonly}
                  onChange={e => set('remarks', e.target.value)} />
              </div>
            </div>
          )}

          {tab === 'ITEMS' && (
            <ItemRows
              items={fd.items ?? []}
              onChange={items => set('items', items)}
            />
          )}

          {tab === 'LOGISTICS' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Vehicle No</label>
                  <input type="text" className={inp} placeholder="RJ-14-AB-1234" value={fd.vehicleNo ?? ''}
                    readOnly={readonly} onChange={e => set('vehicleNo', e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Driver Name / Phone</label>
                  <input type="text" className={inp} placeholder="Raju – 9876543210" value={fd.driverName ?? ''}
                    readOnly={readonly} onChange={e => set('driverName', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Out Time</label>
                  <input type="time" className={inp} value={fd.outTime ?? ''}
                    readOnly={readonly} onChange={e => set('outTime', e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>In Time (return)</label>
                  <input type="time" className={inp} value={fd.inTime ?? ''}
                    readOnly={readonly} onChange={e => set('inTime', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Total Weight</label>
                  <input type="number" min={0} className={inp} placeholder="0" value={fd.weight ?? ''}
                    readOnly={readonly} onChange={e => set('weight', Number(e.target.value))} />
                </div>
                <div>
                  <label className={lbl}>Weight Unit</label>
                  <select className={inp} value={fd.weightUnit ?? 'KG'} disabled={readonly}
                    onChange={e => set('weightUnit', e.target.value as any)}>
                    <option>KG</option><option>MT</option><option>PCS</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={lbl}>Security In-Charge</label>
                <input type="text" className={inp} placeholder="Guard name" value={fd.securityName ?? ''}
                  readOnly={readonly} onChange={e => set('securityName', e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!readonly && (
          <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800">Cancel</button>
            {mode === 'CREATE' && (
              <button onClick={() => {
                if (!fd.partyName) { alert('Party / Vendor name is required'); return; }
                if (!fd.items?.length || !fd.items[0].itemName) { alert('At least one item is required'); return; }
                onSave({
                  ...fd,
                  id: fd.id ?? `GP-${Date.now()}`,
                  number: fd.number ?? `GP-${uuidShort(10)}`,
                  status: 'DRAFT',
                } as GatePass);
                onClose();
              }}
                className="px-4 py-2 text-sm font-bold text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-100">
                Save as Draft
              </button>
            )}
            <button onClick={handleSave}
              className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2">
              {mode === 'CREATE' ? <><Plus className="w-4 h-4" /> Issue Gate Pass</> : <><CheckCircle2 className="w-4 h-4" /> Save Changes</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Analytics tab ────────────────────────────────────────────────────────────
function Analytics({ gatePasses }: { gatePasses: GatePass[] }) {
  const byType = useMemo(
    () => GP_TYPES.map(t => ({ ...t, count: gatePasses.filter(g => g.type === t.value).length })),
    [gatePasses]
  );
  const byStatus = useMemo(
    () => Object.entries(STATUS_META).map(([k, v]) => ({
      key: k, ...v, count: gatePasses.filter(g => (g.status ?? 'ISSUED') === k).length
    })).filter(s => s.count > 0),
    [gatePasses]
  );

  const last30 = useMemo(() => {
    const map: Record<string, number> = {};
    const now = Date.now();
    gatePasses.forEach(g => {
      const d = new Date(g.date);
      if (now - d.getTime() < 30 * 86400000) {
        map[g.date] = (map[g.date] || 0) + 1;
      }
    });
    return Object.entries(map).sort().slice(-14);
  }, [gatePasses]);

  const max = Math.max(...last30.map(([, c]) => c), 1);

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* By Type */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <h4 className="text-xs font-bold uppercase text-slate-500 mb-4">By Pass Type</h4>
          <div className="space-y-3">
            {byType.map(t => (
              <div key={t.value} className="flex items-center gap-3">
                <div className="text-xs font-bold text-slate-600 dark:text-slate-300 w-28 truncate">{t.label.split('–')[0].trim()}</div>
                <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div className={`h-full rounded-full ${colorCls(t.color, 'btn')}`}
                    style={{ width: gatePasses.length ? `${(t.count / gatePasses.length) * 100}%` : '0%' }} />
                </div>
                <div className="text-sm font-black text-slate-700 dark:text-white w-6 text-right">{t.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* By Status */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <h4 className="text-xs font-bold uppercase text-slate-500 mb-4">By Status</h4>
          <div className="grid grid-cols-2 gap-3">
            {byStatus.map(s => (
              <div key={s.key} className={`rounded-xl p-3 ${colorCls(s.color, 'badge')}`}>
                <div className="text-xs font-bold opacity-70">{s.label}</div>
                <div className="text-2xl font-black mt-0.5">{s.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trend bars */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <h4 className="text-xs font-bold uppercase text-slate-500 mb-4">Daily Volume – Last 14 Active Days</h4>
        {last30.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No activity yet.</p>
        ) : (
          <div className="flex items-end gap-1 h-28">
            {last30.map(([date, count]) => (
              <div key={date} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-[9px] text-slate-400 font-bold">{count}</div>
                <div className="w-full bg-amber-500 rounded-t"
                  style={{ height: `${(count / max) * 80}px` }} />
                <div className="text-[8px] text-slate-400 rotate-45 origin-left whitespace-nowrap">
                  {date.slice(5)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GatePassSystem({ gatePasses, onAdd, onUpdate }: GatePassSystemProps) {
  const [activeTab, setActiveTab] = useState<'LOG' | 'ANALYTICS'>('LOG');
  const [formState, setFormState] = useState<{ open: boolean; mode: FormMode; gp?: GatePass }>({ open: false, mode: 'CREATE' });
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return (gatePasses as GatePass[])
      .filter(g =>
        (typeFilter === 'ALL' || g.type === typeFilter) &&
        (statusFilter === 'ALL' || (g.status ?? 'ISSUED') === statusFilter) &&
        (!q || [g.number, g.partyName, g.vehicleNo, g.referenceId, g.department]
          .filter(Boolean).some(s => s!.toLowerCase().includes(q)))
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [gatePasses, filter, typeFilter, statusFilter]);

  const kpis = useMemo(() => ({
    activeRgp: (gatePasses as GatePass[]).filter(g => g.type === 'RETURNABLE' && g.status !== 'RETURNED' && g.status !== 'CANCELLED').length,
    inwardToday: (gatePasses as GatePass[]).filter(g => g.type === 'INWARD' && g.date === today()).length,
    nrgp: (gatePasses as GatePass[]).filter(g => g.type === 'NON_RETURNABLE').length,
    overdueRgp: (gatePasses as GatePass[]).filter(g =>
      g.type === 'RETURNABLE' && g.status !== 'RETURNED' && g.expectedReturnDate && g.expectedReturnDate < today()
    ).length,
  }), [gatePasses]);

  const openForm = (mode: FormMode, gp?: GatePass) => {
    setFormState({ open: true, mode, gp });
    setActionMenu(null);
  };

  const handleSave = (gp: GatePass) => {
    if (gp.id && gatePasses.find(x => x.id === gp.id)) onUpdate(gp);
    else onAdd(gp);
  };

  const transition = (gp: GatePass, newStatus: string) => {
    onUpdate({ ...gp, status: newStatus });
    setActionMenu(null);
  };

  const TABS = [
    { id: 'LOG',       label: 'Security Log', icon: Inbox },
    { id: 'ANALYTICS', label: 'Analytics',    icon: BarChart2 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
            <Truck className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">Gate Pass System</h2>
            <p className="text-slate-500 text-sm font-medium">RGP / NRGP / Inward / Outward — Factory Gate Control</p>
          </div>
        </div>
        <button onClick={() => openForm('CREATE')}
          className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Generate Gate Pass
        </button>
      </div>

      {/* ── KPI Row ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Active Returnables" value={kpis.activeRgp} sub="Material with job-workers" color="amber" />
        <KpiCard label="Inward Today" value={kpis.inwardToday} sub="Receipts across gates" color="indigo" />
        <KpiCard label="Non-Returnable Issued" value={kpis.nrgp} sub="Sold goods & consumption" color="emerald" />
        <KpiCard label="Overdue RGPs" value={kpis.overdueRgp}
          sub={kpis.overdueRgp > 0 ? '⚠ Past expected return date' : 'All on schedule'}
          color={kpis.overdueRgp > 0 ? 'rose' : 'emerald'} />
      </div>

      {/* ── Main Panel ──────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">

        {/* Tab bar + filters */}
        <div className="border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between px-5 pt-3">
            {/* Tabs */}
            <div className="flex gap-1">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-t-lg border border-b-0 transition-colors ${
                    activeTab === t.id
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-amber-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}>
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Filters – only on LOG tab */}
            {activeTab === 'LOG' && (
              <div className="flex items-center gap-2 pb-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-amber-400 w-44"
                    placeholder="Search party, GP ID…"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                  />
                </div>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                  className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-slate-50 dark:bg-slate-950 focus:outline-none">
                  <option value="ALL">All Types</option>
                  {GP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label.split('–')[0].trim()}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-slate-50 dark:bg-slate-950 focus:outline-none">
                  <option value="ALL">All Status</option>
                  {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Tab content */}
        {activeTab === 'ANALYTICS' ? (
          <Analytics gatePasses={gatePasses as GatePass[]} />
        ) : (
          <>
            {/* Column headers */}
            <div className="grid grid-cols-12 gap-2 px-5 py-2.5 bg-slate-50 dark:bg-slate-900/60 text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <div className="col-span-2">GP ID</div>
              <div className="col-span-1">Date</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Party / Vendor</div>
              <div className="col-span-2">Vehicle / Driver</div>
              <div className="col-span-1">Items</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {/* Rows */}
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-bold">No gate passes found</p>
                <p className="text-xs mt-1">Try adjusting filters or generate a new pass.</p>
              </div>
            ) : filtered.map(gp => {
              const tm = typeMeta(gp.type);
              const isOverdue = gp.type === 'RETURNABLE' && gp.status !== 'RETURNED' && gp.expectedReturnDate && gp.expectedReturnDate < today();
              const transitions = WORKFLOW_TRANSITIONS[gp.status ?? 'ISSUED'] ?? [];

              return (
                <div key={gp.id}
                  className={`grid grid-cols-12 gap-2 px-5 py-3.5 items-center border-b border-slate-100 dark:border-slate-800/50 last:border-0
                    hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-l-2 ${colorCls(tm.color, 'row')}`}>

                  <div className="col-span-2 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="font-bold text-slate-800 dark:text-white text-xs truncate">{gp.number}</span>
                    {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                  </div>

                  <div className="col-span-1 text-xs text-slate-500">{gp.date.slice(5)}</div>

                  <div className="col-span-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${colorCls(tm.color, 'badge')}`}>
                      {gp.type.replace(/_/g, ' ')}
                    </span>
                    {gp.department && <div className="text-[9px] text-slate-400 mt-0.5">{gp.department}</div>}
                  </div>

                  <div className="col-span-2">
                    <div className="font-bold text-slate-700 dark:text-slate-200 text-xs truncate">{gp.partyName || '—'}</div>
                    {gp.referenceId && <div className="text-[9px] text-slate-400 truncate">{gp.referenceId}</div>}
                  </div>

                  <div className="col-span-2">
                    <div className="font-bold text-slate-700 dark:text-slate-200 text-xs">{gp.vehicleNo || '—'}</div>
                    {gp.driverName && <div className="text-[9px] text-slate-400 truncate">{gp.driverName}</div>}
                  </div>

                  <div className="col-span-1 text-xs text-slate-500">{gp.items?.length ?? 0} items</div>

                  <div className="col-span-1"><StatusBadge status={gp.status ?? 'ISSUED'} /></div>

                  {/* Action menu */}
                  <div className="col-span-1 text-right relative">
                    <button onClick={() => setActionMenu(actionMenu === gp.id ? null : gp.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {actionMenu === gp.id && (
                      <div className="absolute right-0 top-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 w-44 overflow-hidden text-left">
                        <button onClick={() => openForm('VIEW', gp)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
                          <Eye className="w-3.5 h-3.5" /> View Details
                        </button>
                        {gp.status !== 'CANCELLED' && gp.status !== 'RETURNED' && (
                          <button onClick={() => openForm('EDIT', gp)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </button>
                        )}
                        <button onClick={() => printGatePass(gp)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
                          <Printer className="w-3.5 h-3.5" /> Print
                        </button>
                        {transitions.length > 0 && (
                          <div className="border-t border-slate-100 dark:border-slate-700 pt-1">
                            <div className="px-3 py-1 text-[9px] font-bold uppercase text-slate-400">Move To</div>
                            {transitions.map(s => (
                              <button key={s} onClick={() => transition(gp, s)}
                                className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
                                <RefreshCw className="w-3 h-3" /> {STATUS_META[s]?.label ?? s}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Footer count */}
            {filtered.length > 0 && (
              <div className="px-5 py-3 text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
                Showing {filtered.length} of {gatePasses.length} passes
              </div>
            )}
          </>
        )}
      </div>

      {/* Form Modal */}
      {formState.open && (
        <GatePassForm
          initial={formState.gp}
          mode={formState.mode}
          onSave={handleSave}
          onClose={() => setFormState({ open: false, mode: 'CREATE' })}
        />
      )}

      {/* Click-away for action menu */}
      {actionMenu && (
        <div className="fixed inset-0 z-20" onClick={() => setActionMenu(null)} />
      )}
    </div>
  );
}
