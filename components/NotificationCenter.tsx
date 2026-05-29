
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, CheckCircle2, AlertCircle, Info, 
  XCircle, Trash2, Check, Clock, ExternalLink,
  BellOff, Filter, Settings
} from 'lucide-react';
import { Notification } from '../types';

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'SUCCESS': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'WARNING': return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'ERROR': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTypeBg = (type: Notification['type']) => {
    switch (type) {
      case 'SUCCESS': return 'bg-green-500/10 border-green-500/20';
      case 'WARNING': return 'bg-amber-500/10 border-amber-500/20';
      case 'ERROR': return 'bg-red-500/10 border-red-500/20';
      default: return 'bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Notification Center</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">System Alerts & Real-time Updates</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onMarkAllAsRead}
            disabled={unreadCount === 0}
            className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center gap-2 border border-slate-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-3 h-3" /> Mark All Read
          </button>
          <button 
            onClick={onClearAll}
            disabled={notifications.length === 0}
            className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-100 dark:hover:bg-red-900/30 transition-all flex items-center gap-2 border border-red-100 dark:border-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3 h-3" /> Clear All
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Notifications</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white">{notifications.length}</p>
          </div>
          <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400"><Bell className="w-5 h-5"/></div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Unread Alerts</p>
            <p className="text-2xl font-black text-indigo-600">{unreadCount}</p>
          </div>
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600"><Clock className="w-5 h-5"/></div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Critical Errors</p>
            <p className="text-2xl font-black text-red-500">{notifications.filter(n => n.type === 'ERROR').length}</p>
          </div>
          <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-500"><AlertCircle className="w-5 h-5"/></div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`group relative bg-white dark:bg-slate-900 p-5 rounded-2xl border transition-all hover:shadow-md ${
                  n.read ? 'border-slate-100 dark:border-slate-800 opacity-75' : 'border-indigo-200 dark:border-indigo-900/50 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-xl border shrink-0 ${getTypeBg(n.type)}`}>
                    {getTypeIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className={`text-sm font-bold uppercase tracking-tight truncate ${n.read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                        {n.title}
                      </h4>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap">
                        {new Date(n.createdAt || '').toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {n.message}
                    </p>
                    {n.link && (
                      <button className="mt-3 text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                        View Details <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!n.read && (
                      <button 
                        onClick={() => onMarkAsRead(n.id)}
                        className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 transition-colors"
                        title="Mark as Read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button 
                      onClick={() => onDelete(n.id)}
                      className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <BellOff className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">No Notifications</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">You're all caught up! Check back later for updates.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default NotificationCenter;
