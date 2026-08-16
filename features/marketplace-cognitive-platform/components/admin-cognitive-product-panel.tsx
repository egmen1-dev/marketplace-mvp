import type { MarketplaceBrainReport } from "@/lib/marketplace-cognitive-platform/brain/v1/types";
import { confidenceBand } from "@/lib/ccos/observation/metrics";

type AdminCognitiveProductPanelProps = {
  report: MarketplaceBrainReport;
  compareReport?: MarketplaceBrainReport | null;
};

export function AdminCognitiveProductPanel({
  report,
  compareReport,
}: AdminCognitiveProductPanelProps) {
  return (
    <div className="flex flex-col gap-6" data-testid="admin-cognitive-product">
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Base genome</p>
          <p className="text-2xl font-semibold tabular-nums">
            {report.genome.base.overall ?? "—"}/100
          </p>
          <p className="text-xs text-muted-foreground">v{report.genome.base.genomeVersion}</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Contextual genome</p>
          <p className="text-2xl font-semibold tabular-nums">
            {report.genome.contextual.overall ?? "—"}/100
          </p>
          <p className="text-xs text-muted-foreground">
            confidence {Math.round(report.genome.contextual.confidence * 100)}%
          </p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Brain</p>
          <p className="text-lg font-semibold">{report.maturity}</p>
          <p className="text-xs text-muted-foreground">v{report.brainVersion}</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Context fingerprint</p>
          <p className="font-mono text-xs break-all">{report.context.fingerprint}</p>
          <p className="text-xs text-muted-foreground">{report.context.contextVersion}</p>
        </div>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="font-medium">Cognitive context</h2>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-muted/30 p-3 text-xs">
          {JSON.stringify(
            {
              query: report.context.query,
              category: report.context.category
                ? {
                    id: report.context.category.id,
                    name: report.context.category.name,
                    benchmarkSource: report.context.category.benchmarkRef,
                  }
                : null,
              market: report.context.market,
              device: report.context.device,
              seller: report.context.seller,
              confidence: report.context.confidence,
            },
            null,
            2,
          )}
        </pre>
      </section>

      {compareReport ? (
        <section className="rounded-xl border p-4">
          <h2 className="font-medium">Compare contexts</h2>
          <div className="mt-2 grid gap-4 md:grid-cols-2 text-sm">
            <div>
              <p className="font-medium">{compareReport.context.query?.raw ?? "baseline"}</p>
              <p>Contextual: {compareReport.genome.contextual.overall ?? "—"}</p>
              <p>NBA: {compareReport.nextBestAction?.title ?? "—"}</p>
            </div>
            <div>
              <p className="font-medium">{report.context.query?.raw ?? "current"}</p>
              <p>Contextual: {report.genome.contextual.overall ?? "—"}</p>
              <p>NBA: {report.nextBestAction?.title ?? "—"}</p>
            </div>
          </div>
        </section>
      ) : null}

      {report.productUnderstanding ? (
        <section className="rounded-xl border p-4" data-testid="admin-product-understanding">
          <h2 className="font-medium">Product Understanding (Wave 3)</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Product Genome {report.productUnderstanding.genome.contractVersion} · advisory only
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Identity</p>
              <p className="font-medium">
                {[report.productUnderstanding.identity.productType, report.productUnderstanding.identity.subcategory]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                confidence {Math.round(report.productUnderstanding.identity.confidence * 100)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Product Genome</p>
              <p className="font-medium tabular-nums">
                {report.productUnderstanding.genome.overall ?? "—"}/100
              </p>
              <p className="text-xs text-muted-foreground">
                pack {report.productUnderstanding.categoryPack.id}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Need graph</p>
              <p className="font-medium">{report.productUnderstanding.dna.primaryNeed}</p>
              <p className="text-xs text-muted-foreground">
                {report.productUnderstanding.needGraph.nodes.length} nodes
              </p>
            </div>
          </div>
          {report.productUnderstanding.identity.conflicts.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-amber-700 dark:text-amber-300">
              {report.productUnderstanding.identity.conflicts.map((c) => (
                <li key={c.field}>{c.explanation}</li>
              ))}
            </ul>
          ) : null}
          <pre className="mt-3 overflow-x-auto rounded-lg bg-muted/30 p-3 text-xs">
            {JSON.stringify(
              {
                dna: report.productUnderstanding.dna,
                relationships: report.productUnderstanding.relationships.slice(0, 4),
                daos: report.productUnderstanding.daos,
                confidence: report.productUnderstanding.confidence,
              },
              null,
              2,
            )}
          </pre>
        </section>
      ) : null}

      <section className="rounded-xl border p-4">
        <h2 className="font-medium">Contextual signals</h2>
        {report.signals.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Нет signals</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {report.signals.map((s) => (
              <li key={`${s.metric}-${s.observationId}`} className="flex flex-wrap gap-2">
                <span className="font-medium">{s.interpretation}</span>
                <span>{s.explanation}</span>
                <span className="text-muted-foreground">
                  conf {s.confidence.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="font-medium">Verified knowledge used</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          reasoning {report.reasoningPackVersion} · pack {report.knowledgePackVersion}
        </p>
        {report.knowledgeFactIds.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No verified facts matched scope</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {report.knowledgeFactIds.map((id) => (
              <li key={id} className="font-mono text-xs">{id}</li>
            ))}
          </ul>
        )}
        {report.recommendationEvidence.length > 0 ? (
          <>
            <h3 className="mt-3 text-xs font-medium text-muted-foreground">Recommendation evidence</h3>
            <ul className="mt-1 space-y-1 text-sm">
              {report.recommendationEvidence.map((e) => (
                <li key={e.claim}>{e.claim}</li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="font-medium">Decision orchestrator</h2>
        <p className="mt-1 text-sm">
          allowed={String(report.decision.allowed)} · blocked:{" "}
          {report.decision.blockedCapabilities.join(", ") || "none"}
        </p>
        {report.decision.reasons.length > 0 ? (
          <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
            {report.decision.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="font-medium">Next best action</h2>
        <p className="mt-2 text-sm font-medium">
          Selected: {report.nextBestAction?.title ?? "—"}
        </p>
        <h3 className="mt-3 text-xs font-medium text-muted-foreground">Candidates</h3>
        <ul className="mt-1 space-y-1 text-sm">
          {report.actionCandidates.slice(0, 6).map((c) => (
            <li key={c.id}>
              {c.title} · score {c.score.toFixed(2)}
              {c.suppressed ? ` · suppressed (${c.suppressionReason})` : ""}
            </li>
          ))}
        </ul>
      </section>

      {report.simulations.length > 0 ? (
        <section className="rounded-xl border p-4">
          <h2 className="font-medium">Prediction / simulation</h2>
          {report.twinSummary ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Twin: {report.twinSummary.scenarioCount} scenarios · best «
              {report.twinSummary.bestScenarioLabel ?? "—"}» · Δpos{" "}
              {report.twinSummary.bestPositionDelta ?? "—"} · confidence{" "}
              {report.twinSummary.modelConfidence != null
                ? `${Math.round(report.twinSummary.modelConfidence * 100)}%`
                : "—"}
            </p>
          ) : null}
          {report.simulations.map((sim) => (
            <div key={sim.intervention} className="mt-2 text-sm">
              <p className="font-medium">{sim.intervention}</p>
              <p className="text-muted-foreground">{sim.wording}</p>
              <p className="text-xs text-muted-foreground">{sim.modelSource}</p>
            </div>
          ))}
        </section>
      ) : null}

      {report.twinDecisionReport ? (
        <section className="rounded-xl border p-4" data-testid="admin-twin-decision">
          <h2 className="font-medium">Digital Twin Decision (Wave 5)</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Shadow ranking only · human approval required
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="py-2 pr-3">Scenario</th>
                  <th className="py-2 pr-3">Δ pos</th>
                  <th className="py-2 pr-3">Δ CTR</th>
                  <th className="py-2 pr-3">Risk</th>
                  <th className="py-2 pr-3">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {report.twinDecisionReport.comparison.slice(0, 6).map((row) => (
                  <tr key={row.scenarioId} className="border-b border-border/50">
                    <td className="py-2 pr-3">{row.label}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.positionDelta ?? "—"}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.ctrDeltaPct ?? "—"}%</td>
                    <td className="py-2 pr-3">{row.riskScore}</td>
                    <td className="py-2 pr-3">{Math.round(row.confidence * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

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
