import Link from "next/link";

import type { BuyerExecutionAction } from "@/lib/marketplace-execution/types";

type BuyerExecutionActionsStripProps = {
  actions: BuyerExecutionAction[];
};

export function BuyerExecutionActionsStrip({
  actions,
}: BuyerExecutionActionsStripProps) {
  if (actions.length === 0) return null;

  return (
    <div
      className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm"
      data-testid="buyer-execution-actions"
    >
      <p className="mb-2 font-medium">Execution actions (advisory)</p>
      <ul className="space-y-2">
        {actions.map((action) => (
          <li key={action.query}>
            <span className="text-foreground">{action.headline}</span>
            <span className="block text-xs text-muted-foreground">
              {action.description}
            </span>
            <Link
              href={action.href}
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              {action.actionLabel} →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
