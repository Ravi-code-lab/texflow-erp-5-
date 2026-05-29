
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProductionJob, Karigar, Design, CuttingLog, Machine, ProductionLog, SampleRequest, Order } from '../types';
import { 
  Plus, Edit2, Scissors, Factory, 
  Search, CheckCircle, ArrowRight, RotateCcw, PenTool, Sparkles, Clock, Printer, FlaskRound,
  History, User, Calendar, MoreVertical, LayoutGrid, List, Filter, Trash2, ChevronRight,
  TrendingUp, AlertCircle, Zap, Activity, BarChart3, Settings
} from 'lucide-react';
import BaseModal from './BaseModal';
import ProductionJobs from './ProductionJobs';
import ProductionPlan from './ProductionPlan';
import GenerateJobSlip from './GenerateJobSlip';
import GenerateQR from './GenerateQR';
import JobslipAnalytics from './JobslipAnalytics';
import Workstations from './Workstations';

interface ProductionProps {
  jobs: ProductionJob[];
  karigars: Karigar[];
  designs?: Design[];
  machines?: Machine[];
  samples?: SampleRequest[];
  orders?: Order[];
  onAddJob: (job: ProductionJob) => void;
  onUpdateJob: (job: ProductionJob) => void;
  onAddMachine?: (machine: Machine) => void;
  onUpdateMachine?: (machine: Machine) => void;
  onDeleteMachine?: (machine: Machine) => void;
  onAction?: (action: string, data: any) => void;
  currency?: string;
}

const PRODUCTION_STAGES = [
  { id: 'CUTTING', label: 'Cutting', color: 'blue', icon: Scissors },
  { id: 'JOBWORK', label: 'Jobwork', color: 'purple', icon: RotateCcw },
  { id: 'STITCHING', label: 'Stitching', color: 'indigo', icon: PenTool },
  { id: 'FINISHING', label: 'Finishing', color: 'pink', icon: Sparkles },
  { id: 'READY', label: 'Ready', color: 'emerald', icon: CheckCircle }
];

const SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

const Production: React.FC<ProductionProps> = ({ 
  jobs, karigars, designs = [], machines = [], samples = [], orders = [],
  onAddJob, onUpdateJob, onAddMachine, onUpdateMachine, onDeleteMachine, onAction, currency = '₹'
}) => {
  const [activeTab, setActiveTab] = useState<'KANBAN' | 'LIST' | 'ANALYTICS' | 'PROD_PLAN' | 'JOBS' | 'JOBSLIP' | 'WORKSTATIONS' | 'QR' | 'SLIP_ANALYTICS'>('KANBAN');
  const [activeStage, setActiveStage] = useState<string>('CUTTING');
  const [filter, setFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isProdLogModalOpen, setIsProdLogModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ProductionJob | null>(null);
  const [customFields, setCustomFields] = useState<any[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem('erpnext_custom_fields');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setCustomFields(parsed.filter((f: any) => f.docType === 'ProductionJob'));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);
  const [formData, setFormData] = useState<Partial<ProductionJob>>({ 
    productName: '',
    status: 'CUTTING', 
    priority: 'NORMAL', 
    quantity: 0, 
    progress: 0,
    sizeWise: {},
    sampleId: '',
    orderId: '',
    assignedMachine: '',
    deadline: ''
  });
  const [logData, setLogData] = useState<Partial<CuttingLog>>({ 
    date: new Date().toISOString().split('T')[0], 
    quantity: 0,
    sizeWise: {},
    operatorName: '',
    notes: ''
  });
  const [prodLogData, setProdLogData] = useState<Partial<ProductionLog>>({
    timestamp: new Date().toISOString(),
    quantityProduced: 0,
    wasteProduced: 0,
    efficiency: 85,
    machineId: '',
    operatorId: ''
  });

  const productionStats = useMemo(() => {
    const activeJobs = jobs.filter(j => j.status !== 'READY');
    const totalTarget = activeJobs.reduce((sum, j) => sum + j.quantity, 0);
    const totalProduced = activeJobs.reduce((sum, j) => {
      const logs = j.productionLogs || [];
      return sum + logs.reduce((s, l) => s + l.quantityProduced, 0);
    }, 0);
    
    const totalWaste = activeJobs.reduce((sum, j) => {
      const logs = j.productionLogs || [];
      return sum + logs.reduce((s, l) => s + l.wasteProduced, 0);
    }, 0);

    const avgEfficiency = activeJobs.length > 0 ? activeJobs.reduce((sum, j) => {
      const logs = j.productionLogs || [];
      if (logs.length === 0) return sum + 0;
      return sum + (logs.reduce((s, l) => s + (l.efficiency || 0), 0) / logs.length);
    }, 0) / activeJobs.length : 0;

    return {
      totalTarget,
      totalProduced,
      totalWaste,
      avgEfficiency: Math.round(avgEfficiency),
      progress: totalTarget > 0 ? Math.round((totalProduced / totalTarget) * 100) : 0,
      wasteRate: totalProduced > 0 ? ((totalWaste / (totalProduced + totalWaste)) * 100).toFixed(1) : '0.0'
    };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => 
      j.productName.toLowerCase().includes(filter.toLowerCase()) || 
      j.id.toLowerCase().includes(filter.toLowerCase())
    );
  }, [jobs, filter]);

  const handleMoveStage = (job: ProductionJob) => {
    const currentIdx = PRODUCTION_STAGES.findIndex(s => s.id === job.status);
    if (currentIdx < PRODUCTION_STAGES.length - 1) {
        const nextStage = PRODUCTION_STAGES[currentIdx + 1].id;
        onUpdateJob({ ...job, status: nextStage, progress: Math.min(100, job.progress + 20) });
    }
  };

  const getStatusBadge = (status: string) => {
    const stage = PRODUCTION_STAGES.find(s => s.id === status);
    if (!stage) return null;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-${stage.color}-500/10 text-${stage.color}-500`}>
        {stage.label}
      </span>
    );
  };

  const handleAddCuttingLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    const newLog: CuttingLog = {
      id: `LOG-${Date.now()}`,
      date: logData.date || new Date().toISOString().split('T')[0],
      quantity: logData.quantity || 0,
      operatorName: logData.operatorName,
      notes: logData.notes,
      sizeWise: logData.sizeWise,
      createdAt: new Date().toISOString()
    };

    const updatedLogs = [...(selectedJob.cuttingLogs || []), newLog];
    const totalCut = updatedLogs.reduce((sum, log) => sum + log.quantity, 0);
    
    const cuttingProgress = Math.min(100, Math.round((totalCut / selectedJob.quantity) * 100));

    onUpdateJob({
      ...selectedJob,
      cuttingLogs: updatedLogs,
      progress: selectedJob.status === 'CUTTING' ? Math.min(20, Math.round(cuttingProgress * 0.2)) : selectedJob.progress
    });

    setIsLogModalOpen(false);
    setLogData({ date: new Date().toISOString().split('T')[0], quantity: 0, sizeWise: {} });
  };

  const handleAddProductionLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    const newLog: ProductionLog = {
      id: `PLOG-${Date.now()}`,
      jobId: selectedJob.id,
      machineId: prodLogData.machineId || '',
      operatorId: prodLogData.operatorId || '',
      quantityProduced: prodLogData.quantityProduced || 0,
      wasteProduced: prodLogData.wasteProduced || 0,
      timestamp: new Date().toISOString(),
      efficiency: prodLogData.efficiency || 0,
      createdAt: new Date().toISOString()
    };

    const updatedLogs = [...(selectedJob.productionLogs || []), newLog];
    const totalProduced = updatedLogs.reduce((sum, log) => sum + log.quantityProduced, 0);
    
    // Update progress based on production logs if not in cutting stage
    const productionProgress = Math.min(100, Math.round((totalProduced / selectedJob.quantity) * 100));
    
    onUpdateJob({
      ...selectedJob,
      productionLogs: updatedLogs,
      progress: selectedJob.status !== 'CUTTING' ? Math.max(selectedJob.progress, productionProgress) : selectedJob.progress
    });

    setIsProdLogModalOpen(false);
    setProdLogData({ timestamp: new Date().toISOString(), quantityProduced: 0, wasteProduced: 0 });
  };

  const handleJobSizeChange = (size: string, val: number) => {
    const newSizeWise = { ...formData.sizeWise, [size]: val };
    const newTotal = Object.values(newSizeWise).reduce((sum, v) => sum + (v || 0), 0);
    setFormData({ ...formData, sizeWise: newSizeWise, quantity: newTotal });
  };

  const handleSizeChange = (size: string, val: number) => {
    const newSizeWise = { ...logData.sizeWise, [size]: val };
    const newTotal = Object.values(newSizeWise).reduce((sum, v) => sum + (v || 0), 0);
    setLogData({ ...logData, sizeWise: newSizeWise, quantity: newTotal });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-rose-500 bg-rose-500/10';
      case 'NORMAL': return 'text-amber-500 bg-amber-500/10';
      case 'LOW': return 'text-emerald-500 bg-emerald-500/10';
      default: return 'text-slate-500 bg-slate-500/10';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Production Control</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage and track your manufacturing workflow</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-black/5 dark:bg-white/5 rounded-xl border border-macos-border dark:border-macos-darkBorder">
            <button 
              onClick={() => setActiveTab('KANBAN')}
              className={`p-2 rounded-lg transition-all ${activeTab === 'KANBAN' ? 'bg-white dark:bg-slate-800 shadow-macos-sm text-macos-accent' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setActiveTab('LIST')}
              className={`p-2 rounded-lg transition-all ${activeTab === 'LIST' ? 'bg-white dark:bg-slate-800 shadow-macos-sm text-macos-accent' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <List className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setActiveTab('ANALYTICS')}
              className={`p-2 rounded-lg transition-all ${activeTab === 'ANALYTICS' ? 'bg-white dark:bg-slate-800 shadow-macos-sm text-macos-accent' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <BarChart3 className="w-5 h-5" />
            </button>
          </div>
          <div className="flex rounded-lg border border-macos-border dark:border-macos-darkBorder overflow-hidden text-[10px] font-black uppercase tracking-widest">
            <button onClick={() => setActiveTab('PROD_PLAN')} className={`px-3 py-2 transition-all ${activeTab === 'PROD_PLAN' ? 'bg-macos-accent text-white' : 'bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800'}`}>Production Plan</button>
            <button onClick={() => setActiveTab('JOBS')} className={`px-3 py-2 transition-all ${activeTab === 'JOBS' ? 'bg-macos-accent text-white' : 'bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800'}`}>Work Orders</button>
            <button onClick={() => setActiveTab('JOBSLIP')} className={`px-3 py-2 transition-all ${activeTab === 'JOBSLIP' ? 'bg-macos-accent text-white' : 'bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800'}`}>Job Card</button>
            <button onClick={() => setActiveTab('WORKSTATIONS')} className={`px-3 py-2 transition-all ${activeTab === 'WORKSTATIONS' ? 'bg-macos-accent text-white' : 'bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800'}`}>Workstations</button>
            <button onClick={() => setActiveTab('QR')} className={`px-3 py-2 transition-all ${activeTab === 'QR' ? 'bg-macos-accent text-white' : 'bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800'}`}>Tracking Board</button>
          </div>
          <button 
            onClick={() => { setFormData({ status: 'CUTTING', priority:'NORMAL', quantity: 0, progress: 0, sizeWise: {} }); setIsModalOpen(true); }}
            className="macos-btn-primary flex items-center gap-2 px-5 py-2.5"
          >
            <Plus className="w-5 h-5" />
            <span>New Work Order</span>
          </button>
        </div>
      </div>

      {/* Analytics Overview (The "Brain") */}
      {activeTab === 'ANALYTICS' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 macos-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold tracking-tight">Production Efficiency</h3>
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="h-48 flex items-end gap-2 px-2">
                {[65, 78, 82, 75, 90, 85, productionStats.avgEfficiency].map((val, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${val}%` }}
                      className="w-full bg-macos-accent/20 rounded-t-lg relative group"
                    >
                      <div className="absolute inset-0 bg-macos-accent opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg" />
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {val}% Efficiency
                      </div>
                    </motion.div>
                    <span className="text-[10px] font-bold text-slate-400">{i === 6 ? 'Today' : `Day ${i+1}`}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="macos-card p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold tracking-tight mb-2">Resource Health</h3>
                <p className="text-xs text-slate-500 mb-6 uppercase tracking-widest font-bold">Machine & Labor Utilization</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600">Machine Uptime</span>
                    <span className="text-emerald-500">92%</span>
                  </div>
                  <div className="h-2 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: '92%' }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600">Labor Efficiency</span>
                    <span className="text-amber-500">{productionStats.avgEfficiency}%</span>
                  </div>
                  <div className="h-2 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${productionStats.avgEfficiency}%` }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600">Waste Management</span>
                    <span className="text-rose-500">{productionStats.wasteRate}%</span>
                  </div>
                  <div className="h-2 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500" style={{ width: `${Math.min(100, Number(productionStats.wasteRate) * 10)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="macos-card p-6 border-l-4 border-macos-accent">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-5 h-5 text-macos-accent" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Avg. Cycle Time</span>
              </div>
              <p className="text-2xl font-bold">4.2 Days</p>
              <p className="text-[10px] text-emerald-500 font-bold mt-1">↑ 12% faster than last month</p>
            </div>
            <div className="macos-card p-6 border-l-4 border-emerald-500">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Quality Pass Rate</span>
              </div>
              <p className="text-2xl font-bold">98.6%</p>
              <p className="text-[10px] text-emerald-500 font-bold mt-1">↑ 0.4% improvement</p>
            </div>
            <div className="macos-card p-6 border-l-4 border-amber-500">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Waste</span>
              </div>
              <p className="text-2xl font-bold">{productionStats.totalWaste} Pcs</p>
              <p className="text-[10px] text-rose-500 font-bold mt-1">{productionStats.wasteRate}% Waste Rate</p>
            </div>
            <div className="macos-card p-6 border-l-4 border-indigo-500">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Produced</span>
              </div>
              <p className="text-2xl font-bold">{productionStats.totalProduced} Pcs</p>
              <p className="text-[10px] text-slate-400 font-bold mt-1">Across all active jobs</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      {activeTab !== 'ANALYTICS' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Jobs', value: jobs.filter(j => j.status !== 'READY').length, icon: Clock, color: 'blue' },
          { label: 'In Finishing', value: jobs.filter(j => j.status === 'FINISHING').length, icon: Sparkles, color: 'pink' },
          { label: 'Ready', value: jobs.filter(j => j.status === 'READY').length, icon: CheckCircle, color: 'emerald' },
          { label: 'Total Units', value: jobs.reduce((acc, j) => acc + (j.quantity || 0), 0), icon: Factory, color: 'indigo' }
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="macos-card p-6 flex items-center gap-4"
          >
            <div className={`p-3 rounded-2xl bg-${stat.color}-500/10 text-${stat.color}-500`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-bold mt-0.5">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>
    )}

      {/* Search & Filter */}
      <div className="macos-card p-4 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Search by Job No or Product..."
            className="macos-input pl-12 w-full"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all">
          <Filter className="w-4 h-4" />
          <span>Filters</span>
        </button>
      </div>

      {/* Kanban View */}
      {activeTab === 'KANBAN' && (
        <div className="space-y-6">
          {/* Mobile Stage Selector */}
          <div className="flex lg:hidden overflow-x-auto no-scrollbar gap-2 p-1 bg-black/5 dark:bg-white/5 rounded-xl border border-macos-border dark:border-macos-darkBorder">
            {PRODUCTION_STAGES.map(stage => (
              <button 
                key={stage.id}
                onClick={() => setActiveStage(stage.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeStage === stage.id ? 'bg-white dark:bg-slate-800 text-macos-accent shadow-macos-sm' : 'text-slate-500'}`}
              >
                <stage.icon className="w-3.5 h-3.5" />
                {stage.label}
              </button>
            ))}
          </div>

          <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar min-h-[600px]">
            {PRODUCTION_STAGES.map((stage) => (
              <div 
                key={stage.id} 
                className={`flex-shrink-0 w-full md:w-80 flex flex-col gap-4 ${activeStage !== stage.id ? 'hidden lg:flex' : 'flex'}`}
              >
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full bg-${stage.color}-500`} />
                    <h3 className="font-bold text-slate-700 dark:text-slate-300">{stage.label}</h3>
                    <span className="text-xs font-bold px-2 py-0.5 bg-black/5 dark:bg-white/5 rounded-full text-slate-500">
                      {filteredJobs.filter(j => j.status === stage.id).length}
                    </span>
                  </div>
                  <button className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-slate-400">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 flex flex-col gap-4">
                  <AnimatePresence mode="popLayout">
                    {filteredJobs.filter(j => j.status === stage.id).map((job) => {
                      const totalCut = (job.cuttingLogs || []).reduce((sum, log) => sum + log.quantity, 0);
                      const assignedMachine = machines.find(m => m.id === job.assignedMachine);
                      const displayImageUrl = job.imageUrl || designs.find(d => d.name === job.productName)?.imageUrl || samples.find(s => s.id === job.sampleId)?.imageUrl;
                      
                      return (
                        <motion.div
                          key={job.id}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          whileHover={{ y: -4 }}
                          className="macos-card p-5 group cursor-pointer"
                          onClick={() => { setSelectedJob(job); setFormData(job); setIsModalOpen(true); }}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-black/5 dark:bg-white/5 rounded-full text-slate-500 tracking-wider w-fit">
                                #{job.id}
                              </span>
                              {job.sampleId && (
                                <span className="text-[9px] font-bold text-indigo-500 uppercase flex items-center gap-1">
                                  <FlaskRound className="w-3 h-3" /> Sample #{job.sampleId}
                                </span>
                              )}
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${getPriorityColor(job.priority)}`}>
                              {job.priority}
                            </span>
                          </div>
                          
                          {displayImageUrl && (
                            <div className="w-full aspect-[16/9] rounded-xl overflow-hidden border border-macos-border dark:border-macos-darkBorder mb-4 bg-slate-100 dark:bg-slate-800">
                              <img src={displayImageUrl} alt={job.productName} className="w-full h-full object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
                            </div>
                          )}
                          
                          <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1 truncate">{job.productName}</h4>

                          {customFields.some((f: any) => (job as any)[f.key]) && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {customFields.map((f: any) => (job as any)[f.key] && (
                                <span key={f.id} className="text-[8px] font-bold px-1.5 py-0.5 bg-indigo-50 dark:bg-slate-950/40 text-indigo-700 dark:text-indigo-300 rounded-lg border border-indigo-100/40 dark:border-indigo-900/20 uppercase tracking-tight">
                                  {f.label}: {(job as any)[f.key]}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {job.sizeWise && Object.keys(job.sizeWise).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-4">
                              {Object.entries(job.sizeWise).map(([size, qty]) => qty > 0 && (
                                <span key={size} className="text-[9px] font-bold px-1.5 py-0.5 bg-macos-accent/10 text-macos-accent rounded-md">
                                  {size}: {qty}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="space-y-3">
                            <div className="flex justify-between text-[11px] font-bold">
                               <span className="text-slate-500">Target: {job.quantity} Pcs</span>
                               <span className="text-macos-accent">{job.progress}%</span>
                            </div>
                            <div className="h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                               <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${job.progress}%` }}
                                  className="h-full bg-macos-accent"
                               />
                            </div>
                            
                            {job.status === 'CUTTING' ? (
                              <div className="bg-black/[0.02] dark:bg-white/[0.02] rounded-xl p-3 border border-macos-border dark:border-macos-darkBorder mt-2">
                                <div className="flex justify-between items-center mb-1.5">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cutting Progress</span>
                                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{totalCut} / {job.quantity}</span>
                                </div>
                                <div className="h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full bg-orange-500" style={{width: `${Math.min(100, (totalCut/job.quantity)*100)}%`}}></div>
                                </div>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setSelectedJob(job); setIsLogModalOpen(true); }} 
                                  className="w-full mt-3 py-1.5 text-[10px] font-bold text-macos-accent hover:bg-macos-accent/10 rounded-lg border border-macos-accent/20 flex items-center justify-center gap-1.5 transition-all"
                                >
                                  <Plus className="w-3 h-3"/> Add Part Cutting
                                </button>
                              </div>
                            ) : (
                              <div className="bg-black/[0.02] dark:bg-white/[0.02] rounded-xl p-3 border border-macos-border dark:border-macos-darkBorder mt-2">
                                <div className="flex justify-between items-center mb-1.5">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Production Log</span>
                                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                    {(job.productionLogs || []).reduce((sum, l) => sum + l.quantityProduced, 0)} Pcs
                                  </span>
                                </div>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setSelectedJob(job); setIsProdLogModalOpen(true); }} 
                                  className="w-full mt-2 py-1.5 text-[10px] font-bold text-indigo-500 hover:bg-indigo-500/10 rounded-lg border border-indigo-500/20 flex items-center justify-center gap-1.5 transition-all"
                                >
                                  <Activity className="w-3 h-3"/> Log Daily Output
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 pt-4 border-t border-macos-border dark:border-macos-darkBorder flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
                                 <Clock className="w-3 h-3"/> {job.deadline}
                              </div>
                              {assignedMachine && (
                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-indigo-500">
                                   <Settings className="w-3 h-3"/> {assignedMachine.name}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {(job.cuttingLogs?.length || 0) > 0 && (
                                <button onClick={(e) => { e.stopPropagation(); setSelectedJob(job); setIsLogModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-macos-accent transition-all">
                                  <History className="w-4 h-4"/>
                                </button>
                              )}
                              {stage.id !== 'READY' && (
                                <button onClick={(e) => { e.stopPropagation(); handleMoveStage(job); }} className="p-1.5 bg-black/5 dark:bg-white/5 hover:bg-macos-accent/10 text-slate-400 hover:text-macos-accent rounded-lg border border-macos-border dark:border-macos-darkBorder transition-all">
                                   <ArrowRight className="w-4 h-4"/>
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List View */}
      {activeTab === 'LIST' && (
        <div className="macos-card overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-black/5 dark:bg-white/5 border-b border-macos-border dark:border-macos-darkBorder">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Job Details</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Stage</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Quantity</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Cut Qty</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Deadline</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-macos-border dark:divide-macos-darkBorder">
              {filteredJobs.map((job) => {
                const totalCut = (job.cuttingLogs || []).reduce((sum, log) => sum + log.quantity, 0);
                const displayImageUrl = job.imageUrl || designs.find(d => d.name === job.productName)?.imageUrl || samples.find(s => s.id === job.sampleId)?.imageUrl;
                return (
                  <tr key={job.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-all group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        {displayImageUrl && (
                          <div className="w-16 h-16 rounded-xl overflow-hidden border border-macos-border dark:border-macos-darkBorder shrink-0 bg-slate-50 shadow-macos-sm group-hover:scale-110 transition-transform duration-300">
                            <img src={displayImageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-macos-accent mb-0.5">#{job.id}</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{job.productName}</span>
                          {job.sampleId && (
                            <span className="text-[9px] font-bold text-indigo-500 uppercase flex items-center gap-1 mt-0.5">
                              <FlaskRound className="w-3 h-3" /> Linked to Sample #{job.sampleId}
                            </span>
                          )}
                          {job.sizeWise && Object.keys(job.sizeWise).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {Object.entries(job.sizeWise).map(([size, qty]) => qty > 0 && (
                                <span key={size} className="text-[9px] font-bold text-slate-400">
                                  {size}: {qty}
                                </span>
                              ))}
                            </div>
                          )}
                          {customFields.some((f: any) => (job as any)[f.key]) && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {customFields.map((f: any) => (job as any)[f.key] && (
                                <span key={f.id} className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-50 dark:bg-slate-950/40 text-indigo-700 dark:text-indigo-300 rounded-md border border-indigo-100/40 dark:border-indigo-900/10 uppercase tracking-tight">
                                  {f.label}: {(job as any)[f.key]}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(job.status)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold tabular-nums">
                      {job.quantity} PCS
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-orange-500 tabular-nums">
                      {totalCut} PCS
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {job.deadline}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button className="p-2 hover:bg-macos-accent/10 text-macos-accent rounded-lg">
                          <Printer className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-macos-accent/10 text-macos-accent rounded-lg">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'PROD_PLAN' && (
        <ProductionPlan orders={orders} designs={designs} jobs={jobs} onAction={onAction} />
      )}
      {activeTab === 'JOBS' && (
        <ProductionJobs jobs={jobs} designs={designs} machines={machines} karigars={karigars} onUpdateJob={onUpdateJob} onAddJob={onAddJob} onAction={onAction} currency={currency} />
      )}
      {activeTab === 'WORKSTATIONS' && <Workstations workstations={machines} onAdd={onAddMachine!} onUpdate={onUpdateMachine!} onDelete={onDeleteMachine!} />}
      {activeTab === 'JOBSLIP' && <GenerateJobSlip jobs={jobs} workstations={machines} karigars={karigars} onUpdateJob={onUpdateJob} />}
      {activeTab === 'QR' && <GenerateQR />}
      {activeTab === 'SLIP_ANALYTICS' && <JobslipAnalytics />}

      {/* New Job Modal */}
      <BaseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={formData.id ? `Edit Jobslip: #${formData.id}` : "New Production Jobslip"} size="lg">
          <form onSubmit={(e) => { 
            e.preventDefault(); 
            if (formData.id) {
              onUpdateJob(formData as ProductionJob);
            } else {
              onAddJob({...formData, id:`JOB-${Date.now().toString().slice(-4)}`, startDate: new Date().toISOString().split('T')[0]} as any);
            }
            setIsModalOpen(false); 
          }} className="space-y-6">
             {(formData.imageUrl || designs.find(d => d.name === formData.productName)?.imageUrl || samples.find(s => s.id === formData.sampleId)?.imageUrl) && (
                <div className="w-full aspect-video rounded-2xl overflow-hidden border-2 border-macos-border dark:border-macos-darkBorder shadow-inner">
                   <img 
                    src={formData.imageUrl || designs.find(d => d.name === formData.productName)?.imageUrl || samples.find(s => s.id === formData.sampleId)?.imageUrl} 
                    alt="Reference" 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer" 
                   />
                </div>
             )}
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Design Selection</label>
                    <select required className="macos-input w-full" value={formData.productName || ''} onChange={e => {
                      const design = designs.find(d => d.name === e.target.value);
                      setFormData({...formData, productName: e.target.value, imageUrl: design?.imageUrl});
                    }}>
                      <option value="">Choose Design...</option>
                      {designs.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Linked Sample (Optional)</label>
                    <select className="macos-input w-full" value={formData.sampleId || ''} onChange={e => {
                      const sample = samples.find(s => s.id === e.target.value);
                      setFormData({...formData, sampleId: e.target.value, imageUrl: sample?.imageUrl || formData.imageUrl});
                    }}>
                      <option value="">No Sample Linked</option>
                      {samples.map(s => <option key={s.id} value={s.id}>#{s.id} - {s.designName}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Linked Sales Order (Optional)</label>
                    <select className="macos-input w-full" value={formData.orderId || ''} onChange={e => {
                      const order = orders.find(o => o.id === e.target.value);
                      if (order) {
                        // Optionally autopopulate sizeWise if it's the only item in order
                        const item = order.items[0];
                        setFormData({
                          ...formData, 
                          orderId: e.target.value, 
                          productName: item.productName,
                          sizeWise: item.sizeWise || formData.sizeWise,
                          quantity: item.quantity || formData.quantity
                        });
                      } else {
                        setFormData({...formData, orderId: e.target.value});
                      }
                    }}>
                      <option value="">No Order Linked</option>
                      {orders.map(o => <option key={o.id} value={o.id}>#{o.id} - {o.customerName}</option>)}
                    </select>
                </div>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Quantity (Pcs)</label>
                   <div className="relative">
                      <input type="number" required className="macos-input w-full bg-black/5 dark:bg-white/5 font-bold" value={formData.quantity || 0} readOnly />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">Auto</div>
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Priority</label>
                   <select className="macos-input w-full" value={formData.priority || 'NORMAL'} onChange={e => setFormData({...formData, priority: e.target.value as any})}>
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">Urgent</option>
                      <option value="LOW">Low</option>
                   </select>
                </div>
             </div>

             <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Machine Assignment</label>
                <select className="macos-input w-full" value={formData.assignedMachine || ''} onChange={e => setFormData({...formData, assignedMachine: e.target.value})}>
                   <option value="">No Machine Assigned</option>
                   {machines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.type})</option>)}
                </select>
             </div>

             <div className="bg-black/[0.02] dark:bg-white/[0.02] p-4 md:p-6 rounded-2xl border border-macos-border dark:border-macos-darkBorder">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Target Size-wise Breakdown</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {SIZES.map(size => (
                    <div key={size} className="space-y-2">
                      <label className="block text-[10px] font-bold text-center text-slate-400 uppercase">{size}</label>
                      <input 
                        type="number" 
                        className="macos-input w-full text-center p-2 text-sm" 
                        placeholder="0"
                        value={formData.sizeWise?.[size] || ''} 
                        onChange={e => handleJobSizeChange(size, Number(e.target.value))} 
                      />
                    </div>
                  ))}
                </div>
             </div>
             {customFields.length > 0 && (
                <div className="p-4 md:p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-macos-border dark:border-macos-darkBorder space-y-4">
                   <div className="flex items-center gap-2 border-b border-macos-border dark:border-macos-darkBorder pb-2 mb-2">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-widest">ERPNext Custom fields</h4>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {customFields.map((f: any) => (
                         <div key={f.id} className="space-y-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{f.label} {f.required && <span className="text-rose-500">*</span>}</label>
                            {f.type === 'select' ? (
                               <select 
                                  required={f.required}
                                  className="macos-input w-full text-sm cursor-pointer"
                                  value={(formData as any)[f.key] || ''}
                                  onChange={e => setFormData({...formData, [f.key]: e.target.value})}
                               >
                                  <option value="">{f.placeholder}</option>
                                  {f.options.map((opt: string) => (
                                     <option key={opt} value={opt}>{opt}</option>
                                  ))}
                               </select>
                            ) : (
                               <input 
                                  required={f.required}
                                  type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                                  className="macos-input w-full text-sm"
                                  placeholder={f.placeholder}
                                  value={(formData as any)[f.key] || ''}
                                  onChange={e => setFormData({...formData, [f.key]: e.target.value})}
                               />
                            )}
                         </div>
                      ))}
                   </div>
                </div>
             )}

             <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Target Deadline</label>
                <input type="date" required className="macos-input w-full" value={formData.deadline || ''} onChange={e => setFormData({...formData, deadline: e.target.value})} />
             </div>
             <div className="pt-6 flex flex-col gap-3">
                 <div className="flex gap-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-2.5 rounded-xl border border-macos-border dark:border-macos-darkBorder text-sm font-bold text-slate-500 hover:bg-black/5 transition-all">Cancel</button>
                    <button type="submit" className="flex-1 macos-btn-primary">Generate Jobslip</button>
                 </div>
                 {formData.id && onAction && (
                    <div className="flex gap-4 mt-2 border-t border-macos-border dark:border-macos-darkBorder pt-4">
                      <button type="button" onClick={() => { onAction('CONVERT_TO_MATERIAL_REQUEST', formData); setIsModalOpen(false); }} className="flex-1 px-6 py-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[13px] hover:bg-amber-100 transition-all flex justify-center items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> Create Material Request
                      </button>
                    </div>
                 )}
             </div>
          </form>
      </BaseModal>

      {/* Production Log Modal */}
      <BaseModal isOpen={isProdLogModalOpen} onClose={() => setIsProdLogModalOpen(false)} title={`Daily Production Log: ${selectedJob?.productName}`} size="lg">
          <form onSubmit={handleAddProductionLog} className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Machine</label>
                   <select className="macos-input w-full" value={prodLogData.machineId || ''} onChange={e => setProdLogData({...prodLogData, machineId: e.target.value})}>
                      <option value="">Select Machine...</option>
                      {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Operator / Karigar</label>
                   <select className="macos-input w-full" value={prodLogData.operatorId || ''} onChange={e => setProdLogData({...prodLogData, operatorId: e.target.value})}>
                      <option value="">Select Operator...</option>
                      {karigars.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                   </select>
                </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Quantity Produced Today</label>
                   <input type="number" required className="macos-input w-full" value={prodLogData.quantityProduced || 0} onChange={e => setProdLogData({...prodLogData, quantityProduced: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Waste / Rejection (Pcs)</label>
                   <input type="number" className="macos-input w-full" value={prodLogData.wasteProduced || 0} onChange={e => setProdLogData({...prodLogData, wasteProduced: Number(e.target.value)})} />
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Efficiency Rating (%)</label>
                <input type="range" min="0" max="100" className="w-full h-2 bg-black/5 dark:bg-white/5 rounded-lg appearance-none cursor-pointer accent-macos-accent" value={prodLogData.efficiency || 0} onChange={e => setProdLogData({...prodLogData, efficiency: Number(e.target.value)})} />
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                   <span>0%</span>
                   <span className="text-macos-accent">{prodLogData.efficiency}%</span>
                   <span>100%</span>
                </div>
             </div>
             <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setIsProdLogModalOpen(false)} className="flex-1 px-6 py-2.5 rounded-xl border border-macos-border dark:border-macos-darkBorder text-sm font-bold text-slate-500 hover:bg-black/5 transition-all">Cancel</button>
                <button type="submit" className="flex-1 macos-btn-primary">Record Production</button>
             </div>
          </form>
      </BaseModal>

      {/* Cutting Log Modal */}
      <BaseModal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} title={`Cutting History: ${selectedJob?.productName}`} size="xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Add New Log Form */}
            <div className="space-y-8">
              <h3 className="text-lg font-bold tracking-tight">Add Part Cutting Entry</h3>
              <form onSubmit={handleAddCuttingLog} className="space-y-6 bg-black/[0.02] dark:bg-white/[0.02] p-8 rounded-2xl border border-macos-border dark:border-macos-darkBorder">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="date" required className="macos-input w-full pl-12" value={logData.date || ''} onChange={e => setLogData({...logData, date: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Quantity (Pcs)</label>
                    <input type="number" required className="macos-input w-full bg-black/5 dark:bg-white/5 font-bold" value={logData.quantity || 0} readOnly />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Size-wise Breakdown</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {SIZES.map(size => (
                      <div key={size} className="space-y-2">
                        <label className="block text-[10px] font-bold text-center text-slate-400 uppercase">{size}</label>
                        <input 
                          type="number" 
                          className="macos-input w-full text-center p-2 text-sm" 
                          placeholder="0"
                          value={logData.sizeWise?.[size] || ''} 
                          onChange={e => handleSizeChange(size, Number(e.target.value))} 
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Operator Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" className="macos-input w-full pl-12" placeholder="Operator name" value={logData.operatorName || ''} onChange={e => setLogData({...logData, operatorName: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Notes</label>
                  <textarea className="macos-input w-full min-h-[100px]" placeholder="Any specific details..." value={logData.notes || ''} onChange={e => setLogData({...logData, notes: e.target.value})} />
                </div>
                <button type="submit" className="w-full macos-btn-primary py-3">Record Cutting Entry</button>
              </form>
            </div>

            {/* History List */}
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold tracking-tight">Cutting Log History</h3>
                <span className="text-xs font-bold text-macos-accent bg-macos-accent/10 px-3 py-1 rounded-full border border-macos-accent/20">
                  Total: {(selectedJob?.cuttingLogs || []).reduce((sum, l) => sum + l.quantity, 0)} / {selectedJob?.quantity}
                </span>
              </div>
              
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                {(!selectedJob?.cuttingLogs || selectedJob.cuttingLogs.length === 0) ? (
                  <div className="text-center py-20 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl border border-dashed border-macos-border dark:border-macos-darkBorder">
                    <Scissors className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-sm text-slate-500 font-medium">No cutting entries recorded yet.</p>
                  </div>
                ) : (
                  selectedJob.cuttingLogs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
                    <motion.div 
                      key={log.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="macos-card p-6"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-macos-accent/10 flex items-center justify-center">
                            <Scissors className="w-5 h-5 text-macos-accent" />
                          </div>
                          <div>
                            <p className="text-sm font-bold">{log.quantity} Pieces Cut</p>
                            <p className="text-xs text-slate-500 font-medium">{log.date}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">#{log.id.slice(-4)}</span>
                      </div>
                      
                      {log.sizeWise && Object.keys(log.sizeWise).length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {Object.entries(log.sizeWise).map(([size, qty]) => qty > 0 && (
                            <div key={size} className="flex flex-col items-center bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-macos-border dark:border-macos-darkBorder">
                              <span className="text-[8px] font-black text-slate-400 uppercase">{size}</span>
                              <span className="text-xs font-bold">{qty}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {log.operatorName && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                          <User className="w-3.5 h-3.5" /> {log.operatorName}
                        </div>
                      )}
                      {log.notes && (
                        <p className="mt-4 text-xs text-slate-500 italic bg-black/[0.02] dark:bg-white/[0.02] p-3 rounded-xl border border-macos-border dark:border-macos-darkBorder">
                          "{log.notes}"
                        </p>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
      </BaseModal>
    </div>
  );
};

export default Production;
