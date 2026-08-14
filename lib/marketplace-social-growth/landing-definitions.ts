import type { SocialLandingPage } from "./types";

export const SOCIAL_LANDING_PAGES: SocialLandingPage[] = [
  {
    slug: "today",
    path: "finds/today",
    seoTitle: "Находки дня на ЛОТ — товары, которые удивляют",
    seoDescription:
      "Сегодняшние находки маркетплейса ЛОТ — товары с сильным откликом покупателей.",
    title: "Находки дня",
    description: "Товары, которые покупатели оценили выше всего сегодня",
    sharePreview: "Сегодня на ЛОТ нашли отличные товары",
    sort: "popular",
  },
  {
    slug: "gifts",
    path: "gifts",
    seoTitle: "Подарки, которые выглядят дороже своей цены — ЛОТ",
    seoDescription:
      "Идеи подарков с WOW-эффектом — выглядят дороже, чем стоят.",
    title: "Подарки",
    description: "Подарки, которые выглядят дороже своей цены",
    sharePreview: "50 подарков, которые удивляют покупателей",
    sort: "popular",
    queryHint: "подарок",
    maxPrice: 5000,
  },
  {
    slug: "under-1000",
    path: "under-1000",
    seoTitle: "100 товаров до 1000 ₽, которые удивляют покупателей",
    seoDescription: "Недорогие находки до 1000 рублей на маркетплейсе ЛОТ.",
    title: "До 1000 ₽",
    description: "100 товаров до 1000 ₽, которые удивляют покупателей",
    sharePreview: "Находки до 1000 ₽ на ЛОТ",
    sort: "price_asc",
    maxPrice: 1000,
  },
  {
    slug: "home",
    path: "home",
    seoTitle: "Товары для дома — социальные находки ЛОТ",
    seoDescription: "Полезные товары для дома и уюта на маркетплейсе ЛОТ.",
    title: "Для дома",
    description: "Сделать дом уютнее — находки покупателей",
    sharePreview: "Лучшие находки для дома на ЛОТ",
    sort: "popular",
    queryHint: "дом",
  },
  {
    slug: "repair",
    path: "repair",
    seoTitle: "Товары для ремонта — находки ЛОТ",
    seoDescription: "Инструменты и товары для ремонта квартиры на ЛОТ.",
    title: "Для ремонта",
    description: "Полезные товары для ремонта и обустройства",
    sharePreview: "Находки для ремонта на ЛОТ",
    sort: "popular",
    queryHint: "инструмент",
  },
];

export function getSocialLandingPage(path: string): SocialLandingPage | null {
  return SOCIAL_LANDING_PAGES.find((p) => p.path === path) ?? null;
}
