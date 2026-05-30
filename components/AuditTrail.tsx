import React, { useMemo, useState } from 'react';
import { Activity, FileClock, Filter, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import { AuditLog } from '../types';

interface AuditTrailProps {
  logs: AuditLog[];
}

const actionStyles: Record<AuditLog['action'], string> = {
  CREATE: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900',
  UPDATE: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900',
  DELETE: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900',
  RESTORE: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900',
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const summarizePayload = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') return 'No captured fields';

  const record = payload as Record<string, any>;
  const important = ['doctype', 'status', 'docstatus', 'version', 'updatedBy', 'totalAmount', 'quantity']
    .filter((key) => record[key] !== undefined)
    .map((key) => `${key}: ${String(record[key])}`);

  return important.length ? important.join(' | ') : Object.keys(record).slice(0, 5).join(', ');
};

const AuditTrail: React.FC<AuditTrailProps> = ({ logs }) => {
  const [query, setQuery] = useState('');
  const [action, setAction] = useState<'ALL' | AuditLog['action']>('ALL');

  const filteredLogs = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return logs
      .filter((log) => action === 'ALL' || log.action === action)
      .filter((log) => {
        if (!normalized) return true;
        return [
          log.entityType,
          log.entityId,
          log.action,
          log.updatedBy,
          summarizePayload(log.newState),
        ].filter(Boolean).join(' ').toLowerCase().includes(normalized);
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs, query, action]);

  const counts = useMemo(() => ({
    CREATE: logs.filter((log) => log.action === 'CREATE').length,
    UPDATE: logs.filter((log) => log.action === 'UPDATE').length,
    DELETE: logs.filter((log) => log.action === 'DELETE').length,
  }), [logs]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-100 dark:border-blue-900 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
              <ShieldCheck className="w-3 h-3" />
              Version Ledger
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">ERP document activity</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">Audit Trail</h1>
          <p className="text-sm text-slate-500 mt-1">Trace created, updated, and deleted records across every ERP module.</p>
        </div>

        <div className="grid grid-cols-3 gap-3 min-w-full sm:min-w-[420px]">
          {[
            { label: 'Creates', value: counts.CREATE, icon: Activity },
            { label: 'Updates', value: counts.UPDATE, icon: FileClock },
            { label: 'Deletes', value: counts.DELETE, icon: RotateCcw },
          ].map((item) => (
            <div key={item.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                <item.icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:border-blue-500"
              placeholder="Search doctype, document ID, user, status..."
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            {(['ALL', 'CREATE', 'UPDATE', 'DELETE', 'RESTORE'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setAction(option)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors ${
                  action === option
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[860px]">
            <thead className="bg-slate-50 dark:bg-slate-950/60 text-[10px] uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-4 py-3 font-black">Time</th>
                <th className="px-4 py-3 font-black">Action</th>
                <th className="px-4 py-3 font-black">Document</th>
                <th className="px-4 py-3 font-black">User</th>
                <th className="px-4 py-3 font-black">Captured State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDateTime(log.timestamp)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex border px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${actionStyles[log.action]}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{log.entityType}</p>
                    <p className="text-xs text-slate-400 font-mono">{log.entityId}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{log.updatedBy || 'System'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-md truncate">{summarizePayload(log.newState || log.previousState)}</td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-slate-400">
                    <FileClock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-bold">No audit events found</p>
                    <p className="text-xs mt-1">Create or update documents to populate the Version ledger.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditTrail;
