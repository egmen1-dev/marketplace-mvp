/**
 * Carrier tracking boundary — providers never write Order.status directly.
 * They return a suggested lifecycle status; callers must use transitionOrder.
 */

import type { OrderStatus } from "@prisma/client";

export type CarrierTrackingStatus =
  | "UNKNOWN"
  | "CREATED"
  | "SHIPPED"
  | "IN_TRANSIT"
  | "ARRIVED"
  | "DELIVERED"
  | "RETURNED"
  | "CANCELLED";

export type CarrierTrackingSnapshot = {
  provider: "CDEK" | "OTHER" | "MANUAL";
  trackingNumber: string | null;
  status: CarrierTrackingStatus;
  rawCode?: string | null;
  updatedAt: string;
};

export type CarrierTrackingProvider = {
  readonly name: string;
  getTrackingStatus(opts: {
    trackingNumber: string;
  }): Promise<CarrierTrackingSnapshot | null>;
};

/** Map carrier status → OMS OrderStatus suggestion (never applied directly). */
export function mapCarrierStatusToOrderStatus(
  status: CarrierTrackingStatus,
): OrderStatus | null {
  switch (status) {
    case "SHIPPED":
      return "SHIPPED";
    case "IN_TRANSIT":
      return "IN_TRANSIT";
    case "ARRIVED":
      return "ARRIVED";
    case "DELIVERED":
      return "DELIVERED";
    case "CANCELLED":
      return "CANCELLED";
    case "RETURNED":
      return "RETURNED";
    default:
      return null;
  }
}

/**
 * Manual / seller-driven fallback — reads Delivery.trackingNumber only.
 * Live CDEK sync is not enabled without credentials.
 */
export const manualCarrierTrackingProvider: CarrierTrackingProvider = {
  name: "manual",
  async getTrackingStatus() {
    return null;
  },
};

/**
 * Stub CDEK provider. Returns null until CDEK_CLIENT_ID / secret configured.
 * Does not invent tracking data.
 */
export const cdekCarrierTrackingProvider: CarrierTrackingProvider = {
  name: "cdek",
  async getTrackingStatus() {
    const id = process.env.CDEK_CLIENT_ID?.trim();
    const secret = process.env.CDEK_CLIENT_SECRET?.trim();
    if (!id || !secret) return null;
    // Live CDEK tracking not wired in CORE-060.1 — boundary only.
    return null;
  },
};

export function getCarrierTrackingProvider(): CarrierTrackingProvider {
  const id = process.env.CDEK_CLIENT_ID?.trim();
  const secret = process.env.CDEK_CLIENT_SECRET?.trim();
  if (id && secret) return cdekCarrierTrackingProvider;
  return manualCarrierTrackingProvider;
}
