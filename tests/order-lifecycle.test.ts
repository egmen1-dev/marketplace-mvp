import {
  OrderActorRole,
  OrderFulfillmentType,
  OrderStatus,
  UserRole,
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  canTransition,
  getAllowedTransitions,
  normalizeOrderStatus,
  userRoleToActorRole,
} from "@/features/order-lifecycle/lib/state-machine";
import { buildSlaAfterPayment } from "@/features/order-lifecycle/lib/sla";
import {
  isCompletedForRanking,
  isOrderReviewEligible,
} from "@/features/order-lifecycle/lib/integrations";

describe("order lifecycle state machine", () => {
  it("normalizes legacy PAID", () => {
    expect(normalizeOrderStatus(OrderStatus.PAID)).toBe(
      OrderStatus.AWAITING_SELLER_CONFIRMATION,
    );
  });

  it("allows delivery happy path", () => {
    const path: OrderStatus[] = [
      OrderStatus.NEW,
      OrderStatus.AWAITING_SELLER_CONFIRMATION,
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
      OrderStatus.READY_FOR_SHIPMENT,
      OrderStatus.SHIPPED,
      OrderStatus.IN_TRANSIT,
      OrderStatus.DELIVERED,
      OrderStatus.COMPLETED,
    ];
    for (let i = 0; i < path.length - 1; i++) {
      expect(
        canTransition({
          from: path[i]!,
          to: path[i + 1]!,
          fulfillmentType: OrderFulfillmentType.DELIVERY,
          actorRole:
            i === 0
              ? OrderActorRole.PAYMENT
              : i === path.length - 2
                ? OrderActorRole.BUYER
                : OrderActorRole.SELLER,
        }),
      ).toBe(true);
    }
  });

  it("allows pickup happy path", () => {
    expect(
      canTransition({
        from: OrderStatus.PROCESSING,
        to: OrderStatus.READY_FOR_PICKUP,
        fulfillmentType: OrderFulfillmentType.SELLER_PICKUP,
        actorRole: OrderActorRole.SELLER,
      }),
    ).toBe(true);
    expect(
      canTransition({
        from: OrderStatus.PROCESSING,
        to: OrderStatus.READY_FOR_SHIPMENT,
        fulfillmentType: OrderFulfillmentType.SELLER_PICKUP,
        actorRole: OrderActorRole.SELLER,
      }),
    ).toBe(false);
  });

  it("rejects illegal jumps", () => {
    expect(
      canTransition({
        from: OrderStatus.NEW,
        to: OrderStatus.DELIVERED,
        fulfillmentType: OrderFulfillmentType.DELIVERY,
        actorRole: OrderActorRole.SELLER,
      }),
    ).toBe(false);
    expect(
      canTransition({
        from: OrderStatus.COMPLETED,
        to: OrderStatus.PROCESSING,
        fulfillmentType: OrderFulfillmentType.DELIVERY,
        actorRole: OrderActorRole.ADMIN,
      }),
    ).toBe(false);
  });

  it("enforces buyer cannot confirm for seller", () => {
    expect(
      canTransition({
        from: OrderStatus.AWAITING_SELLER_CONFIRMATION,
        to: OrderStatus.CONFIRMED,
        fulfillmentType: OrderFulfillmentType.DELIVERY,
        actorRole: OrderActorRole.BUYER,
      }),
    ).toBe(false);
  });

  it("enforces seller cannot complete for buyer", () => {
    expect(
      canTransition({
        from: OrderStatus.DELIVERED,
        to: OrderStatus.COMPLETED,
        fulfillmentType: OrderFulfillmentType.DELIVERY,
        actorRole: OrderActorRole.SELLER,
      }),
    ).toBe(false);
    expect(
      canTransition({
        from: OrderStatus.DELIVERED,
        to: OrderStatus.COMPLETED,
        fulfillmentType: OrderFulfillmentType.DELIVERY,
        actorRole: OrderActorRole.BUYER,
      }),
    ).toBe(true);
  });

  it("maps user roles", () => {
    expect(userRoleToActorRole(UserRole.ADMIN)).toBe(OrderActorRole.ADMIN);
    expect(userRoleToActorRole(UserRole.SELLER)).toBe(OrderActorRole.SELLER);
    expect(userRoleToActorRole(UserRole.BUYER)).toBe(OrderActorRole.BUYER);
  });

  it("exposes seller actions from awaiting", () => {
    const next = getAllowedTransitions({
      from: OrderStatus.AWAITING_SELLER_CONFIRMATION,
      fulfillmentType: OrderFulfillmentType.DELIVERY,
      actorRole: OrderActorRole.SELLER,
    });
    expect(next).toEqual(
      expect.arrayContaining([
        OrderStatus.CONFIRMED,
        OrderStatus.REJECTED,
        OrderStatus.CANCELLED,
      ]),
    );
  });
});

describe("SLA / ranking / reviews", () => {
  it("builds confirmation and shipment deadlines", () => {
    const now = new Date("2026-08-11T12:00:00.000Z");
    const sla = buildSlaAfterPayment({
      now,
      handlingDays: 2,
      fulfillmentType: OrderFulfillmentType.DELIVERY,
      deliveryEstimatedMaxDays: 5,
    });
    expect(sla.confirmationDeadline.toISOString()).toBe(
      "2026-08-12T12:00:00.000Z",
    );
    expect(sla.shipmentDeadline.toISOString()).toBe(
      "2026-08-13T12:00:00.000Z",
    );
    expect(sla.estimatedDeliveryAt?.toISOString()).toBe(
      "2026-08-18T12:00:00.000Z",
    );
  });

  it("marks ranking completion statuses", () => {
    expect(isCompletedForRanking(OrderStatus.COMPLETED)).toBe(true);
    expect(isCompletedForRanking(OrderStatus.DELIVERED)).toBe(true);
    expect(isCompletedForRanking(OrderStatus.PROCESSING)).toBe(false);
  });

  it("marks review eligibility", () => {
    expect(
      isOrderReviewEligible({
        status: OrderStatus.COMPLETED,
        reviewEligibleAt: null,
      }),
    ).toBe(true);
    expect(
      isOrderReviewEligible({
        status: OrderStatus.PROCESSING,
        reviewEligibleAt: new Date(),
      }),
    ).toBe(true);
    expect(
      isOrderReviewEligible({
        status: OrderStatus.PROCESSING,
        reviewEligibleAt: null,
      }),
    ).toBe(false);
  });
});
