/**
 * Controlled facet SEO rules — no mass combinations.
 */

export type FacetSeoCandidate = {
  productTypeSlug: string;
  characteristicSlug: string;
  value: string;
  productCount: number;
};

export function isFacetLandingAllowed(input: {
  enabledRule: boolean;
  minProductCount: number;
  productCount: number;
  characteristicSlug: string;
  /** Blocklist for high-cardinality junk */
  blockedSlugs?: string[];
}): boolean {
  if (!input.enabledRule) return false;
  if (input.productCount < input.minProductCount) return false;
  const blocked = input.blockedSlugs ?? ["color", "цвет", "sku", "артикул"];
  if (blocked.some((b) => input.characteristicSlug.toLowerCase().includes(b))) {
    return false;
  }
  return true;
}

/** Default seed rules (code-level; DB SeoFacetRule can override). */
export const DEFAULT_FACET_SEO_SLUGS = ["brand", "power-w", "voltage", "power"] as const;
