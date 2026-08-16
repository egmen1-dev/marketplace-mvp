import { DEFAULT_RANKING_WEIGHTS_V1 } from "@/lib/marketplace-ranking-intelligence/ranking-weights";
import { getActiveRankingVersion } from "@/lib/marketplace-ranking-intelligence/ranking-version";
import type { RankingProductInput, RankingWeightRow } from "@/lib/marketplace-ranking-intelligence/types";

import {
  registerSimulationPort,
  type RankingSimulationPort,
  type RankingSimulationInput,
  type RankingSimulationResult,
  SIMULATION_PORT_CONTRACT_VERSION,
} from "@/lib/ccos/simulation";
import { capRecommendationConfidence } from "@/lib/ccos/graph/confidence";

import { applyScenarioToMarketplaceRankingInput } from "./scenario-ranking";
import {
  estimateMarketplaceBehaviourDeltas,
  marketplaceShadowRankingSimulate,
  marketplaceShadowRankingScore,
  MARKETPLACE_SHADOW_RANKING_VERSION,
} from "./shadow-ranking";

export const MARKETPLACE_RANKING_SIMULATION_PORT_ID = "marketplace-ranking-simulation";

export type MarketplaceSimulationBinding = {
  rankingInput: RankingProductInput;
  peerScores: number[];
  weights?: RankingWeightRow[];
};

async function resolveWeights(binding: MarketplaceSimulationBinding): Promise<RankingWeightRow[]> {
  if (binding.weights?.length) return binding.weights;
  const { weights } = await getActiveRankingVersion();
  return weights;
}

function parseBinding(binding: unknown): MarketplaceSimulationBinding {
  if (
    binding &&
    typeof binding === "object" &&
    "rankingInput" in binding &&
    "peerScores" in binding
  ) {
    return binding as MarketplaceSimulationBinding;
  }
  throw new Error("Invalid MarketplaceSimulationBinding");
}

export function createMarketplaceRankingSimulationPort(): RankingSimulationPort {
  return {
    id: MARKETPLACE_RANKING_SIMULATION_PORT_ID,
    version: MARKETPLACE_SHADOW_RANKING_VERSION,
    contractVersion: SIMULATION_PORT_CONTRACT_VERSION,
    app: "marketplace",
    async evaluate(input: RankingSimulationInput): Promise<RankingSimulationResult> {
      try {
        const binding = parseBinding(input.binding);
        const weights = await resolveWeights(binding);
        const graphConf = input.graphContext?.propagatedConfidence ?? 0.5;

        if (input.mode === "baseline") {
          const score = marketplaceShadowRankingScore(binding.rankingInput, weights);
          const views = Math.max(1, binding.rankingInput.views);
          const portConfidence = capRecommendationConfidence(graphConf, 0.72);

          return {
            status: "OK",
            estimatedPosition: score.position,
            relativeScore: score.overall,
            positionDelta: 0,
            scoreDelta: 0,
            ctrDeltaPct: 0,
            conversionDeltaPct: 0,
            revenueDeltaPct: 0,
            dimensions: {
              rankingScore: score.overall,
              position: score.position,
              ctr: Math.round((binding.rankingInput.favoritesCount / views) * 1000) / 10,
              conversion: Math.round((binding.rankingInput.ordersCount / views) * 1000) / 10,
              revenueIndex: Math.round(score.overall * (binding.rankingInput.ordersCount + 1)),
              trust: binding.rankingInput.sellerTrustScore,
              contentQuality:
                binding.rankingInput.contentQualityScore ?? binding.rankingInput.photoQuality ?? null,
              promotionActive: binding.rankingInput.promotionActive,
              price: binding.rankingInput.price,
              photoCount: binding.rankingInput.photoCount,
              hasVideo: binding.rankingInput.hasVideo,
            },
            factors: [{ key: "ranking_score", contribution: score.overall / 100, confidence: portConfidence }],
            confidence: portConfidence,
            source: {
              app: "marketplace",
              module: "ranking-simulation.adapter",
              version: MARKETPLACE_SHADOW_RANKING_VERSION,
              portId: MARKETPLACE_RANKING_SIMULATION_PORT_ID,
            },
          };
        }

        const simulatedInput = applyScenarioToMarketplaceRankingInput(
          binding.rankingInput,
          input.scenario,
        );
        const shadow = marketplaceShadowRankingSimulate({
          baseline: binding.rankingInput,
          simulated: simulatedInput,
          peerScores: binding.peerScores,
          weights,
        });
        const behaviour = estimateMarketplaceBehaviourDeltas({
          baseline: binding.rankingInput,
          scoreDelta: shadow.scoreDelta,
          positionDelta: shadow.positionDelta,
        });

        const rawPortConfidence = Math.min(0.85, 0.45 + Math.abs(shadow.scoreDelta) * 0.02);
        const portConfidence = capRecommendationConfidence(graphConf, rawPortConfidence);

        return {
          status: "OK",
          estimatedPosition: shadow.predictedPosition,
          relativeScore: shadow.predictedScore,
          positionDelta: shadow.positionDelta,
          scoreDelta: shadow.scoreDelta,
          ctrDeltaPct: behaviour.ctrDeltaPct,
          conversionDeltaPct: behaviour.conversionDeltaPct,
          revenueDeltaPct: behaviour.revenueDeltaPct,
          factors: [
            { key: "ranking_score_delta", contribution: shadow.scoreDelta / 100, confidence: portConfidence },
            { key: "position_delta", contribution: (shadow.positionDelta ?? 0) / 100, confidence: portConfidence * 0.9 },
          ],
          confidence: portConfidence,
          source: {
            app: "marketplace",
            module: "ranking-simulation.adapter",
            version: MARKETPLACE_SHADOW_RANKING_VERSION,
            portId: MARKETPLACE_RANKING_SIMULATION_PORT_ID,
          },
        };
      } catch (err) {
        return {
          status: "DEGRADED",
          failedPort: MARKETPLACE_RANKING_SIMULATION_PORT_ID,
          failureReason: err instanceof Error ? err.message : String(err),
          retryable: true,
          estimatedPosition: null,
          relativeScore: null,
          factors: [],
          confidence: 0,
          source: {
            app: "marketplace",
            module: "ranking-simulation.adapter",
            version: MARKETPLACE_SHADOW_RANKING_VERSION,
            portId: MARKETPLACE_RANKING_SIMULATION_PORT_ID,
          },
        };
      }
    },
  };
}

export function ensureMarketplaceRankingSimulationPortRegistered(): void {
  registerSimulationPort(createMarketplaceRankingSimulationPort());
}

export async function runTwinSimulationWithRankingInput(input: {
  productId: string;
  rankingInput: RankingProductInput;
  peerScores?: number[];
  scenarioIds?: string[];
  monteCarloIterations?: number;
  graphCoverage?: number;
  graphPropagatedConfidence?: number;
  verifiedFactCount?: number;
  weights?: RankingWeightRow[];
}): Promise<import("@/lib/ccos/twin").TwinDecisionReport> {
  ensureMarketplaceRankingSimulationPortRegistered();
  const { runTwinSimulation } = await import("@/lib/ccos/twin/simulation");

  return runTwinSimulation({
    productId: input.productId,
    app: "marketplace",
    scenarioIds: input.scenarioIds,
    monteCarloIterations: input.monteCarloIterations,
    simulationPortId: MARKETPLACE_RANKING_SIMULATION_PORT_ID,
    simulationBinding: {
      rankingInput: input.rankingInput,
      peerScores: input.peerScores ?? [],
      weights: input.weights,
    } satisfies MarketplaceSimulationBinding,
    entityLabel: input.rankingInput.name,
    graphCoverage: input.graphCoverage,
    graphPropagatedConfidence: input.graphPropagatedConfidence,
    verifiedFactCount: input.verifiedFactCount,
  });
}

export {
  marketplaceShadowRankingSimulate,
  applyScenarioToMarketplaceRankingInput,
  estimateMarketplaceBehaviourDeltas,
  DEFAULT_RANKING_WEIGHTS_V1,
};
