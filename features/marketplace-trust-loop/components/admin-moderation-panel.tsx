"use client";

import Link from "next/link";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  adminApproveProductAction,
  adminApproveReviewAction,
  adminEscalateProductAction,
  adminNeedsChangesProductAction,
  adminRejectProductAction,
  adminRejectReviewAction,
} from "@/lib/marketplace-trust-loop/reviews/actions";

type ModerationQueueItem = {
  id: string;
  type: string;
  entityId: string;
  summary: string | null;
  riskLevel: string | null;
  seller: { storeName: string } | null;
};

type AdminModerationPanelProps = {
  queue: ModerationQueueItem[];
  summary: {
    pending?: number;
    needsFix?: number;
    rejected?: number;
    highRisk?: number;
    overdue?: number;
    newProducts?: number;
    reviews?: number;
    reports?: number;
    suspicious?: number;
  };
};

export function AdminModerationPanel({ queue, summary }: AdminModerationPanelProps) {
  const [, startTransition] = useTransition();

  function act(fn: (id: string, notes?: string) => Promise<{ ok: boolean }>, id: string, notes?: string) {
    startTransition(() => {
      void fn(id, notes);
    });
  }

  const counters = [
    { label: "На проверке", value: summary.pending ?? summary.newProducts ?? 0 },
    { label: "Нужно исправить", value: summary.needsFix ?? 0 },
    { label: "Высокий риск", value: summary.highRisk ?? summary.suspicious ?? 0 },
    { label: "Просрочены", value: summary.overdue ?? 0 },
  ];

  return (
    <div className="flex flex-col gap-6" data-testid="admin-moderation-panel">
      <div className="grid gap-3 sm:grid-cols-4">
        {counters.map((row) => (
          <article key={row.label} className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground">{row.label}</p>
            <p className="font-heading text-xl font-semibold tabular-nums">{row.value}</p>
          </article>
        ))}
      </div>

      <div className="space-y-3">
        {queue.map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-border p-4 text-sm"
            data-testid={`moderation-item-${item.id}`}
          >
            <p className="font-medium">
              {item.type} · {item.summary ?? item.entityId}
            </p>
            <p className="text-muted-foreground">
              {item.seller?.storeName ?? "—"} · риск: {item.riskLevel ?? "low"}
            </p>
            {item.type === "PRODUCT" ? (
              <p className="mt-2">
                <Link href={`/admin/moderation/${item.entityId}`} className="text-primary underline">
                  Открыть карточку ЛОТа
                </Link>
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() =>
                  act(
                    item.type === "REVIEW" ? adminApproveReviewAction : adminApproveProductAction,
                    item.entityId,
                  )
                }
              >
                Опубликовать
              </Button>
              {item.type === "PRODUCT" ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => act(adminNeedsChangesProductAction, item.entityId, "Нужно исправить")}
                >
                  Попросить исправить
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  act(
                    item.type === "REVIEW" ? adminRejectReviewAction : adminRejectProductAction,
                    item.entityId,
                  )
                }
              >
                Отклонить
              </Button>
              {item.type === "PRODUCT" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => act(adminEscalateProductAction, item.entityId)}
                >
                  Эскалировать
                </Button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
