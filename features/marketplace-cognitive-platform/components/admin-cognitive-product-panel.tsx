import type { CognitiveProductReport } from "@/lib/marketplace-cognitive-platform/brain/types";
import { confidenceBand } from "@/lib/ccos/observation/metrics";

type AdminCognitiveProductPanelProps = {
  report: CognitiveProductReport;
};

export function AdminCognitiveProductPanel({ report }: AdminCognitiveProductPanelProps) {
  return (
    <div className="flex flex-col gap-6" data-testid="admin-cognitive-product">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Genome</p>
          <p className="text-2xl font-semibold tabular-nums">
            {report.genome.overall ?? "—"}/100
          </p>
          <p className="text-xs text-muted-foreground">
            confidence {Math.round(report.genome.confidence * 100)}% · v
            {report.genome.genomeVersion}
          </p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Brain</p>
          <p className="text-lg font-semibold">{report.maturityLevel}</p>
          <p className="text-xs text-muted-foreground">v{report.brainVersion}</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Observations</p>
          <p className="text-2xl font-semibold tabular-nums">{report.observations.length}</p>
          <p className="text-xs text-muted-foreground">advisoryOnly={String(report.advisoryOnly)}</p>
        </div>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="font-medium">Publisher health</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {report.publisherHealth.map((p) => (
            <li key={p.name} className="flex flex-wrap justify-between gap-2">
              <span>{p.name}</span>
              <span className={p.status === "OK" ? "text-emerald-600" : "text-amber-600"}>
                {p.status} · {p.observationCount} obs
                {p.error ? ` · ${p.error}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="font-medium">Blockers (mirror only)</h2>
        {report.blockers.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Нет активных blockers</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {report.blockers.map((b) => (
              <li key={b.code}>
                <span className="font-medium">{b.title}</span>
                <span className="text-muted-foreground"> — {b.enforcementNote}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="font-medium">Observations</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="py-2 pr-3">Metric</th>
                <th className="py-2 pr-3">Value</th>
                <th className="py-2 pr-3">Confidence</th>
                <th className="py-2 pr-3">Source</th>
              </tr>
            </thead>
            <tbody>
              {report.observations.map((o) => (
                <tr key={o.id} className="border-b border-border/50">
                  <td className="py-2 pr-3 font-mono text-xs">{o.metric}</td>
                  <td className="py-2 pr-3 tabular-nums">
                    {String(o.value)}
                    {o.normalizedScore != null ? ` (${o.normalizedScore})` : ""}
                  </td>
                  <td className="py-2 pr-3">
                    {confidenceBand(o.confidence)} ({o.confidence.toFixed(2)})
                  </td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">
                    {o.source.module}:{o.source.version}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="font-medium">Provenance</h2>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {report.provenance.map((p, i) => (
            <li key={`${p.sourceModule}-${i}`}>
              {p.claim} ← {p.sourceModule}@{p.sourceVersion}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
