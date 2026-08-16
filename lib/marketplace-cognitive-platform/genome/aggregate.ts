import type { UniversalObservation } from "@/lib/ccos/observation/types";
import { OBSERVATION_METRICS } from "@/lib/ccos/observation/metrics";

import { GENOME_VERSION } from "../flags";
import { GENOME_DIMENSION_WEIGHTS_V0, GENOME_METRIC_DIMENSION } from "./weights";
import type { GenomeDimensionKey, GenomeProfile } from "./types";

function dimensionFromObservation(obs: UniversalObservation): GenomeDimensionKey | null {
  return GENOME_METRIC_DIMENSION[obs.metric] ?? obs.domain;
}

export function aggregateGenomeFromObservations(
  observations: UniversalObservation[],
): GenomeProfile {
  const buckets: Partial<
    Record<GenomeDimensionKey, { sum: number; weight: number; conf: number; count: number }>
  > = {};

  for (const obs of observations) {
    if (obs.normalizedScore == null) continue;
    const dim = dimensionFromObservation(obs);
    if (!dim) continue;
    const w = GENOME_DIMENSION_WEIGHTS_V0[dim] * obs.confidence;
    const bucket = buckets[dim] ?? { sum: 0, weight: 0, conf: 0, count: 0 };
    bucket.sum += obs.normalizedScore * w;
    bucket.weight += w;
    bucket.conf += obs.confidence;
    bucket.count += 1;
    buckets[dim] = bucket;
  }

  const dimensions = {
    visual: scoreDimension(buckets.visual),
    content: scoreDimension(buckets.content),
    seo: scoreDimension(buckets.seo),
    trust: scoreDimension(buckets.trust),
    behaviour: scoreDimension(buckets.behaviour),
    commercial: scoreDimension(buckets.commercial),
    promotion: null,
    delivery: null,
    product: scoreProductDimension(observations, buckets),
  };

  const presentEntries = Object.entries(dimensions).filter(
    ([, v]) => v != null,
  ) as Array<[GenomeDimensionKey, number]>;

  let overall: number | null = null;
  if (presentEntries.length > 0) {
    let sum = 0;
    let wSum = 0;
    for (const [key, score] of presentEntries) {
      const w = GENOME_DIMENSION_WEIGHTS_V0[key];
      sum += score * w;
      wSum += w;
    }
    overall = wSum > 0 ? Math.round(sum / wSum) : null;
  }

  const avgConf =
    observations.length > 0
      ? observations.reduce((a, o) => a + o.confidence, 0) / observations.length
      : 0;
  const coverageFactor = presentEntries.length / Object.keys(GENOME_DIMENSION_WEIGHTS_V0).length;

  return {
    overall,
    confidence: Math.min(1, avgConf * (0.5 + coverageFactor * 0.5)),
    dimensions,
    genomeVersion: GENOME_VERSION,
    computedAt: new Date().toISOString(),
    observationCount: observations.length,
    dimensionsPresent: presentEntries.length,
  };
}

function scoreDimension(
  bucket?: { sum: number; weight: number; conf: number; count: number },
): number | null {
  if (!bucket || bucket.weight <= 0 || bucket.count === 0) return null;
  return Math.round(bucket.sum / bucket.weight);
}

function scoreProductDimension(
  observations: UniversalObservation[],
  buckets: Partial<
    Record<GenomeDimensionKey, { sum: number; weight: number; conf: number; count: number }>
  >,
): number | null {
  const overall = observations.find(
    (o) => o.metric === OBSERVATION_METRICS.content.overallQuality,
  );
  if (overall?.normalizedScore != null) return Math.round(overall.normalizedScore);
  return scoreDimension(buckets.content ?? buckets.visual);
}
