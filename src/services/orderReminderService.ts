/**
 * TexFlow — Order Delay Reminder Service
 *
 * Scans all active orders at startup and then every `checkIntervalHours` hours.
 * For any order whose dueDate is within `reminderDays` days (default 17) and not
 * yet fulfilled/cancelled, it:
 *   1. Sends an automatic email to the customer (if email + SMTP configured)
 *   2. Fires an in-app WARNING notification
 *   3. Records the reminder in IndexedDB so it does NOT re-send on the same day
 */

import { Order, Customer, Notification, CommunicationConfig, CompanyInfo } from '../types';
import { getItem, setItem } from '../utils/indexedDB';

export interface ReminderConfig {
  enabled: boolean;
  reminderDays: number;           // how many days before due date to start alerting
  checkIntervalHours: number;     // how often to re-check (hours)
  sendEmail: boolean;             // whether to send email to customer
  sendInAppNotification: boolean; // whether to create in-app notification
  excludeStatuses: string[];      // statuses to skip (e.g. FULFILLED, CANCELLED, DELIVERED)
  customEmailSubject: string;     // e.g. "Reminder: Your order #{orderId} is due soon"
  customEmailBody: string;        // template — see VARIABLES below
  // VARIABLES available in subject + body:
  // {orderId}, {customerName}, {dueDate}, {daysLeft}, {status}, {totalAmount},
  // {items}, {companyName}, {companyPhone}, {companyEmail}
}

const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  enabled: true,
  reminderDays: 17,
  checkIntervalHours: 24,
  sendEmail: true,
  sendInAppNotification: true,
  excludeStatuses: ['FULFILLED', 'DELIVERED', 'CANCELLED'],
  customEmailSubject: 'Important Update: Your Order #{orderId} — Action Required',
  customEmailBody: `Dear {customerName},

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
{companyPhone}`,
};

const REMINDER_LOG_KEY = 'orderReminderLog';
const REMINDER_CONFIG_KEY = 'orderReminderConfig';

// -----------------------------------------------------------------------------
// Reminder Log — prevents duplicate emails on same day
// -----------------------------------------------------------------------------
interface ReminderLogEntry {
  orderId: string;
  sentAt: string;  // ISO date string
}

async function getReminderLog(): Promise<ReminderLogEntry[]> {
  try {
    const log = await getItem<ReminderLogEntry[]>(REMINDER_LOG_KEY);
    return log || [];
  } catch {
    return [];
  }
}

async function markReminderSent(orderId: string): Promise<void> {
  const log = await getReminderLog();
  // Remove old entries for same order, then add fresh one
  const filtered = log.filter(e => e.orderId !== orderId);
  filtered.push({ orderId, sentAt: new Date().toISOString() });
  // Keep only last 500 entries to avoid bloat
  const trimmed = filtered.slice(-500);
  await setItem(REMINDER_LOG_KEY, trimmed);
}

async function wasReminderSentToday(orderId: string): Promise<boolean> {
  const log = await getReminderLog();
  const today = new Date().toDateString();
  return log.some(e => e.orderId === orderId && new Date(e.sentAt).toDateString() === today);
}

// -----------------------------------------------------------------------------
// Config helpers
// -----------------------------------------------------------------------------
export async function getReminderConfig(): Promise<ReminderConfig> {
  try {
    const stored = await getItem<ReminderConfig>(REMINDER_CONFIG_KEY);
    return stored ? { ...DEFAULT_REMINDER_CONFIG, ...stored } : { ...DEFAULT_REMINDER_CONFIG };
  } catch {
    return { ...DEFAULT_REMINDER_CONFIG };
  }
}

export async function saveReminderConfig(config: ReminderConfig): Promise<void> {
  await setItem(REMINDER_CONFIG_KEY, config);
}

// -----------------------------------------------------------------------------
// Template rendering
// -----------------------------------------------------------------------------
function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

function buildEmailVars(
  order: Order,
  daysLeft: number,
  companyInfo?: CompanyInfo
): Record<string, string> {
  const items = (order.items || [])
    .map(it => `    • ${it.productName} — Qty: ${it.quantity} @ ${it.unitPrice}`)
    .join('\n');

  return {
    orderId: order.id,
    customerName: order.customerName,
    dueDate: order.dueDate || '—',
    daysLeft: daysLeft.toString(),
    status: order.status,
    totalAmount: `₹${(order.totalAmount || 0).toLocaleString('en-IN')}`,
    items: items || '    (no items)',
    companyName: companyInfo?.name || 'TexFlow ERP',
    companyPhone: companyInfo?.phone || '',
    companyEmail: companyInfo?.email || '',
  };
}

// -----------------------------------------------------------------------------
// Email sender (via local /api/email/send)
// -----------------------------------------------------------------------------
async function sendReminderEmail(
  order: Order,
  customer: Customer | undefined,
  vars: Record<string, string>,
  config: ReminderConfig,
  smtpConfig: CommunicationConfig
): Promise<{ ok: boolean; error?: string }> {
  const toEmail = customer?.email || (order as any).customerEmail;
  if (!toEmail) {
    return { ok: false, error: 'No customer email on file' };
  }

  const subject = renderTemplate(config.customEmailSubject, vars);
  const body = renderTemplate(config.customEmailBody, vars);

  try {
    const res = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: smtpConfig,
        to: toEmail,
        subject,
        text: body,
        html: `<pre style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;white-space:pre-wrap;">${body}</pre>`,
      }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || 'SMTP error' };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

// -----------------------------------------------------------------------------
// Main scanner
// -----------------------------------------------------------------------------
export interface ReminderResult {
  orderId: string;
  customerName: string;
  daysLeft: number;
  emailSent: boolean;
  notificationAdded: boolean;
  skippedReason?: string;
}

export async function runOrderReminderScan(
  orders: Order[],
  customers: Customer[],
  communicationConfig: CommunicationConfig,
  companyInfo: CompanyInfo | undefined,
  onAddNotification: (n: Partial<Notification>) => void
): Promise<ReminderResult[]> {
  const config = await getReminderConfig();
  if (!config.enabled) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const results: ReminderResult[] = [];

  for (const order of orders) {
    // Skip excluded statuses
    if (config.excludeStatuses.includes(order.status)) continue;
    // Skip orders without a due date
    if (!order.dueDate) continue;

    const due = new Date(order.dueDate);
    due.setHours(0, 0, 0, 0);
    const msLeft = due.getTime() - today.getTime();
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

    // Only alert if within window
    if (daysLeft > config.reminderDays || daysLeft < 0) continue;

    // Skip if already sent today
    const alreadySent = await wasReminderSentToday(order.id);
    if (alreadySent) {
      results.push({
        orderId: order.id,
        customerName: order.customerName,
        daysLeft,
        emailSent: false,
        notificationAdded: false,
        skippedReason: 'Reminder already sent today',
      });
      continue;
    }

    const customer = customers.find(c => c.name === order.customerName);
    const vars = buildEmailVars(order, daysLeft, companyInfo);

    let emailSent = false;
    let notificationAdded = false;

    // 1. Send email
    if (config.sendEmail) {
      const smtpReady =
        communicationConfig?.smtpHost &&
        communicationConfig?.smtpUser &&
        communicationConfig?.smtpPass;

      if (smtpReady) {
        const emailResult = await sendReminderEmail(order, customer, vars, config, communicationConfig);
        emailSent = emailResult.ok;
      }
    }

    // 2. In-app notification
    if (config.sendInAppNotification) {
      const urgencyLabel = daysLeft <= 0
        ? '🔴 OVERDUE'
        : daysLeft <= 3
          ? '🟠 URGENT'
          : daysLeft <= 7
            ? '🟡 DUE SOON'
            : '🔔 UPCOMING';

      onAddNotification({
        title: `${urgencyLabel} — Order #${order.id} (${order.customerName})`,
        message: `Order is in "${order.status}" stage. Due: ${order.dueDate} (${daysLeft <= 0 ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}). Total: ₹${(order.totalAmount || 0).toLocaleString('en-IN')}${emailSent ? ' — Reminder email sent to customer.' : ''}`,
        type: daysLeft <= 0 ? 'ERROR' : daysLeft <= 7 ? 'WARNING' : 'INFO',
        read: false,
      });
      notificationAdded = true;
    }

    // Mark sent to avoid duplicates today
    await markReminderSent(order.id);

    results.push({
      orderId: order.id,
      customerName: order.customerName,
      daysLeft,
      emailSent,
      notificationAdded,
    });
  }

  return results;
}

// -----------------------------------------------------------------------------
// Scheduler — call once on app mount
// -----------------------------------------------------------------------------
let _schedulerTimer: ReturnType<typeof setInterval> | null = null;

export function startReminderScheduler(
  getOrders: () => Order[],
  getCustomers: () => Customer[],
  getCommunicationConfig: () => CommunicationConfig,
  getCompanyInfo: () => CompanyInfo | undefined,
  onAddNotification: (n: Partial<Notification>) => void
): () => void {
  // Run once immediately after a short delay (wait for data to load)
  const initialTimer = setTimeout(async () => {
    const config = await getReminderConfig();
    if (!config.enabled) return;
    await runOrderReminderScan(
      getOrders(),
      getCustomers(),
      getCommunicationConfig(),
      getCompanyInfo(),
      onAddNotification
    );
  }, 5000); // 5-second delay after mount

  // Then run on interval
  const startInterval = async () => {
    const config = await getReminderConfig();
    const intervalMs = (config.checkIntervalHours || 24) * 60 * 60 * 1000;

    if (_schedulerTimer) clearInterval(_schedulerTimer);
    _schedulerTimer = setInterval(async () => {
      const freshConfig = await getReminderConfig();
      if (!freshConfig.enabled) return;
      await runOrderReminderScan(
        getOrders(),
        getCustomers(),
        getCommunicationConfig(),
        getCompanyInfo(),
        onAddNotification
      );
    }, intervalMs);
  };

  startInterval();

  // Cleanup
  return () => {
    clearTimeout(initialTimer);
    if (_schedulerTimer) {
      clearInterval(_schedulerTimer);
      _schedulerTimer = null;
    }
  };
}
