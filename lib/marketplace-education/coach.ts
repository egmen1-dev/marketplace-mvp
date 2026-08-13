import type { CompletenessFactor, CompletenessResult } from "@/lib/conversion/completeness";
import { ROUTES, sellerProductEditPath } from "@/lib/constants";
import { isMarketplaceExecutionEnabled } from "@/lib/marketplace-execution/flags";
import { isPromotionIntelligenceEnabled } from "@/lib/promotion/intelligence/flags";
import { isSellerGrowthEnabled } from "@/lib/seller-growth/flags";
import type { SellerHealthSnapshot } from "@/lib/seller-growth/seller-health";

import type {
  QualityFactorExplanation,
  QualityScoreExplanation,
  SellerCoachRecommendation,
} from "./types";

const FACTOR_WHY: Record<CompletenessFactor["key"], string> = {
  photos: "Покупатель сначала оценивает изображение.",
  title: "Название помогает понять товар до открытия карточки.",
  description: "Описание снижает сомнения перед заказом.",
  characteristics: "Характеристики помогают найти и сравнить товар.",
  category: "Категория помогает покупателям найти товар в разделе.",
  price: "Понятная цена — базовое условие покупки.",
  seller: "Привязка к продавцу нужна для поддержки заказа.",
};

const FACTOR_GOOD: Partial<Record<CompletenessFactor["key"], string[]>> = {
  photos: ["Есть главное изображение"],
  title: ["Название достаточно информативное"],
  description: ["Описание отвечает на базовые вопросы"],
  characteristics: ["Часть характеристик уже заполнена"],
  category: ["Категория указана"],
  price: ["Цена указана"],
};

const FACTOR_IMPROVE: Partial<Record<CompletenessFactor["key"], string[]>> = {
  photos: ["Добавьте фото комплектации", "Добавьте 3+ ракурса"],
  title: ["Уточните модель и назначение"],
  description: ["Опишите комплектацию и состояние"],
  characteristics: ["Заполните мощность, вес, комплектацию"],
  category: ["Выберите точный тип товара"],
  price: ["Укажите актуальную цену"],
};

const FACTOR_NEXT: Partial<Record<CompletenessFactor["key"], string>> = {
  photos: "Добавить фото комплектации",
  title: "Уточнить название",
  description: "Дополнить описание",
  characteristics: "Заполнить характеристики",
  category: "Выбрать категорию",
  price: "Указать цену",
};

function factorGood(f: CompletenessFactor): string[] {
  if (f.score >= f.max * 0.75) {
    return FACTOR_GOOD[f.key] ?? [`${f.label} в порядке`];
  }
  if (f.ok) return ["Базовый минимум выполнен"];
  return [];
}

function factorImprove(f: CompletenessFactor): string[] {
  if (f.score >= f.max * 0.75) return [];
  return FACTOR_IMPROVE[f.key] ?? [f.hint];
}

/** Quality score breakdown — UX only, not ranking. */
export function explainQualityScore(
  result: CompletenessResult,
): QualityScoreExplanation {
  const factors: QualityFactorExplanation[] = result.factors.map((f) => {
    const improvePoints = factorImprove(f);
    return {
      key: f.key,
      label: f.label,
      score: f.score,
      max: f.max,
      whyImportant: FACTOR_WHY[f.key],
      goodPoints: factorGood(f),
      improvePoints,
      nextAction:
        improvePoints.length > 0 ? (FACTOR_NEXT[f.key] ?? f.hint) : null,
      fixHint: improvePoints[0] ?? null,
    };
  });

  return { score: result.score, factors };
}

export function onboardingProgressPercent(
  completedCount: number,
  totalCount: number,
): number {
  if (totalCount <= 0) return 0;
  return Math.round((completedCount / totalCount) * 100);
}

/** Build seller AI coach message from health + optional intelligence layers. */
export function buildSellerCoachMessage(input: {
  health: SellerHealthSnapshot | null;
  sellerProfileId: string;
}): SellerCoachRecommendation {
  const sources: string[] = ["marketplace_education"];
  if (isSellerGrowthEnabled()) sources.push("seller_growth");
  if (isPromotionIntelligenceEnabled()) sources.push("promotion_intelligence");
  if (isMarketplaceExecutionEnabled()) sources.push("marketplace_execution");

  if (!input.health || input.health.products.length === 0) {
    return {
      headline: "Ваш AI помощник",
      analysis: "Без карточки товара покупатели не найдут ваш магазин.",
      summary: "Создайте первый товар — это ваша витрина на площадке.",
      steps: [
        {
          order: 1,
          text: "Создать первый товар с понятным названием",
          href: ROUTES.ACCOUNT_PRODUCTS_NEW,
        },
        {
          order: 2,
          text: "Добавить фотографии",
        },
      ],
      href: ROUTES.ACCOUNT_PRODUCTS_NEW,
      ctaLabel: "Создать товар",
      sources,
    };
  }

  const focus = [...input.health.products].sort((a, b) => {
    const aGap = a.views - a.orderCount * 10;
    const bGap = b.views - b.orderCount * 10;
    return bGap - aGap;
  })[0];

  const metrics = {
    views: focus.productViews || focus.views,
    addToCart: focus.addToCart,
    sales: focus.orderCount,
  };

  let analysis = "Продолжайте улучшать карточку — это повышает доверие.";
  if (metrics.views >= 20 && metrics.addToCart >= 1 && metrics.sales === 0) {
    analysis = "Проблема скорее всего в доверии — просмотры есть, но покупок нет.";
  } else if (metrics.views >= 10 && metrics.sales === 0) {
    analysis =
      "Интерес к товару есть, но карточка не убеждает купить — проверьте фото и описание.";
  } else if (metrics.views < 10) {
    analysis = "Мало просмотров — улучшите видимость карточки и рассмотрите продвижение.";
  }

  const steps: SellerCoachRecommendation["steps"] = [];
  if (focus.blockers.some((b) => b.toLowerCase().includes("фото"))) {
    steps.push({
      order: steps.length + 1,
      text: "Добавить фото",
      href: sellerProductEditPath(focus.id),
    });
  }
  if (
    focus.blockers.some((b) => b.toLowerCase().includes("описан")) ||
    focus.qualityScore < 70
  ) {
    steps.push({
      order: steps.length + 1,
      text: "Добавить описание",
      href: sellerProductEditPath(focus.id),
    });
  }
  steps.push({
    order: steps.length + 1,
    text: "Получить отзывы после первых продаж",
  });

  if (steps.length === 0) {
    steps.push({
      order: 1,
      text: "Проверить цену и характеристики",
      href: sellerProductEditPath(focus.id),
    });
  }

  if (isPromotionIntelligenceEnabled() && focus.ready && !focus.isPromoted) {
    steps.push({
      order: steps.length + 1,
      text: "Проверить готовность к продвижению",
      href: ROUTES.ACCOUNT_PROMOTIONS,
    });
  }

  return {
    headline: "Ваш AI помощник",
    productName: focus.name,
    metrics,
    analysis,
    summary: `Ваш товар: ${metrics.views} просмотров · ${metrics.addToCart} в корзине · ${metrics.sales} продаж`,
    steps,
    href: sellerProductEditPath(focus.id),
    ctaLabel: "Исправить",
    sources,
  };
}

export function getFinanceEducationCopy(): {
  title: string;
  steps: Array<{ label: string; body: string }>;
} {
  return {
    title: "Как работает баланс",
    steps: [
      {
        label: "Оплата покупателя",
        body: "Покупатель оплатил заказ через площадку — сумма зафиксирована.",
      },
      {
        label: "Проверка сделки",
        body: "Деньги временно удерживаются до подтверждения получения.",
      },
      {
        label: "Деньги становятся доступными",
        body: "После подтверждения получения средства доступны по правилам площадки.",
      },
    ],
  };
}
