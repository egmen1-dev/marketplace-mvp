import type { AdminTrustInsightsSnapshot } from "@/lib/marketplace-trust-conversion/types";

type AdminTrustInsightsPanelProps = {
  insights: AdminTrustInsightsSnapshot;
};

export function AdminTrustInsightsPanel({ insights }: AdminTrustInsightsPanelProps) {
  return (
    <section
      className="rounded-2xl border border-border bg-card p-5"
      data-testid="admin-trust-insights"
    >
      <h3 className="font-heading text-lg font-semibold">Главные причины потери доверия</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Топ сигналов за {insights.windowDays} дн.
      </p>

      <ol className="mt-4 space-y-2">
        {insights.topReasons.map((item) => (
          <li
            key={item.rank}
            className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 px-3 py-2 text-sm"
          >
            <span>
              <span className="font-medium">{item.rank}.</span> {item.reason}
            </span>
            <span className="shrink-0 text-muted-foreground tabular-nums">
              {item.sharePercent}%
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
