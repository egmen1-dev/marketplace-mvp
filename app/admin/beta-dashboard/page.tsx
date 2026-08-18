import {
  buildBetaDashboardSnapshot,
  evaluateReleaseQualityGates,
  generateBetaExitReport,
  getCrashObservatory,
  getPerformanceObservatory,
  getUxObservatory,
  validateAllJourneys,
} from "@/lib/product-operations/beta";

export const metadata = { title: "Beta Dashboard" };

export const dynamic = "force-dynamic";

export default async function AdminBetaDashboardPage() {
  const [dashboard, crashes, perf, ux, journeys, gates, exitReport] = await Promise.all([
    buildBetaDashboardSnapshot(),
    getCrashObservatory(7, 8),
    getPerformanceObservatory(7),
    getUxObservatory(7),
    validateAllJourneys(7),
    evaluateReleaseQualityGates(),
    generateBetaExitReport(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">Closed Beta Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          EPIC-102 — crash rate, journeys, performance, feedback, release gates
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs uppercase text-muted-foreground">Crash-free sessions</p>
          <p className="text-2xl font-semibold">{dashboard.crashFreeSessions}%</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs uppercase text-muted-foreground">Active beta users</p>
          <p className="text-2xl font-semibold">{dashboard.activeBetaUsers}</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs uppercase text-muted-foreground">Buyer completion</p>
          <p className="text-2xl font-semibold">{dashboard.buyerCompletionRate}%</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs uppercase text-muted-foreground">Seller completion</p>
          <p className="text-2xl font-semibold">{dashboard.sellerCompletionRate}%</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border p-4">
          <h3 className="mb-3 font-semibold">Release quality gates</h3>
          <p className="mb-2 text-sm">
            Verdict: <span className="font-semibold">{gates.verdict}</span>
          </p>
          <ul className="space-y-1 text-sm">
            {gates.rows.map((row) => (
              <li key={row.id} className="flex justify-between gap-4">
                <span>{row.label}</span>
                <span className={row.ok ? "text-emerald-600" : "text-red-600"}>
                  {row.actual} {row.ok ? "✓" : "✗"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border p-4">
          <h3 className="mb-3 font-semibold">Beta exit report</h3>
          <p className="mb-2 text-sm">
            Recommendation: <span className="font-semibold">{exitReport.verdict}</span>
          </p>
          <p className="text-sm text-muted-foreground">{exitReport.recommendation}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border p-4">
          <h3 className="mb-3 font-semibold">Journey validation</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium">Buyer — {journeys.buyer.status}</p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                {journeys.buyer.steps.slice(0, 6).map((s) => (
                  <li key={s.step}>{s.step}: {s.sessions} sessions · {s.status}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium">Seller — {journeys.seller.status}</p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                {journeys.seller.steps.slice(0, 6).map((s) => (
                  <li key={s.step}>{s.step}: {s.sessions} sessions · {s.status}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border p-4">
          <h3 className="mb-3 font-semibold">Most opened screens · abandoned flows</h3>
          <ul className="space-y-1 text-sm">
            {dashboard.mostOpenedScreens.map((s) => (
              <li key={s.screen} className="flex justify-between">
                <span>{s.screen}</span>
                <span className="text-muted-foreground">{s.count}</span>
              </li>
            ))}
          </ul>
          <h4 className="mt-4 mb-2 text-sm font-medium">Abandoned flows</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {dashboard.mostAbandonedFlows.map((f) => (
              <li key={f.flow}>{f.flow}: {f.count}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border p-4">
          <h3 className="mb-3 font-semibold">Crash observatory (7d)</h3>
          <ul className="space-y-2 text-sm">
            {crashes.map((c) => (
              <li key={`${c.eventType}-${c.screen}`} className="flex justify-between gap-4">
                <span>{c.eventType} · {c.screen}</span>
                <span className="text-muted-foreground">{c.count} · {c.severity}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border p-4">
          <h3 className="mb-3 font-semibold">Performance observatory (P95)</h3>
          <ul className="space-y-1 text-sm">
            {perf.filter((p) => p.count > 0).slice(0, 10).map((p) => (
              <li key={p.metric} className="flex justify-between gap-4">
                <span>{p.metric}</span>
                <span className="text-muted-foreground">
                  P50 {p.p50Ms}ms · P95 {p.p95Ms}ms · n={p.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-border p-4">
        <h3 className="mb-3 font-semibold">UX observatory — confusion signals</h3>
        <ul className="grid gap-2 sm:grid-cols-2 text-sm">
          {ux.slice(0, 12).map((u) => (
            <li key={`${u.signal}-${u.screen}`} className="flex justify-between gap-4">
              <span>{u.detail} ({u.screen})</span>
              <span className="text-muted-foreground">{u.count}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
