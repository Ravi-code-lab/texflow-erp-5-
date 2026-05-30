import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, LogOut, Scissors, Search, X, Bell, Activity,
  Home, Settings, ChevronRight, Command, Zap, Hash,
} from 'lucide-react';
import { ViewState, TeamMember, UIPreferences, CompanyInfo } from '../types';
import {
  getEnabledERPModuleGroups, HOME_MODULE, SETTINGS_MODULE, UPGRADE_MODULE, PRINT_FORMAT_MODULE,
  MODULE_COLOR_MAP, ERPModuleGroupId, ERPModuleItem,
} from '../modules/registry';
import { canAccessView, filterViewsByRole } from '../modules/permissions';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  onLogout: () => void;
  user?: TeamMember;
  uiPrefs?: UIPreferences;
  onUpdateUiPrefs?: (prefs: UIPreferences) => void;
  companyInfo: CompanyInfo;
  features?: Record<string, boolean>;
  isGitHubConnected?: boolean;
  onProfileClick?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  onCommandPalette?: () => void;
  notificationCount?: number;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentView, setView, onLogout, user,
  companyInfo, onProfileClick, features = {},
  isOpen, onClose, onCommandPalette, notificationCount = 0,
}) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'Workspace': true, 'Selling': true, 'Buying': false,
    'Manufacturing': false, 'Stock': false, 'Accounts & HR': false, 'Masters': false,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const role = user?.role || 'ADMIN';

  const allGroups = getEnabledERPModuleGroups(features).map((group) => ({
    ...group,
    items: filterViewsByRole(role, group.items),
  })).filter((group) => group.items.length > 0);

  const allItems: ERPModuleItem[] = allGroups.flatMap((g) => g.items);

  const filteredItems = searchQuery.trim()
    ? allItems.filter((item) => {
        const q = searchQuery.toLowerCase();
        return item.label.toLowerCase().includes(q) ||
          item.doctype?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.keywords?.some((k) => k.toLowerCase().includes(q));
      })
    : [];

  const toggleGroup = (title: string) =>
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));

  useEffect(() => {
    for (const group of allGroups) {
      if (group.items.some((item) => item.id === currentView)) {
        setOpenGroups(prev => ({ ...prev, [group.title]: true }));
        break;
      }
    }
  }, [currentView]);

  useEffect(() => {
    if (isSearchOpen && searchRef.current) searchRef.current.focus();
  }, [isSearchOpen]);

  const NavItem = ({ item, indent = false }: { item: ERPModuleItem; indent?: boolean }) => {
    const isActive = currentView === item.id;
    const groupId = item.module as ERPModuleGroupId;
    const colors = MODULE_COLOR_MAP[groupId] || MODULE_COLOR_MAP['masters'];

    return (
      <motion.button
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => {
          setView(item.id as ViewState);
          setIsSearchOpen(false);
          setSearchQuery('');
          if (onClose) onClose();
        }}
        className={`w-full flex items-center gap-2.5 px-3 py-[6px] rounded-lg text-[13px] font-medium transition-all text-left group relative ${
          isActive
            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200'
        } ${indent ? 'pl-9' : ''}`}
      >
        <div className={`w-4 flex justify-center shrink-0 ${
          isActive ? 'text-white' : `text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300`
        }`}>
          <item.icon className="w-[14px] h-[14px]" />
        </div>
        <span className="truncate flex-1 leading-tight">{item.label}</span>
        {isActive && (
          <div className="w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />
        )}
      </motion.button>
    );
  };

  const SearchResult = ({ item }: { item: ERPModuleItem }) => {
    const groupId = item.module as ERPModuleGroupId;
    const colors = MODULE_COLOR_MAP[groupId] || MODULE_COLOR_MAP['masters'];
    return (
      <motion.button
        whileHover={{ x: 2 }}
        onClick={() => {
          setView(item.id as ViewState);
          setIsSearchOpen(false);
          setSearchQuery('');
          if (onClose) onClose();
        }}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group"
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${colors.bg}`}>
          <item.icon className={`w-3.5 h-3.5 ${colors.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 truncate">{item.label}</p>
          {item.description && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{item.description}</p>
          )}
        </div>
        <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 shrink-0" />
      </motion.button>
    );
  };

  return (
    <aside className={`
      fixed inset-y-0 left-0 lg:relative h-full w-[224px] flex flex-col
      bg-white/90 dark:bg-[#0d0d10]/95
      backdrop-blur-xl border-r border-slate-200/70 dark:border-white/[0.06]
      shrink-0 z-50 transition-transform duration-300
      ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      {/* Header */}
      <div className="h-[56px] flex items-center justify-between px-3.5 border-b border-slate-200/60 dark:border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-lg flex items-center justify-center shadow-sm shadow-indigo-500/30 shrink-0">
            <Scissors className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">
              {companyInfo.name || 'TexFlow ERP'}
            </p>
            <p className="text-[9px] text-indigo-500 dark:text-indigo-400 font-bold uppercase tracking-widest leading-tight">
              ERP Platform
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {notificationCount > 0 && (
            <button
              onClick={() => { setView('NOTIFICATIONS'); if (onClose) onClose(); }}
              className="relative p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
            >
              <Bell className="w-3.5 h-3.5" />
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-rose-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            </button>
          )}
          <button
            onClick={() => setIsSearchOpen(s => !s)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
            title="Search modules (⌘K)"
          >
            {isSearchOpen ? <X className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Command Search Bar */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-slate-200/60 dark:border-white/[0.06]"
          >
            <div className="p-2.5">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 focus-within:border-indigo-400 dark:focus-within:border-indigo-500 transition-colors">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search modules..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-[12px] text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')}>
                    <X className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                  </button>
                )}
              </div>
            </div>
            {filteredItems.length > 0 && (
              <div className="px-2.5 pb-2.5 space-y-0.5 max-h-64 overflow-y-auto">
                {filteredItems.map((item) => (
                  <SearchResult key={item.id} item={item} />
                ))}
              </div>
            )}
            {searchQuery && filteredItems.length === 0 && (
              <div className="px-4 pb-3 text-center">
                <Hash className="w-4 h-4 text-slate-300 mx-auto mb-1" />
                <p className="text-[11px] text-slate-400">No modules found</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Home Quick Link */}
      {!isSearchOpen && (
        <div className="px-2.5 pt-2.5 pb-1">
          <NavItem item={HOME_MODULE} />
        </div>
      )}

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto py-1 px-2.5 space-y-px custom-scrollbar">
        {!isSearchOpen && allGroups.map((group) => {
          if (group.items.length === 0) return null;
          const isGroupOpen = openGroups[group.title];
          const colors = MODULE_COLOR_MAP[group.id as ERPModuleGroupId] || MODULE_COLOR_MAP['masters'];
          const hasActive = group.items.some((sub) => sub.id === currentView);

          return (
            <div key={group.id} className="mb-0.5">
              <button
                onClick={() => toggleGroup(group.title)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.07em] transition-all group
                  ${hasActive ? colors.text : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}
                `}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasActive ? colors.dot : 'bg-slate-300 dark:bg-slate-600'}`} />
                  {group.title}
                </div>
                <motion.div animate={{ rotate: isGroupOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="w-3 h-3" />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isGroupOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden mt-0.5 space-y-px"
                  >
                    {group.items.map((sub, sIdx) => (
                      <motion.div
                        key={sub.id}
                        initial={{ x: -6, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: sIdx * 0.015 }}
                      >
                        <NavItem item={sub} indent />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Settings + Separator */}
        {!isSearchOpen && (
          <div className="pt-2 mt-1 border-t border-slate-200/60 dark:border-white/[0.06]">
            {canAccessView(role, 'SETTINGS') && (
              <NavItem item={{ ...SETTINGS_MODULE }} />
            )}
            {role === 'ADMIN' && (
              <>
                <NavItem item={{ ...PRINT_FORMAT_MODULE }} />
                <NavItem item={{ ...UPGRADE_MODULE }} />
              </>
            )}
          </div>
        )}
      </nav>

      {/* Command Palette Hint */}
      {onCommandPalette && (
        <div className="px-2.5 pb-2">
          <button
            onClick={onCommandPalette}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/[0.06] hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Command className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500" />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200">Command Palette</span>
            </div>
            <div className="flex items-center gap-0.5">
              <kbd className="text-[9px] bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded px-1 py-0.5 text-slate-500 font-mono">⌘</kbd>
              <kbd className="text-[9px] bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded px-1 py-0.5 text-slate-500 font-mono">K</kbd>
            </div>
          </button>
        </div>
      )}

      {/* User Footer */}
      <div className="p-2.5 border-t border-slate-200/60 dark:border-white/[0.06] shrink-0">
        <div
          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer group"
          onClick={onProfileClick}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-white flex items-center justify-center text-[11px] font-bold uppercase shrink-0 shadow-sm">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">{user?.name || 'Admin'}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-tight">{user?.role || 'System'}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onLogout(); }}
            className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* System Status */}
        <div className="mt-2 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">System Online</span>
          <Activity className="w-3 h-3 text-emerald-400 ml-auto" />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
