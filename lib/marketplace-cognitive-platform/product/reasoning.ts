import type { ProductUnderstanding } from "@/lib/ccos/product";
import type { ActionCandidate } from "../brain/v1/types";

export function collectProductUnderstandingActions(
  understanding: ProductUnderstanding,
  _productId: string,
): ActionCandidate[] {
  const candidates: ActionCandidate[] = [];

  for (const conflict of understanding.identity.conflicts) {
    candidates.push({
      id: `fix-identity-${conflict.field}`,
      source: "product-understanding",
      category: "quality",
      title: "Исправьте противоречие в карточке",
      why: conflict.explanation,
      expectedImpact: "Согласованная Product Identity",
      effort: "medium",
      ctaLabel: "Редактировать карточку",
      score: conflict.severity === "high" ? 0.95 : 0.7,
      severity: conflict.severity === "high" ? 0.95 : 0.7,
      hardBlocker: conflict.severity === "high",
    });
  }

  for (const mistake of understanding.categoryPack.typicalMistakes.slice(0, 1)) {
    candidates.push({
      id: "fix-category-mistake",
      source: "category-pack",
      category: "quality",
      title: `Устраните типичную ошибку: ${mistake}`,
      why: `Пакет категории ${understanding.categoryPack.id}`,
      expectedImpact: "Лучший контент для категории",
      effort: "medium",
      ctaLabel: "Улучшить карточку",
      score: 0.55,
      severity: 0.55,
    });
  }

  const weakUseCase = understanding.useCases.find((u) => u.fitScore < 0.5 && u.recommendation);
  if (weakUseCase?.recommendation) {
    candidates.push({
      id: `use-case-${weakUseCase.id}`,
      source: "product-understanding",
      category: "data",
      title: weakUseCase.recommendation,
      why: `Сценарий «${weakUseCase.label}» — fit ${Math.round(weakUseCase.fitScore * 100)}%`,
      expectedImpact: "Лучшее соответствие аудитории",
      effort: "low",
      score: 0.5,
      severity: 0.5,
    });
  }

  if (understanding.confidence.overall < 0.45) {
    candidates.push({
      id: "collect-product-data",
      source: "product-understanding",
      category: "data",
      title: "Добавьте характеристики и описание",
      why: `Product confidence ${Math.round(understanding.confidence.overall * 100)}% — недостаточно данных`,
      expectedImpact: "Точнее Product Genome",
      effort: "medium",
      score: 0.6,
      severity: 0.6,
    });
  }

  if (candidates.length === 0 && understanding.categoryPack.bestPractices[0]) {
    candidates.push({
      id: "apply-best-practice",
      source: "category-pack",
      category: "quality",
      title: understanding.categoryPack.bestPractices[0],
      why: "Best practice категории",
      expectedImpact: "Идеальный контент для категории",
      effort: "low",
      score: 0.35,
      severity: 0.35,
    });
  }

  return candidates.map((c) => ({ ...c, score: c.score * understanding.confidence.overall }));
}

export function productUnderstandingSummary(understanding: ProductUnderstanding): {
  whatIsSold: string;
  needSolved: string;
  idealContentHint: string;
  confidenceLabel: string;
} {
  const identity = understanding.identity;
  const what = [identity.productType, identity.subcategory, identity.family].filter(Boolean).join(" · ");
  return {
    whatIsSold: what || understanding.dna.primaryNeed,
    needSolved: understanding.dna.primaryNeed,
    idealContentHint: understanding.categoryPack.idealPhotos.slice(0, 2).join(", "),
    confidenceLabel: `${Math.round(understanding.confidence.overall * 100)}% (${understanding.confidence.label})`,
  };
}
