import { EDUCATION_CONCEPTS } from "./concepts";
import type { EducationTooltipContent } from "./types";

/** Reusable tooltip content keyed by surface. */
export function buildEducationTooltips(): EducationTooltipContent[] {
  return [
    {
      id: "tooltip-quality-score",
      label: "Quality Score",
      title: "Почему важен балл качества?",
      body: "Балл показывает, насколько карточка помогает покупателю принять решение. Он не влияет на ранжирование в поиске.",
      context: "QUALITY_SCORE",
      target: "SELLER",
    },
    {
      id: "tooltip-promotion",
      label: "Продвижение",
      title: "Как работает продвижение",
      body: EDUCATION_CONCEPTS.seller.promotion,
      context: "PROMOTION",
      target: "SELLER",
    },
    {
      id: "tooltip-balance",
      label: "Баланс",
      title: "Почему деньги ожидаются?",
      body: EDUCATION_CONCEPTS.seller.payout,
      context: "FINANCE",
      target: "SELLER",
    },
    {
      id: "tooltip-analytics",
      label: "Аналитика",
      title: "Как читать метрики",
      body: "Просмотры показывают интерес, конверсия — насколько карточка убеждает купить. Улучшайте слабые места по подсказкам.",
      context: "GROWTH",
      target: "SELLER",
    },
    {
      id: "tooltip-conversion",
      label: "Конверсия",
      title: "Что такое конверсия",
      body: "Доля посетителей, которые оформили заказ. Низкая конверсия часто связана с фото, ценой или описанием.",
      context: "GROWTH",
      target: "SELLER",
    },
    {
      id: "tooltip-product-title",
      label: "Название",
      title: "Как назвать товар",
      body: '❌ «Дрель» → ✅ «Дрель аккумуляторная 18В для дома» — конкретика помогает найти товар.',
      context: "PRODUCT_CREATE",
      target: "SELLER",
    },
    {
      id: "tooltip-product-photo",
      label: "Фото",
      title: "Первое фото решает",
      body: "Первое фото влияет на решение открыть карточку. Покажите товар крупно, без водяных знаков.",
      context: "PRODUCT_CREATE",
      target: "SELLER",
    },
    {
      id: "tooltip-buyer-protection",
      label: "Защита покупателя",
      title: "Как работает защита",
      body: EDUCATION_CONCEPTS.buyer.safePurchase,
      context: "PDP",
      target: "BUYER",
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
  return tooltips.filter((t) => t.context === context);
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
      good: "Дрель аккумуляторная 18В для дома",
      why: "Конкретное название помогает покупателю понять, подходит ли товар.",
    },
    {
      field: "photos",
      bad: "Добавьте фото",
      good: "Первое фото влияет на решение открыть карточку",
      why: EDUCATION_CONCEPTS.seller.photos,
    },
    {
      field: "characteristics",
      bad: "Заполните поля",
      good: "Каждая характеристика помогает сравнить товар с аналогами",
      why: EDUCATION_CONCEPTS.seller.characteristics,
    },
  ];
}
