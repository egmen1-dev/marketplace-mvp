import type { SystemFlagsSnapshot } from "@/lib/marketplace-deploy-visibility/types";

type SystemFlagsPanelProps = {
  snapshot: SystemFlagsSnapshot;
};

function statusBadge(on: boolean): string {
  return on ? "text-emerald-700 bg-emerald-500/10" : "text-muted-foreground bg-muted";
}

export function SystemFlagsPanel({ snapshot }: SystemFlagsPanelProps) {
  return (
    <div className="flex flex-col gap-6" data-testid="admin-system-flags">
      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-heading text-lg font-semibold">Deployment SHA</h3>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">This build</dt>
            <dd className="font-mono font-medium">{snapshot.buildCommit}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Environment</dt>
            <dd className="font-medium">{snapshot.environment}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Current main SHA</dt>
            <dd className="font-mono font-medium">{snapshot.deploy.mainSha}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Staging SHA</dt>
            <dd className="font-mono font-medium">{snapshot.deploy.stagingSha ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Commits ahead of main</dt>
            <dd className="font-medium tabular-nums">{snapshot.deploy.commitsAheadOfMain ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Staging URL</dt>
            <dd className="truncate font-mono text-xs">{snapshot.deploy.stagingUrl}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-heading text-lg font-semibold">Feature flags (runtime)</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Значения из process.env на этом инстансе · не показывает секреты
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {snapshot.requiredFlags.map((flag) => (
            <li
              key={flag.envVar}
              className="flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2 text-sm"
            >
              <span className="font-mono text-xs">{flag.envVar}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(flag.status === "ON")}`}
              >
                {flag.status}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-heading text-lg font-semibold">Module visibility matrix</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Module</th>
                <th className="pb-2 pr-3 font-medium">Flag</th>
                <th className="pb-2 pr-3 font-medium">Code</th>
                <th className="pb-2 pr-3 font-medium">UI</th>
                <th className="pb-2 pr-3 font-medium">On main</th>
                <th className="pb-2 font-medium">Staging</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.modules.map((row) => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="py-2 pr-3">
                    <p className="font-medium">{row.name}</p>
                    {row.prNumber ? (
                      <p className="text-xs text-muted-foreground">PR #{row.prNumber}</p>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${statusBadge(row.flagStatus === "ON")}`}>
                      {row.flagStatus}
                    </span>
                  </td>
                  <td className="py-2 pr-3">{row.codeExists ? "✓" : "—"}</td>
                  <td className="py-2 pr-3">{row.connectedToUi ? "✓" : "—"}</td>
                  <td className="py-2 pr-3">{row.onMainBranch ? "✓" : "—"}</td>
                  <td className="py-2">{row.visibleOnStaging ? "✓" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
