import { describe, expect, it } from "vitest";

import { getReservationAvailability } from "@/features/pickup/lib/reservation-availability";

const base = {
  status: "ACTIVE",
  stock: 3,
  pickupEnabled: true,
  reservationEnabled: true,
  pickupPointsCount: 1,
  prepaymentPercent: 20,
  isOwnProduct: false,
};

describe("getReservationAvailability", () => {
  it("allows foreign buyer when all flags are set", () => {
    expect(getReservationAvailability(base)).toEqual({
      available: true,
      reason: "ok",
      pickupPointsCount: 1,
      prepaymentPercent: 20,
    });
  });

  it("hides CTA for own product", () => {
    expect(
      getReservationAvailability({ ...base, isOwnProduct: true }).reason,
    ).toBe("own_product");
  });

  it("requires active status, stock, pickup, reservation, and points", () => {
    expect(
      getReservationAvailability({ ...base, status: "DRAFT" }).reason,
    ).toBe("inactive");
    expect(getReservationAvailability({ ...base, stock: 0 }).reason).toBe(
      "out_of_stock",
    );
    expect(
      getReservationAvailability({ ...base, pickupEnabled: false }).reason,
    ).toBe("pickup_disabled");
    expect(
      getReservationAvailability({ ...base, reservationEnabled: false })
        .reason,
    ).toBe("reservation_disabled");
    expect(
      getReservationAvailability({ ...base, pickupPointsCount: 0 }).reason,
    ).toBe("no_pickup_points");
  });
});
