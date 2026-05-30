import React, { useState, useEffect, useRef } from 'react';
import { Search, Package, ShoppingCart, Zap, CornerDownLeft, PlusCircle, BarChart3, Users, HelpCircle } from 'lucide-react';
import { ViewState, InventoryItem, Order, ProductionJob } from '../types';
import { ERP_MODULE_ITEMS } from '../modules/registry';
import { filterViewsByRole } from '../modules/permissions';
import { UserRole } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: ViewState) => void;
  inventory: InventoryItem[];
  orders: Order[];
  jobs: ProductionJob[];
  userRole?: UserRole;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate, inventory, orders, jobs, userRole = 'ADMIN' }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const quickActions = filterViewsByRole(userRole, ERP_MODULE_ITEMS.filter((item) => item.id !== 'SETTINGS')).map((item) => ({
    id: `nav-${item.id}`,
    label: `Go to ${item.label}`,
    icon: React.createElement(item.icon, { className: 'w-4 h-4' }),
    action: () => onNavigate(item.id),
    shortcut: item.id === 'DASHBOARD' ? 'G D' : undefined,
    meta: item.doctype,
    keywords: [item.doctype, item.module, ...(item.keywords || [])],
  }));

  // Add highly useful ERPNext rapid document creation shortcuts
  const quickCreations = [
    {
      id: 'create-order',
      label: 'Create New Sales Order',
      icon: <PlusCircle className="w-4 h-4 text-emerald-500" />,
      action: () => { onNavigate('ORDERS'); },
      meta: 'Create quotation draft or sales confirmation sheet',
      keywords: ['new', 'create', 'order', 'sell', 'sales']
    },
    {
      id: 'create-customer',
      label: 'Add Customer / Supplier Profile',
      icon: <Users className="w-4 h-4 text-blue-500" />,
      action: () => { onNavigate('CRM'); },
      meta: 'Store Karigar details, retailer directories or contact lists',
      keywords: ['new', 'create', 'customer', 'supplier', 'contact', 'karigar']
    },
    {
      id: 'create-material',
      label: 'Request Raw Stock Material',
      icon: <PlusCircle className="w-4 h-4 text-amber-500" />,
      action: () => { onNavigate('INVENTORY'); },
      meta: 'Launch issue request for gold dust, thread or packing cases',
      keywords: ['new', 'create', 'material', 'request', 'stock', 'raw']
    },
    {
      id: 'new-job',
      label: 'Dispatch Workshop Work Card',
      icon: <PlusCircle className="w-4 h-4 text-purple-500" />,
      action: () => { onNavigate('PRODUCTION'); },
      meta: 'Initialize smelting, shaping or diamond-setting task',
      keywords: ['new', 'create', 'job', 'work', 'workorder', 'karigar']
    }
  ];

  // Dynamic system aggregations
  const pendingOrdersCount = orders.filter(o => o.status === 'PENDING').length;
  const inProgressJobsCount = jobs.filter(j => j.status === 'IN_PROGRESS' || j.status === 'ACTIVE').length;
  const stockLimitCount = inventory.filter(i => i.quantity < 5).length;
  const stockTotalUnitValue = inventory.reduce((acc, i) => acc + (i.quantity * 100), 0); // Mock financial aggregation

  const systemStats = [
    {
      id: 'stat-pending',
      label: `Inspect ${pendingOrdersCount} Pending Retailer Orders`,
      icon: <BarChart3 className="w-4 h-4 text-indigo-500" />,
      action: () => onNavigate('ORDERS'),
      meta: 'Filter database for active demand orders needing subcontracting',
      keywords: ['pending', 'orders', 'status', 'sales']
    },
    {
      id: 'stat-jobs',
      label: `Monitor ${inProgressJobsCount} Active Workshop Stages`,
      icon: <BarChart3 className="w-4 h-4 text-amber-500" />,
      action: () => onNavigate('PRODUCTION'),
      meta: 'Track active refining, polishing or framing cards',
      keywords: ['jobs', 'active', 'production', 'karigar', 'polish']
    },
    {
      id: 'stat-critical',
      label: `Inspect ${stockLimitCount} Materials running under safe reorder limits`,
      icon: <Package className="w-4 h-4 text-red-500" />,
      action: () => onNavigate('INVENTORY'),
      meta: 'View low raw materials',
      keywords: ['low', 'stock', 'inventory', 'critical', 'limit']
    }
  ];

  const sections = [
    {
      title: 'Navigation & DocTypes',
      items: quickActions
    },
    {
      title: 'Quick Creations (Awesomebar Commands)',
      items: quickCreations
    },
    {
      title: 'Live Analytical Insights',
      items: systemStats
    }
  ];

  const normalizedQuery = query.startsWith('>') ? query.slice(1).trim() : query;

  const filteredItems = sections.map(section => ({
    ...section,
    items: section.items.filter(item =>
      [
        item.label,
        (item as any).meta,
        ...((item as any).keywords || []),
      ].filter(Boolean).join(' ').toLowerCase().includes(normalizedQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  const flatItems = filteredItems.flatMap(s => s.items);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems[selectedIndex]) {
        flatItems[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/65 dark:bg-black/80 backdrop-blur-sm transition-opacity animate-fade-in" />
      
      {/* Modal Card */}
      <div 
        className="relative w-full max-w-xl bg-white dark:bg-[#1a1a24] rounded-2xl shadow-2xl shadow-slate-950/40 overflow-hidden animate-slide-up border border-slate-200 dark:border-white/[0.08] ring-1 ring-black/5 flex flex-col max-h-[60vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center px-5 py-4 border-b border-slate-200 dark:border-white/[0.08]">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-lg font-semibold tracking-tight"
            placeholder="Search DocTypes, records, shortcut commands..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
          />
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
             <kbd className="text-[10px] select-none font-sans font-extrabold text-slate-400 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 px-1.5 py-0.5 rounded-md shadow-sm">ESC</kbd>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto py-3 custom-scrollbar px-2 divide-y divide-slate-100 dark:divide-white/[0.04]">
          {filteredItems.length === 0 ? (
            <div className="px-6 py-14 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center">
              <Zap className="w-9 h-9 mb-3 opacity-20 text-indigo-500 animate-bounce" />
              <p className="font-semibold text-xs uppercase tracking-wide">No search results matching command</p>
              <p className="text-[11px] mt-1 text-slate-400">Try searching "order", "new", or "stock"</p>
            </div>
          ) : (
            filteredItems.map((section, sIdx) => (
              <div key={section.title} className="py-2.5">
                <div className="px-4 py-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest pl-4">
                  {section.title}
                </div>
                {section.items.map((item, iIdx) => {
                  let absIndex = 0;
                  for(let i=0; i<sIdx; i++) absIndex += filteredItems[i].items.length;
                  absIndex += iIdx;
                  
                  const isSelected = absIndex === selectedIndex;

                  return (
                    <button
                      key={item.id}
                      onClick={() => { item.action(); onClose(); }}
                      onMouseEnter={() => setSelectedIndex(absIndex)}
                      className={`w-full flex items-center px-4 py-2.5 rounded-lg text-sm transition-all duration-150 max-w-full group ${
                        isSelected 
                          ? 'bg-indigo-600 dark:bg-indigo-600 text-white shadow-md scale-[1.005]' 
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className={`p-1.5 rounded-md mr-3.5 shrink-0 transition-colors ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-slate-400'}`}>
                        {item.icon}
                      </div>
                      
                      <div className="flex-1 text-left truncate">
                        <span className={`font-semibold block text-[13px] sm:text-[14px] ${isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>{item.label}</span>
                        {(item as any).meta && (
                          <span className={`text-[11px] truncate block ${isSelected ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'}`}>{(item as any).meta}</span>
                        )}
                      </div>

                      {(item as any).shortcut && !isSelected && (
                        <div className="hidden sm:flex gap-1 shrink-0 ml-2">
                           {(item as any).shortcut.split(' ').map((key: string, idx: number) => (
                              <kbd key={idx} className="h-5 min-w-[20px] px-1.2 flex items-center justify-center text-[9px] font-black text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-zinc-700 rounded shadow-sm">{key}</kbd>
                           ))}
                        </div>
                      )}
                      
                      {isSelected && <CornerDownLeft className="w-4 h-4 text-indigo-100 dark:text-indigo-200 animate-pulse ml-2" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        
        {/* Footer Hint */}
        <div className="bg-slate-50 dark:bg-[#121218] px-5 py-2.5 border-t border-slate-100 dark:border-white/[0.08] flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-bold select-none shrink-0">
           <div className="flex gap-4">
              <span>Use <strong className="text-slate-600 dark:text-slate-400 font-black">↑↓</strong> to navigate</span>
              <span><strong className="text-slate-600 dark:text-slate-400 font-black">Enter</strong> to select</span>
           </div>
           <span className="text-indigo-500 dark:text-indigo-400 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 fill-slate-300 dark:fill-slate-800"/> Awesomebar Deck</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
