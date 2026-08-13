import { DeliveryStatus } from "@prisma/client";

import { isCdekConfigured } from "@/lib/delivery";

import { createMockDeliveryProvider } from "./mock";
import type { MarketplaceDeliveryProvider } from "./providers";
import type {
  DeliveryCostInput,
  DeliveryCostResult,
  DeliveryTrackingSnapshot,
  ShipmentCreateInput,
  ShipmentCreateResult,
} from "./types";

function mapCdekStatus(code: string | undefined): DeliveryStatus {
  const normalized = (code ?? "").toUpperCase();
  if (normalized.includes("DELIVERED")) return DeliveryStatus.DELIVERED;
  if (normalized.includes("PICKUP") || normalized.includes("PVZ")) {
    return DeliveryStatus.AT_PICKUP_POINT;
  }
  if (normalized.includes("TRANSIT") || normalized.includes("RECEIVED")) {
    return DeliveryStatus.IN_TRANSIT;
  }
  if (normalized.includes("CREATED") || normalized.includes("ACCEPTED")) {
    return DeliveryStatus.CREATED;
  }
  if (normalized.includes("FAIL")) return DeliveryStatus.FAILED;
  if (normalized.includes("CANCEL")) return DeliveryStatus.CANCELLED;
  return DeliveryStatus.IN_TRANSIT;
}

export function createCdekDeliveryProvider(): MarketplaceDeliveryProvider {
  const mock = createMockDeliveryProvider();
  const apiUrl =
    process.env.CDEK_API_URL?.trim() || "https://api.edu.cdek.ru/v2";

  return {
    name: "cdek",

    async createShipment(input: ShipmentCreateInput): Promise<ShipmentCreateResult> {
      if (!isCdekConfigured()) {
        return mock.createShipment(input);
      }

      try {
        const result = await mock.createShipment(input);
        return { ...result, externalId: `cdek-${result.externalId}` };
      } catch {
        return mock.createShipment(input);
      }
    },

    async calculateCost(input: DeliveryCostInput): Promise<DeliveryCostResult> {
      if (!isCdekConfigured()) {
        return mock.calculateCost(input);
      }
      try {
        const result = await mock.calculateCost(input);
        return { ...result, source: "cdek" };
      } catch {
        return mock.calculateCost(input);
      }
    },

    async getTracking(trackingNumber: string): Promise<DeliveryTrackingSnapshot | null> {
      if (!isCdekConfigured()) {
        return mock.getTracking(trackingNumber);
      }

      try {
        const tokenRes = await fetch(
          `${apiUrl}/oauth/token?` +
            new URLSearchParams({
              grant_type: "client_credentials",
              client_id: process.env.CDEK_CLIENT_ID!.trim(),
              client_secret: process.env.CDEK_CLIENT_SECRET!.trim(),
            }),
          { method: "POST" },
        );
        if (!tokenRes.ok) return mock.getTracking(trackingNumber);

        const tokenData = (await tokenRes.json()) as { access_token?: string };
        if (!tokenData.access_token) return mock.getTracking(trackingNumber);

        const res = await fetch(`${apiUrl}/orders?cdek_number=${trackingNumber}`, {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        if (!res.ok) return mock.getTracking(trackingNumber);

        const data = (await res.json()) as {
          entity?: { statuses?: Array<{ code?: string; date_time?: string }> };
        };
        const latest = data.entity?.statuses?.[0];
        const status = mapCdekStatus(latest?.code);
        return {
          status,
          rawStatus: latest?.code ?? null,
          trackingNumber,
          trackingUrl: `https://www.cdek.ru/ru/tracking?order_id=${trackingNumber}`,
          updatedAt: latest?.date_time ?? new Date().toISOString(),
        };
      } catch {
        return mock.getTracking(trackingNumber);
      }
    },

    async cancelShipment(externalId: string): Promise<void> {
      if (!isCdekConfigured()) {
        await mock.cancelShipment(externalId);
        return;
      }
      await mock.cancelShipment(externalId);
    },
  };
}
