/**
 * Delivery provider factory.
 *
 * ```
 * if CDEK_CLIENT_ID + CDEK_CLIENT_SECRET → real CDEK (falls back to mock on API errors)
 * else → mock CDEK
 * ```
 *
 * Checkout / orders only call `getDeliveryProvider()` — never import mock/real directly
 * except tests.
 */

import { createMockCdekProvider } from "./mock-cdek";
import type { DeliveryProvider } from "./provider";
import { createRealCdekProvider } from "./real-cdek";

export type {
  DeliveryMethodType,
  DeliveryQuote,
  DeliveryQuoteRequest,
  DeliveryQuoteSource,
  PickupPoint,
} from "./types";
export { formatDeliveryEta } from "./types";
export { DeliveryError, type DeliveryProvider } from "./provider";

let cached: DeliveryProvider | null = null;

export function isCdekConfigured(): boolean {
  const id = process.env.CDEK_CLIENT_ID?.trim();
  const secret = process.env.CDEK_CLIENT_SECRET?.trim();
  return Boolean(id && secret);
}

/**
 * Resolve the active delivery provider (singleton per process).
 * Real provider always wraps mock fallback internally.
 */
export function getDeliveryProvider(): DeliveryProvider {
  if (cached) return cached;

  if (isCdekConfigured()) {
    cached = createRealCdekProvider({
      clientId: process.env.CDEK_CLIENT_ID!.trim(),
      clientSecret: process.env.CDEK_CLIENT_SECRET!.trim(),
      apiUrl:
        process.env.CDEK_API_URL?.trim() || "https://api.edu.cdek.ru/v2",
      fromCityCode: process.env.CDEK_FROM_CITY_CODE?.trim() || undefined,
    });
  } else {
    cached = createMockCdekProvider();
  }

  return cached;
}

/** Test helper — reset singleton between cases. */
export function resetDeliveryProviderCache(): void {
  cached = null;
}
