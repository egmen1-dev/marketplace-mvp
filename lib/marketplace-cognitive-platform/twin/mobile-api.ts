import type { TwinDecisionReport, TwinResult } from "@/lib/ccos/twin";

export type MobileScenarioSimulatorResponse = {
  productId: string;
  scenarioId: string;
  scenarioLabel: string;
  predicted: {
    positionDelta: number | null;
    ctrDeltaPct: number | null;
    conversionDeltaPct: number | null;
  };
  confidence: {
    overall: number;
    label: string;
    reason: string;
  };
  risks: string[];
  riskLevel: string;
  bestAlternative: string | null;
  advisoryOnly: true;
};

function pickScenario(
  report: TwinDecisionReport,
  scenarioId?: string,
): TwinResult | null {
  if (scenarioId) {
    return report.scenarios.find((s) => s.scenarioId === scenarioId) ?? null;
  }
  const best = report.bestScenarioId
    ? report.scenarios.find((s) => s.scenarioId === report.bestScenarioId)
    : null;
  return best ?? report.scenarios[0] ?? null;
}

export function toMobileScenarioSimulatorResponse(
  report: TwinDecisionReport,
  scenarioId?: string,
): MobileScenarioSimulatorResponse | null {
  const scenario = pickScenario(report, scenarioId);
  if (!scenario) return null;

  const bestAlt =
    report.comparison.find((c) => c.scenarioId !== scenario.scenarioId && c.rank === 1)?.label ??
    null;

  return {
    productId: report.productId,
    scenarioId: scenario.scenarioId,
    scenarioLabel: scenario.scenarioLabel,
    predicted: {
      positionDelta: scenario.predicted.positionDelta ?? null,
      ctrDeltaPct: scenario.predicted.ctrDeltaPct ?? null,
      conversionDeltaPct: scenario.predicted.conversionDeltaPct ?? null,
    },
    confidence: {
      overall: scenario.confidence.overall,
      label: scenario.confidence.label,
      reason: scenario.confidence.reason,
    },
    risks: scenario.risk.factors,
    riskLevel: scenario.risk.level,
    bestAlternative: bestAlt,
    advisoryOnly: true,
  };
}

export function toOfflineTwinCachePayload(report: TwinDecisionReport) {
  return {
    productId: report.productId,
    syncVersion: report.computedAt,
    scenarioCount: report.scenarioCount,
    bestScenarioId: report.bestScenarioId,
    comparison: report.comparison.slice(0, 5),
    scenarios: report.scenarios.slice(0, 5).map((s) => ({
      id: s.scenarioId,
      label: s.scenarioLabel,
      positionDelta: s.predicted.positionDelta,
      ctrDeltaPct: s.predicted.ctrDeltaPct,
      confidence: s.confidence.overall,
      risk: s.risk.level,
    })),
    advisoryOnly: true as const,
  };
}
