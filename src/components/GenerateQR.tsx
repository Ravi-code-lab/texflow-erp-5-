
import React, { useState } from 'react';
import { QrCode, Printer, Search, Hash, Scan } from 'lucide-react';

const GenerateQR: React.FC = () => {
  return (
    <div className="flex flex-col h-full -mx-4 -my-5 lg:-m-6">
      <div className="bg-white dark:bg-slate-900 border-b p-6 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-900 rounded-2xl text-white shadow-lg"><QrCode className="w-6 h-6"/></div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight dark:text-white">Smart QR Generator</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identity Mapping Utility</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8 flex flex-col items-center justify-center">
         <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[3rem] border p-12 shadow-2xl flex flex-col items-center gap-10">
            <div className="w-64 h-64 bg-slate-50 dark:bg-slate-950 border-2 border-dashed rounded-[2rem] flex items-center justify-center group cursor-pointer hover:border-indigo-500 transition-all">
               <Scan className="w-16 h-16 text-slate-200 group-hover:text-indigo-400 transition-colors"/>
            </div>
            <div className="w-full space-y-4">
               <input className="w-full border-2 dark:border-slate-700 rounded-2xl p-4 text-center text-sm font-bold bg-slate-50 dark:bg-slate-950 dark:text-white uppercase outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder="Enter Batch / Roll ID..." />
               <button className="w-full bg-slate-900 text-white py-4 rounded-3xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"><Printer className="w-5 h-5"/> Print Thermal Label</button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default GenerateQR;
