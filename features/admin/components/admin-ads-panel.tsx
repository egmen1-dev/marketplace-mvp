"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  adEligibilityReasonLabel,
  type AdEligibilityReason,
} from "@/lib/product-advertising";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AdminAdsDashboard } from "@/features/admin/queries";

type Filter = "ALL" | "READY" | "BLOCKED";

function reasonBadges(reasons: AdEligibilityReason[]) {
  if (reasons.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {reasons.map((reason) => (
        <Badge key={reason} variant="outline" className="text-[10px]">
          {reason}
        </Badge>
      ))}
    </div>
  );
}

export function AdminAdsPanel({ data }: { data: AdminAdsDashboard }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = (searchParams.get("filter") as Filter) ?? "ALL";

  const filtered = data.products.filter((row) => {
    if (filter === "READY") return row.eligible;
    if (filter === "BLOCKED") return !row.eligible;
    return true;
  });

  const setFilter = (next: Filter) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "ALL") params.delete("filter");
    else params.set("filter", next);
    const q = params.toString();
    router.push(q ? `${ROUTES.ADMIN_ADS}?${q}` : ROUTES.ADMIN_ADS);
  };

  return (
    <div className="flex flex-col gap-6" data-testid="admin-ads-panel">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Всего товаров</p>
          <p className="font-heading text-2xl tabular-nums">{data.totalProducts}</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Готовы к рекламе</p>
          <p className="font-heading text-2xl tabular-nums text-emerald-600">
            {data.readyCount}
          </p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Требуют исправления</p>
          <p className="font-heading text-2xl tabular-nums text-amber-600">
            {data.blockedCount}
          </p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Средний quality score</p>
          <p className="font-heading text-2xl tabular-nums">{data.avgQualityScore}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["ALL", "Все"],
            ["READY", "READY"],
            ["BLOCKED", "BLOCKED"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={filter === value ? "default" : "outline"}
            data-testid={`ads-filter-${value.toLowerCase()}`}
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Problems</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-sm text-muted-foreground"
                >
                  Нет товаров для выбранного фильтра.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border/60"
                  data-testid={`ads-row-${row.id}`}
                  data-eligible={row.eligible ? "true" : "false"}
                >
                  <td className="max-w-[280px] px-3 py-2">
                    <Link
                      href={`${ROUTES.PRODUCT}/${row.id}`}
                      className="font-medium hover:text-primary"
                    >
                      {row.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {row.storeName}
                      {row.categoryName ? ` · ${row.categoryName}` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={row.eligible ? "default" : "secondary"}
                      className={cn(
                        row.eligible && "bg-emerald-600 hover:bg-emerald-600",
                      )}
                    >
                      {row.eligible ? "READY" : "BLOCKED"}
                    </Badge>
                    <p className="mt-1 text-[10px] uppercase text-muted-foreground">
                      {row.status}
                    </p>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{row.qualityScore}</td>
                  <td className="px-3 py-2">
                    {row.eligible ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <div className="space-y-1">
                        {reasonBadges(row.reasons)}
                        <p className="text-[11px] text-muted-foreground">
                          {row.reasons.map(adEligibilityReasonLabel).join("; ")}
                        </p>
                      </div>
                    )}
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
