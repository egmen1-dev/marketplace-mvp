import { OrderStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { detectBreachedDeadline } from "@/features/order-lifecycle/lib/deadlines";
import { mapCarrierStatusToOrderStatus } from "@/features/order-lifecycle/lib/carrier-tracking";

describe("overdue deadlines", () => {
  const now = new Date("2026-08-11T12:00:00.000Z");

  it("detects confirmation breach", () => {
    const breach = detectBreachedDeadline(
      {
        status: OrderStatus.AWAITING_SELLER_CONFIRMATION,
        confirmationDeadline: new Date("2026-08-10T12:00:00.000Z"),
        processingDeadline: null,
        shipmentDeadline: null,
        pickupExpiresAt: null,
        isOverdue: false,
      },
      now,
    );
    expect(breach?.type).toBe("confirmation");
  });

  it("skips already overdue", () => {
    expect(
      detectBreachedDeadline(
        {
          status: OrderStatus.PROCESSING,
          confirmationDeadline: null,
          processingDeadline: new Date("2026-08-01T00:00:00.000Z"),
          shipmentDeadline: null,
          pickupExpiresAt: null,
          isOverdue: true,
        },
        now,
      ),
    ).toBeNull();
  });

  it("detects pickup expiration", () => {
    const breach = detectBreachedDeadline(
      {
        status: OrderStatus.READY_FOR_PICKUP,
        confirmationDeadline: null,
        processingDeadline: null,
        shipmentDeadline: null,
        pickupExpiresAt: new Date("2026-08-01T00:00:00.000Z"),
        isOverdue: false,
      },
      now,
    );
    expect(breach?.type).toBe("pickup");
  });
});

describe("carrier mapping", () => {
  it("maps carrier statuses to OMS suggestions", () => {
    expect(mapCarrierStatusToOrderStatus("IN_TRANSIT")).toBe("IN_TRANSIT");
    expect(mapCarrierStatusToOrderStatus("DELIVERED")).toBe("DELIVERED");
    expect(mapCarrierStatusToOrderStatus("UNKNOWN")).toBeNull();
  });
});
