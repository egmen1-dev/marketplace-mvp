import type { RankingSimulationResult } from "@/lib/ccos/simulation";
import type { BuildTwinSimulationInput, TwinAppId, TwinState } from "./types";
import { TWIN_CONTRACT_VERSION } from "./types";

export function buildTwinStateFromSimulation(input: {
  productId: string;
  app?: TwinAppId;
  entityLabel: string;
  baseline: RankingSimulationResult;
  graphCoverage?: number;
  knowledgeCoverage?: number;
  sampleSize?: number;
}): TwinState {
  const dims = input.baseline.dimensions;

  return {
    version: "twin-state-v1",
    contractVersion: TWIN_CONTRACT_VERSION,
    entity: {
      id: input.productId,
      type: "product",
      label: input.entityLabel,
      app: input.app ?? "marketplace",
    },
    snapshotAt: new Date().toISOString(),
    dimensions: {
      rankingScore: dims?.rankingScore ?? input.baseline.relativeScore ?? null,
      position: dims?.position ?? input.baseline.estimatedPosition ?? null,
      ctr: dims?.ctr ?? null,
      conversion: dims?.conversion ?? null,
      revenueIndex: dims?.revenueIndex ?? null,
      trust: dims?.trust ?? null,
      contentQuality: dims?.contentQuality ?? null,
      promotionActive: dims?.promotionActive ?? false,
      price: dims?.price ?? null,
      photoCount: dims?.photoCount ?? null,
      hasVideo: dims?.hasVideo ?? false,
    },
    graphCoverage: input.graphCoverage ?? 0,
    knowledgeCoverage: input.knowledgeCoverage ?? 0,
    sampleSize: input.sampleSize ?? 1,
    advisoryOnly: true,
  };
}

export function buildTwinStateFromInput(
  input: BuildTwinSimulationInput & {
    baseline: RankingSimulationResult;
  },
): TwinState {
  const knowledgeCoverage = Math.min(1, (input.verifiedFactCount ?? 0) / 5);
  const sampleSize = input.entityMetrics?.views ?? 1;

  return buildTwinStateFromSimulation({
    productId: input.productId,
    app: input.app,
    entityLabel: input.entityLabel ?? input.productId,
    baseline: input.baseline,
    graphCoverage: input.graphCoverage ?? 0,
    knowledgeCoverage,
    sampleSize,
  });
}
