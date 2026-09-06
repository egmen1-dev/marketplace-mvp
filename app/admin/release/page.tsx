import { getReleasePromotionDashboard } from "@/lib/release/promotion";

export const metadata = { title: "Release Pipeline" };

export const dynamic = "force-dynamic";

export default async function AdminReleasePage() {
  const dashboard = await getReleasePromotionDashboard();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Release pipeline</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          EPIC-110 — Git SHA, Railway deploy parity, beta routes, promotion stack
        </p>
      </div>

      <section className="rounded-xl border border-border p-4">
        <p className="text-sm font-semibold">
          Verdict:{" "}
          <span
            className={
              dashboard.verdict === "READY_FOR_CLOSED_BETA" ? "text-green-600" : "text-red-600"
            }
          >
            {dashboard.verdict}
          </span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Generated {dashboard.generatedAt}</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs uppercase text-muted-foreground">Current SHA (Railway)</p>
          <p className="font-mono text-lg">{dashboard.sha.railway || "—"}</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs uppercase text-muted-foreground">Git origin/main</p>
          <p className="font-mono text-lg">{dashboard.sha.originMain}</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs uppercase text-muted-foreground">Version</p>
          <p className="text-lg">{dashboard.currentRelease.version ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs uppercase text-muted-foreground">SHA parity</p>
          <p className="text-lg">{dashboard.sha.allMatch ? "PASS" : "FAIL"}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border p-4">
          <h2 className="mb-3 font-semibold">Promotion stack</h2>
          <p className="text-sm text-muted-foreground">
            Merged {dashboard.stackSummary.merged}/{dashboard.stackSummary.total} · Draft{" "}
            {dashboard.stackSummary.draft} · Linear {dashboard.stackSummary.linear ? "yes" : "no"}
          </p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <h2 className="mb-3 font-semibold">Health & beta</h2>
          <ul className="space-y-1 text-sm">
            <li>Health: {dashboard.health.verdict}</li>
            <li>Beta readiness: {dashboard.betaReadiness.verdict}</li>
            <li>Checkout route: {dashboard.checkout?.verdict ?? "—"}</li>
            <li>Dashboard route: {dashboard.dashboard?.verdict ?? "—"}</li>
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-border p-4">
        <h2 className="mb-3 font-semibold">Railway route probes</h2>
        <ul className="space-y-1 text-sm font-mono">
          {dashboard.routes.map((r) => (
            <li key={r.id}>
              {r.verdict} {r.id} → {r.httpStatus} ({r.path})
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-muted-foreground">
        CLI: <code>npm run product:epic-110:production-release</code>
      </p>
    </div>
  );
}
