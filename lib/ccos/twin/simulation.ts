import {
  evaluateSimulationWithTimeout,
  requireSimulationPort,
} from "@/lib/ccos/simulation";

import { computeTwinConfidence } from "./confidence";
import { compareDecisionScenarios, pickBestScenarioId } from "./decision-compare";
import { assertTwinAdvisoryOnly, assertTwinGovernance } from "./governance";
import { runMonteCarloSimulation } from "./monte-carlo";
import { assessScenarioRisk } from "./risk";
import { resolveScenarios } from "./scenarios";
import { buildTwinStateFromInput } from "./state-builder";
import { saveTwinSimulationMemory } from "./memory";
import type { BuildTwinSimulationInput, TwinDecisionReport, TwinResult } from "./types";
import { BASELINE_SCENARIO } from "./types";

export const DEFAULT_SIMULATION_PORT_ID = "marketplace-ranking-simulation";

function mapSimulationToTwinResult(input: {
  scenario: import("./types").TwinScenario;
  sim: Awaited<ReturnType<typeof evaluateSimulationWithTimeout>>;
  baseline: ReturnType<typeof buildTwinStateFromInput>;
  graphPropagatedConfidence?: number;
  hasBehaviourData?: boolean;
}): TwinResult {
  const behaviour = {
    ctrDeltaPct: input.sim.ctrDeltaPct ?? 0,
    conversionDeltaPct: input.sim.conversionDeltaPct ?? 0,
    revenueDeltaPct: input.sim.revenueDeltaPct ?? 0,
    positionDelta: input.sim.positionDelta ?? undefined,
  };

  const confidence = computeTwinConfidence({
    sampleSize: input.baseline.sampleSize,
    knowledgeCoverage: input.baseline.knowledgeCoverage,
    graphCoverage: input.baseline.graphCoverage,
    graphPropagatedConfidence: input.graphPropagatedConfidence,
    simulationPortConfidence: input.sim.confidence,
    hasBehaviourData: input.hasBehaviourData,
  });

  const baseResult: TwinResult = {
    scenarioId: input.scenario.id,
    scenarioLabel: input.scenario.label,
    simulationStatus: input.sim.status,
    failedPort: input.sim.failedPort,
    predicted: {
      position: input.sim.estimatedPosition,
      positionDelta: input.sim.positionDelta ?? undefined,
      ctrDeltaPct: behaviour.ctrDeltaPct,
      conversionDeltaPct: behaviour.conversionDeltaPct,
      revenueDeltaPct: behaviour.revenueDeltaPct,
      rankingScoreDelta: input.sim.scoreDelta ?? undefined,
    },
    monteCarlo: { iterations: 0, probabilities: {}, median: {} },
    risk: assessScenarioRisk(input.scenario, behaviour),
    confidence,
    portProvenance: {
      portId: input.sim.source.portId,
      app: input.sim.source.app,
      module: input.sim.source.module,
      version: input.sim.source.version,
    },
    advisoryOnly: true,
  };

  baseResult.monteCarlo = runMonteCarloSimulation({
    iterations: 36,
    baseResult,
  });

  baseResult.confidence = computeTwinConfidence({
    sampleSize: input.baseline.sampleSize,
    knowledgeCoverage: input.baseline.knowledgeCoverage,
    graphCoverage: input.baseline.graphCoverage,
    graphPropagatedConfidence: input.graphPropagatedConfidence,
    simulationPortConfidence: input.sim.confidence,
    monteCarloStability: baseResult.monteCarlo.probabilities.ctrGrowth ?? 0.5,
    hasBehaviourData: input.hasBehaviourData,
  });

  return assertTwinAdvisoryOnly(baseResult);
}

export async function runTwinSimulation(input: BuildTwinSimulationInput): Promise<TwinDecisionReport> {
  if (!input.simulationBinding) {
    throw new Error(
      "Twin simulation requires simulationBinding — register adapter port in marketplace layer",
    );
  }

  const portId = input.simulationPortId ?? DEFAULT_SIMULATION_PORT_ID;
  const port = requireSimulationPort(portId);
  const graphContext = {
    coverage: input.graphCoverage ?? 0,
    propagatedConfidence: input.graphPropagatedConfidence ?? 0,
  };

  const baselineSim = await evaluateSimulationWithTimeout(port, {
    entityId: input.productId,
    entityLabel: input.entityLabel,
    observations: input.observations ?? [],
    graphContext,
    scenario: BASELINE_SCENARIO,
    mode: "baseline",
    binding: input.simulationBinding,
  });

  const baseline = buildTwinStateFromInput({ ...input, baseline: baselineSim });
  const hasBehaviourData = (input.entityMetrics?.views ?? 0) > 20;

  const scenarios = resolveScenarios(input.scenarioIds);
  const results: TwinResult[] = [];

  for (const scenario of scenarios) {
    const sim = await evaluateSimulationWithTimeout(port, {
      entityId: input.productId,
      entityLabel: input.entityLabel,
      observations: input.observations ?? [],
      graphContext,
      scenario,
      mode: "scenario",
      binding: input.simulationBinding,
    });

    results.push(
      mapSimulationToTwinResult({
        scenario,
        sim,
        baseline,
        graphPropagatedConfidence: input.graphPropagatedConfidence,
        hasBehaviourData,
      }),
    );

    saveTwinSimulationMemory({
      productId: input.productId,
      app: input.app ?? "marketplace",
      result: results[results.length - 1],
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
