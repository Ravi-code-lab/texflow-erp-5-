import React from 'react';
import { motion } from 'motion/react';
import { Construction, ChevronRight, Sparkles } from 'lucide-react';

interface PlaceholderModuleProps {
  title?: string;
  description?: string;
  module?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const PlaceholderModule: React.FC<PlaceholderModuleProps> = ({
  title = 'Coming Soon',
  description = 'This module is under development.',
  module,
  icon: Icon = Construction,
}) => (
  <div className="flex flex-col items-center justify-center h-full min-h-[320px] py-16 px-8 text-center">
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, type: 'spring' }}
      className="flex flex-col items-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center mb-5">
        <Icon className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
      </div>
      {module && (
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{module}</span>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">{title}</span>
        </div>
      )}
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">{title}</h2>
      <p className="text-[13px] text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">{description}</p>
      <div className="mt-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
        <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">Module in development — check back soon</span>
      </div>
    </motion.div>
  </div>
);

export default PlaceholderModule;
