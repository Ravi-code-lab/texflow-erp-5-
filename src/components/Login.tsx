import React, { useState, useEffect, useRef } from "react";
import {
  Scissors, Lock, User, ArrowRight, ShieldCheck, AlertCircle,
  Eye, EyeOff, Server, Monitor, Wifi, Loader2, CheckCircle2,
  ChevronLeft, Globe, Activity, RefreshCw,
} from "lucide-react";
import { CompanyInfo, UserRole } from "../types";
import {
  setServerUrl, clearServerUrl, testLanConnection, isLanClientMode,
} from "../utils/networkClient";

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
  companyInfo: CompanyInfo;
  teamCount?: number;
}

export const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN:      "from-violet-500 to-indigo-600",
  MANAGER:    "from-blue-500 to-cyan-600",
  ACCOUNTANT: "from-emerald-500 to-teal-600",
  SALES:      "from-amber-500 to-orange-600",
  WORKER:     "from-slate-500 to-slate-700",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN:      "System Administrator",
  MANAGER:    "Operations Manager",
  ACCOUNTANT: "Accounts & Finance",
  SALES:      "Sales Executive",
  WORKER:     "Floor Worker",
};

type Step = "mode-select" | "client-setup" | "login";
type Mode = "server" | "client";

const LAN_PORT = 3001;
const LS_SERVER_URL_KEY = "ravi_erp_server_url";
const LS_LOCK_KEY = "ravi_erp_login_lock"; // BUG 9 FIX: persist lockout across refreshes

// ── Animated background blobs ────────────────────────────────────────────────
const BgBlobs: React.FC = () => (
  <>
    <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950" />
    <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[140px] animate-pulse" />
    <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[140px] animate-pulse [animation-delay:2s]" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[100px]" />
    {/* Subtle grid */}
    <div className="absolute inset-0 opacity-[0.03]"
      style={{ backgroundImage: "linear-gradient(white 1px,transparent 1px),linear-gradient(90deg,white 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
  </>
);

// ── Mode selection card ───────────────────────────────────────────────────────
const ModeCard: React.FC<{
  icon: React.ReactNode; title: string; subtitle: string;
  description: string; accent: string; badge?: string; onClick: () => void;
}> = ({ icon, title, subtitle, description, accent, badge, onClick }) => (
  <button
    onClick={onClick}
    className="w-full text-left p-5 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/25 transition-all duration-200 group relative overflow-hidden"
  >
    {badge && (
      <span className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/10 text-white/50">
        {badge}
      </span>
    )}
    <div className="flex items-start gap-4">
      <div className={`p-3 rounded-xl bg-gradient-to-br ${accent} text-white shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-200`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0 pr-6">
        <p className="text-white font-bold text-sm leading-tight">{title}</p>
        <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 mb-2 opacity-70 ${accent.includes("indigo") ? "text-indigo-300" : "text-emerald-300"}`}>
          {subtitle}
        </p>
        <p className="text-white/45 text-xs leading-relaxed">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/60 group-hover:translate-x-1 transition-all mt-1 shrink-0" />
    </div>
  </button>
);

// ── Server ping indicator ─────────────────────────────────────────────────────
const PingDot: React.FC<{ status: "idle" | "testing" | "ok" | "fail" }> = ({ status }) => {
  if (status === "idle") return null;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${
      status === "testing" ? "text-yellow-400" : status === "ok" ? "text-emerald-400" : "text-red-400"
    }`}>
      <span className={`w-2 h-2 rounded-full ${
        status === "testing" ? "bg-yellow-400 animate-ping" : status === "ok" ? "bg-emerald-400" : "bg-red-400"
      }`} />
      {status === "testing" ? "Testing…" : status === "ok" ? "Connected" : "Failed"}
    </span>
  );
};

// ── Client setup step ─────────────────────────────────────────────────────────
const ClientSetup: React.FC<{ onConnected: () => void; onBack: () => void }> = ({ onConnected, onBack }) => {
  const [serverIp, setServerIp] = useState("");
  const [status, setStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_SERVER_URL_KEY) || "";
      const ip = saved.replace("http://", "").replace(`:${LAN_PORT}`, "");
      if (ip) setServerIp(ip);
    } catch {}
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleConnect = async () => {
    const ip = serverIp.trim();
    if (!ip) { setErrorMsg("Enter the server PC's IP address."); setStatus("fail"); return; }
    setStatus("testing"); setErrorMsg("");
    try {
      const result = await testLanConnection(ip);
      if (result.ok) {
        setServerUrl(ip); setStatus("ok");
        setTimeout(onConnected, 700);
      } else {
        setStatus("fail");
        setErrorMsg(result.error || "Cannot reach server. Check IP and make sure server PC is running.");
      }
    } catch {
      setStatus("fail");
      setErrorMsg("Cannot reach server. Check IP and make sure server PC is running.");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <p className="text-white font-bold text-sm">Connect to Server</p>
          <p className="text-white/40 text-xs">Enter the server PC's LAN IP address</p>
        </div>
        <div className="ml-auto"><PingDot status={status} /></div>
      </div>

      {/* Help hint */}
      <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-400/20 text-xs text-indigo-200/70 leading-relaxed">
        <Globe className="w-3.5 h-3.5 inline mr-1.5 mb-0.5 opacity-80" />
        On the <strong className="text-indigo-200">Server PC</strong>, go to Settings → Network to see the IP
        (e.g. <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono">192.168.1.5</code>). Enter it below.
      </div>

      {/* IP input */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-white/50 uppercase tracking-widest ml-1">Server IP Address</label>
        <div className="relative group">
          <Wifi className="w-4 h-4 text-indigo-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-white transition-colors" />
          <input
            ref={inputRef}
            type="text"
            value={serverIp}
            onChange={(e) => { setServerIp(e.target.value); setStatus("idle"); setErrorMsg(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleConnect()}
            placeholder="e.g. 192.168.1.5"
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:bg-white/8 focus:border-indigo-500/60 transition-all font-mono text-sm"
          />
        </div>
      </div>

      {/* Error */}
      {status === "fail" && errorMsg && (
        <div className="p-3 bg-red-500/15 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}
      {status === "ok" && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> Server found — opening login…
        </div>
      )}

      {/* Connect button */}
      <button
        onClick={handleConnect}
        disabled={status === "testing" || status === "ok"}
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold py-3.5 rounded-xl hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
      >
        {status === "testing" ? <><Loader2 className="w-4 h-4 animate-spin" /> Testing connection…</>
         : status === "ok"    ? <><CheckCircle2 className="w-4 h-4" /> Connected!</>
         : <><Activity className="w-4 h-4" /> Test &amp; Connect</>}
      </button>

      <p className="text-center text-[10px] text-white/25">
        Both PCs must be on the same Wi-Fi / LAN network
      </p>
    </div>
  );
};

// ── Role badge grid ───────────────────────────────────────────────────────────
const RoleBadges: React.FC = () => (
  <div className="mt-5 pt-4 border-t border-white/8">
    <p className="text-[9px] text-white/30 uppercase tracking-widest text-center mb-2.5">Access Levels</p>
    <div className="grid grid-cols-3 gap-1.5">
      {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([role, label]) => (
        <div key={role} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
          <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${ROLE_COLORS[role]} shrink-0`} />
          <div className="min-w-0">
            <p className="text-[8px] font-black text-white/70 uppercase tracking-widest leading-none truncate">{role}</p>
            <p className="text-[8px] text-white/30 leading-none mt-0.5 truncate">{label}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ── Main Login component ──────────────────────────────────────────────────────
const Login: React.FC<LoginProps> = ({ onLogin, companyInfo, teamCount = 0 }) => {
  const [step, setStep]               = useState<Step>("mode-select");
  const [mode, setMode]               = useState<Mode | null>(null);
  const [username, setUsername]       = useState("");
  const [password, setPassword]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [attempts, setAttempts]       = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(() => {
    // BUG 9 FIX: restore lockout from localStorage so page refresh can't bypass it
    try {
      const stored = localStorage.getItem(LS_LOCK_KEY);
      if (stored) {
        const until = parseInt(stored, 10);
        if (until > Date.now()) return until;
        localStorage.removeItem(LS_LOCK_KEY);
      }
    } catch { /* private browsing */ }
    return null;
  });
  const [lockSecsLeft, setLockSecsLeft] = useState(0);
  const usernameRef = useRef<HTMLInputElement>(null);

  // Auto-detect LAN client on mount
  useEffect(() => {
    if (isLanClientMode()) { setMode("client"); setStep("login"); }
  }, []);

  // Focus username when arriving at login step
  useEffect(() => {
    if (step === "login") setTimeout(() => usernameRef.current?.focus(), 100);
  }, [step]);

  // Lockout countdown
  useEffect(() => {
    if (!lockedUntil) return;
    const tick = setInterval(() => {
      const left = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (left <= 0) {
        setLockedUntil(null);
        setLockSecsLeft(0);
        clearInterval(tick);
        // BUG 9 FIX: remove from localStorage when lock expires
        try { localStorage.removeItem(LS_LOCK_KEY); } catch { /* ignore */ }
      } else setLockSecsLeft(left);
    }, 500);
    return () => clearInterval(tick);
  }, [lockedUntil]);

  const isLocked = lockedUntil ? Date.now() < lockedUntil : false;

  const handleSelectServer = () => { clearServerUrl(); setMode("server"); setStep("login"); };
  const handleSelectClient = () => { setMode("client"); setStep("client-setup"); };
  const handleBack = () => {
    // LAN auto-clients can't go back (they're served from the server IP)
    if (isLanClientMode()) return;
    if (mode === "client") clearServerUrl();
    setMode(null); setStep("mode-select");
    setError(""); setUsername(""); setPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    if (!username.trim() || !password.trim()) { setError("Enter both username and password."); return; }
    setLoading(true); setError("");
    try {
      const success = await onLogin(username.trim(), password);
      if (!success) {
        const next = attempts + 1;
        setAttempts(next);
        if (next >= 5) {
          const until = Date.now() + 30_000; // 30s lockout after 5 failures
          setLockedUntil(until);
          setLockSecsLeft(30);
          setError("Too many failed attempts. Wait 30 seconds.");
          // BUG 9 FIX: persist lockout so page refresh can't bypass it
          try { localStorage.setItem(LS_LOCK_KEY, String(until)); } catch { /* ignore */ }
        } else {
          setError(`Invalid username or password. ${5 - next} attempt${5 - next === 1 ? "" : "s"} remaining.`);
        }
      } else {
        setAttempts(0);
      }
    } catch (err: any) {
      setError(err?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isClientMode = mode === "client" || isLanClientMode();

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      <BgBlobs />

      <div className="relative z-10 w-full max-w-[420px] mx-4">
        {/* Card */}
        <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl overflow-hidden">
          {/* Top accent line */}
          <div className={`h-0.5 w-full bg-gradient-to-r ${isClientMode ? "from-emerald-500 via-teal-400 to-emerald-600" : "from-indigo-500 via-purple-400 to-violet-500"}`} />

          <div className="p-8">
            {/* Logo + company */}
            <div className="text-center mb-7">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-xl mb-3 overflow-hidden transform hover:rotate-6 transition-transform duration-500">
                {companyInfo.logoUrl
                  ? <img src={companyInfo.logoUrl} alt="Logo" className="w-full h-full object-contain p-1.5" />
                  : <div className="bg-gradient-to-br from-indigo-500 to-purple-600 w-full h-full flex items-center justify-center">
                      <Scissors className="w-7 h-7 text-white" />
                    </div>
                }
              </div>
              <h1 className="text-xl font-black text-white tracking-tight leading-tight">{companyInfo.name || "TexFlow ERP"}</h1>
              <p className="text-white/35 text-[10px] mt-1 font-bold tracking-widest uppercase">
                {companyInfo.gstin ? `GSTIN ${companyInfo.gstin} · ` : ""}Packing Stock System
              </p>
            </div>

            {/* ── Mode Select ── */}
            {step === "mode-select" && (
              <div className="space-y-3">
                <p className="text-white/45 text-xs text-center mb-4 font-medium">How is this ERP running on this device?</p>
                <ModeCard
                  icon={<Server className="w-5 h-5" />}
                  title="This is the Server PC"
                  subtitle="Host · Main Machine"
                  description="All data is stored here. Other PCs on the network connect to this PC."
                  accent="from-indigo-500 to-violet-600"
                  badge="Main"
                  onClick={handleSelectServer}
                />
                <ModeCard
                  icon={<Monitor className="w-5 h-5" />}
                  title="This is a Client PC"
                  subtitle="Remote · Other Machine"
                  description="Connect to the server PC over LAN. Server must be ON and running."
                  accent="from-emerald-500 to-teal-500"
                  badge="LAN"
                  onClick={handleSelectClient}
                />
                <p className="text-center text-[9px] text-white/20 pt-1">
                  Both devices must be on the same Wi-Fi or LAN network
                </p>
              </div>
            )}

            {/* ── Client Setup ── */}
            {step === "client-setup" && (
              <ClientSetup onConnected={() => setStep("login")} onBack={handleBack} />
            )}

            {/* ── Login Form ── */}
            {step === "login" && (
              <div className="space-y-4">
                {/* Mode bar */}
                <div className="flex items-center justify-between">
                  {!isLanClientMode() ? (
                    <button onClick={handleBack} className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/70 transition-colors">
                      <ChevronLeft className="w-3 h-3" /> Change mode
                    </button>
                  ) : <span />}
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                    isClientMode
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                      : "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                  }`}>
                    {isClientMode ? <><Monitor className="w-2.5 h-2.5" /> Client Mode</> : <><Server className="w-2.5 h-2.5" /> Server / Standalone</>}
                  </span>
                </div>

                {/* Client connected banner */}
                {isClientMode && (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-200/80 text-[11px] flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    Connected to server — credentials verified server-side
                  </div>
                )}

                {/* First boot hint */}
                {teamCount === 0 && !isClientMode && (
                  <div className="p-3 bg-indigo-500/15 border border-indigo-400/30 rounded-xl text-indigo-100 text-xs text-center leading-relaxed">
                    <ShieldCheck className="w-3.5 h-3.5 inline mr-1.5 mb-0.5 text-indigo-300" />
                    First boot — login with <strong>admin</strong> / <strong>admin123</strong>
                    <br /><span className="text-indigo-300/70 text-[10px]">Then go to Settings → Users to create your team</span>
                  </div>
                )}

                {/* Lockout banner */}
                {isLocked && (
                  <div className="p-3 bg-orange-500/15 border border-orange-500/30 rounded-xl text-orange-200 text-xs flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 shrink-0 text-orange-400" />
                    Too many attempts — retry in <strong className="text-orange-300">{lockSecsLeft}s</strong>
                  </div>
                )}

                {/* Error */}
                {error && !isLocked && (
                  <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" /> {error}
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Username */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-white/40 uppercase tracking-widest ml-1">Username</label>
                    <div className="relative group">
                      <User className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-300 transition-colors" />
                      <input
                        ref={usernameRef}
                        type="text"
                        value={username}
                        onChange={(e) => { setUsername(e.target.value); setError(""); }}
                        autoComplete="username"
                        disabled={isLocked || loading}
                        placeholder="Enter username"
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:bg-white/8 focus:border-indigo-500/50 transition-all disabled:opacity-40"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-white/40 uppercase tracking-widest ml-1">Password</label>
                    <div className="relative group">
                      <Lock className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-300 transition-colors" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(""); }}
                        autoComplete="current-password"
                        disabled={isLocked || loading}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-11 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:bg-white/8 focus:border-indigo-500/50 transition-all disabled:opacity-40"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Attempt dots */}
                  {attempts > 0 && !isLocked && (
                    <div className="flex items-center justify-end gap-1 pr-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i < attempts ? "bg-red-400" : "bg-white/15"}`} />
                      ))}
                      <span className="text-[9px] text-red-400/80 ml-1">{attempts}/5 attempts</span>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading || isLocked}
                    className={`w-full text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm mt-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 hover:scale-[1.02] active:scale-95 hover:shadow-xl ${
                      isClientMode
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-emerald-500/30"
                        : "bg-gradient-to-r from-indigo-500 to-violet-600 hover:shadow-indigo-500/30"
                    }`}
                  >
                    {loading
                      ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying…</>
                      : isLocked
                      ? <><RefreshCw className="w-4 h-4" /> Locked — {lockSecsLeft}s</>
                      : <>Access Dashboard <ArrowRight className="w-4 h-4" /></>
                    }
                  </button>
                </form>

                <RoleBadges />

                <p className="text-center text-[9px] text-white/20 pt-1">
                  SHA-256 · JWT Secured · Role-Based Access Control
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[9px] text-white/15 mt-4 tracking-widest uppercase">
          TexFlow ERP · Packing Stock Module
        </p>
      </div>
    </div>
  );
};

export default Login;
