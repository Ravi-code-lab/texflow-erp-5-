import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Settings, ShieldCheck, AlertTriangle, 
  Wrench, Activity, Sparkles, User, Calendar, Trash2, 
  RotateCw, Play, Circle, Cpu, DollarSign, Gauge, Clock, CheckCircle2,
  Leaf, Info, Check, ShieldAlert, Sliders, BatteryCharging
} from 'lucide-react';
import { Machine } from '../types';
import BaseModal from './BaseModal';

// High-fidelity descriptions mapping workstation types to critical mechanical & electronic sub-components
const PART_DESCRIPTIONS: Record<string, Record<string, string>> = {
  'Cutting': {
    'CNC Blade Guide Gantry': 'Maintains precision XY positioning coordinates within 0.05mm tolerance.',
    'High-Speed Blade Drive Belt': 'Transmits high-torque continuous drive to the heavy rotary fabric blade.',
    'Vacuum Suction Table Pump': 'Generates strong down-draft pressure to hold fabric layers flat without slippage.',
    'Automated Blade Sharpener': 'Periodic grinding stone mechanism to re-hone the cutter edge on active runs.'
  },
  'Stitching': {
    'Hook Timing Rotary Basket': 'Synchronizes the needle eyelet trajectory with loop-taker hook alignment.',
    'Serrated Feed Dog assembly': 'Ascending transport mechanism that advances heavy woven/knit fabrics evenly.',
    'Direct-Drive Servo Assembly': 'Micro-processor managed variable speed motor providing instant needle position pacing.',
    'Lubrication Oil Chamber Filter': 'Active oil pressure pump supplying critical components to limit high-RPM frictional friction.'
  },
  'Dyeing': {
    'Pressure Sealed Safety Ring': 'Hermetic interlocking barrier resisting standard steam/pressurized liquor expansion.',
    'Thermal Tube Heat Exchanger': 'Dual-conduit heating/cooling jacket tracking specified dye profile curves.',
    'In-line Circulation Impeller': 'High-volume impeller motor ensuring chemical dispersion homogenous throughout grey roll.',
    'Direct Pneumatic Drain Siphon': 'Solenoid operated quick-exhaust valve to drain liquor without high-pressure locks.'
  },
  'Finishing': {
    'Tension Steaming Calenders': 'Smooths creases using continuous high-pressure steamed rollers.',
    'Compactor Compressing Drum': 'Restores tensioned yarn grid geometry in tubular knits to lock shrinkage thresholds.',
    'Moisture Sensor Detector': 'In-line contactless resistance sensor checking residual moisture percentage.',
    'Outfeed Alignment Tracking System': 'Pneumatic web guide keeping finished fabric running centered on receiving folders.'
  },
  'Washing': {
    'Rotary Wash Drum Suspension': 'Heavy spring and dampener structure absorbing torque shocks of heavy wet fabrics.',
    'Dosing Chemical Valve Intake': 'Automated proportional injector for direct enzyme, bleach, and softener dosing.',
    'Resistance Element Terminals': 'Armored heating rods designed to quickly reach and stabilize continuous active temperatures.',
    'De-mineralized Water Inlet Valve': 'High-flow pilot-controlled solenoid for clean softened process water supply.'
  },
  'Packaging': {
    'Pressing Plate Boiler Conduit': 'Insulated steam feed line directing continuous hot vapor directly to the pad.',
    'Pedal Vacuum Extract Fan': 'Centrifugal air blower extracting residual moisture from freshly-pressed garment batches.',
    'Carton Flap Folding Arm': 'Mechanical pneumatic lever system pre-folding container flaps on conveyor line.',
    'Conveyor Drive Sprocket': 'Synchronized heavy chain translating rotational speed onto final labeling bins.'
  },
  'Other': {
    'Primary Control IC Board': 'Integrated logic unit coordinating command inputs and motor drive signals.',
    'Cooling Fan Exhaust Sink': 'Thermal transfer block with heavy-duty heatsink to limit power supply thermal fatigue.',
    'Main Drive Transmission Gears': 'Translational reduction gears matching power delivery to operational torque standards.'
  }
};

interface WorkstationsProps {
  workstations: Machine[];
  onAdd: (m: Machine) => void;
  onUpdate: (m: Machine) => void;
  onDelete: (m: Machine) => void;
}

// Default historical logs per workstation type for rich simulation
const DEFAULT_LOGS: Record<string, string[]> = {
  Cutting: [
    '08:00 AM - Cutting table sterilized and blades sharpened.',
    '11:45 AM - Part alignment audit passed for floral print rayon.',
    '03:30 PM - Waste cutting scraps cleared and weighed.'
  ],
  Stitching: [
    '09:12 AM - Tension calibration optimized for cotton thread.',
    '01:00 PM - Needle replacement of #14-standard needle.',
    '05:00 PM - Standard motor oil level checked.'
  ],
  Washing: [
    '07:30 AM - Water purification filters flushed.',
    '10:00 AM - Softener concentration ratio set to 12:1.',
    '04:15 PM - Jet temperature test recorded 90°C.'
  ],
  Packaging: [
    '09:00 AM - Hanger rack assembly loaded.',
    '02:00 PM - Barcode scanner re-calibrated.',
    '06:00 PM - Final shipping carton loading audit passed.'
  ],
  Quality: [
    '08:30 AM - Color inspection light cabinet checked.',
    '12:15 PM - Defect log report generated for Batch-Liva.',
    '04:45 PM - Measurement tape tolerance verified.'
  ]
};

const Workstations: React.FC<WorkstationsProps> = ({ workstations, onAdd, onUpdate, onDelete }) => {
  const [filter, setFilter] = useState('');
  const [selectedWsId, setSelectedWsId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Machine>>({});
  
  // Interactive diagnostic states per workstation
  const [diagnosticsRunning, setDiagnosticsRunning] = useState<Record<string, boolean>>({});
  const [diagnosticsResult, setDiagnosticsResult] = useState<Record<string, string>>({});
  
  // Custom interactive log lines per workstation
  const [customLogs, setCustomLogs] = useState<Record<string, string[]>>({});
  const [newLogText, setNewLogText] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Operator list for assignment simulation
  const [wsOperators, setWsOperators] = useState<Record<string, string>>({
    'WS-01': 'Master Karim',
    'WS-02': 'Kamlesh Sharma',
    'WS-03': 'Hasan Ali',
    'WS-04': 'Radha Rani'
  });

  // Dynamic state tracking for workstation internal components/parts health
  const [componentHealth, setComponentHealth] = useState<Record<string, Record<string, number>>>({});

  // Dynamic carbon billing offsetting active modules
  const [carbonOffsetActive, setCarbonOffsetActive] = useState<Record<string, boolean>>({});

  const filtered = workstations.filter(w => 
    w.name.toLowerCase().includes(filter.toLowerCase()) || 
    w.type.toLowerCase().includes(filter.toLowerCase())
  );

  // Auto-select first workstation if not selected
  useEffect(() => {
    if (filtered.length > 0 && !selectedWsId) {
      setSelectedWsId(filtered[0].id);
    }
  }, [filtered, selectedWsId]);

  const selectedWs = workstations.find(w => w.id === selectedWsId) || filtered[0] || null;

  // Auto-initialize component health when first viewed
  useEffect(() => {
    if (selectedWs && !componentHealth[selectedWs.id]) {
      const parts = PART_DESCRIPTIONS[selectedWs.type] || PART_DESCRIPTIONS['Other'];
      const initial: Record<string, number> = {};
      Object.keys(parts).forEach((partName, idx) => {
        // Base starting health calculated by deterministic hashing of the machine ID and index
        const charSum = selectedWs.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + idx * 17;
        const healthVal = 62 + (charSum % 35); // 62 - 97% health to make it realistic
        initial[partName] = healthVal;
      });
      setComponentHealth(prev => ({ ...prev, [selectedWs.id]: initial }));
    }
  }, [selectedWs, componentHealth]);

  // Handle helper timeouts to auto-dismiss toasts nicely
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => {
        setToastMsg(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.type) return;
    
    const ws = { 
      ...formData, 
      id: formData.id || `WS-${Date.now().toString().slice(-4)}`,
      status: formData.status || 'ACTIVE',
      purchaseDate: formData.purchaseDate || new Date().toISOString().split('T')[0],
      nextServiceDate: formData.nextServiceDate || new Date().toISOString().split('T')[0]
    } as Machine;
    
    if (formData.id) {
      onUpdate(ws);
    } else {
      onAdd(ws);
    }
    setIsModalOpen(false);
  };

  // Run a real diagnostics doctor test simulator
  const runDiagnostics = (wsId: string) => {
    setDiagnosticsRunning(prev => ({ ...prev, [wsId]: true }));
    setTimeout(() => {
      const isOk = Math.random() > 0.15;
      const resultMsg = isOk 
        ? 'PASS - All sensors calibrated. Motor resistance 12.4Ω (Healthy). Temperature 34.2°C.' 
        : 'WARNING - Mechanical torque variance is higher than threshold limits (4.2 mm/s). Wear detected.';
      
      setDiagnosticsResult(prev => ({ ...prev, [wsId]: resultMsg }));
      setDiagnosticsRunning(prev => ({ ...prev, [wsId]: false }));

      // Update a random parts health dynamically to show live simulation
      if (selectedWs && componentHealth[selectedWs.id]) {
        const parts = Object.keys(componentHealth[selectedWs.id]);
        if (parts.length > 0) {
          const randomPart = parts[Math.floor(Math.random() * parts.length)];
          const currentH = componentHealth[selectedWs.id][randomPart];
          const newH = isOk 
            ? Math.min(100, currentH + 3) // slightly calibrated/tightened
            : Math.max(30, currentH - Math.floor(Math.random() * 15 + 10)); // drop due to diagnostics fatigue
          
          setComponentHealth(prev => ({
            ...prev,
            [selectedWs.id]: {
              ...prev[selectedWs.id],
              [randomPart]: newH
            }
          }));

          // Put a special note in logs explaining part stress
          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const stressLog = isOk
            ? `${time} - [Diagnostics OK] Micro-tension calibration on "${randomPart}" adjusted (+3% health).`
            : `${time} - [Diagnostics Stress] Mechanical drag detected on "${randomPart}" during diagnostic run. Health fell to ${newH}%.`;
          setCustomLogs(prev => ({
            ...prev,
            [wsId]: [stressLog, ...(prev[wsId] || DEFAULT_LOGS[selectedWs?.type || 'Stitching'] || [])]
          }));
        }
      }

      // Add to logs
      const logLine = `[Diagnostics Doctor] ${resultMsg}`;
      setCustomLogs(prev => ({
        ...prev,
        [wsId]: [logLine, ...(prev[wsId] || DEFAULT_LOGS[selectedWs?.type || 'Stitching'] || [])]
      }));
    }, 1800);
  };

  const addCustomLog = (wsId: string) => {
    if (!newLogText.trim()) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const logLine = `${time} - ${newLogText.trim()}`;
    setCustomLogs(prev => ({
      ...prev,
      [wsId]: [logLine, ...(prev[wsId] || DEFAULT_LOGS[selectedWs?.type || 'Stitching'] || [])]
    }));
    setNewLogText('');
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
            Active
          </span>
        );
      case 'MAINTENANCE':
      case 'SERVICE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
            Service
          </span>
        );
      case 'REPAIR':
      case 'BROKEN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400">
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
            Repair
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
            Idle
          </span>
        );
    }
  };

  const activeLogs = selectedWs ? (customLogs[selectedWs.id] || DEFAULT_LOGS[selectedWs.type] || [
    '09:00 AM - Workstation power supply initiated.',
    '12:00 PM - Standard equipment health check passed.'
  ]) : [];

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Workstations', value: workstations.length, icon: Cpu, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
          { label: 'Active Workstations', value: workstations.filter(w => w.status === 'ACTIVE' || w.status === 'RUNNING').length, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Maintenance Alerts', value: workstations.filter(w => w.status === 'MAINTENANCE' || w.status === 'REPAIR').length, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
          { label: 'Accumulated Hourly Cost', value: `₹${workstations.reduce((sum, w) => sum + (w.hourlyCost || 0), 0)}/hr`, icon: DollarSign, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' }
        ].map((metric, i) => (
          <div key={i} className={`bg-white border rounded-2xl p-4 shadow-sm flex items-center gap-4`}>
            <div className={`p-3 rounded-xl bg-opacity-10 ${metric.color.replace('text', 'bg')} ${metric.color}`}>
              <metric.icon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{metric.label}</span>
              <p className="text-xl font-extrabold text-slate-800 tracking-tight mt-0.5">{metric.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main split dashboard view */}
      <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-6 items-start">
        
        {/* Left Side: Workstations List Card */}
        <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase text-slate-500 tracking-wider">Workstations Directory</h3>
            <button 
              onClick={() => { setFormData({}); setIsModalOpen(true); }}
              className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold tracking-tight px-3 py-1.5 rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Unit</span>
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, model, type..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-bold"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-2 max-h-[550px] overflow-y-auto no-scrollbar">
            {filtered.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-xl text-slate-400 text-xs font-bold">
                No workstations found.
              </div>
            ) : (
              filtered.map(ws => {
                const isSelected = ws.id === selectedWsId;
                const operator = wsOperators[ws.id] || 'Not Assigned';
                
                return (
                  <div 
                    key={ws.id}
                    onClick={() => {
                      setSelectedWsId(ws.id);
                      setNewLogText('');
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-indigo-600 bg-indigo-50/10' : 'border-slate-200 bg-slate-50/20 hover:border-slate-300'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-extrabold uppercase bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 tracking-tight">
                            {ws.id}
                          </span>
                          {ws.model && (
                            <span className="text-[9px] font-bold text-slate-400">
                              {ws.model}
                            </span>
                          )}
                          {carbonOffsetActive[ws.id] && (
                            <span className="inline-flex items-center gap-0.5 text-[8.5px] font-black tracking-wider uppercase bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200" title="Carbon neutralized unit">
                              <Leaf className="w-2.5 h-2.5 shrink-0 text-emerald-600" />
                              Eco
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-black text-slate-800 mt-1.5">
                          {ws.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-bold mt-1">
                          Role: {ws.type} • Capacity: {ws.capacity || 'N/A'}
                        </p>
                      </div>
                      
                      {getStatusBadge(ws.status)}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 mt-3 pt-2">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[10px] text-slate-500 font-bold">
                          {operator}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-indigo-600 font-black tracking-tight">
                          ₹{ws.hourlyCost || 'N/A'}/hr
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Workstation Active Command Suite */}
        {selectedWs ? (
          <div className="space-y-6">
            
            {/* Main Diagnostics & Command panel */}
            <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-black text-slate-800">{selectedWs.name}</h2>
                    {getStatusBadge(selectedWs.status)}
                    {carbonOffsetActive[selectedWs.id] && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 animate-pulse border border-emerald-200">
                        <Leaf className="w-3 h-3 text-emerald-500" />
                        Carbon Neutral
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider">{selectedWs.type} Workstation Suite • Model {selectedWs.model || 'Standard'}</p>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setFormData(selectedWs); setIsModalOpen(true); }}
                    className="px-3.5 py-2 hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                  >
                    Edit Config
                  </button>
                  <button 
                    onClick={() => onDelete(selectedWs)}
                    className="p-2 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-all"
                    title="Retire Tool"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Real-time Simulated Telemetry Gauges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { name: 'Power Load', value: '4.8 kW', status: 'Optimal', icon: Cpu, progress: 68, color: 'text-indigo-600 bg-indigo-50 border-indigo-100', progressColor: 'bg-indigo-600' },
                  { name: 'Vibration Index', value: '1.2 mm/s', status: 'Healthy', icon: Activity, progress: 32, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', progressColor: 'bg-emerald-500' },
                  { name: 'Heater Temp', value: '88 °C', status: 'Favorable', icon: Gauge, progress: 85, color: 'text-amber-600 bg-amber-50 border-amber-100', progressColor: 'bg-amber-500' },
                  { name: 'Efficiency Index', value: '94.2%', status: 'Grade-A', icon: CheckCircle2, progress: 94, color: 'text-indigo-600 bg-indigo-50 border-indigo-100', progressColor: 'bg-indigo-600' },
                ].map((stat, i) => (
                  <div key={i} className={`p-4 rounded-xl border ${stat.color} flex flex-col justify-between space-y-3`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">{stat.name}</span>
                      <stat.icon className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-lg font-black text-slate-800 tabular-nums">{stat.value}</p>
                      <span className="text-[9px] font-bold text-slate-400">{stat.status}</span>
                    </div>
                    <div className="h-1 w-full bg-slate-200/60 rounded-full overflow-hidden">
                      <div className={`h-full ${stat.progressColor}`} style={{ width: `${stat.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Toast confirmation banner overlay */}
              {toastMsg && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-2.5 shadow-sm animate-fade-in">
                  <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-emerald-800">{toastMsg}</p>
                  </div>
                  <button onClick={() => setToastMsg(null)} className="text-emerald-400 hover:text-emerald-600 text-sm font-black leading-none px-1">×</button>
                </div>
              )}

              {/* Enhanced Manufacturing Sections: Component Breakdown & Carbon Energy Core */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
                
                {/* Visual Sub-component health monitor & parts re-alignment */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5_right">
                      <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                      Critical Mechanical & Electronic Parts
                    </h4>
                    <span className="text-[9px] font-mono text-indigo-600 font-extrabold uppercase">Calibrate health</span>
                  </div>

                  <div className="space-y-3.5 bg-slate-50/40 border border-slate-200/60 rounded-2xl p-4">
                    {Object.entries(PART_DESCRIPTIONS[selectedWs.type] || PART_DESCRIPTIONS['Other']).map(([partName, partDesc]) => {
                      const health = (componentHealth[selectedWs.id] && componentHealth[selectedWs.id][partName]) || 85;
                      
                      // Compute color indicators
                      let barColor = 'bg-emerald-500';
                      let textColor = 'text-emerald-700 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-300';
                      let statusText = 'Excellent';
                      if (health < 60) {
                        barColor = 'bg-rose-500';
                        textColor = 'text-rose-700 bg-rose-50 border-rose-100 dark:bg-rose-950/20 dark:text-rose-300';
                        statusText = 'Critical';
                      } else if (health < 75) {
                        barColor = 'bg-amber-500';
                        textColor = 'text-amber-700 bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:text-amber-300';
                        statusText = 'Attention';
                      } else if (health < 90) {
                        barColor = 'bg-indigo-500';
                        textColor = 'text-indigo-700 bg-indigo-50 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-300';
                        statusText = 'Optimal';
                      }

                      return (
                        <div key={partName} className="space-y-2 border-b border-slate-150/50 last:border-b-0 pb-3 last:pb-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h5 className="text-[11px] font-black text-slate-700">{partName}</h5>
                                <div className="group relative cursor-help shrink-0">
                                  <Info className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                                  <div className="absolute left-1/2 -translate-x-1/2 bottom-5 hidden group-hover:block bg-slate-800 text-white text-[9px] font-medium p-2 rounded shadow-md w-48 z-10 text-center leading-normal">
                                    {partDesc}
                                  </div>
                                </div>
                              </div>
                              <p className="text-[10px] text-slate-400 font-semibold leading-tight">{partDesc}</p>
                            </div>
                            
                            <div className="flex items-center gap-1.5 shrink-0 select-none">
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${textColor}`}>
                                {health}% • {statusText}
                              </span>
                              
                              <button
                                onClick={() => {
                                  // Restore this specific part to 100%
                                  setComponentHealth(prev => ({
                                    ...prev,
                                    [selectedWs.id]: {
                                      ...(prev[selectedWs.id] || {}),
                                      [partName]: 100
                                    }
                                  }));

                                  // Add log entry
                                  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                  const logLine = `${time} - [Component Calibrate] Manual tune-up initiated on "${partName}". Restored to 100% health.`;
                                  setCustomLogs(prev => ({
                                    ...prev,
                                    [selectedWs.id]: [logLine, ...(prev[selectedWs.id] || DEFAULT_LOGS[selectedWs.type] || [])]
                                  }));

                                  setToastMsg(`Component "${partName}" recalibrated and tuned successfully! Health is restored to 100%.`);
                                }}
                                disabled={health === 100}
                                className="p-1 bg-white hover:bg-slate-50 text-indigo-600 disabled:text-slate-300 border border-slate-200 rounded hover:border-indigo-300 transition-colors disabled:opacity-40"
                                title="Run Part Calibrator"
                              >
                                <Wrench className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${health}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Green Manufacturing, Carbon Offsetting, and Live Energy Meter */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                      <Leaf className="w-3.5 h-3.5 text-emerald-500" />
                      Green Tech Offset & Eco-Power Meter
                    </h4>
                    <span className="text-[9px] font-mono text-emerald-600 font-extrabold uppercase">Climate Footprint</span>
                  </div>

                  <div className="bg-slate-50/40 border border-slate-200/60 rounded-2xl p-4 space-y-4">
                    {/* Energy statistics dials */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white border border-slate-150 p-3 rounded-xl flex items-center gap-2.5">
                        <BatteryCharging className="w-4 h-4 text-indigo-500" />
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Daily Demand</p>
                          <p className="text-xs font-black text-slate-700 mt-0.5">38.4 kWh</p>
                        </div>
                      </div>
                      <div className="bg-white border border-slate-150 p-3 rounded-xl flex items-center gap-2.5">
                        <Leaf className="w-4 h-4 text-emerald-500 animate-pulse" />
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Carbon Offset</p>
                          <p className={`text-xs font-black mt-0.5 ${carbonOffsetActive[selectedWs.id] ? 'text-emerald-600' : 'text-slate-500'}`}>
                            {carbonOffsetActive[selectedWs.id] ? 'Carbon Neutral' : 'Uncompensated'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Offset contribution checkbox card */}
                    <div className={`p-4 rounded-xl border transition-all ${carbonOffsetActive[selectedWs.id] ? 'bg-emerald-50/20 border-emerald-200' : 'bg-white border-slate-200/80'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-slate-800">Enroll Carbon Offset Premium</span>
                            {carbonOffsetActive[selectedWs.id] && (
                              <span className="inline-flex items-center gap-1 text-[8px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                            Support local community solar grids and verified carbon forest assets. Enrolling adds ₹15/hr premium to support green energy initiatives.
                          </p>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 mt-0.5">
                          <input
                            type="checkbox"
                            checked={!!carbonOffsetActive[selectedWs.id]}
                            onChange={(e) => {
                              const enrolled = e.target.checked;
                              setCarbonOffsetActive(prev => ({ ...prev, [selectedWs.id]: enrolled }));

                              // Dynamic rate adjustment support
                              const deltaCost = enrolled ? 15 : -15;
                              onUpdate({
                                ...selectedWs,
                                hourlyCost: (selectedWs.hourlyCost || 0) + deltaCost
                              });

                              // Write transaction to the logs terminal
                              const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                              const logSec = enrolled 
                                ? `${time} - [Climate Credit] Carbon offsetting activated for "${selectedWs.name}". Enrolled in solar grid offset pool (+₹15/hr).`
                                : `${time} - [Climate Credit] Carbon offsetting suspended. Workstation billing reverted to standard tariff.`;
                              
                              setCustomLogs(prev => ({
                                ...prev,
                                [selectedWs.id]: [logSec, ...(prev[selectedWs.id] || DEFAULT_LOGS[selectedWs.type] || [])]
                              }));

                              setToastMsg(enrolled 
                                ? `Offsets enrolled! Workstation running cost updated to include verified solar micro-credits.` 
                                : `Offsets disabled. Running cost reverted to standard tariff.`
                              );
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>

                      {/* Carbon calculations meter */}
                      <div className="border-t border-dashed border-slate-200/80 mt-3.5 pt-3 flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Est. Carbon footprint</span>
                          <p className="text-xs font-black text-slate-700 tracking-tight mt-0.5">26.88 kg CO₂e / day</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Premium offsets tariff</span>
                          <p className="text-xs font-black text-slate-800 mt-0.5">
                            {carbonOffsetActive[selectedWs.id] ? '+₹15.00/hr' : '₹0.00 offset'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Maintenance Tasks & Service Calendars */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Operator Assignment Center */}
                <div className="border rounded-2xl p-4 bg-slate-50/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Live Operator Control</h4>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold">Assign a primary craftsman/karigar responsible for running the production route on this workstation.</p>
                  
                  <div className="flex gap-2">
                    <select 
                      value={wsOperators[selectedWs.id] || ''} 
                      onChange={e => setWsOperators(prev => ({ ...prev, [selectedWs.id]: e.target.value }))}
                      className="flex-1 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-bold text-slate-700"
                    >
                      <option value="">Choose Foreman</option>
                      <option value="Master Karim">Master Karim (Cutting Supervisor)</option>
                      <option value="Kamlesh Sharma">Kamlesh Sharma (Senior Tailor)</option>
                      <option value="Hasan Ali">Hasan Ali (Embroidery Specialist)</option>
                      <option value="Radha Rani">Radha Rani (Dry Process lead)</option>
                      <option value="Balwan Das">Balwan Das (Warehouse Lead)</option>
                    </select>
                  </div>
                </div>

                {/* Machine Lifecycle Scheduler */}
                <div className="border rounded-2xl p-4 bg-slate-50/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Service Calendar</h4>
                  </div>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Next Service Date</p>
                      <p className="text-sm font-black text-slate-700 mt-0.5">{selectedWs.nextServiceDate || 'Not Scheduled'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Last Service Date</p>
                      <p className="text-sm font-black text-slate-700 mt-0.5">{selectedWs.lastServiceDate || '2026-04-10'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const updated = {
                        ...selectedWs,
                        status: 'ACTIVE',
                        lastServiceDate: new Date().toISOString().split('T')[0],
                        nextServiceDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                      };
                      onUpdate(updated);

                      // Fully restore all sub-component health scores to 100%
                      if (componentHealth[selectedWs.id]) {
                        const restored: Record<string, number> = {};
                        Object.keys(componentHealth[selectedWs.id]).forEach(k => {
                          restored[k] = 100;
                        });
                        setComponentHealth(prev => ({ ...prev, [selectedWs.id]: restored }));
                      }

                      // Write a premium tune-up entry into the terminal feed
                      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const logLine = `${time} - [Preventive Field Service] Complete chassis wipe, oil flush, electrical line audit. All parts re-calibrated.`;
                      setCustomLogs(prev => ({
                        ...prev,
                        [selectedWs.id]: [logLine, ...(prev[selectedWs.id] || DEFAULT_LOGS[selectedWs.type] || [])]
                      }));

                      setToastMsg(`Scheduled preventive field service for "${selectedWs.name}" registered successfully! All internal sub-units calibrated to 100%.`);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50/20 text-[11px] font-bold text-indigo-700 tracking-tight transition-colors"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Run Maintenance Clean & Service</span>
                  </button>
                </div>
              </div>

              {/* Diagnostics Command Center */}
              <div className="border border-indigo-100 rounded-2xl p-4 bg-indigo-50/10 space-y-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Settings className="w-4 h-4 animate-spin text-indigo-500" />
                    Diagnostics Doctor Doctor Doctor Check
                  </h4>
                  <p className="text-[11px] text-slate-500 font-semibold">Initiate a system diagnostics doctor script to measure coil calibration and sensor impedance values.</p>
                  
                  {diagnosticsResult[selectedWs.id] && (
                    <div className="bg-slate-50 border border-slate-200 mt-2 p-2 rounded text-[10px] font-bold text-slate-600 font-mono">
                      {diagnosticsResult[selectedWs.id]}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => runDiagnostics(selectedWs.id)}
                  disabled={diagnosticsRunning[selectedWs.id]}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-[11px] font-bold tracking-tight rounded-xl shrink-0 shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  {diagnosticsRunning[selectedWs.id] ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Diagnostics Run</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Interactive Terminal log occurrence panel */}
            <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  Terminal Logging Events
                </h3>
                <span className="text-[10px] text-slate-400 font-bold font-mono">LIVESTREAM STATUS</span>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Log a machine occurrence (e.g., Oil change, tension calibration)..."
                    value={newLogText}
                    onChange={e => setNewLogText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addCustomLog(selectedWs.id); }}
                    className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
                  />
                  <button 
                    onClick={() => addCustomLog(selectedWs.id)}
                    className="px-3 bg-slate-800 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors shrink-0"
                  >
                    Add Log
                  </button>
                </div>

                <div className="h-56 overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-300 font-mono text-[11px] leading-relaxed space-y-2">
                  {activeLogs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2 select-text hover:bg-slate-800/40 p-1 rounded">
                      <span className="text-emerald-500 font-extrabold select-none">❯</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-white border rounded-2xl p-12 shadow-sm text-center text-slate-400 text-xs font-bold">
            Choose a workstation to manage commands and telemetry logs.
          </div>
        )}
      </div>

      {/* Save Modal for creating or editing machines */}
      <BaseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={formData.id ? 'Edit Workstation Configuration' : 'New Workstation Configuration'}>
        <form onSubmit={handleSave} className="space-y-4">
           <div className="space-y-1.5 flex flex-col">
              <label className="text-xs text-[#525c66] font-bold">Workstation Name <span className="text-[#ef4444]">*</span></label>
              <input required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]" />
           </div>
           
           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1.5 flex flex-col">
                <label className="text-xs text-[#525c66] font-bold">Equipment Model</label>
                <input placeholder="Juki DDL-8700" value={formData.model || ''} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]" />
             </div>
             
             <div className="space-y-1.5 flex flex-col">
                <label className="text-xs text-[#525c66] font-bold">Current Status <span className="text-[#ef4444]">*</span></label>
                <select required value={formData.status || 'ACTIVE'} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]">
                   <option value="ACTIVE">Active (Online)</option>
                   <option value="IDLE">Idle / Standby</option>
                   <option value="MAINTENANCE">Under Service</option>
                   <option value="REPAIR">Repair Alert</option>
                </select>
             </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1.5 flex flex-col">
                <label className="text-xs text-[#525c66] font-bold">Operation Type <span className="text-[#ef4444]">*</span></label>
                <select required value={formData.type || ''} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]">
                   <option value="">Select...</option>
                   <option value="Cutting">Cutting (Blade/Laser)</option>
                   <option value="Stitching">Stitching (Lockstitch/Overlock)</option>
                   <option value="Washing">Washing (Rotary Drum/Jet)</option>
                   <option value="Packaging">Packaging (Pressing/Boxing)</option>
                   <option value="Quality">Quality Control (Verification)</option>
                   <option value="Other">Other Process</option>
                </select>
             </div>
             <div className="space-y-1.5 flex flex-col">
                <label className="text-xs text-[#525c66] font-bold">Capacity Rate</label>
                <input placeholder="e.g. 500 pcs/day" value={formData.capacity || ''} onChange={e => setFormData({...formData, capacity: e.target.value})} className="w-full px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]" />
             </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1.5 flex flex-col">
                <label className="text-xs text-[#525c66] font-bold">Estimated Hourly Cost (₹)</label>
                <input type="number" value={formData.hourlyCost || ''} onChange={e => setFormData({...formData, hourlyCost: Number(e.target.value)})} className="w-full px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]" />
             </div>
             <div className="space-y-1.5 flex flex-col">
                <label className="text-xs text-[#525c66] font-bold">Next Service Date</label>
                <input type="date" value={formData.nextServiceDate || ''} onChange={e => setFormData({...formData, nextServiceDate: e.target.value})} className="w-full px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]" />
             </div>
           </div>

           <div className="pt-4 flex justify-end gap-2 border-t mt-4">
             <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-[#d1d8dd] text-[#1c2126] rounded-xl text-[13px] font-bold hover:bg-slate-50 transition-all">Cancel</button>
             <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[13px] font-bold hover:bg-indigo-700 shadow-sm transition-all animate-fade-in">Save Workstation</button>
           </div>
        </form>
      </BaseModal>
    </div>
  );
};

export default Workstations;
