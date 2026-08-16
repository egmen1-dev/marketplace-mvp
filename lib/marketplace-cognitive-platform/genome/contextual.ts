import type { CognitiveContext } from "@/lib/ccos/context/types";
import type { ContextualSignal } from "@/lib/ccos/signals/types";

import type { GenomeDimensionKey, GenomeProfile } from "./types";
import { GENOME_DIMENSION_WEIGHTS_V0 } from "./weights";

export const GENOME_V1_VERSION = "genome-v1";

export type MarketplaceGenomeV1 = {
  base: GenomeProfile;
  contextual: {
    overall: number | null;
    dimensions: Record<GenomeDimensionKey, number | null>;
    confidence: number;
    contextId: string;
  };
  genomeVersion: string;
};

const NEGATIVE_IMPACT: Record<ContextualSignal["interpretation"], number> = {
  strong_positive: 8,
  positive: 4,
  neutral: 0,
  negative: -6,
  strong_negative: -12,
};

function signalDimension(signal: ContextualSignal): GenomeDimensionKey | null {
  if (signal.domain === "query") return "commercial";
  if (signal.domain in GENOME_DIMENSION_WEIGHTS_V0) return signal.domain as GenomeDimensionKey;
  return null;
}

export function buildContextualGenome(
  base: GenomeProfile,
  context: CognitiveContext,
  signals: ContextualSignal[],
): MarketplaceGenomeV1["contextual"] {
  const dimensions: Record<GenomeDimensionKey, number | null> = { ...base.dimensions };

  for (const signal of signals) {
    const dim = signalDimension(signal);
    if (!dim) continue;
    const baseScore = base.dimensions[dim];
    if (baseScore == null) continue;
    const delta = NEGATIVE_IMPACT[signal.interpretation];
    dimensions[dim] = Math.max(0, Math.min(100, Math.round(baseScore + delta)));
  }

  if (context.device?.type === "mobile") {
    const visual = dimensions.visual;
    if (visual != null) {
      dimensions.visual = Math.max(0, visual - 6);
    }
  }

  const present = Object.entries(dimensions).filter(([, v]) => v != null) as Array<
    [GenomeDimensionKey, number]
  >;
  let overall: number | null = null;
  if (present.length > 0) {
    let sum = 0;
    let wSum = 0;
    for (const [key, score] of present) {
      const w = GENOME_DIMENSION_WEIGHTS_V0[key];
      sum += score * w;
      wSum += w;
    }
    overall = wSum > 0 ? Math.round(sum / wSum) : null;
  }

  return {
    overall,
    dimensions,
    confidence: Math.min(1, base.confidence * 0.7 + context.confidence.overall * 0.3),
    contextId: context.id,
  };
}

export function buildMarketplaceGenomeV1(
  base: GenomeProfile,
  context: CognitiveContext,
  signals: ContextualSignal[],
): MarketplaceGenomeV1 {
  return {
    base,
    contextual: buildContextualGenome(base, context, signals),
    genomeVersion: GENOME_V1_VERSION,
  };
}
