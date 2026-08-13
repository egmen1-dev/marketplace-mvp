"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  buyerCancelOrderAction,
  buyerConfirmReceivedAction,
  buyerRequestReturnAction,
} from "@/features/order-lifecycle/actions";
import { toastError } from "@/lib/toasts";

type BuyerOrderActionsProps = {
  orderId: string;
  status: OrderStatus;
};

export function BuyerOrderActions({ orderId, status }: BuyerOrderActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const canCancel =
    status === "NEW" ||
    status === "AWAITING_SELLER_CONFIRMATION" ||
    status === "PAID";
  const canConfirm =
    status === "DELIVERED" || status === "PICKED_UP";
  const canReturn =
    status === "DELIVERED" ||
    status === "COMPLETED" ||
    status === "AWAITING_BUYER_CONFIRMATION" ||
    status === "PROTECTION_PERIOD";

  if (
    status === "AWAITING_BUYER_CONFIRMATION" ||
    status === "PROTECTION_PERIOD" ||
    status === "DISPUTE_OPEN"
  ) {
    return null;
  }

  if (!canCancel && !canConfirm && !canReturn) return null;

  function run(
    action: (id: string) => Promise<{ ok: boolean; error?: string }>,
    okMsg: string,
  ) {
    startTransition(async () => {
      const res = await action(orderId);
      if (res.ok) {
        toast.success(okMsg);
        router.refresh();
      } else {
        toastError(res.error ?? "Ошибка");
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canCancel ? (
        <Button
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={() => run(buyerCancelOrderAction, "Заказ отменён")}
        >
          Отменить заказ
        </Button>
      ) : null}
      {canConfirm ? (
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            run(buyerConfirmReceivedAction, "Получение подтверждено")
          }
        >
          Подтвердить получение
        </Button>
      ) : null}
      {canReturn ? (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(buyerRequestReturnAction, "Запрос на возврат создан")
          }
        >
          Запросить возврат
        </Button>
      ) : null}
      <Button variant="outline" size="sm" disabled title="Скоро">
        Скачать чек
      </Button>
    </div>
  );
}
