/**
 * JSON-LD builders — Google/Yandex-compatible basics.
 */

export function jsonLdScript(data: Record<string, unknown> | Array<Record<string, unknown>>) {
  return {
    __html: JSON.stringify(data),
  };
}

export function collectionPageJsonLd(input: {
  name: string;
  description: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url: input.url,
  };
}

export function itemListJsonLd(input: {
  name: string;
  url: string;
  items: Array<{ name: string; url: string }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: input.name,
    url: input.url,
    numberOfItems: input.items.length,
    itemListElement: input.items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: item.url,
    })),
  };
}

export function productJsonLd(input: {
  name: string;
  description: string;
  url: string;
  image?: string | null;
  price: number;
  currency: string;
  brand?: string | null;
  sku?: string | null;
  availability: "InStock" | "OutOfStock";
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    url: input.url,
    ...(input.image ? { image: [input.image] } : {}),
    ...(input.sku ? { sku: input.sku } : {}),
    ...(input.brand
      ? { brand: { "@type": "Brand", name: input.brand } }
      : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: input.currency,
      price: input.price.toFixed(2),
      availability: `https://schema.org/${input.availability}`,
      url: input.url,
    },
  };
}

export function brandOrganizationJsonLd(input: {
  name: string;
  url: string;
  description?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: input.name,
    url: input.url,
    ...(input.description ? { description: input.description } : {}),
  };
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; url: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
