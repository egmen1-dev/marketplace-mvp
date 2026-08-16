import { DEFAULT_RANKING_WEIGHTS_V1 } from "@/lib/marketplace-ranking-intelligence/ranking-weights";
import { loadPeerScoresForProduct, loadProductInput } from "@/lib/marketplace-ranking-intelligence/queries";
import { runSensitivityLab } from "@/lib/ranking-lab/sensitivity-engine";
import { assertBrainCapability } from "@/lib/ccos/governance/maturity";
import { isCcosTwinPlatformEnabled } from "@/lib/ccos/twin";

import { resolveMarketplaceBrainMaturity } from "../../flags";
import type { BrainSimulation } from "./types";

export const PREDICTION_VERSION = "prediction-v2-twin";

export async function buildBrainSimulations(input: {
  productId: string;
  includeSimulations?: boolean;
  topActionTitle?: string | null;
}): Promise<BrainSimulation[]> {
  if (!input.includeSimulations) return [];

  const maturity = resolveMarketplaceBrainMaturity();
  if (!assertBrainCapability(maturity, "simulate")) return [];

  if (isCcosTwinPlatformEnabled()) {
    const rankingInput = await loadProductInput(input.productId);
    if (!rankingInput) return [];

    const peerScores = await loadPeerScoresForProduct(input.productId);
    const { runTwinSimulationWithRankingInput } = await import(
      "@/lib/marketplace-cognitive-platform/adapters/ranking-simulation.adapter"
    );
    const twinReport = await runTwinSimulationWithRankingInput({
      productId: input.productId,
      rankingInput,
      peerScores,
      scenarioIds: ["scenario_photo", "scenario_price_3", "scenario_combo"],
      weights: DEFAULT_RANKING_WEIGHTS_V1,
    });

    const best = twinReport.scenarios.find((s) => s.scenarioId === twinReport.bestScenarioId);
    if (!best) return [];

    const positionDelta = best.predicted.positionDelta;
    const confidence = best.confidence.overall;
    const mc = best.monteCarlo;

    const wording =
      confidence >= 0.6
        ? `Просчитано ${twinReport.scenarioCount} сценариев на цифровом двойнике. Лучший: «${best.scenarioLabel}» — CTR ${best.predicted.ctrDeltaPct ?? 0}%, позиция ${positionDelta ?? 0}, confidence ${Math.round(confidence * 100)}%, P(CTR↑)=${Math.round((mc.probabilities.ctrGrowth ?? 0) * 100)}%.`
        : `Twin simulation: умеренная confidence (${Math.round(confidence * 100)}%).`;

    return [
      {
        intervention: input.topActionTitle ?? best.scenarioLabel,
        predicted: {
          positionDelta,
          ctrDeltaPct: best.predicted.ctrDeltaPct,
          conversionDeltaPct: best.predicted.conversionDeltaPct,
          salesDeltaPct: best.predicted.revenueDeltaPct,
        },
        confidence,
        modelSource: `ccos/twin/shadow-ranking@${PREDICTION_VERSION}`,
        advisoryOnly: true,
        wording,
      },
    ];
  }

  const productInput = await loadProductInput(input.productId);
  if (!productInput) return [];

  const allProducts = [productInput];
  const photoStep = runSensitivityLab(allProducts, input.productId, [
    {
      key: "photo_plus_1",
      label: "+1 фотография",
      apply: (p) => ({ ...p, photoCount: p.photoCount + 1 }),
    },
  ]);

  if (!photoStep || photoStep.steps.length === 0) return [];

  const step = photoStep.steps[0];
  const positionDelta =
    step.positionBefore != null && step.positionAfter != null
      ? step.positionBefore - step.positionAfter
      : undefined;

  const confidence =
    positionDelta != null && Math.abs(positionDelta) > 0
      ? Math.min(0.75, 0.45 + Math.abs(positionDelta) * 0.05)
      : 0.35;

  const wording =
    confidence >= 0.6
      ? `По тестовой модели улучшение может быть умеренным (Δ позиции ~${positionDelta ?? 0}).`
      : "По тестовой модели ожидаемое улучшение: умеренное (низкая confidence).";

  if (confidence < 0.45 && positionDelta == null) return [];

  return [
    {
      intervention: input.topActionTitle ?? "Улучшение карточки",
      predicted: {
        positionDelta,
      },
      confidence,
      modelSource: `ranking-lab/sensitivity-engine@prediction-v1`,
      advisoryOnly: true,
      wording,
    },
  ];
}
