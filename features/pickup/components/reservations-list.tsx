"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { PickupReservationStatus } from "@prisma/client";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  cancelReservationByBuyerAction,
  updateReservationStatusAction,
} from "@/features/pickup/actions";
import { PICKUP_RESERVATION_STATUS_LABELS } from "@/features/pickup/lib/prepayment";
import type { PickupReservationListItem } from "@/features/pickup/queries";
import { formatPrice } from "@/features/products/mappers";
import { toast } from "sonner";
import { orderPath, ROUTES } from "@/lib/constants";
import { toastError } from "@/lib/toasts";

type Props = {
  reservations: PickupReservationListItem[];
  mode: "buyer" | "seller" | "admin";
};

function nextSellerActions(
  status: PickupReservationStatus,
): { status: PickupReservationStatus; label: string }[] {
  switch (status) {
    case "PENDING":
      return [
        { status: "CONFIRMED", label: "Подтвердить" },
        { status: "CANCELLED", label: "Отклонить" },
      ];
    case "CONFIRMED":
      return [
        { status: "READY", label: "Готово к выдаче" },
        { status: "CANCELLED", label: "Отменить" },
      ];
    case "READY":
      return [
        { status: "COMPLETED", label: "Выдано" },
        { status: "CANCELLED", label: "Отменить" },
      ];
    default:
      return [];
  }
}

export function ReservationsList({ reservations, mode }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (reservations.length === 0) {
    return (
      <div
        className="rounded-2xl border border-dashed border-border bg-card/40 px-5 py-10 text-center"
        data-testid="reservations-empty"
      >
        <p className="font-heading text-base font-semibold">
          У вас пока нет бронирований.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "seller"
            ? "Когда покупатель забронирует товар с самовывозом, заявка появится здесь."
            : "Выберите товар с самовывозом и нажмите «Забронировать»."}
        </p>
        {mode === "buyer" ? (
          <Button
            className="mt-4"
            nativeButton={false}
            render={<Link href={ROUTES.CATALOG} />}
          >
            Перейти в каталог
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3" data-testid="reservations-list">
      {reservations.map((r) => (
        <li
          key={r.id}
          className="rounded-2xl border border-border bg-card/60 p-4"
          data-testid="reservation-card"
          data-status={r.status}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1 text-sm">
              <p className="font-heading font-semibold">{r.product.title}</p>
              <p className="text-muted-foreground">
                {mode === "seller"
                  ? `Покупатель: ${r.buyer.name ?? r.buyer.email}`
                  : mode === "admin"
                    ? `${r.buyer.name ?? r.buyer.email} · ${r.seller.storeName}`
                    : `Продавец: ${r.seller.storeName}`}
              </p>
              <p className="text-muted-foreground">
                {r.pickupPoint.name} · {r.pickupPoint.city},{" "}
                {r.pickupPoint.address}
              </p>
              <p>
                Предоплата:{" "}
                <span className="font-medium tabular-nums">
                  {formatPrice(r.prepaymentAmount)}
                </span>{" "}
                ({r.prepaymentPercent}%) · Остаток:{" "}
                <span className="font-medium tabular-nums">
                  {formatPrice(r.remainingAmount)}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {PICKUP_RESERVATION_STATUS_LABELS[r.status] ?? r.status} · заказ{" "}
                <Link
                  href={orderPath(r.orderId)}
                  className="underline-offset-2 hover:underline"
                >
                  {r.orderNumber}
                </Link>
              </p>
            </div>
            {mode === "seller" ? (
              <div className="flex flex-wrap gap-2">
                {nextSellerActions(r.status).map((a) => (
                  <Button
                    key={a.status}
                    size="sm"
                    variant={a.status === "CANCELLED" ? "outline" : "default"}
                    disabled={pending}
                    data-testid={`reservation-action-${a.status.toLowerCase()}`}
                    onClick={() =>
                      start(async () => {
                        const res = await updateReservationStatusAction(
                          r.id,
                          a.status,
                        );
                        if (!res.ok) toastError(res.error);
                        else {
                          toast.success("Статус обновлён");
                          router.refresh();
                        }
                      })
                    }
                  >
                    {a.label}
                  </Button>
                ))}
              </div>
            ) : null}
            {mode === "buyer" && r.status === "PENDING" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                data-testid="reservation-cancel"
                onClick={() =>
                  start(async () => {
                    const res = await cancelReservationByBuyerAction(r.id);
                    if (!res.ok) toastError(res.error);
                    else {
                      toast.success("Бронь отменена");
                      router.refresh();
                    }
                  })
                }
              >
                Отменить
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
