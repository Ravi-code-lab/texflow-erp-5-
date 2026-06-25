/**
 * DynamicForm.tsx — ERPNext-Style Dynamic Form Engine
 * ─────────────────────────────────────────────────────
 * Drop into src/components/DynamicForm.tsx
 *
 * Renders any DocType schema from doctypes.ts as a live, validated form.
 * Supports all field types: Data, Date, Currency, Float, Int, Select,
 * Link, Check, Table.
 *
 * Usage:
 *   <DynamicForm
 *     schema={getDocTypeSchema('ORDERS')}
 *     initialValues={order}
 *     onSave={async (doc) => { ... }}
 *     onCancel={() => setView('list')}
 *     collections={{ customers, suppliers, inventory }}
 *     currentUser={currentUser?.name}
 *     readOnly={docstatus === 1}
 *   />
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Save, X, ChevronDown, CheckSquare, Square, Plus, Trash2,
  AlertCircle, Loader2, Lock,
} from 'lucide-react';
import { DocTypeSchema, DocField } from '../modules/doctypes';
import { createERPDocument } from '../modules/documentEngine';
import { getAvailableTransitions } from '../modules/workflows';
import { prepareDocumentCreate, prepareDocumentUpdate } from '../modules/documentLifecycle';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface DynamicFormProps<T extends Record<string, any>> {
  schema: DocTypeSchema | null | undefined;
  /** Existing record for edit mode; undefined = create mode */
  initialValues?: Partial<T>;
  /** Called with the fully prepared document on Save */
  onSave: (doc: T) => Promise<void>;
  onCancel: () => void;
  /** Map of collection name → array of records (for Link field dropdowns) */
  collections?: Record<string, Array<{ id: string; name?: string; [k: string]: any }>>;
  currentUser?: string;
  readOnly?: boolean;
  /** Hide the status field from the form (managed externally via workflow buttons) */
  hideStatus?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Field renderers
// ─────────────────────────────────────────────────────────────────────────────

const inputBase =
  'w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all';

const readonlyBase =
  'w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 cursor-not-allowed';

interface FieldProps {
  key?: React.Key;
  field: DocField;
  value: any;
  onChange: (val: any) => any;
  collections?: DynamicFormProps<any>['collections'];
  error?: string;
  readOnly?: boolean;
}

function DataField({ field, value, onChange, error, readOnly }: FieldProps) {
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={field.label}
      className={readOnly ? readonlyBase : inputBase}
      disabled={readOnly}
    />
  );
}

function DateField({ field, value, onChange, readOnly }: FieldProps) {
  return (
    <input
      type="date"
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      className={readOnly ? readonlyBase : inputBase}
      disabled={readOnly}
    />
  );
}

function NumberField({ field, value, onChange, readOnly, isCurrency }: FieldProps & { isCurrency?: boolean }) {
  return (
    <div className="relative">
      {isCurrency && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₹</span>
      )}
      <input
        type="number"
        value={value ?? ''}
        onChange={e => { const v = field.fieldtype === 'Int' ? parseInt(e.target.value) : parseFloat(e.target.value); if (!isNaN(v)) onChange(v); }}
        placeholder="0"
        className={`${readOnly ? readonlyBase : inputBase} ${isCurrency ? 'pl-7' : ''}`}
        disabled={readOnly}
        step={field.fieldtype === 'Int' ? '1' : '0.01'}
      />
    </div>
  );
}

function SelectField({ field, value, onChange, readOnly }: FieldProps) {
  if (readOnly) {
    return (
      <div className={readonlyBase}>{value || '—'}</div>
    );
  }
  return (
    <div className="relative">
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        className={`${inputBase} appearance-none pr-8`}
      >
        <option value="">— Select —</option>
        {field.options?.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}

function LinkField({ field, value, onChange, collections, readOnly }: FieldProps) {
  const linkKey = field.linkTo?.toLowerCase().replace(/\s/g, '') ?? '';
  // Try to find the collection by linkTo name (case-insensitive fuzzy match)
  const options = useMemo(() => {
    if (!collections) return [];
    const key = Object.keys(collections).find(
      k => k.toLowerCase().replace(/\s/g, '').includes(linkKey) ||
           linkKey.includes(k.toLowerCase().replace(/\s/g, ''))
    );
    return key ? collections[key] : [];
  }, [collections, linkKey]);

  if (readOnly) {
    const found = options.find(o => o.id === value || o.name === value);
    return <div className={readonlyBase}>{found?.name ?? value ?? '—'}</div>;
  }

  return (
    <div className="relative">
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        className={`${inputBase} appearance-none pr-8`}
      >
        <option value="">— Select {field.linkTo} —</option>
        {options.map(opt => (
          <option key={opt.id} value={opt.id}>{opt.name ?? opt.id}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}

function CheckField({ field, value, onChange, readOnly }: FieldProps) {
  const checked = !!value;
  return (
    <button
      type="button"
      onClick={() => !readOnly && onChange(!checked)}
      className={`flex items-center gap-2 text-sm ${readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {checked
        ? <CheckSquare size={18} className="text-indigo-500" />
        : <Square size={18} className="text-gray-400" />}
      <span className="text-gray-600 dark:text-gray-300">{field.label}</span>
    </button>
  );
}

// Simple Table field — renders a basic row editor for child records
function TableField({ field, value, onChange, readOnly }: FieldProps) {
  const rows: Array<Record<string, any>> = Array.isArray(value) ? value : [];

  const addRow = () => {
    onChange([...rows, { _id: Date.now().toString() }]);
  };

  const removeRow = (idx: number) => {
    onChange(rows.filter((_, i) => i !== idx));
  };

  const updateCell = (idx: number, col: string, val: string) => {
    const updated = rows.map((r, i) => i === idx ? { ...r, [col]: val } : r);
    onChange(updated);
  };

  // Derive columns from first row or show generic item/qty/rate
  const cols = rows.length > 0
    ? Object.keys(rows[0]).filter(k => k !== '_id')
    : ['item', 'qty', 'rate', 'amount'];

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              {cols.map(col => (
                <th key={col} className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400 capitalize">
                  {col}
                </th>
              ))}
              {!readOnly && <th className="w-8" />}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={cols.length + 1} className="px-3 py-4 text-center text-gray-400 text-xs">
                  No rows yet
                </td>
              </tr>
            )}
            {rows.map((row, idx) => (
              <tr key={row._id ?? idx} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                {cols.map(col => (
                  <td key={col} className="px-2 py-1">
                    <input
                      type="text"
                      value={row[col] ?? ''}
                      onChange={e => updateCell(idx, col, e.target.value)}
                      disabled={readOnly}
                      className="w-full px-2 py-1 text-xs bg-transparent outline-none focus:bg-gray-50 dark:focus:bg-gray-800 rounded border border-transparent focus:border-indigo-300 transition-all"
                    />
                  </td>
                ))}
                {!readOnly && (
                  <td className="px-1 py-1">
                    <button
                      onClick={() => removeRow(idx)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <button
          onClick={addRow}
          className="w-full flex items-center gap-1.5 px-3 py-2 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors border-t border-gray-100 dark:border-gray-800"
        >
          <Plus size={12} /> Add row
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Field renderer dispatcher
// ─────────────────────────────────────────────────────────────────────────────

function renderField(props: FieldProps) {
  switch (props.field.fieldtype) {
    case 'Date':      return <DateField {...props} />;
    case 'Currency':  return <NumberField {...props} isCurrency />;
    case 'Float':     return <NumberField {...props} />;
    case 'Int':       return <NumberField {...props} />;
    case 'Select':    return <SelectField {...props} />;
    case 'Link':      return <LinkField {...props} />;
    case 'Check':     return <CheckField {...props} />;
    case 'Table':     return <TableField {...props} />;
    default:          return <DataField {...props} />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  CONFIRMED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  FULFILLED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const cls = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main DynamicForm component
// ─────────────────────────────────────────────────────────────────────────────

export function DynamicForm<T extends Record<string, any>>({
  schema,
  initialValues,
  onSave,
  onCancel,
  collections,
  currentUser = 'System',
  readOnly = false,
  hideStatus = false,
}: DynamicFormProps<T>) {
  const isEditMode = !!initialValues?.id;

  // Build initial form state from schema defaults + initialValues
  const [values, setValues] = useState<Record<string, any>>(() => {
    const defaults: Record<string, any> = {};
    schema?.fields.forEach(f => {
      defaults[f.fieldname] = initialValues?.[f.fieldname] ?? undefined;
    });
    return {
      ...defaults,
      id: initialValues?.id,
      status: initialValues?.status ?? schema?.statuses?.[0],
      doctype: initialValues?.doctype ?? schema?.name,
      docstatus: initialValues?.docstatus ?? 0,
      createdAt: initialValues?.createdAt,
      updatedAt: initialValues?.updatedAt,
      version: initialValues?.version,
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const setValue = useCallback((fieldname: string, val: any) => {
    setValues(prev => ({ ...prev, [fieldname]: val }));
    setErrors(prev => {
      if (!prev[fieldname]) return prev;
      const next = { ...prev };
      delete next[fieldname];
      return next;
    });
  }, []);

  // Workflow transitions available from current status
  const transitions = useMemo(() => {
    if (!schema) return [];
    return getAvailableTransitions(schema.view, values.status);
  }, [schema, values.status]);

  // Validate required fields
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    schema?.fields.forEach(f => {
      if (f.required) {
        const v = values[f.fieldname];
        const empty = v === undefined || v === null || v === '' ||
          (Array.isArray(v) && v.length === 0);
        if (empty) newErrors[f.fieldname] = `${f.label} is required`;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (overrides?: Record<string, any>) => {
    if (readOnly || !validate()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const effectiveValues = overrides ? { ...values, ...overrides } : values;
      let doc: T;
      if (isEditMode) {
        doc = prepareDocumentUpdate(
          effectiveValues as any,
          initialValues as any,
          currentUser
        ) as any;
      } else {
        const created = createERPDocument(schema!.view, effectiveValues as T, {
          status: effectiveValues.status,
        });
        doc = prepareDocumentCreate(created as any, currentUser) as any;
      }
      await onSave(doc);
    } catch (e: any) {
      setSaveError(e?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleWorkflowAction = async (toStatus: string) => {
    if (readOnly) return;
    setValue('status', toStatus);
    // Pass the new status directly to avoid stale closure over `values`
    await handleSave({ status: toStatus });
  };

  if (!schema) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-gray-400">
        <AlertCircle size={16} /> No DocType schema found for this view.
      </div>
    );
  }

  // Split fields: Table fields go full-width at bottom; others go in 2-col grid
  const inlineFields = schema.fields.filter(
    f => f.fieldtype !== 'Table' && f.fieldtype !== 'Check' &&
      !(hideStatus && f.fieldname === 'status')
  );
  const checkFields = schema.fields.filter(f => f.fieldtype === 'Check');
  const tableFields = schema.fields.filter(f => f.fieldtype === 'Table');

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">

      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {isEditMode ? values.id : `New ${schema.name}`}
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {schema.module} › {schema.name}
            </p>
          </div>
          <StatusBadge status={values.status} />
          {values.docstatus === 1 && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Lock size={11} /> Submitted
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Workflow action buttons */}
          {!readOnly && transitions.map(t => (
            <button
              key={t.action}
              onClick={() => handleWorkflowAction(t.to)}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700 transition-colors"
            >
              {t.action}
            </button>
          ))}
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── Naming series + meta ── */}
      {isEditMode && (
        <div className="px-5 py-2 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-4 text-xs text-gray-400 border-b border-gray-100 dark:border-gray-800">
          <span>Series: <span className="font-mono text-gray-600 dark:text-gray-300">{schema.namingSeries}</span></span>
          {values.createdAt && (
            <span>Created: {new Date(values.createdAt).toLocaleDateString('en-IN')}</span>
          )}
          {values.updatedAt && (
            <span>Modified: {new Date(values.updatedAt).toLocaleDateString('en-IN')}</span>
          )}
          {values.version && (
            <span>v{values.version}</span>
          )}
        </div>
      )}

      {/* ── Save error ── */}
      {saveError && (
        <div className="mx-5 mt-4 flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle size={14} /> {saveError}
        </div>
      )}

      {/* ── Form fields ── */}
      <div className="p-5 space-y-5">

        {/* Status field (Select) — shown separately unless hidden */}
        {!hideStatus && schema.statuses && schema.statuses.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Status
              </label>
              <SelectField
                field={{
                  fieldname: 'status',
                  label: 'Status',
                  fieldtype: 'Select',
                  options: schema.statuses,
                }}
                value={values.status}
                onChange={v => setValue('status', v)}
                readOnly={readOnly}
              />
            </div>
          </div>
        )}

        {/* Inline fields — 2-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {inlineFields.map(field => (
            <div key={field.fieldname} className={field.fieldtype === 'Data' && field.fieldname.includes('note') ? 'col-span-2' : ''}>
              <label className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {field.label}
                {field.required && <span className="text-red-400">*</span>}
              </label>
              {renderField({
                field,
                value: values[field.fieldname],
                onChange: v => setValue(field.fieldname, v),
                collections,
                error: errors[field.fieldname],
                readOnly,
              })}
              {errors[field.fieldname] && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={11} /> {errors[field.fieldname]}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Check fields */}
        {checkFields.length > 0 && (
          <div className="flex flex-wrap gap-4">
            {checkFields.map(field => (
              <CheckField
                key={field.fieldname}
                field={field}
                value={values[field.fieldname]}
                onChange={(v: any) => setValue(field.fieldname, v)}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}

        {/* Table fields — full width */}
        {tableFields.map(field => (
          <div key={field.fieldname}>
            <label className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              {field.label}
              {field.required && <span className="text-red-400">*</span>}
            </label>
            <TableField
              field={field}
              value={values[field.fieldname]}
              onChange={v => setValue(field.fieldname, v)}
              readOnly={readOnly}
            />
            {errors[field.fieldname] && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={11} /> {errors[field.fieldname]}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ── Footer actions ── */}
      {!readOnly && (
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-sm rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving…' : (isEditMode ? 'Update' : 'Create')}
          </button>
        </div>
      )}
    </div>
  );
}
