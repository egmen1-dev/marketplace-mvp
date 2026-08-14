import { DeliveryStatus } from "@prisma/client";

import { getDeliveryProvider } from "@/lib/delivery";

import type { MarketplaceDeliveryProvider } from "./providers";
import type {
  DeliveryCostInput,
  DeliveryCostResult,
  DeliveryTrackingSnapshot,
  ShipmentCreateInput,
  ShipmentCreateResult,
} from "./types";

const mockShipments = new Map<
  string,
  { status: DeliveryStatus; createdAt: number }
>();

export function createMockDeliveryProvider(): MarketplaceDeliveryProvider {
  return {
    name: "mock",

    async createShipment(input: ShipmentCreateInput): Promise<ShipmentCreateResult> {
      const trackingNumber = `MOCK-${input.orderNumber.replace(/\D/g, "").slice(-8) || input.orderId.slice(-8)}`;
      mockShipments.set(trackingNumber, {
        status: DeliveryStatus.CREATED,
        createdAt: Date.now(),
      });

      return {
        externalId: `mock-${input.orderId}`,
        trackingNumber,
        trackingUrl: `https://mock.cdek.local/track/${trackingNumber}`,
        status: DeliveryStatus.CREATED,
        cost: 0,
        currency: "RUB",
      };
    },

    async calculateCost(input: DeliveryCostInput): Promise<DeliveryCostResult> {
      const legacy = getDeliveryProvider();
      const quote = await legacy.getQuote({
        method: input.method,
        city: input.city,
        weightGrams: input.weightGrams,
        pickupPointCode: input.pickupPointCode ?? undefined,
      });
      return {
        cost: quote.cost,
        currency: quote.currency,
        minDays: quote.estimatedMinDays,
        maxDays: quote.estimatedMaxDays,
        source: "mock",
      };
    },

    async getTracking(trackingNumber: string): Promise<DeliveryTrackingSnapshot | null> {
      const entry = mockShipments.get(trackingNumber);
      if (!entry) {
        return {
          status: DeliveryStatus.IN_TRANSIT,
          trackingNumber,
          trackingUrl: `https://mock.cdek.local/track/${trackingNumber}`,
          updatedAt: new Date().toISOString(),
        };
      }

      const ageMs = Date.now() - entry.createdAt;
      let status = entry.status;
      if (ageMs > 60_000) status = DeliveryStatus.IN_TRANSIT;
      if (ageMs > 120_000) status = DeliveryStatus.AT_PICKUP_POINT;
      if (ageMs > 180_000) status = DeliveryStatus.DELIVERED;
      entry.status = status;

      return {
        status,
        rawStatus: status,
        trackingNumber,
        trackingUrl: `https://mock.cdek.local/track/${trackingNumber}`,
        updatedAt: new Date().toISOString(),
      };
    },

    async cancelShipment(externalId: string): Promise<void> {
      for (const [key] of mockShipments) {
        if (externalId.includes(key)) {
          mockShipments.delete(key);
        }
      }
    },
  };
}
