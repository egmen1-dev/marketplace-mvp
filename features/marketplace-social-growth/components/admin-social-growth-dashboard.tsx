import type { AdminSocialGrowthDashboard } from "@/lib/marketplace-social-growth/types";

type AdminSocialGrowthDashboardProps = {
  dashboard: AdminSocialGrowthDashboard;
};

export function AdminSocialGrowthDashboardView({
  dashboard,
}: AdminSocialGrowthDashboardProps) {
  if (!dashboard.enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        MARKETPLACE_SOCIAL_GROWTH_ENABLED=false
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="admin-social-growth-dashboard">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-medium">Viral Content</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Самые просматриваемые share-карточки
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {dashboard.topShareCards.map((row) => (
              <li key={row.productId} className="flex justify-between gap-4">
                <span>{row.productId.slice(0, 10)}</span>
                <span className="text-muted-foreground">{row.views}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-medium">Creator Analytics</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {dashboard.creatorStats.map((c) => (
              <li key={c.collectionId} className="flex justify-between gap-4">
                <span>{c.title}</span>
                <span className="text-muted-foreground">{c.views}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-medium">Growth Opportunities</h2>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {dashboard.opportunities.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
