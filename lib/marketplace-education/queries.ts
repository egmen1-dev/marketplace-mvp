import { ProductStatus } from "@prisma/client";

import type { CompletenessResult } from "@/lib/conversion/completeness";
import { loadSellerHealthSnapshot } from "@/lib/seller-growth/seller-health";
import { prisma } from "@/lib/prisma";

import {
  buildSellerOnboardingChecklist,
  checklistToContent,
  guideToContent,
  tooltipToContent,
  type SellerOnboardingSignals,
} from "./checklists";
import {
  buildSellerCoachMessage,
  explainQualityScore,
  getFinanceEducationCopy,
} from "./coach";
import { buildEducationGuides } from "./guides";
import { isMarketplaceEducationEnabled } from "./flags";
import { buildEducationTooltips, selectEducationContent } from "./tooltips";
import type {
  BuyerEducationTopic,
  BuyerHelpPrompt,
  EducationChecklist,
  EducationContent,
  MarketplaceEducationDashboard,
  QualityScoreExplanation,
  SellerCoachRecommendation,
} from "./types";
import { EDUCATION_ENTITY_TYPE } from "./types";

type ContentOverride = {
  enabled?: boolean;
  priority?: number;
  description?: string;
};

async function loadContentOverrides(): Promise<Map<string, ContentOverride>> {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const rows = await prisma.adminActionLog.findMany({
    where: {
      entityType: EDUCATION_ENTITY_TYPE,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { entityId: true, action: true, meta: true },
  });

  const map = new Map<string, ContentOverride>();
  for (const row of rows) {
    const current = map.get(row.entityId) ?? {};
    if (row.action === "CONTENT_ENABLED") {
      current.enabled = true;
    } else if (row.action === "CONTENT_DISABLED") {
      current.enabled = false;
    } else if (row.action === "CONTENT_PRIORITY" && row.meta) {
      try {
        const meta = JSON.parse(row.meta) as { priority?: number };
        if (meta.priority != null) current.priority = meta.priority;
      } catch {
        /* ignore */
      }
    } else if (row.action === "CONTENT_EDIT" && row.meta) {
      try {
        const meta = JSON.parse(row.meta) as { description?: string };
        if (meta.description) current.description = meta.description;
      } catch {
        /* ignore */
      }
    }
    map.set(row.entityId, current);
  }
  return map;
}

export function buildEducationContentRegistry(): EducationContent[] {
  const guides = buildEducationGuides().map(guideToContent);
  const tooltips = buildEducationTooltips().map(tooltipToContent);
  const checklist = checklistToContent(
    buildSellerOnboardingChecklist({
      hasProduct: false,
      hasPhotos: false,
      hasCharacteristics: false,
      hasStockConfigured: false,
      hasFirstSale: false,
    }),
  );
  const coachMessage: EducationContent = {
    id: "coach-seller-growth",
    type: "COACH_MESSAGE",
    audience: "SELLER",
    context: "GROWTH",
    title: "Ваш AI помощник",
    description: "Контекстные рекомендации на основе просмотров, корзины и продаж.",
    priority: 95,
    enabled: true,
    steps: [],
  };
  return [...guides, ...tooltips, checklist, coachMessage];
}

export async function applyContentOverrides(
  content: EducationContent[],
): Promise<EducationContent[]> {
  const overrides = await loadContentOverrides();
  return content.map((item) => {
    const patch = overrides.get(item.id);
    if (!patch) return item;
    return {
      ...item,
      enabled: patch.enabled ?? item.enabled,
      priority: patch.priority ?? item.priority,
      description: patch.description ?? item.description,
    };
  });
}

export { selectEducationContent };

async function loadSellerOnboardingSignals(
  sellerProfileId: string,
): Promise<SellerOnboardingSignals> {
  const products = await prisma.product.findMany({
    where: { sellerId: sellerProfileId },
    select: {
      id: true,
      stock: true,
      _count: { select: { images: true, characteristicValues: true, orderItems: true } },
    },
    take: 50,
  });

  const hasProduct = products.length > 0;
  const hasPhotos = products.some((p) => p._count.images >= 1);
  const hasCharacteristics = products.some(
    (p) => p._count.characteristicValues >= 2,
  );
  const hasStockConfigured = products.some((p) => p.stock > 0);
  const hasFirstSale = products.some((p) => p._count.orderItems > 0);

  return {
    hasProduct,
    hasPhotos,
    hasCharacteristics,
    hasStockConfigured,
    hasFirstSale,
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
  return buildSellerCoachMessage({ health, sellerProfileId });
}

export function getBuyerEducationTopics(): BuyerEducationTopic[] {
  if (!isMarketplaceEducationEnabled()) return [];

  return [
    {
      id: "buyer-why-product",
      title: "Почему этот товар?",
      body: "Сравните характеристики и цену с вашей задачей — это advisory, не меняет поиск.",
    },
    {
      id: "buyer-why-seller",
      title: "Почему этот продавец?",
      body: "Смотрите метрики продавца, доставку и самовывоз.",
    },
    {
      id: "buyer-protection",
      title: "Как работает защита?",
      body: "Оплата через площадку, статус заказа в кабинете, условия возврата в соглашении.",
    },
    {
      id: "buyer-delivery",
      title: "Когда доставка?",
      body: "Срок зависит от способа получения — доставка или самовывоз на карточке.",
    },
  ];
}

export function getBuyerHelpPrompts(productTitle: string): BuyerHelpPrompt[] {
  if (!isMarketplaceEducationEnabled()) return [];

  return [
    {
      id: "help-apartment",
      question: "Подойдёт ли для ремонта квартиры?",
      answerPreview: `Сравните мощность и комплектацию «${productTitle.slice(0, 40)}» с вашей задачей. Только рекомендация.`,
    },
    {
      id: "help-compare",
      question: "Чем отличается от другого товара?",
      answerPreview:
        "Откройте характеристики и похожие товары ниже — без изменения поиска.",
    },
    {
      id: "help-beginner",
      question: "Что выбрать новичку?",
      answerPreview:
        "Для первой покупки смотрите базовые характеристики, состояние и условия возврата.",
    },
  ];
}

export async function getMarketplaceEducationDashboard(): Promise<MarketplaceEducationDashboard> {
  const enabled = isMarketplaceEducationEnabled();
  const guides = buildEducationGuides();
  const tooltips = buildEducationTooltips();
  const baseContent = buildEducationContentRegistry();
  const content = enabled ? await applyContentOverrides(baseContent) : baseContent;

  if (!enabled) {
    return {
      enabled: false,
      content,
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
    : [
        buildSellerOnboardingChecklist({
          hasProduct: false,
          hasPhotos: false,
          hasCharacteristics: false,
          hasStockConfigured: false,
          hasFirstSale: false,
        }),
      ];

  return {
    enabled: true,
    content,
    guides,
    tooltips,
    checklists,
  };
}

export async function getSellerGrowthCoach(
  sellerProfileId: string,
): Promise<SellerCoachRecommendation | null> {
  return getSellerCoachRecommendation(sellerProfileId);
}

export { getFinanceEducationCopy };

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
