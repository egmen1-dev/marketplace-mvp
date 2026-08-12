/**
 * SEO template engine — dynamic variables for landings.
 */

export type SeoTemplateVars = {
  Category?: string;
  ProductType?: string;
  Brand?: string;
  Facet?: string;
  FacetValue?: string;
  Model?: string;
  AppName?: string;
};

export function renderSeoTemplate(
  template: string,
  vars: SeoTemplateVars,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = vars[key as keyof SeoTemplateVars];
    return v != null && String(v).trim() !== "" ? String(v) : "";
  }).replace(/\s{2,}/g, " ").trim();
}

export const SEO_TEMPLATES = {
  category: {
    title: "{Category} купить — каталог {AppName}",
    description:
      "Купить {Category} онлайн на {AppName}. Подкатегории, фильтры и актуальные цены.",
    h1: "{Category}",
  },
  productType: {
    title: "{ProductType} купить — цены и характеристики",
    description:
      "Большой выбор: {ProductType}. Сравнение моделей, характеристики и доставка на {AppName}.",
    h1: "{ProductType} купить",
  },
  brand: {
    title: "{Brand} — каталог товаров на {AppName}",
    description:
      "{Brand} — официальный каталог товаров: категории, модели и цены на {AppName}.",
    h1: "{Brand}",
  },
  facet: {
    title: "{ProductType} {FacetValue} — купить на {AppName}",
    description:
      "{ProductType} {FacetValue}: выбор моделей, характеристики и цены на {AppName}.",
    h1: "{ProductType} {FacetValue}",
  },
  product: {
    title: "{Brand} {Model} {ProductType} — купить",
    description:
      "Купить {Brand} {Model} ({ProductType}) на {AppName}. Характеристики и доставка.",
  },
} as const;

export function buildCategorySeo(input: {
  name: string;
  description?: string | null;
  appName: string;
}) {
  const vars = { Category: input.name, AppName: input.appName };
  return {
    title: renderSeoTemplate(SEO_TEMPLATES.category.title, vars),
    description:
      input.description?.trim() ||
      renderSeoTemplate(SEO_TEMPLATES.category.description, vars),
    h1: renderSeoTemplate(SEO_TEMPLATES.category.h1, vars),
  };
}

export function buildProductTypeSeo(input: {
  name: string;
  description?: string | null;
  appName: string;
}) {
  const vars = { ProductType: input.name, AppName: input.appName };
  return {
    title: renderSeoTemplate(SEO_TEMPLATES.productType.title, vars),
    description:
      input.description?.trim() ||
      renderSeoTemplate(SEO_TEMPLATES.productType.description, vars),
    h1: renderSeoTemplate(SEO_TEMPLATES.productType.h1, vars),
  };
}

export function buildBrandSeo(input: {
  name: string;
  description?: string | null;
  appName: string;
}) {
  const vars = { Brand: input.name, AppName: input.appName };
  return {
    title: renderSeoTemplate(SEO_TEMPLATES.brand.title, vars),
    description:
      input.description?.trim() ||
      renderSeoTemplate(SEO_TEMPLATES.brand.description, vars),
    h1: renderSeoTemplate(SEO_TEMPLATES.brand.h1, vars),
  };
}
