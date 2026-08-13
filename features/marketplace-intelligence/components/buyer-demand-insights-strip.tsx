import type { BuyerDemandInsight } from "@/lib/marketplace-intelligence/types";

type BuyerDemandInsightsStripProps = {
  insight: BuyerDemandInsight;
};

/** Catalog demand insight — advisory, no ranking impact. */
export function BuyerDemandInsightsStrip({
  insight,
}: BuyerDemandInsightsStripProps) {
  return (
    <div
      className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm"
      data-testid="buyer-demand-insights"
    >
      <span className="font-medium">{insight.headline}</span>{" "}
      <span className="text-muted-foreground">{insight.queries.join(" · ")}</span>
    </div>
  );
}
