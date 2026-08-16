import type { RankingProductInput } from "@/lib/marketplace-ranking-intelligence/types";
import type { BuildTwinSimulationInput, TwinAppId, TwinState } from "./types";
import { TWIN_CONTRACT_VERSION } from "./types";
import { shadowRankingScore } from "./shadow-ranking";
import { estimatePosition } from "@/lib/marketplace-ranking-intelligence/ranking-simulator";
import type { RankingWeightRow } from "@/lib/marketplace-ranking-intelligence/types";

export function buildTwinState(input: {
  productId: string;
  app?: TwinAppId;
  rankingInput: RankingProductInput;
  peerScores: number[];
  weights: RankingWeightRow[];
  graphCoverage?: number;
  knowledgeCoverage?: number;
  sampleSize?: number;
}): TwinState {
  const score = shadowRankingScore(input.rankingInput, input.weights);
  const position = estimatePosition(score.overall, input.peerScores, input.rankingInput.id);
  const views = Math.max(1, input.rankingInput.views);

  return {
    version: "twin-state-v1",
    contractVersion: TWIN_CONTRACT_VERSION,
    entity: {
      id: input.productId,
      type: "product",
      label: input.rankingInput.name,
      app: input.app ?? "marketplace",
    },
    snapshotAt: new Date().toISOString(),
    dimensions: {
      rankingScore: score.overall,
      position,
      ctr: Math.round((input.rankingInput.favoritesCount / views) * 1000) / 10,
      conversion: Math.round((input.rankingInput.ordersCount / views) * 1000) / 10,
      revenueIndex: Math.round(score.overall * (input.rankingInput.ordersCount + 1)),
      trust: input.rankingInput.sellerTrustScore,
      contentQuality: input.rankingInput.contentQualityScore ?? input.rankingInput.photoQuality ?? null,
      promotionActive: input.rankingInput.promotionActive,
      price: input.rankingInput.price,
      photoCount: input.rankingInput.photoCount,
      hasVideo: input.rankingInput.hasVideo,
    },
    graphCoverage: input.graphCoverage ?? 0,
    knowledgeCoverage: input.knowledgeCoverage ?? 0,
    sampleSize: input.sampleSize ?? input.rankingInput.views,
    advisoryOnly: true,
  };
}

export function buildMarketplaceTwinStateFromInput(
  input: BuildTwinSimulationInput & {
    rankingInput: RankingProductInput;
    peerScores: number[];
    weights: RankingWeightRow[];
  },
): TwinState {
  const knowledgeCoverage = Math.min(1, (input.verifiedFactCount ?? 0) / 5);
  return buildTwinState({
    productId: input.productId,
    app: input.app ?? "marketplace",
    rankingInput: input.rankingInput,
    peerScores: input.peerScores,
    weights: input.weights,
    graphCoverage: input.graphCoverage ?? 0,
    knowledgeCoverage,
    sampleSize: input.rankingInput.views,
  });
}
