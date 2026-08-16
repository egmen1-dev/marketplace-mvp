import { DEFAULT_RANKING_WEIGHTS_V1 } from "@/lib/marketplace-ranking-intelligence/ranking-weights";
import { getActiveRankingVersion } from "@/lib/marketplace-ranking-intelligence/ranking-version";
import type { RankingProductInput, RankingWeightRow } from "@/lib/marketplace-ranking-intelligence/types";

import { computeTwinConfidence } from "./confidence";
import { compareDecisionScenarios, pickBestScenarioId } from "./decision-compare";
import { assertTwinAdvisoryOnly, assertTwinGovernance } from "./governance";
import { runMonteCarloSimulation } from "./monte-carlo";
import { assessScenarioRisk } from "./risk";
import { applyScenarioToRankingInput, resolveScenarios } from "./scenarios";
import { estimateBehaviourDeltas, shadowRankingSimulate } from "./shadow-ranking";
import { buildMarketplaceTwinStateFromInput } from "./state-builder";
import { saveTwinSimulationMemory } from "./memory";
import type { BuildTwinSimulationInput, TwinDecisionReport, TwinResult } from "./types";

async function resolveWeights(input: BuildTwinSimulationInput): Promise<RankingWeightRow[]> {
  if (input.weights?.length) return input.weights;
  const { weights } = await getActiveRankingVersion();
  return weights;
}

export async function runTwinSimulation(input: BuildTwinSimulationInput): Promise<TwinDecisionReport> {
  if (!input.rankingInput) {
    throw new Error("Twin simulation requires rankingInput — use marketplace adapter for DB load");
  }

  const weights = await resolveWeights(input);
  const peerScores = input.peerScores ?? [];
  const baseline = buildMarketplaceTwinStateFromInput({
    ...input,
    rankingInput: input.rankingInput,
    peerScores,
    weights,
  });

  const scenarios = resolveScenarios(input.scenarioIds);
  const results: TwinResult[] = [];

  for (const scenario of scenarios) {
    const simulatedInput = applyScenarioToRankingInput(input.rankingInput, scenario);
    const shadow = shadowRankingSimulate({
      baseline: input.rankingInput,
      simulated: simulatedInput,
      peerScores,
      weights,
    });
    const behaviour = estimateBehaviourDeltas({
      baseline: input.rankingInput,
      scoreDelta: shadow.scoreDelta,
      positionDelta: shadow.positionDelta,
    });

    const baseResult: TwinResult = {
      scenarioId: scenario.id,
      scenarioLabel: scenario.label,
      predicted: {
        position: shadow.predictedPosition,
        positionDelta: shadow.positionDelta ?? undefined,
        ctrDeltaPct: behaviour.ctrDeltaPct,
        conversionDeltaPct: behaviour.conversionDeltaPct,
        revenueDeltaPct: behaviour.revenueDeltaPct,
        rankingScoreDelta: shadow.scoreDelta,
      },
      monteCarlo: { iterations: 0, probabilities: {}, median: {} },
      risk: assessScenarioRisk(scenario, behaviour),
      confidence: computeTwinConfidence({
        sampleSize: baseline.sampleSize,
        knowledgeCoverage: baseline.knowledgeCoverage,
        graphCoverage: baseline.graphCoverage,
        graphPropagatedConfidence: input.graphPropagatedConfidence,
        hasBehaviourData: input.rankingInput.views > 20,
      }),
      advisoryOnly: true,
    };

    baseResult.monteCarlo = runMonteCarloSimulation({
      iterations: input.monteCarloIterations ?? 36,
      baseResult,
    });

    baseResult.confidence = computeTwinConfidence({
      sampleSize: baseline.sampleSize,
      knowledgeCoverage: baseline.knowledgeCoverage,
      graphCoverage: baseline.graphCoverage,
      graphPropagatedConfidence: input.graphPropagatedConfidence,
      monteCarloStability: baseResult.monteCarlo.probabilities.ctrGrowth ?? 0.5,
      hasBehaviourData: input.rankingInput.views > 20,
    });

    results.push(assertTwinAdvisoryOnly(baseResult));
    saveTwinSimulationMemory({
      productId: input.productId,
      app: input.app ?? "marketplace",
      result: baseResult,
    });
  }

  const comparison = compareDecisionScenarios(results);
  const report: TwinDecisionReport = {
    productId: input.productId,
    app: input.app ?? "marketplace",
    baseline,
    scenarios: results,
    comparison,
    bestScenarioId: pickBestScenarioId(comparison),
    scenarioCount: results.length,
    governance: assertTwinGovernance(),
    advisoryOnly: true,
    computedAt: new Date().toISOString(),
  };

  return assertTwinAdvisoryOnly(report);
}

export async function runTwinSimulationWithRankingInput(input: {
  productId: string;
  rankingInput: RankingProductInput;
  peerScores?: number[];
  scenarioIds?: string[];
  graphCoverage?: number;
  verifiedFactCount?: number;
  weights?: RankingWeightRow[];
}): Promise<TwinDecisionReport> {
  return runTwinSimulation({
    productId: input.productId,
    rankingInput: input.rankingInput,
    peerScores: input.peerScores ?? [],
    scenarioIds: input.scenarioIds,
    graphCoverage: input.graphCoverage,
    verifiedFactCount: input.verifiedFactCount,
    weights: input.weights ?? DEFAULT_RANKING_WEIGHTS_V1,
  });
}
