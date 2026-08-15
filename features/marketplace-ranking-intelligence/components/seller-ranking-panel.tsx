"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { eligibilityIntroMessage } from "@/lib/marketplace-ranking-intelligence/eligibility";
import { simulateRankingAction } from "@/lib/marketplace-ranking-intelligence/actions";
import { trackRankingView } from "@/lib/marketplace-ranking-intelligence/analytics";
import type { SellerRankingDashboard } from "@/lib/marketplace-ranking-intelligence/types";

type SellerRankingPanelProps = {
  dashboard: SellerRankingDashboard;
  sellerProfileId: string;
};

function formatRub(value: number): string {
  return `${Math.round(value).toLocaleString("ru-RU")} ₽`;
}

export function SellerRankingPanel({ dashboard, sellerProfileId }: SellerRankingPanelProps) {
  const [selectedId, setSelectedId] = useState(dashboard.products[0]?.id ?? "");
  const [simulation, setSimulation] = useState<import("@/lib/marketplace-ranking-intelligence/types").RankingSimulationResult | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    trackRankingView(sellerProfileId);
  }, [sellerProfileId]);

  if (!dashboard.enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        MARKETPLACE_RANKING_INTELLIGENCE_ENABLED=false
      </p>
    );
  }

  const selected = dashboard.products.find((p) => p.id === selectedId) ?? dashboard.products[0];

  return (
    <div className="flex flex-col gap-6" data-testid="seller-ranking-panel">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Средний score</p>
          <p className="font-heading text-2xl font-semibold">{dashboard.averageScore}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Участвуют</p>
          <p className="font-heading text-2xl font-semibold">{dashboard.eligibleCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Не участвуют</p>
          <p className="font-heading text-2xl font-semibold">{dashboard.notEligibleCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Алгоритм</p>
          <p className="font-heading text-lg font-semibold">{dashboard.algorithmVersion.toUpperCase()}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-border bg-card p-3">
          <p className="px-2 text-sm font-medium">Товары</p>
          <ul className="mt-2 max-h-[420px] space-y-1 overflow-y-auto">
            {dashboard.products.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(p.id);
                    setSimulation(null);
                  }}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    selected?.id === p.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  }`}
                >
                  <span className="line-clamp-1 font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.score?.overall ?? "—"} · {formatRub(p.price)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {selected ? (
          <div className="flex flex-col gap-4">
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-heading text-lg font-semibold">{selected.name}</h2>
              {selected.eligibility.status === "NOT_ELIGIBLE" ? (
                <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
                  <p className="font-medium">{eligibilityIntroMessage(selected.eligibility)}</p>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    {selected.eligibility.messages.map((m) => (
                      <li key={m}>❌ {m}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-muted-foreground">Сначала исправьте эти проблемы.</p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Товар участвует в оценке позиции в каталоге.
                </p>
              )}

              {selected.score ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div>
                    <p className="text-sm text-muted-foreground">Общий</p>
                    <p className="font-heading text-3xl font-semibold">{selected.score.overall}</p>
                    <p className="text-sm text-primary">{selected.score.label}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Товар</p>
                    <p className="text-xl font-semibold">{selected.score.product}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Продавец</p>
                    <p className="text-xl font-semibold">{selected.score.seller}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Поведение</p>
                    <p className="text-xl font-semibold">{selected.score.behaviour}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Коммерция</p>
                    <p className="text-xl font-semibold">{selected.score.commercial}</p>
                  </div>
                </div>
              ) : null}
            </section>

            {selected.explanation ? (
              <section className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-heading text-lg font-semibold">Почему такая позиция</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Текущая позиция:{" "}
                  <span className="font-medium text-foreground">
                    {selected.explanation.estimatedPosition ?? "—"}
                  </span>
                </p>
                {selected.explanation.blockers.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-sm font-medium">Главные блокеры</p>
                    <ul className="mt-2 space-y-2 text-sm">
                      {selected.explanation.blockers.map((b) => (
                        <li key={b.title} className="flex justify-between gap-3">
                          <span>• {b.title}</span>
                          <span className="shrink-0 text-muted-foreground">
                            −{b.estimatedLoss} поз.
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            ) : null}

            {selected.nextAction ? (
              <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
                <p className="text-sm font-medium text-primary">Ваш следующий шаг</p>
                <h3 className="mt-1 font-heading text-lg font-semibold">{selected.nextAction.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Почему: </span>
                  {selected.nextAction.why}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ожидаемый эффект: +{selected.nextAction.expectedGain} поз.
                </p>
                <Button
                  className="mt-4 min-h-12"
                  nativeButton={false}
                  render={<Link href={selected.nextAction.ctaHref} />}
                >
                  {selected.nextAction.ctaLabel}
                </Button>
              </section>
            ) : null}

            {selected.qualityGate.topBlocked ? (
              <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                <p className="font-medium">TOP заблокирован</p>
                <p className="mt-1 text-muted-foreground">Причина: {selected.qualityGate.reason}</p>
              </section>
            ) : null}

            <section className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-heading text-lg font-semibold">Симуляция</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Посмотрите прогноз без изменения карточки.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  className="min-h-12"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await simulateRankingAction({
                        sellerProfileId,
                        productId: selected.id,
                        changes: { improveFirstPhoto: true, addVideo: true, reducePricePercent: 5 },
                      });
                      if (res.ok) setSimulation(res.result);
                    })
                  }
                >
                  Симулировать улучшения
                </Button>
              </div>
              {simulation ? (
                <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <p>
                    Score: {simulation.currentScore} →{" "}
                    <span className="font-semibold text-primary">{simulation.predictedScore}</span>
                  </p>
                  <p>
                    Позиция: {simulation.currentPosition ?? "—"} →{" "}
                    <span className="font-semibold text-primary">
                      {simulation.predictedPosition ?? "—"}
                    </span>
                  </p>
                </div>
              ) : null}
            </section>

            {selected.history.length > 0 ? (
              <section className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-heading text-lg font-semibold">История</h3>
                <ul className="mt-3 divide-y divide-border text-sm">
                  {selected.history.map((h) => (
                    <li key={h.id} className="flex justify-between py-2">
                      <span>
                        {h.oldScore} → {h.newScore} · {h.reason}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(h.createdAt).toLocaleDateString("ru-RU")}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
