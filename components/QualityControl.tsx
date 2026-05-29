
import React, { useState, useMemo } from 'react';
import { QualityReport, FabricInspection } from '../types';
import { 
  Camera, Upload, Image as ImageIcon,
  ClipboardCheck, CheckCircle, AlertTriangle, XCircle, Cpu, Plus, 
  ScrollText, Ruler, Printer, Scan, BarChart3, TrendingUp, 
  ShieldCheck, AlertOctagon, History, ArrowRight, Gauge, 
  Layers, Settings2, Trash2, CheckCircle2, ChevronRight, Info,
  RefreshCcw, Loader2
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area 
} from 'recharts';
import { analyzeQualityTrends, analyzeFabricDefect } from '../services/geminiService';
import BaseModal from './BaseModal';

interface QualityControlProps {
  reports: QualityReport[];
  inspections?: FabricInspection[];
  onAddReport?: (report: QualityReport) => void;
  onUpdateReport?: (report: QualityReport) => void;
  onAddInspection?: (inspection: FabricInspection) => void;
  currency?: string;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'];

const QualityControl: React.FC<QualityControlProps> = ({ reports, inspections = [], onAddReport, onUpdateReport, onAddInspection, currency = '₹' }) => {
  const [activeTab, setActiveTab] = useState<'GARMENT_QC' | 'FABRIC_INSPECTION' | 'ANALYTICS'>('GARMENT_QC');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [visualAnalysis, setVisualAnalysis] = useState<string | null>(null);
  const [visualAnalyzing, setVisualAnalyzing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Inspection Modal State
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
  const [inspectData, setInspectData] = useState<Partial<FabricInspection>>({
    date: new Date().toISOString().split('T')[0],
    defects: [],
    grade: 'A',
    lengthYds: 100,
    widthInch: 60
  });

  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState<any>({
    date: new Date().toISOString().split('T')[0],
    defects: []
  });

  const handleSaveReport = (e: React.FormEvent) => {
     e.preventDefault();
     if (!reportData.jobId) return;
     const newReport = {
        ...reportData,
        id: reportData.id || `QC-${Date.now().toString().slice(-4)}`,
        defectsFound: (reportData.defects as any)?.length || 0,
        defectTypes: (reportData.defects as any)?.map((d: any) => d.type) || [],
        issueSeverity: (reportData.defects as any)?.some((d: any) => d.severity === 'CRITICAL') ? 'CRITICAL' : ((reportData.defects as any)?.some((d: any) => d.severity === 'HIGH') ? 'HIGH' : 'LOW'),
     } as QualityReport;
     if (reportData.id && onUpdateReport) {
        onUpdateReport(newReport);
     } else if (onAddReport) {
        onAddReport(newReport);
     }
     setIsReportModalOpen(false);
  };

  // Intelligence Metrics
  const metrics = useMemo(() => {
    const total = reports.reduce((acc, r) => acc + r.checkedQuantity, 0);
    const defects = reports.reduce((acc, r) => acc + r.defectsFound, 0);
    const passRate = total > 0 ? Math.round(((total - defects) / total) * 100) : 100;
    const criticals = reports.filter(r => r.status === 'FAILED').length;
    return { total, defects, passRate, criticals };
  }, [reports]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    const result = await analyzeQualityTrends(reports);
    setAnalysis(result);
    setAnalyzing(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setVisualAnalysis(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVisualAnalyze = async () => {
    if (!selectedImage) return;
    setVisualAnalyzing(true);
    const result = await analyzeFabricDefect(selectedImage);
    setVisualAnalysis(result);
    setVisualAnalyzing(false);
  };

  const addDefect = (points: 1 | 2 | 3 | 4, locationYds: number = 0) => {
    const desc = points === 1 ? 'Small (< 3")' : points === 2 ? 'Medium (3-6")' : points === 3 ? 'Large (6-9")' : 'Critical (> 9")';
    setInspectData(prev => ({
        ...prev,
        defects: [...(prev.defects || []), { points, description: desc, locationYds: Number(locationYds.toFixed(1)) }]
    }));
  };

  const calculateGrade = () => {
    const totalPoints = inspectData.defects?.reduce((sum, d) => sum + d.points, 0) || 0;
    const length = inspectData.lengthYds || 100;
    const width = inspectData.widthInch || 60;
    const score = (totalPoints * 3600) / (length * width);
    const grade = score <= 20 ? 'A' : score <= 40 ? 'B' : 'REJECT';
    return { score: Math.round(score * 10) / 10, grade };
  };

  const handleSaveInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddInspection) return;
    const { score, grade } = calculateGrade();
    onAddInspection({
        id: `INS-${Date.now()}`,
        ...inspectData,
        totalPoints: inspectData.defects?.reduce((sum, d) => sum + d.points, 0) || 0,
        pointsPer100SqYds: score,
        grade: grade as any
    } as FabricInspection);
    setIsInspectModalOpen(false);
    setInspectData({ date: new Date().toISOString().split('T')[0], defects: [], grade: 'A', lengthYds: 100, widthInch: 60 });
  };

  return (
    <div className="space-y-4 h-full flex flex-col max-w-[1400px] mx-auto pb-6">
      {/* High-Density Metric Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-lg"><ShieldCheck className="w-5 h-5"/></div>
              <div><p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Pass Protocol</p><h3 className="text-lg font-bold text-slate-800 dark:text-white tabular-nums">{metrics.passRate}% Yield</h3></div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
              <div className="p-2.5 bg-red-50 dark:bg-red-900/30 text-red-600 rounded-lg"><AlertTriangle className="w-5 h-5"/></div>
              <div><p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Node Rejections</p><h3 className="text-lg font-bold text-red-600 tabular-nums">{metrics.criticals} Alerts</h3></div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg"><BarChart3 className="w-5 h-5"/></div>
              <div><p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Magnitude Audited</p><h3 className="text-lg font-bold text-slate-800 dark:text-white tabular-nums">{metrics.total.toLocaleString()} Units</h3></div>
          </div>
          <button onClick={handleAnalyze} disabled={analyzing} className="bg-slate-900 dark:bg-indigo-600 hover:bg-black text-white rounded-xl shadow-md flex items-center justify-center gap-2 font-bold text-sm transition-all active:scale-95 disabled:opacity-50">
              {analyzing ? <RefreshCcw className="w-4 h-4 animate-spin"/> : <Cpu className="w-4 h-4"/>} Neural Insights
          </button>
      </div>

      {/* Controller Section */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
              {[
                { id: 'GARMENT_QC', label: 'Finish Protocols', icon: CheckCircle2 },
                { id: 'FABRIC_INSPECTION', label: 'Roll Grading', icon: ScrollText },
                { id: 'ANALYTICS', label: 'Failure Heatmap', icon: BarChart3 }
              ].map(tab => (
                  <button 
                    key={tab.id} 
                    onClick={() => setActiveTab(tab.id as any)} 
                    className={`px-5 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <tab.icon className="w-3.5 h-3.5"/> {tab.label}
                  </button>
              ))}
          </div>
          {activeTab === 'GARMENT_QC' && (
            <button onClick={() => { setReportData({ date: new Date().toISOString().split('T')[0], defects: [] } as any); setIsReportModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95">
                <Plus className="w-4 h-4"/> New QC Report
            </button>
          )}
          {activeTab === 'FABRIC_INSPECTION' && (
            <button onClick={() => setIsInspectModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95">
                <Plus className="w-4 h-4"/> Initialize Inspection
            </button>
          )}
      </div>

      {/* Main Analysis Block */}
      {analysis && (
          <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-xl p-4 animate-slide-up flex items-start gap-4">
              <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm"><Cpu className="w-5 h-5 text-indigo-600"/></div>
              <div className="flex-1">
                  <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-widest mb-1">Gemini Quality Diagnostic</h4>
                  <p className="text-sm text-indigo-800 dark:text-indigo-300 leading-relaxed whitespace-pre-line">{analysis}</p>
                  <button onClick={() => setAnalysis(null)} className="mt-2 text-[10px] font-bold text-indigo-600 uppercase hover:underline">Dismiss Report</button>
              </div>
          </div>
      )}

      {/* View Matrix */}
      <div className="flex-1 min-h-0">
          {activeTab === 'GARMENT_QC' ? (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
                  <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 h-full flex flex-col shadow-sm overflow-hidden">
                      <div className="overflow-x-auto flex-1 custom-scrollbar">
                          <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 uppercase font-bold tracking-widest">
                              <tr>
                                  <th className="px-5 py-4">Job Node</th>
                                  <th className="px-5 py-4">Inspector</th>
                                  <th className="px-5 py-4">Defect Classification</th>
                                  <th className="px-5 py-4 text-center">Magnitude</th>
                                  <th className="px-5 py-4 text-center">Protocol Status</th>
                                  <th className="px-5 py-4 text-right">Action</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                              {reports.length > 0 ? reports.map(report => (
                                  <tr key={report.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group">
                                      <td className="px-5 py-3 font-mono font-bold text-indigo-600">{report.jobId}</td>
                                      <td className="px-5 py-3 font-bold text-slate-700 dark:text-slate-300 uppercase">{report.inspectorName || 'SYSTEM'}</td>
                                      <td className="px-5 py-3">
                                          <div className="flex items-center gap-2">
                                              <span className="text-slate-600 dark:text-slate-400 font-medium">{report.defectType.replace('_', ' ')}</span>
                                              {report.defectsFound > 0 && <span className="text-[10px] font-black text-red-500 bg-red-50 px-1.5 rounded">{report.defectsFound} Nodes</span>}
                                          </div>
                                      </td>
                                      <td className="px-5 py-3 text-center font-bold tabular-nums text-slate-500">{report.checkedQuantity}</td>
                                      <td className="px-5 py-3 text-center">
                                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                                              report.status === 'PASSED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                              report.status === 'FAILED' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                                          }`}>
                                              {report.status}
                                          </span>
                                      </td>
                                      <td className="px-5 py-3 text-right">
                                          <button className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100"><Printer className="w-4 h-4"/></button>
                                      </td>
                                  </tr>
                              )) : (
                                <tr>
                                    <td colSpan={6} className="py-32 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-inner">
                                                <ClipboardCheck className="w-10 h-10 text-slate-300 animate-pulse"/>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">No Quality Reports Detected</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initialize quality audits to begin protocol verification.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>

              {/* AI Visual Inspection Panel */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                          <Camera className="w-4 h-4 text-indigo-600" /> AI Visual Inspection
                      </h3>
                      <div className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 text-[8px] font-black uppercase tracking-widest border border-indigo-500/20">Beta</div>
                  </div>

                  <div className="flex-1 flex flex-col gap-4">
                      <div 
                        className={`relative aspect-video rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 overflow-hidden group ${
                          selectedImage ? 'border-indigo-500/50 bg-slate-50 dark:bg-slate-900' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-900/50'
                        }`}
                      >
                          {selectedImage ? (
                              <>
                                  <img src={selectedImage} alt="Defect" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                      <label className="p-2 bg-white rounded-full text-slate-900 cursor-pointer hover:scale-110 transition-transform shadow-xl">
                                          <Upload className="w-4 h-4" />
                                          <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                      </label>
                                      <button onClick={() => setSelectedImage(null)} className="p-2 bg-white rounded-full text-red-600 hover:scale-110 transition-transform shadow-xl">
                                          <Trash2 className="w-4 h-4" />
                                      </button>
                                  </div>
                              </>
                          ) : (
                              <>
                                  <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                                      <ImageIcon className="w-8 h-8 text-slate-300" />
                                  </div>
                                  <div className="text-center">
                                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Upload Defect Photo</p>
                                      <p className="text-[10px] text-slate-400 uppercase font-medium mt-1">Capture fabric anomalies for AI analysis</p>
                                  </div>
                                  <label className="mt-2 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-black transition-colors shadow-lg">
                                      Select Image
                                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                  </label>
                              </>
                          )}
                      </div>

                      <button 
                        onClick={handleVisualAnalyze} 
                        disabled={!selectedImage || visualAnalyzing}
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                      >
                          {visualAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
                          Run Visual Diagnostic
                      </button>

                      {visualAnalysis && (
                          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 animate-fade-in">
                              <div className="flex items-center gap-2 mb-2">
                                  <Cpu className="w-3 h-3 text-indigo-600" />
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">AI Assessment</span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                                  "{visualAnalysis}"
                              </p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
          ) : activeTab === 'FABRIC_INSPECTION' ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 h-full flex flex-col shadow-sm overflow-hidden">
                  <div className="overflow-x-auto flex-1 custom-scrollbar">
                      <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 uppercase font-bold tracking-widest">
                              <tr>
                                  <th className="px-5 py-4">Roll Identifier</th>
                                  <th className="px-5 py-4">Fabric Entity</th>
                                  <th className="px-5 py-4 text-center">4-Point Score</th>
                                  <th className="px-5 py-4 text-center">Magnitude (Yds)</th>
                                  <th className="px-5 py-4 text-center">Compliance Grade</th>
                                  <th className="px-5 py-4 text-right">Protocol History</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                              {inspections.length > 0 ? inspections.map(i => (
                                  <tr key={i.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group">
                                      <td className="px-5 py-3 font-mono font-bold text-slate-800 dark:text-white uppercase tracking-tight">{i.rollNumber}</td>
                                      <td className="px-5 py-3 font-bold text-slate-600 dark:text-slate-400 uppercase">{i.fabricName}</td>
                                      <td className="px-5 py-3 text-center">
                                          <div className="flex flex-col items-center gap-1">
                                              <span className="font-black text-slate-800 dark:text-white">{i.pointsPer100SqYds}</span>
                                              <div className="w-16 h-1 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                                                  <div className={`h-full ${i.pointsPer100SqYds <= 20 ? 'bg-emerald-500' : i.pointsPer100SqYds <= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{width: `${Math.min(100, (i.pointsPer100SqYds/60)*100)}%`}}></div>
                                              </div>
                                          </div>
                                      </td>
                                      <td className="px-5 py-3 text-center font-bold text-slate-500">{i.lengthYds} x {i.widthInch}"</td>
                                      <td className="px-5 py-3 text-center">
                                          <span className={`px-3 py-1 rounded text-[10px] font-black uppercase border ${
                                              i.grade === 'A' ? 'bg-emerald-600 text-white border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 
                                              i.grade === 'B' ? 'bg-amber-500 text-white border-amber-400' : 'bg-red-600 text-white border-red-500'
                                          }`}>
                                              GRADE {i.grade}
                                          </span>
                                      </td>
                                      <td className="px-5 py-3 text-right">
                                          <button className="text-[10px] font-black text-indigo-600 uppercase hover:underline opacity-0 group-hover:opacity-100 transition-opacity">Full TechPack &rarr;</button>
                                      </td>
                                  </tr>
                              )) : (
                                <tr>
                                    <td colSpan={6} className="py-32 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-inner">
                                                <ScrollText className="w-10 h-10 text-slate-300 animate-pulse"/>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">No Fabric Inspections Detected</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initialize roll grading to begin material verification.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full animate-fade-in">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col shadow-sm h-[400px]">
                    <h4 className="font-bold text-slate-800 dark:text-white mb-6 uppercase tracking-widest text-xs flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500"/> Quality Stability Trend</h4>
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={reports.slice(-15)}>
                                <defs><linearGradient id="colorPass" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="date" hide />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                                <RechartsTooltip contentStyle={{borderRadius: '12px', border:'none'}} />
                                <Area type="monotone" dataKey="checkedQuantity" stroke="#10b981" fillOpacity={1} fill="url(#colorPass)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col shadow-sm h-[400px]">
                    <h4 className="font-bold text-slate-800 dark:text-white mb-6 uppercase tracking-widest text-xs flex items-center gap-2"><AlertOctagon className="w-4 h-4 text-red-500"/> Defect Modality Heatmap</h4>
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={[
                                    { name: 'Shade Variation', value: reports.filter(r => r.defectType === 'SHADE_VARIATION').length },
                                    { name: 'Weaving Error', value: reports.filter(r => r.defectType === 'WEAVING_ERROR').length },
                                    { name: 'Stains', value: reports.filter(r => r.defectType === 'STAIN').length },
                                    { name: 'Other', value: reports.filter(r => r.defectType === 'OTHER').length },
                                ].filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                                    {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                                </Pie>
                                <RechartsTooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
          )}
      </div>

      {/* FABRIC INSPECTION MODAL */}
      <BaseModal isOpen={isInspectModalOpen} onClose={() => setIsInspectModalOpen(false)} title="Initialize 4-Point Roll Assessment" size="xl">
          <form onSubmit={handleSaveInspection} className="flex flex-col lg:flex-row gap-10">
              <div className="flex-1 space-y-6">
                  <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Roll Metadata</h4>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-tighter">Roll Sequence ID</label><input required className="w-full border dark:border-slate-700 rounded-xl p-3 text-sm font-bold bg-white dark:bg-slate-800" value={inspectData.rollNumber || ''} onChange={e => setInspectData({...inspectData, rollNumber: e.target.value})} /></div>
                          <div><label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-tighter">Fabric Node</label><input required className="w-full border dark:border-slate-700 rounded-xl p-3 text-sm font-bold bg-white dark:bg-slate-800" value={inspectData.fabricName || ''} onChange={e => setInspectData({...inspectData, fabricName: e.target.value})} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1 uppercase tracking-tighter">Total Magnitude (Yds)</label><input type="number" required className="w-full border dark:border-slate-700 rounded-xl p-3 text-sm font-bold bg-white dark:bg-slate-800" value={inspectData.lengthYds || ''} onChange={e => setInspectData({...inspectData, lengthYds: Number(e.target.value)})} /></div>
                          <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1 uppercase tracking-tighter">Egress Width (Inches)</label><input type="number" required className="w-full border dark:border-slate-700 rounded-xl p-3 text-sm font-bold bg-white dark:bg-slate-800" value={inspectData.widthInch || ''} onChange={e => setInspectData({...inspectData, widthInch: Number(e.target.value)})} /></div>
                      </div>
                  </div>

                  <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-1">Linear Defect Mapper</h4>
                      <div 
                        className="relative w-full h-16 bg-slate-100 dark:bg-slate-950 rounded-2xl cursor-crosshair border border-slate-200 dark:border-slate-700 overflow-hidden group shadow-inner"
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const clickedYds = (x / rect.width) * (inspectData.lengthYds || 100);
                            addDefect(1, clickedYds);
                        }}
                      >
                          <div className="absolute inset-0 flex justify-between px-4 pointer-events-none opacity-20">
                              {[0, 25, 50, 75, 100].map(p => <div key={p} className="h-full border-r border-indigo-500 text-[8px] font-black pt-1">{p}%</div>)}
                          </div>
                          {inspectData.defects?.map((d, i) => (
                              <div key={i} className="absolute top-0 bottom-0 w-1.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] z-10" style={{ left: `${((d.locationYds || 0) / (inspectData.lengthYds || 100)) * 100}%` }}></div>
                          ))}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium italic text-center uppercase tracking-widest">Click bar above to register anomaly coordinates</p>
                  </div>
              </div>

              <div className="w-full lg:w-96 space-y-6">
                  <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between h-[340px]">
                      <div className="absolute top-0 right-0 p-6 opacity-5"><ShieldCheck className="w-48 h-48"/></div>
                      <div className="relative z-10">
                          <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Protocol Evaluation</p>
                          <h2 className="text-5xl font-black tabular-nums tracking-tighter">{calculateGrade().score} <span className="text-sm font-bold text-slate-500 tracking-normal uppercase">Pts/100y²</span></h2>
                      </div>
                      <div className="relative z-10 space-y-4 pt-6 border-t border-white/10">
                          <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black uppercase text-slate-400">Assigned Grade</span>
                              <span className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase shadow-lg ${
                                  calculateGrade().grade === 'A' ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 
                                  calculateGrade().grade === 'B' ? 'bg-amber-500 text-white' : 'bg-red-600 text-white'
                              }`}>GRADE {calculateGrade().grade}</span>
                          </div>
                          <button type="submit" className="w-full bg-white text-slate-900 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2">Commit Assessment Protocol <ArrowRight className="w-4 h-4"/></button>
                      </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl shadow-sm">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Anomaly Ledger</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                          {inspectData.defects?.map((d, i) => (
                              <div key={i} className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl text-[10px] font-bold border border-slate-100 dark:border-slate-800">
                                  <div className="flex items-center gap-2">
                                      <span className="text-indigo-600 font-black font-mono">@{d.locationYds}y</span>
                                      <span className="text-slate-600 dark:text-slate-400 uppercase">{d.description}</span>
                                  </div>
                                  <span className="bg-red-50 dark:bg-red-900/30 text-red-600 px-2 py-0.5 rounded-lg border border-red-100 dark:border-red-900">{d.points} PTS</span>
                              </div>
                          ))}
                          {inspectData.defects?.length === 0 && <p className="text-center text-slate-400 italic py-6">Ledger clear</p>}
                      </div>
                  </div>
              </div>
          </form>
      </BaseModal>

      {/* QC REPORT MODAL */}
      <BaseModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="New Garment QC Check" size="md">
        <form onSubmit={(e) => {
             e.preventDefault();
             if (!reportData.jobId) return;
             const newReport = {
                ...reportData,
                id: reportData.id || `QC-${Date.now().toString().slice(-4)}`,
                date: reportData.date || new Date().toISOString().split('T')[0],
                status: (reportData.defectsFound || 0) === 0 ? 'PASSED' : 'FAILED'
             } as QualityReport;
             if (reportData.id && onUpdateReport) onUpdateReport(newReport);
             else if (onAddReport) onAddReport(newReport);
             setIsReportModalOpen(false);
          }} className="space-y-6">
           <div className="space-y-1">
               <label className="text-xs font-bold text-slate-500 uppercase">Work Order ID</label>
               <input required value={reportData.jobId || ''} onChange={e => setReportData({...reportData, jobId: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" placeholder="e.g. WO-1024" />
           </div>
           
           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-500 uppercase">Checked Qty</label>
                 <input type="number" required value={reportData.checkedQuantity || ''} onChange={e => setReportData({...reportData, checkedQuantity: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all tabular-nums" placeholder="0" />
             </div>
             <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-500 uppercase">Defects Found</label>
                 <input type="number" required value={reportData.defectsFound || ''} onChange={e => setReportData({...reportData, defectsFound: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all tabular-nums" placeholder="0" />
             </div>
           </div>

           <div className="space-y-1">
               <label className="text-xs font-bold text-slate-500 uppercase">Defect Type</label>
               <select value={reportData.defectType || ''} onChange={e => setReportData({...reportData, defectType: e.target.value as any})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                  <option value="">No Defect</option>
                  <option value="SHADE_VARIATION">Shade Variation</option>
                  <option value="WEAVING_ERROR">Weaving Error</option>
                  <option value="STAIN">Stain / Spot</option>
                  <option value="OTHER">Other Issues</option>
               </select>
           </div>
           
           <div className="space-y-1">
               <label className="text-xs font-bold text-slate-500 uppercase">Inspector Name</label>
               <input value={reportData.inspectorName || ''} onChange={e => setReportData({...reportData, inspectorName: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" placeholder="System user" />
           </div>

           <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setIsReportModalOpen(false)} className="px-5 py-2 text-slate-500 hover:text-slate-800 text-sm font-bold transition-colors">Cancel</button>
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg transition-all">Submit Protocol</button>
           </div>
        </form>
      </BaseModal>
    </div>
  );
};

export default QualityControl;
