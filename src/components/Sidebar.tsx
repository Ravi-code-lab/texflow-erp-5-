import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, LogOut, Scissors } from 'lucide-react';
import { ViewState, TeamMember, UIPreferences, CompanyInfo } from '../types';
import { getEnabledERPModuleGroups, HOME_MODULE, SETTINGS_MODULE } from '../modules/registry';
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
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, setView, onLogout, user, 
  companyInfo, onProfileClick, features = {},
  isOpen, onClose
}) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'Workspace': true,
    'Selling': true,
    'Buying': true,
    'Manufacturing': true,
    'Stock': true,
    'Accounts & HR': true,
    'Masters': true
  });

  const toggleGroup = (title: string) => {
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const role = user?.role || 'ADMIN';
  const menu = [
    HOME_MODULE,
    ...getEnabledERPModuleGroups(features).map((group) => ({
      ...group,
      items: filterViewsByRole(role, group.items),
    })).filter((group) => group.items.length > 0),
  ];

  return (
    <aside className={`
      fixed inset-y-0 left-0 lg:relative h-full w-64 flex flex-col glass border-r border-macos-border dark:border-macos-darkBorder shrink-0 z-50 transition-all duration-500
      ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      <div className="h-16 flex flex-col justify-center px-4 gap-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-macos-accent rounded-lg flex items-center justify-center text-white shadow-sm shrink-0">
            <Scissors className="w-4 h-4" />
          </div>
          <h1 className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate uppercase tracking-tight">
            {companyInfo.name}
          </h1>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
        {menu.map((item, idx) => {
          if ('items' in item && item.items) {
            if (item.items.length === 0) return null;
            const isOpen = openGroups[item.title || ''];
            return (
              <div key={idx} className="space-y-1 mb-4">
                <button 
                  onClick={() => toggleGroup(item.title || '')}
                  className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-macos-accent transition-colors group"
                >
                  <span className="flex items-center gap-2">
                    {item.title}
                  </span>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="space-y-0.5 overflow-hidden"
                    >
                      {item.items.map((sub, sIdx) => (
                        <motion.button
                          key={sub.id}
                          initial={{ x: -10, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: sIdx * 0.03 }}
                          whileHover={{ x: 4 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setView(sub.id as ViewState)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                            currentView === sub.id 
                              ? 'bg-macos-accent text-white shadow-sm' 
                              : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'
                          }`}
                        >
                          <div className="w-5 flex justify-center shrink-0">
                            <sub.icon className={`w-4 h-4 ${currentView === sub.id ? 'text-white' : 'opacity-60'}`} />
                          </div>
                          <span className="truncate">{sub.label}</span>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }
          const singleItem = item as typeof HOME_MODULE;
          return (
            <motion.button
              key={singleItem.id}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setView(singleItem.id as ViewState)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all mb-1 text-left ${
                currentView === singleItem.id 
                  ? 'bg-macos-accent text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <div className="w-5 flex justify-center shrink-0">
                <singleItem.icon className={`w-4 h-4 ${currentView === singleItem.id ? 'text-white' : 'opacity-60'}`} />
              </div>
              <span className="truncate">{singleItem.label}</span>
            </motion.button>
          );
        })}

        <div className="pt-2 mt-2 border-t border-macos-border dark:border-macos-darkBorder">
          {canAccessView(role, 'SETTINGS') && (
            <button
              onClick={() => setView('SETTINGS')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                currentView === 'SETTINGS' 
                  ? 'bg-macos-accent text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <div className="w-5 flex justify-center shrink-0">
                <SETTINGS_MODULE.icon className="w-4 h-4" />
              </div>
              <span>{SETTINGS_MODULE.label}</span>
            </button>
          )}
        </div>
      </nav>

      <div className="p-4 border-t border-macos-border dark:border-macos-darkBorder shrink-0">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-black/5 dark:bg-white/5">
          <button 
            onClick={onProfileClick}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-macos-accent to-indigo-600 text-white flex items-center justify-center text-xs font-bold uppercase shrink-0 shadow-sm"
          >
            {user?.name?.charAt(0) || 'A'}
          </button>
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onProfileClick}>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{user?.name || 'Admin'}</p>
            <p className="text-[10px] text-slate-500 truncate uppercase tracking-widest">{user?.role || 'Root'}</p>
          </div>
          <button 
            onClick={onLogout} 
            className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
