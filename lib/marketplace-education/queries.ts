import { ProductStatus } from "@prisma/client";

import type { CompletenessResult } from "@/lib/conversion/completeness";
import { ROUTES, sellerProductEditPath } from "@/lib/constants";
import { isSellerGrowthEnabled } from "@/lib/seller-growth/flags";
import { loadSellerHealthSnapshot } from "@/lib/seller-growth/seller-health";
import { prisma } from "@/lib/prisma";

import {
  buildSellerOnboardingChecklist,
  type SellerOnboardingSignals,
} from "./checklists";
import { buildEducationGuides } from "./guides";
import { isMarketplaceEducationEnabled } from "./flags";
import { explainQualityScore } from "./progress";
import { buildEducationTooltips } from "./tooltips";
import type {
  BuyerEducationTopic,
  BuyerHelpPrompt,
  EducationChecklist,
  MarketplaceEducationDashboard,
  QualityScoreExplanation,
  SellerCoachRecommendation,
} from "./types";

async function loadSellerOnboardingSignals(
  sellerProfileId: string,
): Promise<SellerOnboardingSignals> {
  const products = await prisma.product.findMany({
    where: { sellerId: sellerProfileId },
    select: {
      id: true,
      stock: true,
      promotionCampaign: { select: { id: true } },
      _count: { select: { images: true, characteristicValues: true } },
    },
    take: 50,
  });

  const hasProduct = products.length > 0;
  const hasPhotos = products.some((p) => p._count.images >= 1);
  const hasCharacteristics = products.some(
    (p) => p._count.characteristicValues >= 2,
  );
  const hasStockConfigured = products.some((p) => p.stock > 0);
  const hasPromotion = products.some((p) => Boolean(p.promotionCampaign));

  return {
    hasProduct,
    hasPhotos,
    hasCharacteristics,
    hasStockConfigured,
    hasPromotion,
  };
}

export async function getSellerOnboardingChecklist(
  sellerProfileId: string,
): Promise<EducationChecklist | null> {
  if (!isMarketplaceEducationEnabled()) return null;
  const signals = await loadSellerOnboardingSignals(sellerProfileId);
  return buildSellerOnboardingChecklist(signals);
}

export async function getQualityScoreExplanation(
  completeness: CompletenessResult,
): Promise<QualityScoreExplanation | null> {
  if (!isMarketplaceEducationEnabled()) return null;
  return explainQualityScore(completeness);
}

export async function getSellerCoachRecommendation(
  sellerProfileId: string,
): Promise<SellerCoachRecommendation | null> {
  if (!isMarketplaceEducationEnabled()) return null;

  const health = await loadSellerHealthSnapshot(sellerProfileId);
  if (!health || health.products.length === 0) {
    return {
      headline: "Ваш следующий шаг",
      summary: "Создайте первый товар — без карточки покупатели не найдут ваш магазин.",
      steps: [
        {
          order: 1,
          text: "Создайте товар с понятным названием",
          href: ROUTES.ACCOUNT_PRODUCTS_NEW,
        },
        {
          order: 2,
          text: "Добавьте 3+ фото",
        },
      ],
      href: ROUTES.ACCOUNT_PRODUCTS_NEW,
      ctaLabel: "Создать товар",
    };
  }

  const weakest = [...health.products].sort(
    (a, b) => a.qualityScore - b.qualityScore,
  )[0];

  const product = weakest;
  const steps: SellerCoachRecommendation["steps"] = [];

  if (product.blockers.some((b) => b.toLowerCase().includes("фото"))) {
    steps.push({
      order: steps.length + 1,
      text: "Добавить качественные фото",
      href: sellerProductEditPath(product.id),
    });
  }
  if (
    product.blockers.some((b) =>
      b.toLowerCase().includes("характеристик"),
    )
  ) {
    steps.push({
      order: steps.length + 1,
      text: "Заполнить ключевые характеристики",
      href: sellerProductEditPath(product.id),
    });
  }
  if (!product.isPromoted && product.ready) {
    steps.push({
      order: steps.length + 1,
      text: "Рассмотреть продвижение для большего числа показов",
      href: ROUTES.ACCOUNT_PROMOTIONS,
    });
  }

  if (steps.length === 0) {
    steps.push({
      order: 1,
      text: "Проверьте цену и описание — карточка уже в хорошем состоянии",
      href: sellerProductEditPath(product.id),
    });
  }

  const viewsHint =
    product.views >= 10 && product.orderCount === 0
      ? "У вас хороший товар, но мало покупок."
      : product.views < 10
        ? "У товара мало просмотров — улучшите видимость карточки."
        : "Продолжайте улучшать карточки — это повышает доверие покупателей.";

  return {
    headline: "Ваш следующий шаг",
    summary: viewsHint,
    steps,
    href: sellerProductEditPath(product.id),
    ctaLabel: "Исправить",
  };
}

export function getBuyerEducationTopics(): BuyerEducationTopic[] {
  if (!isMarketplaceEducationEnabled()) return [];

  return [
    {
      id: "buyer-why-product",
      title: "Почему этот товар?",
      body: "Сравните характеристики, состояние и цену с вашей задачей. Советы ЛОТ не меняют поиск и ранжирование.",
    },
    {
      id: "buyer-why-seller",
      title: "Почему этот продавец?",
      body: "Смотрите метрики продавца, условия доставки и самовывоза. Новые продавцы проходят проверку площадки.",
    },
    {
      id: "buyer-protection",
      title: "Как работает защита покупателя?",
      body: "Оплата через площадку, статус заказа в кабинете, условия возврата в пользовательском соглашении.",
    },
    {
      id: "buyer-delivery",
      title: "Когда я получу товар?",
      body: "Срок зависит от способа получения: доставка или самовывоз. Точные условия указаны на карточке и у продавца.",
    },
  ];
}

export function getBuyerHelpPrompts(productTitle: string): BuyerHelpPrompt[] {
  if (!isMarketplaceEducationEnabled()) return [];

  return [
    {
      id: "help-apartment",
      question: "Подойдёт ли для ремонта квартиры?",
      answerPreview: `Сравните мощность, комплектацию и отзывы для «${productTitle.slice(0, 40)}». Это рекомендация, не изменение поиска.`,
    },
    {
      id: "help-compare",
      question: "Чем отличается от другого товара?",
      answerPreview:
        "Откройте характеристики и похожие товары ниже — так проще сравнить без смены поискового запроса.",
    },
  ];
}

export async function getMarketplaceEducationDashboard(): Promise<MarketplaceEducationDashboard> {
  const enabled = isMarketplaceEducationEnabled();
  const guides = buildEducationGuides();
  const tooltips = buildEducationTooltips();

  if (!enabled) {
    return {
      enabled: false,
      guides,
      tooltips,
      checklists: [],
    };
  }

  const sampleSeller = await prisma.sellerProfile.findFirst({
    where: { isBlocked: false },
    select: { id: true },
  });

  const checklists = sampleSeller
    ? [await getSellerOnboardingChecklist(sampleSeller.id)].filter(
        (c): c is EducationChecklist => c !== null,
      )
    : [buildSellerOnboardingChecklist({
        hasProduct: false,
        hasPhotos: false,
        hasCharacteristics: false,
        hasStockConfigured: false,
        hasPromotion: false,
      })];

  return {
    enabled: true,
    guides,
    tooltips,
    checklists,
  };
}

export async function getSellerGrowthCoach(
  sellerProfileId: string,
): Promise<SellerCoachRecommendation | null> {
  if (!isMarketplaceEducationEnabled()) return null;
  if (isSellerGrowthEnabled()) {
    return getSellerCoachRecommendation(sellerProfileId);
  }
  return getSellerCoachRecommendation(sellerProfileId);
}

/** Finance education copy — UX only, no balance logic. */
export function getFinanceEducationCopy(): {
  title: string;
  steps: Array<{ label: string; body: string }>;
} {
  return {
    title: "Почему деньги ожидаются?",
    steps: [
      {
        label: "Покупатель оплатил",
        body: "Оплата прошла через площадку — средства зафиксированы по заказу.",
      },
      {
        label: "Временное удержание",
        body: "Деньги удерживаются до подтверждения получения — это защищает покупателя и продавца.",
      },
      {
        label: "Доступность средств",
        body: "После подтверждения получения сумма становится доступной для вывода по правилам площадки.",
      },
    ],
  };
}

export async function countActiveSellerProducts(
  sellerProfileId: string,
): Promise<number> {
  return prisma.product.count({
    where: {
      sellerId: sellerProfileId,
      status: ProductStatus.ACTIVE,
    },
  });
}
