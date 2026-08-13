import type { DiscoveryCollection } from "./types";

export const DISCOVERY_COLLECTIONS: DiscoveryCollection[] = [
  {
    slug: "remont-do-10000",
    seoTitle: "Что купить для ремонта квартиры до 10 000 ₽",
    seoDescription:
      "Полезные товары для ремонта квартиры — подборка Находок ЛОТ до 10 000 рублей.",
    title: "Ремонт квартиры до 10 000 ₽",
    description: "Инструменты и расходники для домашнего ремонта",
    explanation:
      "Товары с хорошими отзывами и понятным описанием — без переплаты за бренд.",
    maxPrice: 10000,
    sort: "popular",
  },
  {
    slug: "podarki-dorozhe-ceny",
    seoTitle: "50 подарков, которые выглядят дороже своей цены",
    seoDescription:
      "Идеи подарков с WOW-эффектом — выглядят дороже, чем стоят.",
    title: "Подарки, которые выглядят дороже цены",
    description: "Необычные и запоминающиеся идеи",
    explanation: "Подборка с сильными фото и высоким интересом покупателей.",
    sort: "popular",
  },
  {
    slug: "novaya-kvartira",
    seoTitle: "Лучшие товары для новой квартиры",
    seoDescription: "Must-have для обустройства новой квартиры на ЛОТ.",
    title: "Для новой квартиры",
    description: "С чего начать обустройство",
    explanation: "Популярные товары для дома и уюта.",
    sort: "newest",
  },
  {
    slug: "nakhodki-do-500",
    seoTitle: "Находки до 500 рублей",
    seoDescription: "Недорогие полезные товары — находки до 500 ₽.",
    title: "Находки до 500 ₽",
    description: "Мелочи, которые радуют",
    explanation: "Выгодные мелкие покупки с быстрой доставкой.",
    maxPrice: 500,
    sort: "price_asc",
  },
  {
    slug: "poleznye-malo-kto-znaet",
    seoTitle: "Полезные вещи, о которых мало кто знает",
    seoDescription: "Неочевидные полезные товары на маркетплейсе ЛОТ.",
    title: "Мало кто знает, но полезно",
    description: "Неожиданные находки",
    explanation: "Товары с растущим интересом и хорошими характеристиками.",
    sort: "newest",
  },
];

export function getDiscoveryCollection(slug: string): DiscoveryCollection | null {
  return DISCOVERY_COLLECTIONS.find((c) => c.slug === slug) ?? null;
}
