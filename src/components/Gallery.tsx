import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GalleryItem } from '../types';
import {
  Search, Plus, Trash2, X, Upload, Image as ImageIcon,
  Grid3X3, List, Eye, Tag, ChevronDown, Filter, Star,
  FolderOpen, CheckSquare, Square, MoreHorizontal,
  Download, Share2, ZoomIn, ArrowLeft, ArrowRight,
  ShieldCheck, Link2, Copy, Globe, Lock, Edit3,
  Heart, Folder, BarChart2, Info, FileText, Layers,
  RotateCcw, Check, AlertCircle, SlidersHorizontal,
  Bookmark, ExternalLink, RefreshCw, Camera
} from 'lucide-react';
import BaseModal from './BaseModal';
import { compressImage } from '../utils/imageUtils';

// ─── Platform ─────────────────────────────────────────────────────────────────
const isElectron = typeof window !== 'undefined' && (window as any).process?.type === 'renderer';
const ipc = isElectron ? (window as any).require('electron').ipcRenderer : null;

// ─── Props ────────────────────────────────────────────────────────────────────
interface GalleryProps {
  items: GalleryItem[];
  onAdd: (item: GalleryItem) => void;
  onDelete: (id: string) => void;
  onUpdate?: (item: GalleryItem) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const CATEGORIES = ['DESIGN', 'FABRIC', 'SAMPLE', 'REFERENCE', 'QUALITY', 'PRODUCT', 'PACKAGING', 'OTHER'];

const CATEGORY_META: Record<string, { color: string; bg: string; dot: string }> = {
  DESIGN:    { color: 'text-blue-700 dark:text-blue-300',   bg: 'bg-blue-50 dark:bg-blue-900/30',   dot: 'bg-blue-500' },
  FABRIC:    { color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-900/30', dot: 'bg-amber-500' },
  SAMPLE:    { color: 'text-green-700 dark:text-green-300', bg: 'bg-green-50 dark:bg-green-900/30', dot: 'bg-green-500' },
  REFERENCE: { color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-900/30', dot: 'bg-purple-500' },
  QUALITY:   { color: 'text-red-700 dark:text-red-300',    bg: 'bg-red-50 dark:bg-red-900/30',    dot: 'bg-red-500' },
  PRODUCT:   { color: 'text-teal-700 dark:text-teal-300',  bg: 'bg-teal-50 dark:bg-teal-900/30',  dot: 'bg-teal-500' },
  PACKAGING: { color: 'text-pink-700 dark:text-pink-300',  bg: 'bg-pink-50 dark:bg-pink-900/30',  dot: 'bg-pink-500' },
  OTHER:     { color: 'text-gray-600 dark:text-gray-400',  bg: 'bg-gray-100 dark:bg-slate-700',   dot: 'bg-gray-400' },
};

const DOCTYPE_LINKS = ['Sales Order', 'Purchase Order', 'Work Order', 'Design', 'Inventory Item', 'Customer', 'Supplier', 'Quality Inspection'];

const FOLDERS = ['Uncategorized', 'Season 2024', 'Season 2025', 'Client Approvals', 'Production', 'Archive'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatBytes = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const genShareToken = () => Math.random().toString(36).substring(2, 12).toUpperCase();

const CategoryBadge: React.FC<{ category: string; size?: 'xs' | 'sm' }> = ({ category, size = 'xs' }) => {
  const meta = CATEGORY_META[category] || CATEGORY_META.OTHER;
  return (
    <span className={`inline-flex items-center gap-1 font-semibold rounded-md px-1.5 py-0.5 ${size === 'xs' ? 'text-[10px]' : 'text-xs'} ${meta.color} ${meta.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {category}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Gallery: React.FC<GalleryProps> = ({ items, onAdd, onDelete, onUpdate }) => {
  // View State
  const [filter, setFilter] = useState('');
  const [category, setCategory] = useState('ALL');
  const [folder, setFolder] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'masonry'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'size' | 'rating'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [filterPublic, setFilterPublic] = useState<'all' | 'public' | 'private'>('all');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<GalleryItem | null>(null);
  const [editItem, setEditItem] = useState<GalleryItem | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [shareItem, setShareItem] = useState<GalleryItem | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Upload form
  const [formData, setFormData] = useState<Partial<GalleryItem>>({
    category: 'DESIGN',
    date: new Date().toISOString().split('T')[0],
    folder: 'Uncategorized',
    isPublic: false,
    tags: [],
    rating: 0,
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // ─── Filtered + Sorted list ────────────────────────────────────────────────
  const activeItems = items.filter(i => !i.deleted);
  const filtered = activeItems
    .filter(item => {
      const q = filter.toLowerCase();
      const matchSearch = !q ||
        item.title.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.tags?.some(t => t.toLowerCase().includes(q)) ||
        item.linkedName?.toLowerCase().includes(q) ||
        item.uploadedBy?.toLowerCase().includes(q);
      const matchCat = category === 'ALL' || item.category === category;
      const matchFolder = folder === 'ALL' || item.folder === folder;
      const matchFav = !filterFavorites || item.isFavorite;
      const matchPublic = filterPublic === 'all' ||
        (filterPublic === 'public' && item.isPublic) ||
        (filterPublic === 'private' && !item.isPublic);
      return matchSearch && matchCat && matchFolder && matchFav && matchPublic;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date') cmp = new Date(b.date).getTime() - new Date(a.date).getTime();
      else if (sortBy === 'title') cmp = a.title.localeCompare(b.title);
      else if (sortBy === 'size') cmp = (b.fileSize || 0) - (a.fileSize || 0);
      else if (sortBy === 'rating') cmp = (b.rating || 0) - (a.rating || 0);
      return sortDir === 'desc' ? cmp : -cmp;
    });

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const totalSize = activeItems.reduce((s, i) => s + (i.fileSize || 0), 0);
  const favCount = activeItems.filter(i => i.isFavorite).length;
  const publicCount = activeItems.filter(i => i.isPublic).length;

  // ─── Upload Handler ────────────────────────────────────────────────────────
  const handleFileSelect = useCallback(async (file: File) => {
    try {
      setUploading(true);
      const compressedBase64 = await compressImage(file, 1600, 0.9);
      let url = compressedBase64;
      if (isElectron && ipc) {
        const result = await ipc.invoke('file:save', { base64Data: compressedBase64 });
        if (result?.success) url = result.url;
      }
      // Get image dimensions
      const img = new Image();
      img.src = compressedBase64;
      await new Promise(r => { img.onload = r; });
      setFormData(prev => ({
        ...prev,
        url,
        mimeType: file.type,
        fileSize: file.size,
        width: img.naturalWidth,
        height: img.naturalHeight,
      }));
    } catch {
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  // Drag & drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) handleFileSelect(file);
  }, [handleFileSelect]);

  // ─── Add Tag ───────────────────────────────────────────────────────────────
  const addTag = (target: 'form' | 'edit') => {
    const val = tagInput.trim().toLowerCase();
    if (!val) return;
    if (target === 'form') {
      const existing = formData.tags || [];
      if (!existing.includes(val)) setFormData(prev => ({ ...prev, tags: [...existing, val] }));
    } else if (editItem) {
      const existing = editItem.tags || [];
      if (!existing.includes(val)) setEditItem({ ...editItem, tags: [...existing, val] });
    }
    setTagInput('');
  };

  // ─── Submit Upload ─────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!formData.title || !formData.url) return;
    onAdd({
      id: `IMG-${Date.now()}`,
      title: formData.title,
      url: formData.url,
      category: formData.category || 'OTHER',
      date: formData.date || new Date().toISOString().split('T')[0],
      description: formData.description,
      tags: formData.tags || [],
      folder: formData.folder || 'Uncategorized',
      isPublic: formData.isPublic || false,
      isFavorite: false,
      fileSize: formData.fileSize,
      mimeType: formData.mimeType,
      width: formData.width,
      height: formData.height,
      linkedDoctype: formData.linkedDoctype,
      linkedId: formData.linkedId,
      linkedName: formData.linkedName,
      notes: formData.notes,
      colorSwatch: formData.colorSwatch,
      rating: formData.rating || 0,
      viewCount: 0,
      uploadedBy: 'Administrator',
    });
    setIsUploadOpen(false);
    setFormData({ category: 'DESIGN', date: new Date().toISOString().split('T')[0], folder: 'Uncategorized', isPublic: false, tags: [], rating: 0 });
  };

  // ─── Edit save ─────────────────────────────────────────────────────────────
  const handleEditSave = () => {
    if (!editItem || !onUpdate) return;
    onUpdate(editItem);
    setEditItem(null);
    if (detailItem?.id === editItem.id) setDetailItem(editItem);
  };

  // ─── Toggle Favorite ───────────────────────────────────────────────────────
  const toggleFavorite = (item: GalleryItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (onUpdate) onUpdate({ ...item, isFavorite: !item.isFavorite });
  };

  // ─── Share ─────────────────────────────────────────────────────────────────
  const getShareLink = (item: GalleryItem) => {
    const token = item.shareToken || genShareToken();
    return `${window.location.origin}/shared/gallery/${token}`;
  };

  const handleShare = (item: GalleryItem) => {
    if (!item.shareToken && onUpdate) {
      const updated = { ...item, shareToken: genShareToken(), isPublic: true };
      onUpdate(updated);
      setShareItem(updated);
    } else {
      setShareItem(item);
    }
  };

  const copyShareLink = () => {
    if (!shareItem) return;
    navigator.clipboard.writeText(getShareLink(shareItem)).then(() => {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    });
  };

  // ─── Delete ────────────────────────────────────────────────────────────────
  const handleDeleteOne = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm('Remove this image from gallery? The file will remain in the vault.')) onDelete(id);
  };

  const handleDeleteSelected = () => {
    if (!selectedIds.size) return;
    if (confirm(`Remove ${selectedIds.size} selected image(s)?`)) {
      selectedIds.forEach(id => onDelete(id));
      setSelectedIds(new Set());
    }
  };

  // ─── Lightbox ──────────────────────────────────────────────────────────────
  const openLightbox = (idx: number) => setLightboxIndex(idx);
  const closeLightbox = () => setLightboxIndex(-1);
  const prevLight = () => setLightboxIndex(i => (i - 1 + filtered.length) % filtered.length);
  const nextLight = () => setLightboxIndex(i => (i + 1) % filtered.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (lightboxIndex < 0) return;
      if (e.key === 'ArrowLeft') prevLight();
      if (e.key === 'ArrowRight') nextLight();
      if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex]);

  // ─── Selection ─────────────────────────────────────────────────────────────
  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ─── Download ──────────────────────────────────────────────────────────────
  const downloadItem = (item: GalleryItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const a = document.createElement('a');
    a.href = item.url;
    a.download = `${item.title.replace(/\s+/g, '_')}.jpg`;
    a.click();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-[#1c1c28] overflow-hidden" style={{ fontFamily: "'Nunito', 'Inter', sans-serif" }}>

      {/* ── Page Header ── */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-6 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>Home</span>
          <span>/</span>
          <span className="text-gray-800 dark:text-white font-semibold">Image Gallery</span>
          <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            {activeItems.length} Files
          </span>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <button onClick={handleDeleteSelected} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md hover:bg-red-100 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete {selectedIds.size}
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                Clear
              </button>
            </>
          )}
          <button onClick={() => setIsUploadOpen(true)} className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm">
            <Plus className="w-3.5 h-3.5" /> New Image
          </button>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-6 py-2 flex items-center gap-6 text-xs text-gray-500 dark:text-gray-400 shrink-0">
        <span className="flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> {activeItems.length} Total</span>
        <span className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-red-400" /> {favCount} Favorites</span>
        <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-green-500" /> {publicCount} Public</span>
        {totalSize > 0 && <span className="flex items-center gap-1.5"><BarChart2 className="w-3.5 h-3.5" /> {formatBytes(totalSize)} Total</span>}
        {filtered.length !== activeItems.length && (
          <span className="text-blue-600 dark:text-blue-400 font-medium">{filtered.length} matching filters</span>
        )}
      </div>

      {/* ── Toolbar ── */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-6 py-2.5 flex flex-wrap items-center gap-3 shrink-0">
        {/* Search */}
        <div className="relative min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-md outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder-gray-400 dark:text-gray-200 transition"
            placeholder="Search by title, tag, linked doc..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          {filter && (
            <button onClick={() => setFilter('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setCategory('ALL')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-all ${category === 'ALL' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-600 hover:border-blue-400 hover:text-blue-600'}`}
          >All</button>
          {CATEGORIES.map(cat => {
            const meta = CATEGORY_META[cat] || CATEGORY_META.OTHER;
            const count = activeItems.filter(i => i.category === cat).length;
            if (!count && category !== cat) return null;
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-all ${category === cat ? 'bg-blue-600 text-white border-blue-600' : `bg-white dark:bg-slate-800 ${meta.color} border-gray-200 dark:border-slate-600 hover:border-blue-400`}`}
              >
                {cat.charAt(0) + cat.slice(1).toLowerCase()} {count > 0 && <span className="opacity-60">({count})</span>}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Filters toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${showFilters ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 border-blue-300' : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-600 hover:border-gray-300'}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
          </button>

          {/* Sort */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
            className="text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-md px-2 py-1.5 text-gray-600 dark:text-gray-300 outline-none">
            <option value="date">Sort: Date</option>
            <option value="title">Sort: Name</option>
            <option value="size">Sort: Size</option>
            <option value="rating">Sort: Rating</option>
          </select>
          <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-slate-600 rounded-md">
            {sortDir === 'desc' ? '↓' : '↑'}
          </button>

          {/* View toggle */}
          <div className="flex items-center border border-gray-200 dark:border-slate-600 rounded-md overflow-hidden">
            {(['grid', 'masonry', 'list'] as const).map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                className={`p-1.5 ${viewMode === v ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
                {v === 'grid' ? <Grid3X3 className="w-3.5 h-3.5" /> : v === 'masonry' ? <Layers className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Advanced Filters row ── */}
      {showFilters && (
        <div className="bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/30 px-6 py-2.5 flex flex-wrap items-center gap-4 shrink-0">
          <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer">
            <input type="checkbox" checked={filterFavorites} onChange={e => setFilterFavorites(e.target.checked)} className="rounded" />
            <Heart className="w-3.5 h-3.5 text-red-400" /> Favorites only
          </label>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 dark:text-gray-400 font-medium">Visibility:</span>
            {(['all', 'public', 'private'] as const).map(v => (
              <button key={v} onClick={() => setFilterPublic(v)}
                className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold transition-colors ${filterPublic === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-600'}`}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 dark:text-gray-400 font-medium">Folder:</span>
            <select value={folder} onChange={e => setFolder(e.target.value)}
              className="text-xs bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-md px-2 py-1 outline-none">
              <option value="ALL">All Folders</option>
              {FOLDERS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <button onClick={() => { setFilter(''); setCategory('ALL'); setFolder('ALL'); setFilterFavorites(false); setFilterPublic('all'); }}
            className="text-xs text-blue-600 hover:underline ml-auto flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-y-auto p-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
              <ImageIcon className="w-7 h-7 text-gray-300 dark:text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No images found</p>
              <p className="text-xs text-gray-400 mt-1">Adjust filters or upload a new image</p>
            </div>
            <button onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100 transition-colors">
              <Upload className="w-3.5 h-3.5" /> Upload Image
            </button>
          </div>
        ) : viewMode === 'list' ? (
          // ── LIST ──────────────────────────────────────────────────────────
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                  <th className="p-3 w-8">
                    <input type="checkbox" className="rounded"
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onChange={e => setSelectedIds(e.target.checked ? new Set(filtered.map(i => i.id)) : new Set())} />
                  </th>
                  <th className="p-3 text-left font-semibold text-gray-500 dark:text-gray-400 w-16">Preview</th>
                  <th className="p-3 text-left font-semibold text-gray-500 dark:text-gray-400">Name</th>
                  <th className="p-3 text-left font-semibold text-gray-500 dark:text-gray-400">Category</th>
                  <th className="p-3 text-left font-semibold text-gray-500 dark:text-gray-400">Tags</th>
                  <th className="p-3 text-left font-semibold text-gray-500 dark:text-gray-400">Linked To</th>
                  <th className="p-3 text-left font-semibold text-gray-500 dark:text-gray-400">Folder</th>
                  <th className="p-3 text-left font-semibold text-gray-500 dark:text-gray-400">Size</th>
                  <th className="p-3 text-left font-semibold text-gray-500 dark:text-gray-400">Date</th>
                  <th className="p-3 text-left font-semibold text-gray-500 dark:text-gray-400 w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <tr key={item.id}
                    className={`border-b border-gray-50 dark:border-slate-700/50 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors ${selectedIds.has(item.id) ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
                    <td className="p-3"><input type="checkbox" className="rounded" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} /></td>
                    <td className="p-3">
                      <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 dark:bg-slate-700 cursor-pointer" onClick={() => openLightbox(idx)}>
                        <img src={item.url} alt={item.title} className="w-full h-full object-cover hover:scale-110 transition-transform" loading="lazy" />
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => toggleFavorite(item)} className={`${item.isFavorite ? 'text-red-400' : 'text-gray-200 hover:text-red-300'} transition-colors`}>
                          <Heart className="w-3.5 h-3.5" fill={item.isFavorite ? 'currentColor' : 'none'} />
                        </button>
                        <span
                          className="font-semibold text-gray-800 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          onClick={() => setDetailItem(item)}>
                          {item.title}
                        </span>
                        {item.isPublic && <Globe className="w-3 h-3 text-green-500" />}
                      </div>
                      {item.description && <p className="text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-[180px]">{item.description}</p>}
                    </td>
                    <td className="p-3"><CategoryBadge category={item.category} /></td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {item.tags?.slice(0, 3).map(t => (
                          <span key={t} className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 rounded text-[10px]">#{t}</span>
                        ))}
                        {(item.tags?.length || 0) > 3 && <span className="text-gray-400 text-[10px]">+{(item.tags?.length || 0) - 3}</span>}
                      </div>
                    </td>
                    <td className="p-3">
                      {item.linkedDoctype && (
                        <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400">
                          <Link2 className="w-3 h-3" />
                          <span>{item.linkedDoctype}: {item.linkedName || item.linkedId}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-gray-400 dark:text-gray-500">
                      {item.folder && item.folder !== 'Uncategorized' && (
                        <span className="flex items-center gap-1"><Folder className="w-3 h-3" />{item.folder}</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-400">{formatBytes(item.fileSize)}</td>
                    <td className="p-3 text-gray-400">{item.date}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setDetailItem(item)} title="View" className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-400 hover:text-blue-600 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleShare(item)} title="Share" className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-400 hover:text-green-600 transition-colors"><Share2 className="w-3.5 h-3.5" /></button>
                        <button onClick={e => handleDeleteOne(item.id, e)} title="Delete" className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : viewMode === 'masonry' ? (
          // ── MASONRY ───────────────────────────────────────────────────────
          <div className="columns-2 sm:columns-3 md:columns-4 xl:columns-5 gap-4 space-y-4">
            {filtered.map((item, idx) => (
              <GalleryCard key={item.id} item={item} idx={idx} selectedIds={selectedIds}
                onToggleSelect={toggleSelect} onOpenLightbox={openLightbox}
                onToggleFavorite={toggleFavorite} onDetail={setDetailItem}
                onShare={handleShare} onDelete={handleDeleteOne} onDownload={downloadItem}
                masonry />
            ))}
          </div>
        ) : (
          // ── GRID ──────────────────────────────────────────────────────────
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map((item, idx) => (
              <GalleryCard key={item.id} item={item} idx={idx} selectedIds={selectedIds}
                onToggleSelect={toggleSelect} onOpenLightbox={openLightbox}
                onToggleFavorite={toggleFavorite} onDetail={setDetailItem}
                onShare={handleShare} onDelete={handleDeleteOne} onDownload={downloadItem} />
            ))}
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* LIGHTBOX                                                              */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {lightboxIndex >= 0 && filtered[lightboxIndex] && (
        <div className="fixed inset-0 z-[300] bg-black/95 flex" onClick={closeLightbox}>
          <button onClick={e => { e.stopPropagation(); prevLight(); }} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-10 backdrop-blur-sm">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button onClick={e => { e.stopPropagation(); nextLight(); }} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-10 backdrop-blur-sm">
            <ArrowRight className="w-5 h-5" />
          </button>

          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button onClick={e => { e.stopPropagation(); downloadItem(filtered[lightboxIndex]); }} className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-colors"><Download className="w-4 h-4" /></button>
            <button onClick={e => { e.stopPropagation(); handleShare(filtered[lightboxIndex]); }} className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-colors"><Share2 className="w-4 h-4" /></button>
            <button onClick={closeLightbox} className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-colors"><X className="w-4 h-4" /></button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8" onClick={e => e.stopPropagation()}>
            <img src={filtered[lightboxIndex].url} alt={filtered[lightboxIndex].title}
              className="max-h-[78vh] max-w-full object-contain rounded-lg shadow-2xl" />
            <div className="text-center">
              <p className="text-white font-semibold">{filtered[lightboxIndex].title}</p>
              <div className="flex items-center justify-center gap-3 mt-1.5 flex-wrap">
                <CategoryBadge category={filtered[lightboxIndex].category} size="sm" />
                {filtered[lightboxIndex].tags?.map(t => (
                  <span key={t} className="text-[11px] text-gray-400">#{t}</span>
                ))}
              </div>
              <p className="text-gray-500 text-xs mt-1">{lightboxIndex + 1} / {filtered.length}
                {filtered[lightboxIndex].width && <span className="ml-2">{filtered[lightboxIndex].width}×{filtered[lightboxIndex].height}px</span>}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* DETAIL SIDE PANEL                                                     */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {detailItem && (
        <div className="fixed inset-0 z-[200] flex" onClick={() => setDetailItem(null)}>
          <div className="flex-1 bg-black/30 backdrop-blur-sm" />
          <div className="w-[420px] bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-bold text-gray-800 dark:text-white">Image Details</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditItem({ ...detailItem }); setDetailItem(null); }}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => handleShare(detailItem)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md text-gray-400 hover:text-green-600 transition-colors" title="Share">
                  <Share2 className="w-4 h-4" />
                </button>
                <button onClick={() => setDetailItem(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md text-gray-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Image Preview */}
            <div className="relative bg-gray-100 dark:bg-slate-800">
              <img src={detailItem.url} alt={detailItem.title} className="w-full max-h-64 object-contain" />
              <button onClick={() => { const idx = filtered.findIndex(i => i.id === detailItem.id); openLightbox(idx); }}
                className="absolute bottom-3 right-3 p-2 bg-black/50 text-white rounded-lg backdrop-blur-sm hover:bg-black/70 transition-colors">
                <ZoomIn className="w-4 h-4" />
              </button>
              <button onClick={() => toggleFavorite(detailItem)}
                className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-lg backdrop-blur-sm hover:bg-black/70 transition-colors">
                <Heart className="w-4 h-4" fill={detailItem.isFavorite ? 'white' : 'none'} />
              </button>
            </div>

            {/* Info sections */}
            <div className="p-5 space-y-5">
              {/* Title & Category */}
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">{detailItem.title}</h3>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <CategoryBadge category={detailItem.category} size="sm" />
                  {detailItem.isPublic
                    ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded-md"><Globe className="w-3 h-3" />Public</span>
                    : <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-100 dark:bg-slate-700 dark:text-gray-400 px-2 py-0.5 rounded-md"><Lock className="w-3 h-3" />Private</span>
                  }
                </div>
              </div>

              {/* Description */}
              {detailItem.description && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1.5">Description</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{detailItem.description}</p>
                </div>
              )}

              {/* Tags */}
              {(detailItem.tags?.length || 0) > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1.5">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detailItem.tags?.map(t => (
                      <span key={t} className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">#{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* File info */}
              <div>
                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase mb-2">File Information</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['Date', detailItem.date],
                    ['Folder', detailItem.folder || 'Uncategorized'],
                    detailItem.fileSize ? ['Size', formatBytes(detailItem.fileSize)] : null,
                    detailItem.width ? ['Dimensions', `${detailItem.width}×${detailItem.height}`] : null,
                    detailItem.mimeType ? ['Type', detailItem.mimeType.replace('image/', '').toUpperCase()] : null,
                    detailItem.uploadedBy ? ['Uploaded By', detailItem.uploadedBy] : null,
                  ].filter(Boolean).map((item) => {
                    const [label, val] = item as [string, any];
                    return (
                    <div key={label} className="bg-gray-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-semibold">{label}</p>
                      <p className="text-xs text-gray-700 dark:text-gray-300 font-medium mt-0.5">{val}</p>
                    </div>
                  )})}
                </div>
              </div>

              {/* Linked document */}
              {detailItem.linkedDoctype && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase mb-2">Linked Document</p>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-lg">
                    <Link2 className="w-4 h-4 text-blue-500 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">{detailItem.linkedDoctype}</p>
                      <p className="text-[11px] text-blue-600 dark:text-blue-400">{detailItem.linkedName || detailItem.linkedId}</p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400 ml-auto" />
                  </div>
                </div>
              )}

              {/* Notes */}
              {detailItem.notes && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1.5">Notes</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 rounded-lg p-3">{detailItem.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                <button onClick={() => downloadItem(detailItem)} className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-md transition-colors">
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button onClick={() => handleShare(detailItem)} className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-md transition-colors">
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
                <button onClick={e => { handleDeleteOne(detailItem.id, e); setDetailItem(null); }} className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* EDIT MODAL                                                            */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {editItem && (
        <BaseModal isOpen={true} onClose={() => setEditItem(null)} title={`Edit: ${editItem.title}`} size="md">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Image Name <span className="text-red-500">*</span></label>
                <input className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-md px-3 py-2 text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  value={editItem.title} onChange={e => setEditItem({ ...editItem, title: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Category</label>
                <select className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-md px-3 py-2 text-sm dark:text-white outline-none"
                  value={editItem.category} onChange={e => setEditItem({ ...editItem, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Folder</label>
                <select className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-md px-3 py-2 text-sm dark:text-white outline-none"
                  value={editItem.folder || 'Uncategorized'} onChange={e => setEditItem({ ...editItem, folder: e.target.value })}>
                  {FOLDERS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Description</label>
                <textarea className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-md px-3 py-2 text-sm dark:text-white outline-none resize-none" rows={2}
                  value={editItem.description || ''} onChange={e => setEditItem({ ...editItem, description: e.target.value })} />
              </div>

              {/* Tags editor */}
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Tags</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {editItem.tags?.map(t => (
                    <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                      #{t}
                      <button onClick={() => setEditItem({ ...editItem, tags: editItem.tags?.filter(x => x !== t) })}><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input className="flex-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-md px-3 py-1.5 text-xs dark:text-white outline-none"
                    placeholder="Add tag..." value={tagInput} onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag('edit'); } }} />
                  <button onClick={() => addTag('edit')} className="px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-100 transition-colors">Add</button>
                </div>
              </div>

              {/* Linked doc */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Link to Document</label>
                <select className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-md px-3 py-2 text-sm dark:text-white outline-none"
                  value={editItem.linkedDoctype || ''} onChange={e => setEditItem({ ...editItem, linkedDoctype: e.target.value })}>
                  <option value="">No link</option>
                  {DOCTYPE_LINKS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              {editItem.linkedDoctype && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Document Reference</label>
                  <input className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-md px-3 py-2 text-sm dark:text-white outline-none"
                    placeholder="e.g. SO-00123" value={editItem.linkedName || ''} onChange={e => setEditItem({ ...editItem, linkedName: e.target.value })} />
                </div>
              )}

              {/* Visibility */}
              <div className="col-span-2 flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                <Globe className="w-4 h-4 text-gray-400" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Make Public</p>
                  <p className="text-[11px] text-gray-400">Anyone with the link can view this image</p>
                </div>
                <button onClick={() => setEditItem({ ...editItem, isPublic: !editItem.isPublic })}
                  className={`w-10 h-5 rounded-full transition-colors ${editItem.isPublic ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'}`}>
                  <span className={`block w-4 h-4 rounded-full bg-white shadow-sm transition-transform mx-0.5 ${editItem.isPublic ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Notes */}
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Internal Notes</label>
                <textarea className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-md px-3 py-2 text-sm dark:text-white outline-none resize-none" rows={2}
                  placeholder="Internal notes not shown publicly..."
                  value={editItem.notes || ''} onChange={e => setEditItem({ ...editItem, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditItem(null)} className="flex-1 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 rounded-md transition-colors">Cancel</button>
              <button onClick={handleEditSave} disabled={!onUpdate} className="flex-1 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm disabled:opacity-50">Save Changes</button>
            </div>
          </div>
        </BaseModal>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* SHARE MODAL                                                           */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {shareItem && (
        <BaseModal isOpen={true} onClose={() => setShareItem(null)} title="Share Image" size="sm">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src={shareItem.url} alt={shareItem.title} className="w-16 h-16 rounded-lg object-cover bg-gray-100" />
              <div>
                <p className="font-semibold text-gray-800 dark:text-white text-sm">{shareItem.title}</p>
                <CategoryBadge category={shareItem.category} />
              </div>
            </div>

            {/* Visibility toggle */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
              <Globe className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Public Link</p>
                <p className="text-[11px] text-gray-400">Enable to share with anyone using the link below</p>
              </div>
              <button
                onClick={() => { if (onUpdate) { const updated = { ...shareItem, isPublic: !shareItem.isPublic, shareToken: shareItem.shareToken || genShareToken() }; onUpdate(updated); setShareItem(updated); } }}
                className={`w-10 h-5 rounded-full transition-colors ${shareItem.isPublic ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'}`}>
                <span className={`block w-4 h-4 rounded-full bg-white shadow-sm transition-transform mx-0.5 ${shareItem.isPublic ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Share link */}
            {shareItem.isPublic && (
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Share Link</p>
                <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg">
                  <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="flex-1 text-xs text-gray-600 dark:text-gray-300 truncate font-mono">{getShareLink(shareItem)}</span>
                  <button onClick={copyShareLink} className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${copiedToken ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                    {copiedToken ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                  </button>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      if (!onUpdate) return;
                      const updated = { ...shareItem, shareToken: genShareToken() };
                      onUpdate(updated);
                      setShareItem(updated);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 rounded-md transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" /> Reset Link
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                {shareItem.isPublic
                  ? 'This image is publicly accessible. Anyone with the link can view it.'
                  : 'This image is private. Enable public link to share with others.'}
              </p>
            </div>
          </div>
        </BaseModal>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* UPLOAD MODAL                                                          */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <BaseModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Upload New Image" size="lg">
        <div className="grid grid-cols-2 gap-5">
          {/* Left: Upload zone */}
          <div className="space-y-4">
            <div
              ref={dropZoneRef}
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors overflow-hidden ${
                formData.url
                  ? 'border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/10'
                  : 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800/50 hover:border-blue-400 hover:bg-blue-50/30'
              }`}
              style={{ minHeight: 220 }}
            >
              {formData.url ? (
                <>
                  <img src={formData.url} alt="preview" className="w-full h-56 object-contain" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-2 flex items-center justify-between">
                    <span className="text-[10px] text-white/80 font-medium">
                      {formData.width && `${formData.width}×${formData.height}px`} {formData.fileSize && `· ${formatBytes(formData.fileSize)}`}
                    </span>
                    <button onClick={() => setFormData(prev => ({ ...prev, url: '', fileSize: undefined, width: undefined, height: undefined }))} className="p-1 bg-red-600 text-white rounded"><X className="w-3 h-3" /></button>
                  </div>
                </>
              ) : (
                <>
                  <Camera className="w-10 h-10 text-gray-300 dark:text-slate-600 mb-3" />
                  <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">{uploading ? 'Processing...' : 'Drop image here'}</p>
                  <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">or click to browse</p>
                  <input ref={fileInputRef} type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleFileInputChange} />
                </>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 flex items-center justify-center backdrop-blur-sm">
                  <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              )}
            </div>
            {/* Color swatch */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Color Swatch</label>
              <div className="flex items-center gap-2">
                <input type="color" className="w-10 h-8 rounded cursor-pointer border-0 bg-transparent"
                  value={formData.colorSwatch || '#ffffff'} onChange={e => setFormData(prev => ({ ...prev, colorSwatch: e.target.value }))} />
                <span className="text-xs text-gray-500 dark:text-gray-400">{formData.colorSwatch || 'Pick a color'}</span>
              </div>
            </div>
          </div>

          {/* Right: Form fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Image Name <span className="text-red-500">*</span></label>
              <input required className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-md px-3 py-2 text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
                value={formData.title || ''} onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g. Silk Texture S25" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Category</label>
                <select className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-md px-3 py-2 text-sm dark:text-white outline-none"
                  value={formData.category || 'DESIGN'} onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Folder</label>
                <select className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-md px-3 py-2 text-sm dark:text-white outline-none"
                  value={formData.folder || 'Uncategorized'} onChange={e => setFormData(prev => ({ ...prev, folder: e.target.value }))}>
                  {FOLDERS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Description</label>
              <textarea className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-md px-3 py-2 text-sm dark:text-white outline-none resize-none" rows={2}
                value={formData.description || ''} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Optional description..." />
            </div>
            {/* Tags */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Tags</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {formData.tags?.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                    #{t}
                    <button onClick={() => setFormData(prev => ({ ...prev, tags: prev.tags?.filter(x => x !== t) }))}><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input className="flex-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-md px-3 py-1.5 text-xs dark:text-white outline-none"
                  placeholder="silk, summer, approved..." value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag('form'); } }} />
                <button onClick={() => addTag('form')} className="px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-100 transition-colors">Add</button>
              </div>
            </div>
            {/* Link to doc */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Link to Document</label>
                <select className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-md px-3 py-2 text-sm dark:text-white outline-none"
                  value={formData.linkedDoctype || ''} onChange={e => setFormData(prev => ({ ...prev, linkedDoctype: e.target.value }))}>
                  <option value="">None</option>
                  {DOCTYPE_LINKS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              {formData.linkedDoctype && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Reference ID</label>
                  <input className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-md px-3 py-2 text-sm dark:text-white outline-none"
                    placeholder="e.g. SO-00123" value={formData.linkedName || ''} onChange={e => setFormData(prev => ({ ...prev, linkedName: e.target.value }))} />
                </div>
              )}
            </div>
            {/* Visibility */}
            <div className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
              <Globe className="w-4 h-4 text-gray-400" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Make Public</p>
                <p className="text-[10px] text-gray-400">Enable sharing via link</p>
              </div>
              <button onClick={() => setFormData(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                className={`w-9 h-5 rounded-full transition-colors ${formData.isPublic ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'}`}>
                <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform mx-0.5 ${formData.isPublic ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Vault notice */}
        <div className="flex items-start gap-2.5 mt-5 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-lg">
          <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-blue-700 dark:text-blue-400">Assets are stored in IndexedDB (Immutable Vault) and persisted to the native file system in Electron mode. They survive database rollbacks.</p>
        </div>

        {/* Submit */}
        <div className="flex gap-3 mt-5">
          <button onClick={() => setIsUploadOpen(false)} className="flex-1 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 rounded-md transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={!formData.url || !formData.title || uploading}
            className="flex-2 min-w-[120px] py-2.5 px-6 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors shadow-sm">
            {uploading ? 'Processing...' : 'Save to Gallery'}
          </button>
        </div>
      </BaseModal>
    </div>
  );
};

// ─── Gallery Card ─────────────────────────────────────────────────────────────
const GalleryCard: React.FC<{
  item: GalleryItem;
  idx: number;
  selectedIds: Set<string>;
  masonry?: boolean;
  onToggleSelect: (id: string, e?: React.MouseEvent) => void;
  onOpenLightbox: (idx: number) => void;
  onToggleFavorite: (item: GalleryItem, e?: React.MouseEvent) => void;
  onDetail: (item: GalleryItem) => void;
  onShare: (item: GalleryItem) => void;
  onDelete: (id: string, e?: React.MouseEvent) => void;
  onDownload: (item: GalleryItem, e?: React.MouseEvent) => void;
}> = ({ item, idx, selectedIds, masonry, onToggleSelect, onOpenLightbox, onToggleFavorite, onDetail, onShare, onDelete, onDownload }) => {
  const isSelected = selectedIds.has(item.id);
  return (
    <div className={`group relative bg-white dark:bg-slate-800 rounded-lg border transition-all cursor-pointer hover:shadow-md ${masonry ? 'break-inside-avoid mb-4' : ''} ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-md' : 'border-gray-200 dark:border-slate-700'}`}>
      {/* Checkbox */}
      <button onClick={e => onToggleSelect(item.id, e)} className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        {isSelected
          ? <CheckSquare className="w-4 h-4 text-blue-600" fill="currentColor" />
          : <div className="w-4 h-4 rounded bg-white/80 dark:bg-slate-700/80 border border-gray-300 dark:border-slate-500 backdrop-blur-sm" />
        }
      </button>

      {/* Favorite */}
      <button onClick={e => onToggleFavorite(item, e)} className={`absolute top-2 right-2 z-10 p-1 rounded-md backdrop-blur-sm transition-all ${item.isFavorite ? 'opacity-100 bg-red-50/80 dark:bg-red-900/40' : 'opacity-0 group-hover:opacity-100 bg-white/80 dark:bg-slate-700/80'}`}>
        <Heart className={`w-3.5 h-3.5 ${item.isFavorite ? 'text-red-500' : 'text-gray-400'}`} fill={item.isFavorite ? 'currentColor' : 'none'} />
      </button>

      {/* Public badge */}
      {item.isPublic && (
        <div className="absolute top-2 left-8 z-10 px-1.5 py-0.5 bg-green-500/90 text-white rounded text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
          PUBLIC
        </div>
      )}

      {/* Image */}
      <div className={`overflow-hidden rounded-t-lg bg-gray-100 dark:bg-slate-700 ${masonry ? '' : 'aspect-square'}`}
        onClick={() => onOpenLightbox(idx)}>
        <img src={item.url} alt={item.title} className={`w-full object-cover transition-transform duration-300 group-hover:scale-105 ${masonry ? 'h-auto' : 'h-full'}`} loading="lazy" />
      </div>

      {/* Info */}
      <div className="p-2.5">
        <div className="flex items-start justify-between gap-1">
          <p className="text-xs font-semibold text-gray-800 dark:text-white truncate flex-1 leading-tight" onClick={() => onDetail(item)}>{item.title}</p>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <CategoryBadge category={item.category} />
          <span className="text-[10px] text-gray-400">{item.date}</span>
        </div>
        {/* Tags preview */}
        {(item.tags?.length || 0) > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.tags?.slice(0, 2).map(t => (
              <span key={t} className="text-[10px] text-gray-400 dark:text-gray-500">#{t}</span>
            ))}
            {(item.tags?.length || 0) > 2 && <span className="text-[10px] text-gray-300 dark:text-gray-600">+{(item.tags?.length || 0) - 2}</span>}
          </div>
        )}
        {/* Linked doc */}
        {item.linkedDoctype && (
          <div className="flex items-center gap-1 mt-1.5">
            <Link2 className="w-3 h-3 text-blue-400 shrink-0" />
            <span className="text-[10px] text-blue-500 dark:text-blue-400 truncate">{item.linkedDoctype}: {item.linkedName || item.linkedId}</span>
          </div>
        )}
      </div>

      {/* Hover action bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-b-lg px-2.5 py-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity border-t border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-1">
          <button onClick={() => onDetail(item)} title="Details" className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-blue-600 transition-colors"><Info className="w-3.5 h-3.5" /></button>
          <button onClick={e => onDownload(item, e)} title="Download" className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-700 transition-colors"><Download className="w-3.5 h-3.5" /></button>
          <button onClick={() => onShare(item)} title="Share" className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-green-600 transition-colors"><Share2 className="w-3.5 h-3.5" /></button>
        </div>
        <button onClick={e => onDelete(item.id, e)} title="Delete" className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
};

export default Gallery;
