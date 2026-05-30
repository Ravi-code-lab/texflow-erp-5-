import React, { useState, useMemo } from 'react';
import { 
  FlaskConical, Plus, Search, Thermometer, Droplet, 
  Settings, Check, Compass, Trash2, Tag, AlertTriangle, Play, HelpCircle
} from 'lucide-react';
import { DyeingJob, DyeingProcess, DyeClass, YarnLot, Machine } from '../types';

interface DyeingProcessingProps {
  dyeingJobs: DyeingJob[];
  yarnLots: YarnLot[];
  machines: Machine[];
  onAddJob: (job: DyeingJob) => void;
  onUpdateJob: (job: DyeingJob) => void;
  onDeleteJob: (jobId: string) => void;
  currency?: string;
}

const PANTONE_SHADE_PRESETS = [
  { name: 'Classic Indigo', code: '19-4052 TCX', colorCode: '#1d3557' },
  { name: 'Emerald Velvet', code: '18-5642 TCX', colorCode: '#006d5b' },
  { name: 'Saffron Sun', code: '14-1064 TCX', colorCode: '#f1a208' },
  { name: 'Crimson Silk', code: '19-1761 TCX', colorCode: '#9a031e' },
  { name: 'Raw Sand', code: '15-1322 TCX', colorCode: '#dcb894' }
];

export const DyeingProcessing: React.FC<DyeingProcessingProps> = ({
  dyeingJobs, yarnLots, machines, onAddJob, onUpdateJob, onDeleteJob, currency = '₹'
}) => {
  const [activeTab, setActiveTab] = useState<'DYE_HOUSE' | 'PROCESS_CONTROL'>('DYE_HOUSE');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  // Form State
  const [newJobNo, setNewJobNo] = useState('');
  const [newProcess, setNewProcess] = useState<DyeingProcess>('FABRIC_DYEING');
  const [newDyeClass, setNewDyeClass] = useState<DyeClass>('REACTIVE');
  const [newShade, setNewShade] = useState(PANTONE_SHADE_PRESETS[0].name);
  const [newPantone, setNewPantone] = useState(PANTONE_SHADE_PRESETS[0].code);
  const [newInputQty, setNewInputQty] = useState<number>(300);
  const [newInputUnit, setNewInputUnit] = useState<'METER' | 'KG'>('KG');
  const [newYarnLotId, setNewYarnLotId] = useState('');
  const [newMachineId, setNewMachineId] = useState('');
  const [newTemp, setNewTemp] = useState<number>(85);
  const [newPh, setNewPh] = useState<number>(8.2);
  const [newDuration, setNewDuration] = useState<number>(90);
  const [vendorName, setVendorName] = useState('');
  const [isJobWork, setIsJobWork] = useState(false);

  // Process Controls for completing a dyeing cycle
  const [selectedJobId, setSelectedJobId] = useState('');
  const [outputMs, setOutputMs] = useState<number>(0);
  const [washFastness, setWashFastness] = useState<number>(4); // 1-5 scale
  const [rubFastness, setRubFastness] = useState<number>(4);
  const [lightFastness, setLightFastness] = useState<number>(4);
  const [colorMatch, setColorMatch] = useState<'PASS' | 'FAIL'>('PASS');
  const [remarks, setRemarks] = useState('');

  // Selected Dyeing Job Object
  const selectedJob = useMemo(() => dyeingJobs.find(j => j.id === selectedJobId), [dyeingJobs, selectedJobId]);

  // Filters
  const filteredJobs = useMemo(() => {
    return dyeingJobs.filter(job => {
      const q = searchQuery.toLowerCase();
      return job.jobNumber?.toLowerCase().includes(q) || 
             job.shade?.toLowerCase().includes(q) ||
             job.pantoneRef?.toLowerCase().includes(q) ||
             job.process?.toLowerCase().includes(q);
    });
  }, [dyeingJobs, searchQuery]);

  const handleCreateJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobNo) return;

    const matchingLot = yarnLots.find(l => l.id === newYarnLotId);
    const matchingMachine = machines.find(m => m.id === newMachineId);

    const targetShadePreset = PANTONE_SHADE_PRESETS.find(p => p.name === newShade);
    const resolvedPantone = targetShadePreset ? targetShadePreset.code : newPantone;

    const key = `DYEJOB-${Date.now()}`;
    const preparedJob: DyeingJob = {
      id: key,
      jobNumber: newJobNo,
      process: newProcess,
      dyeClass: newDyeClass,
      shade: newShade,
      pantoneRef: resolvedPantone,
      yarnLotId: newYarnLotId || undefined,
      inputQty: Number(newInputQty),
      inputUnit: newInputUnit,
      temperature: Number(newTemp),
      ph: Number(newPh),
      duration: Number(newDuration),
      isJobWork,
      vendorName: isJobWork ? vendorName : undefined,
      machineId: newMachineId || undefined,
      machineName: matchingMachine ? matchingMachine.name : undefined,
      issueDate: new Date().toISOString().split('T')[0],
      expectedDate: new Date(Date.now() + 172800000).toISOString().split('T')[0], // 2 days away
      status: 'PENDING',
      chemicals: [
        { name: 'Soda Ash (sodium carbonate)', quantity: Number(newInputQty) * 0.05, unit: 'KG', costPerUnit: 25 },
        { name: 'Common Glauber Salt', quantity: Number(newInputQty) * 0.2, unit: 'KG', costPerUnit: 14 },
        { name: 'Levelling Agent (Textile)', quantity: Number(newInputQty) * 0.01, unit: 'KG', costPerUnit: 90 }
      ],
      laborCost: isJobWork ? 0 : Number(newInputQty) * 12,
      chemicalCost: Number(newInputQty) * 8.5,
      machineCost: isJobWork ? 0 : Number(newInputQty) * 4.0
    };

    onAddJob(preparedJob);
    setIsCreatingJob(false);
    setNewJobNo('');
    // Prefill the Control Workbench with this new job
    setSelectedJobId(key);
    setOutputMs(Number(newInputQty));
  };

  const handleRunStartDyeing = (jobId: string) => {
    const job = dyeingJobs.find(j => j.id === jobId);
    if (!job) return;
    onUpdateJob({
      ...job,
      status: 'IN_PROCESS'
    });
    setBannerMsg(`Pattern loaded into workstation. Job Card Batch ${job.jobNumber} is now IN_PROCESS!`);
    setTimeout(() => setBannerMsg(null), 5000);
  };

  const handlePostDyeingComplete = () => {
    if (!selectedJob) return;

    const shrinkPct = Number((((selectedJob.inputQty - outputMs) / selectedJob.inputQty) * 100).toFixed(1));
    const resolvedChemCost = (selectedJob.chemicals || []).reduce((acc, c) => acc + (c.quantity * c.costPerUnit), 0);
    const finalTotalCost = (selectedJob.laborCost || 0) + resolvedChemCost + (selectedJob.machineCost || 0);

    const completedDyeJob: DyeingJob = {
      ...selectedJob,
      status: 'COMPLETED',
      outputQty: Number(outputMs),
      shrinkagePercent: shrinkPct > 0 ? shrinkPct : 0,
      completedDate: new Date().toISOString().split('T')[0],
      colorMatchStatus: colorMatch,
      fastness: {
        washing: Number(washFastness),
        rubbing: Number(rubFastness),
        light: Number(lightFastness)
      },
      chemicalCost: resolvedChemCost,
      totalCost: finalTotalCost,
      remarks: remarks
    };

    onUpdateJob(completedDyeJob);
    setBannerMsg(`Job Card ${selectedJob.jobNumber} completed! Value-addition shrinkage measured: ${shrinkPct}%. Quality specifications archived.`);
    setTimeout(() => setBannerMsg(null), 6000);
    setSelectedJobId('');
    setRemarks('');
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden text-left">
      
      {/* HEADER ACTION BAR */}
      <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Embroidery, Printing & Wash Job Cards</span>
              <span className="text-xs text-[#ec4899] bg-[#fdf2f8] px-2.5 py-0.5 rounded-full font-bold border border-[#fbcfe8]">ERP Garment Styling</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Manage neck embroidery panels, screen prints, block stamps, wash softeners, and shrinkage inspections.</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsCreatingJob(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Schedule Embroidery/Print Job
            </button>
          </div>
        </div>

        {/* INTER-TABS */}
        <div className="flex gap-4 mt-4 border-t border-slate-100 pt-3 text-xs">
          <button 
            onClick={() => setActiveTab('DYE_HOUSE')}
            className={`font-bold pb-2 border-b-2 transition-all px-1 ${activeTab === 'DYE_HOUSE' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Embroidery & Print Work Queue
          </button>
          <button 
            onClick={() => setActiveTab('PROCESS_CONTROL')}
            className={`font-bold pb-2 border-b-2 transition-all px-1 ${activeTab === 'PROCESS_CONTROL' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Quality Approval & Work Completion
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto space-y-6">

        {bannerMsg && (
          <div className="bg-emerald-50 border border-emerald-250 text-emerald-900 rounded-lg p-3 text-xs flex items-center gap-2 font-bold animate-pulse">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{bannerMsg}</span>
          </div>
        )}

        {/* Tab 1: Batch Schedule */}
        {activeTab === 'DYE_HOUSE' && (
          <div className="space-y-6">
            
            {/* Search inputs */}
            <div className="bg-white border border-[#d1d8dd] rounded-xl p-4 text-xs">
              <div className="relative max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter by Job# Reference, Pantone Code, Shade name..."
                  className="w-full pl-9 pr-4 py-2 border border-[#d1d8dd] rounded-lg bg-[#fafbfb] focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {/* List Table */}
            <div className="bg-white border border-[#d1d8dd] rounded-xl overflow-hidden shadow-macos-sm">
              <table className="w-full text-xs text-left divide-y divide-[#d1d8dd]">
                <thead className="bg-[#f8fafc] text-slate-600 font-bold uppercase select-none">
                  <tr>
                    <th className="px-5 py-3">Job Card Number</th>
                    <th className="px-5 py-3">Value Process / Vendor</th>
                    <th className="px-5 py-3">Design & Pantone Shade</th>
                    <th className="px-5 py-3 text-right">Fabric Issued (Mtrs/Pcs)</th>
                    <th className="px-5 py-3 text-right">Jobwork Cost</th>
                    <th className="px-5 py-3 text-center">Quality Check</th>
                    <th className="px-5 py-3 text-center">Lab Specs (W/R/S)</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredJobs.length > 0 ? (
                    filteredJobs.map(job => {
                      const colorMatchText = job.colorMatchStatus || 'PENDING';
                      return (
                        <tr key={job.id} className="hover:bg-slate-50/60 transition-all">
                          <td className="px-5 py-4">
                            <div>
                              <p className="font-bold text-slate-900">{job.jobNumber}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {job.id}</p>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div>
                              <p className="font-bold uppercase text-slate-700">{job.process.replace(/_/g, ' ')}</p>
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-black px-1.5 py-0.5 rounded mt-1 inline-block uppercase">Process: {job.dyeClass === 'REACTIVE' ? 'Embroidery' : 'Print / Wash'}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              {/* Pantone color indicator if matches */}
                              <div className="w-4 h-4 rounded-full border border-slate-300" style={{ backgroundColor: PANTONE_SHADE_PRESETS.find(p => p.name === job.shade)?.colorCode || '#ccc' }} />
                              <div>
                                <p className="font-bold text-slate-800 text-xs">{job.shade}</p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{job.pantoneRef || 'No pantone code'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right font-bold text-slate-800">
                            {job.inputQty} {job.inputUnit}
                          </td>
                          <td className="px-5 py-4 text-right text-emerald-600 font-bold">
                            {currency}{(job.totalCost || 0).toLocaleString()}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black ${
                              colorMatchText === 'PASS' ? 'bg-green-100 text-green-800' :
                              colorMatchText === 'FAIL' ? 'bg-red-100 text-red-800' :
                              'bg-slate-100 text-slate-500'
                            }`}>
                              {colorMatchText}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center font-mono font-bold text-slate-500 text-xs">
                            {job.fastness ? `${job.fastness.washing}/${job.fastness.rubbing}/${job.fastness.light}` : 'Not tested'}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              job.status === 'COMPLETED' ? 'bg-green-100 text-green-800 border border-green-200' :
                              job.status === 'IN_PROCESS' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200 animate-pulse' :
                              job.status === 'FAILED' ? 'bg-red-100 text-red-800 border border-red-200' :
                              'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}>
                              {job.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <div className="flex gap-2 justify-center">
                              {job.status === 'PENDING' && (
                                <button 
                                  onClick={() => handleRunStartDyeing(job.id)}
                                  className="h-6 px-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded flex items-center gap-1 transition-all"
                                >
                                  <Play className="w-3 h-3" />
                                  Start Job Processing
                                </button>
                              )}
                              <button 
                                onClick={() => onDeleteJob(job.id)}
                                className="p-1 hover:bg-red-50 text-red-500 rounded transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-5 py-12 text-center text-slate-400">
                        <Droplet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        No apparel value addition, neck embroidery or screen printing jobs scheduled on the platform.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* Tab 2: Control Workbench */}
        {activeTab === 'PROCESS_CONTROL' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* Left workbench */}
            <div className="xl:col-span-2 space-y-6">
              <div className="bg-white border border-[#d1d8dd] rounded-xl p-5 space-y-4">
                <div className="border-b pb-2">
                  <h4 className="font-bold text-sm text-[#1c2126]">Dye Machine Load & Laboratory Dosing</h4>
                  <p className="text-xs text-slate-500">Log finished output volume, evaluate shrinkage metrics and pass laboratory colors.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5 flex flex-col">
                    <label className="font-semibold text-slate-600 text-xs">Choose Active Dyeing Batch</label>
                    <select 
                      value={selectedJobId}
                      onChange={e => {
                        setSelectedJobId(e.target.value);
                        const job = dyeingJobs.find(j => j.id === e.target.value);
                        if (job) {
                          setOutputMs(job.outputQty || job.inputQty);
                          setRemarks(job.remarks || '');
                          if (job.fastness) {
                            setWashFastness(job.fastness.washing || 4);
                            setRubFastness(job.fastness.rubbing || 4);
                            setLightFastness(job.fastness.light || 4);
                          }
                        }
                      }}
                      className="p-2.5 border border-[#d2d9df] bg-[#fafbfb] rounded-lg focus:outline-none"
                    >
                      <option value="">Select process cycle...</option>
                      {dyeingJobs.filter(j => j.status === 'IN_PROCESS').map(j => (
                        <option key={j.id} value={j.id}>{j.jobNumber} — {j.shade} ({j.inputQty} {j.inputUnit})</option>
                      ))}
                    </select>
                  </div>

                  {selectedJob && (
                    <div className="border border-[#eef1f4] p-4 rounded-xl bg-slate-50/50 space-y-4 text-xs">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5 flex flex-col">
                          <label className="font-bold text-slate-600">Finished Out Qty</label>
                          <input 
                            type="number"
                            value={outputMs}
                            onChange={e => setOutputMs(Number(e.target.value))}
                            className="p-2 border bg-white rounded font-bold"
                          />
                        </div>

                        <div className="space-y-1.5 flex flex-col">
                          <label className="font-bold text-slate-600">Spectro Color Match</label>
                          <select 
                            value={colorMatch}
                            onChange={e => setColorMatch(e.target.value as any)}
                            className="p-2 border bg-white rounded font-bold"
                          >
                            <option value="PASS">PASS (De&lt;0.8 DeltaE)</option>
                            <option value="FAIL">FAIL (Off shadow)</option>
                          </select>
                        </div>

                        <div className="space-y-1.5 flex flex-col">
                          <span className="font-bold text-slate-500">Shrinkage Percent</span>
                          <span className="text-sm font-black text-rose-600 p-2 font-mono">
                            {(((selectedJob.inputQty - outputMs) / selectedJob.inputQty) * 100).toFixed(1)}% Loss
                          </span>
                        </div>
                      </div>

                      <div className="border-t pt-3 space-y-3">
                        <h5 className="font-black text-slate-700 tracking-wider">Garment Durability & Finish Testing</h5>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">WASH FIT STABILITY (1-5)</label>
                            <input 
                              type="number" min="1" max="5"
                              value={washFastness}
                              onChange={e => setWashFastness(Number(e.target.value))}
                              className="w-full p-1.5 border bg-white rounded text-center"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">STITCH & EMBROIDERY GLIDE (1-5)</label>
                            <input 
                              type="number" min="1" max="5"
                              value={rubFastness}
                              onChange={e => setRubFastness(Number(e.target.value))}
                              className="w-full p-1.5 border bg-white rounded text-center"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">SHADE RETENTION RATING (1-5)</label>
                            <input 
                              type="number" min="1" max="5"
                              value={lightFastness}
                              onChange={e => setLightFastness(Number(e.target.value))}
                              className="w-full p-1.5 border bg-white rounded text-center"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1 flex flex-col">
                        <label className="font-bold text-slate-600">Embroidery/Printing Remarks & Log</label>
                        <input 
                          type="text"
                          value={remarks}
                          onChange={e => setRemarks(e.target.value)}
                          placeholder="e.g. Completed front neck hand embroidery panel; verified stitch tension"
                          className="p-2 border bg-white rounded text-xs"
                        />
                      </div>

                      <button 
                        onClick={handlePostDyeingComplete}
                        className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        Verify Quality & Complete Handwork/Print Card
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right sidebars */}
            <div className="space-y-6 text-xs">
              
              {/* Chemical Recipe list */}
              {selectedJob && (
                <div className="bg-[#fffbeb] border border-amber-200 rounded-xl p-4 space-y-3">
                  <h5 className="font-extrabold text-amber-900 border-b pb-1">Chemical Recipe Log</h5>
                  <p className="text-amber-800 text-[11px]">Material dosing logged for {selectedJob.inputQty}kg lot dyeing cycle:</p>
                  
                  <div className="space-y-2 pt-1 font-semibold text-[11px] text-slate-700">
                    {(selectedJob.chemicals || []).map(chem => (
                      <div key={chem.name} className="flex justify-between bg-white/75 p-2 rounded border border-amber-100">
                        <span>{chem.name}</span>
                        <span className="font-bold text-indigo-600">{chem.quantity.toFixed(1)} {chem.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-[#fafbfc] border border-[#d1d8dd] rounded-xl p-5 space-y-3">
                <h5 className="font-bold text-slate-800 flex items-center gap-1">
                  <Check className="w-4 h-4 text-green-600" />
                  Fastness Standards
                </h5>
                <ul className="list-disc pl-4 space-y-1.5 text-slate-600 leading-relaxed text-[11px]">
                  <li>**Grade 5**: Pristine, absolutely no fading or color bleeding.</li>
                  <li>**Grade 4**: Excellent, standard apparel export requirement.</li>
                  <li>**Grade 3**: Good/Average raw domestic cloth score.</li>
                  <li>**Grade 1-2**: Rejected. Causes staining during domestic laundering.</li>
                </ul>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* SCHEDULE JET/WINCH MODAL */}
      {isCreatingJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 font-sans text-xs">
          <div className="bg-white rounded-xl border border-[#d1d8dd] max-w-lg w-full overflow-hidden shadow-macos-lg text-left">
            <div className="p-4 border-b border-[#eef1f4] flex justify-between items-center bg-[#fafbfc]">
              <span className="font-bold text-[14px]">Plan Embroidery/Print Job Card</span>
              <button onClick={() => setIsCreatingJob(false)} className="text-slate-400 hover:text-slate-600">
                <Trash2 className="w-4 h-4 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleCreateJobSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 flex flex-col col-span-2">
                  <label className="font-bold text-slate-700">Job Card Reference Number <span className="text-red-500">*</span></label>
                  <input 
                    type="text"
                    value={newJobNo}
                    onChange={e => setNewJobNo(e.target.value)}
                    placeholder="e.g. EMB-KRT-CHIKAN-041"
                    required
                    className="p-2 border border-[#d1d8dd] rounded-lg"
                  />
                </div>

                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-slate-700">Embroidery/Value Addition Style</label>
                  <select 
                    value={newProcess}
                    onChange={e => setNewProcess(e.target.value as DyeingProcess)}
                    className="p-2 border border-[#d1d8dd] bg-white rounded-lg focus:outline-none"
                  >
                    <option value="YARN_DYEING">Machine Chikan Neckwork</option>
                    <option value="FABRIC_DYEING">Hand Katha Patterning</option>
                    <option value="PIECE_DYEING">Softener / Silicon Wash</option>
                    <option value="PRINTING">Screen Printing / Block Stamp</option>
                  </select>
                </div>

                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-slate-700">Value Addition Class</label>
                  <select 
                    value={newDyeClass}
                    onChange={e => setNewDyeClass(e.target.value as DyeClass)}
                    className="p-2 border border-[#d1d8dd] bg-white rounded-lg focus:outline-none"
                  >
                    <option value="REACTIVE">Chikankari Handwork (Computerised)</option>
                    <option value="VATS">Genuine Indigo Dabu Handprint</option>
                    <option value="DISPERSE">Zardozi / Metallic Gota Borders</option>
                    <option value="ACID">Reactive Digiprint Ink</option>
                    <option value="DIRECT">Standard Pigment Overprints</option>
                  </select>
                </div>

                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-slate-700">Shade (Pantone Card)</label>
                  <select 
                    value={newShade}
                    onChange={e => {
                      setNewShade(e.target.value);
                      const code = PANTONE_SHADE_PRESETS.find(p => p.name === e.target.value)?.code;
                      if (code) setNewPantone(code);
                    }}
                    className="p-2 border border-[#d1d8dd] bg-white rounded-lg focus:outline-none"
                  >
                    {PANTONE_SHADE_PRESETS.map(p => (
                      <option key={p.name} value={p.name}>{p.name} ({p.code})</option>
                    ))}
                    <option value="Custom Shade">Custom shade...</option>
                  </select>
                </div>

                {newShade === 'Custom Shade' && (
                  <div className="space-y-1 flex flex-col">
                    <label className="font-bold text-slate-700">Custom Pantone Reference</label>
                    <input 
                      type="text"
                      value={newPantone}
                      onChange={e => setNewPantone(e.target.value)}
                      placeholder="e.g. 17-1564 TCX"
                      className="p-2 border border-[#d1d8dd] rounded-lg"
                    />
                  </div>
                )}

                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-slate-700">Issued Quantity</label>
                  <input 
                    type="number"
                    value={newInputQty}
                    onChange={e => setNewInputQty(Number(e.target.value))}
                    className="p-2 border border-[#d1d8dd] rounded-lg"
                  />
                </div>

                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-slate-700">Quantity Unit</label>
                  <select 
                    value={newInputUnit}
                    onChange={e => setNewInputUnit(e.target.value as any)}
                    className="p-2 border border-[#d1d8dd] bg-white rounded-lg"
                  >
                    <option value="KG">Pcs (For pre-cut neck panels)</option>
                    <option value="METER">Meters (Long fabric roll pieces)</option>
                  </select>
                </div>

                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-slate-700">Fabric Roll & Accessories Batch</label>
                  <select 
                    value={newYarnLotId}
                    onChange={e => setNewYarnLotId(e.target.value)}
                    className="p-2 border border-[#d1d8dd] bg-white rounded-lg"
                  >
                    <option value="">Choose material roll batch...</option>
                    {yarnLots.map(l => (
                      <option key={l.id} value={l.id}>{l.lotNumber} ({l.type})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-slate-700">Assigned Stitch Workstation</label>
                  <select 
                    value={newMachineId}
                    onChange={e => setNewMachineId(e.target.value)}
                    className="p-2 border border-[#d1d8dd] bg-white rounded-lg"
                  >
                    <option value="">Select active workstation room...</option>
                    {machines.filter(m => m.type.toLowerCase().includes('dye') || m.type.toLowerCase().includes('finishing') || m.type.toLowerCase().includes('machine') || m.type.toLowerCase().includes('stitch') || m.type.toLowerCase().includes('iron')).map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 flex items-center gap-2 col-span-2 py-1">
                  <input 
                    type="checkbox" 
                    checked={isJobWork} 
                    onChange={e => setIsJobWork(e.target.checked)}
                    id="dyeJobWorkCheck"
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <label htmlFor="dyeJobWorkCheck" className="font-bold text-slate-700 select-none">Send to External Karigar/Chikankari Vendor (Outsource)?</label>
                </div>

                {isJobWork && (
                  <div className="space-y-1 flex flex-col col-span-2">
                    <label className="font-bold text-slate-700">Outsourced Karigar / Vendor Name</label>
                    <input 
                      type="text" 
                      value={vendorName}
                      onChange={e => setVendorName(e.target.value)}
                      placeholder="e.g. Classic Chikankari Embroidery Hub"
                      required
                      className="p-2 border border-[#d1d8dd] rounded-lg"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-[#eef1f4]">
                <button 
                  type="button" 
                  onClick={() => setIsCreatingJob(false)}
                  className="px-4 py-2 border rounded-lg text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Generate Value Addition Job Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
