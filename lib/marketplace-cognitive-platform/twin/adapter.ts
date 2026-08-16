import {
  ensureMarketplaceRankingSimulationPortRegistered,
  MARKETPLACE_RANKING_SIMULATION_PORT_ID,
  type MarketplaceSimulationBinding,
} from "../adapters/ranking-simulation.adapter";
import { buildCausalKnowledgeGraph } from "@/lib/ccos/graph";
import { getBrainReadableKnowledge } from "@/lib/ccos/knowledge";
import {
  buildTwinReplayFromHistory,
  cacheTwinSimulation,
  runTwinSimulation,
  type TwinDecisionReport,
  type TwinReplayEvent,
} from "@/lib/ccos/twin";
import { isCcosProductPlatformEnabled } from "@/lib/ccos/product";
import { buildMarketplaceProductUnderstanding } from "../product/adapter";
import { loadPeerScoresForProduct, loadProductInput } from "@/lib/marketplace-ranking-intelligence/queries";

export async function buildMarketplaceTwinDecisionReport(input: {
  productId: string;
  scenarioIds?: string[];
  monteCarloIterations?: number;
  history?: TwinReplayEvent[];
}): Promise<TwinDecisionReport | null> {
  ensureMarketplaceRankingSimulationPortRegistered();

  const rankingInput = await loadProductInput(input.productId);
  if (!rankingInput) return null;

  const peerScores = await loadPeerScoresForProduct(input.productId);
  const productUnderstanding = isCcosProductPlatformEnabled()
    ? await buildMarketplaceProductUnderstanding(input.productId)
    : null;
  const verifiedFacts = getBrainReadableKnowledge({ pack: "marketplace" });
  const graph = buildCausalKnowledgeGraph({
    productId: input.productId,
    productUnderstanding,
    verifiedFacts,
  });

  const binding: MarketplaceSimulationBinding = {
    rankingInput,
    peerScores,
  };

  const report = await runTwinSimulation({
    productId: input.productId,
    app: "marketplace",
    scenarioIds: input.scenarioIds,
    monteCarloIterations: input.monteCarloIterations,
    simulationPortId: MARKETPLACE_RANKING_SIMULATION_PORT_ID,
    simulationBinding: binding,
    entityLabel: rankingInput.name,
    entityMetrics: {
      views: rankingInput.views,
      favoritesCount: rankingInput.favoritesCount,
      ordersCount: rankingInput.ordersCount,
    },
    graphCoverage: graph.coverage,
    graphPropagatedConfidence: graph.propagatedConfidence,
    verifiedFactCount: verifiedFacts.length,
    productUnderstanding,
    history: input.history,
  });

  cacheTwinSimulation({
    productId: input.productId,
    app: "marketplace",
    report,
    pendingSync: false,
  });

  return report;
}

export async function buildMarketplaceTwinReplay(productId: string): Promise<TwinReplayEvent[]> {
  const rankingInput = await loadProductInput(productId);
  if (!rankingInput) return [];
  return buildTwinReplayFromHistory({
    metrics: {
      views: rankingInput.views,
      favoritesCount: rankingInput.favoritesCount,
      ordersCount: rankingInput.ordersCount,
    },
  });
}
