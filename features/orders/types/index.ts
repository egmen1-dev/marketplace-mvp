import type {
  DeliveryMethod,
  DeliveryProvider,
  DeliveryStatus,
  OrderStatus,
} from "@prisma/client";

import type { ProductImageDto } from "@/features/products/types";

export type OrderItemView = {
  id: string;
  productId: string;
  productName: string;
  productSku: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  primaryImage: ProductImageDto | null;
};

export type OrderShippingView = {
  fullName: string;
  phone: string | null;
  city: string;
  street: string;
} | null;

export type OrderDeliveryView = {
  method: DeliveryMethod;
  status: DeliveryStatus;
  provider: DeliveryProvider;
  cost: number;
  currency: string;
  trackingNumber: string | null;
  pickupPointId: string | null;
  pickupAddress: string | null;
  estimatedMinDays: number | null;
  estimatedMaxDays: number | null;
} | null;

export type OrderListItem = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  currency: string;
  itemCount: number;
  createdAt: string;
};

export type OrderDetail = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  fulfillmentType: "DELIVERY" | "SELLER_PICKUP";
  subtotal: number;
  shippingCost: number;
  total: number;
  currency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  estimatedDeliveryAt: string | null;
  confirmationDeadline: string | null;
  shipmentDeadline: string | null;
  pickupExpiresAt: string | null;
  isOverdue: boolean;
  expectedNextAction: string;
  history: Array<{
    id: string;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    performedByRole: import("@prisma/client").OrderActorRole;
    reason: string | null;
    createdAt: string;
    actorName: string | null;
  }>;
  items: OrderItemView[];
  shipping: OrderShippingView;
  delivery: OrderDeliveryView;
};

export type CreateOrderResult =
  | {
      ok: true;
      orderId: string;
      orderNumber: string;
      /** Stripe Checkout URL — client should redirect here. */
      checkoutUrl?: string;
    }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
      /** Set when order was created but Checkout Session failed. */
      orderId?: string;
    };
