"use client";

import { formatAcademyStars } from "@/lib/ranking-lab/ranking-academy";
import type {
  LabRankingAcademyReport,
  LabSellerAdvisorReport,
  LabTopPredictorReport,
} from "@/lib/ranking-lab/types";

type SellerRankingAcademyPanelProps = {
  enabled: boolean;
  academy: LabRankingAcademyReport | null;
  advisor: LabSellerAdvisorReport | null;
  predictor: LabTopPredictorReport | null;
};

export function SellerRankingAcademyPanel(props: SellerRankingAcademyPanelProps) {
  if (!props.enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        Ranking Academy доступна при MARKETPLACE_RANKING_INTELLIGENCE_ENABLED=true
      </p>
    );
  }

  if (!props.academy) {
    return <p className="text-sm text-muted-foreground">Выберите товар для анализа позиции.</p>;
  }

  const a = props.academy;

  return (
    <div className="flex flex-col gap-6" data-testid="seller-ranking-academy-panel">
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-semibold">Ranking Academy</h2>
        <p className="mt-2 text-sm text-muted-foreground">{a.productName}</p>
        <p className="mt-4 font-heading text-2xl font-semibold tabular-nums">
          Ваш товар сейчас — {a.currentPosition} место
        </p>
        <p className="mt-2 text-sm">
          Чтобы попасть в TOP-{a.targetPosition}, нужно:
        </p>
        <ul className="mt-4 space-y-3">
          {a.steps.map((step) => (
            <li key={step.factorKey} className="rounded-xl bg-muted/40 p-3 text-sm">
              <p className="font-medium">{formatAcademyStars(step.stars)}</p>
              <p className="mt-1">{step.title}</p>
              <p className="mt-1 text-muted-foreground">
                ожидаемый рост +{step.expectedGain} позиций
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm">
          Примерный шанс:{" "}
          <span className="font-semibold tabular-nums">{a.successProbabilityPercent}%</span>
        </p>
      </section>

      {props.advisor ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-heading text-lg font-semibold">Seller Advisor</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {props.advisor.actions.map((action) => (
              <li key={action.factorKey} className="rounded-xl border border-border p-3">
                <p className="font-medium">{formatAcademyStars(action.stars)}</p>
                <p className="mt-1">{action.title}</p>
                <p className="mt-1 text-muted-foreground">
                  ожидаемый рост +{action.expectedPositionGain} позиций · вероятность успеха{" "}
                  {action.successProbabilityPercent}%
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {props.predictor ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-heading text-lg font-semibold">TOP Predictor</h2>
          <p className="mt-2 text-sm tabular-nums">
            {props.predictor.currentPosition} → {props.predictor.predictedPosition}
          </p>
          <ul className="mt-2 list-disc pl-4 text-sm text-muted-foreground">
            {props.predictor.appliedChanges.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm">
            Уверенность прогноза: {props.predictor.confidencePercent}%
          </p>
        </section>
      ) : null}
    </div>
  );
}
