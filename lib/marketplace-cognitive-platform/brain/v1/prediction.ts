import { loadProductInput } from "@/lib/marketplace-ranking-intelligence/queries";
import { runSensitivityLab } from "@/lib/ranking-lab/sensitivity-engine";
import { assertBrainCapability } from "@/lib/ccos/governance/maturity";

import { resolveMarketplaceBrainMaturity } from "../../flags";
import type { BrainSimulation } from "./types";

export const PREDICTION_VERSION = "prediction-v1";

export async function buildBrainSimulations(input: {
  productId: string;
  includeSimulations?: boolean;
  topActionTitle?: string | null;
}): Promise<BrainSimulation[]> {
  if (!input.includeSimulations) return [];

  const maturity = resolveMarketplaceBrainMaturity();
  if (!assertBrainCapability(maturity, "simulate")) return [];

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
      modelSource: `ranking-lab/sensitivity-engine@${PREDICTION_VERSION}`,
      advisoryOnly: true,
      wording,
    },
  ];
}
