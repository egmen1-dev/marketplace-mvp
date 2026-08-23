export type MobileBuyerOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "SHIPPED"
  | "COMPLETED"
  | "CANCELLED";

const PENDING = ["NEW", "AWAITING_SELLER_CONFIRMATION", "PAID"];
const CONFIRMED = ["CONFIRMED", "PROCESSING", "READY_FOR_SHIPMENT", "READY_FOR_PICKUP"];
const SHIPPED = ["SHIPPED", "IN_TRANSIT", "ARRIVED"];
const COMPLETED = ["DELIVERED", "PICKED_UP", "COMPLETED"];

export function toMobileBuyerOrderStatus(status: string): MobileBuyerOrderStatus {
  const s = status.toUpperCase();
  if (s === "CANCELLED" || s === "REJECTED") return "CANCELLED";
  if (PENDING.includes(s)) return "PENDING";
  if (CONFIRMED.includes(s)) return "CONFIRMED";
  if (SHIPPED.includes(s)) return "SHIPPED";
  if (COMPLETED.includes(s)) return "COMPLETED";
  return "PENDING";
}

export const BUYER_ORDER_STATUS_LABELS: Record<MobileBuyerOrderStatus, string> = {
  PENDING: "Ожидает подтверждения",
  CONFIRMED: "Продавец принял заказ",
  SHIPPED: "Передан в доставку",
  COMPLETED: "Заказ завершён",
  CANCELLED: "Заказ отменён",
};

export function formatBuyerOrderStatus(status: string): string {
  return BUYER_ORDER_STATUS_LABELS[toMobileBuyerOrderStatus(status)];
}

export type BuyerOrderTimelineStep = {
  key: string;
  label: string;
  marker: "done" | "current" | "todo";
};

export function buildBuyerOrderTimeline(status: string): BuyerOrderTimelineStep[] {
  const bucket = toMobileBuyerOrderStatus(status);

  if (bucket === "CANCELLED") {
    return [{ key: "cancelled", label: "Заказ отменён", marker: "current" }];
  }

  const stage =
    bucket === "PENDING" ? 1
    : bucket === "CONFIRMED" ? 1
    : bucket === "SHIPPED" ? 2
    : 3;

  const steps: BuyerOrderTimelineStep[] = [
    { key: "created", label: "Заказ создан", marker: "todo" },
    { key: "confirm", label: "Продавец подтверждает", marker: "todo" },
    { key: "delivery", label: "Доставка", marker: "todo" },
    { key: "received", label: "Получение", marker: "todo" },
  ];

  return steps.map((step, index) => ({
    ...step,
    marker: index < stage ? "done" : index === stage ? "current" : "todo",
  }));
}

export function sellerOrderActionLabel(status: string): string {
  switch (status) {
    case "CONFIRMED":
      return "Принять заказ";
    case "PROCESSING":
      return "В работу";
    case "READY_FOR_SHIPMENT":
      return "Готов к отправке";
    case "SHIPPED":
      return "Передать в доставку";
    case "READY_FOR_PICKUP":
      return "Готов к выдаче";
    case "CANCELLED":
      return "Отменить";
    default:
      return "Обновить статус";
  }
}
