import type { AdminConversionCenter } from "@/lib/marketplace-conversion/queries";

import { ConversionFunnelDisplay } from "./conversion-funnel-display";
import { ConversionRecommendationCard } from "./conversion-recommendation-card";

type AdminConversionCenterPanelProps = {
  center: AdminConversionCenter;
};

export function AdminConversionCenterPanel({ center }: AdminConversionCenterPanelProps) {
  if (!center.enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        MARKETPLACE_CONVERSION_ENABLED=false — используется базовый conversion dashboard
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="admin-conversion-center">
      <ConversionFunnelDisplay steps={center.funnel} summary={center.funnelSummary} />

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-semibold">Biggest Problems</h2>
        <div className="mt-4 flex flex-col gap-3">
          {center.biggestProblems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Критичных проблем не найдено</p>
          ) : (
            center.biggestProblems.map((r) => (
              <ConversionRecommendationCard key={r.id} recommendation={r} />
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-semibold">Growth Opportunities</h2>
        <div className="mt-4 flex flex-col gap-3">
          {center.growthOpportunities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока нет явных возможностей</p>
          ) : (
            center.growthOpportunities.map((r) => (
              <ConversionRecommendationCard key={r.id} recommendation={r} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
