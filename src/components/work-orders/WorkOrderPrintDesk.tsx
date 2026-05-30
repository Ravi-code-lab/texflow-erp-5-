import React, { useState } from 'react';
import { Printer, Sliders, CheckCircle, RefreshCw, Layers } from 'lucide-react';

interface WorkOrderPrintDeskProps {
  formData: any;
  qty: number;
}

export const WorkOrderPrintDesk: React.FC<WorkOrderPrintDeskProps> = ({
  formData,
  qty
}) => {
  const [printSettings, setPrintSettings] = useState({
    labelSize: '4x3',
    barcodeType: 'CODE128',
    columns: 3,
    includeDate: true,
    showLogo: true,
    quality: 'HIGH_RES'
  });
  const [printerStatus, setPrinterStatus] = useState<'IDLE' | 'PRINTING' | 'SUCCESS'>('IDLE');

  const startPrintSimulation = () => {
    setPrinterStatus('PRINTING');
    setTimeout(() => {
      setPrinterStatus('SUCCESS');
      setTimeout(() => setPrinterStatus('IDLE'), 3500);
    }, 1800);
  };

  const labelSizesArr = [
    { code: '3x2', label: '3" x 2" (Standard Roll)' },
    { code: '4x3', label: '4" x 3" (Large Pallet)' },
    { code: '2x1', label: '2" x 1" (Sleeve Trim)' }
  ];

  return (
    <div className="space-y-4 font-sans text-xs">
      <div className="bg-white border border-slate-200 rounded p-6 shadow-xs grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column - Print Configuration controls */}
        <div className="lg:col-span-1 space-y-4 pr-0 lg:pr-4 lg:border-r border-slate-100">
          <h4 className="font-extrabold text-slate-850 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            Ticket Printer Settings
          </h4>

          <div className="space-y-3 font-semibold text-slate-600">
            <div className="space-y-1 flex flex-col">
              <label className="text-[10px] uppercase text-slate-500 font-bold">Label Sizing Dimensions</label>
              <select
                value={printSettings.labelSize}
                onChange={e => setPrintSettings({ ...printSettings, labelSize: e.target.value })}
                className="px-2.5 py-1.5 border border-slate-300 rounded text-xs text-slate-700 bg-white"
              >
                {labelSizesArr.map(x => <option key={x.code} value={x.code}>{x.label}</option>)}
              </select>
            </div>

            <div className="space-y-1 flex flex-col">
              <label className="text-[10px] uppercase text-slate-500 font-bold font-sans">Barcode Symbology Standard</label>
              <select
                value={printSettings.barcodeType}
                onChange={e => setPrintSettings({ ...printSettings, barcodeType: e.target.value })}
                className="px-2.5 py-1.5 border border-slate-300 rounded text-xs text-slate-700 bg-white"
              >
                <option value="CODE128">GS1 Code 128 (Interleaved)</option>
                <option value="QR">Custom scannable QR Matrices</option>
                <option value="EAN13">EAN-13 Product Barcode</option>
              </select>
            </div>

            <div className="space-y-1 flex flex-col">
              <label className="text-[10px] uppercase text-slate-500 font-bold">Bundle grid Layout (Columns)</label>
              <input 
                type="number"
                min={1}
                max={4}
                value={printSettings.columns}
                onChange={e => setPrintSettings({ ...printSettings, columns: parseInt(e.target.value) || 3 })}
                className="px-2.5 py-1.5 border border-slate-300 rounded text-xs font-bold font-mono"
              />
            </div>

            <div className="space-y-2 pt-1 font-semibold">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={printSettings.includeDate}
                  onChange={e => setPrintSettings({ ...printSettings, includeDate: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Include Posting Date & Author Code</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={printSettings.showLogo}
                  onChange={e => setPrintSettings({ ...printSettings, showLogo: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Embed Texflow ERP watermark logo</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            {printerStatus === 'IDLE' && (
              <button
                type="button"
                onClick={startPrintSimulation}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded flex items-center justify-center gap-1.5 transition-all text-xs uppercase"
              >
                <Printer className="w-4 h-4" />
                Initialize Print Spooler
              </button>
            )}
            {printerStatus === 'PRINTING' && (
              <div className="w-full py-2 bg-amber-500 text-white font-bold rounded flex items-center justify-center gap-1.5 text-xs uppercase cursor-wait animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Spooling Label stream...
              </div>
            )}
            {printerStatus === 'SUCCESS' && (
              <div className="w-full py-2 bg-emerald-600 text-white font-bold rounded flex items-center justify-center gap-1.5 text-xs uppercase">
                <CheckCircle className="w-4 h-4" />
                Labels printed successfully!
              </div>
            )}
          </div>
        </div>

        {/* Right columns - Sticker grid rendering */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h5 className="font-extrabold text-slate-500 uppercase text-[10px] tracking-widest flex items-center gap-1">
              <Layers className="w-4 h-4 text-slate-400" />
              Thermal Sticker Output Preview (Bundle Tickets)
            </h5>
            <span className="text-[10.5px] text-indigo-600 font-bold">Size preset: {printSettings.labelSize} inch</span>
          </div>

          {/* Sticker grid rendering */}
          <div className={`grid gap-4 ${
            printSettings.columns === 1 ? 'grid-cols-1' : printSettings.columns === 2 ? 'grid-cols-2' : 'grid-cols-3'
          }`}>
            {['S-01', 'M-02', 'L-03', 'XL-04', 'XXL-05', 'N-06'].slice(0, 6).map((sz, idx) => {
              const bundlePcs = idx === 0 ? 30 : idx === 1 ? 50 : 40;
              return (
                <div 
                  key={sz} 
                  className="bg-slate-50 border-2 border-[#1c2126]/85 border-dashed rounded p-3 h-[140px] flex flex-col justify-between font-mono relative text-[#1c2126]"
                >
                  <div className="space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="text-[8px] border border-[#1c2126] font-extrabold px-1 rounded uppercase bg-white">
                        Bundle Lot
                      </span>
                      <span className="text-[10px] font-black">Size: {sz.split('-')[0]}</span>
                    </div>
                    {printSettings.showLogo && (
                      <p className="text-[8px] font-bold text-[#1c2126]/50 tracking-wider">TEXFLOW MANUFACTURING</p>
                    )}
                    <p className="font-black text-[11px] truncate leading-tight uppercase mt-1">
                      {formData.productName || 'PRODUCT BLUEPRINT'}
                    </p>
                    <p className="text-[9px] font-bold text-slate-500 mt-0.5">
                      Order Lot: {formData.id || 'JOB-001'}
                    </p>
                  </div>

                  <div className="border-t border-[#1c2126]/20 pt-1.5 flex items-center justify-between">
                    <div>
                      <p className="text-[7.5px] uppercase font-bold text-slate-400">Bundle Qty</p>
                      <p className="text-[11px] font-black">{bundlePcs} PCS</p>
                    </div>

                    {printSettings.barcodeType === 'QR' ? (
                      <div className="w-8 h-8 bg-white border border-[#1c2126] p-0.5 flex flex-wrap justify-between gap-[1px]">
                        {Array.from({ length: 16 }).map((_, i) => (
                          <div key={i} className={`w-[6px] h-[6px] ${i % 3 === 0 ? 'bg-black' : 'bg-transparent'}`}></div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-[1px]">
                        <div className="flex gap-[1px]">
                          {[4, 2, 3, 1, 5, 2, 4, 1, 3, 2, 6].map((w, idx_w) => (
                            <div key={idx_w} className="bg-[#1c2126] h-5" style={{ width: `${w}px` }}></div>
                          ))}
                        </div>
                        <span className="text-[7.5px] text-slate-500 font-bold uppercase leading-none mt-0.5">
                          *{formData.id || 'JOB'}-{sz}*
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
