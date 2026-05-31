
import React, { useState, useEffect } from 'react';
import { Customer, TeamMember, Karigar, Supplier, Agent, ViewState } from '../types';
import { 
  Users, Building, Scissors, Truck, Briefcase, Home, ShieldCheck, UserCog
} from 'lucide-react';
import Karigars from './Karigars';
import Agents from './Agents';
import Customers from './Customers';
import Suppliers from './Suppliers';
import Offices from './Offices';
import Employees from './Employees';

type MasterTab = 'EMPLOYEES' | 'KARIGARS' | 'AGENTS' | 'CUSTOMERS' | 'SUPPLIERS' | 'OFFICES';

interface MastersProps {
  initialTab?: MasterTab;
  customers: Customer[];
  team: TeamMember[];
  agents: Agent[];
  karigars: Karigar[];
  suppliers: Supplier[];
  onAddCustomer: (c: Customer) => void;
  onUpdateCustomer: (c: Customer) => void;
  onAddTeam: (t: TeamMember) => void;
  onUpdateTeam: (t: TeamMember) => void;
  onAddAgent: (a: Agent) => void;
  onUpdateAgent: (a: Agent) => void;
  onDeleteAgent: (id: string) => void;
  onAddKarigar: (k: Karigar) => void;
  onUpdateKarigar: (k: Karigar) => void;
  onAddSupplier: (s: Supplier) => void;
  onUpdateSupplier: (s: Supplier) => void;
  onDeleteCustomer: (id: string) => void;
  onDeleteTeam: (id: string) => void;
  onDeleteKarigar: (id: string) => void;
  onDeleteSupplier: (id: string) => void;
  currency?: string;
}

const Masters: React.FC<MastersProps> = ({ 
  initialTab,
  customers, team, agents, karigars, suppliers,
  onAddCustomer, onUpdateCustomer, onAddAgent, onUpdateAgent, onDeleteAgent,
  onAddKarigar, onUpdateKarigar, onAddSupplier, onUpdateSupplier, 
  onAddTeam, onUpdateTeam,
  onDeleteCustomer, onDeleteKarigar, onDeleteSupplier, onDeleteTeam,
  currency = '₹'
}) => {
  const [activeTab, setActiveTab] = useState<MasterTab>(initialTab || 'EMPLOYEES');

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="h-full flex flex-col space-y-4 animate-fade-in -m-8 p-8 bg-[#f0f2f5] dark:bg-slate-950">
      {/* Master Hub Navigation - High Density Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-6 py-1 shrink-0 shadow-sm rounded-2xl flex items-center justify-between">
         <div className="flex gap-8 overflow-x-auto no-scrollbar">
            {[
               { id: 'EMPLOYEES', icon: UserCog, label: 'Staff Cluster' },
               { id: 'KARIGARS', icon: Scissors, label: 'Karigars' },
               { id: 'AGENTS', icon: Briefcase, label: 'Agents' },
               { id: 'CUSTOMERS', icon: Building, label: 'Customers' },
               { id: 'SUPPLIERS', icon: Truck, label: 'Suppliers' },
               { id: 'OFFICES', icon: Home, label: 'Godowns' }
            ].map(tab => (
               <button 
                  key={tab.id} 
                  onClick={() => setActiveTab(tab.id as MasterTab)} 
                  className={`py-4 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
               >
                 <tab.icon className="w-3.5 h-3.5"/> {tab.label}
               </button>
            ))}
         </div>
      </div>

      {/* Dynamic Tab Content Container */}
      <div className="flex-1 min-h-0">
          {activeTab === 'EMPLOYEES' && (
            <Employees 
                team={team} 
                onAdd={onAddTeam} 
                onUpdate={onUpdateTeam} 
                onDelete={onDeleteTeam} 
                currency={currency} 
            />
          )}
          {activeTab === 'KARIGARS' && (
            <Karigars 
              karigars={karigars} 
              onAdd={onAddKarigar} 
              onUpdate={onUpdateKarigar} 
              onDelete={onDeleteKarigar} 
              currency={currency} 
            />
          )}
          {activeTab === 'AGENTS' && (
            <Agents 
              agents={agents} 
              onAdd={onAddAgent} 
              onUpdate={onUpdateAgent} 
              onDelete={onDeleteAgent} 
            />
          )}
          {activeTab === 'CUSTOMERS' && (
            <Customers 
              customers={customers}
              team={team}
              onAdd={onAddCustomer}
              onUpdate={onUpdateCustomer}
              onDelete={onDeleteCustomer}
              currency={currency} 
            />
          )}
          {activeTab === 'SUPPLIERS' && (
            <Suppliers 
              suppliers={suppliers} 
              onAddSupplier={onAddSupplier} 
              onUpdateSupplier={onUpdateSupplier} 
              onDeleteSupplier={onDeleteSupplier} 
              currency={currency} 
            />
          )}
          {activeTab === 'OFFICES' && (
            <Offices />
          )}
      </div>
    </div>
  );
};

export default Masters;
