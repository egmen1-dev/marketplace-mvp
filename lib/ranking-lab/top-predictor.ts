import { rankProductsByScore } from "@/lib/marketplace-ranking-intelligence/calibration-100";
import type { RankingProductInput } from "@/lib/marketplace-ranking-intelligence/types";

import { ADVISOR_ACTIONS } from "./seller-advisor";
import type { LabTopPredictorReport } from "./types";

function positionOf(products: RankingProductInput[], id: string): number {
  return rankProductsByScore(products).find((r) => r.product.id === id)?.position ?? products.length;
}

export function predictTopPosition(input: {
  allProducts: RankingProductInput[];
  productId: string;
  actionKeys?: string[];
}): LabTopPredictorReport | null {
  const product = input.allProducts.find((p) => p.id === input.productId);
  if (!product) return null;

  const currentPosition = positionOf(input.allProducts, input.productId);
  const templates = input.actionKeys?.length
    ? ADVISOR_ACTIONS.filter((a) => input.actionKeys!.includes(a.factorKey))
    : ADVISOR_ACTIONS.slice(0, 4);

  let nextProducts = [...input.allProducts];
  const appliedChanges: string[] = [];
  for (const t of templates) {
    nextProducts = nextProducts.map((p) => (p.id === input.productId ? t.apply(p) : p));
    appliedChanges.push(t.title);
  }

  const predictedPosition = positionOf(nextProducts, input.productId);
  const gain = currentPosition - predictedPosition;
  const confidencePercent = Math.min(
    92,
    Math.max(55, 60 + gain * 2 + templates.length * 4),
  );

  return {
    productId: input.productId,
    productName: product.name,
    currentPosition,
    predictedPosition,
    appliedChanges,
    confidencePercent,
  };
}
