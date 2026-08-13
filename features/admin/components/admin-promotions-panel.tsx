"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { AdminPromotionRow } from "@/lib/promotion/types";
import { ROUTES } from "@/lib/constants";

type AdminPromotionsPanelProps = {
  rows: AdminPromotionRow[];
  counts: { started: number; paused: number; ended: number };
};

function statusBadge(status: AdminPromotionRow["status"]) {
  if (status === "STARTED") {
    return <Badge className="bg-primary text-primary-foreground">STARTED</Badge>;
  }
  if (status === "PAUSED") {
    return <Badge variant="secondary">PAUSED</Badge>;
  }
  return <Badge variant="outline">ENDED</Badge>;
}

export function AdminPromotionsPanel({ rows, counts }: AdminPromotionsPanelProps) {
  return (
    <div className="flex flex-col gap-6" data-testid="admin-promotions-panel">
      <div className="grid grid-cols-3 gap-3 sm:max-w-lg">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="font-heading text-2xl font-semibold tabular-nums">{counts.started}</p>
          <p className="text-xs text-muted-foreground">Активные</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="font-heading text-2xl font-semibold tabular-nums">{counts.paused}</p>
          <p className="text-xs text-muted-foreground">На паузе</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="font-heading text-2xl font-semibold tabular-nums">{counts.ended}</p>
          <p className="text-xs text-muted-foreground">Завершены</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-3 py-2">Товар</th>
              <th className="px-3 py-2">Продавец</th>
              <th className="px-3 py-2">Статус</th>
              <th className="px-3 py-2">Quality</th>
              <th className="px-3 py-2">Старт</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  Кампаний пока нет
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.campaignId}
                  className="border-b border-border/60"
                  data-testid={`admin-promotion-row-${row.productId}`}
                >
                  <td className="px-3 py-2">
                    <Link
                      href={`${ROUTES.PRODUCT}/${row.productId}`}
                      className="font-medium hover:text-primary"
                    >
                      {row.productTitle}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{row.sellerName}</td>
                  <td className="px-3 py-2">{statusBadge(row.status)}</td>
                  <td className="px-3 py-2 tabular-nums">{row.qualityScore}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {row.startedAt
                      ? new Date(row.startedAt).toLocaleDateString("ru-RU")
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
