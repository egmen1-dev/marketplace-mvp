import type { AdminSellerFunnel } from "@/lib/seller-lifecycle/types";

type AdminSellerFunnelPanelProps = {
  funnel: AdminSellerFunnel;
};

export function AdminSellerFunnelPanel({ funnel }: AdminSellerFunnelPanelProps) {
  if (!funnel.enabled) {
    return (
      <p className="text-sm text-muted-foreground">SELLER_LIFECYCLE_ENABLED=false</p>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4" data-testid="admin-seller-funnel">
      <h3 className="font-heading text-lg font-semibold">Seller Funnel</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {funnel.started} sellers started
      </p>
      <div className="mt-4 space-y-3">
        {funnel.steps.map((step, index) => (
          <div key={step.label} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span>{step.label}</span>
              <span className="font-medium tabular-nums">{step.count}</span>
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>{step.percentOfStarted}% от старта</span>
              {index > 0 && step.percentOfPrevious != null ? (
                <span>↓ {step.percentOfPrevious}%</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
