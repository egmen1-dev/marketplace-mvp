import Link from "next/link";

import type { AdminUxOverview } from "@/lib/marketplace-ux-completion/types";

type AdminUxOverviewDashboardProps = {
  overview: AdminUxOverview;
};

export function AdminUxOverviewDashboard({ overview }: AdminUxOverviewDashboardProps) {
  if (!overview.enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        MARKETPLACE_UX_COMPLETION_ENABLED=false
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="admin-ux-overview-dashboard">
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-medium">Marketplace Health</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {overview.healthBlocks.map((block) => (
            <Link
              key={block.label}
              href={block.href}
              className="rounded-xl border border-border/80 bg-surface/40 p-4 transition-colors hover:border-primary/40"
            >
              <p className="font-medium">{block.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{block.status}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-medium">Что требует внимания</h2>
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          {overview.attention.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-medium">AI рекомендации</h2>
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          {overview.aiTips.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
