import React, { useState, useEffect } from 'react';
import { Mail, Search, MessageSquare, Send, Inbox, Star, Trash2, Edit3, Paperclip, CheckCircle, Clock, RefreshCcw, AlertCircle, X, Users, Briefcase } from 'lucide-react';
import { CommunicationConfig, Customer, Supplier } from '../types';
import { toast } from "../utils/toast";

interface Email {
  id: string;
  sender: string;
  subject: string;
  preview: string;
  html?: string;
  time: string;
  isRead: boolean;
  isStarred: boolean;
  attachments?: { filename: string, contentType: string, size: number }[];
}

export default function EmailHub({ 
  communicationConfig, 
  customers = [],
  suppliers = [] 
}: { 
  communicationConfig?: CommunicationConfig,
  customers?: Customer[],
  suppliers?: Supplier[]
}) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [activeTab, setActiveTab] = useState<'INBOX' | 'SENT' | 'STARRED' | 'DRAFTS' | 'TRASH'>('INBOX');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isComposing, setIsComposing] = useState(false);
  const [composeData, setComposeData] = useState({ to: '', subject: '', body: '' });
  const [sending, setSending] = useState(false);

  // Combine emails for datalist
  const contactEmails = [
    ...customers.filter(c => c.email).map(c => ({ name: c.name, email: c.email, type: 'Customer' })),
    ...suppliers.filter(s => s.email).map(s => ({ name: s.name, email: s.email, type: 'Supplier' }))
  ];

  useEffect(() => {
    fetchEmails();
  }, [activeTab]);

  const fetchEmails = async () => {
    if (!communicationConfig?.smtpHost || !communicationConfig?.smtpUser || !communicationConfig?.smtpPass) {
      setError("Please configure SMTP settings in the Settings view first.");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/email/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: communicationConfig, folder: activeTab })
      });
      const data = await res.json();
      if (res.ok) {
        setEmails(data.emails || []);
      } else {
        setError(data.error || "Failed to fetch emails");
      }
    } catch (err: any) {
      setError(err.message || "Network Error");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!composeData.to || !composeData.subject) {
       toast.error("Please fill to and subject.");
       return;
    }
    
    if (!communicationConfig?.smtpHost) {
      setError("SMTP not configured.");
      return;
    }

    setSending(true);
    try {
       const res = await fetch('/api/email/send', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            config: communicationConfig,
            to: composeData.to,
            subject: composeData.subject,
            text: composeData.body,
            html: `<p>${composeData.body.replace(/\n/g, '<br/>')}</p>`
         })
       });
       const data = await res.json();
       if (res.ok) {
          setIsComposing(false);
          setComposeData({ to: '', subject: '', body: '' });
          toast.success("Email sent!");
       } else {
          toast.error("Error sending: " + data.error);
       }
    } catch(err: any) {
       toast.error("Error: " + err.message);
    } finally {
       setSending(false);
    }
  };

  const toggleStar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setEmails(emails.map(email => email.id === id ? { ...email, isStarred: !email.isStarred } : email));
  };

  const markAsRead = (id: string) => {
    setEmails(emails.map(email => email.id === id ? { ...email, isRead: true } : email));
  };

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
    setIsComposing(false);
    if (!email.isRead) markAsRead(email.id);
  };

  const filteredEmails = emails.filter(e => 
    e.subject?.toLowerCase()?.includes(searchQuery.toLowerCase()) || 
    e.sender?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
    e.preview?.toLowerCase()?.includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 animate-fade-in font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Email Hub</h2>
          <p className="text-xs text-slate-500 font-medium">Manage customer and supplier communications</p>
        </div>
        <div className="flex gap-2">
          {loading ? (
             <button disabled className="bg-slate-200 text-slate-500 px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
               <RefreshCcw className="w-4 h-4 animate-spin" /> Syncing...
             </button>
          ) : (
             <button onClick={fetchEmails} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2">
               <RefreshCcw className="w-4 h-4" /> Sync
             </button>
          )}
          <button onClick={() => { setIsComposing(true); setSelectedEmail(null); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-md transition-all active:scale-95 flex items-center gap-2">
             <Edit3 className="w-4 h-4" /> Compose
          </button>
        </div>
      </div>

      {error && (
         <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-xs font-bold">
            <AlertCircle className="w-4 h-4" /> {error}
         </div>
      )}

      <div className="flex-1 flex overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        
        {/* Sidebar */}
        <div className="w-64 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border-none rounded-lg text-sm outline-none shadow-sm dark:text-white" 
                  placeholder="Search emails..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)}
                />
             </div>
          </div>
          <div className="p-3 space-y-1 flex-1 overflow-y-auto">
             <button onClick={() => setActiveTab('INBOX')} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'INBOX' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                <div className="flex items-center gap-3"><Inbox className="w-4 h-4" /> Inbox</div>
             </button>
             <button onClick={() => setActiveTab('STARRED')} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'STARRED' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                <div className="flex items-center gap-3"><Star className="w-4 h-4" /> Starred</div>
             </button>
             <button onClick={() => setActiveTab('SENT')} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'SENT' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                <div className="flex items-center gap-3"><Send className="w-4 h-4" /> Sent</div>
             </button>
          </div>
        </div>

        {/* Email List */}
        <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800 min-w-[300px] max-w-sm xl:max-w-md shrink-0">
           <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-white uppercase text-sm tracking-wider">{activeTab}</h3>
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {filteredEmails.length === 0 ? (
                 <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                    No emails found in {activeTab}
                 </div>
              ) : filteredEmails.map(email => (
                 <div 
                   key={email.id} 
                   onClick={() => handleEmailClick(email)}
                   className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${selectedEmail?.id === email.id ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
                 >
                    <div className="flex justify-between items-start mb-1">
                       <div className="flex items-center gap-2">
                           <button onClick={(e) => toggleStar(e, email.id)} className={`p-1 -ml-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${email.isStarred ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}>
                              <Star className="w-4 h-4 drop-shadow-sm" fill={email.isStarred ? "currentColor" : "none"} />
                           </button>
                           <span className={`text-sm ${email.isRead ? 'font-bold text-slate-700 dark:text-slate-300' : 'font-black text-slate-900 dark:text-white'}`}>{email.sender}</span>
                       </div>
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(email.time).toLocaleDateString()}</span>
                    </div>
                    <div className={`text-xs mb-1 flex items-center gap-1 ${email.isRead ? 'font-medium text-slate-600 dark:text-slate-400' : 'font-bold text-slate-800 dark:text-slate-200'}`}>
                       {email.attachments && email.attachments.length > 0 && <Paperclip className="w-3 h-3 text-slate-400 shrink-0" />}
                       <span className="truncate">{email.subject}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate font-medium">
                       {email.preview}
                    </div>
                 </div>
              ))}
           </div>
        </div>

        {/* Selected Email View or Compose */}
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
           {isComposing ? (
              <div className="absolute inset-0 flex flex-col p-8 animate-fade-in bg-white dark:bg-slate-900 m-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><Edit3 className="w-5 h-5"/> New Message</h2>
                      <button onClick={() => setIsComposing(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><X className="w-5 h-5"/></button>
                  </div>
                  <div className="flex flex-col gap-4 flex-1">
                      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
                         <span className="text-sm font-bold text-slate-400 w-16">To:</span>
                         <input 
                            type="email" 
                            list="contact-emails"
                            value={composeData.to} 
                            onChange={(e) => setComposeData({...composeData, to: e.target.value})} 
                            className="flex-1 text-sm outline-none bg-transparent dark:text-white font-medium" 
                            placeholder="Recipient email address"
                         />
                         <datalist id="contact-emails">
                            {contactEmails.map((c, i) => (
                               <option key={i} value={c.email}>{c.name} ({c.type})</option>
                            ))}
                         </datalist>
                      </div>
                      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
                         <span className="text-sm font-bold text-slate-400 w-16">Subject:</span>
                         <input 
                            type="text" 
                            value={composeData.subject} 
                            onChange={(e) => setComposeData({...composeData, subject: e.target.value})} 
                            className="flex-1 text-sm outline-none bg-transparent font-bold dark:text-white" 
                            placeholder="Message subject"
                         />
                      </div>
                      
                      {/* Simple Formatting Toolbar mockup */}
                      <div className="flex items-center gap-1 py-2 text-slate-400 border-b border-slate-100 dark:border-slate-800/50 mb-2">
                         <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"><b className="font-serif">B</b></button>
                         <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"><i className="font-serif">I</i></button>
                         <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"><u className="font-serif">U</u></button>
                         <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-2"></div>
                         <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"><Paperclip className="w-4 h-4"/></button>
                      </div>

                      <textarea 
                          placeholder="Write your message here..." 
                          value={composeData.body} 
                          onChange={(e) => setComposeData({...composeData, body: e.target.value})} 
                          className="flex-1 resize-none border-none p-2 outline-none text-sm bg-transparent dark:text-white custom-scrollbar leading-relaxed"
                      />
                  </div>
                  <div className="mt-6 flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-4">
                      <button className="text-slate-400 hover:text-slate-600 transition-colors p-2"><Trash2 className="w-5 h-5"/></button>
                      <button onClick={handleSend} disabled={sending} className="bg-indigo-600 text-white px-8 py-2.5 rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                         {sending ? <RefreshCcw className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>} Send Message
                      </button>
                  </div>
              </div>
           ) : selectedEmail ? (
             <div className="absolute inset-0 flex flex-col bg-white dark:bg-slate-900 m-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
               <div className="p-6 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex justify-between items-start mb-6">
                     <h2 className="text-2xl font-black text-slate-800 dark:text-white leading-tight pr-8">{selectedEmail.subject}</h2>
                     <div className="flex gap-2 shrink-0">
                        <button onClick={() => { setIsComposing(true); setComposeData({ to: selectedEmail.sender.match(/<(.+)>/)?.[1] || selectedEmail.sender, subject: `Re: ${selectedEmail.subject}`, body: '' }); }} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors shadow-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" title="Reply"><MessageSquare className="w-4 h-4" /></button>
                        <button className="p-2 text-slate-500 hover:text-amber-500 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors shadow-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" title="Star"><Star className={`w-4 h-4 ${selectedEmail.isStarred ? 'text-amber-500' : ''}`} fill={selectedEmail.isStarred ? "currentColor" : "none"}/></button>
                        <button className="p-2 text-slate-500 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors shadow-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" title="Trash"><Trash2 className="w-4 h-4" /></button>
                     </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-black text-lg uppercase shadow-inner border border-indigo-200 dark:border-indigo-800">
                        {selectedEmail.sender.charAt(0)}
                     </div>
                     <div>
                        <div className="font-bold text-slate-800 dark:text-white text-base">{selectedEmail.sender}</div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{new Date(selectedEmail.time).toLocaleString()}</div>
                     </div>
                  </div>
               </div>
               <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950/50 p-4 relative flex flex-col gap-4">
                  {selectedEmail.html ? (
                     <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden w-full flex-1 min-h-[300px]">
                        <iframe 
                          srcDoc={`
                            <style>
                              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 1rem; color: #1c2126; }
                              img { max-width: 100%; height: auto; }
                            </style>
                            ${selectedEmail.html}
                          `} 
                          className="w-full h-full border-none"
                          sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
                          title="Email Content"
                        />
                     </div>
                  ) : (
                     <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-auto w-full flex-1 min-h-[300px] p-6">
                        <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap font-medium">
                           {selectedEmail.preview || "No content"}
                        </div>
                     </div>
                  )}

                  {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                     <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 shrink-0">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                           <Paperclip className="w-3.5 h-3.5" /> Attachments ({selectedEmail.attachments.length})
                        </h4>
                        <div className="flex flex-wrap gap-3">
                           {selectedEmail.attachments.map((att, i) => (
                              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 max-w-xs hover:bg-slate-100 transition-colors cursor-pointer">
                                 <div className="w-8 h-8 rounded bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase shrink-0">
                                    {att.filename?.split('.').pop()?.substring(0, 3) || 'FILE'}
                                 </div>
                                 <div className="overflow-hidden">
                                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate" title={att.filename}>{att.filename || 'Unnamed File'}</p>
                                    <p className="text-[10px] font-bold text-slate-400">{(att.size / 1024).toFixed(1)} KB</p>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}
               </div>
             </div>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 dark:bg-slate-900/50 m-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
               <Mail className="w-16 h-16 mb-4 text-slate-300 dark:text-slate-700" strokeWidth={1} />
               <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Select an email to read</p>
             </div>
           )}
        </div>

      </div>
    </div>
  );
}
