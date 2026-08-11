"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  deletePickupPointAction,
  togglePickupPointAction,
} from "@/features/pickup/actions";
import type { PickupPointDto } from "@/features/pickup/queries";
import { toast } from "sonner";
import { ROUTES } from "@/lib/constants";
import { toastError } from "@/lib/toasts";
import { cn } from "@/lib/utils";

type Props = {
  points: PickupPointDto[];
};

export function PickupPointsList({ points }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (points.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/40 px-5 py-10 text-center">
        <p className="font-heading text-base font-semibold">
          У вас нет точек самовывоза
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Добавьте адрес самовывоза, чтобы покупатели могли забирать товары.
        </p>
        <Button
          className="mt-4"
          nativeButton={false}
          render={<Link href={ROUTES.ACCOUNT_PICKUP_POINTS_NEW} />}
        >
          Добавить точку
        </Button>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {points.map((p) => (
        <li
          key={p.id}
          className={cn(
            "rounded-2xl border border-border bg-card/60 p-4",
            !p.isActive && "opacity-70",
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-heading text-sm font-semibold">{p.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {p.city}, {p.address}
              </p>
              {p.workingHours ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.workingHours}
                </p>
              ) : null}
              <p className="mt-2 text-xs font-medium">
                {p.isActive ? "Активна" : "Отключена"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={
                  <Link href={`${ROUTES.ACCOUNT_PICKUP_POINTS}/${p.id}/edit`} />
                }
              >
                Изменить
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await togglePickupPointAction(p.id, !p.isActive);
                    if (!r.ok) toastError(r.error);
                    else {
                      toast.success(p.isActive ? "Отключена" : "Включена");
                      router.refresh();
                    }
                  })
                }
              >
                {p.isActive ? "Отключить" : "Включить"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    if (!confirm("Удалить точку самовывоза?")) return;
                    const r = await deletePickupPointAction(p.id);
                    if (!r.ok) toastError(r.error);
                    else {
                      toast.success("Удалено");
                      router.refresh();
                    }
                  })
                }
              >
                Удалить
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
