export type ReminderConfig = any;
export type ReminderResult = any;

export async function getReminderConfig(): Promise<any> { return {}; }
export async function saveReminderConfig(cfg: any) {}
export async function runOrderReminderScan(...args: any[]) { return []; }
export function startReminderScheduler(...args: any[]) { return () => {}; }
