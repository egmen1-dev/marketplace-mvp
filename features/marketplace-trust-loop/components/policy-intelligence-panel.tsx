"use client";

export type PolicyEvidenceHit = {
  source: string;
  policyId: string;
  confidence: number;
  matchedValue: string;
  detail?: string;
};

export type EvaluationCompleteness = {
  textEvaluated?: string;
  categoryEvaluated?: string;
  characteristicsEvaluated?: string;
  imagesEvaluated?: string;
  ocrEvaluated?: string;
  allRequiredEvaluated?: boolean;
  blockingReasons?: string[];
};

export type PolicyV2Snapshot = {
  decisionClass?: string;
  recommendation?: string;
  confidence?: number;
  rulesTriggered?: string[];
  evidence?: PolicyEvidenceHit[];
  conflicts?: string[];
  notEvaluatedDimensions?: string[];
  userMessage?: string | null;
  adminSummary?: string;
  evaluationCompleteness?: EvaluationCompleteness;
};

export type PerImageRow = {
  imageId?: string;
  url?: string;
  ocr?: { normalizedText?: string; status?: string; blocks?: Array<{ text: string; confidence: number }> };
  image?: { policySignals?: Array<{ label: string; confidence: number; detail?: string }>; qrDetected?: boolean };
};

export type ImageEvaluationSummary = {
  perImage?: PerImageRow[];
};

type Props = {
  policyV2: PolicyV2Snapshot | null;
  imageEvaluationSummary?: ImageEvaluationSummary | null;
  systemRecommendation?: string | null;
  riskScore?: number | null;
};

export function asPolicyV2Snapshot(value: unknown): PolicyV2Snapshot | null {
  if (!value || typeof value !== "object") return null;
  return value as PolicyV2Snapshot;
}

export function asImageEvaluationSummary(value: unknown): ImageEvaluationSummary | null {
  if (!value || typeof value !== "object") return null;
  const row = value as ImageEvaluationSummary;
  if (row.perImage && !Array.isArray(row.perImage)) return null;
  return row;
}

function groupEvidence(evidence: PolicyEvidenceHit[] = []) {
  const groups: Record<string, PolicyEvidenceHit[]> = {};
  for (const hit of evidence) {
    groups[hit.source] = groups[hit.source] ?? [];
    groups[hit.source].push(hit);
  }
  return groups;
}

export function PolicyIntelligencePanel({
  policyV2,
  imageEvaluationSummary,
  systemRecommendation,
  riskScore,
}: Props) {
  if (!policyV2) {
    return (
      <section className="rounded-lg border bg-muted/30 p-4" data-testid="policy-intelligence-empty">
        <h2 className="font-semibold">Policy Intelligence</h2>
        <p className="mt-2 text-sm text-muted-foreground">Снимок политики V2 ещё не сохранён для этого ЛОТа.</p>
      </section>
    );
  }

  const evidenceGroups = groupEvidence(policyV2.evidence);
  const completeness = policyV2.evaluationCompleteness;

  return (
    <section className="rounded-lg border p-4" data-testid="policy-intelligence-panel">
      <h2 className="font-semibold">Policy Intelligence (LOT_POLICY_V2)</h2>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Рекомендация системы</dt>
          <dd className="font-medium">{policyV2.recommendation ?? systemRecommendation ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Риск</dt>
          <dd className="font-medium">{riskScore ?? "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Сработавшие правила</dt>
          <dd className="mt-1 flex flex-wrap gap-1">
            {(policyV2.rulesTriggered ?? []).map((rule) => (
              <span key={rule} className="rounded bg-muted px-2 py-0.5 text-xs font-mono">
                {rule}
              </span>
            ))}
          </dd>
        </div>
      </dl>

      {policyV2.userMessage ? (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">{policyV2.userMessage}</p>
      ) : null}

      {completeness ? (
        <div className="mt-4">
          <h3 className="text-sm font-medium">Полнота проверки</h3>
          <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {(
              [
                ["Текст", completeness.textEvaluated],
                ["Категория", completeness.categoryEvaluated],
                ["Характеристики", completeness.characteristicsEvaluated],
                ["Изображения", completeness.imagesEvaluated],
                ["OCR", completeness.ocrEvaluated],
              ] as const
            ).map(([label, status]) => (
              <li key={label}>
                {label}: <span className="font-mono">{status ?? "—"}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {(policyV2.conflicts?.length ?? 0) > 0 ? (
        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3">
          <h3 className="text-sm font-medium text-amber-900">Конфликты evidence</h3>
          <ul className="mt-1 list-disc pl-5 text-sm text-amber-900">
            {policyV2.conflicts!.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {Object.entries(evidenceGroups).map(([source, hits]) => (
        <div key={source} className="mt-4">
          <h3 className="text-sm font-medium">{source}</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {hits.map((hit, idx) => (
              <li key={`${hit.policyId}-${idx}`} className="rounded border bg-muted/20 p-2">
                <div className="font-mono text-xs text-muted-foreground">{hit.policyId}</div>
                <div>{hit.matchedValue}</div>
                <div className="text-xs text-muted-foreground">
                  confidence {Math.round(hit.confidence * 100)}%
                  {hit.detail ? ` · ${hit.detail}` : ""}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {(imageEvaluationSummary?.perImage?.length ?? 0) > 0 ? (
        <div className="mt-4">
          <h3 className="text-sm font-medium">OCR / изображения (по файлам)</h3>
          <ul className="mt-2 space-y-3">
            {imageEvaluationSummary!.perImage!.map((row, idx) => (
              <li key={row.imageId ?? idx} className="rounded border p-2 text-sm">
                <div className="text-xs text-muted-foreground">image {idx + 1}</div>
                {row.ocr?.normalizedText ? (
                  <pre className="mt-1 whitespace-pre-wrap text-xs">{row.ocr.normalizedText.slice(0, 400)}</pre>
                ) : (
                  <p className="text-muted-foreground">OCR: {row.ocr?.status ?? "—"}</p>
                )}
                {(row.image?.policySignals?.length ?? 0) > 0 ? (
                  <ul className="mt-1 text-xs">
                    {row.image!.policySignals!.map((s) => (
                      <li key={s.label}>
                        {s.label} ({Math.round(s.confidence * 100)}%)
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
