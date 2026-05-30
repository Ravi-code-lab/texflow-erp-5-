import React, { useState } from 'react';
import { 
  Plus, Wallet, ChevronRight, ChevronDown, BookOpen, FolderOpen
} from 'lucide-react';

interface AccountNode {
  id: string;
  name: string;
  type: string;
  isGroup: boolean;
  children?: AccountNode[];
}

const defaultChart: AccountNode[] = [
  { id: '1', name: 'Application of Funds (Assets)', type: 'Asset', isGroup: true, children: [
      { id: '11', name: 'Current Assets', type: 'Asset', isGroup: true, children: [
          { id: '111', name: 'Accounts Receivable', type: 'Asset', isGroup: false },
          { id: '112', name: 'Bank Accounts', type: 'Bank', isGroup: false },
          { id: '113', name: 'Cash In Hand', type: 'Cash', isGroup: false },
          { id: '114', name: 'Stock In Hand', type: 'Asset', isGroup: false },
      ]},
      { id: '12', name: 'Fixed Assets', type: 'Asset', isGroup: true, children: [
          { id: '121', name: 'Machinery', type: 'Asset', isGroup: false },
          { id: '122', name: 'Furniture', type: 'Asset', isGroup: false },
      ]}
  ]},
  { id: '2', name: 'Sources of Funds (Liabilities)', type: 'Liability', isGroup: true, children: [
      { id: '21', name: 'Current Liabilities', type: 'Liability', isGroup: true, children: [
          { id: '211', name: 'Accounts Payable', type: 'Liability', isGroup: false },
          { id: '212', name: 'Duties and Taxes', type: 'Liability', isGroup: false },
      ]},
      { id: '22', name: 'Loans & Advances', type: 'Liability', isGroup: false }
  ]},
  { id: '3', name: 'Equity', type: 'Equity', isGroup: true, children: [
      { id: '31', name: 'Capital Account', type: 'Equity', isGroup: false },
      { id: '32', name: 'Retained Earnings', type: 'Equity', isGroup: false }
  ]},
  { id: '4', name: 'Income', type: 'Income', isGroup: true, children: [
      { id: '41', name: 'Direct Income', type: 'Income', isGroup: false },
      { id: '42', name: 'Indirect Income', type: 'Income', isGroup: false }
  ]},
  { id: '5', name: 'Expenses', type: 'Expense', isGroup: true, children: [
      { id: '51', name: 'Direct Expenses', type: 'Expense', isGroup: false },
      { id: '52', name: 'Indirect Expenses', type: 'Expense', isGroup: false }
  ]}
];

const TreeNode: React.FC<{ node: AccountNode; level: number }> = ({ node, level }) => {
  const [expanded, setExpanded] = useState(level < 1);
  return (
    <div className="select-none">
      <div 
        className={`flex items-center gap-2 py-1.5 px-2 hover:bg-[#f4f5f6] rounded cursor-pointer ${level === 0 ? 'font-semibold text-[#1c2126]' : 'text-[#525c66]'} `}
        style={{ paddingLeft: `${level * 16}px` }}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="w-4 h-4 flex items-center justify-center">
           {node.children && node.children.length > 0 ? (
             expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
           ) : (
             <div className="w-1.5 h-1.5 rounded-full bg-[#d1d8dd]" />
           )}
        </span>
        <span className="text-[#8d99a6]">
          {node.isGroup ? <FolderOpen className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
        </span>
        <span className="text-[13px]">{node.name}</span>
      </div>
      {expanded && node.children && (
        <div>
          {node.children.map(child => <TreeNode key={child.id} node={child} level={level + 1} />)}
        </div>
      )}
    </div>
  );
};

const ChartOfAccounts: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">
      <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
         <div className="flex justify-between items-center h-8">
            <div className="flex items-center gap-3">
               <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Chart of Accounts</span>
            </div>
            <div className="flex items-center gap-2">
               <button className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                  <Plus className="w-4 h-4" /> Add Account
               </button>
            </div>
         </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
         <div className="bg-white border border-[#d1d8dd] rounded-lg shadow-sm p-6 w-full max-w-2xl bg-white">
            <div className="mb-4 flex items-center gap-2 border-b border-[#d1d8dd] pb-3">
               <Wallet className="w-5 h-5 text-[#525c66]" />
               <h3 className="font-semibold text-sm text-[#1c2126]">Standard Ledger Tree</h3>
            </div>
            <div>
               {defaultChart.map(node => <TreeNode key={node.id} node={node} level={0} />)}
            </div>
         </div>
      </div>
    </div>
  );
};

export default ChartOfAccounts;
