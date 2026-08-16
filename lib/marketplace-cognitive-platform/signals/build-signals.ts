import {
  interpretObservations,
  registerObservationInterpreter,
  resetObservationInterpreters,
} from "@/lib/ccos/signals/interpret";
import type { CognitiveContext } from "@/lib/ccos/context/types";
import type { UniversalObservation } from "@/lib/ccos/observation/types";
import type { ContextualSignal } from "@/lib/ccos/signals/types";

import {
  buildPriceContextSignal,
  buildQueryRelevanceSignal,
  marketplaceInterpreters,
} from "../interpreters";

let registered = false;

export function ensureMarketplaceInterpretersRegistered(): void {
  if (registered) return;
  for (const interpreter of marketplaceInterpreters) {
    registerObservationInterpreter(interpreter);
  }
  registered = true;
}

export function resetMarketplaceInterpreters(): void {
  resetObservationInterpreters();
  registered = false;
}

export function buildMarketplaceContextualSignals(
  observations: UniversalObservation[],
  context: CognitiveContext,
): ContextualSignal[] {
  ensureMarketplaceInterpretersRegistered();
  const signals = interpretObservations(observations, context);
  const anchor = observations[0];
  if (anchor) {
    const priceSignal = buildPriceContextSignal(context, anchor);
    if (priceSignal) signals.push(priceSignal);
  }
  const querySignal = buildQueryRelevanceSignal(context);
  if (querySignal) signals.push(querySignal);
  return signals;
}
