/**
 * Indian number formatting utilities
 */

/** Format a number in Indian currency style (₹ with lakhs/crores) */
export function formatINR(amount: number, currency = "₹"): string {
  if (amount === 0) return `${currency}0`;
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_00_00_000) return `${sign}${currency}${(abs / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000)    return `${sign}${currency}${(abs / 1_00_000).toFixed(2)}L`;
  if (abs >= 1_000)       return `${sign}${currency}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${currency}${abs.toFixed(0)}`;
}

/** Full Indian comma formatting: 1,23,456.00 */
export function formatINRFull(amount: number, currency = "₹"): string {
  return `${currency}${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Compact count formatter */
export function compactCount(n: number): string {
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n/1_000).toFixed(1)}K`;
  return String(n);
}
