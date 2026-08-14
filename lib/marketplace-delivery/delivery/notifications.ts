import { DeliveryStatus } from "@prisma/client";

import { dispatchOrderNotification } from "@/features/notifications/order-notifications";

const STATUS_TITLES: Partial<Record<DeliveryStatus, string>> = {
  CREATED: "Отправление создано",
  READY_FOR_PICKUP: "Готово к передаче в доставку",
  PICKED_UP: "Заказ передан в доставку",
  IN_TRANSIT: "Заказ в пути",
  AT_PICKUP_POINT: "Заказ в пункте выдачи",
  DELIVERED: "Заказ доставлен",
  FAILED: "Проблема с доставкой",
  CANCELLED: "Доставка отменена",
};

export async function notifyBuyerDeliveryStatus(input: {
  orderId: string;
  orderNumber: string;
  buyerUserId: string;
  deliveryStatus: DeliveryStatus;
}): Promise<void> {
  const title = STATUS_TITLES[input.deliveryStatus] ?? "Обновление доставки";
  await dispatchOrderNotification({
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    userId: input.buyerUserId,
    title,
    body: `Заказ ${input.orderNumber}: ${title.toLowerCase()}`,
    channels: ["in_app"],
  });
}

export async function notifySellerNewOrderToShip(input: {
  orderId: string;
  orderNumber: string;
  sellerUserId: string;
}): Promise<void> {
  await dispatchOrderNotification({
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    userId: input.sellerUserId,
    title: "Новый заказ к отправке",
    body: `Заказ ${input.orderNumber} оплачен — подготовьте отправление`,
    channels: ["in_app"],
  });
}

export async function notifySellerShipmentCreated(input: {
  orderId: string;
  orderNumber: string;
  sellerUserId: string;
  trackingNumber: string;
}): Promise<void> {
  await dispatchOrderNotification({
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    userId: input.sellerUserId,
    title: "Отправление создано",
    body: `Трек ${input.trackingNumber} для заказа ${input.orderNumber}`,
    channels: ["in_app"],
  });
}

export async function notifySellerDeliveryCompleted(input: {
  orderId: string;
  orderNumber: string;
  sellerUserId: string;
}): Promise<void> {
  await dispatchOrderNotification({
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    userId: input.sellerUserId,
    title: "Доставка завершена",
    body: `Заказ ${input.orderNumber} получен покупателем`,
    channels: ["in_app"],
  });
}
