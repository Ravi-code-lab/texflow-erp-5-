/**
 * TexFlow — Order Reminder Settings Panel
 *
 * Provides a full UI to:
 *   • Enable/disable the reminder system
 *   • Set reminder threshold (days before due date)
 *   • Customize email subject & body with live preview
 *   • Manually trigger a scan
 *   • View reminder log
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell, Mail, Clock, Settings, Play, Eye, CheckCircle,
  AlertTriangle, XCircle, RefreshCw, Info, Zap, Edit3,
  Shield, ChevronDown, ChevronUp, Send, RotateCcw
} from 'lucide-react';
import {
  ReminderConfig,
  ReminderResult,
  getReminderConfig,
  saveReminderConfig,
  runOrderReminderScan,
} from '../services/orderReminderService';
import { Order, Customer, Notification, CommunicationConfig, CompanyInfo } from '../types';
import { toast } from '../utils/toast';

interface OrderReminderSettingsProps {
  orders: Order[];
  customers: Customer[];
  communicationConfig: CommunicationConfig;
  companyInfo?: CompanyInfo;
  onAddNotification: (n: Partial<Notification>) => void;
}

const DEFAULT_BODY = `Dear {customerName},

This is a friendly reminder from {companyName} regarding your order.

━━━━━━━━━━━━━━━━━━━━━━━━━
  ORDER DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━
  Order ID      : #{orderId}
  Current Stage : {status}
  Due Date      : {dueDate}
  Days Remaining: {daysLeft} day(s)
  Order Value   : {totalAmount}

  Items:
{items}
━━━━━━━━━━━━━━━━━━━━━━━━━

Your order is currently in the "{status}" stage. Our team is working diligently 
to ensure timely delivery. If you have any concerns or need an update on the 
current progress, please do not hesitate to reach out to us.

Please reply to this email or call us at {companyPhone} and we will provide you 
with a full status update immediately.

We appreciate your patience and trust in {companyName}.

Warm regards,
{companyName} Team
{companyEmail}
{companyPhone}`;

const VARIABLES = [
  { key: '{orderId}', desc: 'Order ID / number' },
  { key: '{customerName}', desc: 'Customer name' },
  { key: '{dueDate}', desc: 'Order due date' },
  { key: '{daysLeft}', desc: 'Days remaining until due' },
  { key: '{status}', desc: 'Current order stage' },
  { key: '{totalAmount}', desc: 'Order total value' },
  { key: '{items}', desc: 'List of order items' },
  { key: '{companyName}', desc: 'Your company name' },
  { key: '{companyPhone}', desc: 'Your company phone' },
  { key: '{companyEmail}', desc: 'Your company email' },
];

const STATUS_OPTIONS = [
  'FULFILLED', 'DELIVERED', 'CANCELLED', 'PENDING', 'DRAFT', 'CONFIRMED', 'SUBMITTED', 'SHIPPED'
];

export default function OrderReminderSettings({
  orders,
  customers,
  communicationConfig,
  companyInfo,
  onAddNotification,
}: OrderReminderSettingsProps) {
  const [config, setConfig] = useState<ReminderConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ReminderResult[] | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showVars, setShowVars] = useState(false);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'email' | 'test'>('general');

  useEffect(() => {
    getReminderConfig().then(setConfig);
  }, []);

  useEffect(() => {
    // Pick first order with dueDate for preview
    const sample = orders.find(o => o.dueDate) || orders[0] || null;
    setPreviewOrder(sample);
  }, [orders]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    await saveReminderConfig(config);
    setSaving(false);
    toast.success('Reminder settings saved!');
  };

  const handleReset = () => {
    getReminderConfig().then(setConfig);
    toast.info('Settings reloaded from storage');
  };

  const handleManualScan = useCallback(async () => {
    if (!config) return;
    setScanning(true);
    setScanResults(null);
    try {
      const results = await runOrderReminderScan(
        orders,
        customers,
        communicationConfig,
        companyInfo,
        onAddNotification
      );
      setScanResults(results);
      if (results.length === 0) {
        toast.info('No orders in reminder window right now.');
      } else {
        toast.success(`Scan complete — ${results.length} order(s) processed.`);
      }
    } catch (err: any) {
      toast.error('Scan failed: ' + (err.message || 'Unknown error'));
    } finally {
      setScanning(false);
    }
  }, [config, orders, customers, communicationConfig, companyInfo, onAddNotification]);

  const toggleExcludedStatus = (status: string) => {
    if (!config) return;
    const current = config.excludeStatuses;
    const updated = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    setConfig({ ...config, excludeStatuses: updated });
  };

  const smtpConfigured = !!(
    communicationConfig?.smtpHost &&
    communicationConfig?.smtpUser &&
    communicationConfig?.smtpPass
  );

  // Compute how many orders are in the current reminder window
  const ordersInWindow = orders.filter(o => {
    if (!config) return false;
    if (config.excludeStatuses.includes(o.status)) return false;
    if (!o.dueDate) return false;
    const today = new Date(); today.setHours(0,0,0,0);
    const due = new Date(o.dueDate); due.setHours(0,0,0,0);
    const daysLeft = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft <= (config.reminderDays || 17);
  });

  if (!config) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mr-3" />
        <span className="text-slate-500 text-sm">Loading reminder settings…</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-500 rounded-2xl text-white shadow-lg shadow-amber-500/20">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Order Delay Reminder</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Auto-Email & In-App Alert System</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Master toggle */}
          <button
            onClick={() => setConfig({ ...config, enabled: !config.enabled })}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
              config.enabled
                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 border-green-200 dark:border-green-900/30'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className={`w-3 h-3 rounded-full ${config.enabled ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
            {config.enabled ? 'Active' : 'Disabled'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-60"
          >
            {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
            Save Settings
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Active Orders</p>
          <p className="text-2xl font-black text-slate-800 dark:text-white">{orders.filter(o => !['FULFILLED','DELIVERED','CANCELLED'].includes(o.status)).length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">In Reminder Window</p>
          <p className={`text-2xl font-black ${ordersInWindow.length > 0 ? 'text-amber-500' : 'text-slate-800 dark:text-white'}`}>{ordersInWindow.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Alert Threshold</p>
          <p className="text-2xl font-black text-indigo-600">{config.reminderDays}d</p>
        </div>
        <div className={`p-4 rounded-2xl border shadow-sm ${smtpConfigured ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30'}`}>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">SMTP Status</p>
          <p className={`text-sm font-black uppercase ${smtpConfigured ? 'text-green-600' : 'text-red-500'}`}>
            {smtpConfigured ? '✓ Configured' : '✗ Not Set'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
        {(['general', 'email', 'test'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab
                ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab === 'general' && '⚙ General'}
            {tab === 'email' && '✉ Email Template'}
            {tab === 'test' && '▶ Test & Logs'}
          </button>
        ))}
      </div>

      {/* ── GENERAL TAB ── */}
      {activeTab === 'general' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reminder Rules</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Reminder days */}
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                Remind How Many Days Before Due Date?
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={config.reminderDays}
                  onChange={e => setConfig({ ...config, reminderDays: parseInt(e.target.value) || 17 })}
                  className="w-24 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <span className="text-xs text-slate-500 font-medium">days before due date</span>
              </div>
              <p className="text-[9px] text-slate-400 mt-1">Alert will fire when order due date is within this many days.</p>
            </div>

            {/* Check interval */}
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                Re-Check Interval (Hours)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={config.checkIntervalHours}
                  onChange={e => setConfig({ ...config, checkIntervalHours: parseInt(e.target.value) || 24 })}
                  className="w-24 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <span className="text-xs text-slate-500 font-medium">hours between auto-scans</span>
              </div>
              <p className="text-[9px] text-slate-400 mt-1">Set to 24 for daily. Restarts on app relaunch.</p>
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-indigo-300 transition-colors">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-indigo-500" />
                <div>
                  <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">Send Email to Customer</p>
                  <p className="text-[9px] text-slate-400">Requires SMTP configured in Settings</p>
                </div>
              </div>
              <div
                onClick={() => setConfig({ ...config, sendEmail: !config.sendEmail })}
                className={`w-10 h-6 rounded-full transition-colors cursor-pointer relative ${config.sendEmail ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${config.sendEmail ? 'left-5' : 'left-1'}`} />
              </div>
            </label>

            <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-indigo-300 transition-colors">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-amber-500" />
                <div>
                  <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">In-App Notification</p>
                  <p className="text-[9px] text-slate-400">Shows in Notification Center</p>
                </div>
              </div>
              <div
                onClick={() => setConfig({ ...config, sendInAppNotification: !config.sendInAppNotification })}
                className={`w-10 h-6 rounded-full transition-colors cursor-pointer relative ${config.sendInAppNotification ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${config.sendInAppNotification ? 'left-5' : 'left-1'}`} />
              </div>
            </label>
          </div>

          {/* Exclude statuses */}
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">
              Skip Reminders for These Order Statuses
            </label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(status => (
                <button
                  key={status}
                  onClick={() => toggleExcludedStatus(status)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                    config.excludeStatuses.includes(status)
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border-red-200 dark:border-red-900/30'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                  }`}
                >
                  {config.excludeStatuses.includes(status) ? '✗ ' : '+ '}{status}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-slate-400 mt-2">Red = excluded from reminders. Click to toggle.</p>
          </div>

          {/* Info box */}
          <div className="flex gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
            <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
              Each order receives at most <strong>one reminder per day</strong> regardless of check interval. 
              The system automatically skips orders already notified today. Overdue orders (past due date) 
              are always included until their status is updated to a skipped status.
            </p>
          </div>
        </div>
      )}

      {/* ── EMAIL TEMPLATE TAB ── */}
      {activeTab === 'email' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Template</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowVars(!showVars)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-500 rounded-lg border border-slate-200 dark:border-slate-700 text-[9px] font-black uppercase tracking-widest hover:border-indigo-300 transition-all"
              >
                {showVars ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Variables
              </button>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg border border-indigo-200 dark:border-indigo-900/30 text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
              >
                <Eye className="w-3 h-3" />
                {showPreview ? 'Hide Preview' : 'Live Preview'}
              </button>
            </div>
          </div>

          {/* Variables help */}
          {showVars && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Available Variables (click to copy)</p>
              <div className="flex flex-wrap gap-2">
                {VARIABLES.map(v => (
                  <button
                    key={v.key}
                    title={v.desc}
                    onClick={() => navigator.clipboard.writeText(v.key).then(() => toast.success(`Copied ${v.key}`))}
                    className="px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-[9px] font-mono text-indigo-600 hover:border-indigo-400 transition-all"
                  >
                    {v.key}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1">
                {VARIABLES.map(v => (
                  <div key={v.key} className="flex gap-1.5 text-[9px]">
                    <span className="font-mono text-indigo-600">{v.key}</span>
                    <span className="text-slate-400">— {v.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Email Subject</label>
            <input
              type="text"
              value={config.customEmailSubject}
              onChange={e => setConfig({ ...config, customEmailSubject: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
              placeholder="e.g. Reminder: Your order #{orderId} is due soon"
            />
          </div>

          {/* Body */}
          <div>
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Email Body</label>
            <textarea
              value={config.customEmailBody}
              onChange={e => setConfig({ ...config, customEmailBody: e.target.value })}
              rows={18}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white text-xs font-mono leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
            <button
              onClick={() => setConfig({ ...config, customEmailBody: DEFAULT_BODY })}
              className="mt-2 flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-500 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset to default template
            </button>
          </div>

          {/* Live preview */}
          {showPreview && (
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">
                📧 Email Preview {previewOrder ? `— using Order #${previewOrder.id}` : '(no sample order)'}
              </p>
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                <div className="mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SUBJECT</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white mt-1">
                    {config.customEmailSubject
                      .replace('{orderId}', previewOrder?.id || 'ORD-001')
                      .replace('{customerName}', previewOrder?.customerName || 'Sample Customer')
                    }
                  </p>
                </div>
                <pre className="text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                  {renderPreviewEmail()}
                </pre>
              </div>
            </div>
          )}

          {!smtpConfigured && (
            <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-900/30">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-700 dark:text-amber-300">
                SMTP is not configured. Emails won't be sent until you set up SMTP credentials in <strong>Settings → Communication</strong>. 
                In-app notifications will still work without SMTP.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── TEST & LOGS TAB ── */}
      {activeTab === 'test' && (
        <div className="space-y-6">
          {/* Manual scan */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Manual Scan</h3>
            <p className="text-xs text-slate-500 mb-4">
              Run a scan right now — same as what runs automatically. 
              Orders already reminded today will be skipped (shown as "already sent").
            </p>
            <button
              onClick={handleManualScan}
              disabled={scanning}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-60 shadow-lg shadow-indigo-500/20"
            >
              {scanning
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Scanning Orders…</>
                : <><Zap className="w-4 h-4" /> Run Reminder Scan Now</>
              }
            </button>
          </div>

          {/* Scan results */}
          {scanResults !== null && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scan Results</h3>
                <span className="text-[9px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                  {scanResults.length} order(s) found
                </span>
              </div>

              {scanResults.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-400" />
                  <p className="text-sm font-bold">No orders in the reminder window right now.</p>
                  <p className="text-[10px] mt-1">All orders are either on-track or in excluded statuses.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {scanResults.map((r, i) => (
                    <div
                      key={`${r.orderId}-${i}`}
                      className={`flex items-center gap-4 p-4 rounded-xl border ${
                        r.skippedReason
                          ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60'
                          : r.daysLeft <= 0
                            ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30'
                            : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30'
                      }`}
                    >
                      <div className="shrink-0">
                        {r.skippedReason ? (
                          <Info className="w-5 h-5 text-slate-400" />
                        ) : r.daysLeft <= 0 ? (
                          <XCircle className="w-5 h-5 text-red-500" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-slate-800 dark:text-white">
                          #{r.orderId} — {r.customerName}
                        </p>
                        <p className="text-[9px] text-slate-500 mt-0.5">
                          {r.skippedReason || (
                            r.daysLeft <= 0
                              ? `${Math.abs(r.daysLeft)} days OVERDUE`
                              : `${r.daysLeft} days remaining`
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!r.skippedReason && (
                          <>
                            <span className={`text-[9px] font-black px-2 py-1 rounded-md ${r.emailSent ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                              {r.emailSent ? '✓ Email Sent' : '— No Email'}
                            </span>
                            <span className={`text-[9px] font-black px-2 py-1 rounded-md ${r.notificationAdded ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                              {r.notificationAdded ? '✓ Notified' : '— No Alert'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Orders preview table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
              Orders Currently In Reminder Window ({ordersInWindow.length})
            </h3>
            {ordersInWindow.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No orders in the {config.reminderDays}-day window.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className="text-left py-2 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Order</th>
                      <th className="text-left py-2 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                      <th className="text-left py-2 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Stage</th>
                      <th className="text-left py-2 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Due Date</th>
                      <th className="text-right py-2 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Days Left</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersInWindow.map(o => {
                      const today = new Date(); today.setHours(0,0,0,0);
                      const due = new Date(o.dueDate!); due.setHours(0,0,0,0);
                      const daysLeft = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <tr key={o.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">{o.id}</td>
                          <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{o.customerName}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-md text-[9px] font-bold uppercase">
                              {o.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{o.dueDate}</td>
                          <td className={`py-2.5 px-3 text-right font-black ${daysLeft <= 0 ? 'text-red-500' : daysLeft <= 7 ? 'text-amber-500' : 'text-slate-700 dark:text-slate-300'}`}>
                            {daysLeft <= 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom action bar */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
        >
          <RotateCcw className="w-3 h-3" /> Reload from Storage
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-60 shadow-lg shadow-indigo-500/20"
        >
          {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
          Save All Settings
        </button>
      </div>
    </div>
  );

  function renderPreviewEmail() {
    if (!config || !previewOrder) return 'No order available for preview.';
    const vars: Record<string, string> = {
      orderId: previewOrder.id,
      customerName: previewOrder.customerName,
      dueDate: previewOrder.dueDate || '2024-12-31',
      daysLeft: '12',
      status: previewOrder.status,
      totalAmount: `₹${(previewOrder.totalAmount || 0).toLocaleString('en-IN')}`,
      items: (previewOrder.items || []).map(it => `    • ${it.productName} — Qty: ${it.quantity} @ ${it.unitPrice}`).join('\n') || '    (no items)',
      companyName: companyInfo?.name || 'TexFlow ERP',
      companyPhone: companyInfo?.phone || '+91-XXXXXXXXXX',
      companyEmail: companyInfo?.email || 'info@company.com',
    };
    let rendered = config.customEmailBody;
    Object.entries(vars).forEach(([k, v]) => {
      rendered = rendered.replaceAll(`{${k}}`, v);
    });
    return rendered;
  }
}
