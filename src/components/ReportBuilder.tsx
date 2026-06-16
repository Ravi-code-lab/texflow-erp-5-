import { getItem, setItem } from '../utils/networkClient';
import React, { useEffect, useMemo, useState } from 'react';
import { BarChart4, Check, Download, FileSpreadsheet, Filter, Save, Search, Table2 } from 'lucide-react';
import { BaseEntity, ViewState } from '../types';
import { DOCTYPE_SCHEMAS, DocField } from '../modules/doctypes';
import { getERPModuleByView } from '../modules/registry';

export interface ReportCollection<T extends BaseEntity & Record<string, any> = BaseEntity & Record<string, any>> {
  view: ViewState;
  label: string;
  documents: T[];
}

interface SavedReport {
  id: string;
  name: string;
  view: ViewState;
  columns: string[];
  search: string;
  status: string;
  createdAt: string;
}

interface ReportBuilderProps {
  collections: ReportCollection[];
}

const STORAGE_KEY = 'texflow_report_builder_saved_reports';

const baseFields: DocField[] = [
  { fieldname: 'id', label: 'ID', fieldtype: 'Data', required: true },
  { fieldname: 'status', label: 'Status', fieldtype: 'Data' },
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

const escapeCsv = (value: unknown) => {
  const text = formatValue(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const downloadCsv = (filename: string, columns: DocField[], rows: Record<string, any>[]) => {
  const header = columns.map((field) => escapeCsv(field.label)).join(',');
  const body = rows.map((row) => columns.map((field) => escapeCsv(row[field.fieldname])).join(',')).join('\n');
  const blob = new Blob([[header, body].filter(Boolean).join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const ReportBuilder: React.FC<ReportBuilderProps> = ({ collections }) => {
  const [selectedView, setSelectedView] = useState<ViewState>(collections[0]?.view || 'ORDERS');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [reportName, setReportName] = useState('');
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);

  const collection = collections.find((item) => item.view === selectedView) || collections[0];
  const schema = DOCTYPE_SCHEMAS.find((item) => item.view === collection?.view);
  const meta = collection ? getERPModuleByView(collection.view) : undefined;
  const availableFields = useMemo(() => {
    const schemaFields = schema?.fields || [];
    const merged = [...baseFields, ...schemaFields];
    return merged.filter((field, index) => merged.findIndex((candidate) => candidate.fieldname === field.fieldname) === index);
  }, [schema]);

  useEffect(() => {
    getItem<any[]>(STORAGE_KEY).then(saved => {
      if (Array.isArray(saved)) setSavedReports(saved);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const required = availableFields.filter((field) => field.required).map((field) => field.fieldname);
    const defaults = [...required, ...availableFields.slice(0, 5).map((field) => field.fieldname)];
    setSelectedColumns(Array.from(new Set(defaults)).slice(0, 7));
    setQuery('');
    setStatus('All');
  }, [selectedView, availableFields]);

  const statusOptions = useMemo(() => {
    const values = new Set<string>();
    collection?.documents.forEach((doc) => values.add(String(doc.status || doc.docstatus || 'OPEN')));
    return ['All', ...Array.from(values).sort()];
  }, [collection]);

  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return (collection?.documents || [])
      .filter((doc) => !doc.deleted)
      .filter((doc) => status === 'All' || String(doc.status || doc.docstatus || 'OPEN') === status)
      .filter((doc) => {
        if (!normalized) return true;
        return availableFields
          .map((field) => formatValue(doc[field.fieldname]))
          .join(' ')
          .toLowerCase()
          .includes(normalized);
      });
  }, [collection, query, status, availableFields]);

  const reportColumns = availableFields.filter((field) => selectedColumns.includes(field.fieldname));
  const numericSummaries = useMemo(() => reportColumns
    .filter((field) => ['Currency', 'Float', 'Int'].includes(field.fieldtype))
    .map((field) => ({
      field,
      total: visibleRows.reduce((sum, row) => sum + (Number(row[field.fieldname]) || 0), 0),
    }))
    .filter((item) => item.total !== 0), [reportColumns, visibleRows]);

  const toggleColumn = (fieldname: string) => {
    setSelectedColumns((current) =>
      current.includes(fieldname)
        ? current.filter((item) => item !== fieldname)
        : [...current, fieldname]
    );
  };

  const saveReport = () => {
    const nextReport: SavedReport = {
      id: `RPT-${Date.now()}`,
      name: reportName.trim() || `${collection?.label || 'Report'} View`,
      view: selectedView,
      columns: selectedColumns,
      search: query,
      status,
      createdAt: new Date().toISOString(),
    };
    const updated = [nextReport, ...savedReports].slice(0, 12);
    setSavedReports(updated);
    setItem(STORAGE_KEY, updated);
    setReportName('');
  };

  const loadReport = (report: SavedReport) => {
    setSelectedView(report.view);
    setSelectedColumns(report.columns);
    setQuery(report.search);
    setStatus(report.status);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
              <BarChart4 className="w-3 h-3" />
              Query Report Desk
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">User-built reports and CSV export</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">Report Builder</h1>
          <p className="text-sm text-slate-500 mt-1">Choose a DocType, select columns, filter rows, save report views, and export data.</p>
        </div>

        <div className="grid grid-cols-3 gap-3 min-w-full sm:min-w-[500px]">
          {[
            { label: 'DocType', value: meta?.doctype || collection?.label || '-' },
            { label: 'Rows', value: visibleRows.length },
            { label: 'Columns', value: reportColumns.length },
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
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Report Source
            </h3>
            <select
              value={selectedView}
              onChange={(event) => setSelectedView(event.target.value as ViewState)}
              className="mt-3 w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold outline-none"
            >
              {collections.map((item) => (
                <option key={item.view} value={item.view}>{item.label}</option>
              ))}
            </select>

            <div className="mt-4 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:border-emerald-500"
                  placeholder="Search rows..."
                />
              </div>
              <div className="relative">
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
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Table2 className="w-4 h-4 text-emerald-600" />
              Columns
            </h3>
            <div className="mt-3 max-h-[320px] overflow-y-auto custom-scrollbar space-y-1">
              {availableFields.map((field) => (
                <button
                  key={field.fieldname}
                  onClick={() => toggleColumn(field.fieldname)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 text-left"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{field.label}</span>
                    <span className="block text-[10px] text-slate-400 font-mono">{field.fieldname}</span>
                  </span>
                  <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                    selectedColumns.includes(field.fieldname)
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-slate-300 dark:border-slate-700 text-transparent'
                  }`}>
                    <Check className="w-3 h-3" />
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Save className="w-4 h-4 text-emerald-600" />
              Saved Reports
            </h3>
            <div className="mt-3 flex gap-2">
              <input
                value={reportName}
                onChange={(event) => setReportName(event.target.value)}
                className="min-w-0 flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none"
                placeholder="Report name"
              />
              <button onClick={saveReport} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black">
                Save
              </button>
            </div>
            <div className="mt-3 space-y-1">
              {savedReports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => loadReport(report)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{report.name}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">{report.view} / {report.columns.length} columns</p>
                </button>
              ))}
              {savedReports.length === 0 && <p className="text-xs text-slate-400 py-2">No saved report views yet.</p>}
            </div>
          </div>
        </div>

        <div className="space-y-5 min-w-0">
          {numericSummaries.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {numericSummaries.slice(0, 3).map(({ field, total }) => (
                <div key={field.fieldname} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sum / {field.label}</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white mt-1 tabular-nums">{total.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">{collection?.label || 'Report'} Preview</p>
                <p className="text-xs text-slate-400">Showing {visibleRows.length} active rows</p>
              </div>
              <button
                onClick={() => downloadCsv(`${collection?.label || 'Report'}-${new Date().toISOString().slice(0, 10)}.csv`, reportColumns, visibleRows)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 text-white rounded-lg text-sm font-bold"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left">
                <thead className="bg-slate-50 dark:bg-slate-950/60 text-[10px] uppercase tracking-widest text-slate-400">
                  <tr>
                    {reportColumns.map((field) => (
                      <th key={field.fieldname} className="px-4 py-3 font-black whitespace-nowrap">{field.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visibleRows.slice(0, 100).map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                      {reportColumns.map((field) => (
                        <td key={field.fieldname} className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 max-w-[280px] truncate">
                          {formatValue(row[field.fieldname])}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {visibleRows.length === 0 && (
                    <tr>
                      <td colSpan={Math.max(reportColumns.length, 1)} className="px-4 py-16 text-center text-slate-400">
                        <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-bold">No records match this report</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {visibleRows.length > 100 && (
              <div className="px-4 py-3 text-xs text-slate-400 border-t border-slate-200 dark:border-slate-800">
                Preview limited to 100 rows. CSV export includes all filtered rows.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportBuilder;
