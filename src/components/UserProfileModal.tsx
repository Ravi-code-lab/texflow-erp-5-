
import React, { useState, useEffect } from 'react';
import { TeamMember } from '../types';
import BaseModal from './BaseModal';
import { User, Mail, Phone, LogOut, Save, Camera, Shield } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: TeamMember;
  onUpdate: (updatedUser: TeamMember) => void;
  onLogout: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, user, onUpdate, onLogout }) => {
  const [formData, setFormData] = useState<TeamMember>(user);

  useEffect(() => {
    setFormData(user);
  }, [user, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
    onClose();
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="My Profile" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col items-center gap-4 py-4 bg-slate-50 rounded-2xl border border-slate-100">
           <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white shadow-xl relative group cursor-pointer border-4 border-white">
              {formData.name.charAt(0)}
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <Camera className="w-8 h-8 text-white"/>
              </div>
           </div>
           <div className="text-center">
              <h3 className="text-xl font-bold text-slate-800">{formData.name}</h3>
              <div className="flex items-center justify-center gap-2 mt-1">
                 <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-100 uppercase tracking-wide flex items-center gap-1">
                    <Shield className="w-3 h-3"/> {formData.role}
                 </span>
              </div>
           </div>
        </div>

        <div className="space-y-4">
           <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                 <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                 <input 
                    required
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium text-slate-800"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                 />
              </div>
           </div>
           
           <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                 <input 
                    type="email"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium text-slate-800"
                    value={formData.email || ''}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                 />
              </div>
           </div>

           <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Phone Number</label>
              <div className="relative">
                 <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                 <input 
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium text-slate-800"
                    value={formData.phone || ''}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                 />
              </div>
           </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex gap-3">
           <button 
              type="button" 
              onClick={() => { onLogout(); onClose(); }}
              className="flex-1 py-3 border-2 border-red-100 text-red-600 rounded-xl font-bold hover:bg-red-50 hover:border-red-200 transition-colors flex items-center justify-center gap-2"
           >
              <LogOut className="w-4 h-4"/> Sign Out
           </button>
           <button 
              type="submit" 
              className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
           >
              <Save className="w-4 h-4"/> Save Changes
           </button>
        </div>
      </form>
    </BaseModal>
  );
};

export default UserProfileModal;
