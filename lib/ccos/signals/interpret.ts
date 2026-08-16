import type { CognitiveContext } from "@/lib/ccos/context/types";
import type { UniversalObservation } from "@/lib/ccos/observation/types";

import type { ContextualSignal } from "./types";

export type ObservationInterpreter = (
  observation: UniversalObservation,
  context: CognitiveContext,
) => ContextualSignal | null;

const interpreters: ObservationInterpreter[] = [];

export function registerObservationInterpreter(interpreter: ObservationInterpreter): void {
  interpreters.push(interpreter);
}

export function resetObservationInterpreters(): void {
  interpreters.length = 0;
}

export function interpretObservation(
  observation: UniversalObservation,
  context: CognitiveContext,
): ContextualSignal | null {
  for (const interpreter of interpreters) {
    const signal = interpreter(observation, context);
    if (signal) return signal;
  }
  return null;
}

export function interpretObservations(
  observations: UniversalObservation[],
  context: CognitiveContext,
): ContextualSignal[] {
  const signals: ContextualSignal[] = [];
  for (const obs of observations) {
    const signal = interpretObservation(obs, context);
    if (signal) signals.push(signal);
  }
  return signals;
}

export function compareToMedian(
  value: number,
  median: number | undefined,
): ContextualSignal["interpretation"] {
  if (median == null || median <= 0) return "neutral";
  const ratio = value / median;
  if (ratio >= 1.25) return "strong_positive";
  if (ratio >= 1.05) return "positive";
  if (ratio <= 0.75) return "strong_negative";
  if (ratio <= 0.92) return "negative";
  return "neutral";
}

export function scoreInterpretation(
  score: number,
  median: number | undefined,
): ContextualSignal["interpretation"] {
  if (median == null) return "neutral";
  const delta = score - median;
  if (delta >= 15) return "strong_positive";
  if (delta >= 5) return "positive";
  if (delta <= -15) return "strong_negative";
  if (delta <= -5) return "negative";
  return "neutral";
}
