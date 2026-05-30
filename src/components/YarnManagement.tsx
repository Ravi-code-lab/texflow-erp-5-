import React, { useState, useMemo } from 'react';
import { 
  GitBranch, Plus, Search, Tag, Database, Activity, 
  Trash2, Filter, Weight, FileText, Check, AlertCircle, RefreshCw
} from 'lucide-react';
import { YarnLot, YarnBlend, YarnType, YarnStatus, Supplier } from '../types';

interface YarnManagementProps {
  lots: YarnLot[];
  suppliers: Supplier[];
  onAddLot: (lot: YarnLot) => void;
  onUpdateLot: (lot: YarnLot) => void;
  onDeleteLot: (lotId: string) => void;
  currency?: string;
}

const STOCK_LOCATIONS = ['Warehouse A (Raw Fiber)', 'Warehouse B (Yarn Creel)', 'Godown-3 (Spinning Room)', 'Dye-House Buffer'];

export const YarnManagement: React.FC<YarnManagementProps> = ({
  lots, suppliers, onAddLot, onUpdateLot, onDeleteLot, currency = '₹'
}) => {
  const [currentTab, setCurrentTab] = useState<'LOTS' | 'BLENDS' | 'ANALYSIS'>('LOTS');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  // New Yarn Lot Form states
  const [isAddingLot, setIsAddingLot] = useState(false);
  const [newLotNumber, setNewLotNumber] = useState('');
  const [newType, setNewType] = useState<YarnType>('COTTON');
  const [newCount, setNewCount] = useState('40s combed');
  const [newTwist, setNewTwist] = useState('Z-Twist');
  const [newShade, setNewShade] = useState('Raw White');
  const [newPrice, setNewPrice] = useState<number>(310);
  const [newQty, setNewQty] = useState<number>(500);
  const [newLocation, setNewLocation] = useState(STOCK_LOCATIONS[0]);
  const [newSupplier, setNewSupplier] = useState('Vardhman Spinning Mills');
  const [newNotes, setNewNotes] = useState('');

  // Performance Analysis Testing States
  const [selectedLotForTest, setSelectedLotForTest] = useState<string>('');
  const [testTenacity, setTestTenacity] = useState<number>(22.4);  // cN/tex
  const [testElongation, setTestElongation] = useState<number>(6.2); // %
  const [testMoisture, setTestMoisture] = useState<number>(8.5);    // %
  const [testEvenness, setTestEvenness] = useState<number>(11.2);   // Uster%

  // Blend Composition Form
  const [blends, setBlends] = useState<YarnBlend[]>([
    {
      id: 'BLEND-PC6535',
      name: 'Polyester Cotton (PC 65/35)',
      components: [
        { yarnType: 'POLYESTER', percentage: 65 },
        { yarnType: 'COTTON', percentage: 35 }
      ],
      targetCount: '30s carded',
      twist: 'Z-Twist',
      status: 'ACTIVE',
      notes: 'Standard blended yarn for kurti stitching warp threads.'
    },
    {
      id: 'BLEND-CVC6040',
      name: 'Chief Value Cotton (CVC 60/40)',
      components: [
        { yarnType: 'COTTON', percentage: 60 },
        { yarnType: 'POLYESTER', percentage: 40 }
      ],
      targetCount: '40s combed',
      twist: 'Z-Twist',
      status: 'ACTIVE',
      notes: 'Premium softness with durable synthetic composition.'
    }
  ]);
  const [newBlendName, setNewBlendName] = useState('');
  const [newBlendCompPercent, setNewBlendCompPercent] = useState<number>(50);

  // Filter & Search Yarn Lots
  const filteredLots = useMemo(() => {
    return lots.filter(lot => {
      const matchesSearch = lot.lotNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            lot.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            lot.count?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            lot.supplierName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || lot.type === filterType;
      const matchesStatus = filterStatus === 'all' || lot.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [lots, searchQuery, filterType, filterStatus]);

  // Aggregate Metrics
  const totalYarnStock = useMemo(() => {
    return lots.reduce((acc, curr) => acc + (curr.currentQty || 0), 0);
  }, [lots]);

  const totalYarnValue = useMemo(() => {
    return lots.reduce((acc, curr) => acc + ((curr.currentQty || 0) * (curr.pricePerKg || 0)), 0);
  }, [lots]);

  // Add Yarn Lot Submit Handler
  const handleAddLotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLotNumber) return;

    const key = `LOT-${Date.now()}`;
    const preparedLot: YarnLot = {
      id: key,
      lotNumber: newLotNumber,
      type: newType,
      count: newCount,
      twist: newTwist,
      shade: newShade,
      receivedQty: Number(newQty),
      currentQty: Number(newQty),
      pricePerKg: Number(newPrice),
      receivedDate: new Date().toISOString().split('T')[0],
      location: newLocation,
      supplierName: newSupplier,
      notes: newNotes,
      status: 'AVAILABLE',
      tenacity: 21.5,
      elongation: 5.8,
      moisture: 7.5,
      evenness: 12.0
    };

    onAddLot(preparedLot);
    setIsAddingLot(false);
    setNewLotNumber('');
    setNewNotes('');

    // Select this created lot for testing automatically
    setSelectedLotForTest(key);
  };

  // Run/Log Performance Test
  const handleUpdateQualitySpecs = () => {
    const lotToSpec = lots.find(l => l.id === selectedLotForTest);
    if (!lotToSpec) return;

    const updatedLot: YarnLot = {
      ...lotToSpec,
      tenacity: Number(testTenacity),
      elongation: Number(testElongation),
      moisture: Number(testMoisture),
      evenness: Number(testEvenness),
      status: Number(testEvenness) > 15 ? 'HOLD' : 'AVAILABLE'
    };

    onUpdateLot(updatedLot);
    setBannerMsg(`Garment Quality lab metrics documented for Batch ${lotToSpec.lotNumber}! Status updated to: ${updatedLot.status}.`);
    setTimeout(() => setBannerMsg(null), 5000);
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden text-left">
      
      {/* HEADER ACTION BAR */}
      <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Fabric Roll & Trim Sourcing</span>
              <span className="text-xs text-[#4f46e5] bg-[#eeebff] px-2.5 py-0.5 rounded-full font-bold border border-[#dcd3ff]">ERP Apparel Studio</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Audit active fabric rolls, widths, GSM grades, blend compositions, and shrinkage quality credentials.</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsAddingLot(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Sourcing Inward Roll/Asset
            </button>
          </div>
        </div>
        
        {/* TABS */}
        <div className="flex gap-4 mt-4 border-t border-slate-100 pt-3 text-xs">
          <button 
            onClick={() => setCurrentTab('LOTS')}
            className={`font-bold pb-2 border-b-2 transition-all px-1 ${currentTab === 'LOTS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Fabric & Trim Stock Ledger
          </button>
          <button 
            onClick={() => setCurrentTab('BLENDS')}
            className={`font-bold pb-2 border-b-2 transition-all px-1 ${currentTab === 'BLENDS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Fabric Compositions (Rayon/Cotton GSM)
          </button>
          <button 
            onClick={() => setCurrentTab('ANALYSIS')}
            className={`font-bold pb-2 border-b-2 transition-all px-1 ${currentTab === 'ANALYSIS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Shrinkage & Color Lab Testing
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
        
        {/* METRICS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white border border-[#d1d8dd] p-4 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
              <Weight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Fabric Stock</p>
              <p className="text-xl font-black text-indigo-600 block mt-0.5">{totalYarnStock.toLocaleString()} Meters</p>
            </div>
          </div>

          <div className="bg-white border border-[#d1d8dd] p-4 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Estimated Valuation</p>
              <p className="text-xl font-black text-emerald-600 block mt-0.5">{currency}{totalYarnValue.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white border border-[#d1d8dd] p-4 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-violet-50 text-violet-600 rounded-lg shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Fabric Roll Batches</p>
              <p className="text-xl font-black text-violet-600 block mt-0.5">{lots.length} active batches</p>
            </div>
          </div>
        </div>

        {/* 1. STOCK LEDGER TAB */}
        {currentTab === 'LOTS' && (
          <div className="space-y-6">
            
            {/* Filter and Search Bar */}
            <div className="bg-white border border-[#d1d8dd] rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between text-xs">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by Roll/Ref no, Material category, Width or Sourcing Supplier..."
                  className="w-full pl-9 pr-4 py-2 border border-[#d1d8dd] rounded-lg bg-[#fafbfb] focus:outline-none focus:border-indigo-600 text-xs"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-bold">Fiber Type:</span>
                  <select 
                    value={filterType} 
                    onChange={e => setFilterType(e.target.value)}
                    className="p-1 px-3 border border-[#d1d8dd] rounded-md focus:outline-none bg-white font-medium"
                  >
                    <option value="all">All Fibers</option>
                    <option value="COTTON">Cotton</option>
                    <option value="POLYESTER">Polyester</option>
                    <option value="SILK">Silk</option>
                    <option value="WOOL">Wool</option>
                    <option value="VISCOSE">Viscose</option>
                    <option value="BLENDED">Blended</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-bold">Inspection:</span>
                  <select 
                    value={filterStatus} 
                    onChange={e => setFilterStatus(e.target.value)}
                    className="p-1 px-3 border border-[#d1d8dd] rounded-md focus:outline-none bg-white font-medium"
                  >
                    <option value="all">All Status</option>
                    <option value="AVAILABLE">Available</option>
                    <option value="ISSUED">Issued</option>
                    <option value="HOLD">QC Hold</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              </div>
            </div>            {/* LOT TABLE */}
            <div className="bg-white border border-[#d1d8dd] rounded-xl overflow-hidden shadow-macos-sm">
              <div className="p-4 border-b border-[#slate-100] bg-slate-50/50 flex justify-between items-center">
                <span className="font-bold text-xs text-slate-700">Fabric Rolls & Accessories Sourced</span>
                <span className="text-[10px] text-slate-400 font-mono">Showing {filteredLots.length} of {lots.length} records</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] text-left divide-y divide-[#d1d8dd]">
                  <thead className="bg-[#f8fafc] text-slate-600 font-bold text-xs uppercase select-none">
                    <tr>
                      <th className="px-5 py-3">Roll/Trim Reference</th>
                      <th className="px-5 py-3">Material Category</th>
                      <th className="px-5 py-3">Width & Shade</th>
                      <th className="px-5 py-3 text-right">Available Stock</th>
                      <th className="px-5 py-3 text-right">Rate/Mtr</th>
                      <th className="px-5 py-3">Store Location</th>
                      <th className="px-5 py-3 text-center">Status</th>
                      <th className="px-5 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredLots.length > 0 ? (
                       filteredLots.map(lot => (
                        <tr key={lot.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-4">
                            <div>
                              <p className="font-bold text-slate-800">{lot.lotNumber}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {lot.id}</p>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div>
                              <span className="inline-block bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{lot.type}</span>
                              <p className="text-xs text-slate-500 mt-1 font-semibold">{lot.count}</p>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div>
                              <p className="text-slate-800 text-xs font-bold">{lot.twist}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{lot.shade || 'Piece Dyed'}</p>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div>
                              <p className="font-black text-slate-800">
                                {lot.currentQty} {lot.twist?.toLowerCase().includes('lace') || lot.twist?.toLowerCase().includes('box') ? 'Units' : 'Meters'}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Inwarded: {lot.receivedQty} Mtr
                              </p>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right text-emerald-600 font-bold">
                            {currency}{lot.pricePerKg}
                          </td>
                          <td className="px-5 py-4 text-slate-600 text-xs">
                            <div>
                              <p className="font-medium text-slate-800">{lot.location || 'N/A'}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[150px]" title={lot.supplierName}>{lot.supplierName}</p>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <select
                              value={lot.status}
                              onChange={(e) => {
                                onUpdateLot({
                                  ...lot,
                                  status: e.target.value as YarnStatus
                                });
                              }}
                              className={`text-[10px] font-extrabold tracking-wide rounded border p-1 focus:outline-none cursor-pointer transition-all ${
                                lot.status === 'AVAILABLE' ? 'bg-green-50 text-green-800 border-green-200' :
                                lot.status === 'HOLD' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                lot.status === 'CONSUMED' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                'bg-red-50 text-red-800 border-red-200'
                              }`}
                            >
                              <option value="AVAILABLE">AVAILABLE</option>
                              <option value="HOLD">QC HOLD</option>
                              <option value="CONSUMED">CONSUMED</option>
                              <option value="REJECTED">REJECTED</option>
                            </select>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <button 
                              onClick={() => onDeleteLot(lot.id)}
                              className="p-1 hover:bg-red-50 text-red-500 rounded transition-all"
                              title="Delete Lot"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-5 py-12 text-center text-slate-400 font-normal">
                          <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                          No yarn lots found on ledger. Sourcing coordinates empty.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* 2. BLEND COMBINATIONS TAB */}
        {currentTab === 'BLENDS' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left lists */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white border border-[#d1d8dd] rounded-xl p-5 space-y-4">
                <div className="border-b pb-2">
                  <h4 className="font-bold text-sm text-[#1c2126]">Blended Yarn Definitions</h4>
                  <p className="text-xs text-slate-500">Formulas for core spun blended thread profiles used on the loom warp/weft structures.</p>
                </div>

                <div className="space-y-4">
                  {blends.map(blend => (
                    <div key={blend.id} className="p-4 bg-slate-50 border border-[#eef1f4] rounded-lg hover:border-slate-300 transition-all text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1.5 flex-1 max-w-sm">
                        <p className="font-bold text-slate-800 text-sm">{blend.name}</p>
                        <p className="text-slate-500 italic mt-0.5">"{blend.notes}"</p>
                        <div className="flex gap-2 items-center pt-2">
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">COUNT: {blend.targetCount}</span>
                          <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px] font-bold">{blend.twist}</span>
                        </div>
                      </div>

                      {/* Blend percentage bars */}
                      <div className="w-full sm:w-64 space-y-2">
                        <p className="font-bold text-slate-700">Blend Ratio:</p>
                        <div className="h-6 w-full bg-slate-200 rounded-lg overflow-hidden flex text-[9px] font-black tracking-tight text-white select-none">
                          {blend.components.map((comp, idx) => {
                            const isEven = idx % 2 === 0;
                            return (
                              <div 
                                key={comp.yarnType} 
                                className={`h-full flex items-center justify-center ${isEven ? 'bg-indigo-600' : 'bg-pink-600'}`}
                                style={{ width: `${comp.percentage}%` }}
                              >
                                {comp.percentage}% {comp.yarnType}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Helper Sidebar */}
            <div className="space-y-4">
              <div className="bg-[#ebf8ff] border border-blue-200 rounded-xl p-5 text-xs space-y-3">
                <h5 className="font-bold text-[13px] text-blue-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  What is Warp/Weft Blending?
                </h5>
                <p className="text-blue-800 leading-relaxed">
                  Apparel manufacturing requires exact fiber tensile performance. By specifying blend combinations like **Polyester/Cotton (PC 65/35)**, weavers achieve high tear resistance with cotton core softness. Use the **BOM recipe builder** to requisition blends onto active loom operations.
                </p>
                <div className="bg-white/80 p-3 rounded border border-blue-100">
                  <p className="font-bold text-slate-800">Moisture Regain Guide:</p>
                  <ul className="list-disc pl-4 mt-1.5 text-[11px] text-slate-600 space-y-1">
                    <li>Cotton standard: 8.5%</li>
                    <li>Polyester standard: 0.4%</li>
                    <li>Nylon standard: 4.5%</li>
                  </ul>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 3. LABORATORY TESTING TAB */}
        {currentTab === 'ANALYSIS' && (
          <div className="bg-white border border-[#d1d8dd] rounded-xl p-5 space-y-6">
            <div className="border-b pb-2">
              <h4 className="font-bold text-sm text-[#1c2126]">Spinning Laboratory & Quality Analysis</h4>
              <p className="text-xs text-slate-500">Validate breaking tenacity, elongation-at-break, and moisture regain parameters on sourced packages.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-xs">
              
              {/* Field form */}
              <div className="space-y-4 bg-slate-50 p-5 rounded-lg border border-[#eef1f4]">
                <h5 className="font-bold text-slate-800 border-b pb-2">Enter Quality Spec Diagnostics</h5>

                <div className="space-y-1 flex flex-col">
                  <label className="font-semibold text-slate-600">Select Yarn Lot under Diagnostic</label>
                  <select 
                    value={selectedLotForTest}
                    onChange={e => {
                      setSelectedLotForTest(e.target.value);
                      const lot = lots.find(l => l.id === e.target.value);
                      if (lot) {
                        setTestTenacity(lot.tenacity || 22.0);
                        setTestElongation(lot.elongation || 6.0);
                        setTestMoisture(lot.moisture || 8.0);
                        setTestEvenness(lot.evenness || 11.0);
                      }
                    }}
                    className="p-2 border border-[#d2d9df] bg-white rounded-lg focus:outline-none"
                  >
                    <option value="">Choose sourced lot...</option>
                    {lots.map(l => (
                      <option key={l.id} value={l.id}>{l.lotNumber} ({l.type} - {l.count})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 flex flex-col">
                    <label className="font-semibold text-slate-600">Tenacity (cN/tex)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={testTenacity}
                      onChange={e => setTestTenacity(Number(e.target.value))}
                      className="p-2 border border-[#d2d9df] bg-white rounded-lg font-bold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1 flex flex-col">
                    <label className="font-semibold text-slate-600">Elongation at Break (%)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={testElongation}
                      onChange={e => setTestElongation(Number(e.target.value))}
                      className="p-2 border border-[#d2d9df] bg-white rounded-lg font-bold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1 flex flex-col">
                    <label className="font-semibold text-slate-600">Moisture Content (%)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={testMoisture}
                      onChange={e => setTestMoisture(Number(e.target.value))}
                      className="p-2 border border-[#d2d9df] bg-white rounded-lg font-bold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1 flex flex-col">
                    <label className="font-semibold text-slate-600">Evenness (Uster %)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={testEvenness}
                      onChange={e => setTestEvenness(Number(e.target.value))}
                      className="p-2 border border-[#d2d9df] bg-white rounded-lg font-bold text-slate-800"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleUpdateQualitySpecs}
                  disabled={!selectedLotForTest}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2 rounded-lg"
                >
                  Post Spinning Lab Credentials
                </button>
              </div>

              {/* Gauge Displays */}
              {selectedLotForTest ? (
                <div className="p-4 space-y-6 border border-[#eef1f4] rounded-lg">
                  <div className="flex justify-between items-center bg-indigo-50/50 p-2.5 rounded border border-indigo-100">
                    <span className="font-bold text-indigo-900 uppercase">Selected Lot Spec Report Card</span>
                    <span className="font-mono text-slate-500 font-extrabold">{lots.find(l => l.id === selectedLotForTest)?.lotNumber}</span>
                  </div>

                  <div className="space-y-4">
                    {/* Tenacity gauge */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-bold">
                        <span className="text-slate-600">Tenacity (Standard: 15-25 cN/tex)</span>
                        <span className={testTenacity >= 18 ? 'text-green-600' : 'text-red-600'}>{testTenacity} cN/tex</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, (testTenacity / 30) * 100)}%` }} />
                      </div>
                    </div>

                    {/* Elongation */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-bold">
                        <span className="text-slate-600">Elongation at Break (Standard: 5-8%)</span>
                        <span className="text-indigo-600">{testElongation}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, (testElongation / 10) * 100)}%` }} />
                      </div>
                    </div>

                    {/* Moisture content */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-bold">
                        <span className="text-slate-600">Moisture Content (Standard: 7-9%)</span>
                        <span className={(testMoisture >= 7 && testMoisture <= 9) ? 'text-green-600' : 'text-amber-600'}>{testMoisture}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, (testMoisture / 15) * 100)}%` }} />
                      </div>
                    </div>

                    {/* Evenness */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-bold">
                        <span className="text-slate-600">Evenness / Irregularity (Uster % - Fail if &gt; 15%)</span>
                        <span className={testEvenness > 15 ? 'text-red-600 font-extrabold shadow-sm bg-red-50 px-1 rounded' : 'text-green-600'}>{testEvenness}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, (testEvenness / 20) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 border border-dashed rounded-lg flex flex-col justify-center items-center text-slate-400">
                  <Activity className="w-10 h-10 mb-2 text-slate-300" />
                  Select a lot block on the left to review metrics
                </div>
              )}

            </div>
          </div>
        )}

      </div>

      {/* SOURCING INWARD LOT MODAL */}
      {isAddingLot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden border border-[#d1d8dd] shadow-macos-lg text-left text-xs">
            <div className="p-4 border-b border-[#eef1f4] flex justify-between items-center bg-[#fafbfc]">
              <span className="font-bold text-[14px]">Sourcing Inward Fabric Roll / Trims</span>
              <button onClick={() => setIsAddingLot(false)} className="text-slate-400 hover:text-slate-600">
                <Trash2 className="w-4 h-4 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleAddLotSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 flex flex-col col-span-2">
                  <label className="font-bold text-slate-700">Inward Batch / Fabric Roll Reference <span className="text-red-600">*</span></label>
                  <input 
                    type="text" 
                    value={newLotNumber}
                    onChange={e => setNewLotNumber(e.target.value)}
                    placeholder="e.g. ROLL-RAYON-140GSM-001"
                    required
                    className="p-2 border border-[#d1d8dd] rounded-lg focus:outline-none"
                  />
                </div>

                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-slate-700">Material Category</label>
                  <select 
                    value={newType}
                    onChange={e => setNewType(e.target.value as YarnType)}
                    className="p-2 border border-[#d1d8dd] bg-white rounded-lg focus:outline-none"
                  >
                    <option value="COTTON">Cotton Cambric</option>
                    <option value="VISCOSE">Rayon Liva (140 GSM)</option>
                    <option value="SILK">Banarasi Art Silk</option>
                    <option value="LINEN">Pure Linen</option>
                    <option value="POLYESTER">Georgette / Crepe</option>
                    <option value="BLENDED">Gota / Zari Trim Lace</option>
                  </select>
                </div>

                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-slate-700">Fabric GSM / Accessory Detail</label>
                  <input 
                    type="text"
                    value={newCount}
                    onChange={e => setNewCount(e.target.value)}
                    className="p-2 border border-[#d1d8dd] rounded-lg"
                    placeholder="e.g. 140 GSM, 60-S Cambric"
                  />
                </div>

                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-slate-700">Roll Width / Pack Unit</label>
                  <select 
                    value={newTwist}
                    onChange={e => setNewTwist(e.target.value)}
                    className="p-2 border border-[#d1d8dd] bg-white rounded-lg focus:outline-none"
                  >
                    <option value="44 inches width">44 inches width</option>
                    <option value="58 inches width">58 inches width</option>
                    <option value="60 inches width">60 inches width</option>
                    <option value="Lace Roll (9 Mtr)">Lace Roll (9 Mtr)</option>
                    <option value="Pack Boxes">Pack Boxes / Buttons</option>
                  </select>
                </div>

                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-slate-700">Color / Pantone Shade</label>
                  <input 
                    type="text"
                    value={newShade}
                    onChange={e => setNewShade(e.target.value)}
                    className="p-2 border border-[#d1d8dd] rounded-lg"
                    placeholder="e.g. Saffron Yellow (Pantone-14-1064)"
                  />
                </div>

                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-slate-700">Received Quantity (Mtr / Units)</label>
                  <input 
                    type="number"
                    value={newQty}
                    onChange={e => setNewQty(Number(e.target.value))}
                    className="p-2 border border-[#d1d8dd] rounded-lg focus:outline-none"
                  />
                </div>

                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-slate-700">Sourcing Rate/Mtr ({currency})</label>
                  <input 
                    type="number"
                    value={newPrice}
                    onChange={e => setNewPrice(Number(e.target.value))}
                    className="p-2 border border-[#d1d8dd] rounded-lg focus:outline-none"
                  />
                </div>

                <div className="space-y-1 flex flex-col col-span-2">
                  <label className="font-bold text-slate-700">Store Godown Location</label>
                  <select 
                    value={newLocation}
                    onChange={e => setNewLocation(e.target.value)}
                    className="p-2 border border-[#d1d8dd] bg-white rounded-lg focus:outline-none"
                  >
                    {STOCK_LOCATIONS.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 flex flex-col col-span-2">
                  <label className="font-bold text-slate-700">Sourcing Supplier / Vendor Partner</label>
                  <select 
                    value={newSupplier}
                    onChange={e => setNewSupplier(e.target.value)}
                    className="p-2 border border-[#d1d8dd] bg-white rounded-lg focus:outline-none"
                    required
                  >
                    <option value="">Select registered supplier...</option>
                    {suppliers.map(sup => (
                      <option key={sup.id} value={sup.name}>{sup.name} ({sup.location})</option>
                    ))}
                    <option value="Direct Spot Sourcing">Direct Spot Sourcing / Spot Market</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-[#eef1f4]">
                <button 
                  type="button" 
                  onClick={() => setIsAddingLot(false)}
                  className="px-4 py-2 border rounded-lg text-[#1c2126] font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Post Sourcing Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
