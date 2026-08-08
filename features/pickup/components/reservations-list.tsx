"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { PickupReservationStatus } from "@prisma/client";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { updateReservationStatusAction } from "@/features/pickup/actions";
import { PICKUP_RESERVATION_STATUS_LABELS } from "@/features/pickup/lib/prepayment";
import type { PickupReservationListItem } from "@/features/pickup/queries";
import { formatPrice } from "@/features/products/mappers";
import { toast } from "sonner";
import { orderPath } from "@/lib/constants";
import { toastError } from "@/lib/toasts";

type Props = {
  reservations: PickupReservationListItem[];
  mode: "buyer" | "seller";
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
      <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        {mode === "seller"
          ? "Пока нет заявок на бронирование."
          : "У вас пока нет броней."}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {reservations.map((r) => (
        <li
          key={r.id}
          className="rounded-2xl border border-border bg-card/60 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1 text-sm">
              <p className="font-heading font-semibold">{r.product.title}</p>
              <p className="text-muted-foreground">
                {mode === "seller"
                  ? `Покупатель: ${r.buyer.name ?? r.buyer.email}`
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
          </div>
        </li>
      ))}
    </ul>
  );
}
