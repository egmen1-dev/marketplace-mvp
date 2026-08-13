"use client";

import Link from "next/link";

import type { AdminPromotionIntelligenceSummary } from "@/lib/promotion/intelligence/types";
import { ROUTES } from "@/lib/constants";
import { formatPrice } from "@/features/products/mappers";

type AdminPromotionIntelligencePanelProps = {
  intelligence: AdminPromotionIntelligenceSummary;
};

export function AdminPromotionIntelligencePanel({
  intelligence,
}: AdminPromotionIntelligencePanelProps) {
  return (
    <section
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4"
      data-testid="admin-promotion-intelligence"
    >
      <h3 className="font-heading text-base font-medium">AI Opportunities</h3>
      <p className="text-sm text-muted-foreground">{intelligence.headline}</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Высокий потенциал</p>
          <p
            className="font-heading text-xl tabular-nums"
            data-testid="admin-intelligence-high-potential"
          >
            {intelligence.highPotentialCount}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Готовы без кампании</p>
          <p
            className="font-heading text-xl tabular-nums"
            data-testid="admin-intelligence-ready-unpromoted"
          >
            {intelligence.readyWithoutCampaignCount}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Потерянная выручка (оценка)</p>
          <p
            className="font-heading text-xl tabular-nums"
            data-testid="admin-intelligence-missed-revenue"
          >
            {formatPrice(intelligence.estimatedMissedRevenue, "RUB")}
          </p>
        </div>
      </div>

      {intelligence.topOpportunities.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="px-3 py-2">Товар</th>
                <th className="px-3 py-2">Продавец</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">План</th>
              </tr>
            </thead>
            <tbody>
              {intelligence.topOpportunities.map((row) => (
                <tr
                  key={row.productId}
                  className="border-b border-border/60"
                  data-testid={`admin-intelligence-row-${row.productId}`}
                >
                  <td className="px-3 py-2">
                    <Link
                      href={`${ROUTES.PRODUCT}/${row.productId}`}
                      className="hover:text-primary"
                    >
                      {row.productTitle}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.sellerName}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{row.score}/100</td>
                  <td className="px-3 py-2">{row.recommendedPlan ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
