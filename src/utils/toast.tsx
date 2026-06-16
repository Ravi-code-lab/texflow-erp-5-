/**
 * toast.tsx
 * Lightweight in-app toast / confirm system for TexFlow ERP.
 * Replaces all window.alert() and window.confirm() calls throughout the app
 * (which are no-ops / unreliable in Electron renderer).
 *
 * Usage:
 *   import { toast, useConfirm, ConfirmModal, ToastContainer } from '../utils/toast';
 *
 *   // Show a toast anywhere:
 *   toast.success('Stock entry saved!');
 *   toast.error('Route name is required.');
 *   toast.info('At least two journal rows required.');
 *   toast.warn('Penalties exceed gross earnings.');
 *
 *   // Confirm dialog (replaces window.confirm):
 *   const { confirm, ConfirmModal } = useConfirm();
 *   const ok = await confirm({ title: 'Delete item?', message: 'This cannot be undone.' });
 *   if (ok) { ... }
 *   // Render <ConfirmModal /> somewhere in JSX.
 *
 *   // Mount <ToastContainer /> once in App.tsx root.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X, Trash2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warn' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

// ─── Global event bus ─────────────────────────────────────────────────────────

const listeners: Set<(t: ToastItem) => void> = new Set();

function emit(type: ToastType, message: string) {
  const item: ToastItem = { id: `t-${Date.now()}-${Math.random()}`, type, message };
  listeners.forEach(fn => fn(item));
}

/** Call from anywhere — no React context needed. */
export const toast = {
  success: (msg: string) => emit('success', msg),
  error:   (msg: string) => emit('error',   msg),
  warn:    (msg: string) => emit('warn',     msg),
  info:    (msg: string) => emit('info',     msg),
};

// ─── ToastContainer ───────────────────────────────────────────────────────────

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />,
  error:   <XCircle      className="w-4 h-4 text-red-500     shrink-0 mt-0.5" />,
  warn:    <AlertTriangle className="w-4 h-4 text-amber-500  shrink-0 mt-0.5" />,
  info:    <Info          className="w-4 h-4 text-blue-500   shrink-0 mt-0.5" />,
};

const BORDERS: Record<ToastType, string> = {
  success: 'border-emerald-200 dark:border-emerald-700',
  error:   'border-red-200     dark:border-red-700',
  warn:    'border-amber-200   dark:border-amber-700',
  info:    'border-blue-200    dark:border-blue-700',
};

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (t: ToastItem) => {
      setItems(prev => [...prev, t]);
      setTimeout(() => setItems(p => p.filter(x => x.id !== t.id)), 4500);
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {items.map(t => (
        <div
          key={t.id}
          className={`flex items-start gap-3 bg-white dark:bg-slate-900 border ${BORDERS[t.type]} rounded-xl shadow-lg px-4 py-3 pointer-events-auto animate-slideUp`}
        >
          {ICONS[t.type]}
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex-1 whitespace-pre-line leading-snug">{t.message}</p>
          <button
            onClick={() => setItems(p => p.filter(x => x.id !== t.id))}
            className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(12px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .animate-slideUp { animation: slideUp 0.25s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>
    </div>
  );
}

// ─── Imperative confirm (standalone, no hook required) ───────────────────────
// Mirrors the useConfirm API but mounts its own DOM node so it can be called
// from anywhere without a React context.

type ConfirmFn = (options: {
  title: string;
  message?: string;
  confirmLabel?: string;
  confirmClass?: string;
}) => Promise<boolean>;

let _imperativeConfirm: ConfirmFn | null = null;

/** Internal – called by <ConfirmRoot /> once it mounts. */
export function _registerConfirm(fn: ConfirmFn) {
  _imperativeConfirm = fn;
}

/**
 * Standalone confirm dialog. Works from any non-React context (event handlers,
 * async utils, etc.). Requires <ConfirmRoot /> to be rendered once in App.tsx.
 *
 *   import { confirm } from '../utils/toast';
 *   const ok = await confirm({ title: 'Delete?', confirmLabel: 'Delete' });
 */
export const confirm: ConfirmFn = (options) => {
  if (_imperativeConfirm) return _imperativeConfirm(options);
  // Fallback to browser confirm if ConfirmRoot isn't mounted yet
  return Promise.resolve(window.confirm(`${options.title}${options.message ? '\n' + options.message : ''}`));
};

/**
 * Mount this once alongside <ToastContainer /> in App.tsx.
 * It wires up the imperative confirm() function above.
 */
export function ConfirmRoot() {
  const { confirm: hookConfirm, ConfirmModal } = useConfirm();

  useEffect(() => {
    _registerConfirm(hookConfirm);
    return () => { _imperativeConfirm = null; };
  }, [hookConfirm]);

  return <ConfirmModal />;
}

// ─── useConfirm hook ──────────────────────────────────────────────────────────

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  confirmClass?: string;
  icon?: React.ReactNode;
}

type ResolverFn = (result: boolean) => void;

export function useConfirm() {
  const [opts, setOpts]       = useState<ConfirmOptions | null>(null);
  const resolverRef           = useRef<ResolverFn | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    setOpts(options);
    return new Promise<boolean>(resolve => {
      resolverRef.current = resolve;
    });
  }, []);

  const respond = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOpts(null);
  }, []);

  const ConfirmModal = useCallback(() => {
    if (!opts) return null;
    return (
      <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-sm mx-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded-xl shrink-0">
              {opts.icon ?? <AlertTriangle className="w-5 h-5 text-red-500" />}
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">{opts.title}</h3>
              {opts.message && (
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">{opts.message}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-5">
            <button
              onClick={() => respond(false)}
              className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => respond(true)}
              className={opts.confirmClass ?? 'flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors'}
            >
              {opts.confirmLabel ?? 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    );
  }, [opts, respond]);

  return { confirm, ConfirmModal };
}
