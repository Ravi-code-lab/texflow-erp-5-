import React, { useState, useEffect } from 'react';
import {
  Scissors, Lock, User, ArrowRight, ShieldCheck, AlertCircle,
  Eye, EyeOff, Server, Monitor, Wifi, WifiOff, Loader2,
  CheckCircle2, ChevronLeft, Globe, RotateCcw, Trash2
} from 'lucide-react';
import { CompanyInfo, TeamMember, UserRole } from '../types';
import { setServerUrl, clearServerUrl, testLanConnection, isLanClientMode } from '../utils/networkClient';
import { clearAllDataFlag } from '../utils/indexedDB';

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
  companyInfo: CompanyInfo;
  teamCount?: number;
}

const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN:      'from-violet-500 to-indigo-600',
  MANAGER:    'from-blue-500 to-cyan-600',
  ACCOUNTANT: 'from-emerald-500 to-teal-600',
  SALES:      'from-amber-500 to-orange-600',
  WORKER:     'from-slate-500 to-slate-700',
};

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN:      'System Administrator',
  MANAGER:    'Operations Manager',
  ACCOUNTANT: 'Accounts & Finance',
  SALES:      'Sales Executive',
  WORKER:     'Floor Worker',
};

type Step = 'mode-select' | 'client-setup' | 'login';
type Mode = 'server' | 'client';

const LAN_PORT = 3001;
const LS_SERVER_URL_KEY = 'ravi_erp_server_url';

const ModeCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  accent: string;
  onClick: () => void;
}> = ({ icon, title, subtitle, description, accent, onClick }) => (
  <button
    onClick={onClick}
    className="w-full text-left p-5 rounded-2xl border-2 border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all duration-200 group"
  >
    <div className="flex items-start gap-4">
      <div className={`p-3 rounded-xl ${accent} text-white shrink-0 group-hover:scale-110 transition-transform duration-200`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-base leading-tight">{title}</p>
        <p className={`text-xs font-semibold uppercase tracking-widest mt-0.5 mb-2 ${accent.includes('indigo') ? 'text-indigo-300' : 'text-emerald-300'}`}>
          {subtitle}
        </p>
        <p className="text-white/50 text-xs leading-relaxed">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white/70 group-hover:translate-x-1 transition-all mt-1 shrink-0" />
    </div>
  </button>
);

const ClientSetup: React.FC<{ onConnected: () => void; onBack: () => void }> = ({ onConnected, onBack }) => {
  const [serverIp, setServerIp] = useState('');
  const [status, setStatus]     = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_SERVER_URL_KEY) || '';
      const ip = saved.replace('http://', '').replace(`:${LAN_PORT}`, '');
      if (ip) setServerIp(ip);
    } catch {}
  }, []);

  const handleConnect = async () => {
    const ip = serverIp.trim();
    if (!ip) { setErrorMsg('Please enter the server IP address.'); setStatus('fail'); return; }
    setStatus('testing'); setErrorMsg('');
    try {
      const result = await testLanConnection(ip);
      if (result.ok) {
        setServerUrl(ip);
        setStatus('ok');
        setTimeout(onConnected, 800);
      } else {
        setStatus('fail');
        setErrorMsg(result.error || 'Cannot reach server. Make sure the server PC is running and on the same network.');
      }
    } catch {
      setStatus('fail');
      setErrorMsg('Cannot reach server. Make sure the server PC is running and on the same network.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <p className="text-white font-bold text-base">Connect to Server</p>
          <p className="text-indigo-200/60 text-xs">Enter the server PC's local IP address</p>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-400/20 text-xs text-indigo-200/80 leading-relaxed">
        <Globe className="w-3.5 h-3.5 inline mr-1.5 mb-0.5" />
        On the <strong>Server PC</strong>, open Settings → Network — note the IP shown (e.g. <code className="bg-white/10 px-1 rounded">192.168.1.5</code>). Enter it below.
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-indigo-200 uppercase tracking-wider ml-1">Server IP Address</label>
        <div className="relative group">
          <Wifi className="w-5 h-5 text-indigo-300 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-white transition-colors" />
          <input
            type="text"
            value={serverIp}
            onChange={e => { setServerIp(e.target.value); setStatus('idle'); setErrorMsg(''); }}
            onKeyDown={e => e.key === 'Enter' && handleConnect()}
            placeholder="e.g. 192.168.1.5"
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:bg-white/10 focus:border-indigo-400 transition-all shadow-inner font-mono"
          />
        </div>
      </div>

      {status === 'fail' && errorMsg && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {errorMsg}
        </div>
      )}
      {status === 'ok' && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-emerald-200 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> Connected! Loading login…
        </div>
      )}

      <button
        onClick={handleConnect}
        disabled={status === 'testing' || status === 'ok'}
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'testing'
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Testing connection…</>
          : status === 'ok'
            ? <><CheckCircle2 className="w-4 h-4" /> Connected!</>
            : <><Wifi className="w-4 h-4" /> Test & Connect</>
        }
      </button>
    </div>
  );
};

const Login: React.FC<LoginProps> = ({ onLogin, companyInfo, teamCount = 0 }) => {
  const [step, setStep]                 = useState<Step>('mode-select');
  const [mode, setMode]                 = useState<Mode | null>(null);
  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetLoading, setResetLoading]         = useState(false);
  const [resetDone, setResetDone]               = useState(false);

  const handleFactoryReset = async () => {
    setResetLoading(true);
    try {
      await clearAllDataFlag();
      setResetDone(true);
      setTimeout(() => window.location.reload(), 1800);
    } catch (e) {
      setResetLoading(false);
      alert('Reset failed: ' + e);
    }
  };

  useEffect(() => {
    // Mode-select is only needed in Electron (server PC).
    // Any browser access (via IP or localhost) → straight to client login.
    if (isLanClientMode() || !(window as any).process?.type) {
      setMode('client');
      setStep('login');
    }
  }, []);

  const handleSelectServer = () => {
    clearServerUrl();
    setMode('server');
    setStep('login');
  };

  const handleSelectClient = () => {
    setMode('client');
    setStep('client-setup');
  };

  const handleBack = () => {
    if (mode === 'client') clearServerUrl();
    setMode(null);
    setStep('mode-select');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError('Please enter both username and password.'); return; }
    setLoading(true); setError('');
    try {
      const success = await onLogin(username.trim(), password);
      if (!success) setError('Invalid username or password.');
    } catch { setError('Login failed. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-slate-900">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-900" />
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-600/30 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 w-full max-w-md p-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl">

        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-lg mb-3 transform rotate-3 hover:rotate-6 transition-transform duration-500 overflow-hidden">
            {companyInfo.logoUrl
              ? <img src={companyInfo.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
              : <div className="bg-gradient-to-br from-indigo-500 to-purple-600 w-full h-full flex items-center justify-center"><Scissors className="w-8 h-8 text-white" /></div>
            }
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{companyInfo.name}</h1>
          <p className="text-indigo-200 text-xs mt-1 font-medium tracking-widest uppercase">Enterprise Operating System</p>
        </div>

        {step === 'mode-select' && (
          <div className="space-y-4">
            <p className="text-white/60 text-sm text-center mb-5">How is this ERP running?</p>
            <ModeCard
              icon={<Server className="w-5 h-5" />}
              title="This is the Server PC"
              subtitle="Host / Main Machine"
              description="Data is stored on this PC. Other PCs on the local network connect to you. Run on the main office computer."
              accent="bg-gradient-to-br from-indigo-500 to-purple-600"
              onClick={handleSelectServer}
            />
            <ModeCard
              icon={<Monitor className="w-5 h-5" />}
              title="This is a Client PC"
              subtitle="Remote / Other Machine"
              description="You will connect to the server PC over local network. The server PC must be ON and running for this to work."
              accent="bg-gradient-to-br from-emerald-500 to-teal-600"
              onClick={handleSelectClient}
            />
            <p className="text-center text-[10px] text-indigo-300/40 pt-1">
              Both PCs must be on the same Wi-Fi or LAN network
            </p>
          </div>
        )}

        {step === 'client-setup' && (
          <ClientSetup onConnected={() => setStep('login')} onBack={handleBack} />
        )}

        {step === 'login' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between mb-1">
              <button onClick={handleBack} className="flex items-center gap-1 text-xs text-indigo-300/60 hover:text-indigo-200 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" /> Change mode
              </button>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                mode === 'server'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
              }`}>
                {mode === 'server'
                  ? <><Server className="w-3 h-3" /> Server Mode</>
                  : <><Monitor className="w-3 h-3" /> Client Mode</>
                }
              </span>
            </div>

            {mode === 'client' && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-400/20 rounded-xl text-emerald-200/80 text-[11px] flex items-center gap-2">
                <Wifi className="w-3.5 h-3.5 shrink-0" />
                Connected to server — data syncs in real-time from the server PC.
              </div>
            )}

            {teamCount === 0 && mode === 'server' && (
              <div className="p-3 bg-indigo-500/20 border border-indigo-400/40 rounded-xl text-indigo-100 text-xs text-center">
                <ShieldCheck className="w-4 h-4 inline mr-1.5 mb-0.5" />
                First boot — log in with your administrator credentials, then create your team in Settings → Users.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm text-center font-medium flex items-center gap-2 justify-center">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-bold text-indigo-200 uppercase tracking-wider ml-1">Username</label>
                <div className="relative group">
                  <User className="w-5 h-5 text-indigo-300 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-white transition-colors" />
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:bg-white/10 focus:border-indigo-400 transition-all shadow-inner"
                    placeholder="Enter username" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-indigo-200 uppercase tracking-wider ml-1">Password</label>
                <div className="relative group">
                  <Lock className="w-5 h-5 text-indigo-300 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-white transition-colors" />
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:bg-white/10 focus:border-indigo-400 transition-all shadow-inner"
                    placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-300 hover:text-white transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed">
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Verifying...</>
                  : <>Access Dashboard <ArrowRight className="w-4 h-4" /></>
                }
              </button>
            </form>

            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="text-[10px] text-indigo-300/60 uppercase tracking-widest text-center mb-3">Access Levels</p>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([role, label]) => (
                  <div key={role} className="flex items-center gap-2 p-1.5 rounded-lg bg-white/5">
                    <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${ROLE_COLORS[role]} shrink-0`} />
                    <div>
                      <p className="text-[9px] font-bold text-white/80 uppercase tracking-widest leading-none">{role}</p>
                      <p className="text-[9px] text-white/40 leading-none mt-0.5">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-indigo-300/40">Role-Based Access Control · SHA-256 Secured</p>

            {/* Reset option */}
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="inline-flex items-center gap-1.5 text-[11px] text-rose-400/60 hover:text-rose-400 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Forgot password? Reset App
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── Reset Confirmation Modal ───────────────────────────── */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-rose-500/40 rounded-2xl shadow-2xl p-6 space-y-4">
            {resetDone ? (
              <div className="text-center space-y-3 py-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-white font-bold text-base">Reset Complete</p>
                <p className="text-slate-400 text-sm">All data cleared. Reloading now…</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/20">
                    <Trash2 className="w-5 h-5 text-rose-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-base">Factory Reset</p>
                    <p className="text-rose-300/70 text-xs">This cannot be undone</p>
                  </div>
                </div>

                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-200/80 text-xs leading-relaxed space-y-1">
                  <p>⚠️ <strong>All company data will be permanently deleted</strong> — orders, inventory, accounts, team, everything.</p>
                  <p>After reset, you can log in with:</p>
                  <p className="font-mono bg-white/10 px-2 py-1 rounded mt-1">
                    Username: <strong>admin</strong> &nbsp;|&nbsp; Password: <strong>admin123</strong>
                  </p>
                  <p>You will then be asked to set a new admin password.</p>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/30 text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFactoryReset}
                    disabled={resetLoading}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {resetLoading
                      ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Resetting…</>
                      : <><RotateCcw className="w-3.5 h-3.5" /> Yes, Reset All</>
                    }
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
export { ROLE_LABELS, ROLE_COLORS };