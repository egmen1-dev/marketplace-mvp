import Link from "next/link";

import { buildClosedAlphaConsole } from "@/lib/product-operations/closed-alpha";
import { listFeedback } from "@/lib/product-operations/feedback";
import { getReleaseIntelligence, getReleaseIntelligenceSummary } from "@/lib/product-operations/release";
import { ROUTES } from "@/lib/constants";

export const metadata = { title: "Closed Alpha Console" };

export const dynamic = "force-dynamic";

export default async function AdminClosedAlphaPage() {
  const [consoleData, feedback, releaseIntel, releaseSummary] = await Promise.all([
    buildClosedAlphaConsole(),
    listFeedback(20),
    getReleaseIntelligence(),
    getReleaseIntelligenceSummary(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">Closed Alpha Console</h2>
        <p className="text-sm text-muted-foreground">
          Testers · versions · feedback · stability · Open Alpha decision support
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs uppercase text-muted-foreground">Verdict</p>
          <p className="text-2xl font-semibold">{consoleData.stability.verdict}</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs uppercase text-muted-foreground">Crash-free</p>
          <p className="text-2xl font-semibold">{consoleData.stability.crashFreeRate}%</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs uppercase text-muted-foreground">Testers</p>
          <p className="text-2xl font-semibold">{consoleData.testers.length}</p>
        </div>
      </section>

      <section>
        <h3 className="mb-3 font-semibold">Testers & versions</h3>
        <ul className="space-y-2 text-sm">
          {consoleData.testers.map((t) => (
            <li key={t.id} className="rounded-lg border border-border px-3 py-2">
              {t.email} · {t.status}
              {t.versionCode ? ` · v${t.versionCode}` : ""}
              {t.deviceModel ? ` · ${t.deviceModel}` : ""}
              <span className="text-muted-foreground"> · fb {t.feedbackCount}</span>
            </li>
          ))}
          {consoleData.testers.length === 0 ? (
            <li className="text-muted-foreground">No testers — assign via Mobile Releases</li>
          ) : null}
        </ul>
        <Link href={ROUTES.ADMIN_MOBILE_RELEASES} className="mt-2 inline-block text-sm text-primary underline">
          Manage releases & testers
        </Link>
      </section>

      <section>
        <h3 className="mb-3 font-semibold">Active version distribution</h3>
        <ul className="space-y-2 text-sm">
          {releaseSummary.versionDistribution.map((row) => (
            <li key={row.versionCode} className="rounded-lg border border-border px-3 py-2">
              {row.versionName} → {row.deviceCount} device{row.deviceCount === 1 ? "" : "s"}
            </li>
          ))}
          {releaseSummary.versionDistribution.length === 0 ? (
            <li className="text-muted-foreground">No session telemetry yet</li>
          ) : null}
        </ul>
      </section>

      <section>
        <h3 className="mb-3 font-semibold">Release intelligence</h3>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2">Version</th>
                <th className="px-3 py-2">Active devices</th>
                <th className="px-3 py-2">Update viewed</th>
                <th className="px-3 py-2">Update started</th>
                <th className="px-3 py-2">Deferred</th>
                <th className="px-3 py-2">Crashes</th>
                <th className="px-3 py-2">Sessions</th>
                <th className="px-3 py-2">Rollback risk</th>
              </tr>
            </thead>
            <tbody>
              {releaseIntel.map((r) => (
                <tr key={r.releaseId} className="border-t border-border">
                  <td className="px-3 py-2">
                    {r.versionName} ({r.versionCode})
                  </td>
                  <td className="px-3 py-2">{r.activeVersionDistribution}</td>
                  <td className="px-3 py-2">{r.updateViewed}</td>
                  <td className="px-3 py-2">{r.updateStarted}</td>
                  <td className="px-3 py-2">{r.updateDeferred}</td>
                  <td className="px-3 py-2">{r.crashes}</td>
                  <td className="px-3 py-2">{r.sessions}</td>
                  <td className="px-3 py-2">{r.rollbackRisk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="mb-3 font-semibold">Feedback intelligence</h3>
        <ul className="space-y-2 text-sm">
          {feedback.map((f) => (
            <li key={f.id} className="rounded-lg border border-border px-3 py-2">
              <span className="font-medium">{f.classification}</span> · {f.content.slice(0, 120)}
            </li>
          ))}
          {feedback.length === 0 ? <li className="text-muted-foreground">No feedback yet</li> : null}
        </ul>
      </section>
    </div>
  );
}
