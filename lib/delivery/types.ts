/**
 * Delivery domain types — provider-agnostic DTOs for CDEK (and future carriers).
 *
 * Real CDEK API maps onto these shapes; swap implementations via `getDeliveryProvider()`.
 */

export type DeliveryMethodType = "PICKUP" | "COURIER";

export type DeliveryQuoteSource = "mock" | "real";

/** CDEK pickup point (ПВЗ). */
export type PickupPoint = {
  /** Provider point code (CDEK `code`) */
  code: string;
  name: string;
  address: string;
  city: string;
  postalCode?: string;
  workTime?: string;
  /** Optional lat/lon for maps later */
  location?: { lat: number; lon: number };
};

export type DeliveryQuoteRequest = {
  method: DeliveryMethodType;
  city: string;
  /** Optional package weight in grams (defaults inside provider). */
  weightGrams?: number;
  /** Required for PICKUP quotes when validating a selected PVZ. */
  pickupPointCode?: string;
};

export type DeliveryQuote = {
  method: DeliveryMethodType;
  city: string;
  /** Cost in major currency units (RUB). */
  cost: number;
  currency: string;
  estimatedMinDays: number;
  estimatedMaxDays: number;
  provider: "CDEK";
  source: DeliveryQuoteSource;
  pickupPointCode?: string;
};

/** Human-readable ETA, e.g. «3–5 дней». */
export function formatDeliveryEta(
  minDays: number,
  maxDays: number,
): string {
  if (minDays === maxDays) {
    return `${minDays} ${pluralDays(minDays)}`;
  }
  return `${minDays}–${maxDays} ${pluralDays(maxDays)}`;
}

function pluralDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return "дня";
  }
  return "дней";
}
