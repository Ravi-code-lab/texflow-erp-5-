import React, { useState, useEffect, useMemo } from 'react';
import { getItem, setItem } from '../utils/indexedDB';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Warehouse, Droplets, Scale, Scissors, Grid, Sparkles, 
  ShieldCheck, Box, ChevronRight, Plus, RefreshCw, Printer, AlertTriangle, 
  Trash2, Search, Calendar, User, Save, CheckCircle2, Info, ArrowRight, ClipboardCheck,
  Settings
} from 'lucide-react';
import { Design, Karigar, Machine, ProductionJob } from '../types';
import BaseModal from './BaseModal';

export interface PipelineStageLog {
  stageId: string;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
  metrics?: Record<string, any>;
}

export interface ManufacturingBatch {
  id: string; // e.g. BATCH-LIVA-RAYON-202
  designName: string;
  styleCode: string;
  fabricType: string;
  totalQty: number;
  currentStageId: string; // one of LIFECYCLE_STEPS
  createdAt: string;
  completionDate?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  stageLogs: Record<string, PipelineStageLog>;
  customSteps?: string[];
}

interface ManufacturingPipelineProps {
  designs?: Design[];
  karigars?: Karigar[];
  machines?: Machine[];
}

export const LIFECYCLE_STEPS = [
  { id: 'GRAY_ORDER', label: 'Gray order', color: '#10b981', textColor: 'text-emerald-600 dark:text-emerald-400', iconColor: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-250', icon: FileText },
  { id: 'GRAY_INVENTORY', label: 'Gray Inventory', color: '#10b981', textColor: 'text-emerald-600 dark:text-emerald-400', iconColor: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-250', icon: Warehouse },
  { id: 'PRINTING_DYEING', label: 'Printing / dyeing', color: '#f59e0b', textColor: 'text-amber-600 dark:text-amber-400', iconColor: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-250', icon: Droplets },
  { id: 'SHRINKAGE_WASTAGE', label: 'Shrinkage / wastage', color: '#f59e0b', textColor: 'text-amber-600 dark:text-amber-400', iconColor: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-250', icon: Scale },
  { id: 'CUTTING', label: 'Cutting', color: '#10b981', textColor: 'text-emerald-600 dark:text-emerald-400', iconColor: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-250', icon: Scissors },
  { id: 'STITCHING', label: 'Stitching', color: '#f43f5e', textColor: 'text-rose-600 dark:text-rose-400', iconColor: 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 border-rose-250', icon: Grid },
  { id: 'FINISHING_EMBROIDERY', label: 'Finishing / embroidery', color: '#f43f5e', textColor: 'text-rose-600 dark:text-rose-400', iconColor: 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 border-rose-250', icon: Sparkles },
  { id: 'QC', label: 'QC', color: '#f59e0b', textColor: 'text-amber-600 dark:text-amber-400', iconColor: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-250', icon: ShieldCheck },
  { id: 'PACKING', label: 'Packing', color: '#f43f5e', textColor: 'text-rose-600 dark:text-rose-400', iconColor: 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 border-rose-250', icon: Box }
];

const STORAGE_KEY = 'texflow_manufacturing_pipeline_batches';

const INITIAL_BATCHES: ManufacturingBatch[] = [
  {
    id: 'BATCH-LIVA-RAYON-202',
    designName: 'Summer Print Rayon Kurti (A-Line)',
    styleCode: 'KURTI-SL-RAY-02',
    fabricType: 'Rayon Liva (140 GSM)',
    totalQty: 1200,
    currentStageId: 'SHRINKAGE_WASTAGE',
    priority: 'HIGH',
    createdAt: '2026-05-20',
    customSteps: ['GRAY_ORDER', 'GRAY_INVENTORY', 'PRINTING_DYEING', 'SHRINKAGE_WASTAGE', 'CUTTING', 'STITCHING', 'QC', 'PACKING'],
    stageLogs: {
      GRAY_ORDER: {
        stageId: 'GRAY_ORDER',
        completedAt: '2026-05-20',
        completedBy: 'Ramesh Singh',
        notes: 'Premium Rayon purchase approved. Weft construction 82 picks.',
        metrics: { poNumber: 'ERP-PO-9912', weaveSupplier: 'Liva Rayon Fabrics Corp', ratePerMeter: 85 }
      },
      GRAY_INVENTORY: {
        stageId: 'GRAY_INVENTORY',
        completedAt: '2026-05-21',
        completedBy: 'Balwan Das',
        notes: 'Fabric received and stored. Total 25 rolls verified.',
        metrics: { receivedYards: 2800, godownNo: 'Roll Storage Block-B', grading: 'Grade-A' }
      },
      PRINTING_DYEING: {
        stageId: 'PRINTING_DYEING',
        completedAt: '2026-05-24',
        completedBy: 'Mohit Kumar',
        notes: 'Teal Neck Floral print complete. Jet process temperature reached 90C.',
        metrics: { vendorName: 'Classic Handprint Karigars', colorWay: 'Teal-Pink Custom Shade', temperature: 90, phLevel: 7.2 }
      },
      SHRINKAGE_WASTAGE: {
        stageId: 'SHRINKAGE_WASTAGE',
        notes: 'Post-print audit of test swatch is under observation.',
        metrics: { testPieceMeters: 10, shrunkMeters: 9.6, shrinkPct: 4.0, wasteSalvageMeters: 0.4 }
      }
    }
  },
  {
    id: 'BATCH-COTTON-60S-105',
    designName: 'Ivory Cambric Office Shirt',
    styleCode: 'SHIRT-IVR-CAM-105',
    fabricType: 'Cotton Cambric (80 GSM)',
    totalQty: 2500,
    currentStageId: 'GRAY_ORDER',
    priority: 'NORMAL',
    createdAt: '2026-05-28',
    customSteps: ['GRAY_ORDER', 'GRAY_INVENTORY', 'CUTTING', 'STITCHING', 'QC', 'PACKING'],
    stageLogs: {
      GRAY_ORDER: {
        stageId: 'GRAY_ORDER',
        notes: 'Initial weaving order released to Vardhman Cottons.',
        metrics: { poNumber: 'ERP-PO-9923', weaveSupplier: 'Vardhman Cottons Ltd', ratePerMeter: 65 }
      }
    }
  },
  {
    id: 'BATCH-JAIPURI-INDIGO-99',
    designName: 'Anarkali Jaipuri Indigo Dress',
    styleCode: 'ANK-JAI-IND-99',
    fabricType: 'Premium Slub-Cotton',
    totalQty: 850,
    currentStageId: 'STITCHING',
    priority: 'NORMAL',
    createdAt: '2026-05-10',
    customSteps: ['GRAY_ORDER', 'GRAY_INVENTORY', 'PRINTING_DYEING', 'SHRINKAGE_WASTAGE', 'CUTTING', 'STITCHING', 'FINISHING_EMBROIDERY', 'QC', 'PACKING'],
    stageLogs: {
      GRAY_ORDER: {
        stageId: 'GRAY_ORDER',
        completedAt: '2026-05-10',
        notes: 'Indigo slub thread order placed.',
        metrics: { poNumber: 'ERP-PO-9844', weaveSupplier: 'Sanganer Weaving Hub' }
      },
      GRAY_INVENTORY: {
        stageId: 'GRAY_INVENTORY',
        completedAt: '2026-05-12',
        notes: 'Slub cotton bales loaded into basement storage.',
        metrics: { receivedYards: 1950, godownNo: 'B-1 basement' }
      },
      PRINTING_DYEING: {
        stageId: 'PRINTING_DYEING',
        completedAt: '2026-05-18',
        notes: 'Dabu block print stamps cured in chemical bath.',
        metrics: { vendorName: 'Sanganer Dabu Print House', colorWay: 'Indigo Blue base' }
      },
      SHRINKAGE_WASTAGE: {
        stageId: 'SHRINKAGE_WASTAGE',
        completedAt: '2026-05-20',
        notes: 'Shrinkage measured 1.5% only. Highly stable.',
        metrics: { shrinkPct: 1.5, wasteSalvageMeters: 0.1 }
      },
      CUTTING: {
        stageId: 'CUTTING',
        completedAt: '2026-05-23',
        completedBy: 'Master Karim',
        notes: 'Anarkali flare pattern precisely aligned and cut.',
        metrics: { piecesCutCount: 855, wastePercentAmt: 2.1, cuttingMaster: 'Karim Chacha' }
      }
    }
  }
];

export const ManufacturingPipeline: React.FC<ManufacturingPipelineProps> = ({
  designs = [],
  karigars = [],
  machines = []
}) => {
  const [batches, setBatches] = useState<ManufacturingBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Dynamic custom routing and preset states (ERPNext style)
  const [newRoutingPreset, setNewRoutingPreset] = useState<'FULL' | 'BASIC_SHIRT' | 'KNITWEAR' | 'CUSTOM'>('FULL');
  const [newCustomSteps, setNewCustomSteps] = useState<string[]>(LIFECYCLE_STEPS.map(s => s.id));
  const [showRoutingModal, setShowRoutingModal] = useState(false);
  const [editingBatchRoutingId, setEditingBatchRoutingId] = useState('');
  const [selectedRoutingSteps, setSelectedRoutingSteps] = useState<string[]>([]);

  // Function to apply preset templates
  const handleApplyPreset = (preset: 'FULL' | 'BASIC_SHIRT' | 'KNITWEAR') => {
    setNewRoutingPreset(preset);
    if (preset === 'FULL') {
      setNewCustomSteps(LIFECYCLE_STEPS.map(s => s.id));
    } else if (preset === 'BASIC_SHIRT') {
      // Skips PRINTING_DYEING and FINISHING_EMBROIDERY
      setNewCustomSteps(LIFECYCLE_STEPS.filter(s => s.id !== 'PRINTING_DYEING' && s.id !== 'FINISHING_EMBROIDERY').map(s => s.id));
    } else if (preset === 'KNITWEAR') {
      // Skips GRAY_ORDER, GRAY_INVENTORY, PRINTING_DYEING, SHRINKAGE_WASTAGE
      const skippable = ['GRAY_ORDER', 'GRAY_INVENTORY', 'PRINTING_DYEING', 'SHRINKAGE_WASTAGE'];
      setNewCustomSteps(LIFECYCLE_STEPS.filter(s => !skippable.includes(s.id)).map(s => s.id));
    }
  };

  // Form states for creating a new batch
  const [newBatchId, setNewBatchId] = useState('');
  const [newDesignName, setNewDesignName] = useState('');
  const [newStyleCode, setNewStyleCode] = useState('');
  const [newFabricType, setNewFabricType] = useState('');
  const [newTotalQty, setNewTotalQty] = useState(500);
  const [newPriority, setNewPriority] = useState<'LOW' | 'NORMAL' | 'HIGH'>('NORMAL');

  // Input states for current stage logs
  const [activeStageEditId, setActiveStageEditId] = useState<string>('');
  const [logNotes, setLogNotes] = useState('');
  const [logOperator, setLogOperator] = useState('');
  const [metricInputs, setMetricInputs] = useState<Record<string, string>>({});

  // Thermal Label State
  const [showThermalLabel, setShowThermalLabel] = useState(false);
  const [printedLabelData, setPrintedLabelData] = useState<any>(null);

  // Synchronize with indexedDB
  const [batchesLoaded, setBatchesLoaded] = useState(false);
  useEffect(() => {
    getItem<ManufacturingBatch[]>(STORAGE_KEY).then(stored => {
      setBatches(stored && stored.length > 0 ? stored : INITIAL_BATCHES);
      setBatchesLoaded(true);
    }).catch(() => {
      setBatches(INITIAL_BATCHES);
      setBatchesLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (batchesLoaded && batches.length > 0) {
      setItem(STORAGE_KEY, batches);
    }
  }, [batches, batchesLoaded]);

  // Set default selection
  useEffect(() => {
    if (batches.length > 0 && !selectedBatchId) {
      setSelectedBatchId(batches[0].id);
    }
  }, [batches, selectedBatchId]);

  const activeBatch = useMemo(() => {
    return batches.find(b => b.id === selectedBatchId) || null;
  }, [batches, selectedBatchId]);

  const activeSteps = useMemo(() => {
    if (!activeBatch) return LIFECYCLE_STEPS;
    if (!activeBatch.customSteps || activeBatch.customSteps.length === 0) {
      return LIFECYCLE_STEPS;
    }
    return LIFECYCLE_STEPS.filter(step => activeBatch.customSteps!.includes(step.id));
  }, [activeBatch]);

  // Load and populate inputs when selected stage details change
  const handleSelectStageDetails = (stageId: string) => {
    if (!activeBatch) return;
    setActiveStageEditId(stageId);
    const existingLog = (activeBatch.stageLogs[stageId] || {}) as any;
    setLogNotes(existingLog.notes || '');
    setLogOperator(existingLog.completedBy || '');
    
    // Set standard defaults or existing values for metric fields
    const logsMetrics = existingLog.metrics || {};
    const defaultMetrics: Record<string, string> = {};
    
    if (stageId === 'GRAY_ORDER') {
      defaultMetrics.poNumber = logsMetrics.poNumber || `PO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,5).toUpperCase()}`;
      defaultMetrics.weaveSupplier = logsMetrics.weaveSupplier || '';
      defaultMetrics.ratePerMeter = String(logsMetrics.ratePerMeter || '');
    } else if (stageId === 'GRAY_INVENTORY') {
      defaultMetrics.receivedYards = String(logsMetrics.receivedYards || '');
      defaultMetrics.godownNo = logsMetrics.godownNo || '';
      defaultMetrics.grading = logsMetrics.grading || 'Grade-A';
    } else if (stageId === 'PRINTING_DYEING') {
      defaultMetrics.vendorName = logsMetrics.vendorName || '';
      defaultMetrics.colorWay = logsMetrics.colorWay || '';
      defaultMetrics.temperature = String(logsMetrics.temperature || '90');
      defaultMetrics.phLevel = String(logsMetrics.phLevel || '7.1');
    } else if (stageId === 'SHRINKAGE_WASTAGE') {
      defaultMetrics.testPieceMeters = String(logsMetrics.testPieceMeters || '10');
      defaultMetrics.shrunkMeters = String(logsMetrics.shrunkMeters || '');
      defaultMetrics.shrinkPct = String(logsMetrics.shrinkPct || '2');
      defaultMetrics.wasteSalvageMeters = String(logsMetrics.wasteSalvageMeters || '');
    } else if (stageId === 'CUTTING') {
      defaultMetrics.piecesCutCount = String(logsMetrics.piecesCutCount || activeBatch.totalQty);
      defaultMetrics.wastePercentAmt = String(logsMetrics.wastePercentAmt || '2.0');
      defaultMetrics.cuttingMaster = logsMetrics.cuttingMaster || '';
    } else if (stageId === 'STITCHING') {
      defaultMetrics.assignedTailor = logsMetrics.assignedTailor || '';
      defaultMetrics.ratePerStitchPiece = String(logsMetrics.ratePerStitchPiece || '75');
      defaultMetrics.workstationId = logsMetrics.workstationId || '';
    } else if (stageId === 'FINISHING_EMBROIDERY') {
      defaultMetrics.embroideryVendor = logsMetrics.embroideryVendor || '';
      defaultMetrics.embroideryDetails = logsMetrics.embroideryDetails || 'Neck neck lace attachment';
      defaultMetrics.accessoryCost = String(logsMetrics.accessoryCost || '15');
    } else if (stageId === 'QC') {
      defaultMetrics.qcPassedQty = String(logsMetrics.qcPassedQty || activeBatch.totalQty);
      defaultMetrics.minorDefects = String(logsMetrics.minorDefects || '0');
      defaultMetrics.qcStatusResult = logsMetrics.qcStatusResult || 'PASS';
    } else if (stageId === 'PACKING') {
      defaultMetrics.cartonBarcode = logsMetrics.cartonBarcode || `BOX-BAR-${Date.now().toString(36).toUpperCase()}`;
      defaultMetrics.boxSequenceNumber = logsMetrics.boxSequenceNumber || 'BOX-A1';
      defaultMetrics.isHandoffReady = logsMetrics.isHandoffReady || 'YES';
    }

    setMetricInputs(defaultMetrics);
  };

  // Populate form fields if design name changes during creation
  const handleDesignChange = (name: string) => {
    setNewDesignName(name);
    const linkedDesign = designs.find(d => d.name === name);
    if (linkedDesign) {
      setNewStyleCode(linkedDesign.sku || '');
      setNewFabricType(linkedDesign.recipe?.[0]?.materialName || 'Rayon Liva (140 GSM)');
    }
  };

  // Create Batch
  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchId || !newDesignName) {
      alert('Please fill out all mandatory fields.');
      return;
    }

    const firstStage = newCustomSteps[0] || 'GRAY_ORDER';

    const nextBatch: ManufacturingBatch = {
      id: newBatchId.toUpperCase().trim(),
      designName: newDesignName,
      styleCode: newStyleCode || 'STYLE-XYZ',
      fabricType: newFabricType || 'Raw Grey Thread',
      totalQty: Number(newTotalQty || 500),
      currentStageId: firstStage,
      priority: newPriority,
      createdAt: new Date().toISOString().split('T')[0],
      customSteps: newCustomSteps,
      stageLogs: {
        [firstStage]: {
          stageId: firstStage,
          completedAt: new Date().toISOString().split('T')[0],
          completedBy: 'Staff Operator',
          notes: 'Batch initiated into production line.',
          metrics: firstStage === 'GRAY_ORDER' ? { poNumber: `PO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,5).toUpperCase()}` } : {}
        }
      }
    };

    const updated = [nextBatch, ...batches];
    setBatches(updated);
    setSelectedBatchId(nextBatch.id);
    setShowCreateModal(false);
    setBannerMsg(`Manufacturing Batch "${nextBatch.id}" loaded into apparel routing pipeline!`);
    setTimeout(() => setBannerMsg(null), 5000);

    // reset fields
    setNewBatchId('');
    setNewDesignName('');
    setNewStyleCode('');
    setNewFabricType('');
    setNewTotalQty(500);
    setNewPriority('NORMAL');
    setNewRoutingPreset('FULL');
    setNewCustomSteps(LIFECYCLE_STEPS.map(s => s.id));
  };

  // Update specific log values for selected stage
  const handleSaveStageLog = () => {
    if (!activeBatch || !activeStageEditId) return;

    const parsedMetrics: Record<string, any> = {};
    Object.entries(metricInputs).forEach(([k, v]) => {
      if (v === '') return;
      const num = Number(v);
      parsedMetrics[k] = isNaN(num) ? v : num;
    });

    const updatedLogs = {
      ...activeBatch.stageLogs,
      [activeStageEditId]: {
        stageId: activeStageEditId,
        completedAt: activeBatch.stageLogs[activeStageEditId]?.completedAt || new Date().toISOString().split('T')[0],
        completedBy: logOperator || 'Standard Operator',
        notes: logNotes,
        metrics: parsedMetrics
      }
    };

    const updatedBatches = batches.map(b => {
      if (b.id === activeBatch.id) {
        return {
          ...b,
          stageLogs: updatedLogs
        };
      }
      return b;
    });

    setBatches(updatedBatches);
    setBannerMsg(`Values recorded for ${activeStageEditId} on Batch ${activeBatch.id}!`);
    setTimeout(() => setBannerMsg(null), 4000);
  };

  // Advance to Next step
  const handleAdvanceStage = () => {
    if (!activeBatch) return;

    const currentIndex = activeSteps.findIndex(s => s.id === activeBatch.currentStageId);
    if (currentIndex === -1 || currentIndex >= activeSteps.length - 1) {
      alert('This batch is already completed in final stage (Packing).');
      return;
    }

    const nextStage = activeSteps[currentIndex + 1];

    // Mark current stage log completed if it isn't already
    const currentStageId = activeBatch.currentStageId;
    const currentLog = (activeBatch.stageLogs[currentStageId] || {}) as any;
    const updatedLogs = {
      ...activeBatch.stageLogs,
      [currentStageId]: {
        ...currentLog,
        stageId: currentStageId,
        completedAt: currentLog.completedAt || new Date().toISOString().split('T')[0],
        completedBy: currentLog.completedBy || 'Line Foreman'
      }
    };

    const updatedBatches = batches.map(b => {
      if (b.id === activeBatch.id) {
        return {
          ...b,
          currentStageId: nextStage.id,
          stageLogs: updatedLogs,
          completionDate: nextStage.id === 'PACKING' ? new Date().toISOString().split('T')[0] : b.completionDate
        };
      }
      return b;
    });

    setBatches(updatedBatches);
    setBannerMsg(`Batch adjusted! Advanced from "${currentStageId}" to "${nextStage.id}" successfully.`);
    setTimeout(() => setBannerMsg(null), 5000);

    // Select the new stage for detail visibility
    handleSelectStageDetails(nextStage.id);
  };

  const handleDeleteBatch = (id: string) => {
    if (confirm(`Are you sure you want to remove manufacturing batch ${id} from control workspace?`)) {
      const filtered = batches.filter(b => b.id !== id);
      setBatches(filtered);
      if (selectedBatchId === id && filtered.length > 0) {
        setSelectedBatchId(filtered[0].id);
      }
      setBannerMsg(`Batch "${id}" deleted from database record.`);
      setTimeout(() => setBannerMsg(null), 4500);
    }
  };

  const handlePrintQRCode = (batch: ManufacturingBatch) => {
    setPrintedLabelData({
      id: batch.id,
      design: batch.designName,
      style: batch.styleCode,
      qty: batch.totalQty,
      stage: batch.currentStageId,
      date: batch.createdAt
    });
    setShowThermalLabel(true);
  };

  // Filter batches
  const filteredBatches = useMemo(() => {
    return batches.filter(b => {
      const matchesSearch = b.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
        b.designName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.styleCode.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesPriority = filterPriority === 'ALL' || b.priority === filterPriority;
      return matchesSearch && matchesPriority;
    });
  }, [batches, searchQuery, filterPriority]);

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Top statistics banners */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Pipeline Batches', value: batches.length, color: 'text-indigo-600', desc: 'Active production cycles' },
          { label: 'Pending Processing', value: batches.filter(b => b.currentStageId !== 'PACKING').length, color: 'text-amber-600', desc: 'In-progress status' },
          { label: 'Finished Output', value: batches.filter(b => b.currentStageId === 'PACKING').length, color: 'text-emerald-600', desc: 'Packed and stored' },
          { label: 'Total Planned Units', value: batches.reduce((sum, b) => sum + b.totalQty, 0).toLocaleString(), color: 'text-slate-600', desc: 'Meters / Pieces active' },
        ].map((item) => (
          <div key={item.label} className="bg-white border rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</span>
            <div className="flex items-baseline gap-2 mt-2">
              <p className={`text-2xl font-black ${item.color}`}>{item.value}</p>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">{item.desc}</p>
          </div>
        ))}
      </div>

      {bannerMsg && (
        <div className="bg-emerald-50 border border-emerald-250 text-emerald-900 rounded-lg p-3 text-xs flex items-center gap-2 font-bold animate-pulse">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{bannerMsg}</span>
        </div>
      )}

      {/* Main split work interface */}
      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6 items-start">
        
        {/* Left Side: Batch Selector Workspace */}
        <div className="bg-white border rounded-2xl p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase text-slate-500 tracking-wider">Production Batches</h3>
            <button 
              onClick={() => {
                setNewBatchId(`BND-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,5).toUpperCase()}`);
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold tracking-tight px-3 py-1.5 rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Batch</span>
            </button>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search batch or style..."
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-bold"
              />
            </div>
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 text-slate-500 font-bold"
            >
              <option value="ALL">All Pirority</option>
              <option value="HIGH">High</option>
              <option value="NORMAL">Normal</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Batches List panel */}
          <div className="space-y-2 max-h-[580px] overflow-y-auto no-scrollbar">
            {filteredBatches.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-xl text-slate-400 text-xs">
                No pipeline batches matching constraints.
              </div>
            ) : (
              filteredBatches.map(batch => {
                const currentStage = LIFECYCLE_STEPS.find(s => s.id === batch.currentStageId);
                const isSelected = batch.id === selectedBatchId;
                
                return (
                  <div 
                    key={batch.id}
                    onClick={() => {
                      setSelectedBatchId(batch.id);
                      handleSelectStageDetails(batch.currentStageId);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-indigo-600 bg-indigo-50/10' : 'border-slate-200 bg-slate-50/30 hover:border-slate-300'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <span className="text-[10px] font-extrabold uppercase bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 tabular-nums">
                          {batch.id}
                        </span>
                        <h4 className="text-xs font-black text-slate-800 dark:text-white mt-1.5 truncate">
                          {batch.designName}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          Style: {batch.styleCode} • {batch.fabricType}
                        </p>
                      </div>
                      
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                        batch.priority === 'HIGH' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                        batch.priority === 'NORMAL' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {batch.priority}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 mt-3 pt-2">
                      <div className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full`} style={{ backgroundColor: currentStage?.color }} />
                        <span className="text-[10px] text-slate-500 font-extrabold truncate w-32">
                          {currentStage?.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handlePrintQRCode(batch); }}
                          className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded"
                          title="Generate QR Identity Card"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteBatch(batch.id); }}
                          className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded"
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Active Workspace */}
        <div className="space-y-6">
          {activeBatch ? (
            <div className="space-y-6">
              
              {/* Dash-bordered container copied block style of erpnext uploaded */}
              <div className="bg-slate-900 border-2 border-dashed border-slate-700 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="bg-teal-500/15 border border-teal-500/30 text-teal-400 text-[10px] font-black uppercase px-2 py-0.5 rounded-md animate-pulse">
                      ERPNext Live Pipeline Active
                    </span>
                    <span className="text-xs font-black text-slate-400">{activeBatch.id}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBatchRoutingId(activeBatch.id);
                        setSelectedRoutingSteps(activeBatch.customSteps || LIFECYCLE_STEPS.map(s => s.id));
                        setShowRoutingModal(true);
                      }}
                      className="inline-flex items-center gap-1 bg-slate-850 hover:bg-slate-800 text-indigo-300 hover:text-indigo-200 border border-slate-700 text-[10px] font-extrabold px-2.5 py-1 rounded transition-colors"
                    >
                      <Settings className="w-3 h-3 text-indigo-400" />
                      <span>Customize Routing</span>
                    </button>
                  </div>
                  <span className="text-slate-400 text-xs font-semibold">Created: {activeBatch.createdAt}</span>
                </div>

                {/* VISUAL PROGRESS TRACKER SLIDER */}
                <div className="w-full overflow-x-auto pb-4 no-scrollbar">
                  <div className="flex items-center justify-between min-w-[700px] px-2 py-4">
                    {activeSteps.map((step, idx) => {
                      const StepIcon = step.icon;
                      
                      // Calculate status of each stage:
                      // completed? If active batch has it marked completed or current index is greater than step index.
                      const activeStageIndex = activeSteps.findIndex(s => s.id === activeBatch.currentStageId);
                      const isCompleted = activeBatch.stageLogs[step.id]?.completedAt || idx < activeStageIndex;
                      const isActive = step.id === activeBatch.currentStageId;

                      return (
                        <React.Fragment key={step.id}>
                          {/* Circle Icon Button */}
                          <div className="flex flex-col items-center space-y-2 group relative">
                            <button
                              onClick={() => handleSelectStageDetails(step.id)}
                              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all shadow-lg ${
                                isCompleted ? 'bg-emerald-50 border-emerald-500 text-emerald-600 scale-105' :
                                isActive ? 'bg-amber-50 border-amber-500 text-amber-600 scale-110 ring-4 ring-amber-500/10 animate-pulse' :
                                'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                              }`}
                              title={step.label}
                            >
                              <StepIcon className="w-4 h-4 shrink-0" />
                            </button>
                            <span className="text-[9px] font-bold text-center w-16 text-slate-300 group-hover:text-white transition-colors truncate">
                              {step.label}
                            </span>
                          </div>

                          {/* Arrow connector */}
                          {idx < activeSteps.length - 1 && (
                            <div className="flex-1 flex items-center justify-center text-slate-500 font-extrabold text-xs px-1">
                              <span className={`h-0.5 flex-1 mx-2 ${isCompleted ? 'bg-emerald-500/70 border-emerald-500' : 'bg-slate-700'}`} />
                              <ArrowRight className={`w-3 h-3 ${isCompleted ? 'text-emerald-500' : 'text-slate-600'}`} />
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Stage Detailing Panel & Value Addition form */}
              <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-6">
                
                {/* Active Subheading */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
                  <div>
                    <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                      <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                      Stage Details: {(LIFECYCLE_STEPS.find(s => s.id === activeStageEditId) || LIFECYCLE_STEPS[0]).label}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Check input specifications, update real value-add records and audit logs.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSaveStageLog}
                      className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold leading-none px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Logs</span>
                    </button>

                    {activeBatch.currentStageId === activeStageEditId && activeBatch.currentStageId !== 'PACKING' && (
                      <button
                        onClick={handleAdvanceStage}
                        className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                      >
                        <span>Advance Stage</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Log Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Notes / Remarks Field */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Notes / Summary</label>
                      <textarea
                        value={logNotes}
                        onChange={e => setLogNotes(e.target.value)}
                        placeholder="Log operations notes, problems, recipes, or specifications..."
                        className="w-full text-xs font-medium border rounded-xl p-3 bg-slate-50 min-h-[140px] focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Operator / Karigar In-Charge</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <select
                          value={logOperator}
                          onChange={e => setLogOperator(e.target.value)}
                          className="w-full text-xs font-bold border rounded-xl pl-10 pr-3 py-3 bg-slate-50 outline-none"
                        >
                          <option value="">Choose Karigar / Staff...</option>
                          {karigars.map(k => <option key={k.id} value={k.name}>{k.name} ({k.skill})</option>)}
                          <option value="Mohit Kumar">Mohit Kumar (Dyeing)</option>
                          <option value="Balwan Das">Balwan Das (Weaver)</option>
                          <option value="Master Karim">Master Karim (Cutting)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Stage Metrics form (Dynamic depending on current selected stage) */}
                  <div className="space-y-4 bg-slate-50/50 border rounded-2xl p-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Value-Addition Data Inputs (Real ERP Fields)
                    </h4>

                    <div className="space-y-4 divide-y divide-slate-100">
                      
                      {activeStageEditId === 'GRAY_ORDER' && (
                        <div className="space-y-3 pt-1">
                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Purchase Order Number</label>
                              <input
                                value={metricInputs.poNumber || ''}
                                onChange={e => setMetricInputs({ ...metricInputs, poNumber: e.target.value })}
                                className="w-full border rounded-lg p-2 text-xs font-extrabold mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Weaving Supplier Mill</label>
                              <input
                                value={metricInputs.weaveSupplier || ''}
                                onChange={e => setMetricInputs({ ...metricInputs, weaveSupplier: e.target.value })}
                                className="w-full border rounded-lg p-2 text-xs font-bold mt-1"
                                placeholder="Mill name"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Rate Per Meter (₹ / Kg)</label>
                              <input
                                type="number"
                                value={metricInputs.ratePerMeter || ''}
                                onChange={e => setMetricInputs({ ...metricInputs, ratePerMeter: e.target.value })}
                                className="w-full border rounded-lg p-2 text-xs font-bold mt-1"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {activeStageEditId === 'GRAY_INVENTORY' && (
                        <div className="space-y-3 pt-1">
                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Received Fabric Quantity (Yards/Meters)</label>
                              <input
                                type="number"
                                value={metricInputs.receivedYards || ''}
                                onChange={e => setMetricInputs({ ...metricInputs, receivedYards: e.target.value })}
                                className="w-full border rounded-lg p-2 text-xs font-bold mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Godown Block / Shelf Allocation</label>
                              <input
                                value={metricInputs.godownNo || ''}
                                onChange={e => setMetricInputs({ ...metricInputs, godownNo: e.target.value })}
                                className="w-full border rounded-lg p-2 text-xs font-bold mt-1"
                                placeholder="e.g. Rack B4"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Quality Grading Analysis</label>
                              <select
                                value={metricInputs.grading || 'Grade-A'}
                                onChange={e => setMetricInputs({ ...metricInputs, grading: e.target.value })}
                                className="w-full border rounded-lg p-2 text-xs font-bold mt-1 bg-white"
                              >
                                <option value="Grade-A">Grade-A Spotless</option>
                                <option value="Grade-B">Grade-B Minor Spots</option>
                                <option value="Grade-C">Grade-C Re-Weave</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeStageEditId === 'PRINTING_DYEING' && (
                        <div className="space-y-3 pt-1">
                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Dyeing & Print Vendor</label>
                              <input
                                value={metricInputs.vendorName || ''}
                                onChange={e => setMetricInputs({ ...metricInputs, vendorName: e.target.value })}
                                className="w-full border rounded-lg p-2 text-xs font-bold mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Colorway Shade / Block Recipe</label>
                              <input
                                value={metricInputs.colorWay || ''}
                                onChange={e => setMetricInputs({ ...metricInputs, colorWay: e.target.value })}
                                className="w-full border rounded-lg p-2 text-xs font-bold mt-1"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Jet Temp (°C)</label>
                                <input
                                  type="number"
                                  value={metricInputs.temperature || ''}
                                  onChange={e => setMetricInputs({ ...metricInputs, temperature: e.target.value })}
                                  className="w-full border rounded-lg p-2 text-xs font-bold mt-1"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Process pH Value</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={metricInputs.phLevel || ''}
                                  onChange={e => setMetricInputs({ ...metricInputs, phLevel: e.target.value })}
                                  className="w-full border rounded-lg p-2 text-xs font-bold mt-1"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeStageEditId === 'SHRINKAGE_WASTAGE' && (
                        <div className="space-y-3 pt-1">
                          <div className="grid grid-cols-1 gap-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Test Swatch Lg (m)</label>
                                <input
                                  type="number"
                                  value={metricInputs.testPieceMeters || '10'}
                                  onChange={e => setMetricInputs({ ...metricInputs, testPieceMeters: e.target.value })}
                                  className="w-full border rounded-lg p-2 text-xs font-bold mt-1"
                                />
                              </div>
                              <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Shrunk Output Lg (m)</label>
                                <input
                                  type="number"
                                  value={metricInputs.shrunkMeters || ''}
                                  onChange={e => {
                                    const rawShrunk = Number(e.target.value);
                                    const rawTotal = Number(metricInputs.testPieceMeters || 10);
                                    let calcPct = 0;
                                    if (rawTotal > 0 && rawShrunk > 0) {
                                      calcPct = Number(((rawTotal - rawShrunk) / rawTotal * 100).toFixed(1));
                                    }
                                    setMetricInputs({ 
                                      ...metricInputs, 
                                      shrunkMeters: e.target.value,
                                      shrinkPct: String(calcPct) 
                                    });
                                  }}
                                  className="w-full border rounded-lg p-2 text-xs font-bold mt-1"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Measured Shrinkage %</label>
                                <input
                                  type="number"
                                  value={metricInputs.shrinkPct || ''}
                                  readOnly
                                  className="w-full border rounded-lg p-2 text-xs font-bold mt-1 bg-slate-100"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Wastage salvage (m)</label>
                                <input
                                  type="number"
                                  value={metricInputs.wasteSalvageMeters || ''}
                                  onChange={e => setMetricInputs({ ...metricInputs, wasteSalvageMeters: e.target.value })}
                                  className="w-full border rounded-lg p-2 text-xs font-bold mt-1"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeStageEditId === 'CUTTING' && (
                        <div className="space-y-3 pt-1">
                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Garment Panels Cut Pieces Count</label>
                              <input
                                type="number"
                                value={metricInputs.piecesCutCount || ''}
                                onChange={e => setMetricInputs({ ...metricInputs, piecesCutCount: e.target.value })}
                                className="w-full border rounded-lg p-2 text-xs font-bold mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Wastage / Layer scraps (%)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={metricInputs.wastePercentAmt || ''}
                                onChange={e => setMetricInputs({ ...metricInputs, wastePercentAmt: e.target.value })}
                                className="w-full border rounded-lg p-2 text-xs font-bold mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Master Cutting Machine / Operator ID</label>
                              <input
                                value={metricInputs.cuttingMaster || ''}
                                onChange={e => setMetricInputs({ ...metricInputs, cuttingMaster: e.target.value })}
                                className="w-full border rounded-lg p-2 text-xs font-bold mt-1"
                                placeholder="Karim Chacha"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {activeStageEditId === 'STITCHING' && (
                        <div className="space-y-3 pt-1">
                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Assigned Stitching Karigar</label>
                              <input
                                value={metricInputs.assignedTailor || ''}
                                onChange={e => setMetricInputs({ ...metricInputs, assignedTailor: e.target.value })}
                                className="w-full border rounded-lg p-2 text-xs font-bold mt-1"
                                placeholder="Gopal Dev"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Workpiece rate (₹ / Piece Stitching)</label>
                              <input
                                type="number"
                                value={metricInputs.ratePerStitchPiece || ''}
                                onChange={e => setMetricInputs({ ...metricInputs, ratePerStitchPiece: e.target.value })}
                                className="w-full border rounded-lg p-2 text-xs font-bold mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Sewing Machine workstation ID</label>
                              <input
                                value={metricInputs.workstationId || ''}
                                onChange={e => setMetricInputs({ ...metricInputs, workstationId: e.target.value })}
                                className="w-full border rounded-lg p-2 text-xs font-bold mt-1"
                                placeholder="MACH-SINGER-V2"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {activeStageEditId === 'FINISHING_EMBROIDERY' && (
                        <div className="space-y-3 pt-1">
                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Hand-stitch / Embroidery Subcontractor</label>
                              <input
                                value={metricInputs.embroideryVendor || ''}
                                onChange={e => setMetricInputs({ ...metricInputs, embroideryVendor: e.target.value })}
                                className="w-full border rounded-lg p-2 text-xs font-bold mt-1"
                                placeholder="Jaipuri Handlooms Ltd"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Lace Trim / Accessory category</label>
                              <input
                                value={metricInputs.embroideryDetails || ''}
                                onChange={e => setMetricInputs({ ...metricInputs, embroideryDetails: e.target.value })}
                                className="w-full border rounded-lg p-2 text-xs font-bold mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Accessory Cost per unit (₹)</label>
                              <input
                                type="number"
                                value={metricInputs.accessoryCost || ''}
                                onChange={e => setMetricInputs({ ...metricInputs, accessoryCost: e.target.value })}
                                className="w-full border rounded-lg p-2 text-xs font-bold mt-1"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {activeStageEditId === 'QC' && (
                        <div className="space-y-3 pt-1">
                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Spotless Quality Approved Qty</label>
                              <input
                                type="number"
                                value={metricInputs.qcPassedQty || ''}
                                onChange={e => setMetricInputs({ ...metricInputs, qcPassedQty: e.target.value })}
                                className="w-full border rounded-lg p-2 text-xs font-bold mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Minor needle stains / Stitch faults logged</label>
                              <input
                                type="number"
                                value={metricInputs.minorDefects || ''}
                                onChange={e => setMetricInputs({ ...metricInputs, minorDefects: e.target.value })}
                                className="w-full border rounded-lg p-2 text-xs font-bold mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Final Quality Decision</label>
                              <select
                                value={metricInputs.qcStatusResult || 'PASS'}
                                onChange={e => setMetricInputs({ ...metricInputs, qcStatusResult: e.target.value })}
                                className="w-full border rounded-lg p-2 text-xs font-bold mt-1 bg-white"
                              >
                                <option value="PASS">PASS (Approved with Grade Tag)</option>
                                <option value="HOLD">HOLD (Rework required)</option>
                                <option value="REJECTED">REJECTED (Fabric scraps)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeStageEditId === 'PACKING' && (
                        <div className="space-y-3 pt-1">
                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Carton Printing Barcode Box</label>
                              <input
                                value={metricInputs.cartonBarcode || ''}
                                onChange={e => setMetricInputs({ ...metricInputs, cartonBarcode: e.target.value })}
                                className="w-full border rounded-lg p-2 text-xs font-black mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Box packing layout sequence</label>
                              <input
                                value={metricInputs.boxSequenceNumber || ''}
                                onChange={e => setMetricInputs({ ...metricInputs, boxSequenceNumber: e.target.value })}
                                className="w-full border rounded-lg p-2 text-xs font-bold mt-1"
                                placeholder="BOX-A1-100"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Handoff ready to Logistic Queue</label>
                              <select
                                value={metricInputs.isHandoffReady || 'YES'}
                                onChange={e => setMetricInputs({ ...metricInputs, isHandoffReady: e.target.value })}
                                className="w-full border rounded-lg p-2 text-xs font-bold mt-1 bg-white"
                              >
                                <option value="YES">YES (Linked to Dispatch Planner)</option>
                                <option value="NO">NO (Retained in finished dry warehouse)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Manufacturing Audit Trial and complete logs list */}
              <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-4">
                <h4 className="text-sm font-black uppercase text-slate-500 tracking-wider">
                  Complete Progress Logs History (Weaving to Dispatch)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {activeSteps.map(step => {
                    const log = activeBatch.stageLogs[step.id];
                    const activeStateIndex = activeSteps.findIndex(s => s.id === activeBatch.currentStageId);
                    const currentIdx = activeSteps.findIndex(s => s.id === step.id);
                    const isPending = !log && currentIdx >= activeStateIndex;

                    return (
                      <div 
                        key={step.id} 
                        className={`p-3 rounded-xl border text-xs flex flex-col justify-between ${
                          log ? 'border-emerald-250 bg-emerald-50/5' :
                          step.id === activeBatch.currentStageId ? 'border-amber-250 bg-amber-50/5' :
                          'border-slate-100 bg-slate-50/30 opacity-70'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-800">{step.label}</span>
                            <span className={`w-2.5 h-2.5 rounded-full ${log ? 'bg-emerald-500' : step.id === activeBatch.currentStageId ? 'bg-amber-500' : 'bg-slate-300'}`} />
                          </div>
                          
                          {log ? (
                            <div className="space-y-1.5 mt-2">
                              <p className="text-[11px] text-slate-500 italic">"{log.notes || 'No remarks recorded.'}"</p>
                              {log.completedAt && (
                                <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  <span>{log.completedAt} by {log.completedBy}</span>
                                </p>
                              )}
                              {log.metrics && Object.keys(log.metrics).length > 0 && (
                                <div className="bg-black/[0.02] p-1.5 rounded border text-[9px] font-bold tracking-tight text-slate-500 mt-1 flex flex-col gap-0.5">
                                  {Object.entries(log.metrics).map(([k, v]) => (
                                    <div key={k} className="flex justify-between">
                                      <span className="uppercase text-[8px] tracking-wide text-slate-400">{k}:</span>
                                      <span>{v}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-slate-400 italic text-[11px] mt-2">
                              {isPending ? 'Pending stage transition' : 'Incomplete metadata'}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 bg-white border border-dashed rounded-3xl text-slate-400 text-sm">
              <Plus className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="font-bold">No batches initialized.</p>
              <p className="text-xs text-slate-400">Add a manufacturing sequence batch on the left to start tracking real-time fabric lifecycles.</p>
            </div>
          )}
        </div>
      </div>

      {/* Creation Modal */}
      <BaseModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Initialize Apparel Production Batch" size="lg">
        <form onSubmit={handleCreateBatch} className="space-y-6">
          <div className="space-y-2">
            <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded">
              ERPNext Manufacturing Sequence
            </span>
            <p className="text-xs text-slate-400">Initialize a new fabric log. The batch starts automatically in stage 1 (Gray order).</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Manufacturing Batch ID</label>
              <input
                required
                placeholder="e.g. BATCH-RAYON-KRT-103"
                value={newBatchId}
                onChange={e => setNewBatchId(e.target.value)}
                className="w-full text-xs font-bold border rounded-xl p-3 bg-slate-50 outline-none uppercase"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest font-sans">Priority Weight</label>
              <select
                value={newPriority}
                onChange={e => setNewPriority(e.target.value as any)}
                className="w-full text-xs font-bold border rounded-xl p-3 bg-slate-50 outline-none"
              >
                <option value="LOW">Low Weight</option>
                <option value="NORMAL">Normal Standard</option>
                <option value="HIGH">High Priority</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select Design / Pattern</label>
              <select
                required
                value={newDesignName}
                onChange={e => handleDesignChange(e.target.value)}
                className="w-full text-xs font-bold border rounded-xl p-3 bg-slate-50 outline-none cursor-pointer"
              >
                <option value="">Select linked pattern...</option>
                {designs.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                <option value="Summer Print Rayon Kurti (A-Line)">Summer Print Rayon Kurti (A-Line)</option>
                <option value="Ivory Cambric Office Shirt">Ivory Cambric Office Shirt</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Schedular Target (Qty in Pcs)</label>
              <input
                type="number"
                required
                value={newTotalQty}
                onChange={e => setNewTotalQty(Number(e.target.value))}
                className="w-full text-xs font-bold border rounded-xl p-3 bg-slate-50 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Style Number / SKU Code</label>
              <input
                placeholder="KURTI-RAY-102"
                value={newStyleCode}
                onChange={e => setNewStyleCode(e.target.value.toUpperCase())}
                className="w-full text-xs font-bold border rounded-xl p-3 bg-slate-50 outline-none uppercase"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Fabric Composition Base</label>
              <input
                placeholder="e.g. Rayon Liva (140 GSM)"
                value={newFabricType}
                onChange={e => setNewFabricType(e.target.value)}
                className="w-full text-xs font-bold border rounded-xl p-3 bg-slate-50 outline-none"
              />
            </div>
          </div>

          {/* Dynamic Pipeline Preset Selection (ERPNext style) */}
          <div className="space-y-4 bg-slate-50 border rounded-2xl p-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Dynamic Pipeline Routing</span>
                <span className="text-[10px] text-indigo-600 font-bold lowercase">ERPNext Style Routing Template</span>
              </label>
              <p className="text-[10px] text-slate-400 font-medium">
                Choose a routing preset or manually toggle specific stages to customize fabric lifecycle pipeline tracking.
              </p>
            </div>

            {/* Presets Action Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset('FULL')}
                className={`text-[10px] font-bold px-2 py-1.5 rounded-lg border transition-all ${
                  newRoutingPreset === 'FULL'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Full Process Suit (9 steps)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('BASIC_SHIRT')}
                className={`text-[10px] font-bold px-2 py-1.5 rounded-lg border transition-all ${
                  newRoutingPreset === 'BASIC_SHIRT'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Plain Solid Shirt (7 steps)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('KNITWEAR')}
                className={`text-[10px] font-bold px-2 py-1.5 rounded-lg border transition-all ${
                  newRoutingPreset === 'KNITWEAR'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Basic Tee Knit (5 steps)
              </button>
            </div>

            {/* Custom Checkbox Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t border-slate-200">
              {LIFECYCLE_STEPS.map(step => {
                const isChecked = newCustomSteps.includes(step.id);
                return (
                  <label
                    key={step.id}
                    className={`flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer select-none transition-all ${
                      isChecked 
                        ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' 
                        : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                    } text-[10px] font-bold`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setNewRoutingPreset('CUSTOM');
                        if (isChecked) {
                          if (newCustomSteps.length > 2) {
                            setNewCustomSteps(newCustomSteps.filter(id => id !== step.id));
                          } else {
                            alert('A minimum of two active pipeline routing stages are required.');
                          }
                        } else {
                          const updated = [...newCustomSteps, step.id];
                          const ordered = LIFECYCLE_STEPS.filter(s => updated.includes(s.id)).map(s => s.id);
                          setNewCustomSteps(ordered);
                        }
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                    />
                    <span className="truncate">{step.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="flex-1 px-4 py-2.5 rounded-xl border font-bold text-slate-500 hover:bg-slate-50 transition-colors text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2.5 rounded-xl transition-colors text-xs"
            >
              Initialize Production Flow
            </button>
          </div>
        </form>
      </BaseModal>

      {/* QR Code Thermal Label Printing Modal */}
      <BaseModal isOpen={showThermalLabel} onClose={() => setShowThermalLabel(false)} title="Print Thermal Identity Card Label" size="md">
        {printedLabelData && (
          <div className="space-y-6">
            <p className="text-xs text-slate-500">
              The following barcoded label matches the standard format and is ready for thermal output line printing.
            </p>

            <div className="bg-slate-50 border rounded-2xl p-6 font-mono text-xs text-slate-800 space-y-4 max-w-sm mx-auto shadow-sm">
              <div className="border-b border-dashed border-slate-300 pb-3 text-center">
                <p className="font-black text-sm">RAVI-TEXTILE MFG ERP</p>
                <p className="text-[10px] text-slate-400">SMART BATCH SPEC CARD</p>
              </div>

              <div className="space-y-1.5 font-bold">
                <div className="flex justify-between">
                  <span>BATCH ID:</span>
                  <span className="font-black">{printedLabelData.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>DESIGN:</span>
                  <span className="truncate w-36 text-right">{printedLabelData.design}</span>
                </div>
                <div className="flex justify-between">
                  <span>STYLE:</span>
                  <span>{printedLabelData.style}</span>
                </div>
                <div className="flex justify-between">
                  <span>TARGET QTY:</span>
                  <span>{printedLabelData.qty} Pcs</span>
                </div>
                <div className="flex justify-between">
                  <span>FLOW STAGE:</span>
                  <span className="text-indigo-600 font-black">{printedLabelData.stage}</span>
                </div>
                <div className="flex justify-between">
                  <span>DATE LOAD:</span>
                  <span>{printedLabelData.date}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-4 flex flex-col items-center space-y-2">
                {/* Visual Barcode Pattern */}
                <div className="h-10 w-full flex items-center justify-between bg-white px-3 py-1 border">
                  {[...Array(38)].map((_, i) => (
                    <div 
                      key={i} 
                      className="bg-black h-full" 
                      style={{ 
                        width: i % 4 === 0 ? '3px' : i % 3 === 0 ? '1px' : '2px',
                        opacity: i % 7 === 0 ? 0.2 : 1
                      }} 
                    />
                  ))}
                </div>
                <p className="text-[9px] text-slate-400 font-extrabold uppercase">*{printedLabelData.id}*</p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowThermalLabel(false)}
                className="flex-1 py-3 border rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  alert('Command transmitted to Honeywell Thermal printer over local Ethernet portsuccessfully!');
                  setShowThermalLabel(false);
                }}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 rounded-xl text-xs flex justify-center items-center gap-2 shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Transmit Print</span>
              </button>
            </div>
          </div>
        )}
      </BaseModal>

      {/* Dynamic Route Customization Modal for Active Batch */}
      <BaseModal isOpen={showRoutingModal} onClose={() => setShowRoutingModal(false)} title="Customize Pipeline Routing Template" size="lg">
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 rounded-xl text-[11px] font-bold text-amber-900 border border-amber-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p>Dynamic Route Adjustment Caution</p>
              <p className="font-medium text-slate-500">
                Altering live stage templates will immediately update the shop floor dashboard progress tracker and milestones configuration for batch <strong>{editingBatchRoutingId}</strong>.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Select Active Routing Stages</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LIFECYCLE_STEPS.map(step => {
                const isChecked = selectedRoutingSteps.includes(step.id);
                return (
                  <label
                    key={step.id}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                      isChecked 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-900' 
                        : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                    } text-xs font-bold`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (isChecked) {
                          if (selectedRoutingSteps.length > 2) {
                            setSelectedRoutingSteps(selectedRoutingSteps.filter(id => id !== step.id));
                          } else {
                            alert('A minimum of two active pipeline routing stages are required.');
                          }
                        } else {
                          const updated = [...selectedRoutingSteps, step.id];
                          const ordered = LIFECYCLE_STEPS.filter(s => updated.includes(s.id)).map(s => s.id);
                          setSelectedRoutingSteps(ordered);
                        }
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>{step.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              onClick={() => setShowRoutingModal(false)}
              className="flex-1 px-4 py-2 text-xs font-bold border rounded-xl text-slate-500 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // Save customized steps to active batch
                const updatedBatches = batches.map(b => {
                  if (b.id === editingBatchRoutingId) {
                    // Adjust currentStageId if the current stage was removed
                    let targetStageId = b.currentStageId;
                    if (!selectedRoutingSteps.includes(targetStageId)) {
                      targetStageId = selectedRoutingSteps[0] || 'GRAY_ORDER';
                    }
                    return {
                      ...b,
                      customSteps: selectedRoutingSteps,
                      currentStageId: targetStageId
                    };
                  }
                  return b;
                });
                setBatches(updatedBatches);
                setShowRoutingModal(false);
                setBannerMsg(`Pipeline routing layout for Batch ${editingBatchRoutingId} updated successfully.`);
                setTimeout(() => setBannerMsg(null), 4000);
              }}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2 rounded-xl"
            >
              Apply Customized Route
            </button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
};
