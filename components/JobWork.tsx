import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Search, Settings, ShieldCheck, AlertTriangle, 
  Wrench, Activity, Sparkles, User, Calendar, Trash2, 
  RotateCw, Play, Circle, Cpu, DollarSign, Gauge, Clock, CheckCircle2,
  List, LayoutGrid, Printer, ArrowRight, FileText, Check, X, Shield, 
  RefreshCw, Send, Bookmark, Award, Building, Compass, Layers, Table, Info, BookOpen,
  ArrowUpRight, ArrowDownLeft, Receipt, BadgeCheck, FileCheck, HelpCircle, Eye
} from 'lucide-react';
import { JobWork, JobWorkItem, JobWorkSuppliedItem, Design, InventoryItem, Unit } from '../types';
import BaseModal from './BaseModal';
import ProductImageThumb, { resolveProductImage } from './ProductImageThumb';

interface JobWorkProps {
  jobs: JobWork[];
  designs?: Design[];
  inventory?: InventoryItem[];
  onAdd: (job: JobWork) => void;
  onUpdate?: (job: JobWork) => void; 
  onDelete?: (id: string | any) => void;
  onAction?: (action: string, data: any) => void;
  currency?: string;
}

const PROCESS_NODES = [
  { id: 'DYEING', label: 'Dyeing & Bleach', icon: ShieldCheck, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/30' },
  { id: 'PRINTING', label: 'Rotary/Digital/Block', icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30' },
  { id: 'EMBROIDERY', label: 'Schiffli & Handwork', icon: Award, color: 'text-pink-600', bg: 'bg-pink-50 border-pink-100 dark:bg-pink-950/20 dark:border-pink-900/30' },
  { id: 'HANDWORK', label: 'Bead & Zardosi', icon: Compass, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30' },
  { id: 'WASHING', label: 'Dry Cleaning/Washing', icon: RotateCw, color: 'text-cyan-600', bg: 'bg-cyan-50 border-cyan-100 dark:bg-cyan-950/20 dark:border-cyan-900/30' },
  { id: 'CUTTING', label: 'Cutting & Sizing', icon: Table, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100 dark:bg-orange-950/20 dark:border-orange-900/30' },
  { id: 'STITCHING', label: 'Stitching Unit', icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30' },
  { id: 'FINISHING', label: 'Finishing & Press', icon: FileCheck, color: 'text-emerald-300', bg: 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20' },
  { id: 'PACKING', label: 'Boxing & Tagging', icon: Layers, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100 dark:bg-purple-950/20 dark:border-purple-900/30' }
];

export default function JobWorkComp({ 
  jobs = [], designs = [], inventory = [], onAdd, onUpdate, onDelete, onAction, currency = '₹' 
}: JobWorkProps) {
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedProcess, setSelectedProcess] = useState('ALL');
  const [viewMode, setViewMode] = useState<'LIST' | 'GRID'>('LIST');
  const [filterQuery, setFilterQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Print Format simulation
  const [isPrintView, setIsPrintView] = useState(false);
  const [printChallanData, setPrintChallanData] = useState<any>(null);

  // Advanced ERPNext connection simulation states
  const [showStockEntrySim, setShowStockEntrySim] = useState(false);
  const [showInwardSim, setShowInwardSim] = useState(false);

  // ERPNext Form Sheet State
  const [formData, setFormData] = useState<Partial<JobWork> & { 
    sourceWarehouse?: string; 
    targetWarehouse?: string; 
    styleCode?: string; 
    fabricLot?: string;
    isSubmitted?: boolean;
    additionalCost?: number;
    subcontractorNotes?: string;
  }>({
    process: 'STITCHING',
    status: 'DRAFT',
    items: [],
    suppliedItems: [],
    paymentStatus: 'UNPAID',
    issueDate: new Date().toISOString().split('T')[0],
    expectedDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    sourceWarehouse: 'Godown Warehouse A',
    targetWarehouse: 'Finished Goods Inward Godown',
    isSubmitted: false,
    additionalCost: 0,
    subcontractorNotes: '',
    styleCode: '',
    fabricLot: ''
  });

  // Inline table fields inputs
  const [itemInput, setItemInput] = useState<Partial<JobWorkItem>>({ 
    description: '', 
    issuedQuantity: 100, 
    receivedQuantity: 0, 
    rate: 120, 
    unit: 'Meter' 
  });
  
  const [suppliedItemInput, setSuppliedItemInput] = useState<Partial<JobWorkSuppliedItem>>({ 
    productName: '', 
    quantity: 150, 
    unit: 'Meter' 
  });

  // Auto show a brief toast
  const triggerToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ERPNext statistics mock calculations
  const stats = useMemo(() => {
    const totalCount = jobs.length;
    const pendingQty = jobs.reduce((s, j) => {
      if (j.status === 'ISSUED' || j.status === 'IN_PROGRESS' || j.status === 'DRAFT') {
        return s + j.items.reduce((sum, item) => sum + (item.issuedQuantity - item.receivedQuantity), 0);
      }
      return s;
    }, 0);

    const supplierFabricStock = jobs.reduce((sum, j) => {
      if (j.status !== 'COMPLETED' && j.status !== 'CANCELLED') {
        const supplied = j.suppliedItems?.reduce((subSum, item) => subSum + item.quantity, 0) || 0;
        return sum + supplied;
      }
      return sum;
    }, 0);

    const completedJobs = jobs.filter(j => j.status === 'COMPLETED' && j.items.length > 0);
    const totalYieldPercentage = (() => {
      if (completedJobs.length === 0) return 98.4; // standard fallback typical for mills
      const sumYield = completedJobs.reduce((acc, j) => {
        const issued = j.items.reduce((s, i) => s + i.issuedQuantity, 0);
        const recv = j.items.reduce((s, l) => s + l.receivedQuantity, 0);
        return acc + (issued > 0 ? (recv / issued) * 100 : 100);
      }, 0);
      return Math.round((sumYield / completedJobs.length) * 10) / 10;
    })();

    return {
      totalCount,
      pendingQty,
      supplierFabricStock,
      totalYieldPercentage
    };
  }, [jobs]);

  // ERPNext filter query matcher
  const filteredJobs = useMemo(() => {
    const searchLower = (filterQuery || '').toLowerCase();
    return (jobs || []).filter(j => {
      const challan = (j.challanNumber || '').toLowerCase();
      const vendorName = (j.vendorName || '').toLowerCase();
      const processName = (j.process || '').toLowerCase();
      
      const searchMatch = challan.includes(searchLower) || vendorName.includes(searchLower) || processName.includes(searchLower);
      const tabMatch = activeTab === 'ALL' || j.status === activeTab;
      const processMatch = selectedProcess === 'ALL' || j.process === selectedProcess;

      return searchMatch && tabMatch && processMatch;
    });
  }, [jobs, filterQuery, activeTab, selectedProcess]);

  // Handle adding direct Expected Finished Goods items to matrix 
  const handleAddItem = () => {
    if (!itemInput.description) {
      triggerToast("Please provide a finished item description", 'error');
      return;
    }
    const rateVal = Number(itemInput.rate) || 0;
    const qtyVal = Number(itemInput.issuedQuantity) || 0;
    const designObj = designs.find(d => d.name === itemInput.description);

    const newItemObj: JobWorkItem = {
      description: itemInput.description,
      issuedQuantity: qtyVal,
      receivedQuantity: 0,
      quantity: qtyVal,
      rate: rateVal,
      unit: itemInput.unit || 'Meter',
      wastagePercent: 0,
      rejectedQuantity: 0,
      receiptHistory: []
    };

    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), newItemObj]
    }));

    // Auto load BOM option toast trigger
    if (designObj?.recipe && designObj.recipe.length > 0) {
      triggerToast(`BOM available for "${itemInput.description}". Click "Load Design BOM" to pull materials!`, 'info');
    }

    setItemInput({ description: '', issuedQuantity: 100, receivedQuantity: 0, rate: 120, unit: 'Meter' });
  };

  const handleRemoveItem = (idx: number) => {
    const updated = [...(formData.items || [])];
    updated.splice(idx, 1);
    setFormData({ ...formData, items: updated });
  };

  // Pull Design's real BOM and multiply by expects Finished Quantity
  const handleLoadBOMRecipeForItems = () => {
    if (!formData.items || formData.items.length === 0) {
      triggerToast("No items listed in Expected Goods. Please add finished items first.", 'error');
      return;
    }

    let rawMaterialsCount = 0;
    const consolidatedBOM: Record<string, { name: string; qty: number; unit: string }> = {};

    formData.items.forEach(item => {
      const design = designs.find(d => d.name === item.description);
      const expectedCount = item.issuedQuantity || 0;

      if (design && design.recipe && design.recipe.length > 0) {
        design.recipe.forEach(r => {
          if (!consolidatedBOM[r.materialName]) {
            consolidatedBOM[r.materialName] = {
              name: r.materialName,
              qty: 0,
              unit: typeof r.unit === 'string' ? r.unit : 'Meter'
            };
          }
          consolidatedBOM[r.materialName].qty += (r.quantity * expectedCount);
          rawMaterialsCount++;
        });
      } else {
        // Fallback robust default fabric estimation
        const genericFabric = `${item.description} Raw Base-Liva`;
        if (!consolidatedBOM[genericFabric]) {
          consolidatedBOM[genericFabric] = {
            name: genericFabric,
            qty: 0,
            unit: 'Meter'
          };
        }
        consolidatedBOM[genericFabric].qty += (1.85 * expectedCount);
        rawMaterialsCount++;
      }
    });

    const parsedMaterialList: JobWorkSuppliedItem[] = Object.values(consolidatedBOM).map(m => ({
      productName: m.name,
      quantity: Math.round(m.qty * 100) / 100,
      unit: m.unit,
      consumedQuantity: 0
    }));

    setFormData(prev => ({
      ...prev,
      suppliedItems: [...(prev.suppliedItems || []), ...parsedMaterialList]
    }));

    triggerToast(`Pulled Design Recipe! Scaled & loaded ${rawMaterialsCount} unique raw material lines.`, 'success');
  };

  // Add manually supplied materials
  const handleAddSuppliedItem = () => {
    if (!suppliedItemInput.productName || !suppliedItemInput.quantity) {
      triggerToast("Supplier Material name or Qty missing", 'error');
      return;
    }

    const newItem: JobWorkSuppliedItem = {
      productName: suppliedItemInput.productName,
      quantity: Number(suppliedItemInput.quantity),
      unit: suppliedItemInput.unit || 'Meter',
      consumedQuantity: 0
    };

    setFormData(prev => ({
      ...prev,
      suppliedItems: [...(prev.suppliedItems || []), newItem]
    }));

    setSuppliedItemInput({ productName: '', quantity: 150, unit: 'Meter' });
    triggerToast("Materials added to dispatcher ledger", 'success');
  };

  const handleRemoveSuppliedItem = (idx: number) => {
    const updated = [...(formData.suppliedItems || [])];
    updated.splice(idx, 1);
    setFormData({ ...formData, suppliedItems: updated });
  };

  // Lock Document & Change Status to ISSUED like ERPNext Submit
  const handleDocSubmit = () => {
    if (!formData.vendorName || !formData.items?.length) {
      triggerToast("Missing Supplier Partner or Expected Items list", 'error');
      return;
    }

    const compiledItems = (formData.items || []).map(i => ({ ...i, quantity: i.issuedQuantity }));
    const totalCost = compiledItems.reduce((acc, i) => acc + (i.quantity * i.rate), 0) + (Number(formData.additionalCost) || 0);

    const doc: JobWork = {
      id: editingId || `JW-${Date.now()}`,
      challanNumber: formData.challanNumber || `SUB-ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      vendorName: formData.vendorName,
      process: formData.process || 'STITCHING',
      issueDate: formData.issueDate || new Date().toISOString().split('T')[0],
      expectedDate: formData.expectedDate || new Date(Date.now() + 10 * 864 * 100000).toISOString().split('T')[0],
      status: 'ISSUED', // Submitted order shifts to Issued / transit
      items: compiledItems,
      suppliedItems: formData.suppliedItems || [],
      totalCost,
      paymentStatus: formData.paymentStatus || 'UNPAID',
      sourceWorkOrderId: formData.sourceWorkOrderId || '',
      sourceOperationId: formData.sourceOperationId || '',
      styleCode: formData.styleCode || '',
      color: formData.color || '',
      fabricLot: formData.fabricLot || '',
      updatedAt: new Date().toISOString()
    };

    if (editingId) {
      onUpdate?.(doc);
      triggerToast("Recon Document SUBMITTED & locked! Record stored.", "success");
    } else {
      onAdd(doc);
      triggerToast("ERP Subcontracting Order SUBMITTED successfully!", "success");
    }

    setFormData({ ...formData, status: 'ISSUED', isSubmitted: true });
    setIsModalOpen(false);
  };

  // Standard interactive Save draft option (ERPNext Draft state)
  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendorName) {
      triggerToast("Please provide a Supplier Partner Name first", 'error');
      return;
    }

    const compiledItems = (formData.items || []).map(i => ({ ...i, quantity: i.issuedQuantity }));
    const totalCost = compiledItems.reduce((acc, i) => acc + (i.issuedQuantity * i.rate), 0) + (Number(formData.additionalCost) || 0);

    const doc: JobWork = {
      id: editingId || `JW-${Date.now()}`,
      challanNumber: formData.challanNumber || `SUB-DRAFT-${Math.floor(1000 + Math.random() * 9000)}`,
      vendorName: formData.vendorName,
      process: formData.process || 'STITCHING',
      issueDate: formData.issueDate || new Date().toISOString().split('T')[0],
      expectedDate: formData.expectedDate || new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: formData.status || 'DRAFT',
      items: compiledItems,
      suppliedItems: formData.suppliedItems || [],
      totalCost,
      paymentStatus: formData.paymentStatus || 'UNPAID',
      sourceWorkOrderId: formData.sourceWorkOrderId || '',
      sourceOperationId: formData.sourceOperationId || '',
      styleCode: formData.styleCode || '',
      color: formData.color || '',
      fabricLot: formData.fabricLot || '',
      updatedAt: new Date().toISOString()
    };

    if (editingId) {
      onUpdate?.(doc);
      triggerToast("Draft successfully persistent updated!", "success");
    } else {
      onAdd(doc);
      triggerToast("Subcontract order draft saved! Status: DRAFT", "success");
    }
    
    setIsModalOpen(false);
  };

  // Simulates ERPNext Stock Entry (Material Issues)
  const handleProcessStockTransferSim = () => {
    setFormData(prev => ({
      ...prev,
      subcontractorNotes: `${prev.subcontractorNotes || ''}\n[ERPNext System Alert] *Stock Entry Material Transfer completed. Raw materials debited from transit storage and released to Subcontractor Godown under ${new Date().toLocaleDateString()}*.`
    }));
    setShowStockEntrySim(false);
    triggerToast("Stock Entry submitted! Materials Transfer register logged.", 'success');
  };

  // Simulates ERPNext Quality Purchase Receipt 
  const handleProcessReceiptSim = (accepted: Record<number, number>, rejected: Record<number, number>) => {
    const updatedItems = (formData.items || []).map((item, idx) => {
      const acceptVal = accepted[idx] ?? item.issuedQuantity;
      const rejectVal = rejected[idx] ?? 0;
      return {
        ...item,
        receivedQuantity: acceptVal,
        rejectedQuantity: rejectVal,
        wastagePercent: Math.round(((item.issuedQuantity - acceptVal) / item.issuedQuantity) * 100)
      };
    });

    const calculatedYield = updatedItems.reduce((acc, i) => acc + i.receivedQuantity, 0);
    const updatedStatus = 'COMPLETED';

    const updatedDoc: JobWork = {
      ...(formData as JobWork),
      items: updatedItems,
      status: updatedStatus,
      updatedAt: new Date().toISOString()
    };

    onUpdate?.(updatedDoc);
    setFormData(prev => ({
      ...prev,
      items: updatedItems,
      status: updatedStatus,
      subcontractorNotes: `${prev.subcontractorNotes || ''}\n[Receipt Portal Log] *Quality inward verified, accepted: ${calculatedYield} finished garments into Main Warehouse storage. Yield variance committed.*`
    }));

    setShowInwardSim(false);
    setIsModalOpen(false);
    triggerToast(`Successfully inward receipt compiled! Finished stock loaded.`, 'success');
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] dark:bg-slate-950 -m-8 p-8 space-y-6">
      
      {/* Dynamic System Alert Indicator */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[999] px-6 py-3.5 rounded-xl border text-xs shadow-2xl font-black tracking-tight flex items-center gap-3 transition-all ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
          toast.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-300' :
          'bg-indigo-50 text-indigo-800 border-indigo-300'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 animate-bounce" /> : <Info className="w-5 h-5 text-indigo-600 animate-pulse" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Breadcrumbs & ERP Action Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#e2e8f0] pb-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Production</span>
            <span>/</span>
            <span>Subcontracting</span>
            <span>/</span>
            <span className="text-slate-600">Subcontract Orders</span>
          </div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white mt-1 select-none flex items-center gap-2">
            <Building className="w-5 h-5 text-[#1b6bf9]" />
            Subcontracting Orders
            <span className="text-[10px] bg-[#e2e8f0] text-slate-600 px-2 py-0.5 rounded-full font-extrabold uppercase font-mono">ERPNext Dashboard</span>
          </h1>
        </div>
        
        {/* Bulk Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button 
            type="button"
            className="px-3.5 py-1.5 border border-[#d1d8dd] hover:bg-slate-100 text-slate-700 bg-white dark:bg-slate-900 text-xs font-bold rounded shadow-sm transition-all focus:outline-none flex items-center gap-1.5"
            onClick={() => {
              triggerToast("System records synced with Local Godowns", 'info');
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Ledger</span>
          </button>
          
          <button 
            type="button" 
            onClick={() => {
              setEditingId(null);
              setFormData({ 
                process: 'STITCHING', status: 'DRAFT', items: [], suppliedItems: [], paymentStatus: 'UNPAID',
                issueDate: new Date().toISOString().split('T')[0],
                expectedDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                sourceWarehouse: 'Transit Godown Yard 1',
                targetWarehouse: 'Finished Goods Main Warehouse',
                isSubmitted: false, additionalCost: 0, subcontractorNotes: '', styleCode: '', fabricLot: ''
              });
              setIsPrintView(false);
              setIsModalOpen(true);
            }} 
            className="bg-[#1b6bf9] hover:bg-[#1456d1] text-white px-5 py-2 text-xs font-extrabold rounded shadow-md hover:shadow-lg transition-all flex items-center gap-2 tracking-wide"
          >
            <Plus className="w-4 h-4" />
            <span>Create Subcontract Order</span>
          </button>
        </div>
      </div>

      {/* ERPNext Bento Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Subcontract Operations', value: `${stats.totalCount} Orders`, sub: 'All registered vendor routings', icon: Layers, c: 'text-[#1b6bf9]' },
          { label: 'Pending Processing Vol', value: `${stats.pendingQty} Pcs`, sub: 'Material in supplier pipeline', icon: Gauge, c: 'text-amber-500' },
          { label: 'Consigned Supplier Assets', value: `${stats.supplierFabricStock} Meters`, sub: 'Raw fabrics & raw yarn issued', icon: FileText, c: 'text-indigo-500' },
          { label: 'Material Reconciliation Yield', value: `${stats.totalYieldPercentage}%`, sub: 'Average vendor dispatch yield', icon: CheckCircle2, c: 'text-emerald-500' }
        ].map((card, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-4 border border-[#e2e8f0] dark:border-slate-800 rounded shadow-sm hover:shadow-md transition-all flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">{card.label}</span>
              <p className="text-xl font-black text-slate-800 dark:text-white tracking-tight leading-none pt-0.5">{card.value}</p>
              <p className="text-[9px] font-bold text-slate-400 pt-0.5">{card.sub}</p>
            </div>
            <div className={`p-3 rounded bg-slate-50 dark:bg-slate-950 px-3.5 ${card.c}`}>
              <card.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Main ERP Workspace: Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 items-start flex-1 min-h-0">
        
        {/* Left Side Quick Filter Sidebar */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-[#e2e8f0] dark:border-slate-800 rounded p-4 shadow-sm space-y-4">
            <div className="flex items-center gap-1 text-xs font-black uppercase text-slate-500 tracking-wider">
              <Compass className="w-4 h-4 text-[#1b6bf9]" />
              <span>Frappe Navigator</span>
            </div>
            
            {/* Filter by Status Groups */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block px-1.5">Document Status</span>
              {[
                { id: 'ALL', label: 'All Jobs' },
                { id: 'DRAFT', label: 'Drafts' },
                { id: 'ISSUED', label: 'Submitted/Issued' },
                { id: 'IN_PROGRESS', label: 'In Progress' },
                { id: 'COMPLETED', label: 'Completed' },
                { id: 'CANCELLED', label: 'Cancelled' }
              ].map(statusObj => {
                const count = statusObj.id === 'ALL' ? jobs.length : jobs.filter(j => j.status === statusObj.id).length;
                const isActive = activeTab === statusObj.id;
                
                return (
                  <button
                    key={statusObj.id}
                    onClick={() => setActiveTab(statusObj.id)}
                    className={`w-full text-left text-xs font-extrabold px-2.5 py-1.5 rounded transition-all flex justify-between items-center ${
                      isActive ? 'bg-indigo-50 dark:bg-indigo-950 text-[#1b6bf9]' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{statusObj.label}</span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${isActive ? 'bg-indigo-200/50' : 'bg-slate-100 dark:bg-slate-950'}`}>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Filter by Routing Processes */}
            <div className="space-y-1.5 pt-3 border-t border-[#e2e8f0] dark:border-slate-800">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block px-1.5">Routing Filter</span>
              <select
                value={selectedProcess}
                onChange={e => setSelectedProcess(e.target.value)}
                className="w-full text-xs font-bold border border-[#d1d8dd] rounded p-2 bg-slate-50 dark:bg-slate-900 outline-none text-slate-700 dark:text-slate-300"
              >
                <option value="ALL">All Operations</option>
                <option value="DYEING">Dyeing & Bleach</option>
                <option value="PRINTING">Fabric Printing</option>
                <option value="EMBROIDERY">Schiffli Embroidery</option>
                <option value="STITCHING">Stitching Unit</option>
                <option value="FINISHING">Finishing Press</option>
                <option value="PACKING">Carton Packing</option>
              </select>
            </div>
          </div>

          {/* Supplier Assets Balance Ledger Small Widget */}
          <div className="bg-[#1b6bf9]/5 border border-[#1b6bf9]/20 rounded p-4 space-y-3 shadow-inner">
            <h4 className="text-[10px] font-black text-[#1b6bf9] uppercase tracking-wider flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 animate-pulse" />
              Supplier Storage Audits
            </h4>
            <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
              External sub-contract partners currently hold security materials valued at approx:
            </p>
            <div className="text-lg font-black text-slate-800 dark:text-indigo-400 tabular-nums">
              {currency}{(stats.supplierFabricStock * 72).toLocaleString()}
            </div>
            <span className="text-[9px] bg-indigo-100 dark:bg-indigo-950/40 text-[#1b6bf9] p-1 px-2 rounded-full font-bold select-none">
              Physical Godown Locked
            </span>
          </div>
        </div>

        {/* Right Side ERP List View Grid Table */}
        <div className="bg-white dark:bg-slate-900 border border-[#e2e8f0] dark:border-slate-800 rounded shadow-sm flex flex-col overflow-hidden">
          
          {/* Quick Search & Sort Bar matches Frappe Filter Panel */}
          <div className="p-3 border-b border-[#e2e8f0] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                placeholder="Search Challans (e.G. CH-42), Supplier, Process..."
                className="w-full text-xs pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-[#d1d8dd] rounded focus:outline-none focus:border-[#1b6bf9] font-bold text-slate-700 dark:text-slate-300"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:inline">Arrangement:</span>
              <div className="flex bg-slate-100 dark:bg-slate-950 p-0.5 rounded border border-[#d1d8dd]">
                <button 
                  onClick={() => setViewMode('LIST')} 
                  className={`p-1 px-2.5 text-xs font-black rounded transition-all flex items-center gap-1 ${viewMode === 'LIST' ? 'bg-white dark:bg-slate-700 text-[#1b6bf9] shadow-sm' : 'text-slate-400'}`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>List</span>
                </button>
                <button 
                  onClick={() => setViewMode('GRID')} 
                  className={`p-1 px-2.5 text-xs font-black rounded transition-all flex items-center gap-1 ${viewMode === 'GRID' ? 'bg-white dark:bg-slate-700 text-[#1b6bf9] shadow-sm' : 'text-slate-400'}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Card</span>
                </button>
              </div>
            </div>
          </div>

          {/* Core Table View */}
          <div className="overflow-x-auto">
            {filteredJobs.length === 0 ? (
              <div className="text-center py-16 text-slate-400 font-bold text-xs space-y-2">
                <BookOpen className="w-8 h-8 mx-auto text-slate-300 animate-pulse" />
                <p>No subcontracting orders located matching options.</p>
                <button 
                  onClick={() => { setSelectedProcess('ALL'); setActiveTab('ALL'); setFilterQuery(''); }} 
                  className="text-[#1b6bf9] hover:underline"
                >
                  Clear search filters
                </button>
              </div>
            ) : viewMode === 'LIST' ? (
              <table className="w-full text-left text-xs border-collapse font-sans select-text">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-[#e2e8f0] dark:border-slate-800 text-slate-500 font-bold tracking-wider uppercase text-[9px]">
                  <tr>
                    <th className="p-3 w-10 text-center">Process</th>
                    <th className="p-3 w-40">Series ID / Challan</th>
                    <th className="p-3">Consignee Supplier</th>
                    <th className="p-3">Process Service</th>
                    <th className="p-3 text-center">Inward Yield Progress</th>
                    <th className="p-3 text-right">Job cost</th>
                    <th className="p-3 text-center w-36">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0] dark:divide-slate-800">
                  {filteredJobs.map(job => {
                    const totalIssued = job.items?.reduce((s, i) => s + i.issuedQuantity, 0) || 0;
                    const totalReceived = job.items?.reduce((s, i) => s + i.receivedQuantity, 0) || 0;
                    const yieldRatio = totalIssued > 0 ? (totalReceived / totalIssued) * 100 : 0;
                    const isOverdue = new Date(job.expectedDate) < new Date() && job.status !== 'COMPLETED';
                    const processConf = PROCESS_NODES.find(n => n.id === job.process) || PROCESS_NODES[0];

                    return (
                      <tr 
                        key={job.id} 
                        onClick={() => {
                          setEditingId(job.id);
                          setFormData({
                            ...job,
                            isSubmitted: job.status !== 'DRAFT',
                            sourceWarehouse: (job as any).sourceWarehouse || 'Transit Store Godown B',
                            targetWarehouse: (job as any).targetWarehouse || 'Finished Goods Main Depot',
                            additionalCost: (job as any).additionalCost || 0,
                            subcontractorNotes: (job as any).subcontractorNotes || ''
                          });
                          setIsPrintView(false);
                          setIsModalOpen(true);
                        }} 
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-all cursor-pointer group h-12"
                      >
                        <td className="p-3 text-center">
                          <div className={`w-8 h-8 mx-auto rounded flex items-center justify-center border ${processConf.bg}`}>
                            <processConf.icon className={`w-4 h-4 ${processConf.color}`} />
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-mono font-semibold text-slate-800 dark:text-white uppercase leading-none">
                            {job.challanNumber || job.id}
                          </div>
                          <span className="text-[9px] text-slate-400 font-bold block mt-1 uppercase">Issued: {job.issueDate}</span>
                        </td>
                        <td className="p-3">
                          <div className="font-extrabold text-slate-700 dark:text-slate-300 uppercase truncate max-w-[170px]">
                            {job.vendorName}
                          </div>
                          {job.styleCode && (
                            <span className="text-[9px] text-[#1b6bf9] font-black block mt-1 uppercase">Lot: {job.fabricLot || 'N/A'} • Style: {job.styleCode}</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 border bg-slate-50 dark:bg-slate-800 px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase text-slate-600 dark:text-slate-300">
                            {job.process}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="max-w-[140px] mx-auto flex flex-col items-center gap-1">
                            <span className={`text-[10px] font-black leading-none ${yieldRatio === 0 ? 'text-slate-400' : yieldRatio < 95 ? 'text-rose-500' : 'text-emerald-600'}`}>
                              {totalReceived} / {totalIssued} Pcs ({yieldRatio.toFixed(0)}%)
                            </span>
                            <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-0.5">
                              <div 
                                className={`h-full ${yieldRatio < 95 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                style={{ width: `${Math.min(100, yieldRatio)}%` }} 
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-right font-black text-slate-700 dark:text-slate-300 tabular-nums">
                          {currency}{job.totalCost.toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {job.status === 'COMPLETED' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] rounded font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-250">
                                <span className="w-1 h-1 bg-emerald-500 rounded-full" />
                                Completed
                              </span>
                            ) : job.status === 'ISSUED' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] rounded font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-250">
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                                Transferred
                              </span>
                            ) : job.status === 'DRAFT' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] rounded font-black uppercase text-slate-500 bg-slate-50 border border-slate-300">
                                <span className="w-1 h-1 bg-slate-400 rounded-full" />
                                Draft
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] rounded font-black uppercase text-amber-700 bg-amber-50 border border-amber-200">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                                Processing
                              </span>
                            )}

                            {isOverdue && (
                              <span className="text-[8px] bg-rose-500 text-white font-extrabold px-1 rounded block uppercase shrink-0 animate-pulse">OVERDUE</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 p-5">
                {filteredJobs.map(job => {
                  const totalIssued = job.items?.reduce((s, i) => s + i.issuedQuantity, 0) || 0;
                  const totalReceived = job.items?.reduce((s, i) => s + i.receivedQuantity, 0) || 0;
                  const yieldRatio = totalIssued > 0 ? (totalReceived / totalIssued) * 100 : 0;
                  const firstDesc = job.items?.[0]?.description || '';
                  const imageUrl = resolveProductImage(firstDesc, designs, inventory);

                  return (
                    <div 
                      key={job.id} 
                      onClick={() => {
                        setEditingId(job.id);
                        setFormData({
                          ...job,
                          isSubmitted: job.status !== 'DRAFT',
                          sourceWarehouse: (job as any).sourceWarehouse || 'Transit Store Godown B',
                          targetWarehouse: (job as any).targetWarehouse || 'Finished Goods Main Depot',
                          additionalCost: (job as any).additionalCost || 0,
                          subcontractorNotes: (job as any).subcontractorNotes || ''
                        });
                        setIsPrintView(false);
                        setIsModalOpen(true);
                      }}
                      className="bg-white dark:bg-slate-900 border border-[#e2e8f0] dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-4 h-[250px]"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[9px] font-black text-[#1b6bf9] uppercase tracking-wider block font-mono">
                            {job.challanNumber || job.id}
                          </span>
                          <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase truncate max-w-[140px] mt-0.5">
                            {job.vendorName}
                          </h3>
                        </div>
                        <span className="text-[9px] bg-slate-50 border uppercase font-mono px-2 py-0.5 rounded text-slate-600 font-extrabold shrink-0">
                          {job.process}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                          {imageUrl ? (
                            <img src={imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Compass className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-[10px] text-slate-400 font-bold truncate">Item: {firstDesc || 'No expect items'}</p>
                          <div className="flex items-center justify-between text-[11px] font-black text-slate-600">
                            <span>Yield Accepted Ratio</span>
                            <span className={yieldRatio < 95 ? 'text-amber-500' : 'text-emerald-500'}>{yieldRatio.toFixed(0)}%</span>
                          </div>
                          <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600" style={{ width: `${yieldRatio}%` }} />
                          </div>
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-end text-[10px]">
                        <div>
                          <span className="text-[8px] text-slate-400 font-bold uppercase block">Posting Date</span>
                          <span className="font-bold text-slate-600">{job.issueDate}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] text-slate-400 font-bold uppercase block">Total Cost</span>
                          <span className="font-black text-slate-800 dark:text-white text-xs">{currency}{job.totalCost.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* High-Fidelity ERPNext Subcontracting Work Order Detail Modal */}
      <BaseModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={isPrintView ? "Subcontract Challan Print Preview" : editingId ? `Reconciliation Subcontract Order: ${formData.challanNumber || formData.id}` : "Create Subcontracting Order"}
        size="2xl"
      >
        {isPrintView ? (
          /* MOCK Print Template Renderer View resembling gatepass invoice */
          <div className="space-y-6">
            <div className="flex justify-end gap-2 shrink-0 border-b pb-4 mb-4">
              <button 
                type="button" 
                onClick={() => window.print()} 
                className="px-4 py-2 bg-[#1b6bf9] hover:bg-[#1456d1] text-white text-xs font-bold rounded flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Trigger System Print</span>
              </button>
              <button 
                type="button" 
                onClick={() => setIsPrintView(false)} 
                className="px-4 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold rounded"
              >
                Return to Editor
              </button>
            </div>

            <div className="p-8 border-4 border-double border-slate-300 bg-white text-slate-800 max-w-3xl mx-auto rounded-lg shadow-inner leading-relaxed family-sans select-all">
              {/* Header Letterhead */}
              <div className="text-center space-y-1.5 border-b-2 border-slate-900 pb-4">
                <h2 className="text-xl font-black uppercase tracking-widest text-[#1b6bf9]">TEXFLOW INTEGRATED APPARELS MILLS</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Surat Industrial Sector B, Block 4-7, Gujarat • GSTIN: 24AAECT3211C1ZX</p>
                <p className="text-[11px] font-mono text-slate-600 bg-slate-50 p-1 rounded inline-block">Gatepass Subcontract challan: {formData.challanNumber}</p>
              </div>

              {/* Multi-column grid */}
              <div className="grid grid-cols-2 gap-6 pt-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Consignment Vendor Partner</span>
                  <p className="font-extrabold text-slate-900 text-sm uppercase">{formData.vendorName}</p>
                  <p className="text-slate-500">Service Process: <span className="font-bold text-slate-800 uppercase">{formData.process}</span></p>
                  {formData.styleCode && <p className="text-slate-500">Assigned Style Pattern: <span className="font-bold">{formData.styleCode}</span></p>}
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Subcontract Log dates</span>
                  <p className="font-bold">Dispatch Posting Date: {formData.issueDate}</p>
                  <p className="font-bold text-indigo-600">Expected Delivery Date: {formData.expectedDate}</p>
                  <p className="text-slate-500">Dispatch Godown Lot: <span className="font-mono font-bold text-slate-800">{formData.fabricLot || 'LOT-2026-A'}</span></p>
                </div>
              </div>

              {/* Items tables */}
              <div className="pt-6 space-y-4">
                <h4 className="text-[10px] font-black tracking-widest uppercase border-b pb-1">1. Finished Products Expected</h4>
                <table className="w-full text-xs text-left border">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="p-2">Garment SKU Pattern</th>
                      <th className="p-2 text-center">Unit</th>
                      <th className="p-2 text-right">Ordered Qty</th>
                      <th className="p-2 text-right">Inward Recv</th>
                      <th className="p-2 text-right">Svc Rate</th>
                      <th className="p-2 text-right">Net Svc Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {formData.items?.map((item, i) => (
                      <tr key={i}>
                        <td className="p-2 font-bold uppercase">{item.description}</td>
                        <td className="p-2 text-center">{item.unit}</td>
                        <td className="p-2 text-right font-mono font-bold">{item.issuedQuantity}</td>
                        <td className="p-2 text-right font-mono font-bold text-emerald-600">{item.receivedQuantity}</td>
                        <td className="p-1 px-2 text-right font-mono">{currency}{item.rate}</td>
                        <td className="p-2 text-right font-mono font-bold">{currency}{(item.issuedQuantity * item.rate).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {formData.suppliedItems && formData.suppliedItems.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black tracking-widest uppercase border-b pb-1">2. Consigned Raw materials Released Under BOM</h4>
                    <table className="w-full text-xs text-left border">
                      <thead>
                        <tr className="bg-slate-50 border-b">
                          <th className="p-2">Material SKU Name</th>
                          <th className="p-2 text-center">Unit</th>
                          <th className="p-2 text-right">Released Stock Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {formData.suppliedItems.map((item, i) => (
                          <tr key={i}>
                            <td className="p-2 font-bold uppercase">{item.productName}</td>
                            <td className="p-2 text-center">{item.unit}</td>
                            <td className="p-2 text-right font-mono">{item.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Printed Totals */}
              <div className="pt-6 grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-2 text-[10px] rounded space-y-1">
                  <span className="font-bold underline block">Gatepass Declarations Under Act</span>
                  <p>Materials described above are dispatched on a returnable subcontracting subcontract basis. Scrap/Wastage to be physically reconciled and debited under standard guidelines.</p>
                </div>
                <div className="text-right space-y-1 border-t pt-2">
                  <div className="flex justify-between font-bold">
                    <span>Aggregate Labor Cost:</span>
                    <span>{currency}{formData.items?.reduce((s, i) => s + (i.issuedQuantity * i.rate), 0).toLocaleString()}</span>
                  </div>
                  {Number(formData.additionalCost) > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Transportation Levy:</span>
                      <span>{currency}{formData.additionalCost}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm text-[#1b6bf9] border-t-2 pt-1 font-mono">
                    <span>Grand Ledger Total:</span>
                    <span>{currency}{formData.totalCost?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-12 pt-16 text-center text-[10px]">
                <div className="border-t pt-1">
                  <p className="font-extrabold uppercase">Vendor Partner Representative Sign</p>
                  <p className="text-slate-400 mt-1">Authorized Seal & Name</p>
                </div>
                <div className="border-t pt-1">
                  <p className="font-extrabold uppercase">Gate Officer / Dispatch Lead</p>
                  <p className="text-[#1b6bf9] mt-1">TEXFLOW INTEGRATED STORES</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Active Document Workspace Form View */
          <div className="relative">
            
            {/* Simulation Overlays */}
            {showStockEntrySim && (
              <div className="absolute inset-0 bg-[#f8f9fa] z-50 p-6 rounded-xl border border-[#d1d8dd] space-y-4 shadow-2xl overflow-y-auto">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-5 h-5 text-[#1b6bf9]" />
                    ERPNext Stock Entry: Material Transfer to Subcontractor
                  </h3>
                  <button type="button" onClick={() => setShowStockEntrySim(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 font-semibold">
                  Transfer raw fabrics and accessories from the local Transit Godown to the subcontractor's external storage container. This locks raw materials to the vendor in ledger records.
                </p>

                <div className="bg-slate-100 p-3 rounded text-xs space-y-1 font-mono">
                  <p className="font-bold">Source Stock Storage: <span className="text-indigo-600">{formData.sourceWarehouse}</span></p>
                  <p className="font-bold">Target Supplier Storage: <span className="text-emerald-600">Consignment Yard - {formData.vendorName}</span></p>
                </div>

                <div className="space-y-2.5">
                  <span className="text-[10px] font-black uppercase text-slate-400">Materials Transferred List</span>
                  {formData.suppliedItems?.map((m, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white border p-3 rounded text-xs">
                      <span className="font-bold uppercase text-slate-700">{m.productName}</span>
                      <span className="font-mono font-black text-slate-900 border bg-slate-50 px-3 p-1 rounded">{m.quantity} {m.unit}</span>
                    </div>
                  ))}
                  {(!formData.suppliedItems || formData.suppliedItems.length === 0) && (
                    <div className="text-center text-xs text-slate-400 py-6 border border-dashed rounded font-bold">
                      No materials flagged in the Supplied list to transfer!
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t flex justify-end gap-2 text-xs">
                  <button type="button" onClick={() => setShowStockEntrySim(false)} className="px-4 py-2 border rounded font-bold hover:bg-slate-50">
                    Cancel Stock Entry
                  </button>
                  <button 
                    type="button" 
                    onClick={handleProcessStockTransferSim} 
                    className="px-6 py-2 bg-[#1b6bf9] text-white rounded font-bold shadow-md hover:bg-[#1456d1]"
                    disabled={!formData.suppliedItems || formData.suppliedItems.length === 0}
                  >
                    Submit Stock Entry Release
                  </button>
                </div>
              </div>
            )}

            {showInwardSim && (
              <div className="absolute inset-0 bg-[#f8f9fa] z-50 p-6 rounded-xl border border-[#d1d8dd] space-y-4 shadow-2xl overflow-y-auto">
                <ReceiptInwardForm 
                  items={formData.items || []} 
                  onClose={() => setShowInwardSim(false)} 
                  onSubmit={handleProcessReceiptSim} 
                />
              </div>
            )}

            <div className="flex flex-col lg:flex-row gap-8">
              
              {/* Left Side Form Canvas (75%) */}
              <div className="flex-1 space-y-6">
                
                {/* ERP Action Toolbar */}
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-[#e2e8f0] dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-slate-400">Workflow Action:</span>
                    {formData.status === 'DRAFT' ? (
                      <span className="bg-slate-100 border border-slate-300 text-slate-600 px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                        • Draft / Edit Mode
                      </span>
                    ) : (
                      <span className="bg-indigo-50 border border-indigo-200 text-[#1b6bf9] px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#1b6bf9]" /> Subcontract Order locks active
                      </span>
                    )}
                  </div>

                  <div className="flex gap-1.5 shrink-0">
                    <button 
                      type="button" 
                      onClick={() => {
                        setPrintChallanData(formData);
                        setIsPrintView(true);
                      }} 
                      className="p-1 px-3 border border-slate-200 hover:bg-slate-100 rounded text-slate-700 bg-white dark:bg-slate-950 text-xs font-bold shadow-sm flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Document</span>
                    </button>
                  </div>
                </div>

                {/* Section Header: Primary Details */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-[#e2e8f0] dark:border-slate-800 space-y-4">
                  <div className="border-b pb-2 flex items-center gap-1 text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    <User className="w-4 h-4 text-[#1b6bf9]" />
                    <span>1. Subcontractor Partner & Service Node</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-widest px-1">Vendor Partner Name *</label>
                      <input 
                        type="text" 
                        required 
                        disabled={formData.isSubmitted}
                        value={formData.vendorName || ''} 
                        onChange={e => setFormData({ ...formData, vendorName: e.target.value.toUpperCase() })} 
                        placeholder="E.G. GALAXY TEXTILE FINISHERS" 
                        className="w-full text-xs font-bold border border-[#d1d8dd] rounded p-2.5 bg-slate-50/50 dark:bg-slate-950 outline-none focus:outline-none focus:border-[#1b6bf9] uppercase text-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-widest px-1">Service Routing Process *</label>
                      <select 
                        disabled={formData.isSubmitted}
                        value={formData.process} 
                        onChange={e => setFormData({ ...formData, process: e.target.value })} 
                        className="w-full text-xs font-bold border border-[#d1d8dd] rounded p-2.5 bg-slate-50/50 dark:bg-slate-950 outline-none text-slate-800 dark:text-white"
                      >
                        {PROCESS_NODES.map(node => (
                          <option key={node.id} value={node.id}>{node.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Lot Batch References & Style Patterns */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-widest px-1">Original Purchase Order / Work Order Reference</label>
                      <input 
                        type="text" 
                        disabled={formData.isSubmitted}
                        value={formData.sourceWorkOrderId || ''}
                        onChange={e => setFormData({ ...formData, sourceWorkOrderId: e.target.value })}
                        placeholder="e.G. WO-2026-612"
                        className="w-full text-xs font-bold border border-[#d1d8dd] rounded p-2 bg-slate-50/50 dark:bg-slate-950 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-widest px-1">Pattern Style Code</label>
                      <input 
                        type="text" 
                        disabled={formData.isSubmitted}
                        value={formData.styleCode || ''}
                        onChange={e => setFormData({ ...formData, styleCode: e.target.value })}
                        placeholder="e.g. KR-SEEMA-01"
                        className="w-full text-xs font-bold border border-[#d1d8dd] rounded p-2 bg-slate-50/50 dark:bg-slate-950 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-widest px-1">Fabric Lot ID</label>
                      <input 
                        type="text" 
                        disabled={formData.isSubmitted}
                        value={formData.fabricLot || ''}
                        onChange={e => setFormData({ ...formData, fabricLot: e.target.value })}
                        placeholder="e.g. LOT-COTTON-09"
                        className="w-full text-xs font-bold border border-[#d1d8dd] rounded p-2 bg-slate-50/50 dark:bg-slate-950 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section Header: Timeline Dates and Warehouse Controls */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-[#e2e8f0] dark:border-slate-800 space-y-4">
                  <div className="border-b pb-2 flex items-center gap-1 text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    <Calendar className="w-4 h-4 text-[#1b6bf9]" />
                    <span>2. Subcontract Timeline & Warehouses</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Posting Date</label>
                      <input 
                        type="date" 
                        disabled={formData.isSubmitted}
                        value={formData.issueDate} 
                        onChange={e => setFormData({ ...formData, issueDate: e.target.value })} 
                        className="w-full text-xs font-bold border border-[#d1d8dd] rounded p-2 bg-slate-50/50 dark:bg-slate-950 outline-none" 
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Expected Delivery</label>
                      <input 
                        type="date" 
                        disabled={formData.isSubmitted}
                        value={formData.expectedDate} 
                        onChange={e => setFormData({ ...formData, expectedDate: e.target.value })} 
                        className="w-full text-xs font-bold border border-[#d1d8dd] rounded p-2 bg-slate-50/50 dark:bg-slate-950 outline-none" 
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Source Warehouse (BOM)</label>
                      <select 
                        disabled={formData.isSubmitted}
                        value={formData.sourceWarehouse}
                        onChange={e => setFormData({ ...formData, sourceWarehouse: e.target.value })}
                        className="w-full text-xs font-bold border border-[#d1d8dd] rounded p-2 bg-slate-50/50 dark:bg-slate-950 outline-none"
                      >
                        <option value="Transit Store Godown A">Transit Store Godown A</option>
                        <option value="Raw Dyeing Tank Godown">Raw Dyeing Tank Godown</option>
                        <option value="Main Yard Godown A">Main Yard Godown A</option>
                      </select>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Target Warehouse (FGD)</label>
                      <select 
                        disabled={formData.isSubmitted}
                        value={formData.targetWarehouse}
                        onChange={e => setFormData({ ...formData, targetWarehouse: e.target.value })}
                        className="w-full text-xs font-bold border border-[#d1d8dd] rounded p-2 bg-slate-50/50 dark:bg-slate-950 outline-none"
                      >
                        <option value="Finished Goods Main Storage">Finished Goods Main Storage</option>
                        <option value="Local Showroom Storage Slot">Local Showroom Storage Slot</option>
                        <option value="Central Surat Godown">Central Surat Godown</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section Header: Expected Products to Receive */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-[#e2e8f0] dark:border-slate-800 space-y-4">
                  <div className="border-b pb-2 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1 text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      <FileCheck className="w-4 h-4 text-[#1b6bf9]" />
                      <span>3. Subcontract Finished Goods To Receive (Expect FGD)</span>
                    </div>

                    {/* Auto BOM retrieve trigger button */}
                    <button
                      type="button"
                      onClick={handleLoadBOMRecipeForItems}
                      className="px-3.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-[#1b6bf9] border border-indigo-200 text-[10px] font-black uppercase tracking-widest rounded transition-all flex items-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>⚡ Fetch Bill of Materials (BOM)</span>
                    </button>
                  </div>

                  {/* Inline Adding form */}
                  {!formData.isSubmitted && (
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 border rounded-lg space-y-3">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Add Expected Product Row</span>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                        
                        <div className="sm:col-span-6">
                          <label className="text-[8px] font-black uppercase text-slate-500 block mb-1">Select Garment / Design Pattern Name</label>
                          <select
                            value={itemInput.description}
                            onChange={e => setItemInput({ ...itemInput, description: e.target.value })}
                            className="w-full text-xs font-bold border border-[#d1d8dd] rounded p-2 bg-white dark:bg-slate-900 outline-none text-slate-800 dark:text-white"
                          >
                            <option value="">Choose item SKU...</option>
                            {designs.map(d => (
                              <option key={d.id} value={d.name}>{d.name} ({d.sku})</option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[8px] font-black uppercase text-slate-500 block mb-1">Target Qty</label>
                          <input 
                            type="number" 
                            value={itemInput.issuedQuantity || ''}
                            onChange={e => setItemInput({ ...itemInput, issuedQuantity: Number(e.target.value) })}
                            className="w-full text-xs font-mono font-bold text-center border border-[#d1d8dd] rounded p-1.5"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[8px] font-black uppercase text-slate-500 block mb-1">Service Rate (₹)</label>
                          <input 
                            type="number" 
                            value={itemInput.rate || ''}
                            onChange={e => setItemInput({ ...itemInput, rate: Number(e.target.value) })}
                            className="w-full text-xs font-mono font-bold text-center border border-[#d1d8dd] rounded p-1.5"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <button
                            type="button"
                            onClick={handleAddItem}
                            className="w-full bg-[#1b6bf9] hover:bg-[#1456d1] text-white text-[10px] font-black uppercase tracking-wider h-9 rounded shadow-sm focus:outline-none flex items-center justify-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Layout Grid / Active Item List */}
                  <div className="space-y-2">
                    {formData.items?.map((item, idx) => {
                      const amount = (item.issuedQuantity || 0) * (item.rate || 0);

                      return (
                        <div 
                          key={idx} 
                          className="flex flex-col sm:flex-row sm:items-center justify-between border border-[#e2e8f0] dark:border-slate-800 p-3.5 rounded-lg bg-slate-50/10 hover:bg-slate-50/30 dark:hover:bg-slate-800/10 gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <ProductImageThumb 
                              productName={item.description} 
                              designs={designs} 
                              inventory={inventory} 
                              size="sm" 
                            />
                            <div>
                              <p className="font-extrabold text-slate-800 dark:text-white uppercase text-xs">{item.description}</p>
                              <span className="text-[10px] font-semibold text-slate-500 block uppercase mt-0.5">
                                Unit Rate: {currency}{item.rate} • Subtotal: {currency}{amount.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 justify-between sm:justify-end">
                            <div className="text-right">
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block pb-0.5">Dispatched / Target</span>
                              <span className="text-xs font-mono font-bold text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-950 px-2.5 py-0.5 border rounded">
                                {item.issuedQuantity} Pcs
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block pb-0.5">Quality Inwarded</span>
                              <span className="text-xs font-mono font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-0.5 border border-emerald-250 rounded">
                                {item.receivedQuantity || 0} Pcs
                              </span>
                            </div>

                            {!formData.isSubmitted && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                                title="Remove Line SKU"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {(!formData.items || formData.items.length === 0) && (
                      <p className="text-center py-6 border border-dashed rounded text-slate-400 text-xs font-bold">
                        Add items and specify expecting piece target rates.
                      </p>
                    )}
                  </div>
                </div>

                {/* Section Header: Subcontractor Supplied Raw Materials (BOM dispatch) */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-[#e2e8f0] dark:border-slate-850 space-y-4">
                  <div className="border-b pb-2 flex items-center justify-between text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <ArrowUpRight className="w-4 h-4 text-indigo-500" />
                      <span>4. Consigned Raw materials Released Under BOM</span>
                    </div>
                  </div>

                  {!formData.isSubmitted && (
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 border rounded-lg space-y-3">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Add Custom Consumed Material SKU</span>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                        <div className="sm:col-span-6">
                          <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Raw Material SKU / Item Name</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Cotton cambric base thread" 
                            value={suppliedItemInput.productName}
                            onChange={e => setSuppliedItemInput({ ...suppliedItemInput, productName: e.target.value })}
                            className="w-full text-xs font-bold border border-[#d1d8dd] rounded p-2 focus:outline-none"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Transfer Qty</label>
                          <input 
                            type="number" 
                            value={suppliedItemInput.quantity || ''}
                            onChange={e => setSuppliedItemInput({ ...suppliedItemInput, quantity: Number(e.target.value) })}
                            className="w-full text-xs font-mono font-bold text-center border border-[#d1d8dd] rounded p-2"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <button
                            type="button"
                            onClick={handleAddSuppliedItem}
                            className="w-full bg-[#1b6bf9]/10 hover:bg-[#1b6bf9]/20 text-[#1b6bf9] border border-[#1b6bf9]/20 text-[10px] font-black uppercase tracking-wider h-9 rounded transition-all"
                          >
                            Consign Raw
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Supplied Items Material Table */}
                  <div className="space-y-2">
                    {formData.suppliedItems?.map((item, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-3 border border-[#e2e8f0] dark:border-slate-800 rounded bg-slate-50/10 text-xs font-bold"
                      >
                        <div className="flex items-center gap-2">
                          <Circle className="w-1.5 h-1.5 fill-indigo-500 text-indigo-500" />
                          <span className="uppercase text-slate-700 dark:text-slate-300">{item.productName}</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-slate-500 bg-slate-50 dark:bg-slate-950 px-2.5 py-0.5 border rounded">
                            {item.quantity} {item.unit || 'Meter'}
                          </span>
                          {!formData.isSubmitted && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSuppliedItem(idx)}
                              className="text-rose-450 hover:text-rose-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {(!formData.suppliedItems || formData.suppliedItems.length === 0) && (
                      <p className="text-center py-6 text-slate-400 text-xs font-bold border border-dashed rounded">
                        No consigned materials listed under BOM dispatch ledger. Select items and click "Fetch BOM"!
                      </p>
                    )}
                  </div>
                </div>

                {/* Section Header: Subcontractor Ledger Notes */}
                <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-[#e2e8f0] dark:border-slate-800 space-y-4">
                  <div className="border-b pb-2 flex items-center gap-1 text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    <Compass className="w-4 h-4 text-[#1b6bf9]" />
                    <span>5. Subcontractor Worklogs & Special Instructions</span>
                  </div>
                  <textarea
                    rows={4}
                    value={formData.subcontractorNotes || ''}
                    onChange={e => setFormData({ ...formData, subcontractorNotes: e.target.value })}
                    placeholder="Enter special chemical recipes, embroidery stitch limits, or specific wastage targets for this subcontractor order..."
                    className="w-full text-xs border border-[#d1d8dd] rounded p-3 bg-slate-50/50 dark:bg-slate-950 focus:outline-[#1b6bf9] font-semibold text-slate-700 dark:text-slate-300"
                  />
                </div>
              </div>

              {/* Right Side Sidebar Workspace Panel (25%) */}
              <div className="w-full lg:w-[260px] shrink-0 space-y-6">
                
                {/* ERPNext Integrity cost cards */}
                <div className="bg-slate-950 p-5 rounded-2xl text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12">
                    <DollarSign className="w-32 h-32 text-indigo-400" />
                  </div>
                  
                  <div className="relative z-10 space-y-4">
                    <div>
                      <span className="text-indigo-400 text-[9px] font-black uppercase tracking-[0.4em] block">Financial Summary</span>
                      <p className="text-xs text-slate-400 pt-1">Automatic subcontract calculation summary</p>
                    </div>

                    <div className="space-y-2 border-t border-white/10 pt-3 text-[11px] font-semibold text-slate-300">
                      <div className="flex justify-between">
                        <span>Expected Svc Cost:</span>
                        <span className="font-mono text-white">
                          {currency}{(formData.items?.reduce((s, i) => s + (i.issuedQuantity * i.rate), 0) || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest pb-1 block">Transportation / Add Cost</label>
                        <input 
                          type="number"
                          disabled={formData.isSubmitted}
                          value={formData.additionalCost || ''}
                          onChange={e => setFormData({ ...formData, additionalCost: Number(e.target.value) })}
                          placeholder="₹0"
                          className="w-full text-xs font-mono font-bold bg-white/5 border border-white/10 rounded px-2 py-1 text-white focus:outline-none focus:border-[#1b6bf9]"
                        />
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-3 flex justify-between items-center text-xs">
                      <span className="font-black text-indigo-400 uppercase tracking-wider text-[10px]">Grand Net Payable</span>
                      <span className="text-base font-black text-white tabular-nums leading-none">
                        {currency}{(
                          (formData.items?.reduce((s, i) => s + (i.issuedQuantity * i.rate), 0) || 0) + 
                          (Number(formData.additionalCost) || 0)
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dashboard Connections section exactly like ERPNext sidebar links */}
                {editingId && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#e2e8f0] dark:border-slate-800 p-4 space-y-3 shadow-sm">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1.5">ERP connections (Linked Logs)</h4>
                    
                    <div className="space-y-1.5 text-xs font-bold">
                      
                      {/* Stock Entry connection link */}
                      <button 
                        type="button" 
                        onClick={() => setShowStockEntrySim(true)}
                        className="w-full hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded transition-all flex items-center justify-between border border-transparent hover:border-[#1b6bf9]/10"
                      >
                        <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <Layers className="w-4 h-4 text-indigo-500" /> Stock Entry (Transfers)
                        </span>
                        <span className="bg-slate-100 dark:bg-slate-950 font-mono text-[10px] font-bold px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                          {formData.isSubmitted ? "1 Active" : "Pending Draft"}
                        </span>
                      </button>

                      {/* Quality Inward Material connection link */}
                      <button 
                        type="button" 
                        onClick={() => {
                          if (!formData.isSubmitted) {
                            triggerToast("Stock must be locked and submitted in order to outward finished parts!", "error");
                            return;
                          }
                          setShowInwardSim(true);
                        }}
                        className={`w-full p-2 rounded transition-all flex items-center justify-between border border-transparent ${
                          formData.isSubmitted ? 'hover:bg-slate-50 hover:border-[#1b6bf9]/10' : 'opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Purchase Receipt (Inward)
                        </span>
                        <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${formData.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                          {formData.status === 'COMPLETED' ? '1 Recv' : 'Unfilled'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ERPNext Document Tracker Stepper */}
                <div className="bg-white dark:bg-slate-900 border border-[#e2e8f0] dark:border-slate-800 p-4 rounded-xl space-y-4 shadow-sm">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1.5">Document State Trail</h4>
                  
                  <div className="space-y-3 text-xs leading-none">
                    {[
                      { l: '1. Inception Draft Built', active: true, desc: 'Created order parameters' },
                      { l: '2. Document Registered', active: formData.isSubmitted, desc: 'Order submitted & frozen' },
                      { l: '3. Stock Entry Dispatched', active: formData.isSubmitted, desc: 'BOM materials released' },
                      { l: '4. QA Inward Gate Receipt', active: formData.status === 'COMPLETED', desc: 'Acceptance index locked' },
                      { l: '5. Ledger Payment Settled', active: formData.paymentStatus === 'PAID', desc: 'Vendor paid out' }
                    ].map((step, sIdx) => (
                      <div key={sIdx} className="flex gap-2.5 items-start">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          step.active ? 'bg-[#1b6bf9] border-[#1b6bf9] text-white' : 'border-slate-300 text-slate-300'
                        }`}>
                          <Check className="w-2.5 h-2.5 font-bold" />
                        </div>
                        <div className="space-y-0.5">
                          <p className={`font-black ${step.active ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>{step.l}</p>
                          <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Status Dropdown Selector */}
                <div className="bg-white dark:bg-slate-900 border border-[#e2e8f0] dark:border-slate-800 p-4 rounded-xl space-y-3 shadow-sm">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">Supplier Billing Status</h4>
                  
                  <div>
                    <label className="text-[8px] font-black uppercase text-slate-500 block mb-1">Fee Clearance Ledger</label>
                    <select
                      value={formData.paymentStatus}
                      onChange={e => setFormData({ ...formData, paymentStatus: e.target.value })}
                      className="w-full text-xs font-bold border border-[#d1d8dd] rounded p-2 bg-[#f8f9fa] dark:bg-slate-950 text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none"
                    >
                      <option value="UNPAID">Unpaid / Unchecked</option>
                      <option value="PARTIAL">Partially Paid Ledger</option>
                      <option value="PAID">Paid in Full Settle</option>
                    </select>
                  </div>
                </div>

                {onDelete && editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Are you sure you want to completely erase this subcontracting order?")) {
                        onDelete(editingId);
                        setIsModalOpen(false);
                      }
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 border border-rose-300 hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-bold transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Subcontract</span>
                  </button>
                )}

              </div>
            </div>

            {/* Document Drawer Bottom actions toolbar */}
            <div className="pt-6 border-t border-[#e2e8f0] dark:border-slate-850 mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none font-mono">
                System Author: {new Date().toLocaleDateString()} • SECURE_ERP_LEDGER_CHAIN
              </span>

              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-5 py-2 rounded text-xs font-bold text-slate-650 hover:text-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                
                {/* Draft Save button */}
                {!formData.isSubmitted && (
                  <button 
                    type="button" 
                    onClick={handleSaveDraft}
                    className="px-5 py-2 border border-[#d1d8dd] text-slate-700 bg-white dark:bg-[#1c2126] hover:bg-slate-100 text-xs font-bold rounded shadow-sm"
                  >
                    Save Draft Shard
                  </button>
                )}

                {/* Submitting button simulates ERP document posting locking */}
                {!formData.isSubmitted ? (
                  <button 
                    type="button" 
                    onClick={handleDocSubmit}
                    className="px-8 py-2.5 bg-[#1b6bf9] hover:bg-[#1456d1] text-white text-xs font-black uppercase tracking-wider rounded shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    <Check className="w-4 h-4 font-bold" />
                    <span>Submit & Release Order</span>
                  </button>
                ) : (
                  <button 
                    type="button" 
                    onClick={() => {
                      // Save modifications made even after submission (like Notes or payment Status shifts)
                      const doc: JobWork = {
                        ...(formData as JobWork),
                        updatedAt: new Date().toISOString()
                      };
                      onUpdate?.(doc);
                      setIsModalOpen(false);
                      triggerToast("ERP ledger changes stored securely!", "success");
                    }}
                    className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded shadow-md"
                  >
                    Persist Svc Changes
                  </button>
                )}
              </div>
            </div>

          </div>
        )}
      </BaseModal>

    </div>
  );
}

/* Simulated interactive Quality Inward form matching Frappe Quality Inspection report */
interface ReceiptInwardProps {
  items: JobWorkItem[];
  onClose: () => void;
  onSubmit: (accepted: Record<number, number>, rejected: Record<number, number>) => void;
}

function ReceiptInwardForm({ items, onClose, onSubmit }: ReceiptInwardProps) {
  const [accepted, setAccepted] = useState<Record<number, number>>({});
  const [rejected, setRejected] = useState<Record<number, number>>({});

  useEffect(() => {
    // default set standard qty values to accelerate workflow
    const initialAccept: Record<number, number> = {};
    const initialReject: Record<number, number> = {};
    items.forEach((item, idx) => {
      initialAccept[idx] = item.issuedQuantity;
      initialReject[idx] = 0;
    });
    setAccepted(initialAccept);
    setRejected(initialReject);
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b pb-2">
        <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-1.5">
          <BadgeCheck className="w-5 h-5 text-emerald-500 animate-spin" />
          ERPNext Finished Goods Quality Inward Gatepass
        </h3>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-slate-500 font-semibold leading-relaxed">
        Audit finished garments returned by subcontractor. Accepted counts are loaded to the Main Depot inventory. Rejected pieces are accounted as material wastage penalties against active subcontracting bills.
      </p>

      <div className="space-y-3">
        {items.map((item, idx) => {
          const expectVal = item.issuedQuantity || 0;
          const currentAccept = accepted[idx] ?? expectVal;
          const currentReject = rejected[idx] ?? 0;
          const wastagePercent = Math.round(((expectVal - currentAccept) / (expectVal || 1)) * 100);

          return (
            <div key={idx} className="p-4 border rounded-xl bg-white space-y-3 flex flex-col justify-between shadow-sm">
              <div className="flex justify-between items-<ctrl94>">
                <div>
                  <p className="font-extrabold text-xs uppercase text-slate-800">{item.description}</p>
                  <p className="text-[10px] text-slate-400 font-bold block uppercase mt-0.5">Original Expect Target: {expectVal} {item.unit}</p>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block font-mono">Dynamic Yarn variance wastage</span>
                  <span className={`text-[10px] font-black bg-rose-50 border border-rose-100 ${wastagePercent > 10 ? 'text-rose-600 bg-rose-50' : 'text-slate-400 bg-slate-50'} p-0.5 px-2 rounded mt-0.5 block`}>
                    {wastagePercent}% loss
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Qualifying Accept Piece Qty</label>
                  <input 
                    type="number"
                    value={currentAccept}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setAccepted({ ...accepted, [idx]: val });
                    }}
                    className="w-full text-xs font-mono font-bold border border-[#d1d8dd] rounded p-1.5 focus:outline-[#1b6bf9] text-center" 
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-[#ef4444] uppercase tracking-wider mb-1">Damage / Rejection Piece Qty</label>
                  <input 
                    type="number"
                    value={currentReject}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setRejected({ ...rejected, [idx]: val });
                    }}
                    className="w-full text-xs font-mono font-bold border border-rose-300 rounded p-1.5 focus:outline-rose-500 text-center text-rose-600 bg-rose-50/25" 
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t flex justify-end gap-2 text-xs">
        <button type="button" onClick={onClose} className="px-4 py-2 border rounded font-semibold hover:bg-slate-50">
          Abort Audit
        </button>
        <button 
          type="button" 
          onClick={() => onSubmit(accepted, rejected)} 
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold shadow-md"
        >
          Verify QA & Inward Stock
        </button>
      </div>
    </div>
  );
}
