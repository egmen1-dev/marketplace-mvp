import { ROUTES } from "@/lib/constants";

import type { AiExperienceCard } from "./types";

export function buildGrowthOpportunityCards(input: {
  readyForPromotion: number;
  needsImprovement: number;
  lowStock: number;
  singleProduct: boolean;
}): AiExperienceCard[] {
  const cards: AiExperienceCard[] = [];

  if (input.readyForPromotion > 0) {
    cards.push({
      id: "opp-promotion",
      title: "Продвижение",
      body: `${input.readyForPromotion} товар(ов) готовы к продвижению`,
      href: ROUTES.ACCOUNT_PROMOTIONS,
      testId: "ai-opp-promotion",
    });
  }
  if (input.needsImprovement > 0) {
    cards.push({
      id: "opp-quality",
      title: "Улучшение карточек",
      body: `${input.needsImprovement} карточек можно усилить`,
      href: ROUTES.ACCOUNT_PRODUCTS,
      testId: "ai-opp-quality",
    });
  }
  if (input.lowStock > 0) {
    cards.push({
      id: "opp-stock",
      title: "Остатки",
      body: `${input.lowStock} SKU с низким остатком`,
      href: ROUTES.ACCOUNT_PRODUCTS,
      testId: "ai-opp-stock",
    });
  }
  if (input.singleProduct) {
    cards.push({
      id: "opp-assortment",
      title: "Расширение ассортимента",
      body: "Добавьте ещё товары — один SKU ограничивает рост",
      href: ROUTES.ACCOUNT_PRODUCTS_NEW,
      testId: "ai-opp-assortment",
    });
  }

  return cards.slice(0, 4);
}

export function buildAdminHealthCards(input: {
  gmv: number;
  sellers: number;
  buyers: number;
  conversionRate: number | null;
  activeProducts: number;
}): AiExperienceCard[] {
  return [
    {
      id: "health-gmv",
      title: "GMV (advisory)",
      body: `Оборот: ${input.gmv.toLocaleString("ru-RU")} ₽`,
      testId: "ai-admin-health-gmv",
    },
    {
      id: "health-sellers",
      title: "Продавцы",
      body: `${input.sellers} активных продавцов`,
      testId: "ai-admin-health-sellers",
    },
    {
      id: "health-buyers",
      title: "Покупатели",
      body: `${input.buyers} покупателей в аналитике`,
      testId: "ai-admin-health-buyers",
    },
    {
      id: "health-conversion",
      title: "Конверсия",
      body:
        input.conversionRate != null
          ? `${input.conversionRate.toFixed(1)}%`
          : "Недостаточно данных",
      testId: "ai-admin-health-conversion",
    },
    {
      id: "health-products",
      title: "Активные SKU",
      body: `${input.activeProducts} товаров`,
      testId: "ai-admin-health-products",
    },
  ];
}
