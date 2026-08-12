import { ROUTES } from "@/lib/constants";

/** Public SEO path for a category slug. */
export function categoryPagePath(slug: string) {
  return `${ROUTES.CATEGORY}/${encodeURIComponent(slug)}`;
}

/**
 * Future ProductType SEO landing path (not routed yet).
 * Example: /catalog/tools/power-tools/perforators
 */
export function productTypePagePath(categoryPath: string, productTypeSlug: string) {
  const base = categoryPath.replace(/^\/+|\/+$/g, "");
  return `/catalog/${base}/${encodeURIComponent(productTypeSlug)}`;
}

/** Canonical catalog path segments from materialized category path. */
export function catalogPathFromCategoryPath(path: string | null | undefined): string {
  if (!path?.trim()) return "/catalog";
  return `/catalog/${path.replace(/^\/+|\/+$/g, "")}`;
}
