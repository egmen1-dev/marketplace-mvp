import { channelLabel } from "@/lib/mobile-release-platform/channels";
import { getReleaseDashboardRows } from "@/lib/mobile-release-platform/release-manager";
import { getPlatformAnalyticsOverview } from "@/lib/mobile-release-platform/analytics";
import { listTesters } from "@/lib/mobile-release-platform/distribution";
import { RELEASE_CHANNELS } from "@/lib/mobile-release-platform/types";

export const metadata = { title: "Mobile Releases" };

export const dynamic = "force-dynamic";

function formatBytes(n: number | null | undefined) {
  if (!n) return "—";
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function AdminMobileReleasesPage() {
  const [rows, analytics, testers] = await Promise.all([
    getReleaseDashboardRows(),
    getPlatformAnalyticsOverview(),
    listTesters(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">Mobile Releases</h2>
        <p className="text-sm text-muted-foreground">
          EPIC-78 Mobile Release Platform — APK registry, channels, rollout, rollback, Closed Alpha
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs uppercase text-muted-foreground">Published releases</p>
          <p className="text-2xl font-semibold">{analytics.publishedReleases}</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs uppercase text-muted-foreground">Testers</p>
          <p className="text-2xl font-semibold">{testers.length}</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs uppercase text-muted-foreground">Analytics events</p>
          <p className="text-2xl font-semibold">{Object.values(analytics.events).reduce((a, b) => a + b, 0)}</p>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-lg font-semibold">Release channels</h3>
        <div className="flex flex-wrap gap-2">
          {RELEASE_CHANNELS.map((c) => (
            <span key={c.id} className="rounded-full border border-border px-3 py-1 text-xs">
              {c.label}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-lg font-semibold">APK registry</h3>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2">Version</th>
                <th className="px-3 py-2">Channel</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">SHA256</th>
                <th className="px-3 py-2">Size</th>
                <th className="px-3 py-2">Rollout</th>
                <th className="px-3 py-2">Testers</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">
                    {r.versionName} ({r.versionCode})
                  </td>
                  <td className="px-3 py-2">{channelLabel(r.channel)}</td>
                  <td className="px-3 py-2">{r.status}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.sha256.slice(0, 12)}…</td>
                  <td className="px-3 py-2">{formatBytes(r.artifactSizeBytes)}</td>
                  <td className="px-3 py-2">{r.rolloutPercent}%</td>
                  <td className="px-3 py-2">{r._count.testerAssignments}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                    No releases yet — manifest seed on first API call
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-lg font-semibold">Closed Alpha testers</h3>
        <ul className="space-y-2 text-sm">
          {testers.map((t) => (
            <li key={t.id} className="rounded-lg border border-border px-3 py-2">
              {t.email} · {t.status}
              {t.deviceModel ? ` · ${t.deviceModel}` : ""}
            </li>
          ))}
          {testers.length === 0 ? <li className="text-muted-foreground">No testers assigned yet</li> : null}
        </ul>
      </section>

      <p className="text-xs text-muted-foreground">
        Admin actions (publish / rollback / rollout / assign tester): POST /api/admin/mobile/releases
      </p>
    </div>
  );
}
