import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  FileUp,
  Search,
  Table2,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import { BaseEntity, ViewState } from '../types';
import { createERPDocument } from '../modules/documentEngine';
import { DOCTYPE_SCHEMAS, DocField } from '../modules/doctypes';
import { getERPModuleByView } from '../modules/registry';

export interface DataImportCollection<T extends BaseEntity & Record<string, any> = BaseEntity & Record<string, any>> {
  view: ViewState;
  label: string;
  documents: T[];
  onImport: (documents: T[]) => void;
}

interface DataImportToolProps {
  collections: DataImportCollection[];
}

interface PreviewRow {
  id: string;
  rowNumber: number;
  values: Record<string, any>;
  errors: string[];
}

const parseValue = (field: DocField, rawValue: unknown) => {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    if (field.fieldtype === 'Table') return [];
    if (field.fieldtype === 'Check') return false;
    return '';
  }

  if (['Currency', 'Float', 'Int'].includes(field.fieldtype)) return Number(rawValue) || 0;
  if (field.fieldtype === 'Check') return ['true', 'yes', '1', 'y'].includes(String(rawValue).trim().toLowerCase());
  if (field.fieldtype === 'Table') {
    if (Array.isArray(rawValue)) return rawValue;
    const text = String(rawValue).trim();
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return text.split('|').map((item) => ({ value: item.trim() })).filter((item) => item.value);
    }
  }

  return String(rawValue).trim();
};

const escapeCsv = (value: unknown) => {
  const text = value === undefined || value === null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const downloadBlob = (filename: string, content: string, type = 'text/csv;charset=utf-8;') => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const sampleForField = (field: DocField) => {
  if (field.fieldtype === 'Date') return new Date().toISOString().split('T')[0];
  if (['Currency', 'Float', 'Int'].includes(field.fieldtype)) return 100;
  if (field.fieldtype === 'Check') return 'TRUE';
  if (field.fieldtype === 'Select') return field.options?.[0] || '';
  if (field.fieldtype === 'Table') return '[{"productName":"Sample Item","quantity":1}]';
  if (field.linkTo) return `Sample ${field.linkTo}`;
  return `Sample ${field.label}`;
};

const DataImportTool: React.FC<DataImportToolProps> = ({ collections }) => {
  const [selectedView, setSelectedView] = useState<ViewState>(collections[0]?.view || 'ORDERS');
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [query, setQuery] = useState('');
  const [importMode, setImportMode] = useState<'INSERT' | 'UPSERT'>('UPSERT');
  const [lastMessage, setLastMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const collection = collections.find((item) => item.view === selectedView) || collections[0];
  const schema = DOCTYPE_SCHEMAS.find((item) => item.view === collection?.view);
  const meta = collection ? getERPModuleByView(collection.view) : undefined;
  const importFields = useMemo(() => schema?.fields || [], [schema]);
  const requiredFields = useMemo(() => importFields.filter((field) => field.required), [importFields]);

  const resetPreview = () => {
    setPreviewRows([]);
    setFileName('');
    setLastMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validateRow = (values: Record<string, any>) => {
    const errors: string[] = [];
    requiredFields.forEach((field) => {
      const value = values[field.fieldname];
      if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
        errors.push(`${field.label} is required`);
      }
    });

    importFields.forEach((field) => {
      if (field.fieldtype === 'Select' && field.options?.length) {
        const value = values[field.fieldname];
        if (value && !field.options.includes(String(value))) {
          errors.push(`${field.label} must be one of ${field.options.join(', ')}`);
        }
      }
    });

    return errors;
  };

  const parseRows = (rawRows: Record<string, any>[]) => rawRows
    .filter((row) => Object.values(row).some((value) => value !== undefined && value !== null && String(value).trim() !== ''))
    .map((row, index) => {
      const values = importFields.reduce<Record<string, any>>((acc, field) => {
        const direct = row[field.fieldname];
        const byLabel = row[field.label];
        acc[field.fieldname] = parseValue(field, direct ?? byLabel);
        return acc;
      }, {});

      return {
        id: `ROW-${index + 1}`,
        rowNumber: index + 2,
        values,
        errors: validateRow(values),
      };
    });

  const handleFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setLastMessage('');

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
    setPreviewRows(parseRows(rawRows));
  };

  const downloadTemplate = () => {
    const headers = importFields.map((field) => field.fieldname);
    const sample = importFields.map(sampleForField);
    const body = [headers, sample].map((row) => row.map(escapeCsv).join(',')).join('\n');
    downloadBlob(`${schema?.name || collection?.label || 'doctype'}_import_template.csv`, body);
  };

  const validRows = previewRows.filter((row) => row.errors.length === 0);
  const invalidRows = previewRows.filter((row) => row.errors.length > 0);
  const visibleRows = previewRows.filter((row) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return true;
    return [
      row.rowNumber,
      ...Object.values(row.values),
      ...row.errors,
    ].join(' ').toLowerCase().includes(normalized);
  });

  const commitImport = () => {
    if (!collection || !validRows.length) return;

    const existingIds = new Set(collection.documents.map((doc) => doc.id));
    const documents = validRows.map((row) => {
      const candidate = createERPDocument(collection.view, row.values);
      if (importMode === 'INSERT' || !row.values.id || existingIds.has(row.values.id)) {
        return candidate;
      }
      return {
        ...candidate,
        id: row.values.id,
      };
    });

    collection.onImport(documents as Array<BaseEntity & Record<string, any>>);
    setLastMessage(`${documents.length} ${collection.label} record${documents.length === 1 ? '' : 's'} imported into IndexedDB storage.`);
    setPreviewRows([]);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-5 text-left">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
              <FileSpreadsheet className="w-3 h-3" />
              Data Import
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">CSV / XLSX templates and bulk document creation</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">Data Import Tool</h1>
          <p className="text-sm text-slate-500 mt-1">Download a DocType template, upload spreadsheet rows, validate fields, and import records into the local ERP vault.</p>
        </div>

        <div className="grid grid-cols-3 gap-3 min-w-full sm:min-w-[520px]">
          {[
            { label: 'Source', value: meta?.doctype || collection?.label || '-' },
            { label: 'Valid Rows', value: validRows.length },
            { label: 'Errors', value: invalidRows.length },
          ].map((item) => (
            <div key={item.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
              <p className="text-lg font-black text-slate-900 dark:text-white mt-1 truncate tabular-nums">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-5">
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              Import Target
            </h2>
            <select
              value={selectedView}
              onChange={(event) => {
                setSelectedView(event.target.value as ViewState);
                resetPreview();
              }}
              className="mt-3 w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold outline-none"
            >
              {collections.map((item) => (
                <option key={item.view} value={item.view}>{item.label}</option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2 mt-3">
              {(['UPSERT', 'INSERT'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setImportMode(mode)}
                  className={`px-3 py-2 rounded-lg border text-xs font-black uppercase tracking-widest ${
                    importMode === mode
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-600" />
              Template
            </h2>
            <p className="text-xs text-slate-500 mt-2">The template uses DocType fieldnames as headers and includes one editable sample row.</p>
            <button
              onClick={downloadTemplate}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors"
            >
              <Download className="w-4 h-4" />
              Download CSV Template
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Table2 className="w-4 h-4 text-emerald-600" />
              Required Fields
            </h2>
            <div className="mt-3 space-y-2">
              {requiredFields.length ? requiredFields.map((field) => (
                <div key={field.fieldname} className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-lg">
                  <p className="text-xs font-black text-slate-700 dark:text-slate-300">{field.label}</p>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">{field.fieldname} / {field.fieldtype}</p>
                </div>
              )) : (
                <p className="text-xs text-slate-400">This DocType does not mark any required fields.</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10 transition-colors"
            >
              <UploadCloud className="w-10 h-10 text-emerald-600 mb-3" />
              <span className="text-sm font-black text-slate-800 dark:text-slate-200">Upload CSV or Excel file</span>
              <span className="text-xs text-slate-400 mt-1">{fileName || 'No file selected'}</span>
            </button>

            {lastMessage && (
              <div className="mt-4 p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-bold dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {lastMessage}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Import Preview</h2>
                <p className="text-xs text-slate-500 mt-0.5">Only rows without validation errors will be imported.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="w-full sm:w-72 pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:border-emerald-500"
                    placeholder="Search preview..."
                  />
                </div>
                <button
                  onClick={commitImport}
                  disabled={!validRows.length}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-sm font-bold transition-colors"
                >
                  <FileUp className="w-4 h-4" />
                  Import Valid Rows
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-4 py-3">Row</th>
                    <th className="px-4 py-3">Status</th>
                    {importFields.slice(0, 6).map((field) => <th key={field.fieldname} className="px-4 py-3">{field.label}</th>)}
                    <th className="px-4 py-3">Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visibleRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.rowNumber}</td>
                      <td className="px-4 py-3">
                        {row.errors.length ? (
                          <span className="inline-flex items-center gap-1 border px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900">
                            <XCircle className="w-3 h-3" />
                            Invalid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 border px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900">
                            <CheckCircle2 className="w-3 h-3" />
                            Ready
                          </span>
                        )}
                      </td>
                      {importFields.slice(0, 6).map((field) => (
                        <td key={field.fieldname} className="px-4 py-3 max-w-[220px]">
                          <span className="block truncate text-slate-700 dark:text-slate-300 font-medium">
                            {Array.isArray(row.values[field.fieldname]) ? `${row.values[field.fieldname].length} rows` : String(row.values[field.fieldname] ?? '-')}
                          </span>
                        </td>
                      ))}
                      <td className="px-4 py-3 max-w-[320px]">
                        {row.errors.length ? (
                          <span className="inline-flex items-start gap-1 text-xs text-rose-600 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>{row.errors.join('; ')}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!visibleRows.length && (
                    <tr>
                      <td colSpan={importFields.slice(0, 6).length + 3} className="px-4 py-12 text-center text-sm text-slate-400">
                        Upload a CSV or XLSX file to preview import rows.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataImportTool;
