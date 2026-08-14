import { PayoutRequestStatus } from "@prisma/client";

import { ROUTES } from "@/lib/constants";

import { isSellerPayoutEnabled } from "./flags";
import { listSellerPayoutRequests } from "./requests";
import type { PayoutNotification } from "./types";

export async function getPayoutNotifications(input: {
  sellerProfileId: string;
}): Promise<PayoutNotification[]> {
  if (!isSellerPayoutEnabled()) return [];

  const requests = await listSellerPayoutRequests(input.sellerProfileId);
  const notifications: PayoutNotification[] = [];

  for (const request of requests.slice(0, 6)) {
    const base = {
      id: `payout-${request.id}`,
      href: ROUTES.ACCOUNT_PAYOUTS,
      createdAt: request.requestedAt,
      read: false,
    };

    switch (request.status) {
      case PayoutRequestStatus.REQUESTED:
      case PayoutRequestStatus.UNDER_REVIEW:
        notifications.push({
          ...base,
          type: "PAYOUT_UNDER_REVIEW",
          title: `Заявка #${request.displayNumber} на проверке`,
          body: `${request.amount.toLocaleString("ru-RU")} ₽ — мы проверим заявку и подготовим выплату`,
        });
        break;
      case PayoutRequestStatus.APPROVED:
        notifications.push({
          ...base,
          type: "PAYOUT_APPROVED",
          title: `Заявка #${request.displayNumber} одобрена`,
          body: `${request.amount.toLocaleString("ru-RU")} ₽ — выплата будет обработана`,
        });
        break;
      case PayoutRequestStatus.PROCESSING:
        notifications.push({
          ...base,
          type: "PAYOUT_PROCESSING",
          title: `Выплата #${request.displayNumber} в обработке`,
          body: `${request.amount.toLocaleString("ru-RU")} ₽`,
        });
        break;
      case PayoutRequestStatus.COMPLETED:
        notifications.push({
          ...base,
          type: "PAYOUT_COMPLETED",
          title: `Выплата #${request.displayNumber} завершена`,
          body: `${request.amount.toLocaleString("ru-RU")} ₽ получено`,
        });
        break;
      case PayoutRequestStatus.REJECTED:
        notifications.push({
          ...base,
          type: "PAYOUT_REJECTED",
          title: `Заявка #${request.displayNumber} отклонена`,
          body: request.adminNote ?? "Средства возвращены на доступный баланс",
        });
        break;
      default:
        break;
    }
  }

  if (requests[0]) {
    notifications.unshift({
      id: `payout-created-${requests[0].id}`,
      type: "PAYOUT_REQUEST_CREATED",
      title: "Заявка на вывод создана",
      body: `#${requests[0].displayNumber} · ${requests[0].amount.toLocaleString("ru-RU")} ₽`,
      href: ROUTES.ACCOUNT_PAYOUTS,
      createdAt: requests[0].requestedAt,
      read: false,
    });
  }

  return notifications.slice(0, 8);
}
