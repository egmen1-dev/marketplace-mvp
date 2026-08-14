import { describe, expect, it, afterEach } from "vitest";
import { DeliveryStatus, OrderStatus } from "@prisma/client";

import { isMarketplaceDeliveryEnabled } from "@/lib/marketplace-delivery/flags";
import { createMockDeliveryProvider } from "@/lib/marketplace-delivery/delivery/mock";
import {
  buildBuyerDeliverySteps,
  mapDeliveryStatusToOrderStatus,
} from "@/lib/marketplace-delivery/delivery/tracking";
import {
  assertAdminDeliveryAccess,
  assertSellerDeliveryAccess,
} from "@/lib/marketplace-delivery/delivery/permissions";

const PREV = process.env.MARKETPLACE_DELIVERY_ENABLED;

describe("delivery flag", () => {
  afterEach(() => {
    process.env.MARKETPLACE_DELIVERY_ENABLED = PREV;
  });

  it("is off by default", () => {
    delete process.env.MARKETPLACE_DELIVERY_ENABLED;
    expect(isMarketplaceDeliveryEnabled()).toBe(false);
  });
});

describe("mock provider", () => {
  it("creates shipment with tracking number", async () => {
    const provider = createMockDeliveryProvider();
    const result = await provider.createShipment({
      orderId: "ord_1",
      orderNumber: "A-10001",
      method: "PICKUP",
      recipientName: "Buyer",
      city: "Москва",
      address: "ПВЗ Тверская",
    });
    expect(result.trackingNumber).toMatch(/^MOCK-/);
    expect(result.status).toBe(DeliveryStatus.CREATED);
  });

  it("returns tracking snapshot", async () => {
    const provider = createMockDeliveryProvider();
    const shipment = await provider.createShipment({
      orderId: "ord_2",
      orderNumber: "A-10002",
      method: "COURIER",
      recipientName: "Buyer",
      city: "Москва",
      address: "ул. Пушкина",
    });
    const tracking = await provider.getTracking(shipment.trackingNumber);
    expect(tracking?.trackingNumber).toBe(shipment.trackingNumber);
  });
});

describe("tracking maps", () => {
  it("maps in transit to order status", () => {
    expect(mapDeliveryStatusToOrderStatus(DeliveryStatus.IN_TRANSIT)).toBe(
      OrderStatus.IN_TRANSIT,
    );
  });

  it("builds buyer progress steps", () => {
    const steps = buildBuyerDeliverySteps({
      orderStatus: OrderStatus.IN_TRANSIT,
      deliveryStatus: DeliveryStatus.IN_TRANSIT,
      isPaid: true,
    });
    expect(steps.find((s) => s.id === "transit")?.done).toBe(true);
  });
});

describe("permissions", () => {
  it("requires seller role", () => {
    expect(() => assertSellerDeliveryAccess("BUYER")).toThrow();
  });

  it("requires admin role", () => {
    expect(() => assertAdminDeliveryAccess("SELLER")).toThrow();
  });
});
