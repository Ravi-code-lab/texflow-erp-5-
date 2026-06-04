import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  Database,
  Edit3,
  FileCheck,
  FileText,
  Filter,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { BaseEntity, ViewState } from '../types';
import { createERPDocument } from '../modules/documentEngine';
import { DOCTYPE_SCHEMAS, DocField, DocTypeSchema } from '../modules/doctypes';
import { getERPModuleByView } from '../modules/registry';

export interface DocumentDeskCollection<T extends BaseEntity & Record<string, any> = BaseEntity & Record<string, any>> {
  view: ViewState;
  label: string;
  documents: T[];
  onAdd: (document: T) => void;
  onUpdate: (document: T) => void;
  onDelete?: (id: string) => void;
}

interface DocumentDeskProps {
  collections: DocumentDeskCollection[];
}

type FormMode = 'CREATE' | 'EDIT';

const baseFields: DocField[] = [
  { fieldname: 'id', label: 'Document ID', fieldtype: 'Data' },
  { fieldname: 'status', label: 'Status', fieldtype: 'Select' },
  { fieldname: 'docstatus', label: 'DocStatus', fieldtype: 'Int' },
  { fieldname: 'updatedAt', label: 'Last Updated', fieldtype: 'Date' },
  { fieldname: 'updatedBy', label: 'Updated By', fieldtype: 'Data' },
];

const formatValue = (value: unknown) => {
  if (value === undefined || value === null || value === '') return '-';
  if (Array.isArray(value)) return `${value.length} rows`;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const statusTone = (status: string) => {
  if (['CANCELLED', 'REJECTED', 'FAILED'].includes(status)) return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900';
  if (['COMPLETED', 'FULFILLED', 'RECEIVED', 'PAID', 'PASSED'].includes(status)) return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900';
  if (['DRAFT', 'PLANNED'].includes(status)) return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800';
  return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900';
};

const getDefaultValue = (field: DocField) => {
  if (field.fieldtype === 'Date') return new Date().toISOString().split('T')[0];
  if (['Currency', 'Float', 'Int'].includes(field.fieldtype)) return 0;
  if (field.fieldtype === 'Check') return false;
  if (field.fieldtype === 'Table') return [];
  if (field.fieldtype === 'Select') return field.options?.[0] || '';
  return '';
};

const getFieldList = (schema?: DocTypeSchema) => {
  const fields = schema ? [...schema.fields] : [];
  const merged = [...baseFields, ...fields];
  return merged.filter((field, index) => merged.findIndex((candidate) => candidate.fieldname === field.fieldname) === index);
};

const makeInitialDocument = (schema?: DocTypeSchema) => {
  const values = Object.fromEntries((schema?.fields || []).map((field) => [field.fieldname, getDefaultValue(field)]));
  if (schema?.statuses?.length) values.status = schema.statuses[0];
  return values as Record<string, any>;
};

const resolveTitle = (doc: Record<string, any>) =>
  doc.customerName ||
  doc.supplierName ||
  doc.productName ||
  doc.name ||
  doc.requestedBy ||
  doc.id;

const parseTableValue = (value: string) => {
  if (!value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
};

const DocumentDesk: React.FC<DocumentDeskProps> = ({ collections }) => {
  const [selectedView, setSelectedView] = useState<ViewState>(collections[0]?.view || 'ORDERS');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [mode, setMode] = useState<FormMode>('CREATE');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [jsonError, setJsonError] = useState('');

  const collection = collections.find((item) => item.view === selectedView) || collections[0];
  const schema = DOCTYPE_SCHEMAS.find((item) => item.view === collection?.view);
  const meta = collection ? getERPModuleByView(collection.view) : undefined;
  const fields = useMemo(() => getFieldList(schema), [schema]);
  const listFields = useMemo(() => fields.filter((field) => !['Table'].includes(field.fieldtype)).slice(0, 6), [fields]);
  const editableFields = useMemo(() => fields.filter((field) => !['id', 'docstatus', 'updatedAt', 'updatedBy'].includes(field.fieldname)), [fields]);

  useEffect(() => {
    setStatus('All');
    setQuery('');
    setIsFormOpen(false);
    setFormValues(makeInitialDocument(schema));
  }, [selectedView, schema]);

  const statusOptions = useMemo(() => {
    const values = new Set<string>();
    schema?.statuses?.forEach((item) => values.add(item));
    collection?.documents.forEach((doc) => values.add(String(doc.status || doc.docstatus || 'OPEN')));
    return ['All', ...Array.from(values).sort()];
  }, [collection, schema]);

  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return (collection?.documents || [])
      .filter((doc) => !doc.deleted)
      .filter((doc) => status === 'All' || String(doc.status || doc.docstatus || 'OPEN') === status)
      .filter((doc) => {
        if (!normalized) return true;
        return fields
          .map((field) => formatValue(doc[field.fieldname]))
          .join(' ')
          .toLowerCase()
          .includes(normalized);
      });
  }, [collection, fields, query, status]);

  const openCreate = () => {
    setMode('CREATE');
    setJsonError('');
    setFormValues(makeInitialDocument(schema));
    setIsFormOpen(true);
  };

  const openEdit = (document: Record<string, any>) => {
    setMode('EDIT');
    setJsonError('');
    setFormValues({ ...document });
    setIsFormOpen(true);
  };

  const updateField = (field: DocField, value: string | boolean) => {
    setFormValues((current) => {
      if (field.fieldtype === 'Check') return { ...current, [field.fieldname]: Boolean(value) };
      if (['Currency', 'Float', 'Int'].includes(field.fieldtype)) return { ...current, [field.fieldname]: Number(value) };
      if (field.fieldtype === 'Table') return { ...current, [field.fieldname]: value };
      return { ...current, [field.fieldname]: value };
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!collection) return;

    setJsonError('');
    try {
      const normalized = editableFields.reduce<Record<string, any>>((acc, field) => {
        const value = formValues[field.fieldname];
        if (field.fieldtype === 'Table') {
          acc[field.fieldname] = Array.isArray(value) ? value : parseTableValue(String(value || ''));
        } else {
          acc[field.fieldname] = value;
        }
        return acc;
      }, {});

      const document = mode === 'CREATE'
        ? createERPDocument(collection.view, normalized)
        : { ...formValues, ...normalized };

      if (mode === 'CREATE') collection.onAdd(document as BaseEntity & Record<string, any>);
      else collection.onUpdate(document as BaseEntity & Record<string, any>);

      setIsFormOpen(false);
    } catch {
      setJsonError('Table fields must contain valid JSON, such as [{"productName":"Yarn","quantity":10}].');
    }
  };

  const totalRecords = collections.reduce((sum, item) => sum + item.documents.filter((doc) => !doc.deleted).length, 0);
  const docStatusSummary = visibleRows.reduce<Record<string, number>>((acc, doc) => {
    const key = String(doc.status || doc.docstatus || 'OPEN');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5 text-left">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-100 dark:border-blue-900 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
              <FileCheck className="w-3 h-3" />
              DocType List and Form
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Schema-driven documents with naming series</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">Document Desk</h1>
          <p className="text-sm text-slate-500 mt-1">Create, edit, search, and maintain ERP records through a reusable ERPNext-style document interface.</p>
        </div>

        <div className="grid grid-cols-3 gap-3 min-w-full sm:min-w-[520px]">
          {[
            { label: 'DocType', value: meta?.doctype || collection?.label || '-' },
            { label: 'Visible Rows', value: visibleRows.length },
            { label: 'All Records', value: totalRecords },
          ].map((item) => (
            <div key={item.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
              <p className="text-lg font-black text-slate-900 dark:text-white mt-1 truncate">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-5">
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              Source DocType
            </h2>
            <select
              value={selectedView}
              onChange={(event) => setSelectedView(event.target.value as ViewState)}
              className="mt-3 w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold outline-none"
            >
              {collections.map((item) => (
                <option key={item.view} value={item.view}>{item.label}</option>
              ))}
            </select>
            <button
              onClick={openCreate}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Document
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Schema Fields
            </h2>
            <div className="mt-3 space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar">
              {fields.map((field) => (
                <div key={field.fieldname} className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black text-slate-700 dark:text-slate-300 truncate">{field.label}</p>
                    {field.required && <span className="text-[9px] font-black uppercase tracking-widest text-rose-600">Req</span>}
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">{field.fieldname} / {field.fieldtype}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="relative flex-1 max-w-xl">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:border-blue-500"
                  placeholder="Search document fields..."
                />
              </div>
              <div className="relative w-full lg:w-56">
                <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none"
                >
                  {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    {listFields.map((field) => <th key={field.fieldname} className="px-4 py-3">{field.label}</th>)}
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visibleRows.map((doc) => {
                    const currentStatus = String(doc.status || doc.docstatus || 'OPEN');

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                        {listFields.map((field) => (
                          <td key={field.fieldname} className="px-4 py-3 max-w-[220px]">
                            {field.fieldname === 'status' || field.fieldname === 'docstatus' ? (
                              <span className={`inline-flex border px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${statusTone(currentStatus)}`}>
                                {currentStatus}
                              </span>
                            ) : (
                              <span className="block truncate text-slate-700 dark:text-slate-300 font-medium">{formatValue(doc[field.fieldname])}</span>
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEdit(doc)}
                              className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-600"
                              title="Edit document"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {collection?.onDelete && (
                              <button
                                onClick={() => collection.onDelete?.(doc.id)}
                                className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-rose-600"
                                title="Delete document"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(docStatusSummary).slice(0, 6).map(([label, value]) => (
              <div key={label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate">{label}</p>
                <p className="text-xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[220] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsFormOpen(false)} />
          <form onSubmit={handleSubmit} className="relative w-full max-w-2xl h-full bg-white dark:bg-slate-950 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">{schema?.name || collection?.label}</p>
                <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">{mode === 'CREATE' ? 'New Document' : resolveTitle(formValues)}</h2>
                <p className="text-xs text-slate-500 mt-1">{schema?.namingSeries || 'Custom naming'} / {mode}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
              {jsonError && (
                <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-300">
                  {jsonError}
                </div>
              )}
              {editableFields.map((field) => {
                const value = formValues[field.fieldname];

                return (
                  <label key={field.fieldname} className="block">
                    <span className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                      {field.label}
                      {field.required && <span className="text-rose-600">Required</span>}
                    </span>
                    {field.fieldtype === 'Select' ? (
                      <select
                        value={String(value ?? '')}
                        onChange={(event) => updateField(field, event.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:border-blue-500"
                      >
                        {(field.fieldname === 'status' ? schema?.statuses : field.options)?.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : field.fieldtype === 'Check' ? (
                      <button
                        type="button"
                        onClick={() => updateField(field, !value)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-bold ${
                          value
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900'
                            : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900 dark:border-slate-800'
                        }`}
                      >
                        {value ? 'Enabled' : 'Disabled'}
                        {value && <Check className="w-4 h-4" />}
                      </button>
                    ) : field.fieldtype === 'Table' ? (
                      <textarea
                        rows={6}
                        value={Array.isArray(value) ? JSON.stringify(value, null, 2) : String(value || '')}
                        onChange={(event) => updateField(field, event.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-mono outline-none focus:border-blue-500"
                        placeholder='[{"productName":"Item","quantity":1}]'
                      />
                    ) : (
                      <input
                        type={field.fieldtype === 'Date' ? 'date' : ['Currency', 'Float', 'Int'].includes(field.fieldtype) ? 'number' : 'text'}
                        value={String(value ?? '')}
                        onChange={(event) => updateField(field, event.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:border-blue-500"
                      />
                    )}
                    <span className="mt-1 block text-[10px] text-slate-400 font-mono">{field.fieldname} / {field.fieldtype}</span>
                  </label>
                );
              })}
            </div>

            <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors"
              >
                <Save className="w-4 h-4" />
                Save
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default DocumentDesk;
