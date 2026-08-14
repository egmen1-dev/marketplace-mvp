import type { AdminSellerJourneyFunnel } from "@/lib/seller-journey/types";

type AdminSellerJourneyFunnelPanelProps = {
  funnel: AdminSellerJourneyFunnel;
};

export function AdminSellerJourneyFunnelPanel({
  funnel,
}: AdminSellerJourneyFunnelPanelProps) {
  if (!funnel.enabled) {
    return (
      <p className="text-sm text-muted-foreground">SELLER_JOURNEY_ENABLED=false</p>
    );
  }

  return (
    <div
      className="rounded-2xl border border-border bg-card p-4"
      data-testid="admin-seller-journey-funnel"
    >
      <h3 className="font-heading text-lg font-semibold">Seller Journey Funnel</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Воронка активации продавцов по всем магазинам
      </p>
      <div className="mt-4 flex flex-col gap-3">
        {funnel.steps.map((step, index) => (
          <div key={step.label} className="flex items-center gap-3">
            {index > 0 ? (
              <span className="text-muted-foreground" aria-hidden>
                ↓
              </span>
            ) : null}
            <article className="flex flex-1 items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-medium">{step.label}</p>
                <p className="text-xs text-muted-foreground">
                  {step.percentOfStarted}% от начавших
                  {step.percentOfPrevious != null
                    ? ` · ${step.percentOfPrevious}% от предыдущего шага`
                    : ""}
                </p>
              </div>
              <p className="font-heading text-xl font-semibold tabular-nums">
                {step.count}
              </p>
            </article>
          </div>
        ))}
      </div>
    </div>
  );
}
