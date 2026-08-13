import type { BuyerDemandAction } from "@/lib/marketplace-operator/types";

type BuyerDemandActionsStripProps = {
  actions: BuyerDemandAction[];
};

export function BuyerDemandActionsStrip({
  actions,
}: BuyerDemandActionsStripProps) {
  if (actions.length === 0) return null;

  return (
    <div
      className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm"
      data-testid="buyer-demand-actions"
    >
      <p className="mb-2 font-medium">Demand actions</p>
      <ul className="space-y-2 text-muted-foreground">
        {actions.map((action) => (
          <li key={action.query}>
            <span className="text-foreground">{action.headline}</span>
            <span className="block text-xs">{action.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
