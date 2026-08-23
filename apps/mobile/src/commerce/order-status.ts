import type { OrderStatus } from "@prisma/client";

const NEW_STATUSES: OrderStatus[] = ["NEW", "AWAITING_SELLER_CONFIRMATION", "PAID"];

export type BuyerOrderTimelineStep = {
  key: string;
  label: string;
  emoji: string;
  reached: boolean;
  current: boolean;
};

export function buildBuyerOrderTimeline(status: string): BuyerOrderTimelineStep[] {
  const normalized = status.toUpperCase() as OrderStatus;
  const steps: BuyerOrderTimelineStep[] = [
    { key: "awaiting", label: "Ожидает подтверждения", emoji: "🟠", reached: false, current: false },
    { key: "confirmed", label: "Принят продавцом", emoji: "🟢", reached: false, current: false },
    { key: "shipped", label: "Отправлен", emoji: "🚚", reached: false, current: false },
    { key: "completed", label: "Завершён", emoji: "✅", reached: false, current: false },
  ];

  if (normalized === "CANCELLED") {
    return [
      { key: "cancelled", label: "Отменён", emoji: "⚫", reached: true, current: true },
    ];
  }

  const stage =
    NEW_STATUSES.includes(normalized) ? 0
    : ["CONFIRMED", "PROCESSING", "READY_FOR_SHIPMENT", "READY_FOR_PICKUP"].includes(normalized) ? 1
    : ["SHIPPED", "IN_TRANSIT", "ARRIVED"].includes(normalized) ? 2
    : 3;

  return steps.map((step, index) => ({
    ...step,
    reached: index <= stage,
    current: index === stage,
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
    case "PICKED_UP":
      return "Выдан";
    case "DELIVERED":
      return "Доставлен";
    case "CANCELLED":
      return "Отменить";
    case "REJECTED":
      return "Отклонить";
    default:
      return "Обновить статус";
  }
}
