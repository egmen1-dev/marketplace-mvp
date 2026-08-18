import type { OrderDetail, OrderSummary } from "../../domain/contracts/entities/order";
import {
  ORDER_STATUS_LABELS,
  formatOrderDateLabel,
  isActiveOrderStatus,
  type OrderDetailView,
  type OrderListCardView,
  type OrderStatusCode,
} from "./types";

const DOMAIN_TO_UI_STATUS: Record<OrderSummary["status"], OrderStatusCode> = {
  pending: "NEW",
  paid: "PAID",
  processing: "PROCESSING",
  shipped: "SHIPPED",
  delivered: "DELIVERED",
  cancelled: "CANCELLED",
  refunded: "REFUNDED",
};

function toUiStatus(status: OrderSummary["status"]): OrderStatusCode {
  return DOMAIN_TO_UI_STATUS[status] ?? "NEW";
}

export function orderSummaryToListCard(order: OrderSummary): OrderListCardView {
  const status = toUiStatus(order.status);
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status,
    statusLabel: ORDER_STATUS_LABELS[status],
    total: order.total.amount,
    currency: order.total.currency,
    itemCount: order.itemCount,
    createdAt: order.createdAt,
    createdAtLabel: formatOrderDateLabel(order.createdAt),
    isActive: isActiveOrderStatus(status),
    previewTitle: null,
    previewImageUrl: order.previewImageUrl,
    sellerName: null,
  };
}

export function orderDetailToView(order: OrderDetail): OrderDetailView {
  const status = toUiStatus(order.status);
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status,
    statusLabel: ORDER_STATUS_LABELS[status],
    subtotal: order.total.amount,
    shippingCost: 0,
    total: order.total.amount,
    currency: order.total.currency,
    notes: null,
    createdAt: order.createdAt,
    createdAtLabel: formatOrderDateLabel(order.createdAt),
    recipientName: null,
    recipientPhone: null,
    recipientCity: order.deliveryLabel,
    sellerName: null,
    items: order.lines.map((line, index) => ({
      id: `${order.id}-${index}`,
      productId: line.productId,
      title: line.title,
      quantity: line.quantity,
      unitPrice: line.price.amount,
      totalPrice: line.price.amount * line.quantity,
      imageUrl: line.imageUrl,
    })),
    timeline: order.timeline.map((step) => ({
      id: step.id,
      status,
      label: step.label,
      timestamp: order.createdAt,
      timestampLabel: step.timestampLabel,
      isCurrent: step.isCurrent,
    })),
    expectedNextAction: null,
  };
}

export function mergeSellerNameInView(detail: OrderDetailView, sellerName: string | null): OrderDetailView {
  return { ...detail, sellerName };
}
