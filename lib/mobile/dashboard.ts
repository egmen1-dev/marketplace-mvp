import { isCcosGraphPlatformEnabled, getCachedGraphInsights } from "@/lib/ccos/graph";
import { isCcosTwinPlatformEnabled, getCachedTwinSimulation } from "@/lib/ccos/twin";
import { buildAndCacheMarketplaceGraphInsights } from "@/lib/marketplace-cognitive-platform/graph";
import { buildMarketplaceTwinDecisionReport } from "@/lib/marketplace-cognitive-platform/twin";
import {
  getMarketplaceBrainReport,
  isCognitiveProductReportAvailable,
} from "@/lib/marketplace-cognitive-platform";
import { toMobileBrainResponse } from "@/lib/marketplace-cognitive-platform/brain/mobile-api";
import { toMobileScenarioSimulatorResponse } from "@/lib/marketplace-cognitive-platform/twin/mobile-api";
import { buildKnowledgeSnapshot } from "@/lib/ccos/knowledge";

export type MobileDashboardPayload = {
  productId: string;
  brain: ReturnType<typeof toMobileBrainResponse> | null;
  genome: {
    contextual: number | null;
    base: number | null;
    productGenome: number | null;
  };
  graph: {
    primaryCause: string | null;
    topFactors: Array<{ label: string; influence: number }>;
    recommendedAction: string | null;
    confidence: number | null;
    health: string | null;
  } | null;
  twin: ReturnType<typeof toMobileScenarioSimulatorResponse> | null;
  knowledgeSyncVersion: string;
  advisoryOnly: true;
};

export async function buildMobileDashboard(productId: string): Promise<MobileDashboardPayload | null> {
  if (!isCognitiveProductReportAvailable()) return null;

  const report = await getMarketplaceBrainReport(productId, { includeSimulations: true });
  if (!report) return null;

  let graphPayload: MobileDashboardPayload["graph"] = null;
  if (isCcosGraphPlatformEnabled()) {
    const cached = getCachedGraphInsights(productId);
    const built = cached
      ? null
      : await buildAndCacheMarketplaceGraphInsights({
          productId,
          observations: report.observations,
        });
    const graph = cached?.graph ?? built!.graph;
    const insights = cached?.insights ?? built!.insights;
    graphPayload = {
      primaryCause: insights.primaryCause,
      topFactors: insights.topFactors.map((f) => ({ label: f.label, influence: f.influence })),
      recommendedAction: insights.recommendedAction,
      confidence: insights.confidence,
      health: graph.health.label,
    };
  }

  let twinPayload = null;
  if (isCcosTwinPlatformEnabled()) {
    const cachedTwin = getCachedTwinSimulation(productId);
    const twinReport =
      cachedTwin?.report ?? (await buildMarketplaceTwinDecisionReport({ productId }));
    if (twinReport) {
      twinPayload = toMobileScenarioSimulatorResponse(twinReport);
    }
  }

  return {
    productId,
    brain: toMobileBrainResponse(report),
    genome: {
      contextual: report.genome.contextual.overall,
      base: report.genome.base.overall,
      productGenome: report.productUnderstanding?.genome.overall ?? null,
    },
    graph: graphPayload,
    twin: twinPayload,
    knowledgeSyncVersion: buildKnowledgeSnapshot(["marketplace"]).syncVersion,
    advisoryOnly: true,
  };
}
