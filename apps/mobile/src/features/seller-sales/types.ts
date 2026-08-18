import type { MobileSellerOrderItem } from "../../api/endpoints";

export const SELLER_ORDER_STATUS_LABELS: Record<string, string> = {
  NEW: "Новый",
  PAID: "Оплачен",
  AWAITING_SELLER_CONFIRMATION: "Ожидает подтверждения",
  CONFIRMED: "Подтверждён",
  PROCESSING: "Комплектуется",
  READY_FOR_SHIPMENT: "Готов к отправке",
  SHIPPED: "Отправлен",
  IN_TRANSIT: "В пути",
  ARRIVED: "Прибыл",
  READY_FOR_PICKUP: "Готов к выдаче",
  PICKED_UP: "Выдан",
  DELIVERED: "Доставлен",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
  REJECTED: "Отклонён",
  RETURN_REQUESTED: "Возврат запрошен",
  RETURN_APPROVED: "Возврат одобрен",
  RETURNED: "Возвращён",
  REFUNDED: "Возмещён",
};

export type SellerSaleCardView = {
  id: string;
  orderNumber: string;
  status: string;
  statusLabel: string;
  buyerName: string;
  sellerSubtotal: number;
  currency: string;
  itemCount: number;
  previewTitle: string | null;
  createdAtLabel: string;
  isOverdue: boolean;
};

export function mapSellerOrderItem(order: MobileSellerOrderItem): SellerSaleCardView {
  const date = new Date(order.createdAt);
  const createdAtLabel = Number.isNaN(date.getTime())
    ? order.createdAt
    : date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    statusLabel: SELLER_ORDER_STATUS_LABELS[order.status] ?? order.status,
    buyerName: order.buyerName?.trim() || "Покупатель",
    sellerSubtotal: order.sellerSubtotal,
    currency: order.currency,
    itemCount: order.itemCount,
    previewTitle: order.sellerItemNames[0] ?? null,
    createdAtLabel,
    isOverdue: order.isOverdue,
  };
}
