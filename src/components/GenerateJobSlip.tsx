import React, { useState, useMemo } from 'react';
import { uuidShort } from "../utils/uuid";
import { 
  Printer, Play, CheckSquare, ChevronRight, 
  Clock, AlertCircle, Coins, Scissors, HelpCircle, Save, Check, Ban
} from 'lucide-react';
import { ProductionJob, Machine, Karigar, GarmentWorkOrderOperation, ProductionLog, KarigarLedgerEntry } from '../types';

interface JobCardProps {
  jobs: ProductionJob[];
  workstations: Machine[];
  karigars: Karigar[];
  onUpdateJob: (job: ProductionJob) => void;
  onUpdateKarigar?: (karigar: Karigar) => void;
  currency?: string;
}

const DEFAULT_ROUTE_OPTIONS = [
  {
    id: 'ROUTE-KURTI-STD',
    name: 'Kurti Standard Route',
    operations: [
      { id: 'OP-FABRIC-ISSUE', name: 'Fabric Issue', stage: 'CUTTING', processType: 'IN_HOUSE', workstationType: 'Store', plannedHours: 1, defaultRate: 5, qualityCheckpoint: false },
      { id: 'OP-CUTTING', name: 'Panel Cutting', stage: 'CUTTING', processType: 'IN_HOUSE', workstationType: 'Cutting Table', plannedHours: 4, defaultRate: 15, qualityCheckpoint: true },
      { id: 'OP-EMBROIDERY', name: 'Embroidery / Print', stage: 'JOBWORK', processType: 'JOB_WORK', workstationType: 'Vendor', plannedHours: 24, defaultRate: 40, qualityCheckpoint: true },
      { id: 'OP-STITCHING', name: 'Stitching', stage: 'STITCHING', processType: 'IN_HOUSE', workstationType: 'Stitching Line', plannedHours: 8, defaultRate: 35, qualityCheckpoint: true },
      { id: 'OP-FINISHING', name: 'Thread Cutting & Finishing', stage: 'FINISHING', processType: 'IN_HOUSE', workstationType: 'Finishing Table', plannedHours: 3, defaultRate: 10, qualityCheckpoint: true },
      { id: 'OP-PACKING', name: 'Pressing & Packing', stage: 'READY', processType: 'IN_HOUSE', workstationType: 'Packing', plannedHours: 2, defaultRate: 8, qualityCheckpoint: false },
    ]
  },
  {
    id: 'ROUTE-SAREE-STD',
    name: 'Saree Standard Route',
    operations: [
      { id: 'OP-SAREE-WEAVING', name: 'Weaving & Border', stage: 'CUTTING', processType: 'IN_HOUSE', workstationType: 'Loom', plannedHours: 12, defaultRate: 80, qualityCheckpoint: true },
      { id: 'OP-SAREE-DYEING', name: 'Dyeing & Washing', stage: 'JOBWORK', processType: 'JOB_WORK', workstationType: 'Dyeing Vendor', plannedHours: 48, defaultRate: 50, qualityCheckpoint: true },
      { id: 'OP-SAREE-FINISHING', name: 'Zari Finishing & Packing', stage: 'FINISHING', processType: 'IN_HOUSE', workstationType: 'Finishing Table', plannedHours: 6, defaultRate: 25, qualityCheckpoint: true },
    ]
  }
];

const GenerateJobSlip: React.FC<JobCardProps> = ({ 
  jobs, workstations, karigars, onUpdateJob, onUpdateKarigar, currency = '₹' 
}) => {
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedOperationId, setSelectedOperationId] = useState('');
  const [selectedWorkstationId, setSelectedWorkstationId] = useState('');
  const [assignedKarigarId, setAssignedKarigarId] = useState('');
  const [completedQty, setCompletedQty] = useState<number>(0);
  const [rejectedQty, setRejectedQty] = useState<number>(0);
  const [wasteQty, setWasteQty] = useState<number>(0); // waste produced in kg
  const [customPieceRate, setCustomPieceRate] = useState<number>(0);
  const [routingTemplateId, setRoutingTemplateId] = useState('');
  
  const [isTracing, setIsTracing] = useState(false);
  const [startTime, setStartTime] = useState<string | null>(null);
  
  // Custom interactive notification toast
  const [alertInfo, setAlertInfo] = useState<{
    show: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  const selectedJob = useMemo(() => jobs.find(j => j.id === selectedJobId), [jobs, selectedJobId]);

  const activeOperations = useMemo(() => {
    return selectedJob?.operations || [];
  }, [selectedJob]);

  const selectedOperation = useMemo(() => {
    return activeOperations.find(op => op.id === selectedOperationId);
  }, [activeOperations, selectedOperationId]);

  // Handle Work Order selection change
  const handleJobChange = (jobId: string) => {
    setSelectedJobId(jobId);
    setSelectedOperationId('');
    setAssignedKarigarId('');
    setSelectedWorkstationId('');
    setStartTime(null);
    setIsTracing(false);
    
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      setCompletedQty(job.quantity);
    } else {
      setCompletedQty(0);
    }
    setRejectedQty(0);
    setWasteQty(0);
    setCustomPieceRate(0);
  };

  // Handle Operation selection change
  const handleOperationChange = (opId: string) => {
    setSelectedOperationId(opId);
    const op = activeOperations.find(o => o.id === opId);
    if (op) {
      setCustomPieceRate(op.defaultRate || 0);
      
      // Attempt to auto-prefill matching workstation
      const matchingWs = workstations.find(w => w.type.toLowerCase() === op.stage.toLowerCase() || w.name.toLowerCase().includes(op.workstationType?.toLowerCase() || ''));
      if (matchingWs) {
        setSelectedWorkstationId(matchingWs.id);
      } else {
        setSelectedWorkstationId('');
      }
    } else {
      setCustomPieceRate(0);
    }
  };

  // Initialize Routing on the selected Work Order if none exist
  const handleInitializeRouting = () => {
    if (!selectedJob || !routingTemplateId) return;
    const selectedTemplate = DEFAULT_ROUTE_OPTIONS.find(t => t.id === routingTemplateId);
    if (!selectedTemplate) return;

    // Build the apparel operations
    if (!selectedTemplate.operations?.length) return;
    const preparedOps: GarmentWorkOrderOperation[] = (selectedTemplate.operations || []).map(op => ({
      id: `${op.id}-${uuidShort(8)}`,
      name: op.name,
      stage: op.stage,
      processType: op.processType as any,
      workstationType: op.workstationType,
      defaultRate: op.defaultRate,
      plannedHours: op.plannedHours,
      qualityCheckpoint: op.qualityCheckpoint,
      status: 'PENDING',
      completedQuantity: 0,
      rejectedQuantity: 0
    }));

    onUpdateJob({
      ...selectedJob,
      routingTemplateId: selectedTemplate.id,
      operations: preparedOps,
      progress: 0,
      updatedAt: new Date().toISOString()
    });

    setAlertInfo({
      show: true,
      type: 'success',
      title: 'Routing Initialized',
      message: `Successfully loaded ${preparedOps.length} manufacturing process steps for ${selectedJob.productName}.`
    });
  };

  // Start operation tracking
  const handleStartTracking = () => {
    if (!selectedJob || !selectedOperationId) return;

    const updatedOps = activeOperations.map(op => {
      if (op.id === selectedOperationId) {
        return { ...op, status: 'IN_PROGRESS' as const, assignedTo: assignedKarigarId || undefined };
      }
      return op;
    });

    onUpdateJob({
      ...selectedJob,
      operations: updatedOps,
      progress: Math.max(selectedJob.progress || 0, 5),
      updatedAt: new Date().toISOString()
    });

    setStartTime(new Date().toLocaleTimeString());
    setIsTracing(true);

    setAlertInfo({
      show: true,
      type: 'success',
      title: 'Session Started',
      message: `Operation "${selectedOperation?.name}" is now IN PROGRESS.`
    });
  };

  // Confirm and Complete piecework session
  const handleCompleteTracking = () => {
    if (!selectedJob || !selectedOperation || !assignedKarigarId) {
      setAlertInfo({
        show: true,
        type: 'error',
        title: 'Validation Error',
        message: 'Please ensure a Karigar is assigned to credit wages, and Completed Qty is set.'
      });
      return;
    }

    const currentQtyCompleted = Number(completedQty || 0);
    const currentQtyRejected = Number(rejectedQty || 0);
    const currentWasteQty = Number(wasteQty || 0);
    const resolvedRate = customPieceRate || selectedOperation.defaultRate || 0;
    const earnedWages = currentQtyCompleted * resolvedRate;

    // 1. Credit the Karigar's ledger & updated balance
    const assignedKarigar = karigars.find(k => k.id === assignedKarigarId);
    if (assignedKarigar && onUpdateKarigar) {
      const newLedgerEntry: KarigarLedgerEntry = {
        id: `TXN-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        type: 'WORK_RECEIVED',
        description: `Completed operation - ${selectedOperation.name} on Work Order ${selectedJob.id} (${currentQtyCompleted} pcs @ ${currency}${resolvedRate}/pc | Rejects: ${currentQtyRejected} pcs | Scrap: ${currentWasteQty} kg)`,
        amount: earnedWages,
        quantity: currentQtyCompleted,
        rate: resolvedRate,
        updatedAt: new Date().toISOString()
      };

      const updatedKarigar: Karigar = {
        ...assignedKarigar,
        balance: (assignedKarigar.balance || 0) + earnedWages,
        ledger: [newLedgerEntry, ...(assignedKarigar.ledger || [])]
      };

      onUpdateKarigar(updatedKarigar);
    }

    // 2. Track Production & Waste log on the Work Order
    const newJobLog: ProductionLog = {
      id: `PLOG-${Date.now()}`,
      jobId: selectedJob.id,
      machineId: selectedWorkstationId || 'HANDWORK',
      operatorId: assignedKarigarId,
      quantityProduced: currentQtyCompleted,
      wasteProduced: currentWasteQty,
      timestamp: new Date().toISOString(),
      efficiency: 95
    };

    // 3. Update Operation status to COMPLETED
    const updatedOps = activeOperations.map(op => {
      if (op.id === selectedOperationId) {
        return { 
          ...op, 
          status: 'COMPLETED' as const, 
          completedQuantity: currentQtyCompleted,
          rejectedQuantity: currentQtyRejected,
          completedAt: new Date().toISOString(),
          assignedTo: assignedKarigarId
        };
      }
      return op;
    });

    // 4. Calculate weighted total work order progress
    const totalOps = updatedOps.length;
    const completedOps = updatedOps.filter(o => o.status === 'COMPLETED').length;
    let newProgress = totalOps > 0 ? Math.round((completedOps / totalOps) * 100) : 0;

    // Is the last operation or all operations complete?
    let finalStatus = selectedJob.status;
    if (completedOps === totalOps) {
      finalStatus = 'READY';
      newProgress = 100;
    } else {
      // Transition step status based on current active operation stage
      const currentOpStage = selectedOperation.stage;
      if (['CUTTING', 'JOBWORK', 'STITCHING', 'FINISHING'].includes(currentOpStage)) {
        finalStatus = currentOpStage;
      }
    }

    onUpdateJob({
      ...selectedJob,
      status: finalStatus,
      operations: updatedOps,
      progress: newProgress,
      productionLogs: [newJobLog, ...(selectedJob.productionLogs || [])],
      updatedAt: new Date().toISOString()
    });

    setIsTracing(false);
    setStartTime(null);
    setSelectedOperationId('');

    setAlertInfo({
      show: true,
      type: 'success',
      title: 'Piecework Saved & Credited!',
      message: `Logged ${currentQtyCompleted} pcs. Credited ${currency}${earnedWages.toLocaleString()} to ${assignedKarigar?.name || 'Worker'} (${currentWasteQty}kg scrap archived).`
    });
  };

  const remainingQtyToProduce = useMemo(() => {
    if (!selectedJob) return 0;
    return selectedJob.quantity;
  }, [selectedJob]);

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px] bg-[#f4f5f6] font-sans antialiased text-[#1c2126] rounded-xl overflow-hidden text-left border border-slate-200 dark:border-slate-800">
      {/* HEADER BAR */}
      <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
         <div className="flex justify-between items-center h-8">
            <div className="flex items-center gap-3">
               <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Apparel Job Cards</span>
               <span className="text-xs text-[#2490ef] bg-[#eef6ff] px-2 py-0.5 rounded-full font-medium border border-[#dbecfe]">ERPNext Process Workbench</span>
            </div>
            <div className="flex items-center gap-2">
               <button 
                 onClick={() => window.print()}
                 disabled={!selectedJobId} 
                 className="h-7 px-3 flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-[#d1d8dd] text-[#1c2126] rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/20 disabled:opacity-50"
               >
                  <Printer className="w-4 h-4" />
                  Print Job Slip
               </button>
            </div>
         </div>
      </div>

      <div className="flex-1 p-6 overflow-auto space-y-6">
        
        {/* TOP ALERT NOTIFICATION */}
        {alertInfo?.show && (
          <div className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${alertInfo.type === 'success' ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]' : 'bg-[#fef2f2] text-[#991b1b] border-[#fca5a5]'}`}>
            <div className="p-1 rounded bg-white shadow-sm">
              {alertInfo.type === 'success' ? <Check className="w-4 h-4 text-green-600" /> : <Ban className="w-4 h-4 text-red-600" />}
            </div>
            <div className="flex-1">
              <h5 className="font-bold text-sm">{alertInfo.title}</h5>
              <p className="text-xs mt-0.5 opacity-90">{alertInfo.message}</p>
            </div>
            <button onClick={() => setAlertInfo(null)} className="text-xs hover:underline mt-1 font-semibold">Dismiss</button>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* CONTROL SWITCH PANEL */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* 1. SELECT WORK ORDER BLOCK */}
            <div className="bg-white border border-[#d1d8dd] rounded-xl shadow-macos-sm p-5 space-y-4">
              <div className="border-b border-[#eef1f4] pb-2">
                <h4 className="font-bold text-[14px] text-[#1c2126]">1. Production Assembly Line</h4>
                <p className="text-xs text-slate-500 mt-0.5">Choose a Work Order from the shopfloor scheduler</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-semibold text-[#525c66]">Select Active Work Order</label>
                  <div className="relative">
                    <select 
                      value={selectedJobId} 
                      onChange={e => handleJobChange(e.target.value)}
                      className="w-full px-3 py-2 bg-[#fdfdfd] border border-[#d1d8dd] rounded-lg focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[13px] text-[#1c2126] appearance-none cursor-pointer"
                    >
                      <option value="">Select Work Order...</option>
                      {jobs.map(j => (
                        <option key={j.id} value={j.id}>
                          {j.id} — {j.productName} ({j.quantity} PCS | Stage: {j.status})
                        </option>
                      ))}
                    </select>
                    <ChevronRight className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                  </div>
                </div>

                {selectedJob && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-[#eef1f4] flex flex-col justify-between text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Scheduled Target:</span>
                      <span className="font-bold text-[#1c2126]">{selectedJob.quantity} PCS</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Current Progress:</span>
                      <span className="font-bold text-green-600">{selectedJob.progress || 0}% Completed</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: `${selectedJob.progress || 0}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. INITIALIZE ROUTING SECTION */}
            {selectedJob && activeOperations.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-4">
                <div className="flex items-start gap-2.5 text-amber-800">
                  <AlertCircle className="w-5 h-5 mt-0.5 text-amber-600 shrink-0" />
                  <div>
                    <h5 className="font-bold text-sm">No Routing Operations Defined</h5>
                    <p className="text-xs mt-1 text-amber-700">This Work Order does not have operation stages defined yet. Please select an ERPNext template below to instantiate the cutting, stitching, embroidering, and packing checklist.</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-end pt-2">
                  <div className="flex-1 space-y-1.5 flex flex-col">
                    <label className="text-xs font-bold text-amber-800">Choose Operations Route</label>
                    <select 
                      value={routingTemplateId}
                      onChange={e => setRoutingTemplateId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg focus:outline-none text-xs text-[#1c2126]"
                    >
                      <option value="">Select process routing template...</option>
                      {DEFAULT_ROUTE_OPTIONS.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    onClick={handleInitializeRouting}
                    disabled={!routingTemplateId}
                    className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-all shadow-sm"
                  >
                    Build Operations Template
                  </button>
                </div>
              </div>
            )}

            {/* 3. TRACK OPERATIONS WORKBENCH */}
            {selectedJob && activeOperations.length > 0 && (
              <div className="bg-white border border-[#d1d8dd] rounded-xl shadow-macos-sm p-5 space-y-5">
                <div className="border-b border-[#eef1f4] pb-2">
                  <h4 className="font-bold text-[14px] text-[#1c2126]">2. Workstation Process Setup</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Select, trace, and complete individual craft operations</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Select Operation Dropdown */}
                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-xs font-semibold text-[#525c66]">Select Current Operation Step</label>
                    <div className="relative">
                      <select 
                        value={selectedOperationId} 
                        onChange={e => handleOperationChange(e.target.value)}
                        disabled={isTracing}
                        className="w-full px-3 py-2 bg-[#fdfdfd] border border-[#d1d8dd] rounded-lg focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[13px] text-[#1c2126] appearance-none cursor-pointer disabled:bg-slate-100"
                      >
                        <option value="">Pick operation step...</option>
                        {activeOperations.map(op => {
                          let badgeSuffix = 'PENDING';
                          if (op.status === 'COMPLETED') badgeSuffix = 'COMPLETED ✓';
                          if (op.status === 'IN_PROGRESS') badgeSuffix = 'IN PROGRESS ⏳';
                          return (
                            <option key={op.id} value={op.id}>
                              {op.name} ({badgeSuffix} | Piece Rate: {currency}{op.defaultRate || 0})
                            </option>
                          );
                        })}
                      </select>
                      <ChevronRight className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                    </div>
                  </div>

                  {/* Assign to Karigar Dropdown */}
                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-xs font-semibold text-[#525c66]">Assign To Artisan (Karigar) <span className="text-[#ef4444]">*</span></label>
                    <div className="relative">
                      <select 
                        value={assignedKarigarId} 
                        onChange={e => setAssignedKarigarId(e.target.value)}
                        className="w-full px-3 py-2 bg-[#fdfdfd] border border-[#d1d8dd] rounded-lg focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[13px] text-[#1c2126] appearance-none cursor-pointer"
                      >
                        <option value="">Choose Karigar...</option>
                        {karigars.map(k => (
                          <option key={k.id} value={k.id}>{k.name} ({k.skill || 'Assembler'} | Bal: {currency}{k.balance})</option>
                        ))}
                      </select>
                      <ChevronRight className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                    </div>
                  </div>

                </div>

                {/* Operation Context Display Card */}
                {selectedOperation && (
                  <div className="p-4 bg-slate-50 border border-[#eef1f4] rounded-lg space-y-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1c2126] text-sm uppercase">{selectedOperation.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedOperation.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : selectedOperation.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}`}>
                          {selectedOperation.status}
                        </span>
                      </div>
                      <span className="font-black tracking-widest text-[#525c66]">STATION: {selectedOperation.workstationType || 'N/A'}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                      <div>
                        <p className="text-slate-500">Workstation Stage</p>
                        <p className="font-semibold text-slate-800 uppercase mt-0.5">{selectedOperation.stage}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Planned Hours</p>
                        <p className="font-semibold text-slate-800 mt-0.5">{selectedOperation.plannedHours || 0} Hours</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Requires QC Gate</p>
                        <p className="font-semibold text-slate-800 mt-0.5">{selectedOperation.qualityCheckpoint ? 'Yes (Pass/Fail)' : 'No'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">ERP Piece Rate</p>
                        <span className="inline-flex items-center gap-1 mt-0.5 text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">
                          <Coins className="w-3.5 h-3.5" />
                          {currency}{selectedOperation.defaultRate || 0}/pc
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* QUANTITY AND LOG CONTROL */}
                {selectedOperation && (
                  <div className="border-t border-[#eef1f4] pt-4 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      
                      <div className="space-y-1.5 flex flex-col">
                        <label className="text-xs font-semibold text-[#525c66]">Completed (Pcs)</label>
                        <input 
                          type="number" 
                          value={completedQty} 
                          min={0}
                          onChange={e => setCompletedQty(Math.max(0, Number(e.target.value)))} 
                          className="w-full px-3 py-1.5 bg-white border border-[#d1d8dd] rounded-lg text-sm text-[#1c2126] font-bold select-all focus:border-[#2490ef] focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5 flex flex-col">
                        <label className="text-xs font-semibold text-[#525c66]">QC Rejects (Pcs)</label>
                        <input 
                          type="number" 
                          value={rejectedQty} 
                          min={0}
                          onChange={e => setRejectedQty(Math.max(0, Number(e.target.value)))} 
                          className="w-full px-3 py-1.5 bg-white border border-[#d1d8dd] rounded-lg text-sm text-red-600 font-bold focus:border-red-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5 flex flex-col">
                        <label className="text-xs font-semibold text-[#525c66]">Fluff / Scrap Waste (Kg)</label>
                        <input 
                          type="number" 
                          step="0.1"
                          value={wasteQty} 
                          min={0}
                          onChange={e => setWasteQty(Math.max(0, Number(e.target.value)))} 
                          className="w-full px-3 py-1.5 bg-white border border-[#d1d8dd] rounded-lg text-sm text-[#ea580c] font-bold focus:border-[#ea580c] focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5 flex flex-col">
                        <label className="text-xs font-semibold text-[#525c66]">Custom Rate ({currency}/pc)</label>
                        <input 
                          type="number" 
                          value={customPieceRate} 
                          min={0}
                          onChange={e => setCustomPieceRate(Math.max(0, Number(e.target.value)))} 
                          className="w-full px-3 py-1.5 bg-white border border-[#d1d8dd] rounded-lg text-sm text-[#1c2126] font-bold focus:border-[#2490ef] focus:outline-none"
                        />
                      </div>

                    </div>

                    {/* INTERACTIVE STATE INITIATOR */}
                    <div className="pt-2 flex flex-col sm:flex-row gap-3">
                      {!isTracing ? (
                        <button 
                          onClick={handleStartTracking}
                          disabled={!selectedOperationId}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-sm"
                        >
                          <Play className="w-4 h-4" />
                          Start Track Session
                        </button>
                      ) : (
                        <div className="flex-1 flex flex-col sm:flex-row gap-2">
                          <div className="bg-[#eef2ff] text-indigo-700 font-medium px-4 py-2 rounded-lg text-xs flex items-center justify-center gap-2 border border-[#c7d2fe]">
                            <Clock className="w-4 h-4 animate-spin" />
                            Session Started At: {startTime}
                          </div>
                          <button 
                            onClick={handleCompleteTracking}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-sm"
                          >
                            <CheckSquare className="w-4 h-4" />
                            Complete & Post Wages Credit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SIDEBAR RIGHT PANELS */}
          <div className="space-y-6">
            
            {/* IN-HOUSE KARIGAR DIRECT WAGES PANEL */}
            <div className="bg-white border border-[#d1d8dd] rounded-xl shadow-macos-sm p-4 text-xs space-y-3">
              <h5 className="font-bold text-[13px] border-b pb-1.5 text-slate-800 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-500" />
                Active Piece-Rate Ledger
              </h5>
              <div className="divide-y divide-slate-100 max-h-[250px] overflow-y-auto custom-scrollbar spacing-y-2">
                {karigars.map(k => (
                  <div key={k.id} className="py-2 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-[#1c2126]">{k.name}</p>
                      <p className="text-[10px] text-slate-500">{k.skill || 'Artisan'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800">{currency}{k.balance.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-500">Unsettled</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* REAL-TIME WASTE / MATERIAL FLUFF GRAPH OR METRIC */}
            {selectedJob && (
              <div className="bg-[#fff7ed] border border-orange-200 rounded-xl p-4 text-xs space-y-3">
                <h5 className="font-bold text-[13px] text-orange-850 flex items-center gap-1.5">
                  <Scissors className="w-4 h-4 text-[#ea580c]" />
                  Workshop Scrap Metrics
                </h5>
                <p className="text-[11px] text-orange-800">Track and isolate cutting margining, thread trimming, or fabric shred fluff weight produced on this batch.</p>
                <div className="bg-white/80 p-3 rounded border border-orange-100 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-black">Logged Scrap Weight</p>
                    <p className="text-[18px] font-black text-orange-600 mt-0.5">
                      {(selectedJob.productionLogs || []).reduce((acc, curr) => acc + (curr.wasteProduced || 0), 0).toFixed(2)} KG
                    </p>
                  </div>
                  <Coins className="w-5 h-5 text-orange-400 rotate-12" />
                </div>
              </div>
            )}

            {/* QUICK HISTORY LOGS FOR THIS JOB */}
            {selectedJob && (
              <div className="bg-white border border-[#d1d8dd] rounded-xl shadow-macos-sm p-4 text-xs space-y-3">
                <h5 className="font-bold text-[13px] border-b pb-1.5 text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Apparel Batch Log
                </h5>
                
                {selectedJob.productionLogs && selectedJob.productionLogs.length > 0 ? (
                  <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto custom-scrollbar">
                    {selectedJob.productionLogs.map((log, index) => {
                      const operatorName = karigars.find(k => k.id === log.operatorId)?.name || log.operatorId || 'Artisan';
                      return (
                        <div key={log.id || index} className="py-2.5 space-y-1">
                          <div className="flex justify-between font-bold text-[#1c2126]">
                            <span>Batch Produced: {log.quantityProduced} PCS</span>
                            <span className="text-orange-600 font-semibold">{log.wasteProduced || 0}kg Scrap</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500">
                            <span>Artisan: {operatorName}</span>
                            <span>{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400">
                    No workmanship sessions recorded yet for this batch.
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};

export default GenerateJobSlip;
