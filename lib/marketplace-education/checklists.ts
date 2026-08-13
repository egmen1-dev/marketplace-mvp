import { ROUTES } from "@/lib/constants";

import { EDUCATION_CONCEPTS } from "./concepts";
import type { EducationChecklist } from "./types";

export type SellerOnboardingSignals = {
  hasProduct: boolean;
  hasPhotos: boolean;
  hasCharacteristics: boolean;
  hasStockConfigured: boolean;
  hasPromotion: boolean;
};

/** Seller onboarding checklist with completion from seller profile signals. */
export function buildSellerOnboardingChecklist(
  signals: SellerOnboardingSignals,
): EducationChecklist {
  const items = [
    {
      id: "onboard-product",
      title: "Создайте товар",
      explanation: EDUCATION_CONCEPTS.seller.goodListing,
      completed: signals.hasProduct,
      href: ROUTES.ACCOUNT_PRODUCTS_NEW,
    },
    {
      id: "onboard-photos",
      title: "Добавьте фото",
      explanation: EDUCATION_CONCEPTS.seller.photos,
      completed: signals.hasPhotos,
      href: ROUTES.ACCOUNT_PRODUCTS,
    },
    {
      id: "onboard-characteristics",
      title: "Заполните характеристики",
      explanation: EDUCATION_CONCEPTS.seller.characteristics,
      completed: signals.hasCharacteristics,
      href: ROUTES.ACCOUNT_PRODUCTS,
    },
    {
      id: "onboard-stock",
      title: "Настройте остатки",
      explanation: EDUCATION_CONCEPTS.seller.stock,
      completed: signals.hasStockConfigured,
      href: ROUTES.ACCOUNT_PRODUCTS,
    },
    {
      id: "onboard-promotion",
      title: "Продвигайте лучшие товары",
      explanation: EDUCATION_CONCEPTS.seller.promotion,
      completed: signals.hasPromotion,
      href: ROUTES.ACCOUNT_PROMOTIONS,
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

export function emptyStateEducation(input: {
  surface: "favorites" | "sales" | "reviews" | "products";
}): { title: string; body: string; ctaLabel?: string; href?: string } {
  switch (input.surface) {
    case "favorites":
      return {
        title: "В избранном пока пусто",
        body: "Добавляйте товары в избранное, чтобы вернуться к ним позже и сравнить.",
        ctaLabel: "Смотреть каталог",
        href: ROUTES.CATALOG,
      };
    case "sales":
      return {
        title: "Продаж пока нет",
        body: "Улучшите карточку товара, чтобы увеличить шанс покупки. Проверьте фото, описание и цену.",
        ctaLabel: "Рост продаж",
        href: ROUTES.ACCOUNT_GROWTH,
      };
    case "reviews":
      return {
        title: "Отзывов пока нет",
        body: EDUCATION_CONCEPTS.buyer.reviews,
      };
    case "products":
      return {
        title: "Товаров пока нет",
        body: EDUCATION_CONCEPTS.seller.goodListing,
        ctaLabel: "Создать товар",
        href: ROUTES.ACCOUNT_PRODUCTS_NEW,
      };
  }
}
