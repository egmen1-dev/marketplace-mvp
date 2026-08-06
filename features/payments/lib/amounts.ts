/**
 * Convert a major-unit price (e.g. rubles) to Stripe's smallest unit (kopecks).
 * Stripe amounts are always integers in the smallest currency unit.
 */
export function toStripeAmount(amount: number | string): number {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Invalid amount for Stripe: ${amount}`);
  }
  return Math.round(n * 100);
}

/** Normalize app currency codes to Stripe lowercase currency. Prefer RUB. */
export function toStripeCurrency(currency: string): string {
  const code = currency.trim().toLowerCase();
  return code || "rub";
}
