
import React, { useState } from 'react';
import { GalleryItem } from '../types';
// Added ShieldCheck to lucide-react imports
import { Search, Plus, Trash2, Filter, X, Upload, Image as ImageIcon, Sparkles, Palette, Zap, Maximize2, Share2, Download, Tag, Lock, ShieldCheck } from 'lucide-react';
import BaseModal from './BaseModal';
import { compressImage } from '../utils/imageUtils';

const isElectron = typeof window !== 'undefined' && (window as any).process && (window as any).process.type === 'renderer';
const ipc = isElectron ? (window as any).require('electron').ipcRenderer : null;

interface GalleryProps {
  items: GalleryItem[];
  onAdd: (item: GalleryItem) => void;
  onDelete: (id: string) => void;
}

const Gallery: React.FC<GalleryProps> = ({ items, onAdd, onDelete }) => {
  const [filter, setFilter] = useState('');
  const [category, setCategory] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);
  
  const [formData, setFormData] = useState<Partial<GalleryItem>>({
    category: 'DESIGN',
    date: new Date().toISOString().split('T')[0]
  });
  const [uploading, setUploading] = useState(false);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(filter.toLowerCase()) || 
                          item.description?.toLowerCase().includes(filter.toLowerCase());
    const matchesCategory = category === 'ALL' || item.category === category;
    return matchesSearch && matchesCategory;
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isElectron && ipc) {
      try {
        setUploading(true);
        // Using high quality for immutable vault
        const compressedBase64 = await compressImage(file, 1600, 0.9);
        
        // Save file physically using content hash
        const result = await ipc.invoke('file:save', { base64Data: compressedBase64 });
        
        if (result?.success) {
            setFormData({ ...formData, url: result.url });
        }
      } catch (err) {
        alert("Physical Write Error: Content Vault protection fault.");
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDeleteReference = (id: string) => {
    if(confirm("Unlink this asset from the current view? The physical file will remain in the Immutable Vault for historical database integrity.")) {
        onDelete(id);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 max-w-[1800px] mx-auto">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white dark:bg-slate-950 p-4 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center gap-4 px-4">
           <div className="p-4 bg-slate-900 rounded-3xl text-indigo-400 shadow-xl border border-indigo-500/20">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">Immutable Vault</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2 flex items-center gap-2">Content-Addressable Asset Matrix</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full xl:w-auto px-4 items-center">
           <div className="relative flex-1 sm:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold outline-none shadow-inner"
                placeholder="Search artifact registry..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
           </div>
           <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-2xl active:scale-95 flex items-center gap-2">
             <Upload className="w-4 h-4" /> Commit to Vault
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
         <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-6 space-y-6">
            {filteredItems.map(item => (
               <div key={item.id} className="relative group break-inside-avoid animate-scale-in">
                  <div 
                    className="relative rounded-[2rem] overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 cursor-pointer"
                    onClick={() => setSelectedImage(item)}
                  >
                     <img src={item.url} alt={item.title} className="w-full h-auto object-cover transition-all duration-700 group-hover:scale-105" loading="lazy" />
                     <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                        <h4 className="text-white font-black text-sm uppercase">{item.title}</h4>
                        <span className="text-indigo-400 text-[9px] font-black uppercase tracking-widest">{item.category}</span>
                     </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteReference(item.id)}
                    className="absolute top-4 right-4 p-2 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                     <Trash2 className="w-4 h-4"/>
                  </button>
               </div>
            ))}
         </div>
      </div>

      <BaseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Commit Permanent Asset" size="sm">
         <form onSubmit={(e) => { e.preventDefault(); if(formData.title && formData.url) { onAdd({ id: `IMG-${Date.now()}`, title: formData.title, url: formData.url, category: formData.category || 'OTHER', date: formData.date || new Date().toISOString().split('T')[0], description: formData.description }); setIsModalOpen(false); setFormData({ category: 'DESIGN', date: new Date().toISOString().split('T')[0] }); } }} className="space-y-6">
            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 px-1">Artifact Identity</label><input required className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-sm font-bold shadow-inner dark:text-white" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Silk Texture 2024" /></div>
            <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 text-center hover:bg-indigo-50/20 transition-all group relative min-h-[160px] flex flex-col items-center justify-center cursor-pointer">
               {formData.url ? (
                  <div className="absolute inset-0 p-2"><img src={formData.url} className="w-full h-full object-contain rounded-2xl" /><button type="button" onClick={() => setFormData({...formData, url: ''})} className="absolute top-4 right-4 bg-red-600 text-white p-2 rounded-xl"><X className="w-4 h-4"/></button></div>
               ) : (
                  <>
                     <Upload className="w-10 h-10 text-slate-300 mb-3 group-hover:scale-110 transition-transform" />
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select physical file...</p>
                     <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleFileUpload} />
                  </>
               )}
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800 flex gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0"/>
                <p className="text-[9px] font-bold text-indigo-800 dark:text-indigo-300 uppercase leading-relaxed">Assets committed to the Immutable Vault are fingerprint-linked. They will remain available even if you roll back the database to a previous version.</p>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-3xl font-black uppercase text-[10px] shadow-2xl active:scale-95 transition-all disabled:grayscale" disabled={!formData.url || uploading}>{uploading ? 'Calculating Hash...' : 'Commit to Vault'}</button>
         </form>
      </BaseModal>
    </div>
  );
};

export default Gallery;
