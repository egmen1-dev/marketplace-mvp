import { rankProductsByScore } from "@/lib/marketplace-ranking-intelligence/calibration-100";
import type { RankingProductInput } from "@/lib/marketplace-ranking-intelligence/types";

import { ADVISOR_ACTIONS } from "./seller-advisor";
import type { LabAcademyStep, LabRankingAcademyReport } from "./types";

function positionOf(products: RankingProductInput[], id: string): number {
  return rankProductsByScore(products).find((r) => r.product.id === id)?.position ?? products.length;
}

export function buildRankingAcademy(input: {
  allProducts: RankingProductInput[];
  productId: string;
  targetPosition?: number;
}): LabRankingAcademyReport | null {
  const product = input.allProducts.find((p) => p.id === input.productId);
  if (!product) return null;

  const targetPosition = input.targetPosition ?? 10;
  const currentPosition = positionOf(input.allProducts, input.productId);

  const steps: LabAcademyStep[] = [];
  let pool = [...input.allProducts];
  let pos = currentPosition;

  for (const action of ADVISOR_ACTIONS) {
    if (pos <= targetPosition) break;
    pool = pool.map((p) => (p.id === input.productId ? action.apply(p) : p));
    const nextPos = positionOf(pool, input.productId);
    const gain = Math.max(0, pos - nextPos);
    if (gain > 0) {
      steps.push({
        title: action.title,
        stars: action.stars,
        factorKey: action.factorKey,
        expectedGain: gain,
      });
      pos = nextPos;
    }
  }

  const remaining = Math.max(0, pos - targetPosition);
  const successProbabilityPercent = Math.min(
    95,
    Math.max(40, 95 - remaining * 3 - steps.length * 2),
  );

  return {
    productId: input.productId,
    productName: product.name,
    currentPosition,
    targetPosition,
    steps: steps.slice(0, 6),
    successProbabilityPercent,
  };
}

export function formatAcademyStars(stars: number): string {
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}
