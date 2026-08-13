"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  adminApproveProductAction,
  adminApproveReviewAction,
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
    newProducts: number;
    reviews: number;
    reports: number;
    suspicious: number;
  };
};

export function AdminModerationPanel({ queue, summary }: AdminModerationPanelProps) {
  const [, startTransition] = useTransition();

  function act(
    fn: (id: string) => Promise<{ ok: boolean }>,
    id: string,
  ) {
    startTransition(() => {
      void fn(id);
    });
  }

  return (
    <div className="flex flex-col gap-6" data-testid="admin-moderation-panel">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Новые товары", value: summary.newProducts },
          { label: "Отзывы", value: summary.reviews },
          { label: "Жалобы", value: summary.reports },
          { label: "Подозрительный контент", value: summary.suspicious },
        ].map((row) => (
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
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                onClick={() =>
                  act(
                    item.type === "REVIEW"
                      ? adminApproveReviewAction
                      : adminApproveProductAction,
                    item.entityId,
                  )
                }
              >
                Одобрить
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  act(
                    item.type === "REVIEW"
                      ? adminRejectReviewAction
                      : adminRejectProductAction,
                    item.entityId,
                  )
                }
              >
                Отклонить
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
