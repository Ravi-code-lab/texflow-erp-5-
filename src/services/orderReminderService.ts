const STORAGE_KEY = 'texflow_reminder_config';

export type ReminderConfig = {
  enabled: boolean;
  reminderDays: number;
  excludeStatuses: string[];
};

export type ReminderResult = {
  orderId: string;
  orderNo: string;
  customerName: string;
  dueDate: string;
  daysLeft: number;
};

const DEFAULT_CONFIG: ReminderConfig = {
  enabled: false,
  reminderDays: 17,
  excludeStatuses: ['FULFILLED', 'DELIVERED', 'CANCELLED'],
};

export async function getReminderConfig(): Promise<ReminderConfig> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw);
    // Merge with defaults so any missing keys are filled in
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      excludeStatuses: Array.isArray(parsed.excludeStatuses)
        ? parsed.excludeStatuses
        : DEFAULT_CONFIG.excludeStatuses,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveReminderConfig(cfg: ReminderConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {}
}

export async function runOrderReminderScan(...args: any[]): Promise<ReminderResult[]> {
  return [];
}

export function startReminderScheduler(...args: any[]) {
  return () => {};
}
