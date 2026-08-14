import type { AdminTrustCenterSnapshot } from "@/lib/marketplace-trust-experience/types";

type AdminTrustCenterPanelProps = {
  snapshot: AdminTrustCenterSnapshot;
};

export function AdminTrustCenterPanel({ snapshot }: AdminTrustCenterPanelProps) {
  return (
    <div className="flex flex-col gap-6" data-testid="admin-trust-center">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Средний рейтинг продавцов</p>
          <p className="font-heading text-3xl font-semibold tabular-nums">
            {snapshot.averageTrustScore}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Рост доверия</p>
          <p className="font-heading text-3xl font-semibold tabular-nums">
            {snapshot.monthlyGrowthPercent > 0 ? "+" : ""}
            {snapshot.monthlyGrowthPercent}% за месяц
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Продавцов</p>
          <p className="font-heading text-3xl font-semibold tabular-nums">
            {snapshot.sellerCount}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Высокое доверие (90+)</p>
          <p className="font-heading text-3xl font-semibold tabular-nums">
            {snapshot.highTrustPercent}%
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="font-medium">Главные причины снижения</p>
        <ol className="mt-4 space-y-2 text-sm">
          {snapshot.declineReasons.map((item, index) => (
            <li key={item.reason} className="flex items-center justify-between gap-3">
              <span>
                {index + 1}. {item.reason}
              </span>
              <span className="tabular-nums text-muted-foreground">{item.count}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
