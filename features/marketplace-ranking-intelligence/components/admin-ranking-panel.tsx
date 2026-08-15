"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  createLabExperimentAction,
  runLabExperimentAction,
} from "@/lib/marketplace-ranking-intelligence/actions";
import { RANKING_LAB_DATASET_SIZES, RANKING_LAB_FACTORS } from "@/lib/marketplace-ranking-intelligence/ranking-lab";
import type { AdminRankingDashboard } from "@/lib/marketplace-ranking-intelligence/types";

type AdminRankingPanelProps = {
  dashboard: AdminRankingDashboard;
};

export function AdminRankingPanel({ dashboard }: AdminRankingPanelProps) {
  const [pending, startTransition] = useTransition();

  if (!dashboard.enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        MARKETPLACE_RANKING_INTELLIGENCE_ENABLED=false
      </p>
    );
  }

  const healthLabel =
    dashboard.rankingHealth === "good"
      ? "Хорошо"
      : dashboard.rankingHealth === "attention"
        ? "Требует внимания"
        : "Критично";

  return (
    <div className="flex flex-col gap-6" data-testid="admin-ranking-panel">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Средний score" value={String(dashboard.marketplaceAverage)} />
        <Metric label="Средний trust" value={String(dashboard.averageTrust)} />
        <Metric label="Средний SEO" value={String(dashboard.averageSeo)} />
        <Metric label="Здоровье ranking" value={healthLabel} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-heading text-lg font-semibold">Топ причин отказа</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {dashboard.topFailureReasons.map((r) => (
              <li key={r.reason} className="flex justify-between">
                <span>{r.reason}</span>
                <span className="text-muted-foreground">{r.count}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-heading text-lg font-semibold">Слабые категории</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {dashboard.worstCategories.map((c) => (
              <li key={c.name} className="flex justify-between">
                <span>{c.name}</span>
                <span className="text-muted-foreground">{c.avgScore}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-semibold">Влияние факторов</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Алгоритм {dashboard.algorithmVersion.toUpperCase()} · на основе экспериментов
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {dashboard.influences.map((i) => (
            <li
              key={i.factorKey}
              className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-sm"
            >
              <span>{i.label}</span>
              <span className="font-medium">{i.influencePercent}%</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold">Ranking Lab</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Синтетические эксперименты без влияния на live search
            </p>
          </div>
          <Button
            className="min-h-12"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const created = await createLabExperimentAction({
                  name: "CTR uplift",
                  purpose: "Измерить эффект роста CTR",
                  datasetSize: 500,
                  changedFactor: "ctr",
                });
                if (created.ok) {
                  await runLabExperimentAction(created.experiment.id);
                  window.location.reload();
                }
              })
            }
          >
            Запустить эксперимент CTR
          </Button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Датасеты: {RANKING_LAB_DATASET_SIZES.join(" / ")} · факторы:{" "}
          {RANKING_LAB_FACTORS.map((f) => f.label).join(", ")}
        </p>

        {dashboard.experiments.length > 0 ? (
          <ul className="mt-4 divide-y divide-border text-sm">
            {dashboard.experiments.map((e) => (
              <li key={e.id} className="py-3">
                <p className="font-medium">{e.name}</p>
                <p className="text-muted-foreground">{e.purpose}</p>
                <p className="mt-1">
                  {e.status} · n={e.datasetSize} · {e.changedFactor}
                  {e.rankingImpact ? ` · ${e.rankingImpact}` : ""}
                  {e.confidence ? ` · ${e.confidence}` : ""}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-heading text-2xl font-semibold">{value}</p>
    </div>
  );
}
