import { ROUTES } from "@/lib/constants";

import { EDUCATION_CONCEPTS } from "./concepts";
import type { EducationGuide } from "./types";

/** Static education guides — integrated into user flows, not a separate help center. */
export function buildEducationGuides(): EducationGuide[] {
  return [
    {
      id: "guide-seller-first-sale",
      target: "SELLER",
      title: "Как сделать первую продажу",
      description:
        "Пошаговый путь нового продавца — от карточки до первых заказов.",
      context: "ONBOARDING",
      priority: 100,
      steps: [
        {
          id: "step-create-product",
          title: "Создайте товар",
          explanation: EDUCATION_CONCEPTS.seller.goodListing,
          href: ROUTES.ACCOUNT_PRODUCTS_NEW,
          ctaLabel: "Создать товар",
        },
        {
          id: "step-add-photos",
          title: "Добавьте фото",
          explanation: EDUCATION_CONCEPTS.seller.photos,
        },
        {
          id: "step-characteristics",
          title: "Заполните характеристики",
          explanation: EDUCATION_CONCEPTS.seller.characteristics,
        },
        {
          id: "step-stock",
          title: "Настройте остатки",
          explanation: EDUCATION_CONCEPTS.seller.stock,
        },
        {
          id: "step-promote",
          title: "Продвигайте лучшие товары",
          explanation: EDUCATION_CONCEPTS.seller.promotion,
          href: ROUTES.ACCOUNT_PROMOTIONS,
          ctaLabel: "Продвижение",
        },
      ],
    },
    {
      id: "guide-buyer-safe-purchase",
      target: "BUYER",
      title: "Как безопасно купить товар",
      description: "Что проверить перед покупкой и что происходит после заказа.",
      context: "PDP",
      priority: 90,
      steps: [
        {
          id: "step-check-product",
          title: "Проверьте характеристики",
          explanation: EDUCATION_CONCEPTS.buyer.productFit,
        },
        {
          id: "step-trust-seller",
          title: "Оцените продавца",
          explanation:
            "Смотрите метрики продавца, условия доставки и самовывоза.",
        },
        {
          id: "step-safe-pay",
          title: "Оплатите через площадку",
          explanation: EDUCATION_CONCEPTS.buyer.safePurchase,
        },
        {
          id: "step-after-order",
          title: "Следите за статусом заказа",
          explanation: EDUCATION_CONCEPTS.buyer.afterOrder,
          href: ROUTES.ORDERS,
          ctaLabel: "Мои покупки",
        },
      ],
    },
    {
      id: "guide-admin-education",
      target: "ADMIN",
      title: "Управление обучающим контентом",
      description:
        "Guides, tooltips и onboarding steps — только UX-слой, без изменения логики.",
      context: "ADMIN",
      priority: 10,
      steps: [
        {
          id: "step-preview-guides",
          title: "Просмотр guides",
          explanation: "Guides встроены в сценарии продавца и покупателя.",
        },
        {
          id: "step-preview-tooltips",
          title: "Tooltips",
          explanation:
            "Контекстные подсказки у Quality Score, Promotion, Balance и Analytics.",
        },
      ],
    },
  ];
}

export function guidesForTarget(
  guides: EducationGuide[],
  target: EducationGuide["target"],
): EducationGuide[] {
  return guides
    .filter((g) => g.target === target)
    .sort((a, b) => b.priority - a.priority);
}

export function guideByContext(
  guides: EducationGuide[],
  context: EducationGuide["context"],
): EducationGuide | null {
  return (
    guides.find((g) => g.context === context) ??
    guides.sort((a, b) => b.priority - a.priority)[0] ??
    null
  );
}
