"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  adminResolveDisputeBuyerAction,
  adminResolveDisputeSellerAction,
} from "@/features/trust/actions";
import type { AdminDisputeRow } from "@/lib/trust/types";
import {
  DISPUTE_REASON_LABELS,
  DISPUTE_STATUS_LABELS,
} from "@/lib/trust/types";
import { adminOrderPath, ROUTES } from "@/lib/constants";
import Link from "next/link";
import { toastError } from "@/lib/toasts";
import { toast } from "sonner";

type AdminDisputesPanelProps = {
  rows: AdminDisputeRow[];
  filter: string;
};

export function AdminDisputesPanel({ rows, filter }: AdminDisputesPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function resolve(
    action: (id: string) => Promise<{ ok: boolean; error?: string }>,
    disputeId: string,
    okMsg: string,
  ) {
    startTransition(async () => {
      const res = await action(disputeId);
      if (res.ok) {
        toast.success(okMsg);
        router.refresh();
      } else {
        toastError(res.error ?? "Ошибка");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4" data-testid="admin-disputes-panel">
      <div className="flex flex-wrap gap-2">
        {(["ALL", "OPEN", "UNDER_REVIEW", "RESOLVED"] as const).map((value) => (
          <Link
            key={value}
            href={
              value === "ALL"
                ? ROUTES.ADMIN_DISPUTES
                : `${ROUTES.ADMIN_DISPUTES}?status=${value}`
            }
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              filter === value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {value === "ALL"
              ? "Все"
              : value === "OPEN"
                ? "Открытые"
                : value === "UNDER_REVIEW"
                  ? "На рассмотрении"
                  : "Решённые"}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Споров нет</p>
      ) : (
        rows.map((row) => (
          <article
            key={row.id}
            className="rounded-2xl border border-border bg-card p-4"
            data-testid={`admin-dispute-row-${row.id}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link
                  href={adminOrderPath(row.orderId)}
                  className="font-medium hover:text-primary"
                >
                  Заказ {row.orderNumber}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  {row.productName} · {row.sellerName}
                </p>
                <p className="text-sm text-muted-foreground">
                  Покупатель: {row.buyerEmail}
                </p>
              </div>
              <Badge variant="secondary">
                {DISPUTE_STATUS_LABELS[row.status]}
              </Badge>
            </div>
            <p className="mt-3 text-sm">
              Причина: {DISPUTE_REASON_LABELS[row.reason]}
            </p>
            {(row.status === "OPEN" || row.status === "UNDER_REVIEW") && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    resolve(
                      adminResolveDisputeBuyerAction,
                      row.id,
                      "Решение в пользу покупателя",
                    )
                  }
                  data-testid={`dispute-buyer-win-${row.id}`}
                >
                  В пользу покупателя
                </Button>
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    resolve(
                      adminResolveDisputeSellerAction,
                      row.id,
                      "Решение в пользу продавца",
                    )
                  }
                  data-testid={`dispute-seller-win-${row.id}`}
                >
                  В пользу продавца
                </Button>
              </div>
            )}
          </article>
        ))
      )}
    </div>
  );
}
