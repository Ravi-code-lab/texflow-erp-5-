import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, GitBranch, Package, CheckCircle2, XCircle, Clock,
  AlertTriangle, ChevronRight, ChevronDown, Terminal, Play,
  Download, Layers, Server, Activity, Database, Cpu, Zap,
  ArrowUpCircle, Search, Filter, RotateCcw, Info, Globe,
  FileText, Hash, Calendar, User, ShieldCheck, Settings2,
  ExternalLink, BarChart3, Box, Check, X, Loader2, Circle,
  GitCommit, Tag, Archive, HardDrive, Wifi, WifiOff, Sparkles,
  ChevronLeft, AlertCircle, BookOpen,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type AppStatus = 'up-to-date' | 'update-available' | 'installing' | 'error';
type PatchStatus = 'success' | 'failed' | 'skipped';
type JobStatus = 'queued' | 'running' | 'success' | 'failed';
type Tab = 'apps' | 'patches' | 'migrate' | 'jobs' | 'bench';

interface AppInfo {
  name: string;
  title: string;
  version: string;
  latestVersion: string;
  branch: string;
  lastCommit: string;
  lastCommitDate: string;
  status: AppStatus;
  description: string;
  author: string;
  installed: boolean;
  required: boolean;
  remoteUrl: string;
  changedFiles?: number;
  ahead?: number;
  behind?: number;
}

interface PatchEntry {
  id: string;
  patchFile: string;
  module: string;
  executedOn: string;
  executionTime: number;
  status: PatchStatus;
  description: string;
}

interface ScheduledJob {
  id: string;
  label: string;
  jobType: 'All' | 'Daily' | 'Weekly' | 'Monthly' | 'Hourly' | 'Cron';
  doctype: string;
  method: string;
  lastExecution?: string;
  nextExecution?: string;
  status: JobStatus;
  frequency: string;
}

interface BenchCommand {
  id: string;
  label: string;
  command: string;
  description: string;
  dangerous?: boolean;
  category: string;
}

interface TerminalLine {
  id: string;
  type: 'info' | 'success' | 'error' | 'command' | 'output';
  text: string;
  ts: string;
}

// ─── Static Data ──────────────────────────────────────────────────────────────

const APPS: AppInfo[] = [
  {
    name: 'frappe',
    title: 'Frappe Framework',
    version: '15.32.0',
    latestVersion: '15.36.2',
    branch: 'version-15',
    lastCommit: 'a3f9c12',
    lastCommitDate: '2 days ago',
    status: 'update-available',
    description: 'Full-stack web application framework powering TexFlow ERP',
    author: 'Frappe Technologies',
    installed: true,
    required: true,
    remoteUrl: 'https://github.com/frappe/frappe',
    changedFiles: 0,
    ahead: 0,
    behind: 14,
  },
  {
    name: 'erpnext',
    title: 'ERPNext',
    version: '15.28.1',
    latestVersion: '15.33.0',
    branch: 'version-15',
    lastCommit: 'b7e2d45',
    lastCommitDate: '1 day ago',
    status: 'update-available',
    description: 'Open-source ERP system — Accounting, Inventory, HR, CRM and more',
    author: 'Frappe Technologies',
    installed: true,
    required: true,
    remoteUrl: 'https://github.com/frappe/erpnext',
    changedFiles: 0,
    ahead: 0,
    behind: 19,
  },
  {
    name: 'texflow',
    title: 'TexFlow Textile ERP',
    version: '5.0.0',
    latestVersion: '5.0.0',
    branch: 'main',
    lastCommit: 'f1a4b78',
    lastCommitDate: '5 hours ago',
    status: 'up-to-date',
    description: 'Textile-specific ERP module — Karigars, Production, Design Catalog, Quality',
    author: 'Ravi Textile',
    installed: true,
    required: true,
    remoteUrl: 'https://github.com/your-org/texflow',
    changedFiles: 3,
    ahead: 2,
    behind: 0,
  },
  {
    name: 'payments',
    title: 'Payments',
    version: '0.0.1',
    latestVersion: '0.0.1',
    branch: 'main',
    lastCommit: 'c2d3e56',
    lastCommitDate: '3 weeks ago',
    status: 'up-to-date',
    description: 'Payment gateway integrations — Razorpay, Stripe, PayPal',
    author: 'Frappe Technologies',
    installed: true,
    required: false,
    remoteUrl: 'https://github.com/frappe/payments',
    changedFiles: 0,
    ahead: 0,
    behind: 0,
  },
  {
    name: 'hrms',
    title: 'Frappe HR',
    version: '0.0.2',
    latestVersion: '0.0.3',
    branch: 'main',
    lastCommit: 'd4e5f67',
    lastCommitDate: '1 week ago',
    status: 'update-available',
    description: 'Modern HR management — Payroll, Leaves, Recruitment, Appraisals',
    author: 'Frappe Technologies',
    installed: false,
    required: false,
    remoteUrl: 'https://github.com/frappe/hrms',
    changedFiles: 0,
    ahead: 0,
    behind: 4,
  },
];

const PATCHES: PatchEntry[] = [
  { id: 'p1', patchFile: 'execute_if_not_already_executed', module: 'erpnext.patches.v15_0.update_tax_category', executedOn: '30-05-2026 08:14', executionTime: 0.42, status: 'success', description: 'Update Tax Category for existing tax templates' },
  { id: 'p2', patchFile: 'execute_if_not_already_executed', module: 'erpnext.patches.v15_0.migrate_gl_entries', executedOn: '30-05-2026 08:14', executionTime: 2.18, status: 'success', description: 'Migrate GL Entries to new schema (multi-currency)' },
  { id: 'p3', patchFile: 'execute_if_not_already_executed', module: 'frappe.patches.v15_0.rename_onboarding_step', executedOn: '30-05-2026 08:13', executionTime: 0.09, status: 'success', description: 'Rename Onboarding Step doctype fields' },
  { id: 'p4', patchFile: 'execute_if_not_already_executed', module: 'erpnext.patches.v15_0.update_closing_balances', executedOn: '28-05-2026 22:05', executionTime: 5.73, status: 'success', description: 'Recalculate period closing voucher balances' },
  { id: 'p5', patchFile: 'execute_if_not_already_executed', module: 'texflow.patches.v5_0.migrate_karigar_schema', executedOn: '28-05-2026 22:04', executionTime: 0.87, status: 'success', description: 'Migrate Karigar records to new schema with skills array' },
  { id: 'p6', patchFile: 'execute_if_not_already_executed', module: 'erpnext.patches.v14_0.delete_cancelled_leads', executedOn: '15-03-2026 09:30', executionTime: 0.22, status: 'skipped', description: 'Delete cancelled Lead records older than 90 days (none found)' },
  { id: 'p7', patchFile: 'execute_if_not_already_executed', module: 'frappe.patches.v14_0.update_db_type_for_amended_from', executedOn: '15-03-2026 09:29', executionTime: 1.44, status: 'success', description: 'Update DB column type for amended_from field across all doctypes' },
  { id: 'p8', patchFile: 'execute_if_not_already_executed', module: 'erpnext.patches.v14_0.crm_erpnext_deprecation', executedOn: '01-01-2026 00:00', executionTime: 0.11, status: 'failed', description: 'Deprecate old CRM fields — failed, retried on next bench migrate' },
];

const JOBS: ScheduledJob[] = [
  { id: 'j1', label: 'All', jobType: 'All', doctype: 'Scheduler', method: 'frappe.utils.background_jobs.run_scheduled_jobs', lastExecution: '30-05-2026 12:00', nextExecution: '30-05-2026 13:00', status: 'success', frequency: 'Hourly' },
  { id: 'j2', label: 'Send Emails', jobType: 'Hourly', doctype: 'Email Queue', method: 'frappe.email.queue.flush', lastExecution: '30-05-2026 12:00', nextExecution: '30-05-2026 13:00', status: 'success', frequency: 'Every Hour' },
  { id: 'j3', label: 'Auto Backup', jobType: 'Daily', doctype: 'Backup Manager', method: 'frappe.utils.backups.take_backups_daily', lastExecution: '30-05-2026 00:00', nextExecution: '31-05-2026 00:00', status: 'success', frequency: 'Daily' },
  { id: 'j4', label: 'Update Bank Clearance', jobType: 'Daily', doctype: 'Bank Reconciliation', method: 'erpnext.accounts.utils.update_outstanding_amt', lastExecution: '30-05-2026 00:02', nextExecution: '31-05-2026 00:02', status: 'success', frequency: 'Daily' },
  { id: 'j5', label: 'Stock Reorder', jobType: 'Daily', doctype: 'Reorder Level', method: 'erpnext.stock.reorder_item.reorder_item', lastExecution: '30-05-2026 00:05', nextExecution: '31-05-2026 00:05', status: 'running', frequency: 'Daily' },
  { id: 'j6', label: 'Process Payroll', jobType: 'Monthly', doctype: 'Payroll Entry', method: 'erpnext.payroll.doctype.payroll_entry.payroll_entry.get_start_end_dates', lastExecution: '01-05-2026 00:00', nextExecution: '01-06-2026 00:00', status: 'success', frequency: 'Monthly' },
  { id: 'j7', label: 'GST Invoice Summary', jobType: 'Weekly', doctype: 'GST Return', method: 'texflow.modules.gst.generate_weekly_summary', lastExecution: '26-05-2026 06:00', nextExecution: '02-06-2026 06:00', status: 'failed', frequency: 'Weekly' },
  { id: 'j8', label: 'Flush Redis Cache', jobType: 'Hourly', doctype: 'System', method: 'frappe.utils.redis_wrapper.flush_keys', lastExecution: '30-05-2026 12:00', nextExecution: '30-05-2026 13:00', status: 'queued', frequency: 'Every Hour' },
];

const BENCH_COMMANDS: BenchCommand[] = [
  { id: 'bc1', category: 'Update', label: 'bench update', command: 'bench update', description: 'Pull latest code for all apps and run migrate', dangerous: false },
  { id: 'bc2', category: 'Update', label: 'bench update --pull', command: 'bench update --pull', description: 'Only pull latest code, skip migrate and build', dangerous: false },
  { id: 'bc3', category: 'Update', label: 'bench update --patch', command: 'bench update --patch', description: 'Run database patches only without pulling', dangerous: false },
  { id: 'bc4', category: 'Update', label: 'bench update --build', command: 'bench update --build', description: 'Rebuild JS/CSS assets only', dangerous: false },
  { id: 'bc5', category: 'Database', label: 'bench migrate', command: 'bench migrate', description: 'Apply pending patches and sync all DocType schemas to DB', dangerous: false },
  { id: 'bc6', category: 'Database', label: 'bench run-patch', command: 'bench run-patch <patch_module>', description: 'Re-run a specific patch by module path', dangerous: false },
  { id: 'bc7', category: 'System', label: 'bench restart', command: 'bench restart', description: 'Restart gunicorn, RQ workers, and scheduler', dangerous: false },
  { id: 'bc8', category: 'System', label: 'bench clear-cache', command: 'bench clear-cache', description: 'Flush Redis cache and reload all DocType metadata', dangerous: false },
  { id: 'bc9', category: 'System', label: 'bench clear-website-cache', command: 'bench clear-website-cache', description: 'Clear website page cache and static file cache', dangerous: false },
  { id: 'bc10', category: 'Apps', label: 'bench get-app', command: 'bench get-app <app_name>', description: 'Install a new app from GitHub or local path', dangerous: false },
  { id: 'bc11', category: 'Apps', label: 'bench remove-app', command: 'bench remove-app <app_name>', description: 'Uninstall an app from bench (retains DB data)', dangerous: true },
  { id: 'bc12', category: 'Danger', label: 'bench reinstall', command: 'bench reinstall', description: 'Drop and re-create database — ALL DATA WILL BE LOST', dangerous: true },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const statusDot = (status: AppStatus) => {
  if (status === 'up-to-date') return 'bg-emerald-400';
  if (status === 'update-available') return 'bg-amber-400 animate-pulse';
  if (status === 'installing') return 'bg-blue-400 animate-pulse';
  return 'bg-rose-500';
};

const patchBadge = (status: PatchStatus) => {
  if (status === 'success') return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900';
  if (status === 'failed') return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900';
  return 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
};

const jobBadge = (status: JobStatus) => {
  if (status === 'success') return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900';
  if (status === 'failed') return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900';
  if (status === 'running') return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900';
  return 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({ title, subtitle, action }) => (
  <div className="flex items-start justify-between mb-4">
    <div>
      <h3 className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{title}</h3>
      {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-[#16161c] rounded-xl border border-slate-200 dark:border-white/[0.06] ${className}`}>
    {children}
  </div>
);

// ─── Terminal Component ───────────────────────────────────────────────────────

const TerminalPane: React.FC<{ lines: TerminalLine[]; running: boolean; onClear: () => void }> = ({ lines, running, onClear }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [lines]);

  const color = (type: TerminalLine['type']) => {
    if (type === 'command') return 'text-cyan-400';
    if (type === 'success') return 'text-emerald-400';
    if (type === 'error') return 'text-rose-400';
    if (type === 'output') return 'text-slate-300';
    return 'text-slate-400';
  };

  const prefix = (type: TerminalLine['type']) => {
    if (type === 'command') return '$ ';
    if (type === 'success') return '✓ ';
    if (type === 'error') return '✗ ';
    return '  ';
  };

  return (
    <div className="bg-[#0d1117] rounded-xl border border-white/[0.06] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-rose-500/70" />
          <div className="w-3 h-3 rounded-full bg-amber-500/70" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
          <span className="ml-2 text-[10px] text-slate-500 font-mono">bench terminal</span>
        </div>
        <div className="flex items-center gap-2">
          {running && <Loader2 className="w-3 h-3 text-slate-500 animate-spin" />}
          <button onClick={onClear} className="text-[10px] text-slate-600 hover:text-slate-300 transition-colors">clear</button>
        </div>
      </div>
      <div className="p-3 font-mono text-[11px] space-y-0.5 min-h-[180px] max-h-[340px] overflow-y-auto">
        {lines.length === 0 && (
          <p className="text-slate-600">Ready. Select a command to run.</p>
        )}
        {lines.map(line => (
          <div key={line.id} className={`leading-relaxed ${color(line.type)}`}>
            <span className="text-slate-600">[{line.ts}] </span>
            <span className="text-slate-500">{prefix(line.type)}</span>
            {line.text}
          </div>
        ))}
        {running && (
          <div className="text-slate-400 animate-pulse">█</div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

// ─── Apps Tab ─────────────────────────────────────────────────────────────────

const AppsTab: React.FC = () => {
  const [apps, setApps] = useState<AppInfo[]>(APPS);
  const [selected, setSelected] = useState<AppInfo>(APPS[0]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [running, setRunning] = useState(false);

  const addLine = useCallback((type: TerminalLine['type'], text: string) => {
    setLines(prev => [...prev, { id: Math.random().toString(36).slice(2), type, text, ts: new Date().toLocaleTimeString() }]);
  }, []);

  const simulateUpdate = async (app: AppInfo) => {
    if (running) return;
    setUpdating(app.name);
    setRunning(true);
    setApps(prev => prev.map(a => a.name === app.name ? { ...a, status: 'installing' } : a));

    const cmds = [
      { type: 'command' as const, text: `bench update --apps ${app.name}` },
      { type: 'info' as const, text: `Fetching remote refs for ${app.name}...` },
      { type: 'output' as const, text: `From ${app.remoteUrl}` },
      { type: 'output' as const, text: `   ${app.lastCommit}..${app.latestVersion.replace(/\./g, '')}  ${app.branch} -> origin/${app.branch}` },
      { type: 'info' as const, text: 'Running git pull...' },
      { type: 'output' as const, text: 'Updating ' + app.lastCommit + '...' },
      { type: 'info' as const, text: 'Running bench migrate...' },
      { type: 'output' as const, text: 'Running patches...' },
      { type: 'output' as const, text: 'Syncing DocType schemas...' },
      { type: 'info' as const, text: 'Building assets...' },
      { type: 'output' as const, text: 'yarn run build --app ' + app.name },
      { type: 'success' as const, text: `${app.name} updated to ${app.latestVersion} successfully` },
    ];

    for (const cmd of cmds) {
      await new Promise(r => setTimeout(r, 400 + Math.random() * 500));
      addLine(cmd.type, cmd.text);
    }

    setApps(prev => prev.map(a => a.name === app.name ? { ...a, status: 'up-to-date', version: app.latestVersion, behind: 0 } : a));
    setUpdating(null);
    setRunning(false);
  };

  const updatesAvailable = apps.filter(a => a.status === 'update-available').length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Left: app list */}
      <div className="lg:col-span-2 space-y-2">
        {updatesAvailable > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 mb-3">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-[11px] text-amber-700 dark:text-amber-300">{updatesAvailable} app{updatesAvailable > 1 ? 's have' : ' has'} updates available</p>
          </div>
        )}
        {apps.map(app => (
          <button
            key={app.name}
            onClick={() => setSelected(app)}
            className={`w-full text-left px-3 py-3 rounded-xl border transition-all ${selected.name === app.name ? 'border-indigo-300 dark:border-indigo-500/50 bg-indigo-50/60 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#16161c] hover:border-slate-300 dark:hover:border-white/10'}`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-2 h-2 rounded-full shrink-0 ${statusDot(app.status)}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{app.title}</span>
                  {!app.installed && <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">Not installed</span>}
                  {app.required && <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/30">core</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-mono text-slate-400">v{app.version}</span>
                  {app.status === 'update-available' && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">→ v{app.latestVersion}</span>
                  )}
                  {app.status === 'installing' && (
                    <span className="text-[10px] text-blue-500 flex items-center gap-1"><Loader2 className="w-2.5 h-2.5 animate-spin" /> Installing…</span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            </div>
          </button>
        ))}
      </div>

      {/* Right: app detail + terminal */}
      <div className="lg:col-span-3 space-y-4">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">{selected.title}</h3>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${selected.status === 'up-to-date' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900' : selected.status === 'update-available' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900' : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900'}`}>
                  {selected.status === 'up-to-date' ? 'Up to date' : selected.status === 'update-available' ? 'Update available' : 'Installing'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{selected.description}</p>
            </div>
            {selected.status === 'update-available' && (
              <button
                onClick={() => simulateUpdate(selected)}
                disabled={!!updating}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-semibold transition-colors"
              >
                {updating === selected.name ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                Update
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Current Version', value: `v${selected.version}`, icon: Tag },
              { label: 'Latest Version', value: `v${selected.latestVersion}`, icon: ArrowUpCircle },
              { label: 'Branch', value: selected.branch, icon: GitBranch },
              { label: 'Last Commit', value: selected.lastCommit, icon: GitCommit },
              { label: 'Author', value: selected.author, icon: User },
              { label: 'Last Updated', value: selected.lastCommitDate, icon: Calendar },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.03]">
                <Icon className="w-3 h-3 text-slate-400 shrink-0" />
                <div>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wider">{label}</p>
                  <p className="text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-200">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {(selected.behind || 0) > 0 && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20">
              <GitBranch className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                <span className="font-bold">{selected.behind} commit{selected.behind > 1 ? 's' : ''}</span> behind origin/{selected.branch}
              </p>
            </div>
          )}
          {(selected.changedFiles || 0) > 0 && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
              <FileText className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
              <p className="text-[11px] text-blue-700 dark:text-blue-300">
                <span className="font-bold">{selected.changedFiles} uncommitted file{selected.changedFiles > 1 ? 's' : ''}</span> in working tree
              </p>
            </div>
          )}
        </Card>

        <TerminalPane lines={lines} running={running} onClear={() => setLines([])} />
      </div>
    </div>
  );
};

// ─── Patch Log Tab ────────────────────────────────────────────────────────────

const PatchLogTab: React.FC = () => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PatchStatus>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = PATCHES.filter(p => {
    const q = query.toLowerCase();
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return !q || p.module.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <SectionHeader
          title="Patch Log"
          subtitle={`${PATCHES.filter(p => p.status === 'success').length} successful · ${PATCHES.filter(p => p.status === 'failed').length} failed · ${PATCHES.filter(p => p.status === 'skipped').length} skipped`}
        />
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search patches..."
              className="w-full pl-8 pr-3 py-2 text-[12px] bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] rounded-lg text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-indigo-400 dark:focus:border-indigo-500"
            />
          </div>
          {(['all', 'success', 'failed', 'skipped'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-[11px] font-semibold transition-all capitalize ${statusFilter === s ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          {filtered.map(patch => (
            <div key={patch.id}>
              <button
                onClick={() => setExpanded(expanded === patch.id ? null : patch.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors text-left"
              >
                {patch.status === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> :
                  patch.status === 'failed' ? <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" /> :
                  <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300 truncate">{patch.module}</p>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${patchBadge(patch.status)}`}>{patch.status}</span>
                <span className="text-[10px] text-slate-400 shrink-0">{patch.executionTime}s</span>
                <span className="text-[10px] text-slate-400 shrink-0 hidden sm:block">{patch.executedOn}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${expanded === patch.id ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {expanded === patch.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mx-3 mb-2 px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.04]">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{patch.description}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-[10px] text-slate-400"><span className="font-semibold">Executed:</span> {patch.executedOn}</span>
                        <span className="text-[10px] text-slate-400"><span className="font-semibold">Time:</span> {patch.executionTime}s</span>
                        <span className="text-[10px] font-mono text-slate-400 truncate">{patch.patchFile}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center py-10 text-slate-400">
              <Database className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-[12px]">No patches found</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

// ─── Migrate Tab ──────────────────────────────────────────────────────────────

const MigrateTab: React.FC = () => {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const addLine = (type: TerminalLine['type'], text: string) => {
    setLines(prev => [...prev, { id: Math.random().toString(36).slice(2), type, text, ts: new Date().toLocaleTimeString() }]);
  };

  const runMigrate = async () => {
    if (running) return;
    setRunning(true);
    setDone(false);
    setLines([]);
    const steps = [
      { type: 'command' as const, text: 'bench migrate' },
      { type: 'info' as const, text: 'Running frappe patches...' },
      { type: 'output' as const, text: 'frappe.patches.v15_0.rename_onboarding_step (skipped — already executed)' },
      { type: 'output' as const, text: 'frappe.patches.v15_0.update_db_type_for_amended_from (skipped)' },
      { type: 'info' as const, text: 'Running erpnext patches...' },
      { type: 'output' as const, text: 'erpnext.patches.v15_0.update_tax_category (skipped)' },
      { type: 'output' as const, text: 'erpnext.patches.v15_0.migrate_gl_entries (skipped)' },
      { type: 'info' as const, text: 'Running texflow patches...' },
      { type: 'output' as const, text: 'texflow.patches.v5_0.migrate_karigar_schema (skipped)' },
      { type: 'info' as const, text: 'Syncing DocType schemas to database...' },
      { type: 'output' as const, text: 'Syncing Sales Order...' },
      { type: 'output' as const, text: 'Syncing Purchase Order...' },
      { type: 'output' as const, text: 'Syncing Production Job...' },
      { type: 'output' as const, text: 'Syncing Quality Control Report...' },
      { type: 'output' as const, text: 'Syncing Karigar...' },
      { type: 'output' as const, text: 'Syncing Inventory Item...' },
      { type: 'info' as const, text: 'Rebuilding search index...' },
      { type: 'info' as const, text: 'Clearing redis cache...' },
      { type: 'success' as const, text: 'bench migrate completed in 4.2s — 0 patches applied, 6 schemas synced' },
    ];

    for (const step of steps) {
      await new Promise(r => setTimeout(r, 200 + Math.random() * 400));
      addLine(step.type, step.text);
    }
    setRunning(false);
    setDone(true);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Installed Apps', value: APPS.filter(a => a.installed).length, icon: Package, color: 'text-indigo-500' },
          { label: 'Total Patches', value: PATCHES.length, icon: GitCommit, color: 'text-emerald-500' },
          { label: 'Pending Patches', value: 0, icon: Clock, color: 'text-amber-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-white/[0.04] flex items-center justify-center shrink-0">
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</p>
              <p className="text-[18px] font-extrabold text-slate-800 dark:text-slate-100">{value}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <SectionHeader
          title="Run Bench Migrate"
          subtitle="Applies pending patches and syncs all DocType schemas to the database"
          action={
            <button
              onClick={runMigrate}
              disabled={running}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-[12px] font-semibold transition-colors"
            >
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {running ? 'Running…' : 'bench migrate'}
            </button>
          }
        />

        {done && !running && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 mb-4"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <p className="text-[12px] text-emerald-700 dark:text-emerald-300 font-semibold">Migration completed successfully</p>
          </motion.div>
        )}

        <TerminalPane lines={lines} running={running} onClear={() => { setLines([]); setDone(false); }} />
      </Card>
    </div>
  );
};

// ─── Scheduled Jobs Tab ───────────────────────────────────────────────────────

const JobsTab: React.FC = () => {
  const [typeFilter, setTypeFilter] = useState<'All' | ScheduledJob['jobType']>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | JobStatus>('all');
  const [triggeringId, setTriggeringId] = useState<string | null>(null);

  const filtered = JOBS.filter(j => {
    if (typeFilter !== 'All' && j.jobType !== typeFilter && j.jobType !== 'All') return false;
    if (statusFilter !== 'all' && j.status !== statusFilter) return false;
    return true;
  });

  const triggerJob = async (job: ScheduledJob) => {
    setTriggeringId(job.id);
    await new Promise(r => setTimeout(r, 1400));
    setTriggeringId(null);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <SectionHeader
          title="Scheduled Jobs"
          subtitle="Background tasks managed by the Frappe scheduler"
        />
        <div className="flex flex-wrap gap-2 mb-4">
          {(['All', 'Hourly', 'Daily', 'Weekly', 'Monthly'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${typeFilter === t ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-white/[0.04] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              {t}
            </button>
          ))}
          <div className="h-5 w-px bg-slate-200 dark:bg-white/[0.06] self-center" />
          {(['all', 'success', 'failed', 'running', 'queued'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all capitalize ${statusFilter === s ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-white/[0.04] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          {filtered.map(job => (
            <div key={job.id} className="flex items-center gap-3 px-3 py-3 rounded-lg border border-slate-100 dark:border-white/[0.04] hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
              <div className={`w-2 h-2 rounded-full shrink-0 ${job.status === 'success' ? 'bg-emerald-400' : job.status === 'failed' ? 'bg-rose-500' : job.status === 'running' ? 'bg-blue-400 animate-pulse' : 'bg-slate-300'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">{job.label}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${jobBadge(job.status)}`}>{job.status}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">{job.frequency}</span>
                </div>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">{job.method}</p>
              </div>
              <div className="text-right shrink-0 hidden sm:block">
                <p className="text-[9px] text-slate-400">Last: {job.lastExecution || '—'}</p>
                <p className="text-[9px] text-slate-400">Next: {job.nextExecution || '—'}</p>
              </div>
              <button
                onClick={() => triggerJob(job)}
                disabled={!!triggeringId}
                className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.06] hover:bg-indigo-50 dark:hover:bg-indigo-500/15 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-40 text-[10px] font-semibold"
              >
                {triggeringId === job.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                Run
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ─── Bench Commands Tab ───────────────────────────────────────────────────────

const BenchTab: React.FC = () => {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [running, setRunning] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  const addLine = (type: TerminalLine['type'], text: string) => {
    setLines(prev => [...prev, { id: Math.random().toString(36).slice(2), type, text, ts: new Date().toLocaleTimeString() }]);
  };

  const categories = ['All', ...Array.from(new Set(BENCH_COMMANDS.map(c => c.category)))];
  const filtered = BENCH_COMMANDS.filter(c => activeCategory === 'All' || c.category === activeCategory);

  const simulate = async (cmd: BenchCommand) => {
    if (running) return;
    setRunning(true);
    addLine('command', cmd.command);
    const outputs: TerminalLine['type'][] = ['info', 'output', 'output', 'success'];
    const msgs = [
      'Initializing bench environment...',
      `Running: ${cmd.command}`,
      'Processing...',
      `${cmd.label} completed successfully`,
    ];
    for (let i = 0; i < msgs.length; i++) {
      await new Promise(r => setTimeout(r, 400 + Math.random() * 600));
      addLine(outputs[i], msgs[i]);
    }
    setRunning(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div>
        <Card className="p-4">
          <SectionHeader title="Bench Commands" subtitle="Run bench CLI operations from the browser" />
          <div className="flex flex-wrap gap-1.5 mb-4">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${activeCategory === cat ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-white/[0.04] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            {filtered.map(cmd => (
              <div key={cmd.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${cmd.dangerous ? 'border-rose-100 dark:border-rose-900/50 hover:bg-rose-50/50 dark:hover:bg-rose-500/5' : 'border-slate-100 dark:border-white/[0.04] hover:bg-slate-50/60 dark:hover:bg-white/[0.02]'}`}>
                <Terminal className={`w-3.5 h-3.5 shrink-0 ${cmd.dangerous ? 'text-rose-400' : 'text-slate-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] font-mono font-semibold ${cmd.dangerous ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}`}>{cmd.command}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{cmd.description}</p>
                </div>
                {cmd.dangerous && <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />}
                <button
                  onClick={() => simulate(cmd)}
                  disabled={running || cmd.command.includes('<')}
                  className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.06] hover:bg-indigo-50 dark:hover:bg-indigo-500/15 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-40 text-[10px] font-semibold"
                >
                  <Play className="w-3 h-3" /> Run
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <TerminalPane lines={lines} running={running} onClear={() => setLines([])} />

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Server className="w-4 h-4 text-slate-400" />
            <h3 className="text-[12px] font-bold text-slate-700 dark:text-slate-200">System Info</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Bench Version', value: '5.22.6' },
              { label: 'Python', value: '3.11.8' },
              { label: 'Node.js', value: '18.20.2' },
              { label: 'MariaDB', value: '10.6.14' },
              { label: 'Redis', value: '7.0.12' },
              { label: 'Site', value: 'erp.ravitextile.com' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">{label}</span>
                <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const UpgradeModule: React.FC = () => {
  const [tab, setTab] = useState<Tab>('apps');

  const updatesAvail = APPS.filter(a => a.status === 'update-available').length;

  const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'apps',    label: 'Apps',             icon: Package,     badge: updatesAvail || undefined },
    { id: 'patches', label: 'Patch Log',         icon: GitCommit },
    { id: 'migrate', label: 'Migrate',           icon: Database },
    { id: 'jobs',    label: 'Scheduled Jobs',    icon: Activity,    badge: JOBS.filter(j => j.status === 'failed').length || undefined },
    { id: 'bench',   label: 'Bench',             icon: Terminal },
  ];

  return (
    <div className="min-h-full space-y-4">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center">
          <ArrowUpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">Software Update</h1>
          <p className="text-[11px] text-slate-400">Manage apps, patches, migrations and scheduler</p>
        </div>
        {updatesAvail > 0 && (
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">{updatesAvail} update{updatesAvail > 1 ? 's' : ''} available</span>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0.5 border-b border-slate-200 dark:border-white/[0.06] overflow-x-auto pb-px scrollbar-none">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-1.5 px-3.5 py-2.5 text-[12px] font-semibold transition-all whitespace-nowrap ${tab === t.id ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-b-2 border-transparent'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              {t.badge ? (
                <span className="ml-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-amber-500 text-white text-[8px] font-bold px-1">{t.badge}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {tab === 'apps'    && <AppsTab />}
          {tab === 'patches' && <PatchLogTab />}
          {tab === 'migrate' && <MigrateTab />}
          {tab === 'jobs'    && <JobsTab />}
          {tab === 'bench'   && <BenchTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default UpgradeModule;
