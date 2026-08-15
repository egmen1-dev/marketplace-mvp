"use client";

import type {
  LabBadProductReport,
  LabImportanceRow,
  LabMarketplaceDashboard,
  LabRankingAcademyReport,
  LabSensitivityReport,
  LabTopExplanation,
} from "@/lib/ranking-lab/types";

type AdminRankingLabPanelProps = {
  enabled: boolean;
  dashboard: LabMarketplaceDashboard;
  importance: LabImportanceRow[];
  badProductLab: LabBadProductReport;
  sensitivity: LabSensitivityReport | null;
  topExplanation: LabTopExplanation | null;
};

export function AdminRankingLabPanel(props: AdminRankingLabPanelProps) {
  if (!props.enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        MARKETPLACE_RANKING_INTELLIGENCE_ENABLED=false — лаборатория доступна только в advisory
        режиме.
      </p>
    );
  }

  const d = props.dashboard;

  return (
    <div className="flex flex-col gap-6" data-testid="admin-ranking-lab-panel">
      <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
        Лаборатория анализа · {d.datasetSize} синтетических товаров · live search не изменяется
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Средний score" value={String(d.averageScore)} />
        <Metric label="Средний Trust" value={String(d.averageTrust)} />
        <Metric label="Средний SEO" value={String(d.averageSeo)} />
        <Metric label="Средний CTR %" value={String(d.averageCtr)} />
        <Metric label="Конверсия %" value={String(d.averageConversion)} />
        <Metric label="Хорошие карточки" value={`${d.goodCardsPercent}%`} />
        <Metric label="Плохие карточки" value={`${d.badCardsPercent}%`} />
        <Metric label="Алгоритм" value={d.algorithmVersion} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-semibold">Importance Engine — ТОП факторов</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {props.importance.map((row) => (
            <li
              key={row.factorKey}
              className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-sm"
            >
              <span>{row.label}</span>
              <span className="font-semibold tabular-nums">{row.influencePercent}%</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-heading text-lg font-semibold">Качество категорий</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {d.categoryQuality.slice(0, 8).map((c) => (
              <li key={c.category} className="flex justify-between">
                <span>{c.category}</span>
                <span className="text-muted-foreground tabular-nums">
                  {c.avgScore} · n={c.count}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-heading text-lg font-semibold">Распределение качества</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {d.qualityDistribution.map((q) => (
              <li key={q.band} className="flex justify-between">
                <span>{q.band}</span>
                <span className="text-muted-foreground">
                  {q.count} ({q.percent}%)
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-semibold">Bad Product Lab</h2>
        <p className="mt-2 text-sm font-medium">
          Можно ли вывести плохой товар в TOP?{" "}
          <span className="text-destructive">{props.badProductLab.verdict}</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{props.badProductLab.summary}</p>
        <ul className="mt-4 space-y-3 text-sm">
          {props.badProductLab.cases.map((c) => (
            <li key={c.id} className="rounded-xl bg-muted/40 p-3">
              <div className="flex justify-between font-medium">
                <span>{c.label}</span>
                <span>#{c.bestPosition}</span>
              </div>
              <p className="mt-1 text-muted-foreground">{c.reasons.slice(0, 2).join(" · ")}</p>
            </li>
          ))}
        </ul>
      </section>

      {props.sensitivity ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-heading text-lg font-semibold">Sensitivity Lab</h2>
          <p className="mt-1 text-sm text-muted-foreground">{props.sensitivity.productName}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {props.sensitivity.steps.map((s) => (
              <li key={s.changeKey} className="flex flex-wrap justify-between gap-2">
                <span>{s.change}</span>
                <span className="tabular-nums">
                  #{s.positionBefore} → #{s.positionAfter}
                  {s.delta > 0 ? ` (↑${s.delta})` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {props.topExplanation ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-heading text-lg font-semibold">{props.topExplanation.headline}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{props.topExplanation.productName}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <p className="font-medium">Сильные стороны</p>
              <ul className="mt-1 list-disc pl-4 text-muted-foreground">
                {props.topExplanation.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium">Слабые стороны</p>
              <ul className="mt-1 list-disc pl-4 text-muted-foreground">
                {props.topExplanation.weaknesses.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Metric(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{props.label}</p>
      <p className="mt-1 font-heading text-xl font-semibold tabular-nums">{props.value}</p>
    </div>
  );
}
