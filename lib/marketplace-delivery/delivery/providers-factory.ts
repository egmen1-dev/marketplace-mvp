import { isCdekConfigured } from "@/lib/delivery";

import { createCdekDeliveryProvider } from "./cdek";
import { createMockDeliveryProvider } from "./mock";
import type { MarketplaceDeliveryProvider } from "./providers";

let cached: MarketplaceDeliveryProvider | null = null;

export function getMarketplaceDeliveryProvider(): MarketplaceDeliveryProvider {
  if (cached) return cached;
  cached = isCdekConfigured()
    ? createCdekDeliveryProvider()
    : createMockDeliveryProvider();
  return cached;
}

export function resetMarketplaceDeliveryProviderCache(): void {
  cached = null;
}

export { createMockDeliveryProvider } from "./mock";
export { createCdekDeliveryProvider } from "./cdek";
