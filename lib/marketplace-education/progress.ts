import type { CompletenessFactor, CompletenessResult } from "@/lib/conversion/completeness";

import type {
  QualityFactorExplanation,
  QualityScoreExplanation,
} from "./types";

const FACTOR_WHY: Record<CompletenessFactor["key"], string> = {
  photos: "Покупатель сначала оценивает внешний вид — фото формирует первое впечатление.",
  title:
    "Название помогает понять, что это за товар, ещё до открытия карточки.",
  description:
    "Описание отвечает на вопросы покупателя и снижает сомнения перед заказом.",
  characteristics:
    "Характеристики нужны для сравнения и фильтров — без них сложнее выбрать.",
  category: "Категория и тип помогают покупателям найти товар в нужном разделе.",
  price: "Понятная цена — базовое условие для решения о покупке.",
  seller: "Привязка к продавцу нужна для доставки и поддержки заказа.",
};

const FACTOR_FIX: Partial<Record<CompletenessFactor["key"], string>> = {
  photos: "Добавьте 3+ качественных фото с разных ракурсов.",
  title: 'Уточните название: модель, назначение, ключевые параметры.',
  description: "Опишите комплектацию, состояние и для кого подходит товар.",
  characteristics: "Добавьте мощность, вес, комплектацию и другие ключевые параметры.",
  category: "Выберите тип товара в таксономии.",
  price: "Укажите актуальную цену в рублях.",
};

export function explainQualityScore(
  result: CompletenessResult,
): QualityScoreExplanation {
  const factors: QualityFactorExplanation[] = result.factors.map((f) => ({
    key: f.key,
    label: f.label,
    score: f.score,
    max: f.max,
    whyImportant: FACTOR_WHY[f.key],
    fixHint:
      f.score >= f.max * 0.75 ? null : (FACTOR_FIX[f.key] ?? f.hint),
  }));

  return {
    score: result.score,
    factors,
  };
}

export function onboardingProgressPercent(
  completedCount: number,
  totalCount: number,
): number {
  if (totalCount <= 0) return 0;
  return Math.round((completedCount / totalCount) * 100);
}

export function guideProgressPercent(
  completedStepIds: string[],
  totalSteps: number,
): number {
  if (totalSteps <= 0) return 0;
  return Math.round((completedStepIds.length / totalSteps) * 100);
}
