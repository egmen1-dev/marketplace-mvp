import { ROUTES } from "@/lib/constants";

import type {
  EducationChecklist,
  EducationContent,
  EducationGuide,
  EducationTooltipContent,
} from "./types";

export type SellerOnboardingSignals = {
  hasProduct: boolean;
  hasPhotos: boolean;
  hasCharacteristics: boolean;
  hasStockConfigured: boolean;
  hasFirstSale: boolean;
};

/** Seller onboarding checklist — integrated into /account/onboarding. */
export function buildSellerOnboardingChecklist(
  signals: SellerOnboardingSignals,
): EducationChecklist {
  const items = [
    {
      id: "onboard-product",
      title: "Создать первый товар",
      explanation: "Карточка товара — это ваша витрина",
      completed: signals.hasProduct,
      href: ROUTES.ACCOUNT_PRODUCTS_NEW,
    },
    {
      id: "onboard-photos",
      title: "Добавить фотографии",
      explanation: "Покупатель сначала оценивает изображение",
      completed: signals.hasPhotos,
      href: ROUTES.ACCOUNT_PRODUCTS,
    },
    {
      id: "onboard-characteristics",
      title: "Заполнить характеристики",
      explanation: "Характеристики помогают найти товар",
      completed: signals.hasCharacteristics,
      href: ROUTES.ACCOUNT_PRODUCTS,
    },
    {
      id: "onboard-stock",
      title: "Настроить остатки",
      explanation: "Нет товара — нет продаж",
      completed: signals.hasStockConfigured,
      href: ROUTES.ACCOUNT_PRODUCTS,
    },
    {
      id: "onboard-first-sale",
      title: "Получить первую продажу",
      explanation: "Первые продажи создают доверие",
      completed: signals.hasFirstSale,
      href: ROUTES.ACCOUNT_GROWTH,
    },
  ];

  const completedCount = items.filter((i) => i.completed).length;

  return {
    id: "checklist-seller-onboarding",
    title: "Путь нового продавца",
    items,
    completedCount,
    totalCount: items.length,
  };
}

export function checklistToContent(
  checklist: EducationChecklist,
): EducationContent {
  return {
    id: checklist.id,
    type: "CHECKLIST",
    audience: "SELLER",
    context: "ONBOARDING",
    title: checklist.title,
    description: "Пошаговый путь нового продавца",
    priority: 100,
    enabled: true,
    steps: checklist.items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.explanation,
      href: item.href,
    })),
  };
}

export function emptyStateEducation(input: {
  surface: "favorites" | "sales" | "orders" | "reviews" | "products";
}): { title: string; body: string; ctaLabel?: string; href?: string } {
  switch (input.surface) {
    case "favorites":
      return {
        title: "В избранном пока пусто",
        body: "Сохраняйте товары, чтобы вернуться позже",
        ctaLabel: "Смотреть каталог",
        href: ROUTES.CATALOG,
      };
    case "orders":
      return {
        title: "Заказов пока нет",
        body: "После покупки здесь появятся ваши заказы",
        ctaLabel: "Смотреть каталог",
        href: ROUTES.CATALOG,
      };
    case "sales":
      return {
        title: "Продаж пока нет",
        body: "Добавьте фото и характеристики, чтобы увеличить доверие",
        ctaLabel: "Рост продаж",
        href: ROUTES.ACCOUNT_GROWTH,
      };
    case "reviews":
      return {
        title: "Отзывов пока нет",
        body: "Первые отзывы помогут новым покупателям доверять товару",
      };
    case "products":
      return {
        title: "Товаров пока нет",
        body: "Карточка товара — это ваша витрина на площадке",
        ctaLabel: "Создать товар",
        href: ROUTES.ACCOUNT_PRODUCTS_NEW,
      };
  }
}

export function guideToContent(guide: EducationGuide): EducationContent {
  return {
    id: guide.id,
    type: "GUIDE",
    audience: guide.target,
    context: guide.context,
    title: guide.title,
    description: guide.description,
    priority: guide.priority,
    enabled: guide.enabled ?? true,
    steps: guide.steps.map((step) => ({
      id: step.id,
      title: step.title,
      description: step.explanation,
      href: step.href,
      ctaLabel: step.ctaLabel,
    })),
  };
}

export function tooltipToContent(tip: EducationTooltipContent): EducationContent {
  return {
    id: tip.id,
    type: "TOOLTIP",
    audience: tip.target,
    context: tip.context,
    title: tip.title,
    description: tip.body,
    priority: tip.priority ?? 50,
    enabled: tip.enabled ?? true,
    steps: [
      {
        id: `${tip.id}-body`,
        title: tip.label,
        description: tip.body,
      },
    ],
  };
}
