import React, { useState } from 'react';
import { Bot, Send, X, HelpCircle, Sparkles, MessageSquare } from 'lucide-react';

interface TexBotProps {
  contextData: {
    inventory: any[];
    production: any[];
    orders: any[];
  };
}

export default function TexBot({ contextData }: TexBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([
    { sender: 'bot', text: 'Hello! I am TexFlow AI Assistant. Ask me anything about stock shortages, material allocations, or lot routing status!' }
  ]);
  const [inputVal, setInputVal] = useState('');

  const handleSend = () => {
    if (!inputVal.trim()) return;
    const userMsg = inputVal;
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setInputVal('');

    // Responsive mock answers based on keywords
    setTimeout(() => {
      let response = "I've analyzed the active ERP data. Can you specify a product name, Karigar ID, or material code?";
      const lower = userMsg.toLowerCase();

      if (lower.includes('stock') || lower.includes('shortage') || lower.includes('inventory')) {
        const shortages = contextData.inventory.filter(i => i.quantity < i.minStockLevel);
        if (shortages.length > 0) {
          response = `I detected ${shortages.length} item(s) below safety thresholds: ` + 
                     shortages.map(s => `${s.name} (Qty: ${Math.round(s.quantity)})`).join(', ') + 
                     `. I recommend going to the Production Plan to auto-create Material Requests.`;
        } else {
          response = "All raw materials look stable and exceed required min stocking levels.";
        }
      } else if (lower.includes('order') || lower.includes('customer')) {
        const activeOrders = contextData.orders.filter(o => o.status !== 'FULFILLED');
        response = `Active ERP queue has ${activeOrders.length} pending Sales Orders. Customers are waiting on production completion. Ready for dispatching lot runs.`;
      } else if (lower.includes('production') || lower.includes('job') || lower.includes('work order')) {
        const jobsCount = contextData.production.length;
        response = `There are currently ${jobsCount} production runs scheduled on workstation queues. Ready to optimize operations schedule.`;
      }

      setMessages(prev => [...prev, { sender: 'bot', text: response }]);
    }, 500);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Bot Launcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-indigo-600 text-white shadow-xl flex items-center justify-center hover:bg-indigo-700 transition-all cursor-pointer relative"
      >
        <Sparkles className="w-6 h-6 animate-pulse" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border border-white" />
      </button>

      {/* Slide-out Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 h-[420px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="bg-indigo-600 text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-200" />
              <div>
                <h4 className="text-xs font-black">TexFlow AI Co-Pilot</h4>
                <p className="text-[10px] text-indigo-200">Active ERP Grounding System</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Info Bar */}
          <div className="bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 border-b border-indigo-100 dark:border-indigo-900 flex justify-between items-center text-[10px]">
            <span className="text-indigo-700 dark:text-indigo-300 font-bold">Context Scope Connected</span>
            <span className="text-slate-400 tabular-nums">Inv: {contextData.inventory.length} | Orders: {contextData.orders.length}</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/20 text-xs">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                  m.sender === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 rounded-bl-none'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input Footer */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-1.5">
            <input
              type="text"
              placeholder="Ask about stock shortages..."
              className="flex-1 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-slate-50 dark:bg-slate-950 focus:ring-1 focus:ring-indigo-500 outline-none"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend} className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center">
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
