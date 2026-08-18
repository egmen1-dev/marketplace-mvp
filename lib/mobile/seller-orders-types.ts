import type { OrderStatus } from "@prisma/client";

export type MobileSellerOrderFilter =
  | "all"
  | "new"
  | "processing"
  | "ready_shipment"
  | "awaiting_pickup"
  | "shipped"
  | "completed"
  | "cancelled"
  | "overdue"
  | "problem";

export type MobileSellerOrderItem = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  fulfillmentType: "DELIVERY" | "SELLER_PICKUP";
  isOverdue: boolean;
  overdueReason: string | null;
  total: number;
  sellerSubtotal: number;
  currency: string;
  createdAt: string;
  buyerName: string | null;
  buyerEmail: string;
  itemCount: number;
  sellerItemNames: string[];
};

export type MobileSellerOrdersSummary = {
  newCount: number;
  inProgress: number;
  awaitingShipment: number;
  readyForPickup: number;
  overdue: number;
};

export type MobileSellerOrderDetail = MobileSellerOrderItem & {
  updatedAt: string;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    totalPrice: number;
    sku: string | null;
  }>;
};

export type MobileSellerOrdersPage = {
  items: MobileSellerOrderItem[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
};

export const MOBILE_SELLER_ORDER_FILTERS: MobileSellerOrderFilter[] = [
  "all",
  "new",
  "processing",
  "ready_shipment",
  "awaiting_pickup",
  "shipped",
  "completed",
  "cancelled",
  "overdue",
  "problem",
];
