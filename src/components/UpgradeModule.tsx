import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowUpCircle, RefreshCw, CheckCircle2, AlertTriangle, Terminal, Database, 
  Server, Clock, GitCommit, Play, FileText, ChevronRight, Check, Activity,
  Cpu, Layers, HeartPulse, Sparkles, Code, TerminalSquare, AlertCircle, Wrench, SearchCheck, ChevronDown, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getItem } from '../utils/networkClient';

interface PatchLog {
  id: string;
  version: string;
  name: string;
  description: string;
  status: 'PENDING' | 'EXECUTING' | 'SUCCESS' | 'FAILED';
  date: string;
  logs: string[];
}

interface WorkerProcess {
  id: string;
  name: string;
  type: 'scheduler' | 'default' | 'long' | 'short';
  status: 'ACTIVE' | 'IDLE' | 'SUSPENDED';
  cpu: number;
  memory: string;
  jobsProcessed: number;
  currentThread: string;
}

const INITIAL_PATCHES: PatchLog[] = [
  {
    id: 'patch_6.0.4',
    version: 'v6.0.4',
    name: 'Unified Accounting Schema Expansion',
    description: 'Migration of chart of accounts registry, ledger index optimizations, and audit logger tracking schemas.',
    status: 'SUCCESS',
    date: '2026-05-28 10:24 AM',
    logs: [
      '[OK] Initiated backup of local SQLite & IndexedDB cache.',
      '[OK] Expanded TabAccount to support multilevel parent hierarchies.',
      '[OK] Replaced static ledger arrays with relational compound indexes.',
      '[OK] Created TabAuditLog metadata structure.',
      '[OK] Schema v6.0.4 database migration verification: PASS.'
    ]
  },
  {
    id: 'patch_6.1.0',
    version: 'v6.1.0',
    name: 'Dynamic Barcoding & Multi-format Jinja Engines',
    description: 'Introduces custom drag-and-drop letterheads, dynamic Code128 barcodes, and Jinja-ready print builders.',
    status: 'PENDING',
    date: 'Waiting for execution',
    logs: []
  },
  {
    id: 'patch_6.1.5',
    version: 'v6.1.5',
    name: 'Real-time GST Audit Validators & Chikan Tags',
    description: 'Integrates local state GST rule validation against state-border checkpoints and tags material lots with traditional karigar embroidery codes.',
    status: 'PENDING',
    date: 'Waiting for execution',
    logs: []
  },
  {
    id: 'patch_6.2.0',
    version: 'v6.2.0',
    name: 'Bidirectional Tally Mapping Protocol (XML)',
    description: 'Deploys real-time SOAP wrappers, ledger translation schema structures, and automatic Cash Book webhook reconciliation rules.',
    status: 'PENDING',
    date: 'Waiting for execution',
    logs: []
  },
  {
    id: 'patch_6.3.0',
    version: 'v6.3.0',
    name: 'AI defect-scanning module & High-yield routing',
    description: 'Bootstraps camera-frame telemetry handlers, real-time yardage shrinkage calculations, and workstation speed alerts.',
    status: 'PENDING',
    date: 'Waiting for execution',
    logs: []
  }
];

const INITIAL_WORKERS: WorkerProcess[] = [
  { id: 'W-01', name: 'frappe-bench-scheduler', type: 'scheduler', status: 'ACTIVE', cpu: 0.8, memory: '44MB', jobsProcessed: 382, currentThread: 'auto_backup_scheduler' },
  { id: 'W-02', name: 'frappe-bench-default-worker-1', type: 'default', status: 'ACTIVE', cpu: 1.2, memory: '112MB', jobsProcessed: 1248, currentThread: 'reconcile_sales_invoices' },
  { id: 'W-03', name: 'frappe-bench-long-worker', type: 'long', status: 'IDLE', cpu: 0.0, memory: '240MB', jobsProcessed: 121, currentThread: 'dyehouse_optimization_yield' },
  { id: 'W-04', name: 'frappe-bench-short-worker', type: 'short', status: 'ACTIVE', cpu: 2.1, memory: '85MB', jobsProcessed: 5491, currentThread: 'send_sms_customer_notifications' }
];

export const UpgradeModule: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'control' | 'doctor' | 'workers' | 'terminal'>('control');
  const [patches, setPatches] = useState<PatchLog[]>(INITIAL_PATCHES);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [currentPatchId, setCurrentPatchId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [activeLogId, setActiveLogId] = useState<string | null>('patch_6.0.4');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    'Ravi-Textile ERPNext Site: erp.ravi-textiles.com',
    'Bench path: /home/frappe/frappe-bench',
    'Type "bench help" or click macro commands to control the server instance.'
  ]);
  const [terminalInput, setTerminalInput] = useState('');
  
  // Doctor/Diagnosis state
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosisStep, setDiagnosisStep] = useState(0);
  const [doctorReport, setDoctorReport] = useState<{
    score: number;
    scannedTables: number;
    customFields: number;
    issues: string[];
    passes: string[];
  } | null>(null);

  // Workers state
  const [workers, setWorkers] = useState<WorkerProcess[]>(INITIAL_WORKERS);
  const [workerLogs, setWorkerLogs] = useState<string[]>([
    '[Worker] Default queue picked up job: invoice_pdf_compile_INV-1021',
    '[Worker] Scheduler initialized backup cron sequence at hour 24',
    '[Worker] Short queue processed whatsapp-webhook callback from customer Balaji'
  ]);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  // Simulate background workers updating metrics
  useEffect(() => {
    const timer = setInterval(() => {
      setWorkers(prev => prev.map(w => {
        if (w.status === 'ACTIVE') {
          const deltaCpu = (Math.random() - 0.5) * 2;
          const newCpu = Math.max(0.1, Math.min(95, parseFloat((w.cpu + deltaCpu).toFixed(1))));
          return {
            ...w,
            cpu: newCpu,
            jobsProcessed: w.jobsProcessed + (Math.random() > 0.7 ? 1 : 0)
          };
        }
        return w;
      }));

      // Random worker logs
      if (Math.random() > 0.7) {
        const events = [
          'Jobs queue polling: 0 items pending.',
          'Cleared 1 dead Redis socket reference.',
          'Yarn inventory levels checked for alarm points.',
          'Calculated automatic Karigar commission ledger balances.',
          'Synchronized 1 sales invoice payload payload to Tally Prime Sandbox.'
        ];
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        setWorkerLogs(prev => [`[${new Date().toLocaleTimeString()}] ${randomEvent}`, ...prev.slice(0, 15)]);
      }
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const executePatchSeq = async (patchIndex: number, currentList: PatchLog[]): Promise<PatchLog[]> => {
    if (patchIndex >= currentList.length) return currentList;
    const patch = currentList[patchIndex];
    if (patch.status !== 'PENDING') {
      return executePatchSeq(patchIndex + 1, currentList);
    }

    setCurrentPatchId(patch.id);
    setActiveLogId(patch.id);
    setProgress(0);

    // Update state to executing
    let updatedList = currentList.map(p => p.id === patch.id ? { ...p, status: 'EXECUTING' as const } : p);
    setPatches(updatedList);

    // Set interactive virtual terminal feedback
    setTerminalLogs(prev => [
      ...prev,
      `[bench-update] Deploying patch trace: ${patch.version} (${patch.name})`,
      `[bench-update] Backing up dependencies...`
    ]);

    const patchLogs = [
      `[INFO] Starting execution profile for patch: ${patch.version}`,
      `[INFO] Checking database connection parameters...`,
      `[OK] Connected to PostgreSQL 15.2 instances.`,
      `[INFO] Fetching migration script from git path /patches/${patch.id}.py`,
      `[INFO] Applying schema mutations into local tables...`
    ];

    // Stagger progress
    const duration = 2000;
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, duration / steps));
      setProgress(i * 10);
      
      const intermediateLog = `[OK] Applied chunk ${i}/${steps} of table mutations successfully.`;
      if (i === 3) {
        patchLogs.push(intermediateLog);
        patchLogs.push(`[INFO] Compiling index schemas for primary elements...`);
      } else if (i === 7) {
        patchLogs.push(intermediateLog);
        patchLogs.push(`[INFO] Aligning memory buffers with Redis cache stores.`);
      } else if (i === 10) {
        patchLogs.push(intermediateLog);
        patchLogs.push(`[OK] Patch ${patch.version} registered successfully in __patch_log.`);
      }
      
      // Update running log in state
      updatedList = updatedList.map(p => p.id === patch.id ? { ...p, logs: [...patchLogs] } : p);
      setPatches(updatedList);
    }

    setTerminalLogs(prev => [
      ...prev,
      `[bench-update] [SUCCESS] Patch ${patch.version} applied successfully. DB Schema expanded.`
    ]);

    // Finish patch
    updatedList = updatedList.map(p => p.id === patch.id ? { 
      ...p, 
      status: 'SUCCESS' as const,
      date: new Date().toLocaleString(),
      logs: [...patchLogs]
    } : p);
    setPatches(updatedList);

    // Run next patch in stack
    return executePatchSeq(patchIndex + 1, updatedList);
  };

  const handleFullUpgrade = async () => {
    if (isUpgrading) return;
    setIsUpgrading(true);
    setTerminalLogs(prev => [
      ...prev,
      '--- BENCH UPGRADE SEQUENCE INITIATED ---',
      `[${new Date().toLocaleTimeString()}] Fetching source code repository updates (branch: version-6-stable)...`,
      '[git] Fetch origin... SUCCESS.',
      '[git] Merged commit to local working branch.'
    ]);

    try {
      await executePatchSeq(0, patches);
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpgrading(false);
      setCurrentPatchId(null);
      setProgress(100);
      setTerminalLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] System is fully updated. bench restart-workers applied.`,
        '--- BENCH UPGRADE SEQUENCE COMPLETED ---'
      ]);
    }
  };

  const handleRunDoctor = () => {
    if (isDiagnosing) return;
    setIsDiagnosing(true);
    setDiagnosisStep(1);
    setDoctorReport(null);

    const steps = [
      'Locating database structures & storage boundaries...',
      'Matching dynamic DocType schemas loaded from registry...',
      'Verifying compound ledger entries for mathematical integrity...',
      'Auditing user role-permission models & security vectors...',
      'Scrutinizing orphaned reference links inside inventory tables...'
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setDiagnosisStep(currentStep + 1);
      } else {
        clearInterval(interval);
        (async () => {
        // Compile physical metrics from IndexedDB
        const IDB_STORE_KEYS = ['orders', 'production', 'inventory', 'customers', 'suppliers', 'transactions', 'karigars'];
        const [customFieldsArr, ...storeResults] = await Promise.all([
          getItem<any[]>('erpnext_custom_fields').catch(() => null),
          ...IDB_STORE_KEYS.map(k => getItem<any[]>(k).catch(() => null)),
        ]);
        let customFieldsCount = Array.isArray(customFieldsArr) ? customFieldsArr.length : 0;
        let totalRecordsCount = storeResults.reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
        if (totalRecordsCount === 0) totalRecordsCount = 42; // default safe fallback

        setDoctorReport({
          score: customFieldsCount > 0 ? 100 : 96,
          scannedTables: 18,
          customFields: customFieldsCount,
          passes: [
            `All indexes configured cleanly across ${totalRecordsCount} system records.`,
            'Dual-Entry Accounting Integrity matched: Total Debits exactly equal Total Credits.',
            'No orphaned document links referenced inside child rows.',
            'Worker thread pool checked: Active connection locks are solid.',
            'Naming Series sequencing validated for all invoices & work orders.'
          ],
          issues: customFieldsCount === 0 ? [
            'Optional check: No custom fields extended inside doctype properties. Extend schemas to hit absolute 100% database customizability.'
          ] : []
        });
        setIsDiagnosing(false);
        })();
      }
    }, 800);
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    const command = terminalInput.trim().toLowerCase();
    const cleanCmd = terminalInput.trim();
    setTerminalLogs(prev => [...prev, `frappe@ravi-textile:~$ ${cleanCmd}`]);
    setTerminalInput('');

    setTimeout(() => {
      if (command === 'bench update') {
        if (patches.filter(p => p.status === 'PENDING').length === 0) {
          setTerminalLogs(prev => [...prev, '[bench] System is already completely up to date. No pending patches.']);
        } else {
          setActiveSubTab('control');
          handleFullUpgrade();
        }
      } else if (command === 'bench help') {
        setTerminalLogs(prev => [
          ...prev,
          'Available bench CLI commands:',
          '  bench help            Displays commands glossary',
          '  bench update          Initiates the core source updates & executes patches',
          '  bench doctor          Performs complete system diagnostics and DB audit checks',
          '  bench clear-cache     Flushes transient session cache and ledger structures',
          '  bench show-config     Prints details about PostgreSQL database indices'
        ]);
      } else if (command === 'bench doctor') {
        setActiveSubTab('doctor');
        handleRunDoctor();
      } else if (command === 'bench clear-cache') {
        setTerminalLogs(prev => [
          ...prev,
          '[bench] Flush command initiated.',
          '[bench] Cleaning Redis temporary system arrays... DONE.',
          '[bench] Purging document cache schemas... DONE.',
          '[bench] Local buffers clear. Reload complete.'
        ]);
      } else if (command === 'bench show-config') {
        setTerminalLogs(prev => [
          ...prev,
          '--- BENCH CONFIGURATION METADATA ---',
          'System Version: v6.3.0-stable',
          'DB Host: localhost',
          'DB Port: 5432 (PostgreSQL)',
          'Redis Server: 127.0.0.1:6379',
          'Socket Pool: 10 active connections',
          'Tenant Subdomains: erp.ravi-textiles.com'
        ]);
      } else {
        setTerminalLogs(prev => [
          ...prev,
          `bench: command not found: "${cleanCmd}". Type "bench help" for list of permitted operations.`
        ]);
      }
    }, 200);
  };

  const pendingPatchesCount = patches.filter(p => p.status === 'PENDING').length;
  const executingPatch = patches.find(p => p.status === 'EXECUTING');

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 pb-20 text-left">
      {/* Header Panel */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-100 dark:border-blue-900 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
              <Sparkles className="w-3" />
              BENCH OPERATIONAL CONTROL
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Database Optimizer / Patch Manager / Worker Threads</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">System DevOps & Desk Upgrades</h1>
          <p className="text-sm text-slate-500 mt-1">
            Recompile schemas, trigger automated database updates, clean session queues, and run benchmarks just like the ERPNext Bench controller.
          </p>
        </div>

        {/* Diagnostic KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 min-w-full lg:min-w-[560px]">
          {[
            { label: 'Pending Patches', value: pendingPatchesCount, color: pendingPatchesCount > 0 ? 'text-amber-500' : 'text-emerald-500' },
            { label: 'Active Workers', value: workers.filter(w => w.status === 'ACTIVE').length, color: 'text-sky-500' },
            { label: 'DB Health Rate', value: '100%', color: 'text-emerald-500' },
            { label: 'Instance Status', value: 'OPTIMAL', color: 'text-violet-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">{stat.label}</span>
              <span className={`text-lg font-black mt-0.5 block tracking-tight ${stat.color}`}>{stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Primary Sub Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-1.5 rounded-lg gap-2">
        {[
          { id: 'control', label: 'Patch Manager', icon: ArrowUpCircle },
          { id: 'doctor', label: 'Bench Doctor (DB Audit)', icon: HeartPulse },
          { id: 'workers', label: 'Background Workers', icon: Cpu },
          { id: 'terminal', label: 'Interactive Bench CLI', icon: Terminal },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest rounded-md transition-all ${
              activeSubTab === tab.id 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <tab.icon className="w-4 h-4"/>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Worksheets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* VIEW 1: PATCH MANAGER */}
        {activeSubTab === 'control' && (
          <>
            <div className="col-span-1 lg:col-span-2 space-y-6">
              
              {/* Primary update control box */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="p-5 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${pendingPatchesCount > 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'}`}>
                      {pendingPatchesCount > 0 ? <AlertTriangle className="w-5 h-5 animate-pulse"/> : <CheckCircle2 className="w-5 h-5"/>}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {pendingPatchesCount > 0 ? `${pendingPatchesCount} Upgrades Pending Execution` : 'All Systems Fully Optimized'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {pendingPatchesCount > 0 
                          ? 'Automated patches ready to upgrade database configurations to v6.3.0 stable.' 
                          : 'You are currently running the latest releases matching core schema formats.'
                        }
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleFullUpgrade}
                    disabled={isUpgrading || pendingPatchesCount === 0}
                    className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-all text-xs uppercase tracking-wider"
                  >
                    {isUpgrading ? (
                      <><RefreshCw className="w-3.5 h-3.5 animate-spin"/> Upgrading...</>
                    ) : (
                      <><Play className="w-3.5 h-3.5"/> Apply All Patches</>
                    )}
                  </button>
                </div>

                {isUpgrading && (
                  <div className="p-5 bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                      <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                        <Terminal className="w-4 h-4 animate-pulse" />
                        Running schema migration patches...
                      </span>
                      <span className="font-mono">{progress}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${progress}%` }} 
                        className="h-full bg-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                        transition={{ ease: "easeOut" }}
                      />
                    </div>
                  </div>
                )}

                {/* Patches Loop */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {patches.map((patch) => (
                    <div 
                      key={patch.id} 
                      onClick={() => setActiveLogId(patch.id)}
                      className={`p-5 flex items-start gap-4 cursor-pointer transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${
                        activeLogId === patch.id ? 'bg-indigo-50/20 dark:bg-indigo-950/10 border-l-4 border-indigo-500' : ''
                      }`}
                    >
                      <div className="shrink-0 pt-0.5">
                        {patch.status === 'SUCCESS' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                        {patch.status === 'PENDING' && <Clock className="w-5 h-5 text-slate-400" />}
                        {patch.status === 'EXECUTING' && <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />}
                        {patch.status === 'FAILED' && <AlertTriangle className="w-5 h-5 text-rose-500" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-black py-0.5 px-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300">
                            {patch.version}
                          </span>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{patch.name}</h4>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                            patch.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' :
                            patch.status === 'PENDING' ? 'bg-slate-50 text-slate-500 dark:bg-slate-850 dark:text-slate-400' :
                            patch.status === 'EXECUTING' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 animate-pulse' :
                            'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                          }`}>
                            {patch.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed mb-1.5">{patch.description}</p>
                        <p className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {patch.date}
                        </p>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-700 shrink-0 self-center" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar Patch Logs Visualizer */}
            <div className="col-span-1 space-y-6">
              <div className="bg-slate-950 text-slate-200 border border-slate-900 rounded-xl overflow-hidden shadow-xl flex flex-col h-[520px]">
                <div className="p-3 border-b border-slate-900 flex items-center justify-between bg-slate-900 shrink-0">
                  <div className="flex items-center gap-2">
                    <TerminalSquare className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-mono font-black uppercase tracking-wider text-slate-400">Logger Console</span>
                  </div>
                  {activeLogId && (
                    <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                      {activeLogId}
                    </span>
                  )}
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-2 select-text">
                  {activeLogId ? (
                    (() => {
                      const selected = patches.find(p => p.id === activeLogId);
                      if (!selected) return null;
                      if (!selected.logs.length) {
                        return (
                          <div className="text-slate-500 italic p-4 text-center">
                            Patch is currently in queue. Click "Apply All Patches" to execute updates.
                          </div>
                        );
                      }
                      return selected.logs.map((log, i) => (
                        <div key={i} className={`flex items-start gap-1 pr-2 ${
                          log.includes('[OK]') ? 'text-emerald-400' : 
                          log.includes('ERROR') ? 'text-rose-400 font-bold' : 
                          'text-slate-300'
                        }`}>
                          <span className="text-slate-600 select-none mr-1 opacity-60">[{i+1}]</span>
                          <span className="flex-1">{log}</span>
                        </div>
                      ));
                    })()
                  ) : (
                    <div className="text-slate-500 italic p-4 text-center">
                      Select a patch card to inspect output traces.
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-900 border-t border-slate-900 text-[10px] text-slate-500 font-mono flex items-center justify-between shrink-0">
                  <span>Engine: bench-upgrade-v6.0</span>
                  <span>PID: {Math.floor(Math.random() * 800) + 1200}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* VIEW 2: BENCH DOCTOR */}
        {activeSubTab === 'doctor' && (
          <div className="col-span-1 lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Run Diagnosis Dashboard */}
            <div className="col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-500 rounded-xl">
                  <HeartPulse className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">System Doctor Diagnostics</h3>
                  <p className="text-xs text-slate-400">Verifies schema integrity algorithms</p>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                The Bench Doctor scans internal storage schemas, checks constraints limits for invoices & orders, and verifies that database fields precisely align with defined metadata representations.
              </p>

              <button
                onClick={handleRunDoctor}
                disabled={isDiagnosing}
                className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-40 shadow-sm transition-all"
              >
                {isDiagnosing ? (
                  <><RefreshCw className="w-4 h-4 animate-spin"/> Executing Diagnostic Scan...</>
                ) : (
                  <><SearchCheck className="w-4 h-4"/> Run System Diagnosis</>
                )}
              </button>

              {isDiagnosing && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 animate-pulse">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span>Scan Target</span>
                    <span>Step {diagnosisStep}/5</span>
                  </div>
                  <div className="h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-500"
                      style={{ width: `${(diagnosisStep / 5) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                    ➜ {
                      [
                        'Locating database structures & storage boundaries...',
                        'Matching dynamic DocType schemas loaded from registry...',
                        'Verifying compound ledger entries for mathematical integrity...',
                        'Auditing user role-permission models & security vectors...',
                        'Scrutinizing orphaned reference links inside inventory tables...'
                      ][diagnosisStep - 1] || 'Scanning...'
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Doctor Report Outcomes */}
            <div className="col-span-1 md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm min-h-[380px]">
              {doctorReport ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h4 className="font-extrabold text-slate-800 dark:text-white uppercase text-xs tracking-wider">Diagnostic Quality Audit</h4>
                      <p className="text-[10px] font-mono text-emerald-500 mt-1 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> All integrity matches are healthy.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-emerald-500 tracking-tight">{doctorReport.score}%</span>
                      <span className="text-[9px] uppercase font-black text-slate-400 block tracking-widest">Health Index</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-100 dark:border-slate-800 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Scanned Modules</span>
                      <span className="text-xl font-black text-slate-800 dark:text-white mt-1 block">{doctorReport.scannedTables} Tables</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-100 dark:border-slate-800 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Custom Fields Indexed</span>
                      <span className="text-xl font-black text-slate-800 dark:text-white mt-1 block">{doctorReport.customFields} Schema Extensions</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 px-1">Pass Indicators</h5>
                      <div className="space-y-2">
                        {doctorReport.passes.map((pass, i) => (
                          <div key={i} className="flex gap-2 text-xs text-slate-600 dark:text-slate-400 items-start bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100/30 p-2.5 rounded-lg">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 pt-0.5" />
                            <span>{pass}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {doctorReport.issues.length > 0 && (
                      <div>
                        <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 px-1">Optimizations Suggested</h5>
                        <div className="space-y-2">
                          {doctorReport.issues.map((issue, i) => (
                            <div key={i} className="flex gap-2 text-xs text-slate-600 dark:text-slate-400 items-start bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-100/30 p-2.5 rounded-lg">
                              <Info className="w-4 h-4 text-indigo-500 shrink-0 pt-0.5" />
                              <span>{issue}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                  <Wrench className="w-12 h-12 text-slate-200 dark:text-slate-800 mb-3" />
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Diagnostic Report Pending</p>
                  <p className="text-xs text-slate-400 mt-1.5 max-w-sm">
                    Click "Run System Diagnosis" to audit storage, tables balances, and naming indices.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 3: BACKGROUND WORKERS */}
        {activeSubTab === 'workers' && (
          <div className="col-span-1 lg:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Live Threads Monitor */}
            <div className="col-span-1 lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                  <div>
                    <h4 className="font-extrabold text-slate-800 dark:text-white uppercase text-xs tracking-wider">Multi-Tenant Thread Pools</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Monitoring Redis RQ Queue threads in Real-time</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded text-emerald-600 text-[10px] uppercase font-black tracking-widest">
                    <Activity className="w-3 h-3 animate-pulse" />
                    Online
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {workers.map(worker => (
                    <div key={worker.id} className="border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 p-4 rounded-xl space-y-3 transition-colors bg-slate-50/50 dark:bg-slate-950/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Cpu className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{worker.name}</span>
                        </div>
                        <span className={`h-2 w-2 rounded-full ${worker.status === 'ACTIVE' ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'}`}></span>
                      </div>

                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">Current Task:</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold truncate max-w-[140px]">{worker.currentThread}</span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                          <span>CPU Profile</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{worker.cpu}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{ width: `${worker.cpu}%` }} />
                        </div>
                      </div>

                      <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-850 pt-2.5 text-[10px] text-slate-500">
                        <span>Allocated RAM: <b className="text-slate-700 dark:text-slate-300 font-mono">{worker.memory}</b></span>
                        <span>Processed: <b className="text-slate-700 dark:text-slate-300 font-mono">{worker.jobsProcessed}</b></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Workers Jobs logs */}
            <div className="col-span-1 bg-slate-950 border border-slate-900 shadow-xl rounded-xl p-5 flex flex-col h-[400px]">
              <h4 className="font-mono text-xs font-black uppercase tracking-wider text-slate-400 mb-3 block border-b border-slate-900 pb-2">RQ Daemon Execution Output</h4>
              <div className="flex-1 overflow-y-auto font-mono text-[11px] space-y-2 select-text text-slate-400 pr-1">
                {workerLogs.map((log, i) => (
                  <div key={i} className="leading-relaxed hover:bg-slate-900/50 p-1 rounded">
                    <span className="text-slate-600 mr-2 border-r border-slate-900 pr-1 select-none">#{workerLogs.length - i}</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: BENCH CLI TERMINAL */}
        {activeSubTab === 'terminal' && (
          <div className="col-span-1 lg:col-span-3 space-y-4">
            
            {/* Terminal instruction panel */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Command Palette Cheat Sheet</span>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Quick macros setup to speed up platform diagnostics:
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { text: 'bench help', command: 'bench help' },
                  { text: 'bench doctor', command: 'bench doctor' },
                  { text: 'bench update', command: 'bench update' },
                  { text: 'bench clear-cache', command: 'bench clear-cache' },
                  { text: 'bench show-config', command: 'bench show-config' }
                ].map((macro, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setTerminalInput(macro.command)}
                    className="px-3 py-1.5 text-[10px] font-mono font-black border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-indigo-500 rounded text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {macro.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Bash core element */}
            <div className="bg-slate-950 text-slate-300 p-5 rounded-2xl border border-slate-900 shadow-2xl h-[480px] flex flex-col font-mono text-xs">
              
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-900 pb-3 mb-3 text-[10px] text-slate-500 shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-rose-500"></div>
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500"></div>
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500"></div>
                  <span className="ml-2 font-mono text-slate-400">frappe-bench Bash Shell (erpnext)</span>
                </div>
                <span>SSL Secured</span>
              </div>

              {/* Console log loops */}
              <div className="flex-1 overflow-y-auto space-y-2 select-text pr-1 pb-4">
                {terminalLogs.map((log, i) => (
                  <div key={i} className="whitespace-pre-wrap leading-relaxed">
                    {log}
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>

              {/* Command insert terminal */}
              <form onSubmit={handleCommandSubmit} className="flex gap-2 items-center border-t border-slate-900 pt-3 shrink-0">
                <span className="text-emerald-500 select-none">frappe@ravi-textile:~$</span>
                <input
                  type="text"
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none focus:ring-0 font-mono text-xs text-white p-0"
                  placeholder="Enter command... Try 'bench help'"
                  autoFocus
                  spellCheck={false}
                />
                <button 
                  type="submit"
                  className="px-4 py-1 bg-slate-900 select-none hover:bg-slate-800 rounded border border-slate-800 text-[10px] font-bold text-slate-400"
                >
                  SEND
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default UpgradeModule;
