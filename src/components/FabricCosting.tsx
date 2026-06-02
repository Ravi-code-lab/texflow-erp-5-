import React, { useState, useMemo } from 'react';
import { 
  Coins, Plus, Calculator, Settings, HelpCircle, 
  Trash2, RefreshCw, Layers, Check, Download, AlertCircle
} from 'lucide-react';
import { FabricCosting, FabricCostingItem, Design, InventoryItem, YarnLot } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FabricCostingProps {
  costings: FabricCosting[];
  designs: Design[];
  inventory: InventoryItem[];
  yarnLots: YarnLot[];
  onAddCosting: (costing: FabricCosting) => void;
  onUpdateCosting: (costing: FabricCosting) => void;
  onDeleteCosting: (costingId: string) => void;
  currency?: string;
  companyInfo?: any;
}

const DEFAULT_YARN_FIBERS = [
  { name: 'Pure Rayon Liva Fabric (Meters)', rate: 85, category: 'Fabric Base' },
  { name: 'Standard Kurti Stitching Labor', rate: 70, category: 'Tailoring' },
  { name: 'Computer embroidery neck design', rate: 55, category: 'Embellishment' },
  { name: 'Cotton Gota border laces', rate: 15, category: 'Trims' }
];

export const FabricCostingWorkspace: React.FC<FabricCostingProps> = ({
  costings, designs, inventory, yarnLots = [], onAddCosting, onUpdateCosting, onDeleteCosting, currency = '₹', companyInfo
}) => {
  const [selectedCostingId, setSelectedCostingId] = useState('');
  const [isCreatingCosting, setIsCreatingCosting] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState('');
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  // Form State
  const [newCostingName, setNewCostingName] = useState('');
  const [newDesignId, setNewDesignId] = useState('');
  const [newFabricType, setNewFabricType] = useState('Rayon Liva (140 GSM)');
  const [newWidth, setNewWidth] = useState<number>(44); // standard 44 inches width
  const [newGsm, setNewGsm] = useState<number>(140);
  const [newConstruction, setNewConstruction] = useState('60-s Cambric weave');

  // Interactive dynamic items inside the active costing sheet
  const [activeItems, setActiveItems] = useState<FabricCostingItem[]>([
    { id: '1', name: 'Rayon Liva Base Fabric (140 GSM)', category: 'YARN', qty: 2.25, unit: 'METER', ratePerUnit: 85, wastagePercent: 4, amount: 198.90 },
    { id: '2', name: 'Gota/Lace Trim & Branded Labels', category: 'OTHER', qty: 1, unit: 'SET', ratePerUnit: 24, wastagePercent: 0, amount: 24.00 },
    { id: '3', name: 'Master Tailor Stitching Charge', category: 'WEAVING', qty: 1, unit: 'PIECE', ratePerUnit: 75, wastagePercent: 0, amount: 75.00 },
    { id: '4', name: 'Front Neck Chikan Embroidery', category: 'DYEING', qty: 1, unit: 'PIECE', ratePerUnit: 55, wastagePercent: 0, amount: 55.00 },
    { id: '5', name: 'Post-stitch Softener Wash & Iron', category: 'FINISHING', qty: 1, unit: 'PIECE', ratePerUnit: 15, wastagePercent: 0, amount: 15.00 },
    { id: '6', name: 'Hanger, Polybag + Printed Barcode Box', category: 'PACKING', qty: 1, unit: 'PIECE', ratePerUnit: 20, wastagePercent: 0, amount: 20.00 }
  ]);

  // Adjustments configuration
  const [activeOverhead, setActiveOverhead] = useState<number>(10); // 10%
  const [activeProfit, setActiveProfit] = useState<number>(20);     // 20%
  const [activeTax, setActiveTax] = useState<number>(5);         // 5% GST

  // Compute calculated metrics
  const rawMaterialCost = useMemo(() => {
    return activeItems
      .filter(item => item.category === 'YARN' || item.category === 'OTHER')
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [activeItems]);

  const processingCost = useMemo(() => {
    return activeItems
      .filter(item => ['WEAVING', 'DYEING', 'FINISHING', 'PACKING', 'OVERHEAD'].includes(item.category))
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [activeItems]);

  const primeCost = useMemo(() => rawMaterialCost + processingCost, [rawMaterialCost, processingCost]);

  const overheadVal = useMemo(() => {
    return primeCost * (activeOverhead / 100);
  }, [primeCost, activeOverhead]);

  const subTotalBeforeProfit = useMemo(() => primeCost + overheadVal, [primeCost, overheadVal]);

  const profitVal = useMemo(() => {
    return subTotalBeforeProfit * (activeProfit / 100);
  }, [subTotalBeforeProfit, activeProfit]);

  const fabricBaseSellingPrice = useMemo(() => subTotalBeforeProfit + profitVal, [subTotalBeforeProfit, profitVal]);

  const taxVal = useMemo(() => {
    return fabricBaseSellingPrice * (activeTax / 100);
  }, [fabricBaseSellingPrice, activeTax]);

  const finalSellingPriceGross = useMemo(() => fabricBaseSellingPrice + taxVal, [fabricBaseSellingPrice, taxVal]);

  const activeCosting = useMemo(() => {
    return costings.find(c => c.id === selectedCostingId);
  }, [costings, selectedCostingId]);

  // Handle addition of a custom row item to the costing grid
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<any>('WEAVING');
  const [newItemQty, setNewItemQty] = useState<number>(1);
  const [newItemUnit, setNewItemUnit] = useState('KG');
  const [newItemRate, setNewItemRate] = useState<number>(20);
  const [newItemWastage, setNewItemWastage] = useState<number>(5);

  const handleAddRowItem = () => {
    if (!newItemName) return;

    // wastage percentage calculation: gross = qty * rate * (1 + wastage/100)
    const baseVal = newItemQty * newItemRate;
    const resolvedAmt = baseVal + (baseVal * (newItemWastage / 100));

    const item: FabricCostingItem = {
      id: `ITEM-${Date.now()}`,
      name: newItemName,
      category: newItemCategory,
      qty: newItemQty,
      unit: newItemUnit,
      ratePerUnit: newItemRate,
      wastagePercent: newItemWastage,
      amount: Number(resolvedAmt.toFixed(2))
    };

    setActiveItems([...activeItems, item]);
    setNewItemName('');
  };

  const handleRemoveRowItem = (itemId: string) => {
    setActiveItems(activeItems.filter(item => item.id !== itemId));
  };

  const handleCreateCostingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCostingName) return;

    const matchingDesign = designs.find(d => d.id === newDesignId);

    const key = `FC-${Date.now()}`;
    const preparedCosting: FabricCosting = {
      id: key,
      name: newCostingName,
      designId: newDesignId || undefined,
      designName: matchingDesign ? matchingDesign.name : undefined,
      fabricType: newFabricType,
      width: Number(newWidth),
      gsm: Number(newGsm),
      construction: newConstruction,
      items: activeItems,
      overheadPercent: activeOverhead,
      profitPercent: activeProfit,
      taxPercent: activeTax,
      rawMaterialCost,
      processingCost,
      totalCost: rawMaterialCost + processingCost,
      sellingPrice: fabricBaseSellingPrice,
      marginPercent: activeProfit,
      status: 'APPROVED',
      updatedAt: new Date().toISOString()
    };

    onAddCosting(preparedCosting);
    setSelectedCostingId(key);
    setIsCreatingCosting(false);
    setNewCostingName('');
    setBannerMsg(`Garment Cost Card "${preparedCosting.name}" approved and stored in database index successfully!`);
    setTimeout(() => setBannerMsg(null), 5000);
  };

  const handleExportSpecificationSheet = () => {
    if (!activeCosting) {
        setBannerMsg('Please select a saved costing template to export.');
        setTimeout(() => setBannerMsg(null), 3000);
        return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    if (companyInfo) {
       let startY = 15;
       if (companyInfo.logoUrl) {
          try {
             const format = companyInfo.logoUrl.substring("data:image/".length, companyInfo.logoUrl.indexOf(";base64")).toUpperCase() || 'PNG';
             doc.addImage(companyInfo.logoUrl, format, 15, 10, 20, 20);
             startY = 35;
          } catch(e) {
             console.error("Could not add image to PDF", e);
             startY = 15;
          }
       }
       doc.setFontSize(16);
       doc.setFont("helvetica", "bold");
       doc.text(companyInfo.name?.toUpperCase() || 'GARMENT MANUFACTURING', 15, startY + 5);
       doc.setFontSize(9);
       doc.setFont("helvetica", "normal");
       doc.text(companyInfo.address || '', 15, startY + 10);
       if (companyInfo.gstin) {
           doc.text(`GSTIN: ${companyInfo.gstin}`, 15, startY + 15);
       }
    }

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("GARMENT COSTING SHEET", pageWidth / 2, 60, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Costing Name: ${activeCosting.name}`, 15, 75);
    doc.setFont("helvetica", "normal");
    doc.text(`Design Name: ${activeCosting.designName || 'N/A'}`, 15, 80);
    doc.text(`Fabric Type: ${activeCosting.fabricType || 'N/A'}`, 15, 85);
    doc.text(`Width: ${activeCosting.width || 'N/A'} | GSM: ${activeCosting.gsm || 'N/A'}`, 15, 90);
    doc.text(`Construction: ${activeCosting.construction || 'N/A'}`, 15, 95);

    doc.setFont("helvetica", "bold");
    doc.text("COSTING DETAILS", 15, 105);

    autoTable(doc, {
        startY: 110,
        head: [['Category', 'Item/Process', 'Qty', 'Unit', 'Rate', 'Wastage%', 'Amount']],
        body: activeItems.map((item) => [
            item.category,
            item.name,
            item.qty,
            item.unit,
            `${currency}${item.ratePerUnit}`,
            `${item.wastagePercent}%`,
            `${currency}${item.amount.toFixed(2)}`
        ]),
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("COST SUMMARY", 15, finalY);

    const summaryData = [
        ['Raw Material Cost:', `${currency}${rawMaterialCost.toFixed(2)}`],
        ['Processing Cost:', `${currency}${processingCost.toFixed(2)}`],
        ['Prime Cost:', `${currency}${primeCost.toFixed(2)}`],
        [`Overhead (${activeOverhead}%):`, `${currency}${overheadVal.toFixed(2)}`],
        [`Margin/Profit (${activeProfit}%):`, `${currency}${profitVal.toFixed(2)}`],
        ['Selling Price (Excl. Tax):', `${currency}${fabricBaseSellingPrice.toFixed(2)}`],
        [`Tax (${activeTax}%):`, `${currency}${taxVal.toFixed(2)}`],
        ['Gross Final Price:', `${currency}${finalSellingPriceGross.toFixed(2)}`]
    ];

    autoTable(doc, {
        startY: finalY + 5,
        body: summaryData,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 80 },
            1: { halign: 'right', cellWidth: 40 }
        },
        margin: { left: 15 }
    });

    doc.save(`Costing_${activeCosting.name.replace(/\s+/g, '_')}.pdf`);
    setBannerMsg('Garment BOM costing specification card compiled & exported to PDF successfully.');
    setTimeout(() => setBannerMsg(null), 5000);
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden text-left">
      
      {/* HEADER ACTION BAR */}
      <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Garment Costing Worksheet</span>
              <span className="text-xs text-[#059669] bg-[#ecfdf5] px-2.5 py-0.5 rounded-full font-bold border border-[#a7f3d0]">ERP Cost Engineering</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">Track fabric consumption rates, stitching labor, custom neck embroidery, packing accents, and profit margins.</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsCreatingCosting(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Build Cost Card Formula
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto space-y-6">

        {bannerMsg && (
          <div className="bg-emerald-50 border border-emerald-250 text-emerald-900 rounded-lg p-3 text-xs flex items-center gap-2 font-bold animate-pulse">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{bannerMsg}</span>
          </div>
        )}

        {/* SELECT PREVIOUS COST CARDS OR ACTIVE BUILDER */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Main cost sheet calculation grid */}
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white border border-[#d1d8dd] rounded-xl p-5 space-y-5">
              
              <div className="flex justify-between items-center border-b pb-2 flex-wrap gap-2 text-xs">
                <div>
                  <h4 className="font-bold text-sm text-[#1c2126]">Calculative Costing Structure Matrix</h4>
                  <p className="text-slate-500 mt-0.5">Line breakdown of spinning, warping, dyeing, finishing and pack out margins</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-bold">Select Template:</span>
                  <select 
                    value={selectedCostingId}
                    onChange={e => {
                      setSelectedCostingId(e.target.value);
                      const cost = costings.find(c => c.id === e.target.value);
                      if (cost) {
                        setActiveItems(cost.items || []);
                        setActiveOverhead(cost.overheadPercent || 10);
                        setActiveProfit(cost.profitPercent || 20);
                        setActiveTax(cost.taxPercent || 5);
                      }
                    }}
                    className="p-1 px-3 border rounded-md focus:outline-none bg-white font-bold text-xs"
                  >
                    <option value="">Interactive Custom Board...</option>
                    {costings.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Cost Rows Table */}
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left divide-y divide-slate-250">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Item / Process Name</th>
                      <th className="px-4 py-3 text-right">Required Qty</th>
                      <th className="px-4 py-3">Unit</th>
                      <th className="px-4 py-3 text-right">Price/Unit</th>
                      <th className="px-4 py-3 text-right">Wastage%</th>
                      <th className="px-4 py-3 text-right">Amount Raw</th>
                      <th className="px-4 py-3 text-center">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {activeItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/65">
                        <td className="px-4 py-3">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black ${
                            item.category === 'YARN' ? 'bg-indigo-100 text-indigo-800' :
                            item.category === 'WEAVING' ? 'bg-sky-100 text-sky-800' :
                            item.category === 'DYEING' ? 'bg-pink-100 text-pink-800' :
                            item.category === 'FINISHING' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {item.category === 'YARN' ? 'FABRIC' :
                             item.category === 'WEAVING' ? 'TAILORING' :
                             item.category === 'DYEING' ? 'EMBELLISH' :
                             item.category === 'FINISHING' ? 'WASH/FINISH' :
                             item.category === 'PACKING' ? 'PACKING' : item.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">{item.name}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.qty}</td>
                        <td className="px-4 py-3 uppercase text-slate-500 font-semibold">{item.unit}</td>
                        <td className="px-4 py-3 text-right text-slate-700 font-bold">{currency}{item.ratePerUnit}</td>
                        <td className="px-4 py-3 text-right font-bold text-rose-600">{item.wastagePercent}%</td>
                        <td className="px-4 py-3 text-right font-black text-[#1c2126]">{currency}{item.amount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          <button 
                            onClick={() => handleRemoveRowItem(item.id)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-all rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* Interactive add row tools */}
                    <tr className="bg-slate-50/30 font-semibold">
                      <td className="px-4 py-3">
                        <select 
                          value={newItemCategory}
                          onChange={e => {
                            setNewItemCategory(e.target.value as any);
                            if (e.target.value === 'YARN') {
                              setNewItemUnit('KG');
                              setNewItemWastage(5);
                            } else {
                              setNewItemUnit('METER');
                              setNewItemWastage(0);
                            }
                          }}
                          className="p-1 bg-white border border-[#d1d8dd] rounded font-bold uppercase w-full"
                        >
                          <option value="YARN">FABRIC BASE</option>
                          <option value="WEAVING">TAILORING / LABOUR</option>
                          <option value="DYEING">EMBELLISH / EMBROIDERY</option>
                          <option value="FINISHING">WASHING / PROCESSING</option>
                          <option value="PACKING">PACKING & HANGER</option>
                          <option value="OTHER">ACCESSORY / TRIM</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {newItemCategory === 'YARN' ? (
                          <div className="flex flex-col gap-1 w-full min-w-[200px]">
                            <select
                              value={selectedLotId}
                              onChange={(e) => {
                                const lotId = e.target.value;
                                setSelectedLotId(lotId);
                                const lot = yarnLots.find(l => l.id === lotId);
                                if (lot) {
                                  setNewItemName(`${lot.lotNumber} (${lot.count} ${lot.shade || 'Grey'})`);
                                  setNewItemRate(lot.pricePerKg);
                                  setNewItemUnit('KG');
                                } else {
                                  setNewItemName('');
                                  setNewItemRate(20);
                                  setNewItemUnit('KG');
                                }
                              }}
                              className="p-1 text-[11px] bg-white border border-[#d1d8dd] rounded font-bold w-full truncate text-slate-800"
                            >
                              <option value="">-- Choose Live Fabric Roll --</option>
                              {yarnLots.filter(l => l.status === 'AVAILABLE').map(lot => (
                                <option key={lot.id} value={lot.id}>
                                  {lot.lotNumber} ({lot.count} {lot.shade || 'Piece Dyed'}) — {currency}{lot.pricePerKg}/Mtr ({lot.currentQty} Mtr)
                                </option>
                              ))}
                              <option value="manual">Custom Entry...</option>
                            </select>
                            {(!selectedLotId || selectedLotId === 'manual') && (
                              <input 
                                type="text"
                                value={newItemName}
                                onChange={e => setNewItemName(e.target.value)}
                                placeholder="Enter custom fabric/trim name..."
                                className="p-1 px-2 w-full bg-white border border-[#d1d8dd] rounded text-slate-800 text-xs"
                              />
                            )}
                          </div>
                        ) : (
                          <input 
                            type="text"
                            value={newItemName}
                            onChange={e => setNewItemName(e.target.value)}
                            placeholder="Enter item name..."
                            className="p-1 px-2 w-full bg-white border border-[#d1d8dd] rounded text-slate-800"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[80px]">
                        <input 
                          type="number"
                          value={newItemQty}
                          onChange={e => setNewItemQty(Number(e.target.value))}
                          className="p-1 px-2 w-full bg-white border border-[#d1d8dd] rounded text-right font-mono"
                        />
                      </td>
                      <td className="px-4 py-3 max-w-[60px]">
                        <input 
                          type="text"
                          value={newItemUnit}
                          onChange={e => setNewItemUnit(e.target.value)}
                          className="p-1 px-2 w-full bg-white border border-[#d1d8dd] rounded text-center uppercase"
                        />
                      </td>
                      <td className="px-4 py-3 max-w-[90px]">
                        <input 
                          type="number"
                          value={newItemRate}
                          onChange={e => setNewItemRate(Number(e.target.value))}
                          className="p-1 px-2 w-full bg-white border border-[#d1d8dd] rounded text-right font-mono"
                        />
                      </td>
                      <td className="px-4 py-3 max-w-[70px]">
                        <input 
                          type="number"
                          value={newItemWastage}
                          onChange={e => setNewItemWastage(Number(e.target.value))}
                          className="p-1 px-2 w-full bg-white border border-[#d1d8dd] rounded text-right font-mono"
                        />
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400 italic">Auto-calc</td>
                      <td className="px-4 py-3 text-center">
                        <button 
                          onClick={handleAddRowItem}
                          disabled={!newItemName}
                          className="p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded transition-all shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* OVERHEADS MARKUP AND SLIDERS */}
              <div className="border-t pt-4 space-y-4 text-xs font-semibold">
                <h5 className="font-extrabold text-slate-700 tracking-wide uppercase text-[10px]">Overheads & Profit Markups Config</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  
                  <div className="space-y-1.5 flex flex-col bg-[#fbfbfb] p-3 rounded-lg border border-[#eef1f4]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Workshop Overheads</span>
                      <span className="text-indigo-600 font-bold">{activeOverhead}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="30" step="1"
                      value={activeOverhead}
                      onChange={e => setActiveOverhead(Number(e.target.value))}
                      className="w-full accent-indigo-600 h-1 bg-slate-200 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5 flex flex-col bg-[#fbfbfb] p-3 rounded-lg border border-[#eef1f4]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Margin / Net Profit</span>
                      <span className="text-emerald-600 font-bold">{activeProfit}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="50" step="1"
                      value={activeProfit}
                      onChange={e => setActiveProfit(Number(e.target.value))}
                      className="w-full accent-emerald-600 h-1 bg-slate-200 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5 flex flex-col bg-[#fbfbfb] p-3 rounded-lg border border-[#eef1f4]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">GST Sales Tax</span>
                      <span className="text-rose-600 font-bold">{activeTax}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="18" step="1"
                      value={activeTax}
                      onChange={e => setActiveTax(Number(e.target.value))}
                      className="w-full accent-rose-600 h-1 bg-slate-200 rounded-lg cursor-pointer"
                    />
                  </div>

                </div>
              </div>

            </div>
          </div>

          {/* Right ledger pricing card sheet */}
          <div className="space-y-6 text-xs">
            <div className="bg-white border border-[#d1d8dd] rounded-xl p-5 space-y-4 text-xs shadow-macos-sm">
              <h5 className="font-extrabold pb-2 border-b uppercase tracking-widest text-[#1c2126] text-[11px] flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-indigo-600" />
                Garment Cost Card Analysis
              </h5>

              <div className="space-y-3 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Fabric Shell Cost & Accs:</span>
                  <span className="font-bold text-slate-800">{currency}{rawMaterialCost.toFixed(2)} / Piece</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Tailoring, Embroidery & Finish Work:</span>
                  <span className="font-bold text-slate-800">{currency}{processingCost.toFixed(2)} / Piece</span>
                </div>

                <div className="flex justify-between border-t pt-2 border-dashed font-bold">
                  <span className="text-slate-700">Garment Prime Cost:</span>
                  <span className="text-indigo-600">{currency}{primeCost.toFixed(2)} / Piece</span>
                </div>

                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Workshop Indirect Overheads ({activeOverhead}%):</span>
                  <span className="font-medium text-slate-700">{currency}{overheadVal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-[11px] border-b pb-2">
                  <span className="text-[#059669]">Projected Net Margin ({activeProfit}%):</span>
                  <span className="font-bold text-[#059669]">{currency}{profitVal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center bg-indigo-50 px-3.5 py-2.5 rounded-lg border border-indigo-100 font-bold text-indigo-900 mt-2">
                  <span>Selling Price (Excl. Tax):</span>
                  <span className="text-[15px] font-black">{currency}{fabricBaseSellingPrice.toFixed(2)} / Piece</span>
                </div>

                <div className="flex justify-between text-[11px] pt-1">
                  <span className="text-slate-500">GST Sales Levy ({activeTax}%):</span>
                  <span className="font-semibold text-rose-600">+{currency}{taxVal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center bg-emerald-50 px-3.5 py-2.5 rounded-lg border border-emerald-100 font-bold text-emerald-900 mt-1 uppercase">
                  <span>Gross Invoice Cost:</span>
                  <span className="text-[17px] font-black">{currency}{finalSellingPriceGross.toFixed(2)} / Piece</span>
                </div>
              </div>

              {/* Vertical stacked visual distribution bar */}
              <div className="space-y-1.5 pt-4">
                <span className="font-black text-[10px] uppercase tracking-wider text-slate-400">Value Stream Allocation Percent</span>
                <div className="h-5 w-full bg-slate-100 rounded overflow-hidden flex select-none text-[9px] font-black tracking-tight text-white font-mono">
                  <div className="h-full bg-slate-800 flex items-center justify-center truncate" style={{ width: `${Math.round((rawMaterialCost / finalSellingPriceGross) * 100) || 30}%` }} title="Raw material">
                    RAW ({(Math.round((rawMaterialCost / finalSellingPriceGross) * 100)) || 30}%)
                  </div>
                  <div className="h-full bg-indigo-600 flex items-center justify-center truncate" style={{ width: `${Math.round((processingCost / finalSellingPriceGross) * 100) || 20}%` }} title="Wet & Dry treatment">
                    PROC ({(Math.round((processingCost / finalSellingPriceGross) * 100)) || 20}%)
                  </div>
                  <div className="h-full bg-emerald-600 flex items-center justify-center truncate" style={{ width: `${Math.round((profitVal / finalSellingPriceGross) * 100) || 20}%` }} title="Net profit Margin">
                    PROFIT ({(Math.round((profitVal / finalSellingPriceGross) * 100)) || 20}%)
                  </div>
                  <div className="h-full bg-rose-500 flex items-center justify-center truncate" style={{ width: `${Math.round((taxVal / finalSellingPriceGross) * 100) || 5}%` }} title="Levies and taxes">
                    TAX
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={handleExportSpecificationSheet}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <Download className="w-4 h-4" />
                  Export Specification PDF
                </button>
              </div>
            </div>

            <div className="bg-[#eff6ff] border border-blue-200 rounded-xl p-4 text-xs space-y-2">
              <h5 className="font-bold text-blue-900 flex items-center gap-1">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                Dobby Loom Yield
              </h5>
              <p className="text-blue-800 leading-relaxed text-[11px]">
                Warp costs must incorporate weft shrinkage and yarn waste during rewinding. Sourcing rates are mapped to active master listings inside the stock godown ledger to ensure live costing accuracy.
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* CREATE FORM CARD MODAL */}
      {isCreatingCosting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 text-xs font-sans">
          <div className="bg-white rounded-xl border border-[#d1d8dd] max-w-lg w-full overflow-hidden shadow-macos-lg text-left">
            <div className="p-4 border-b border-[#eef1f4] flex justify-between items-center bg-[#fafbfc]">
              <span className="font-bold text-[14px]">Create Fabric Cost Formula card</span>
              <button onClick={() => setIsCreatingCosting(false)} className="text-slate-400 hover:text-slate-600">
                <Trash2 className="w-4 h-4 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleCreateCostingSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 flex flex-col col-span-2">
                  <label className="font-bold text-slate-700">Cost Sheet Identifier Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text"
                    value={newCostingName}
                    onChange={e => setNewCostingName(e.target.value)}
                    placeholder="e.g. Kurti Cambric Sizing card - 2026"
                    required
                    className="p-2 border border-[#d1d8dd] rounded-lg focus:outline-none"
                  />
                </div>

                <div className="space-y-1 flex flex-col col-span-2">
                  <label className="font-bold text-slate-700">Optionally Map to Product Design Style</label>
                  <select 
                    value={newDesignId}
                    onChange={e => setNewDesignId(e.target.value)}
                    className="p-2 border border-[#d1d8dd] bg-white rounded-lg focus:outline-none"
                  >
                    <option value="">Select master design...</option>
                    {designs.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.category})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-slate-700">Fabric Composition Base</label>
                  <input 
                    type="text"
                    value={newFabricType}
                    onChange={e => setNewFabricType(e.target.value)}
                    className="p-2 border border-[#d1d8dd] rounded-lg focus:outline-none"
                  />
                </div>

                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-slate-700">Construction Grid</label>
                  <input 
                    type="text"
                    value={newConstruction}
                    onChange={e => setNewConstruction(e.target.value)}
                    className="p-2 border border-[#d1d8dd] rounded-lg focus:outline-none"
                  />
                </div>

                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-slate-700">Finished Width (Cm)</label>
                  <input 
                    type="number"
                    value={newWidth}
                    onChange={e => setNewWidth(Number(e.target.value))}
                    className="p-2 border border-[#d1d8dd] rounded-lg"
                  />
                </div>

                <div className="space-y-1 flex flex-col">
                  <label className="font-bold text-slate-700">Target GSM (g/sqm)</label>
                  <input 
                    type="number"
                    value={newGsm}
                    onChange={e => setNewGsm(Number(e.target.value))}
                    className="p-2 border border-[#d1d8dd] rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-[#eef1f4]">
                <button 
                  type="button" 
                  onClick={() => setIsCreatingCosting(false)}
                  className="px-4 py-2 border rounded-lg text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Post & Compile Cost Sheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
