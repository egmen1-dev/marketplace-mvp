import { ROUTES } from "@/lib/constants";

import type { EducationGuide } from "./types";

/** Static education guides embedded in user flows. */
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
      enabled: true,
      steps: [
        {
          id: "step-create-product",
          title: "Создать первый товар",
          explanation: "Карточка товара — это ваша витрина",
          href: ROUTES.ACCOUNT_PRODUCTS_NEW,
          ctaLabel: "Создать товар",
        },
        {
          id: "step-add-photos",
          title: "Добавить фотографии",
          explanation: "Покупатель сначала оценивает изображение",
        },
        {
          id: "step-characteristics",
          title: "Заполнить характеристики",
          explanation: "Характеристики помогают найти товар",
        },
        {
          id: "step-stock",
          title: "Настроить остатки",
          explanation: "Нет товара — нет продаж",
        },
        {
          id: "step-first-sale",
          title: "Получить первую продажу",
          explanation: "Первые продажи создают доверие",
          href: ROUTES.ACCOUNT_GROWTH,
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
      enabled: true,
      steps: [
        {
          id: "step-check-product",
          title: "Проверьте характеристики",
          explanation:
            "Сравните параметры с вашей задачей — советы не меняют поиск.",
        },
        {
          id: "step-trust-seller",
          title: "Оцените продавца",
          explanation: "Смотрите метрики, доставку и условия самовывоза.",
        },
        {
          id: "step-safe-pay",
          title: "Оплатите через площадку",
          explanation: "Данные карты не передаются продавцу напрямую.",
        },
        {
          id: "step-after-order",
          title: "Следите за статусом заказа",
          explanation: "После покупки статус виден в кабинете.",
          href: ROUTES.ORDERS,
          ctaLabel: "Мои покупки",
        },
      ],
    },
    {
      id: "guide-admin-education",
      target: "ADMIN",
      title: "Управление обучающим контентом",
      description: "Guides, tooltips, checklists — только UX-слой.",
      context: "ADMIN",
      priority: 10,
      enabled: true,
      steps: [
        {
          id: "step-preview-guides",
          title: "Список контента",
          explanation: "Все материалы в одном реестре EducationContent.",
        },
        {
          id: "step-toggle",
          title: "Включение и приоритет",
          explanation: "Контент можно включать, выключать и менять priority.",
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
    .filter((g) => g.target === target && (g.enabled ?? true))
    .sort((a, b) => b.priority - a.priority);
}

export function guideByContext(
  guides: EducationGuide[],
  context: EducationGuide["context"],
): EducationGuide | null {
  const enabled = guides.filter((g) => g.enabled ?? true);
  return (
    enabled.find((g) => g.context === context) ??
    [...enabled].sort((a, b) => b.priority - a.priority)[0] ??
    null
  );
}
