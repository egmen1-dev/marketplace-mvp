import type { Money } from "../value-objects/money";
import type { OrderId, ProductId } from "../value-objects/ids";

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type OrderSummary = {
  readonly id: OrderId;
  readonly orderNumber: string;
  readonly status: OrderStatus;
  readonly total: Money;
  readonly itemCount: number;
  readonly createdAt: string;
  readonly previewImageUrl: string | null;
};

export type OrderTimelineStep = {
  readonly id: string;
  readonly label: string;
  readonly timestampLabel: string;
  readonly isCurrent: boolean;
};

export type OrderDetail = OrderSummary & {
  readonly lines: ReadonlyArray<{
    readonly productId: ProductId;
    readonly title: string;
    readonly quantity: number;
    readonly price: Money;
    readonly imageUrl: string | null;
  }>;
  readonly timeline: ReadonlyArray<OrderTimelineStep>;
  readonly deliveryLabel: string | null;
  readonly paymentLabel: string | null;
};

export type SharePayload = {
  readonly uri: string;
  readonly message: string;
};
