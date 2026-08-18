import type { SellerActionKind } from "../../../domain/contracts/entities/seller";
import type { SellerOperationalOrderView } from "./seller-orders-view";

const CONFIRM_STATUSES = new Set(["NEW", "PAID", "AWAITING_SELLER_CONFIRMATION"]);
const PACK_STATUSES = new Set(["CONFIRMED", "PROCESSING"]);

export function resolveOrderMenuActions(order: SellerOperationalOrderView): SellerActionKind[] {
  const actions: SellerActionKind[] = [];

  if (CONFIRM_STATUSES.has(order.status)) {
    actions.push("confirm_order");
  }

  if (PACK_STATUSES.has(order.status)) {
    if (order.fulfillmentType === "DELIVERY") {
      actions.push("ready_for_shipment");
    } else {
      actions.push("ready_for_pickup");
    }
  }

  if (order.status === "READY_FOR_SHIPMENT" && order.fulfillmentType === "DELIVERY") {
    actions.push("ship_order");
  }

  if (order.status === "READY_FOR_PICKUP" && order.fulfillmentType === "SELLER_PICKUP") {
    actions.push("mark_picked_up");
  }

  if (
    !["CANCELLED", "COMPLETED", "DELIVERED", "PICKED_UP", "REJECTED", "REFUNDED"].includes(order.status)
  ) {
    actions.push("cancel_order");
  }

  return [...new Set(actions)];
}

export const ORDER_ACTION_LABELS: Partial<Record<SellerActionKind, string>> = {
  confirm_order: "Подтвердить заказ",
  ready_for_shipment: "Готов к отправке",
  ready_for_pickup: "Готов к выдаче",
  ship_order: "Отметить отправку",
  mark_picked_up: "Выдан покупателю",
  cancel_order: "Отменить заказ",
};
