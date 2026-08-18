import type { SellerActionKind } from "../../../domain/contracts/entities/seller";
import { SELLER_ORDER_STATUS_LABELS } from "../seller-view";

export type SellerOperationalOrderView = {
  id: string;
  orderNumber: string;
  status: string;
  statusLabel: string;
  statusTone: "neutral" | "success" | "warning" | "danger";
  fulfillmentType: "DELIVERY" | "SELLER_PICKUP";
  fulfillmentLabel: string;
  isOverdue: boolean;
  buyerName: string;
  sellerSubtotal: number;
  currency: string;
  itemCount: number;
  previewTitle: string | null;
  createdAt: string;
  createdAtLabel: string;
};

export type SellerOrdersSummaryView = {
  newCount: number;
  inProgress: number;
  awaitingShipment: number;
  readyForPickup: number;
  overdue: number;
};

export type SellerOrderDetailView = SellerOperationalOrderView & {
  buyerEmail: string | null;
  updatedAt: string;
  sellerItemNames: string[];
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    totalPrice: number;
    sku: string | null;
  }>;
};

export const SELLER_ORDER_FILTER_LABELS: Record<
  import("../../../domain/contracts/entities/seller").SellerOrderFilter,
  string
> = {
  all: "Все",
  new: "Новые",
  processing: "Комплектуются",
  ready_shipment: "К отправке",
  awaiting_pickup: "К выдаче",
  shipped: "Отправлены",
  completed: "Завершённые",
  cancelled: "Отменённые",
  overdue: "Просрочено",
  problem: "Проблемные",
};

export const SELLER_ORDER_SUMMARY_KEYS: Array<{
  key: keyof SellerOrdersSummaryView;
  filter: import("../../../domain/contracts/entities/seller").SellerOrderFilter;
  label: string;
}> = [
  { key: "newCount", filter: "new", label: "Новые" },
  { key: "inProgress", filter: "processing", label: "В работе" },
  { key: "awaitingShipment", filter: "ready_shipment", label: "К отправке" },
  { key: "readyForPickup", filter: "awaiting_pickup", label: "К выдаче" },
  { key: "overdue", filter: "overdue", label: "Просрочено" },
];

function formatOrderDate(createdAt: string): string {
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime())
    ? createdAt
    : date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function statusTone(status: string, isOverdue: boolean): SellerOperationalOrderView["statusTone"] {
  if (isOverdue) return "danger";
  if (status === "CANCELLED" || status === "REJECTED") return "danger";
  if (status === "READY_FOR_SHIPMENT" || status === "READY_FOR_PICKUP") return "warning";
  if (status === "COMPLETED" || status === "DELIVERED" || status === "PICKED_UP") return "success";
  return "neutral";
}

export function sellerOrderToOperationalView(
  order: import("../../../domain/contracts/entities/seller").SellerOrderSummary,
): SellerOperationalOrderView {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    statusLabel: SELLER_ORDER_STATUS_LABELS[order.status] ?? order.status,
    statusTone: statusTone(order.status, order.isOverdue),
    fulfillmentType: order.fulfillmentType,
    fulfillmentLabel: order.fulfillmentType === "SELLER_PICKUP" ? "Самовывоз" : "Доставка",
    isOverdue: order.isOverdue,
    buyerName: order.buyerLabel?.trim() || "Покупатель",
    sellerSubtotal: order.sellerSubtotal.amount,
    currency: order.sellerSubtotal.currency,
    itemCount: order.itemCount,
    previewTitle: order.previewTitle,
    createdAt: order.createdAt,
    createdAtLabel: formatOrderDate(order.createdAt),
  };
}

export function sellerOrderDetailToView(
  detail: import("../../../domain/contracts/entities/seller").SellerOrderDetail,
): SellerOrderDetailView {
  const base = sellerOrderToOperationalView(detail);
  return {
    ...base,
    buyerEmail: detail.buyerEmail,
    updatedAt: detail.updatedAt,
    sellerItemNames: [...detail.sellerItemNames],
    items: detail.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      quantity: item.quantity,
      totalPrice: item.totalPrice.amount,
      sku: item.sku,
    })),
  };
}

export function orderToActionTask(
  order: SellerOperationalOrderView,
  actionKind: SellerActionKind,
): import("../seller-view").SellerWorkspaceItemView {
  return {
    id: `${order.id}-${actionKind}`,
    title: `Заказ № ${order.orderNumber}`,
    subtitle: `${order.statusLabel} · ${order.fulfillmentLabel}`,
    priority: order.isOverdue ? "urgent" : order.status === "READY_FOR_SHIPMENT" ? "important" : "routine",
    source: "orders",
    section: order.status === "READY_FOR_SHIPMENT" ? "awaiting_shipment" : "todays_work",
    action: "orders",
    entityId: order.id,
    resumeKey: `order:${order.id}`,
    completedAt: null,
    actionKind,
    actionPayload: {
      orderId: order.id,
      orderNumber: order.orderNumber,
    },
    supportsUndo: [
      "confirm_order",
      "ship_order",
      "ready_for_shipment",
      "ready_for_pickup",
      "mark_picked_up",
      "cancel_order",
    ].includes(actionKind),
  };
}
