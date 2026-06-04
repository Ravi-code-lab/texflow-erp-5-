import React, { useState } from 'react';
import { X, User, Mail, Shield, LogOut, Check } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onUpdate: (updatedUser: any) => void;
  onLogout: () => void;
}

export default function UserProfileModal({ isOpen, onClose, user, onUpdate, onLogout }: UserProfileModalProps) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState(user?.role || 'Operator');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-2xl shadow-2xl p-5 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white">
          <X className="w-4.5 h-4.5" />
        </button>

        <div className="text-center pb-4">
          <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 flex items-center justify-center mx-auto mb-3">
            <User className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-800 dark:text-white text-base">User Profile Configuration</h3>
          <p className="text-xs text-slate-400">Manage account information</p>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Full Name</label>
            <input 
              role="textbox"
              type="text" 
              className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Email Address</label>
            <input 
              role="textbox"
              type="email" 
              className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Assigned Role</label>
            <span className="p-2 py-1 inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-300/30 font-bold rounded text-[10px] uppercase">
              <Shield className="w-3 h-3" /> {role}
            </span>
          </div>
        </div>

        <div className="pt-6 flex flex-col gap-2">
          <button
            type="submit"
            onClick={() => {
              onUpdate({ ...user, name, email });
              onClose();
            }}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <Check className="w-4 h-4" /> Save Profile Specs
          </button>
          
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="w-full py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/25 border border-rose-200/50 dark:border-rose-900 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out Account
          </button>
        </div>
      </div>
    </div>
  );
}
