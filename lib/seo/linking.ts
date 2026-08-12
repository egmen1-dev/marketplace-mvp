/**
 * Internal linking graph helpers for SEO landings.
 */

export type SeoLink = {
  href: string;
  label: string;
  kind: "category" | "productType" | "brand" | "facet" | "product";
};

export function buildRelatedLinks(input: {
  subcategories?: Array<{ href: string; label: string }>;
  productTypes?: Array<{ href: string; label: string }>;
  brands?: Array<{ href: string; label: string }>;
  facets?: Array<{ href: string; label: string }>;
  products?: Array<{ href: string; label: string }>;
}): SeoLink[] {
  const out: SeoLink[] = [];
  for (const x of input.subcategories ?? []) {
    out.push({ ...x, kind: "category" });
  }
  for (const x of input.productTypes ?? []) {
    out.push({ ...x, kind: "productType" });
  }
  for (const x of input.brands ?? []) {
    out.push({ ...x, kind: "brand" });
  }
  for (const x of input.facets ?? []) {
    out.push({ ...x, kind: "facet" });
  }
  for (const x of input.products ?? []) {
    out.push({ ...x, kind: "product" });
  }
  return out.slice(0, 24);
}
