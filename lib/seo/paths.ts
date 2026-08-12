/**
 * Path helpers for SEO landings (extends catalog paths).
 */

import { categoryPagePath, productTypePagePath } from "@/features/catalog/paths";
import { ROUTES } from "@/lib/constants";
import { slugifyRu } from "@/lib/catalog-taxonomy/normalize";

export { categoryPagePath, productTypePagePath };

export function brandPagePath(slug: string) {
  return `${ROUTES.BRANDS}/${encodeURIComponent(slug)}`;
}

export function brandsIndexPath() {
  return ROUTES.BRANDS;
}

/** Optional pretty product path — PDP remains /product/[id] compatible. */
export function productSeoSlug(input: {
  brand?: string | null;
  model?: string | null;
  productType?: string | null;
  title: string;
  id: string;
}): string {
  const parts = [
    input.brand,
    input.model,
    input.productType,
    input.title,
  ]
    .filter(Boolean)
    .map((p) => slugifyRu(String(p)))
    .filter(Boolean);
  const base = parts.join("-").slice(0, 80) || "product";
  return `${base}-${input.id}`;
}

export function productPagePath(id: string) {
  return `${ROUTES.PRODUCT}/${id}`;
}

/** Controlled facet landing path (only when SeoPage approved). */
export function facetSeoPath(productTypeSlug: string, facetValueSlug: string) {
  return `/catalog/seo/${encodeURIComponent(productTypeSlug)}/${encodeURIComponent(facetValueSlug)}`;
}
