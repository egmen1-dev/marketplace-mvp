import type { AdminDiscoveryDashboard } from "@/lib/marketplace-discovery/types";

type AdminDiscoveryDashboardProps = {
  dashboard: AdminDiscoveryDashboard;
};

export function AdminDiscoveryDashboardView({
  dashboard,
}: AdminDiscoveryDashboardProps) {
  if (!dashboard.enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        MARKETPLACE_DISCOVERY_ENABLED=false
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="admin-discovery-dashboard">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-medium">Popular Discoveries</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Какие подборки открывают
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {dashboard.topCollections.map((c) => (
              <li key={c.slug} className="flex justify-between gap-4">
                <span>{c.title}</span>
                <span className="text-muted-foreground">{c.views}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-medium">Content Performance</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Просмотры секций и клики по товарам
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Секции
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {dashboard.sectionViews.map((s) => (
                  <li key={s.section} className="flex justify-between gap-4">
                    <span>{s.section}</span>
                    <span className="text-muted-foreground">{s.views}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Клики
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {dashboard.topClicks.map((c) => (
                  <li key={c.productId} className="flex justify-between gap-4">
                    <span>{c.title}</span>
                    <span className="text-muted-foreground">{c.clicks}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-medium">Opportunities</h2>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {dashboard.opportunities.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
