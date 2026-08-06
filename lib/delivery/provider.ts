import type {
  DeliveryQuote,
  DeliveryQuoteRequest,
  PickupPoint,
} from "./types";

/**
 * Delivery carrier interface.
 *
 * Implementations:
 * - `mock-cdek.ts` — deterministic quotes + fake PVZ (no credentials)
 * - `real-cdek.ts` — CDEK HTTP API; falls back to mock on failure
 *
 * Drop-in rule: any new provider must implement this interface and be
 * selected from `index.ts` (factory). Checkout and order creation only
 * depend on these methods — never on CDEK-specific HTTP details.
 */
export interface DeliveryProvider {
  readonly name: "cdek-mock" | "cdek-real";

  /** List pickup points (ПВЗ) for a city name (RU). */
  listPickupPoints(city: string): Promise<PickupPoint[]>;

  /** Quote cost + ETA for pickup or courier. */
  getQuote(request: DeliveryQuoteRequest): Promise<DeliveryQuote>;
}

export class DeliveryError extends Error {
  constructor(
    public readonly code:
      | "CITY_NOT_FOUND"
      | "POINT_NOT_FOUND"
      | "QUOTE_FAILED"
      | "NOT_CONFIGURED"
      | "API_ERROR",
    message: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = "DeliveryError";
  }
}
