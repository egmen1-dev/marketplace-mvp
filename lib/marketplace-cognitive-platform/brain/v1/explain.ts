import type { CognitiveContext } from "@/lib/ccos/context/types";
import type { ContextualSignal } from "@/lib/ccos/signals/types";

import type { BrainFactor, MarketplaceBrainReport } from "./types";

const NEGATIVE: ContextualSignal["interpretation"][] = ["negative", "strong_negative"];
const POSITIVE: ContextualSignal["interpretation"][] = ["positive", "strong_positive"];

function deltaForSignal(signal: ContextualSignal): number {
  switch (signal.interpretation) {
    case "strong_negative":
      return -11;
    case "negative":
      return -6;
    case "positive":
      return 6;
    case "strong_positive":
      return 10;
    default:
      return 0;
  }
}

export function buildFactorDeltas(signals: ContextualSignal[]): {
  strengths: BrainFactor[];
  weaknesses: BrainFactor[];
} {
  const strengths: BrainFactor[] = [];
  const weaknesses: BrainFactor[] = [];

  for (const signal of signals) {
    const delta = deltaForSignal(signal);
    const factor: BrainFactor = {
      label: signal.explanation,
      delta,
      domain: signal.domain,
      provenance: signal.metric,
    };
    if (POSITIVE.includes(signal.interpretation)) strengths.push(factor);
    if (NEGATIVE.includes(signal.interpretation)) weaknesses.push(factor);
  }

  return {
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4),
  };
}

export function buildSellerSummary(input: {
  context: CognitiveContext;
  strengths: BrainFactor[];
  weaknesses: BrainFactor[];
  nextBestAction: MarketplaceBrainReport["nextBestAction"];
  simulations: MarketplaceBrainReport["simulations"];
  contextualOverall: number | null;
}): MarketplaceBrainReport["summary"] {
  const contextLabel = input.context.query?.raw
    ? `Для запроса «${input.context.query.raw}»`
    : input.context.category?.name
      ? `По категории «${input.context.category.name}»`
      : null;

  const now =
    input.contextualOverall != null
      ? `Карточка ${input.contextualOverall >= 70 ? "сильная" : input.contextualOverall >= 55 ? "средняя" : "требует внимания"} в текущем контексте.`
      : "Недостаточно данных для полной contextual оценки.";

  const why =
    input.weaknesses[0]?.label ??
    input.strengths[0]?.label ??
    "Собираем больше сигналов для точной интерпретации.";

  const predictionHint = input.simulations[0]?.wording ?? null;

  return {
    now,
    why,
    nextStep: input.nextBestAction?.title ?? null,
    predictionHint,
    contextLabel,
  };
}

export function buildExplanationLines(input: {
  summary: MarketplaceBrainReport["summary"];
  strengths: BrainFactor[];
  weaknesses: BrainFactor[];
}): string[] {
  const lines: string[] = [];
  lines.push(input.summary.now);
  if (input.summary.contextLabel) lines.push(input.summary.contextLabel);
  for (const s of input.strengths.slice(0, 2)) lines.push(`+ ${s.label}`);
  for (const w of input.weaknesses.slice(0, 2)) lines.push(`− ${w.label}`);
  if (input.summary.nextStep) lines.push(`Следующий шаг: ${input.summary.nextStep}`);
  if (input.summary.predictionHint) lines.push(input.summary.predictionHint);
  return lines;
}
