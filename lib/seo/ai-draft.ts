/**
 * AI SEO draft generation — never auto-publishes.
 * Reuses A-004 suggestSeo patterns + templates.
 */

import { suggestSeo } from "@/lib/product-understanding/seo";
import {
  buildBrandSeo,
  buildCategorySeo,
  buildProductTypeSeo,
} from "./templates";

export type AiSeoDraft = {
  title: string;
  description: string;
  content: string;
  engine: "rules-v1";
  createdAt: string;
};

export function draftCategoryAiSeo(input: {
  name: string;
  appName: string;
  productCount: number;
}): AiSeoDraft {
  const base = buildCategorySeo({
    name: input.name,
    appName: input.appName,
  });
  return {
    title: base.title,
    description: base.description,
    content: [
      `${input.name} — раздел каталога ${input.appName}.`,
      `В наличии около ${input.productCount} позиций.`,
      "Сравните подкатегории, типы товаров и фильтры перед покупкой.",
    ].join(" "),
    engine: "rules-v1",
    createdAt: new Date().toISOString(),
  };
}

export function draftProductTypeAiSeo(input: {
  name: string;
  appName: string;
  brands?: string[];
}): AiSeoDraft {
  const base = buildProductTypeSeo({
    name: input.name,
    appName: input.appName,
  });
  const brands =
    input.brands && input.brands.length
      ? `Популярные бренды: ${input.brands.slice(0, 5).join(", ")}.`
      : "";
  return {
    title: base.title,
    description: base.description,
    content: [
      `Что такое ${input.name}: тип товара в каталоге ${input.appName}.`,
      "Как выбрать: смотрите мощность, бренд, комплектацию и отзывы продавца.",
      brands,
      "Сравните характеристики и цены перед заказом.",
    ]
      .filter(Boolean)
      .join(" "),
    engine: "rules-v1",
    createdAt: new Date().toISOString(),
  };
}

export function draftBrandAiSeo(input: {
  name: string;
  appName: string;
}): AiSeoDraft {
  const base = buildBrandSeo({ name: input.name, appName: input.appName });
  return {
    title: base.title,
    description: base.description,
    content: `${input.name} на ${input.appName}: товары бренда, категории и популярные модели. Выбирайте по характеристикам и цене.`,
    engine: "rules-v1",
    createdAt: new Date().toISOString(),
  };
}

export function draftProductAiSeo(input: {
  title: string;
  productTypeName?: string | null;
  brand?: string | null;
  model?: string | null;
}) {
  const seo = suggestSeo(input);
  return {
    title: seo.title,
    description: seo.description,
    shortDescription: seo.shortDescription,
    engine: "rules-v1" as const,
    createdAt: new Date().toISOString(),
  };
}
