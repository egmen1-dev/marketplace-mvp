"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminPromotionFilter, AdminPromotionRow } from "@/lib/promotion/types";
import { PROMOTION_SURFACE_LABELS } from "@/lib/promotion/surfaces";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type AdminPromotionsPanelProps = {
  rows: AdminPromotionRow[];
  counts: { started: number; paused: number; ended: number };
  activeFilter: AdminPromotionFilter;
};

const FILTERS: { value: AdminPromotionFilter; label: string }[] = [
  { value: "ALL", label: "Все" },
  { value: "STARTED", label: "ACTIVE" },
  { value: "PAUSED", label: "PAUSED" },
  { value: "ENDED", label: "ENDED" },
];

function statusBadge(status: AdminPromotionRow["status"]) {
  if (status === "STARTED") {
    return <Badge className="bg-primary text-primary-foreground">STARTED</Badge>;
  }
  if (status === "PAUSED") {
    return <Badge variant="secondary">PAUSED</Badge>;
  }
  return <Badge variant="outline">ENDED</Badge>;
}

export function AdminPromotionsPanel({
  rows,
  counts,
  activeFilter,
}: AdminPromotionsPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setFilter(value: AdminPromotionFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "ALL") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    const q = params.toString();
    router.push(q ? `${ROUTES.ADMIN_PROMOTIONS}?${q}` : ROUTES.ADMIN_PROMOTIONS);
  }

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

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Button
            key={filter.value}
            type="button"
            size="sm"
            variant={activeFilter === filter.value ? "default" : "outline"}
            className={cn("rounded-xl")}
            onClick={() => setFilter(filter.value)}
            data-testid={`admin-promotion-filter-${filter.value}`}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-3 py-2">Товар</th>
              <th className="px-3 py-2">Продавец</th>
              <th className="px-3 py-2">Статус</th>
              <th className="px-3 py-2">Размещения</th>
              <th className="px-3 py-2">Surface</th>
              <th className="px-3 py-2">Priority</th>
              <th className="px-3 py-2">Quality</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
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
                  <td className="px-3 py-2 tabular-nums">{row.placementCount}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {row.surfaces.length > 0
                      ? row.surfaces
                          .map((s) => PROMOTION_SURFACE_LABELS[s] ?? s)
                          .join(", ")
                      : "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {row.topPriority ?? "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{row.qualityScore}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
