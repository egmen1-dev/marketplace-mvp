import { ROUTES } from "@/lib/constants";

/** Public SEO path for a category slug. */
export function categoryPagePath(slug: string) {
  return `${ROUTES.CATEGORY}/${encodeURIComponent(slug)}`;
}
