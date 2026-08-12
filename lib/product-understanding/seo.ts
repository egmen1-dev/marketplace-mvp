/**
 * SEO suggestion from understanding result — uses existing seoTitle/seoDescription fields.
 */

export function suggestSeo(input: {
  title: string;
  productTypeName?: string | null;
  brand?: string | null;
  model?: string | null;
  characteristics?: Array<{ name: string; valueText?: string | null; valueNumber?: number | null }>;
}): {
  title: string;
  description: string;
  shortDescription: string;
} {
  const parts = [
    input.brand,
    input.productTypeName,
    input.model,
  ].filter(Boolean);

  const headline =
    parts.length >= 2
      ? parts.join(" ")
      : input.title.trim().slice(0, 90);

  const seoTitle = `Купить ${headline}`.slice(0, 120);

  const charBits = (input.characteristics ?? [])
    .slice(0, 3)
    .map((c) => {
      const v =
        c.valueText ??
        (c.valueNumber != null ? String(c.valueNumber) : null);
      return v ? `${c.name}: ${v}` : null;
    })
    .filter(Boolean);

  const description = [
    `${headline} в каталоге маркетплейса.`,
    charBits.length ? charBits.join(". ") + "." : null,
    "Доставка и самовывоз — уточняйте у продавца.",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 320);

  const shortDescription = [input.brand, input.model, input.productTypeName]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 160);

  return {
    title: seoTitle,
    description,
    shortDescription: shortDescription || input.title.slice(0, 160),
  };
}
