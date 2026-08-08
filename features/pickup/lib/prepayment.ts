/** Seller pickup points + buyer reservations. */

export const PREPAYMENT_PERCENTS = [0, 10, 20, 30, 50, 100] as const;
export type PrepaymentPercent = (typeof PREPAYMENT_PERCENTS)[number];

export function isAllowedPrepaymentPercent(n: number): n is PrepaymentPercent {
  return (PREPAYMENT_PERCENTS as readonly number[]).includes(n);
}

/** Round money to 2 decimals (rubles). */
export function calcPrepaymentAmount(
  lineTotal: number,
  percent: number,
): { prepayment: number; remaining: number } {
  const pct = Math.min(100, Math.max(0, percent));
  const prepayment = Math.round(((lineTotal * pct) / 100) * 100) / 100;
  const remaining = Math.round((lineTotal - prepayment) * 100) / 100;
  return { prepayment, remaining };
}

export const PICKUP_RESERVATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Ожидает подтверждения",
  CONFIRMED: "Подтверждена",
  READY: "Готово к выдаче",
  COMPLETED: "Получено",
  CANCELLED: "Отменено",
};
