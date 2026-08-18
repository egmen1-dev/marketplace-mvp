/**
 * EPIC 92 — Money value object.
 */

export type Money = {
  readonly amount: number;
  readonly currency: string;
};

export function money(amount: number, currency = "RUB"): Money {
  return { amount, currency };
}

export function formatMoney(value: Money): string {
  return `${value.amount.toLocaleString("ru-RU")} ${value.currency === "RUB" ? "₽" : value.currency}`;
}
