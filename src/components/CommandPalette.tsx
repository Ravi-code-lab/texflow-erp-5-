
import React, { useState, useEffect, useRef } from 'react';
import { Search, Package, ShoppingCart, Zap, CornerDownLeft } from 'lucide-react';
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

  const sections = [
    {
      title: 'Quick Actions',
      items: quickActions
    },
    {
      title: 'Recent Orders',
      items: orders.slice(0, 3).map(o => ({
        id: `ord-${o.id}`,
        label: `${o.customerName} - ${o.id}`,
        icon: <ShoppingCart className="w-4 h-4" />,
        action: () => onNavigate('ORDERS'),
        meta: o.status
      }))
    },
    {
      title: 'Inventory Lookup',
      items: inventory.slice(0, 3).map(i => ({
        id: `inv-${i.id}`,
        label: i.name,
        icon: <Package className="w-4 h-4" />,
        action: () => onNavigate('INVENTORY'),
        meta: `${i.quantity} ${i.unit}`
      }))
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
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity animate-fade-in" />
      
      <div 
        className="relative w-full max-w-xl bg-white/80 backdrop-blur-2xl rounded-2xl shadow-2xl shadow-slate-900/30 overflow-hidden animate-slide-up border border-white/60 ring-1 ring-black/5 flex flex-col max-h-[60vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center px-6 py-5 border-b border-slate-200/50">
          <Search className="w-6 h-6 text-slate-400 mr-4" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent outline-none text-slate-800 placeholder:text-slate-400 text-xl font-medium tracking-tight"
            placeholder="Type a command or search..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
          />
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-bold text-slate-400 bg-white/50 border border-slate-200 px-2 py-1 rounded-md">ESC</span>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto py-3 custom-scrollbar px-2">
          {filteredItems.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400 flex flex-col items-center">
              <Zap className="w-10 h-10 mb-3 opacity-20 text-indigo-500" />
              <p className="font-medium">No results found.</p>
            </div>
          ) : (
            filteredItems.map((section, sIdx) => (
              <div key={section.title} className="mb-4">
                <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-5">
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
                      className={`w-full flex items-center px-4 py-3 mx-2 rounded-xl text-sm transition-all duration-200 max-w-[calc(100%-1rem)] group ${
                        isSelected 
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 scale-[1.01]' 
                          : 'text-slate-700 hover:bg-slate-100/50'
                      }`}
                    >
                      <div className={`p-2 rounded-lg mr-4 transition-colors ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {item.icon}
                      </div>
                      
                      <div className="flex-1 text-left">
                        <span className={`font-bold block ${isSelected ? 'text-white' : 'text-slate-800'}`}>{item.label}</span>
                        {(item as any).meta && (
                          <span className={`text-xs ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>{(item as any).meta}</span>
                        )}
                      </div>

                      {(item as any).shortcut && !isSelected && (
                        <div className="hidden sm:flex gap-1">
                           {(item as any).shortcut.split(' ').map((key: string, idx: number) => (
                              <kbd key={idx} className="h-6 min-w-[24px] px-1.5 flex items-center justify-center text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded-md shadow-sm">{key}</kbd>
                           ))}
                        </div>
                      )}
                      
                      {isSelected && <CornerDownLeft className="w-4 h-4 text-indigo-200 animate-pulse ml-2" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        
        {/* Footer Hint */}
        <div className="bg-slate-50/50 px-6 py-3 border-t border-slate-200/50 flex justify-between items-center text-[10px] text-slate-400 font-bold">
           <div className="flex gap-4">
              <span>Use <strong className="text-slate-600">↑↓</strong> to navigate</span>
              <span><strong className="text-slate-600">Enter</strong> to select</span>
           </div>
           <span className="text-indigo-400 flex items-center gap-1"><Zap className="w-3 h-3 fill-current"/> AI Powered</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
