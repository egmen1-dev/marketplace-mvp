import type { DeliveryMethod, DeliveryStatus } from "@prisma/client";

export type MarketplaceDeliveryProviderName = "mock" | "cdek";

export type ShipmentCreateInput = {
  orderId: string;
  orderNumber: string;
  method: DeliveryMethod;
  pickupPointId?: string | null;
  recipientName: string;
  recipientPhone?: string | null;
  city: string;
  address: string;
  weightGrams?: number;
};

export type ShipmentCreateResult = {
  externalId: string;
  trackingNumber: string;
  trackingUrl: string;
  status: DeliveryStatus;
  cost: number;
  currency: string;
};

export type DeliveryTrackingSnapshot = {
  status: DeliveryStatus;
  rawStatus?: string | null;
  trackingNumber: string;
  trackingUrl?: string | null;
  updatedAt: string;
};

export type DeliveryCostInput = {
  method: DeliveryMethod;
  city: string;
  weightGrams?: number;
  pickupPointCode?: string | null;
};

export type DeliveryCostResult = {
  cost: number;
  currency: string;
  minDays: number;
  maxDays: number;
  source: "mock" | "cdek";
};

export type SellerShipQueueItem = {
  orderId: string;
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  shipmentDeadline: string | null;
  pickupAddress: string | null;
  deliveryStatus: DeliveryStatus | null;
  trackingNumber: string | null;
  buyerName: string;
  createdAt: string;
};

export type BuyerDeliveryProgressStep = {
  id: string;
  label: string;
  done: boolean;
  active: boolean;
};

export type AdminDeliveryHealth = {
  enabled: boolean;
  inTransit: number;
  overdue: number;
  problems: number;
};

export type AdminShipmentRow = {
  orderId: string;
  orderNumber: string;
  sellerName: string;
  provider: string;
  trackingNumber: string | null;
  status: DeliveryStatus;
  updatedAt: string;
};
