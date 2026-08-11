/**
 * Single source of truth for PDP «Забронировать» CTA.
 * Used by product page SSR and E2E assertions — keep conditions here only.
 */

export type ReservationAvailabilityInput = {
  status: string;
  stock: number;
  pickupEnabled: boolean;
  reservationEnabled: boolean;
  /** Active pickup points linked to the product */
  pickupPointsCount: number;
  prepaymentPercent: number;
  /** True when the viewer owns this listing (seller session matches product.seller) */
  isOwnProduct: boolean;
};

export type ReservationAvailability = {
  available: boolean;
  reason:
    | "ok"
    | "own_product"
    | "inactive"
    | "out_of_stock"
    | "pickup_disabled"
    | "reservation_disabled"
    | "no_pickup_points";
  pickupPointsCount: number;
  prepaymentPercent: number;
};

/**
 * CTA visible when reservation is bookable for this viewer.
 * Guests may see the CTA (click → sign-in). Owners never see it.
 */
export function getReservationAvailability(
  input: ReservationAvailabilityInput,
): ReservationAvailability {
  const pickupPointsCount = Math.max(0, input.pickupPointsCount);
  const prepaymentPercent = input.prepaymentPercent;

  if (input.isOwnProduct) {
    return {
      available: false,
      reason: "own_product",
      pickupPointsCount,
      prepaymentPercent,
    };
  }
  if (input.status !== "ACTIVE") {
    return {
      available: false,
      reason: "inactive",
      pickupPointsCount,
      prepaymentPercent,
    };
  }
  if (input.stock <= 0) {
    return {
      available: false,
      reason: "out_of_stock",
      pickupPointsCount,
      prepaymentPercent,
    };
  }
  if (!input.pickupEnabled) {
    return {
      available: false,
      reason: "pickup_disabled",
      pickupPointsCount,
      prepaymentPercent,
    };
  }
  if (!input.reservationEnabled) {
    return {
      available: false,
      reason: "reservation_disabled",
      pickupPointsCount,
      prepaymentPercent,
    };
  }
  if (pickupPointsCount < 1) {
    return {
      available: false,
      reason: "no_pickup_points",
      pickupPointsCount,
      prepaymentPercent,
    };
  }

  return {
    available: true,
    reason: "ok",
    pickupPointsCount,
    prepaymentPercent,
  };
}
