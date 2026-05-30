import React, { useState, useMemo, useEffect } from 'react';
import { ProductionJob, Design, Machine, Karigar } from '../types';
import { 
  Users, Search, Plus, Filter, 
  MoreHorizontal, ArrowLeft, Save, ChevronLeft, ChevronRight,
  List, ShieldCheck, Camera, X, Check, Trash2, Settings,
  AlertCircle, Calendar, Play, Pause, Clock, Coins, Hammer,
  CheckCircle2, RefreshCw, FileText, Layers, TrendingUp, Info,
  Printer, ArrowUpRight, Copy, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell, PieChart, Pie } from 'recharts';

import { WorkOrderStockModals } from './work-orders/WorkOrderStockModals';
import { WorkOrderConnections } from './work-orders/WorkOrderConnections';
import { WorkOrderJobCards } from './work-orders/WorkOrderJobCards';
import { WorkOrderPrintDesk } from './work-orders/WorkOrderPrintDesk';
import { WorkOrderFinancials } from './work-orders/WorkOrderFinancials';

interface ProductionJobsProps {
  jobs: ProductionJob[];
  designs: Design[];
  machines: Machine[];
  karigars?: Karigar[];
  onUpdateJob: (job: ProductionJob) => void;
  onAddJob: (job: ProductionJob) => void;
  onDeleteJob?: (id: string) => void;
  onAction?: (action: string, data: any) => void;
  currency?: string;
  orders?: any[];
  garmentSetup?: any;
}

const COLORS = ['#2490ef', '#2ec4b6', '#ff9f1c', '#e71d36', '#9b5de5'];

// Static Garment Routing Templates for fallback or instant selection matching ERPNext
const mockRoutingTemplates = [
  {
    id: 'RT-001',
    name: 'Standard Kurti Assembly Route',
    category: 'KURTI',
    operations: [
      { name: 'Fabric Panel Cutting', workstation: 'Cutting Table A', time: '10 Mins', rate: 120 },
      { name: 'Embroidery Panel Stencil', workstation: 'Zari Computer Deck', time: '15 Mins', rate: 150 },
      { name: 'Collar & Sleeve Stitching', workstation: 'High-Speed Stitch Line', time: '20 Mins', rate: 180 },
      { name: 'Button Hooking & Pressing', workstation: 'Finishing Steam Table', time: '8 Mins', rate: 100 },
      { name: 'Final QC & Barcode Pack', workstation: 'QC Inspection Table', time: '5 Mins', rate: 90 }
    ]
  },
  {
    id: 'RT-002',
    name: 'Designer Silk Saree Hand Block Route',
    category: 'SAREE',
    operations: [
      { name: 'Silk Board Warp Sizing', workstation: 'Warp Loom Floor A', time: '15 Mins', rate: 140 },
      { name: 'Gold Border Lace Attachment', workstation: 'Zari Computer Deck', time: '25 Mins', rate: 180 },
      { name: 'Hand Block Printing & Dying', workstation: 'Indigo Block Printing Vat', time: '35 Mins', rate: 200 },
      { name: 'Zari Fringe Stitch Tassels', workstation: 'High-Speed Stitch Line', time: '12 Mins', rate: 150 },
      { name: 'Final Inspection & Ironing', workstation: 'Finishing Steam Table', time: '10 Mins', rate: 100 }
    ]
  },
  {
    id: 'RT-003',
    name: 'Casual Shirting Denim Route',
    category: 'SUIT',
    operations: [
      { name: 'Laser Pattern Cutting', workstation: 'Cutting Table A', time: '8 Mins', rate: 130 },
      { name: 'Front Placket & Pocket Join', workstation: 'High-Speed Stitch Line', time: '18 Mins', rate: 180 },
      { name: 'Yoke & Collar Attachment', workstation: 'High-Speed Stitch Line', time: '12 Mins', rate: 180 },
      { name: 'Denim Bleach Wash Cycle', workstation: 'Wash & Dye Vat C', time: '30 Mins', rate: 220 },
      { name: 'Tack Buttoning & Pack', workstation: 'QC Inspection Table', time: '7 Mins', rate: 95 }
    ]
  }
];

const ProductionJobs: React.FC<ProductionJobsProps> = ({ 
  jobs, designs, machines, karigars = [], onUpdateJob, onAddJob, onDeleteJob, onAction, currency = '₹', orders = [], garmentSetup
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'MATERIALS' | 'OPERATIONS' | 'BUNDLES' | 'FINANCIALS'>('DETAILS');
  const [hasGeneratedMR, setHasGeneratedMR] = useState<boolean>(false);

  // Advanced ERPNext UI upgrades state
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState<boolean>(false);
  const [stockEntryModalMode, setStockEntryModalMode] = useState<'TRANSFER' | 'MANUFACTURE' | null>(null);
  const [activeConnectionPane, setActiveConnectionPane] = useState<'SO' | 'MR' | 'STE' | 'JC' | 'TIMELINE' | null>(null);
  
  // Custom print label customization state
  const [printSettings, setPrintSettings] = useState({
    labelSize: '4x3',
    barcodeType: 'CODE128',
    printQuality: 'HIGH_RES',
    margin: 2,
    cols: 3,
    includeDate: true,
    showLogo: true
  });
  
  // State for simulated print ticket preview
  const [isPrintCustomizerOpen, setIsPrintCustomizerOpen] = useState(false);
  
  // Simulated database arrays associated with the ACTIVE Work Order
  const [stockEntries, setStockEntries] = useState<Array<{
    id: string;
    type: 'Material Transfer for Manufacture' | 'Manufacture';
    date: string;
    sourceWarehouse: string;
    targetWarehouse: string;
    items: Array<{ name: string; qty: number; unit: string; cost: number }>;
    status: 'Draft' | 'Submitted';
  }>>([]);
  
  // Karigar Assignments for Job Cards (operation-index -> KarigarId)
  const [karigarAssignments, setKarigarAssignments] = useState<Record<number, string>>({});
  
  // Professional Audit Timeline Events
  const [timelineEvents, setTimelineEvents] = useState<Array<{
    id: string;
    timestamp: string;
    title: string;
    desc: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'user';
  }>>([]);
  
  // Stock Entry inputs
  const [steQtyProduced, setSteQtyProduced] = useState<number>(10);
  const [steScrapQty, setSteScrapQty] = useState<number>(0.5);
  const [steWorkerAssign, setSteWorkerAssign] = useState<string>('');
  const [steCustomDate, setSteCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [steItemsTransfer, setSteItemsTransfer] = useState<Record<string, number>>({});

  // Keeps track of which operations have been signed off for each work order
  const [signedOffOps, setSignedOffOps] = useState<Record<string, Record<number, boolean>>>({});

  // ERPNext state engine simulation inside Work Order
  const [formData, setJobForm] = useState<Partial<ProductionJob> & {
    erpStatus?: 'DRAFT' | 'SUBMITTED' | 'IN_PROGRESS' | 'COMPLETED' | 'STOPPED';
    materialsIssued?: boolean;
    issuedMaterials?: Array<{ materialName: string; requiredQty: number; localAvailable: number; issuedQty: number; unit: string }>;
    producedQty?: number;
    scrapLog?: Array<{ name: string; qty: number; unit: string; salvageVal: number }>;
    actualLaborCosts?: number;
    sourceWarehouse?: string;
    targetWarehouse?: string;
    wipWarehouse?: string;
    salesOrderId?: string;
    projectRef?: string;
    skipMaterialTransfer?: boolean;
    backflushMaterials?: boolean;
    allowExcessConsumption?: boolean;
    fabricLot?: string;
    color?: string;
  }>({ 
    status: 'CUTTING', 
    quantity: 0, 
    progress: 0, 
    priority: 'NORMAL', 
    assignedMachine: '',
    deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    erpStatus: 'DRAFT',
    materialsIssued: false,
    issuedMaterials: [],
    producedQty: 0,
    scrapLog: [],
    actualLaborCosts: 0,
    sourceWarehouse: 'Stores - Bhiwandi Godown',
    targetWarehouse: 'Finished Goods Warehouse - TM',
    wipWarehouse: 'WIP Tailoring Shopfloor',
    salesOrderId: '',
    projectRef: '',
    skipMaterialTransfer: false,
    backflushMaterials: true,
    allowExcessConsumption: false,
    fabricLot: 'LOT-2025-05A',
    color: 'Deep Indigo Pink'
  });

  // Local state for routing operation stopwatch
  const [activeTimerOpIndex, setActiveTimerOpIndex] = useState<number | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (activeTimerOpIndex !== null) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else {
      setTimerSeconds(0);
    }
    return () => clearInterval(interval);
  }, [activeTimerOpIndex]);

  // Auto-sync form updates back to the parent jobs database in real time for dynamic ERP updates!
  useEffect(() => {
    if (viewMode === 'FORM' && formData.id) {
      // Find the existing job to compare and avoid infinite triggers
      const matchedJob = jobs.find(j => j.id === formData.id);
      if (matchedJob) {
        // Compare values to see if there is any real change
        const hasChanges = 
          matchedJob.status !== formData.status ||
          matchedJob.progress !== formData.progress ||
          matchedJob.deadline !== formData.deadline ||
          matchedJob.priority !== formData.priority ||
          matchedJob.quantity !== formData.quantity ||
          matchedJob.assignedMachine !== formData.assignedMachine ||
          (matchedJob as any).erpStatus !== formData.erpStatus ||
          (matchedJob as any).materialsIssued !== formData.materialsIssued ||
          (matchedJob as any).producedQty !== formData.producedQty ||
          (matchedJob as any).actualLaborCosts !== formData.actualLaborCosts ||
          (matchedJob as any).sourceWarehouse !== formData.sourceWarehouse ||
          (matchedJob as any).wipWarehouse !== formData.wipWarehouse ||
          (matchedJob as any).targetWarehouse !== formData.targetWarehouse ||
          (matchedJob as any).fabricLot !== formData.fabricLot ||
          (matchedJob as any).color !== formData.color ||
          (matchedJob as any).salesOrderId !== formData.salesOrderId ||
          JSON.stringify(matchedJob.operations) !== JSON.stringify(formData.operations);

        if (hasChanges) {
          const defaultSizes: Record<string, number> = {};
          if (!formData.sizeWise || Object.keys(formData.sizeWise).length === 0) {
            const q = formData.quantity || 0;
            defaultSizes['M'] = Math.round(q * 0.4);
            defaultSizes['L'] = Math.round(q * 0.4);
            defaultSizes['XL'] = q - (defaultSizes['M'] + defaultSizes['L']);
          }

          const jobData: ProductionJob = {
            id: formData.id,
            productName: formData.productName || matchedJob.productName,
            quantity: formData.quantity || matchedJob.quantity,
            status: formData.status || 'CUTTING',
            startDate: formData.startDate || matchedJob.startDate,
            deadline: formData.deadline || matchedJob.deadline,
            priority: (formData.priority as any) || matchedJob.priority || 'NORMAL',
            progress: formData.progress !== undefined ? formData.progress : matchedJob.progress,
            assignedMachine: formData.assignedMachine || matchedJob.assignedMachine,
            sizeWise: formData.sizeWise || matchedJob.sizeWise || defaultSizes,
            updatedAt: new Date().toISOString()
          };

          (jobData as any).erpStatus = formData.erpStatus || (matchedJob as any).erpStatus || 'DRAFT';
          (jobData as any).materialsIssued = formData.materialsIssued !== undefined ? formData.materialsIssued : (matchedJob as any).materialsIssued;
          (jobData as any).producedQty = formData.producedQty !== undefined ? formData.producedQty : ((matchedJob as any).producedQty || 0);
          (jobData as any).actualLaborCosts = formData.actualLaborCosts !== undefined ? formData.actualLaborCosts : ((matchedJob as any).actualLaborCosts || 0);
          
          (jobData as any).sourceWarehouse = formData.sourceWarehouse || (matchedJob as any).sourceWarehouse || 'Stores - Bhiwandi Godown';
          (jobData as any).targetWarehouse = formData.targetWarehouse || (matchedJob as any).targetWarehouse || 'Finished Goods Warehouse - TM';
          (jobData as any).wipWarehouse = formData.wipWarehouse || (matchedJob as any).wipWarehouse || 'WIP Tailoring Shopfloor';
          (jobData as any).salesOrderId = formData.salesOrderId || (matchedJob as any).salesOrderId || '';
          (jobData as any).projectRef = formData.projectRef || (matchedJob as any).projectRef || '';
          (jobData as any).skipMaterialTransfer = !!formData.skipMaterialTransfer;
          (jobData as any).backflushMaterials = formData.backflushMaterials !== undefined ? formData.backflushMaterials : true;
          (jobData as any).allowExcessConsumption = !!formData.allowExcessConsumption;
          (jobData as any).fabricLot = formData.fabricLot || (matchedJob as any).fabricLot || '';
          (jobData as any).color = formData.color || (matchedJob as any).color || '';
          (jobData as any).routingTemplateId = formData.routingTemplateId || matchedJob.routingTemplateId || '';
          if (formData.operations) {
            jobData.operations = formData.operations;
          } else if (matchedJob.operations) {
            jobData.operations = matchedJob.operations;
          }

          onUpdateJob(jobData);
        }
      }
    }
  }, [formData, viewMode, jobs, onUpdateJob]);

  const filteredJobs = useMemo(() => {
    const searchLower = (filter || '').toLowerCase();
    return (jobs || []).filter(j => {
      const jId = (j.id || '').toLowerCase();
      const pName = (j.productName || '').toLowerCase();
      const matchSearch = jId.includes(searchLower) || pName.includes(searchLower);
      const matchStatus = statusFilter === 'ALL' || j.status === statusFilter;
      const matchPriority = priorityFilter === 'ALL' || j.priority === priorityFilter;
      return matchSearch && matchStatus && matchPriority;
    });
  }, [jobs, filter, statusFilter, priorityFilter]);

  // Design selection logic for batch requirement projection
  const selectedDesign = useMemo(() => designs.find(d => d.name === formData.productName), [formData.productName, designs]);
  
  const batchRequirements = useMemo(() => {
    if (!selectedDesign || !formData.quantity) return [];
    return (selectedDesign.recipe || []).map(r => {
      const wastageFactor = 1 + (r.wastagePercent || 0) / 100;
      return {
        ...r,
        totalRequired: parseFloat((r.quantity * (formData.quantity || 0) * wastageFactor).toFixed(2))
      };
    });
  }, [selectedDesign, formData.quantity]);

  // Calculate ERPNext costs
  const costingSummary = useMemo(() => {
    const materialCost = batchRequirements.reduce((acc, item) => {
      return acc + (item.totalRequired * (item.estimatedCost || 50));
    }, 0);

    const laborCostPerPiece = selectedDesign ? (selectedDesign.processCostPerPiece || 150) * 0.3 : 45; 
    const estimatedLaborCost = (formData.quantity || 0) * laborCostPerPiece;

    const actualMaterialsCost = formData.materialsIssued ? materialCost : 0;
    const actualLabor = formData.actualLaborCosts || 0;

    return {
      estimatedMaterial: materialCost,
      estimatedLabor: estimatedLaborCost,
      estimatedTotal: materialCost + estimatedLaborCost,
      actualMaterial: actualMaterialsCost,
      actualLabor: actualLabor,
      actualTotal: actualMaterialsCost + actualLabor
    };
  }, [batchRequirements, selectedDesign, formData.quantity, formData.materialsIssued, formData.actualLaborCosts]);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.productName || !formData.quantity) return;

    // Map size-wise breakdown automatically if not explicitly entered to ensure complete statistics
    const defaultSizes: Record<string, number> = {};
    if (!formData.sizeWise || Object.keys(formData.sizeWise).length === 0) {
      const q = formData.quantity || 0;
      defaultSizes['M'] = Math.round(q * 0.4);
      defaultSizes['L'] = Math.round(q * 0.4);
      defaultSizes['XL'] = q - (defaultSizes['M'] + defaultSizes['L']);
    }

    const jobData: ProductionJob = {
      id: formData.id || `JOB-${Date.now().toString().slice(-4)}`,
      productName: formData.productName!,
      quantity: formData.quantity!,
      status: formData.status || 'CUTTING',
      startDate: formData.startDate || new Date().toISOString().split('T')[0],
      deadline: formData.deadline || '',
      priority: formData.priority as any || 'NORMAL',
      progress: formData.progress || 0,
      assignedMachine: formData.assignedMachine,
      sizeWise: formData.sizeWise || defaultSizes,
      updatedAt: new Date().toISOString()
    };

    // Include extended data via extra fields
    (jobData as any).erpStatus = formData.erpStatus || 'DRAFT';
    (jobData as any).materialsIssued = formData.materialsIssued;
    (jobData as any).producedQty = formData.producedQty || 0;
    (jobData as any).actualLaborCosts = formData.actualLaborCosts || 0;
    
    // ERPNext Upgrades fields persistence
    (jobData as any).sourceWarehouse = formData.sourceWarehouse || 'Stores - Bhiwandi Godown';
    (jobData as any).targetWarehouse = formData.targetWarehouse || 'Finished Goods Warehouse - TM';
    (jobData as any).wipWarehouse = formData.wipWarehouse || 'WIP Tailoring Shopfloor';
    (jobData as any).salesOrderId = formData.salesOrderId || '';
    (jobData as any).projectRef = formData.projectRef || '';
    (jobData as any).skipMaterialTransfer = !!formData.skipMaterialTransfer;
    (jobData as any).backflushMaterials = formData.backflushMaterials !== undefined ? formData.backflushMaterials : true;
    (jobData as any).allowExcessConsumption = !!formData.allowExcessConsumption;
    (jobData as any).fabricLot = formData.fabricLot || '';
    (jobData as any).color = formData.color || '';
    (jobData as any).routingTemplateId = formData.routingTemplateId || '';
    if (formData.operations) {
      jobData.operations = formData.operations;
    }

    if (formData.id) onUpdateJob(jobData);
    else onAddJob(jobData);
    
    setViewMode('LIST');
  };

  const openForm = (j?: ProductionJob) => {
    setHasGeneratedMR(false);
    setIsCreateMenuOpen(false);
    setActiveConnectionPane(null);
    
    if (j) {
       const isCompleted = j.status === 'READY' || (j as any).erpStatus === 'COMPLETED';
       const isIssued = (j as any).materialsIssued || (j.progress > 0);
       const orderIdVal = j.orderId || (orders[0]?.id) || 'SO-2026-003';
       
       setJobForm({
         ...j,
         orderId: orderIdVal,
         erpStatus: (j as any).erpStatus || (isCompleted ? 'COMPLETED' : j.progress > 0 ? 'IN_PROGRESS' : 'SUBMITTED'),
         materialsIssued: isIssued,
         producedQty: (j as any).producedQty || (isCompleted ? j.quantity : Math.round(j.quantity * (j.progress/100))),
         actualLaborCosts: (j as any).actualLaborCosts || Math.round((j.quantity * (j.progress/100)) * 30),
         scrapLog: (j as any).scrapLog || [
           { name: 'Textile Rag Waste', qty: parseFloat(((j.quantity || 0) * 0.05).toFixed(2)), unit: 'KG', salvageVal: 15 }
         ],
         sourceWarehouse: (j as any).sourceWarehouse || 'Stores - Bhiwandi Godown',
         targetWarehouse: (j as any).targetWarehouse || 'Finished Goods Warehouse - TM',
         wipWarehouse: (j as any).wipWarehouse || 'WIP Tailoring Shopfloor',
         salesOrderId: (j as any).salesOrderId || orderIdVal,
         projectRef: (j as any).projectRef || 'PRJ-2026-TEXTILES',
         skipMaterialTransfer: (j as any).skipMaterialTransfer || false,
         backflushMaterials: (j as any).backflushMaterials !== undefined ? (j as any).backflushMaterials : true,
         allowExcessConsumption: (j as any).allowExcessConsumption || false,
         fabricLot: (j as any).fabricLot || 'LOT-2025-05A',
         color: (j as any).color || 'Deep Indigo Pink',
         routingTemplateId: j.routingTemplateId || 'RT-001',
       });

       // Create pre-populated stock entries for the loaded job card to feel incredibly realistic!
       const loadedSTE: any[] = [];
       if (isIssued) {
         loadedSTE.push({
           id: `STE-${j.id}-001`,
           type: 'Material Transfer for Manufacture',
           date: j.startDate || '2026-05-20',
           sourceWarehouse: (j as any).sourceWarehouse || 'Stores - Bhiwandi Godown',
           targetWarehouse: (j as any).wipWarehouse || 'WIP Tailoring Shopfloor',
           items: [
             { name: 'Pure Cotton Yarn Cones', qty: Math.round(j.quantity * 0.4), unit: 'KG', cost: 180 },
             { name: 'Spandex Premium Trims', qty: Math.round(j.quantity * 1.2), unit: 'METER', cost: 45 }
           ],
           status: 'Submitted'
         });
       }
       if (isCompleted) {
         loadedSTE.push({
           id: `STE-${j.id}-002`,
           type: 'Manufacture',
           date: j.deadline || '2026-05-27',
           sourceWarehouse: (j as any).wipWarehouse || 'WIP Tailoring Shopfloor',
           targetWarehouse: (j as any).targetWarehouse || 'Finished Goods Warehouse - TM',
           items: [
             { name: j.productName, qty: j.quantity, unit: 'PIECE', cost: 650 }
           ],
           status: 'Submitted'
         });
       }
       setStockEntries(loadedSTE);

       // Build standard timeline events for interactive auditing!
       setTimelineEvents([
         {
           id: 'E1',
           timestamp: '2026-05-28 09:30 AM',
           title: 'Work Order Blueprint Created',
           desc: `Work Order drafted for ${j.quantity.toLocaleString()} pcs of "${j.productName}" based on BOM-STYLE-2026.`,
           type: 'info'
         },
         ...(isIssued ? [{
           id: 'E2',
           timestamp: '2026-05-28 11:15 AM',
           title: 'Raw Material Stock Entry Registered',
           desc: `Submitted Stock Entry STE-${j.id}-001. Transferred components from ${(j as any).sourceWarehouse || 'Central Stores'} to ${(j as any).wipWarehouse || 'WIP Shopfloor'}.`,
           type: 'success'
         } as any] : []),
         ...(j.progress > 40 ? [{
           id: 'E3',
           timestamp: '2026-05-29 02:20 PM',
           title: 'Manufacturing Routing Begun',
           desc: `Routing Job Cards execution logged. Dynamic stopwatch active for Panel Cutting and Assembly floor.`,
           type: 'user'
         } as any] : []),
         ...(isCompleted ? [{
           id: 'E4',
           timestamp: '2026-05-30 08:00 AM',
           title: 'Finished Goods Manufactured & Transferred',
           desc: `Submitted Stock Entry STE-${j.id}-002. Received ${j.quantity.toLocaleString()} pieces in ${(j as any).targetWarehouse || 'FG Warehouse'}. Work Order closed successfully.`,
           type: 'success'
         } as any] : [])
       ]);

       // Create random Karigar assignments for operations to look highly customized
       if (karigars && karigars.length > 0) {
         setKarigarAssignments({
           0: karigars[0]?.id || '',
           1: karigars[1 % karigars.length]?.id || '',
           2: karigars[2 % karigars.length]?.id || '',
           3: karigars[3 % karigars.length]?.id || '',
         });
       } else {
         setKarigarAssignments({ 0: 'K-001', 1: 'K-002', 2: 'K-003', 3: 'K-004' });
       }

    } else {
       // Clear form/simulated db for new WO blueprint creation
       setJobForm({ 
         status: 'CUTTING', 
         quantity: 250, 
         progress: 0, 
         priority: 'NORMAL', 
         startDate: new Date().toISOString().split('T')[0],
         deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
         erpStatus: 'DRAFT',
         materialsIssued: false,
         producedQty: 0,
         scrapLog: [],
         actualLaborCosts: 0,
         sourceWarehouse: 'Stores - Bhiwandi Godown',
         targetWarehouse: 'Finished Goods Warehouse - TM',
         wipWarehouse: 'WIP Tailoring Shopfloor',
         salesOrderId: orders[0]?.id || 'SO-2026-003',
         projectRef: 'PRJ-2026-TEXTILES',
         skipMaterialTransfer: false,
         backflushMaterials: true,
         allowExcessConsumption: false,
         fabricLot: 'LOT-2026-VITE',
         color: 'Indigo Royal Tint',
         routingTemplateId: 'RT-001'
       });
       setStockEntries([]);
       setTimelineEvents([
         {
           id: 'E-NEW',
           timestamp: 'Just Now',
           title: 'New Work Order Blueprint Initialized',
           desc: 'Configure raw BOM, routing instructions, and schedules then submit to lock details.',
           type: 'info'
         }
       ]);
       setKarigarAssignments({});
    }
    setActiveTab('DETAILS');
    setViewMode('FORM');
  };

  const getStatusBadge = (status: string, size: 'sm' | 'md' = 'sm') => {
    const sizeClasses = size === 'sm' ? 'px-2 py-[2px] text-[11px]' : 'px-3 py-1 text-xs';
    if (status === 'READY' || status === 'COMPLETED') return <span className={`bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold whitespace-nowrap ${sizeClasses}`}>Ready / Closed</span>;
    if (status === 'DRAFT') return <span className={`bg-slate-100 text-slate-700 border border-slate-200 rounded font-semibold whitespace-nowrap ${sizeClasses}`}>Draft</span>;
    if (status === 'SUBMITTED') return <span className={`bg-blue-50 text-blue-700 border border-blue-200 rounded font-semibold whitespace-nowrap ${sizeClasses}`}>Submitted</span>;
    if (status === 'STITCHING' || status === 'IN_PROGRESS') return <span className={`bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-semibold whitespace-nowrap ${sizeClasses}`}>Stitching</span>;
    if (status === 'CUTTING') return <span className={`bg-amber-50 text-amber-700 border border-amber-200 rounded font-semibold whitespace-nowrap ${sizeClasses}`}>Cutting</span>;
    return <span className={`bg-rose-50 text-rose-700 border border-rose-200 rounded font-semibold whitespace-nowrap ${sizeClasses}`}>{status}</span>;
  };

  const issueMaterialsEngine = () => {
    const defaultSTEId = `STE-${formData.id || 'JOB-25'}-M01`;
    const newSTE = {
      id: defaultSTEId,
      type: 'Material Transfer for Manufacture' as const,
      date: new Date().toISOString().split('T')[0],
      sourceWarehouse: formData.sourceWarehouse || 'Stores - Bhiwandi Godown',
      targetWarehouse: formData.wipWarehouse || 'WIP Tailoring Shopfloor',
      items: batchRequirements.length > 0 ? batchRequirements.map(item => ({
        name: item.materialName,
        qty: item.totalRequired,
        unit: item.unit,
        cost: item.estimatedCost || 50
      })) : [
        { name: 'Pure Cotton Yarn Cones', qty: Math.round((formData.quantity || 120) * 0.4), unit: 'KG', cost: 180 },
        { name: 'Spandex Premium Trims', qty: Math.round((formData.quantity || 120) * 1.2), unit: 'METER', cost: 45 }
      ],
      status: 'Submitted' as const
    };

    setStockEntries(prev => {
      if (prev.some(ste => ste.id === defaultSTEId)) return prev;
      return [newSTE, ...prev];
    });

    setJobForm(prev => ({
      ...prev,
      materialsIssued: true,
      erpStatus: 'IN_PROGRESS',
      progress: Math.max(prev.progress || 0, 15)
    }));

    setTimelineEvents(prev => [
      {
         id: 'E-STE-M-' + Date.now(),
         timestamp: new Date().toLocaleString(),
         title: 'Stock Transferred to Shopfloor (STE)',
         desc: `Registered Stock Entry ${defaultSTEId}. Allocated raw ingredients to WIP warehouse: "${formData.wipWarehouse}".`,
         type: 'success'
      },
      ...prev
    ]);
  };

  const logProductionFinished = (qty: number) => {
    const targetQty = formData.quantity || 1;
    const currentProduced = Math.min((formData.producedQty || 0) + qty, targetQty);
    const newProgress = Math.round((currentProduced / targetQty) * 100);
    const isNowCompleted = newProgress === 100;
    
    // Create custom stock entry for manufacture
    const defMfgId = `STE-${formData.id || 'JOB-25'}-F01`;
    const newSTE = {
      id: defMfgId,
      type: 'Manufacture' as const,
      date: new Date().toISOString().split('T')[0],
      sourceWarehouse: formData.wipWarehouse || 'WIP Tailoring Shopfloor',
      targetWarehouse: formData.targetWarehouse || 'Finished Goods Warehouse - TM',
      items: [
        { name: formData.productName || 'Finished Item', qty: qty, unit: 'PIECE', cost: selectedDesign?.processCostPerPiece || 150 }
      ],
      status: 'Submitted' as const
    };

    setStockEntries(prev => {
      const existing = prev.filter(x => x.id !== defMfgId);
      return [newSTE, ...existing];
    });

    setJobForm(prev => ({
      ...prev,
      producedQty: currentProduced,
      progress: newProgress,
      erpStatus: isNowCompleted ? 'COMPLETED' : 'IN_PROGRESS',
      status: isNowCompleted ? 'READY' : prev.status
    }));

    setTimelineEvents(prev => [
      {
         id: 'E-STE-F-' + Date.now(),
         timestamp: new Date().toLocaleString(),
         title: `${qty} Finished PCS Deposited (STE)`,
         desc: `Authorized Production Ledger Entry ${defMfgId}. Transferred ${qty} finished pieces to target location: "${formData.targetWarehouse}".`,
         type: 'success'
      },
      ...prev
    ]);
  };

  const activeRoutingTemplate = useMemo(() => {
    return mockRoutingTemplates.find(rt => rt.id === formData.routingTemplateId) || mockRoutingTemplates[0];
  }, [formData.routingTemplateId]);

  const handleSignOffOperation = (idx: number) => {
    const docId = formData.id || 'draft-new';
    setSignedOffOps(prev => {
      const currentDoc = prev[docId] || {};
      const updated = { ...prev, [docId]: { ...currentDoc, [idx]: true } };
      
      const totalOps = activeRoutingTemplate?.operations?.length || 5;
      const signedCount = Object.values(updated[docId]).filter(v => v === true).length;
      
      const addedProgress = Math.round((signedCount / totalOps) * 85);
      const newProgress = Math.min(95, Math.max(formData.progress || 0, addedProgress));
      
      setJobForm(prevForm => ({
        ...prevForm,
        progress: newProgress,
        status: newProgress > 90 ? 'READY' : prevForm.status,
        erpStatus: newProgress > 90 ? 'COMPLETED' : 'IN_PROGRESS'
      }));

      return updated;
    });

    setTimelineEvents(prev => [
      {
         id: 'E-SIGNOFF-' + idx + '-' + Date.now(),
         timestamp: new Date().toLocaleString(),
         title: `Workstation ${idx+1} Signed Off`,
         desc: `Certified panel routing and quality gate for workstation operation "${activeRoutingTemplate?.operations[idx]?.name || 'Assembly'}".`,
         type: 'success'
      },
      ...prev
    ]);
  };

  const handleTransferSubmit = (customItems: Record<string, number>, date: string) => {
    issueMaterialsEngine();
    setStockEntryModalMode(null);
  };

  const handleManufactureSubmit = (completeQty: number, scrapWeight: number, date: string) => {
    logProductionFinished(completeQty);
    setStockEntryModalMode(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden shadow-inner">
        {viewMode === 'LIST' ? (
           <div className="flex flex-col h-full">
            {/* ─── ERPNEXT-STYLE WORK ORDER DIRECTORY COMMAND CENTER ─── */}
            <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
               <div className="flex justify-between items-center h-8">
                  <div className="flex items-center gap-3">
                     <span className="text-xl text-[#1c2126] font-bold tracking-tight">Work Orders (Production Jobs)</span>
                     <span className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">Manufacturing Engine</span>
                     <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filteredJobs.length} live units</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => openForm()} className="h-7 px-3 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-1 focus:ring-indigo-500">
                        <Plus className="w-4 h-4" />
                        Create Work Order
                     </button>
                  </div>
               </div>
               
               {/* ─── FILTERS COMMAND STATION ─── */}
               <div className="flex justify-between items-center mt-3 h-8">
                  <div className="flex items-center gap-2">
                      <select 
                        className="h-7 px-2 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-indigo-500"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                      >
                         <option value="ALL">All Production Stages</option>
                         <option value="CUTTING">Cutting</option>
                         <option value="STITCHING">Stitching</option>
                         <option value="FINISHING">Finishing</option>
                         <option value="READY">Ready</option>
                      </select>

                      <select 
                        className="h-7 px-2 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-indigo-500"
                        value={priorityFilter}
                        onChange={e => setPriorityFilter(e.target.value)}
                      >
                         <option value="ALL">All Priorities</option>
                         <option value="LOW">Low</option>
                         <option value="NORMAL">Normal</option>
                         <option value="HIGH">High</option>
                      </select>

                      <div className="relative">
                         <input
                            type="text"
                            placeholder="Find Work Order or Product..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="h-7 w-[280px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-indigo-500 transition-all placeholder-[#8d99a6]"
                         />
                         <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[13px] font-mono text-[#525c66]">{filteredJobs.length > 0 ? `Showing 1 - ${filteredJobs.length}` : '0 results'}</span>
                     <div className="flex border border-[#d1d8dd] rounded overflow-hidden">
                        <button className="h-7 px-2 bg-white hover:bg-[#f4f5f6] text-[#1c2126] border-r border-[#d1d8dd]"><ChevronLeft className="w-4 h-4"/></button>
                        <button className="h-7 px-2 bg-white hover:bg-[#f4f5f6] text-[#1c2126]"><ChevronRight className="w-4 h-4"/></button>
                     </div>
                  </div>
               </div>
            </div>

            {/* LIVE KPI MATRICES */}
            <div className="px-6 pt-5 grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
                <div className="bg-white p-4 border border-[#d1d8dd] rounded shadow-sm flex items-center justify-between">
                   <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Work Orders</p>
                      <h4 className="text-xl font-bold font-mono tracking-tight text-slate-800 mt-1">{jobs.length} Orders</h4>
                   </div>
                   <Activity className="w-8 h-8 text-indigo-400 opacity-60" />
                </div>
                <div className="bg-white p-4 border border-[#d1d8dd] rounded shadow-sm flex items-center justify-between">
                   <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">In-Progress Routing</p>
                      <h4 className="text-xl font-bold font-mono tracking-tight text-slate-800 mt-1">
                        {jobs.filter(j => j.status !== 'READY').length} Operational
                      </h4>
                   </div>
                   <Clock className="w-8 h-8 text-amber-400 opacity-60" />
                </div>
                <div className="bg-white p-4 border border-[#d1d8dd] rounded shadow-sm flex items-center justify-between">
                   <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Est Production Quantity</p>
                      <h4 className="text-xl font-bold font-mono tracking-tight text-slate-800 mt-1">
                        {jobs.reduce((s, j) => s + j.quantity, 0).toLocaleString()} PCS
                      </h4>
                   </div>
                   <Layers className="w-8 h-8 text-blue-400 opacity-60" />
                </div>
                <div className="bg-white p-4 border border-[#d1d8dd] rounded shadow-sm flex items-center justify-between">
                   <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Completed Stack</p>
                      <h4 className="text-xl font-bold font-mono tracking-tight text-slate-800 mt-1">
                        {jobs.filter(j => j.status === 'READY').length} Closed
                      </h4>
                   </div>
                   <CheckCircle2 className="w-8 h-8 text-emerald-400 opacity-60" />
                </div>
            </div>

            {/* ─── DETAILED LIST ─── */}
            <div className="flex-1 overflow-auto p-6">
               <div className="bg-white border border-[#d1d8dd] rounded shadow-md flex flex-col min-w-[950px] overflow-hidden">
                  {/* Table Header */}
                  <div className="flex items-center border-b border-[#d1d8dd] bg-[#fafbfc] px-5 py-3 text-xs text-[#525c66] select-none uppercase tracking-wider font-bold">
                     <div className="w-10">
                        <input type="checkbox" className="rounded border-[#d1d8dd] text-indigo-600 focus:ring-indigo-500 bg-white w-3.5 h-3.5 cursor-pointer"/>
                     </div>
                     <div className="w-32">Work Order ID</div>
                     <div className="w-56">Item Profile (BOM Ref)</div>
                     <div className="w-32">Stage Status</div>
                     <div className="w-36">Material Info</div>
                     <div className="w-48">Runway Convergence</div>
                     <div className="flex-1 text-right pr-6">Production magnitude</div>
                  </div>
                  
                  {/* Table Body */}
                  <div className="divide-y divide-[#d1d8dd]/60">
                     {filteredJobs.length === 0 && (
                        <div className="px-4 py-16 flex flex-col items-center justify-center text-[#525c66]">
                           <List className="w-10 h-10 text-slate-300 mb-2" />
                           <p className="text-sm font-semibold">No manufacturing work orders registered yet.</p>
                           <p className="text-xs text-slate-400 mt-1">Click Create Work Order to launch a production process.</p>
                        </div>
                     )}
                     {filteredJobs.map((job) => {
                        const isIssued = (job as any).materialsIssued;
                        return (
                           <div 
                             key={job.id} 
                             className="group flex items-center px-5 py-3.5 hover:bg-[#fafbfc] transition-colors cursor-pointer text-[13px] border-l-4 border-l-transparent hover:border-l-indigo-500" 
                             onClick={() => openForm(job)}
                           >
                              <div className="w-10" onClick={(e) => e.stopPropagation()}>
                                 <input 
                                   type="checkbox" 
                                   checked={checkedIds.has(job.id)}
                                   onChange={(e) => {
                                      const newSet = new Set(checkedIds);
                                      if(e.target.checked) newSet.add(job.id);
                                      else newSet.delete(job.id);
                                      setCheckedIds(newSet);
                                   }}
                                   className="rounded border-[#d1d8dd] text-indigo-600 focus:ring-indigo-500 bg-white w-3.5 h-3.5 cursor-pointer"
                                 />
                              </div>
                              <div className="w-32 font-mono font-bold text-slate-800">
                                   {job.id}
                              </div>
                              <div className="w-56 pr-4">
                                  <p className="font-bold text-[#1c2126] group-hover:text-indigo-600 transition-colors truncate">{job.productName}</p>
                                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">Style: {job.styleCode || 'DEFAULT-STYLE'}</p>
                              </div>
                              <div className="w-32">{getStatusBadge(job.status)}</div>
                              <div className="w-36">
                                 {isIssued ? (
                                    <span className="text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1 w-max">
                                       <CheckCircle2 className="w-3 h-3" /> Raw Issued
                                    </span>
                                 ) : (
                                    <span className="text-[10.5px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1 w-max">
                                       <Activity className="w-3 h-3" /> Stock Pending
                                    </span>
                                 )}
                              </div>
                              <div className="w-48 pr-6">
                                  <div className="flex items-center gap-2.5">
                                     <div className="h-2 flex-1 bg-slate-100 border border-slate-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 transition-all duration-300" style={{width: `${job.progress}%`}}></div>
                                     </div>
                                     <span className="text-xs font-mono font-bold text-slate-700">{job.progress}%</span>
                                  </div>
                              </div>
                              <div className="flex-1 pr-6 text-right font-black text-slate-800 tabular-nums">
                                 {job.quantity.toLocaleString()} PCS
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>
            </div>
           </div>
        ) : (
           <div className="flex flex-col h-full bg-[#f4f5f6]">
              {/* ─── FORM HEADER WITH ERPNEXT PROGRESS STEPPER ─── */}
              <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20 shadow-sm">
                <div className="flex justify-between items-center h-8">
                   <div className="flex items-center gap-3">
                      <button onClick={() => setViewMode('LIST')} className="h-7 w-7 flex items-center justify-center rounded hover:bg-[#f4f5f6] text-[#525c66] transition-colors">
                         <ArrowLeft className="w-4 h-4" />
                      </button>
                      <span className="text-lg text-[#1c2126] font-extrabold tracking-tight">
                         {formData.id ? `Work Order: ${formData.id}` : 'Create Blueprint Work Order'}
                      </span>
                      {formData.id && getStatusBadge(formData.erpStatus || 'DRAFT')}
                   </div>

                   {/* CORE STATE CONTROLS */}
                   <div className="flex items-center gap-2">
                      {formData.id && (formData.erpStatus === 'DRAFT' || !formData.erpStatus) && (
                         <button 
                            type="button" 
                            onClick={() => setJobForm(prev => ({ ...prev, erpStatus: 'SUBMITTED' }))}
                            className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[12.5px] font-bold shadow-sm transition-all"
                         >
                            <Check className="w-3.5 h-3.5" /> Submit Work Order
                         </button>
                      )}
                      
                      {formData.id && formData.erpStatus === 'SUBMITTED' && (
                         <button 
                            type="button" 
                            onClick={issueMaterialsEngine}
                            className="h-7 px-3 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 border border-transparent text-white rounded text-[12.5px] font-bold shadow-sm transition-all"
                         >
                            <Layers className="w-3.5 h-3.5" /> Issue Materials & Start
                         </button>
                      )}

                      {formData.id && formData.erpStatus === 'IN_PROGRESS' && (
                         <button 
                            type="button" 
                            onClick={() => logProductionFinished(Math.max(1, Math.round((formData.quantity || 120) * 0.1)))}
                            className="h-7 px-3 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 border border-transparent text-white rounded text-[12.5px] font-bold shadow-sm transition-all"
                         >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Log 10% Finished PCS
                         </button>
                      )}

                      {formData.id && onDeleteJob && (
                          <button 
                             type="button"
                             onClick={(e) => { e.preventDefault(); onDeleteJob(formData.id!); setViewMode('LIST'); }} 
                             className="h-7 px-2.5 flex items-center bg-white hover:bg-[#fef2f2] hover:text-[#ef4444] border border-[#d1d8dd] hover:border-[#ef4444] rounded text-[12.5px] text-[#1c2126] transition-colors shadow-sm"
                          >
                             <Trash2 className="w-3.5 h-3.5" />
                          </button>
                      )}
                      
                      <button type="button" onClick={() => setViewMode('LIST')} className="h-7 px-3 flex items-center bg-white border border-[#d1d8dd] rounded text-[12.5px] text-[#1c2126] hover:bg-[#fafbfc] shadow-sm">
                         Back
                      </button>
                      
                      <button onClick={() => handleSave()} className="h-7 px-4 flex items-center bg-indigo-600 hover:bg-indigo-700 border border-transparent text-white rounded text-[12.5px] font-medium shadow-sm transition-all">
                         <Save className="w-3.5 h-3.5 mr-1" /> Save Matrix
                      </button>
                   </div>
                </div>

                {/* ERPNext Multi-Level Action Steps Stepper */}
                {formData.id && (
                   <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-slate-100 text-xs">
                       <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mr-2">Lifecycle Stage:</span>
                       {[
                         { step: 'DRAFT', label: '1. Draft Blueprint' },
                         { step: 'SUBMITTED', label: '2. Ledger Approved' },
                         { step: 'IN_PROGRESS', label: '3. WIP Manufacturing' },
                         { step: 'COMPLETED', label: '4. Stock Transferred & Closed' }
                       ].map((st, i) => {
                          const isActive = formData.erpStatus === st.step;
                          const isDone = i < ['DRAFT', 'SUBMITTED', 'IN_PROGRESS', 'COMPLETED'].indexOf(formData.erpStatus || 'DRAFT');
                          return (
                             <React.Fragment key={st.step}>
                                {i > 0 && <span className="text-slate-300">➔</span>}
                                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10.5px] transition-all border ${isActive ? 'bg-indigo-600 text-white border-indigo-600' : isDone ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200/80'}`}>
                                   {st.label}
                                </span>
                             </React.Fragment>
                          );
                       })}
                   </div>
                )}
              </div>

              {/* TABS NAVIGATION BAR FOR WORK ORDER BLUEPRINT */}
              <div className="flex-none bg-white border-b border-[#d1d8dd] px-6">
                 <div className="flex gap-1.5">
                    {[
                      { id: 'DETAILS', label: 'Core Specs', icon: Settings },
                      { id: 'MATERIALS', label: 'Required Inputs (BOM)', icon: Layers, badge: batchRequirements.length },
                      { id: 'OPERATIONS', label: 'Routing Job Cards', icon: Hammer },
                      { id: 'BUNDLES', label: 'QR Bundle Tickets', icon: Printer },
                      { id: 'FINANCIALS', label: 'Financial Cost Rollups', icon: Coins }
                    ].map(tab => (
                       <button
                         key={tab.id}
                         type="button"
                         onClick={() => setActiveTab(tab.id as any)}
                         className={`px-4 py-3 text-[12px] font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${activeTab === tab.id ? 'border-indigo-600 text-indigo-700 bg-indigo-50/10' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                       >
                          <tab.icon className="w-3.5 h-3.5" />
                          {tab.label}
                          {tab.badge !== undefined && tab.badge > 0 && (
                            <span className="bg-indigo-100 text-indigo-700 rounded-full px-1.5 py-0.2 text-[10px] ml-0.5 font-bold">{tab.badge}</span>
                          )}
                       </button>
                    ))}
                 </div>
              </div>

              {/* ─── DETAILED FORM TAB MODULES ─── */}
              <div className="flex-1 overflow-auto p-6 flex justify-center pb-20">
                  <div className="w-full max-w-[950px] space-y-6">
                      
                      {/* TAB 1: DETAILS */}
                      {activeTab === 'DETAILS' && (
                         <div className="space-y-6 animate-fadeIn">
                             <WorkOrderConnections
                               salesOrderId={formData.salesOrderId || ''}
                               hasGeneratedMR={hasGeneratedMR}
                               stockEntries={stockEntries}
                               onGenerateMR={() => setHasGeneratedMR(true)}
                               currency={currency || '₹'}
                               qty={formData.quantity || 120}
                               productName={formData.productName || 'PRODUCT BLUEPRINT'}
                               timelineEvents={timelineEvents}
                               activePane={activeConnectionPane}
                               setActivePane={setActiveConnectionPane}
                               karigars={karigars}
                               karigarAssignments={karigarAssignments}
                               operationsCount={activeRoutingTemplate?.operations?.length || 5}
                             />
                         </div>
                      )}
                      {activeTab === 'DETAILS' && (
                         <div className="space-y-6 animate-fadeIn">
                             {/* Specifications Card */}
                             <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6">
                                 <h4 className="font-extrabold text-[#1c2126] text-sm mb-5 border-b border-slate-100 pb-2.5 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 font-bold">
                                       <Info className="w-4 h-4 text-indigo-600" /> ERPNext Core Manufacturing Specifications
                                    </span>
                                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 uppercase tracking-widest font-black font-mono">BOM: {formData.id || 'NEW ROUTE'}</span>
                                 </h4>
                                 
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
                                    {/* Left Column - Core Fields */}
                                    <div className="space-y-4">
                                        <div className="space-y-1.5 flex flex-col">
                                            <label className="text-xs text-[#525c66] font-bold flex items-center gap-1">
                                               <span>Target Finished Item / BOM Profile</span>
                                               <span className="text-[#ef4444]">*</span>
                                            </label>
                                            <div className="relative">
                                               <select 
                                                  required
                                                  disabled={!!formData.id}
                                                  value={formData.productName || ''} 
                                                  onChange={e => {
                                                    const name = e.target.value;
                                                    const design = designs.find(d => d.name === name);
                                                    setJobForm({
                                                      ...formData, 
                                                      productName: name,
                                                      styleCode: design?.sku || '',
                                                      routingTemplateId: design?.routingTemplateId || ''
                                                    });
                                                  }}
                                                  className="w-full px-3 py-[6.5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-indigo-500 text-[#1c2126] font-semibold appearance-none disabled:bg-slate-50 disabled:cursor-not-allowed text-xs"
                                               >
                                                   <option value="">Select BOM...</option>
                                                   {designs.map(d => <option key={d.id} value={d.name}>{d.name} ({d.sku || 'No SKU'})</option>)}
                                               </select>
                                               <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 flex flex-col">
                                            <label className="text-xs text-[#525c66] font-semibold">Reference Customer Sales Order (B2B)</label>
                                            <div className="relative">
                                               <select
                                                  value={formData.salesOrderId || ''}
                                                  onChange={e => setJobForm({...formData, salesOrderId: e.target.value, orderId: e.target.value})}
                                                  className="w-full px-3 py-[6.5px] bg-[#fdfdfd] border border-[#d1d8dd] text-xs rounded focus:outline-none focus:border-indigo-500 text-[#1c2126] appearance-none"
                                               >
                                                  <option value="">-- Standalone / Excess Stock Run --</option>
                                                  {orders.map(o => (
                                                     <option key={o.id} value={o.id}>{o.id} - {o.customerName || 'Direct Customer'} ({currency}{(o.totalAmount || 0).toLocaleString()})</option>
                                                  ))}
                                               </select>
                                               <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                           <div className="space-y-1.5 flex flex-col">
                                               <label className="text-xs text-[#525c66] font-bold">Planned Qty (PCS) <span className="text-[#ef4444] ml-0.5">*</span></label>
                                               <input 
                                                 type="number"
                                                 required
                                                 min={1}
                                                 value={formData.quantity || ''} 
                                                 onChange={e => setJobForm({...formData, quantity: Number(e.target.value)})}
                                                 placeholder="e.g. 150"
                                                 className="w-full px-3 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-indigo-500 text-xs text-[#1c2126] font-bold tabular-nums"
                                               />
                                           </div>
                                           <div className="space-y-1.5 flex flex-col">
                                               <label className="text-xs text-[#525c66] font-semibold">Planned Batch Code</label>
                                               <input 
                                                 type="text"
                                                 value={formData.batchNo || ''}
                                                 placeholder="e.g. BTC-DENIM-50"
                                                 onChange={e => setJobForm({...formData, batchNo: e.target.value})}
                                                 className="w-full px-3 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-indigo-500 text-xs text-[#1c2126]"
                                               />
                                           </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                           <div className="space-y-1.5 flex flex-col">
                                               <label className="text-xs text-[#525c66] font-semibold">Garment SKU Code</label>
                                               <input 
                                                 type="text"
                                                 value={formData.styleCode || ''}
                                                 placeholder="e.g. STY-KR-902"
                                                 onChange={e => setJobForm({...formData, styleCode: e.target.value})}
                                                 className="w-full px-3 py-[5px] bg-slate-50 border border-slate-200 text-slate-500 rounded text-xs"
                                               />
                                           </div>
                                           <div className="space-y-1.5 flex flex-col">
                                               <label className="text-xs text-[#525c66] font-semibold">Colorway Spec</label>
                                               <input 
                                                 type="text"
                                                 value={formData.color || ''}
                                                 placeholder="e.g. Ocean Sky Blue"
                                                 onChange={e => setJobForm({...formData, color: e.target.value})}
                                                 className="w-full px-3 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-indigo-500 text-xs text-[#1c2126]"
                                               />
                                           </div>
                                        </div>
                                    </div>

                                    {/* Right Column - Logistics & Schedules */}
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5 flex flex-col">
                                                <label className="text-xs text-[#525c66] font-semibold">Planned Start Date</label>
                                                <input 
                                                  type="date"
                                                  value={formData.startDate || ''} 
                                                  onChange={e => setJobForm({...formData, startDate: e.target.value})}
                                                  className="w-full px-3 py-[5px] bg-[#fdfdfd] text-xs border border-[#d1d8dd] rounded focus:outline-none focus:border-indigo-500 text-[#1c2126]"
                                                />
                                            </div>
                                            <div className="space-y-1.5 flex flex-col">
                                                <label className="text-xs text-[#525c66] font-semibold">Delivery Deadline</label>
                                                <input 
                                                  type="date"
                                                  value={formData.deadline || ''} 
                                                  onChange={e => setJobForm({...formData, deadline: e.target.value})}
                                                  className="w-full px-3 py-[5px] bg-[#fdfdfd] text-xs border border-[#d1d8dd] rounded focus:outline-none focus:border-indigo-500 text-[#1c2126]"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 flex flex-col">
                                            <label className="text-xs text-[#525c66] font-semibold">Source Raw Warehouse (BOM Sourcing)</label>
                                            <select
                                               value={formData.sourceWarehouse || 'Stores - Bhiwandi Godown'}
                                               onChange={e => setJobForm({...formData, sourceWarehouse: e.target.value})}
                                               className="w-full px-3 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] text-xs rounded focus:outline-none focus:border-indigo-500 text-[#1c2126]"
                                            >
                                               <option value="Stores - Bhiwandi Godown">Stores - Bhiwandi Godown (Central Raw Materials)</option>
                                               <option value="Yarn Godown - Ichalkaranji">Yarn Godown - Ichalkaranji (Threads & Cones)</option>
                                               <option value="Tiruppur Knit Depot">Tiruppur Knit Depot (Hosiery & Grey fabric)</option>
                                               <option value="Subcontract Dyeing Hub">Subcontract Dyeing Hub (Assigned supplier)</option>
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5 flex flex-col">
                                                <label className="text-xs text-[#525c66] font-semibold">WIP Warehouse</label>
                                                <select
                                                   value={formData.wipWarehouse || 'WIP Tailoring Shopfloor'}
                                                   onChange={e => setJobForm({...formData, wipWarehouse: e.target.value})}
                                                   className="w-full px-3 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] text-xs rounded focus:outline-none focus:border-indigo-500 text-[#1c2126]"
                                                >
                                                   <option value="WIP Tailoring Shopfloor">WIP Tailoring Shopfloor</option>
                                                   <option value="Cutting Floor Table B">Cutting Floor Table B</option>
                                                   <option value="Job Worker Finishing Deck">Job Worker Finishing Deck</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5 flex flex-col">
                                                <label className="text-xs text-[#525c66] font-semibold">Target FG Warehouse</label>
                                                <select
                                                   value={formData.targetWarehouse || 'Finished Goods Warehouse - TM'}
                                                   onChange={e => setJobForm({...formData, targetWarehouse: e.target.value})}
                                                   className="w-full px-3 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] text-xs rounded focus:outline-none focus:border-indigo-500 text-[#1c2126]"
                                                >
                                                   <option value="Finished Goods Warehouse - TM">Finished Goods Warehouse - TM</option>
                                                   <option value="Surat Retail Outlet Stock">Surat Retail Outlet Stock</option>
                                                   <option value="Central E-Commerce Hub">Central E-Commerce Hub</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                           <div className="space-y-1.5 flex flex-col">
                                               <label className="text-xs text-[#525c66] font-semibold flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 text-amber-500"/> Urgency Priority</label>
                                               <select 
                                                  value={formData.priority || 'NORMAL'} 
                                                  onChange={e => setJobForm({...formData, priority: e.target.value as any})}
                                                  className="w-full px-3 py-[6.5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none text-xs focus:border-indigo-500 text-[#1c2126] font-semibold"
                                               >
                                                   <option value="LOW">Low (Flexible Queue)</option>
                                                   <option value="NORMAL">Normal (Standard Run)</option>
                                                   <option value="HIGH">High (SLA Priority Surcharge)</option>
                                               </select>
                                           </div>
                                           <div className="space-y-1.5 flex flex-col">
                                               <label className="text-xs text-[#525c66] font-semibold">Fabric Lot Reference No</label>
                                               <input 
                                                 type="text"
                                                 value={formData.fabricLot || ''}
                                                 placeholder="e.g. LOT-2026-A"
                                                 onChange={e => setJobForm({...formData, fabricLot: e.target.value})}
                                                 className="w-full px-3 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-indigo-500 text-xs text-[#1c2126]"
                                               />
                                           </div>
                                        </div>
                                    </div>
                                 </div>

                                 {/* ERPNext Work Order Options Checklist */}
                                 <div className="mt-6 pt-5 border-t border-slate-100">
                                    <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">ERPNext Sourcing Policies & Checklist</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <label className="flex items-start gap-2 p-2.5 rounded border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                                           <input 
                                             type="checkbox"
                                             checked={!!formData.skipMaterialTransfer}
                                             onChange={e => setJobForm({...formData, skipMaterialTransfer: e.target.checked})}
                                             className="rounded border-[#d1d8dd] text-indigo-600 focus:ring-indigo-500 mt-0.5 cursor-pointer text-xs"
                                           />
                                           <div>
                                              <p className="text-xs font-bold text-slate-800">Skip Material Transfer</p>
                                              <p className="text-[10px] text-slate-400 font-medium">Ignore direct store ledger deductions (Use this for subcontracting direct labor)</p>
                                           </div>
                                        </label>

                                        <label className="flex items-start gap-2 p-2.5 rounded border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                                           <input 
                                             type="checkbox"
                                             checked={formData.backflushMaterials !== false}
                                             onChange={e => setJobForm({...formData, backflushMaterials: e.target.checked})}
                                             className="rounded border-[#d1d8dd] text-indigo-600 focus:ring-indigo-500 mt-0.5 cursor-pointer text-xs"
                                           />
                                           <div>
                                              <p className="text-xs font-bold text-slate-800">Backflush Materials On Finish</p>
                                              <p className="text-[10px] text-slate-400 font-medium">Auto-deduct raw inventory quantities based in matching finished sizes</p>
                                           </div>
                                        </label>

                                        <label className="flex items-start gap-2 p-2.5 rounded border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                                           <input 
                                             type="checkbox"
                                             checked={!!formData.allowExcessConsumption}
                                             onChange={e => setJobForm({...formData, allowExcessConsumption: e.target.checked})}
                                             className="rounded border-[#d1d8dd] text-indigo-600 focus:ring-indigo-500 mt-0.5 cursor-pointer text-xs"
                                           />
                                           <div>
                                              <p className="text-xs font-bold text-slate-800">Allow Excess Consumption</p>
                                              <p className="text-[10px] text-slate-400 font-medium">Bypass strict warnings on textile waste during cutting or dye bath</p>
                                           </div>
                                        </label>
                                    </div>
                                 </div>
                                 
                                 {/* Size-wise Breakdown */}
                                  <div className="mt-6 border-t border-[#d1d8dd]/60 pt-5">
                                     <div className="flex justify-between items-center mb-4">
                                        <h5 className="text-[12px] font-extrabold text-[#1c2126] uppercase tracking-wider flex items-center gap-1.5">
                                           <List className="w-4 h-4 text-indigo-600" /> Size-wise Production Distribution
                                        </h5>
                                        <button
                                           type="button"
                                           onClick={() => {
                                              const qty = formData.quantity || 120;
                                              const sizeRationals = {
                                                 'S': Math.round(qty * 0.15),
                                                 'M': Math.round(qty * 0.35),
                                                 'L': Math.round(qty * 0.35),
                                                 'XL': Math.round(qty * 0.10),
                                                 'XXL': Math.max(0, qty - (Math.round(qty * 0.15) + Math.round(qty * 0.35) + Math.round(qty * 0.35) + Math.round(qty * 0.10))),
                                                 'XXXL': 0
                                              };
                                              setJobForm({...formData, sizeWise: sizeRationals});
                                           }}
                                           className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-all flex items-center gap-1"
                                        >
                                           <RefreshCw className="w-3 h-3" /> Auto-Distribute (Standard 15:35:35:10 Curve)
                                        </button>
                                     </div>
                                     <div className="flex gap-4">
                                        {['S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map(size => (
                                           <div key={size} className="flex-1 flex flex-col space-y-1.5">
                                              <label className="text-xs text-slate-500 text-center font-bold">{size}</label>
                                              <input 
                                                 type="number" 
                                                 placeholder="0"
                                                 value={formData.sizeWise?.[size] || ''}
                                                 onChange={e => setJobForm({
                                                   ...formData, 
                                                   sizeWise: { ...(formData.sizeWise || {}), [size]: Number(e.target.value) }
                                                 })}
                                                 className="w-full px-2.5 py-1 text-xs bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-indigo-500 text-center font-bold text-slate-800"
                                              />
                                           </div>
                                        ))}
                                     </div>
                                     <p className="text-[11px] text-slate-400 mt-3 text-right font-medium">ERP standard: size sum should converge to planned quantity ({formData.quantity || 0} PCS).</p>
                                  </div>
                             </div>
                         </div>
                      )}

                      {/* TAB 2: MATERIALS */}
                      {activeTab === 'MATERIALS' && (
                         <div className="space-y-6 animate-fadeIn">
                            {/* Materials Main Board */}
                            <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5 border-b border-slate-100 pb-4">
                                    <div>
                                       <h4 className="font-extrabold text-[#1c2126] text-sm flex items-center gap-1.5">
                                          <Layers className="w-4 h-4 text-indigo-600" /> Component Materials Transfer & Bill of Materials (BOM)
                                       </h4>
                                       <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider font-extrabold">Warehouse Stock Control: {formData.sourceWarehouse || 'Central Stores'} ➔ {formData.wipWarehouse || 'WIP Floor'}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                       {!formData.materialsIssued ? (
                                          <button 
                                            type="button"
                                            onClick={issueMaterialsEngine}
                                            disabled={batchRequirements.some(req => {
                                               const hashVal = req.materialName.charCodeAt(0) + req.materialName.charCodeAt(req.materialName.length - 1);
                                               const isAvailable = hasGeneratedMR || hashVal % 2 === 0;
                                               return !isAvailable;
                                            })}
                                            className="h-7 px-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded transition-all flex items-center gap-1 shadow-sm"
                                          >
                                             <Check className="w-3.5 h-3.5" /> Auto-Issue All Materials to WIP
                                          </button>
                                       ) : (
                                          <div className="px-3 py-1 font-bold text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded flex items-center gap-1 shadow-sm">
                                             <CheckCircle2 className="w-3.5 h-3.5" /> All Materials Transferred to WIP
                                          </div>
                                       )}
                                    </div>
                                </div>

                                {/* Shortfall Alert Controller and Material Request Generator */}
                                {(() => {
                                   const shortfalls = batchRequirements.filter(req => {
                                      const hashVal = req.materialName.charCodeAt(0) + req.materialName.charCodeAt(req.materialName.length - 1);
                                      const isAvailable = hasGeneratedMR || hashVal % 2 === 0;
                                      return !isAvailable;
                                   });
                                   
                                   if (shortfalls.length > 0) {
                                      return (
                                         <div className="mb-6 p-4 bg-amber-50 rounded border border-amber-200 text-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                            <div className="space-y-1">
                                               <p className="font-extrabold text-amber-800 flex items-center gap-1.5">
                                                  <AlertCircle className="w-4 h-4 text-amber-600" /> ERPNext Stock Shortage Warning
                                               </p>
                                               <p className="text-slate-600 font-medium">
                                                  Selected BOM contains {shortfalls.length} raw material indices with deficient quantities in <strong>{formData.sourceWarehouse}</strong>.
                                               </p>
                                               <ul className="list-disc pl-5 text-[11px] text-amber-950 font-semibold space-y-0.5 mt-1.5">
                                                  {shortfalls.map((sh, idx) => {
                                                     const totalRequired = sh.totalRequired;
                                                     const mockAvailable = Math.round(totalRequired * 0.6);
                                                     const diff = totalRequired - mockAvailable;
                                                     return (
                                                        <li key={idx}>
                                                           Deficiency of {diff.toLocaleString()} {sh.unit} for "{sh.materialName}" (Required: {totalRequired} | Available: {mockAvailable})
                                                        </li>
                                                     );
                                                  })}
                                               </ul>
                                            </div>
                                            <button
                                               type="button"
                                               onClick={() => setHasGeneratedMR(true)}
                                               className="py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded transition-all shadow-sm shrink-0 uppercase tracking-wider"
                                            >
                                               Generate Purchase Material Request
                                            </button>
                                         </div>
                                      );
                                   } else if (hasGeneratedMR) {
                                      return (
                                         <div className="mb-6 p-4 bg-emerald-50 rounded border border-emerald-200 text-xs text-slate-700 font-semibold space-y-1 animate-fadeIn">
                                            <p className="text-emerald-700 font-black flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                                               <Check className="w-4 h-4 text-emerald-600" /> Double-Referenced Material Request Generated
                                            </p>
                                            <p className="text-slate-600">
                                               Material Request <strong>MR-2026-0001</strong> generated for raw shortages is approved. Stores inventory levels have been virtually replenished and allocation-locked for this Work Order.
                                            </p>
                                         </div>
                                      );
                                   }
                                   return null;
                                })()}

                                {batchRequirements.length > 0 ? (
                                   <div className="border border-slate-200/80 rounded overflow-hidden">
                                      <table className="w-full text-left border-collapse">
                                         <thead>
                                            <tr className="bg-slate-100 text-[10px] text-slate-500 font-bold uppercase border-b border-slate-200">
                                               <th className="py-2.5 pl-3">Raw Material / Trim</th>
                                               <th className="py-2.5 px-3 text-right">Target required Quantity</th>
                                               <th className="py-2.5 px-3 text-right">Warehouse stock Balance</th>
                                               <th className="py-2.5 px-3 text-center">Status</th>
                                               <th className="py-2.5 pr-4 text-right">Estimated Cost value</th>
                                            </tr>
                                         </thead>
                                         <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                                            {batchRequirements.map((req, i) => {
                                               const totalRequired = req.totalRequired;
                                               const valCost = totalRequired * (req.estimatedCost || 50);
                                               
                                               // Determinate stock metrics
                                               const hashVal = req.materialName.charCodeAt(0) + req.materialName.charCodeAt(req.materialName.length - 1);
                                               const isAvailable = hasGeneratedMR || hashVal % 2 === 0;
                                               const mockLocalAvailable = isAvailable ? totalRequired + 50 : Math.round(totalRequired * 0.6);
                                               const hasDeficiency = mockLocalAvailable < totalRequired;

                                               return (
                                                  <tr key={i} className={`hover:bg-slate-50/50 ${hasDeficiency ? 'bg-amber-50/20' : ''}`}>
                                                     <td className="py-3 pl-3 font-bold text-slate-800">
                                                        <span className="block">{req.materialName}</span>
                                                        <span className="text-[10px] font-mono font-medium text-slate-400 uppercase">Unit: {req.unit} (index rate: {currency}{req.estimatedCost || 50})</span>
                                                     </td>
                                                     <td className="py-3 px-3 text-right text-indigo-700 font-extrabold tabular-nums">{totalRequired.toLocaleString()} {req.unit}</td>
                                                     <td className="py-3 px-3 text-right tabular-nums">
                                                        <span className={`${hasDeficiency ? 'text-amber-600 font-bold' : 'text-slate-600 font-medium'}`}>{mockLocalAvailable.toLocaleString()} {req.unit}</span>
                                                     </td>
                                                     <td className="py-3 px-3 text-center">
                                                        {formData.materialsIssued ? (
                                                           <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase tracking-widest font-mono">Issued to WIP</span>
                                                        ) : hasDeficiency ? (
                                                           <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-widest leading-none">In Shortage</span>
                                                        ) : (
                                                           <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 uppercase tracking-widest leading-none">In Stock</span>
                                                        )}
                                                     </td>
                                                     <td className="py-3 pr-4 text-right font-bold text-slate-800 tabular-nums">{currency}{valCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2})}</td>
                                                  </tr>
                                               );
                                            })}
                                            <tr className="bg-indigo-50/10 font-bold border-t border-indigo-100 text-slate-800">
                                               <td colSpan={4} className="py-2.5 pl-3 text-right text-[10px] uppercase font-bold text-slate-500">Accumulated Raw Stores Ledger cost:</td>
                                               <td className="py-2.5 pr-4 text-right text-sm text-indigo-700 tabular-nums">{currency}{costingSummary.estimatedMaterial.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                                            </tr>
                                         </tbody>
                                      </table>
                                   </div>
                                ) : (
                                   <div className="py-12 border-2 border-dashed border-slate-200/80 rounded-lg text-center text-slate-400 bg-[#fafbfc]">
                                      <Layers className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                                      <p className="font-semibold text-xs">No Recipe materials could be fetched.</p>
                                      <p className="text-[11px] text-slate-400 mt-1">Select a Standard Design BOM in settings to project store transfers automatically.</p>
                                   </div>
                                )}
                            </div>
                         </div>
                      )}

                      {/* TAB 3: OPERATIONS */}
                      {activeTab === 'OPERATIONS' && (
                         <div className="space-y-6 animate-fadeIn">
                             <WorkOrderJobCards
                               operations={formData.operations || activeRoutingTemplate?.operations || []}
                               activeTimerOpIndex={activeTimerOpIndex}
                               timerSeconds={timerSeconds}
                               onStartTimer={(idx) => setActiveTimerOpIndex(idx)}
                               onStopTimer={() => {
                                 if (activeTimerOpIndex !== null) {
                                   setJobForm(prev => ({
                                     ...prev,
                                     actualLaborCosts: (prev.actualLaborCosts || 0) + (timerSeconds * 0.1)
                                   }));
                                   setActiveTimerOpIndex(null);
                                 }
                               }}
                               karigars={karigars}
                               karigarAssignments={karigarAssignments}
                               onAssignKarigar={(idx, id) => setKarigarAssignments(prev => ({ ...prev, [idx]: id }))}
                               currency={currency || '₹'}
                               qty={formData.quantity || 120}
                               onSignOffOperation={handleSignOffOperation}
                               signedOffOps={signedOffOps[formData.id || 'draft-new'] || {}}
                             />
                         </div>
                      )}

                      {/* TAB 4: BUNDLES */}
                      {activeTab === 'BUNDLES' && (
                         <div className="space-y-6 animate-fadeIn">
                             <WorkOrderPrintDesk
                               formData={formData}
                               qty={formData.quantity || 120}
                             />
                         </div>
                      )}

                      {/* OLD TAB 4: DEEP HIDDENS */}
                      {activeTab === 'BUNDLES' && false && (
                         <div className="space-y-6">
                            <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6">
                                <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
                                    <div>
                                       <h4 className="font-extrabold text-sm text-[#1c2126] flex items-center gap-1.5">
                                          <Printer className="w-4 h-4 text-indigo-600" /> Bundle Tracking Tickets & QR Identifiers
                                       </h4>
                                       <p className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-widest font-black">Scan tickets at each workstation table to capture time logs</p>
                                    </div>
                                    <button 
                                      type="button"
                                      onClick={() => alert("Connecting to label printer... Print Job sent for " + (formData.quantity || 120) + " pieces.")}
                                      className="h-7 px-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-all flex items-center gap-1.5 shadow-sm"
                                    >
                                       <Printer className="w-3.5 h-3.5" /> Print Barcode Labels
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                   {['S-001', 'M-002', 'L-003', 'XL-004'].map((bcode, i) => {
                                      const bundleSz = i === 0 ? 30 : i === 1 ? 50 : 40;
                                      return (
                                         <div key={bcode} className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col justify-between h-[150px] relative">
                                            <div>
                                               <div className="flex justify-between items-start">
                                                  <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 rounded px-1.5 font-bold uppercase">Bundle Ticket</span>
                                                  <span className="text-xs font-bold font-mono text-slate-400">Qty: {bundleSz} PCS</span>
                                               </div>
                                               <p className="mt-3 font-black text-slate-800 text-sm">{formData.productName || 'PRODUCT BLUEPRINT'}</p>
                                               <p className="text-[10px] text-slate-500 font-bold mt-1">Batch Key ID: {formData.id || 'JOB-001'} (Size: {bcode.split('-')[0]})</p>
                                            </div>

                                            <div className="border-t border-slate-200/60 pt-2.5 flex items-center justify-between">
                                               <div>
                                                  <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Scannable ID</p>
                                                  <p className="text-[11px] font-mono font-bold text-indigo-600">{formData.id || 'JOB'}-{bcode}</p>
                                               </div>
                                               {/* Simulated Barcode */}
                                               <div className="flex flex-col items-end gap-[1px]">
                                                   <div className="flex gap-[1.5px]">
                                                      {[4,2,3,1,5,2,4,1,3,2,6,1,4,2,3,1,5].map((w, idx) => (
                                                         <div key={idx} className="bg-slate-800 h-6" style={{ width: `${w}px` }}></div>
                                                      ))}
                                                   </div>
                                                   <span className="text-[8px] font-mono text-slate-500 font-bold">ERP-*TXB-{bcode}*</span>
                                               </div>
                                            </div>
                                         </div>
                                      );
                                   })}
                                </div>
                            </div>
                         </div>
                      )}

                      {/* TAB 5: FINANCIALS */}
                      {activeTab === 'FINANCIALS' && (
                         <div className="space-y-6 animate-fadeIn">
                             <WorkOrderFinancials
                               formData={formData}
                               currency={currency || '₹'}
                               selectedDesign={selectedDesign}
                               operationsCount={activeRoutingTemplate?.operations?.length || 5}
                             />
                         </div>
                      )}

                      {/* OLD TAB 5: DEEP HIDDENS */}
                      {activeTab === 'FINANCIALS' && false && (
                         <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                               <div className="bg-white border border-slate-200 rounded p-4 flex justify-between items-center shadow-sm">
                                  <div>
                                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Estimated Material Budget</p>
                                     <h3 className="text-lg font-bold font-mono text-slate-800 mt-1">{currency}{costingSummary.estimatedMaterial.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</h3>
                                  </div>
                                  <Coins className="w-8 h-8 text-indigo-400 opacity-60" />
                               </div>
                               <div className="bg-white border border-slate-200 rounded p-4 flex justify-between items-center shadow-sm">
                                  <div>
                                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Estimated Labor Operating cost</p>
                                     <h3 className="text-lg font-bold font-mono text-slate-800 mt-1">{currency}{costingSummary.estimatedLabor.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</h3>
                                  </div>
                                  <Hammer className="w-8 h-8 text-emerald-400 opacity-60" />
                               </div>
                               <div className="bg-white border border-slate-200 rounded p-4 flex justify-between items-center shadow-sm">
                                  <div>
                                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ERP Total Landed Estimate</p>
                                     <h3 className="text-lg font-bold font-mono text-[#2490ef] mt-1">{currency}{costingSummary.estimatedTotal.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</h3>
                                  </div>
                                  <TrendingUp className="w-8 h-8 text-blue-400 opacity-60" />
                               </div>
                            </div>

                            <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                               <div>
                                  <h4 className="font-extrabold text-[#1c2126] text-sm mb-4">Total Cost Projection Matrix</h4>
                                  <div className="h-60">
                                     <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                          data={[
                                            { name: 'Estimated', Material: costingSummary.estimatedMaterial, Labor: costingSummary.estimatedLabor },
                                            { name: 'Actual WIP', Material: costingSummary.actualMaterial, Labor: costingSummary.actualLabor }
                                          ]}
                                        >
                                           <XAxis dataKey="name" stroke="#525c66" fontSize={11} fontWeight="bold" />
                                           <YAxis stroke="#525c66" fontSize={11} />
                                           <Tooltip />
                                           <Legend verticalAlign="top" height={36}/>
                                           <Bar dataKey="Material" fill="#2490ef" stackId="a" radius={[0, 0, 0, 0]} />
                                           <Bar dataKey="Labor" fill="#ff9f1c" stackId="a" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                     </ResponsiveContainer>
                                  </div>
                               </div>

                               <div className="flex flex-col justify-between">
                                  <div>
                                     <h4 className="font-extrabold text-[#1c2126] text-sm mb-4 border-b pb-2">Financial Breakdown Details</h4>
                                     <table className="w-full text-xs font-semibold text-slate-700 leading-6">
                                        <tbody>
                                           <tr className="border-b border-slate-100">
                                              <td className="text-slate-500">Material Cost Index</td>
                                              <td className="text-right tabular-nums">{currency}{costingSummary.estimatedMaterial.toLocaleString()}</td>
                                           </tr>
                                           <tr className="border-b border-slate-100">
                                              <td className="text-slate-500">Labor Operation Routing Budget</td>
                                              <td className="text-right tabular-nums">{currency}{costingSummary.estimatedLabor.toLocaleString()}</td>
                                           </tr>
                                           <tr className="border-b border-slate-100">
                                              <td className="text-slate-500">Actual WIP Materials Sourced</td>
                                              <td className="text-right font-bold text-indigo-600 tabular-nums">{currency}{costingSummary.actualMaterial.toLocaleString()}</td>
                                           </tr>
                                           <tr className="border-b border-zinc-100 font-bold">
                                              <td className="text-slate-800">Actual Labor Timer Costs</td>
                                              <td className="text-right text-emerald-600 tabular-nums">{currency}{costingSummary.actualLabor.toLocaleString()}</td>
                                           </tr>
                                        </tbody>
                                     </table>
                                  </div>

                                  <div className="bg-slate-50 border border-slate-200 rounded p-4 font-semibold text-xs text-slate-600 leading-relaxed mt-4">
                                     <div className="flex items-start gap-1.5 text-indigo-700 font-bold">
                                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>Cost Rollup Information Log:</span>
                                     </div>
                                     <p className="mt-1 ml-5">
                                        The actual manufacturing costs are dynamically calculated based on stock transfers out of the warehouse ledger and actual workstation hours logged under the Timesheets tab.
                                     </p>
                                  </div>
                               </div>
                            </div>
                         </div>
                      )}
                  </div>
              </div>
           </div>
        )}

        <WorkOrderStockModals
          isOpen={stockEntryModalMode !== null}
          mode={stockEntryModalMode}
          onClose={() => setStockEntryModalMode(null)}
          formData={formData}
          batchRequirements={batchRequirements}
          currency={currency || '₹'}
          onTransferSubmit={handleTransferSubmit}
          onManufactureSubmit={handleManufactureSubmit}
        />
    </div>
  );
};
export default ProductionJobs;
