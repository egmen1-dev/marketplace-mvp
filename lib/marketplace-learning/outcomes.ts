import { getLearningStore } from "./store";
import { updateExperimentStatus } from "./experiments";
import { conversionRate } from "./learning-signals";
import type { ExperimentOutcome, MetricSnapshot, OutcomeVerdict } from "./types";

function verdictFromDelta(input: {
  viewsDelta: number;
  cartDelta: number;
  ordersDelta: number;
  conversionBefore: number;
  conversionAfter: number;
  actionCompleted: boolean;
}): OutcomeVerdict {
  if (!input.actionCompleted) return "NEUTRAL";

  if (input.ordersDelta > 0) return "POSITIVE";
  if (input.cartDelta > 0 && input.conversionAfter >= input.conversionBefore) {
    return "POSITIVE";
  }
  if (input.viewsDelta > 5 && input.cartDelta <= 0 && input.ordersDelta <= 0) {
    return "NEUTRAL";
  }
  if (input.ordersDelta < 0 || input.cartDelta < 0) return "NEGATIVE";
  return "NEUTRAL";
}

export function evaluateOutcome(input: {
  experimentId: string;
  baseline: MetricSnapshot;
  current: MetricSnapshot;
  actionCompleted: boolean;
}): ExperimentOutcome {
  const conversionBefore = input.baseline.conversion;
  const conversionAfter = input.current.conversion;
  const viewsDelta = input.current.views - input.baseline.views;
  const cartDelta = input.current.cart - input.baseline.cart;
  const ordersDelta = input.current.orders - input.baseline.orders;

  const verdict = verdictFromDelta({
    viewsDelta,
    cartDelta,
    ordersDelta,
    conversionBefore,
    conversionAfter,
    actionCompleted: input.actionCompleted,
  });

  let summary = "Недостаточно данных для вывода";
  if (verdict === "POSITIVE") {
    summary =
      ordersDelta > 0
        ? `Заказы выросли на ${ordersDelta} после выполнения рекомендации`
        : `Конверсия в корзину улучшилась (${Math.round(conversionBefore * 100)}% → ${Math.round(conversionAfter * 100)}%)`;
  } else if (verdict === "NEGATIVE") {
    summary = "Метрики не улучшились — попробуйте другую рекомендацию";
  } else if (verdict === "NEUTRAL") {
    summary = "Пока без заметного эффекта — нужно больше времени или трафика";
  }

  const outcome: ExperimentOutcome = {
    experimentId: input.experimentId,
    evaluatedAt: new Date().toISOString(),
    viewsBefore: input.baseline.views,
    viewsAfter: input.current.views,
    cartBefore: input.baseline.cart,
    cartAfter: input.current.cart,
    ordersBefore: input.baseline.orders,
    ordersAfter: input.current.orders,
    conversionBefore,
    conversionAfter,
    verdict,
    summary,
  };

  getLearningStore().outcomes.set(input.experimentId, outcome);
  return outcome;
}

export function finalizeExperimentOutcome(input: {
  experimentId: string;
  baseline: MetricSnapshot;
  current: MetricSnapshot;
  actionCompleted: boolean;
}): ExperimentOutcome {
  const outcome = evaluateOutcome(input);
  const status =
    outcome.verdict === "POSITIVE"
      ? "SUCCESS"
      : outcome.verdict === "NEGATIVE"
        ? "FAILED"
        : "INCONCLUSIVE";
  updateExperimentStatus(input.experimentId, status);
  return outcome;
}

export function getExperimentOutcome(
  experimentId: string,
): ExperimentOutcome | null {
  return getLearningStore().outcomes.get(experimentId) ?? null;
}

export function listOutcomes(): ExperimentOutcome[] {
  return [...getLearningStore().outcomes.values()].sort(
    (a, b) =>
      new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime(),
  );
}

export function computeConversionChange(
  before: MetricSnapshot,
  after: MetricSnapshot,
): number {
  return conversionRate(after.views, after.cart) - before.conversion;
}
