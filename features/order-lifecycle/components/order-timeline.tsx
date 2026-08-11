"use client";

import type { OrderActorRole, OrderStatus } from "@prisma/client";

import { formatOrderDate, formatOrderStatus } from "@/features/orders/lib/status";
import { cn } from "@/lib/utils";

export type OrderTimelineEntry = {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  performedByRole: OrderActorRole;
  reason: string | null;
  createdAt: string;
  actorName: string | null;
};

const ROLE_LABEL: Record<OrderActorRole, string> = {
  BUYER: "Покупатель",
  SELLER: "Продавец",
  ADMIN: "Админ",
  SYSTEM: "Система",
  PAYMENT: "Оплата",
};

type OrderTimelineProps = {
  entries: OrderTimelineEntry[];
  expectedNextAction?: string | null;
  className?: string;
};

export function OrderTimeline({
  entries,
  expectedNextAction,
  className,
}: OrderTimelineProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">История пока пуста</p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {expectedNextAction ? (
        <p className="rounded-xl border border-border bg-surface/50 px-3 py-2 text-sm text-muted-foreground">
          Далее:{" "}
          <span className="font-medium text-foreground">
            {expectedNextAction}
          </span>
        </p>
      ) : null}
      <ol className="relative space-y-0 border-l border-border pl-5">
        {entries.map((entry, index) => {
          const isLast = index === entries.length - 1;
          return (
            <li key={entry.id} className="relative pb-6 last:pb-0">
              <span
                className={cn(
                  "absolute -left-[1.4rem] top-1 size-2.5 rounded-full border-2 border-background",
                  isLast ? "bg-primary" : "bg-muted-foreground/50",
                )}
                aria-hidden
              />
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium text-foreground">
                  {formatOrderStatus(entry.toStatus)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatOrderDate(entry.createdAt)}
                  {" · "}
                  {ROLE_LABEL[entry.performedByRole]}
                  {entry.actorName ? ` (${entry.actorName})` : ""}
                </p>
                {entry.reason ? (
                  <p className="text-xs text-muted-foreground">{entry.reason}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
