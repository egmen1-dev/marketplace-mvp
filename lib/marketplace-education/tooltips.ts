import type { EducationTooltipContent } from "./types";

const PROMOTION_BODY =
  "Продвижение увеличивает показы и помогает быстрее проверить спрос, но не гарантирует продажи.";

/** Reusable tooltip content keyed by surface. */
export function buildEducationTooltips(): EducationTooltipContent[] {
  return [
    {
      id: "tooltip-quality-score",
      label: "Quality Score",
      title: "Почему важен балл качества?",
      body: "Балл показывает, насколько карточка помогает покупателю. Не влияет на ранжирование.",
      context: "QUALITY_SCORE",
      target: "SELLER",
      priority: 80,
      enabled: true,
    },
    {
      id: "tooltip-growth-score",
      label: "Growth Score",
      title: "Что такое Growth Score",
      body: "Сводная оценка здоровья магазина: качество карточек, конверсия, остатки и продвижение.",
      context: "GROWTH",
      target: "SELLER",
      priority: 75,
      enabled: true,
    },
    {
      id: "tooltip-promotion",
      label: "Продвижение",
      title: "Как работает продвижение",
      body: PROMOTION_BODY,
      context: "PROMOTION",
      target: "SELLER",
      priority: 70,
      enabled: true,
    },
    {
      id: "tooltip-balance",
      label: "Баланс",
      title: "Как работает баланс",
      body: "Оплата покупателя → проверка сделки → деньги становятся доступными.",
      context: "FINANCE",
      target: "SELLER",
      priority: 65,
      enabled: true,
    },
    {
      id: "tooltip-analytics",
      label: "Аналитика",
      title: "Как читать метрики",
      body: "Просмотры — интерес, конверсия — насколько карточка убеждает купить.",
      context: "GROWTH",
      target: "SELLER",
      priority: 60,
      enabled: true,
    },
    {
      id: "tooltip-conversion",
      label: "Конверсия",
      title: "Что такое конверсия",
      body: "Доля посетителей, которые оформили заказ. Часто связана с фото, ценой или описанием.",
      context: "GROWTH",
      target: "SELLER",
      priority: 55,
      enabled: true,
    },
    {
      id: "tooltip-product-title",
      label: "Название",
      title: "Как назвать товар",
      body: 'Плохо: «Дрель». Хорошо: «Дрель аккумуляторная 18В для ремонта дома».',
      context: "PRODUCT_CREATE",
      target: "SELLER",
      priority: 90,
      enabled: true,
    },
    {
      id: "tooltip-product-photo",
      label: "Фото",
      title: "Первое фото решает",
      body: "Первое фото влияет на открытие карточки.",
      context: "PRODUCT_CREATE",
      target: "SELLER",
      priority: 85,
      enabled: true,
    },
    {
      id: "tooltip-buyer-protection",
      label: "Защита покупателя",
      title: "Как работает защита",
      body: "Оплата через площадку — данные карты не передаются продавцу.",
      context: "PDP",
      target: "BUYER",
      priority: 50,
      enabled: true,
    },
  ];
}

export function tooltipById(
  tooltips: EducationTooltipContent[],
  id: string,
): EducationTooltipContent | null {
  return tooltips.find((t) => t.id === id) ?? null;
}

export function tooltipsForContext(
  tooltips: EducationTooltipContent[],
  context: EducationTooltipContent["context"],
): EducationTooltipContent[] {
  return tooltips.filter((t) => t.context === context && (t.enabled ?? true));
}

export function productFormTips(): Array<{
  field: "title" | "photos" | "characteristics";
  bad: string;
  good: string;
  why: string;
}> {
  return [
    {
      field: "title",
      bad: "Дрель",
      good: "Дрель аккумуляторная 18В для ремонта дома",
      why: "Конкретное название помогает покупателю понять, подходит ли товар.",
    },
    {
      field: "photos",
      bad: "Добавьте фото",
      good: "Первое фото влияет на открытие карточки",
      why: "Покупатель сначала оценивает изображение.",
    },
    {
      field: "characteristics",
      bad: "Заполните поля",
      good: "Каждая характеристика помогает покупателю сравнить товары",
      why: "Зачем покупателю эта информация — чтобы быстрее принять решение.",
    },
  ];
}

export function selectEducationContent(
  content: import("./types").EducationContent[],
  filter: {
    audience?: import("./types").EducationAudience;
    context?: import("./types").EducationContext;
    type?: import("./types").EducationContentType;
  },
): import("./types").EducationContent[] {
  return content
    .filter((item) => item.enabled)
    .filter((item) => !filter.audience || item.audience === filter.audience)
    .filter((item) => !filter.context || item.context === filter.context)
    .filter((item) => !filter.type || item.type === filter.type)
    .sort((a, b) => b.priority - a.priority);
}
