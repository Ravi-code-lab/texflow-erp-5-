
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, User, Bot, Loader2, Minimize2, Trash2 } from 'lucide-react';
import { chatWithERP } from '../services/geminiService';

interface TexBotProps {
  contextData: any;
}

const TexBot: React.FC<TexBotProps> = ({ contextData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>(() => {
    const saved = localStorage.getItem('texbot_history');
    return saved ? JSON.parse(saved) : [
      { role: 'model', text: 'Hello! I am TexBot, your AI factory assistant. How can I help you today?' }
    ];
  });
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('texbot_history', JSON.stringify(messages));
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const clearChat = () => {
    if (window.confirm("Clear conversation history?")) {
      const initial = [{ role: 'model' as const, text: 'Hello! I am TexBot, your AI factory assistant. How can I help you today?' }];
      setMessages(initial);
      localStorage.setItem('texbot_history', JSON.stringify(initial));
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMsg = inputValue;
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
    }));

    const response = await chatWithERP(history, userMsg, contextData);
    
    setMessages(prev => [...prev, { role: 'model', text: response || "I'm having trouble connecting right now." }]);
    setIsLoading(false);
  };

  return (
    <>
      {/* Trigger Button */}
      <button 
        onClick={() => { setIsOpen(true); setIsMinimized(false); }}
        className={`fixed bottom-8 right-8 p-4 rounded-full shadow-2xl shadow-indigo-500/40 transition-all duration-500 z-40 flex items-center gap-2 group ${isOpen && !isMinimized ? 'scale-0 opacity-0 pointer-events-none' : 'bg-slate-900 hover:scale-110 hover:bg-black'}`}
      >
        <div className="absolute inset-0 rounded-full border border-white/20"></div>
        <Sparkles className="w-6 h-6 text-indigo-400 group-hover:text-white transition-colors animate-pulse" />
        <span className="absolute right-full mr-4 bg-white text-slate-800 text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 whitespace-nowrap border border-slate-100">Ask TexBot</span>
      </button>

      {/* Chat Window */}
      <div 
        className={`
          fixed bottom-8 right-8 w-[380px] max-w-[calc(100vw-2rem)] 
          bg-white/90 backdrop-blur-2xl border border-white/60 
          rounded-3xl shadow-2xl shadow-slate-900/30 z-50 
          flex flex-col transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) origin-bottom-right overflow-hidden ring-1 ring-black/5
          ${isOpen && !isMinimized ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-12 pointer-events-none'}
        `}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-between relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-[40px]"></div>
           
           <div className="flex items-center gap-3 relative z-10">
              <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 shadow-inner">
                 <Bot className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                 <h3 className="font-bold text-white text-sm">TexBot Intelligence</h3>
                 <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                    <p className="text-[10px] text-slate-400 font-medium">System Online</p>
                 </div>
              </div>
           </div>
           
           <div className="flex items-center gap-1 relative z-10">
              <button onClick={clearChat} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors" title="Clear History">
                 <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={() => setIsMinimized(true)} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                 <Minimize2 className="w-4 h-4" />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                 <X className="w-4 h-4" />
              </button>
           </div>
        </div>

        {/* Messages */}
        <div className="flex-1 h-[400px] overflow-y-auto p-5 space-y-4 bg-slate-50/50 scroll-smooth custom-scrollbar">
           {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div key={idx} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-slide-up`}>
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-white ${isUser ? 'bg-white' : 'bg-slate-900'}`}>
                      {isUser ? <User className="w-4 h-4 text-slate-600" /> : <Sparkles className="w-4 h-4 text-indigo-400" />}
                   </div>
                   <div className={`max-w-[80%] p-3.5 text-sm shadow-sm ${
                      isUser 
                      ? 'bg-slate-800 text-white rounded-2xl rounded-tr-sm' 
                      : 'bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-sm'
                   }`}>
                      {msg.text}
                   </div>
                </div>
              );
           })}
           {isLoading && (
              <div className="flex gap-3 animate-pulse items-center">
                 <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                    <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                 </div>
                 <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Thinking...</div>
              </div>
           )}
           <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100">
           <div className="relative flex items-center shadow-sm rounded-xl">
              <input 
                type="text" 
                placeholder="Ask anything..." 
                className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <button 
                type="submit" 
                disabled={isLoading || !inputValue.trim()}
                className="absolute right-2 p-2 bg-slate-900 text-white rounded-lg hover:bg-black disabled:opacity-50 disabled:bg-slate-400 transition-all shadow-md active:scale-95"
              >
                 <Send className="w-4 h-4" />
              </button>
           </div>
        </form>
      </div>
    </>
  );
};

export default TexBot;
