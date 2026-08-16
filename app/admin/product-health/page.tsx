import { buildProductHealthSnapshot } from "@/lib/product-operations/health";
import { getCrashIntelligence } from "@/lib/product-operations/telemetry";
import { getUserJourneyFunnel } from "@/lib/product-operations/sessions";
import { getProductAnalyticsOverview } from "@/lib/product-operations/analytics";

export const metadata = { title: "Product Health" };

export const dynamic = "force-dynamic";

function statusClass(status: string) {
  if (status === "healthy") return "text-emerald-600";
  if (status === "degraded") return "text-amber-600";
  return "text-red-600";
}

export default async function AdminProductHealthPage() {
  const [health, crashes, journey, analytics] = await Promise.all([
    buildProductHealthSnapshot(),
    getCrashIntelligence(8),
    getUserJourneyFunnel(7),
    getProductAnalyticsOverview(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">Product Health Center</h2>
        <p className="text-sm text-muted-foreground">
          EPIC-79 POP — backend, mobile, marketplace, CCOS, API, errors, crashes
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs uppercase text-muted-foreground">Overall</p>
          <p className={`text-2xl font-semibold capitalize ${statusClass(health.overall)}`}>{health.overall}</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs uppercase text-muted-foreground">Crash-free rate</p>
          <p className="text-2xl font-semibold">{analytics.crashFreeRate}%</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs uppercase text-muted-foreground">Errors 24h</p>
          <p className="text-2xl font-semibold">{health.errors24h}</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs uppercase text-muted-foreground">Crashes 24h</p>
          <p className="text-2xl font-semibold">{health.crashes24h}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border p-4">
          <h3 className="mb-3 font-semibold">Backend · Mobile · Marketplace · CCOS</h3>
          <ul className="space-y-2 text-sm">
            <li>Backend: {health.backend.ok ? "OK" : "FAIL"}</li>
            <li>Database: {health.database.ok ? "OK" : "FAIL"}</li>
            <li>Storage: {health.storage.configured ? "configured" : "not configured"}</li>
            <li>Mobile readiness: {health.mobile.readiness ? "PASS" : "WARN"}</li>
            <li>Published releases: {health.mobile.publishedReleases}</li>
            <li>Marketplace orders today: {health.marketplace.ordersToday}</li>
            <li>Payment success: {health.marketplace.paymentSuccessRate}%</li>
            <li>CCOS: {health.ccos.enabled ? "enabled" : "off"} · brain {health.ccos.brainVersion}</li>
            <li>API commit: {health.api.version}</li>
          </ul>
        </div>

        <div className="rounded-xl border border-border p-4">
          <h3 className="mb-3 font-semibold">User journey funnel (7d)</h3>
          <ul className="space-y-1 text-sm">
            {journey.map((step) => (
              <li key={step.screen} className="flex justify-between gap-4">
                <span>{step.screen}</span>
                <span className="text-muted-foreground">
                  {step.count} · drop {step.dropOffRate}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <h3 className="mb-3 font-semibold">Crash intelligence</h3>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Screen</th>
                <th className="px-3 py-2">Count</th>
                <th className="px-3 py-2">Severity</th>
                <th className="px-3 py-2">Probability</th>
              </tr>
            </thead>
            <tbody>
              {crashes.map((row) => (
                <tr key={`${row.eventType}-${row.screens[0]}`} className="border-t border-border">
                  <td className="px-3 py-2">{row.eventType}</td>
                  <td className="px-3 py-2">{row.screens.join(", ") || "—"}</td>
                  <td className="px-3 py-2">{row.count}</td>
                  <td className="px-3 py-2">{row.severity}</td>
                  <td className="px-3 py-2">{row.probability}%</td>
                </tr>
              ))}
              {crashes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    No crash events recorded yet
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">Evaluated at {health.evaluatedAt}</p>
    </div>
  );
}
