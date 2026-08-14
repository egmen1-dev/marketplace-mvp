import { listProducts } from "@/features/products";
import { buildWhyReasons } from "@/lib/marketplace-discovery/recommendation-context";

import { isSocialCollectionsEnabled } from "./flags";
import { getSocialLandingPage, SOCIAL_LANDING_PAGES } from "./landing-definitions";
import type { SocialLandingView } from "./types";

export { SOCIAL_LANDING_PAGES, getSocialLandingPage } from "./landing-definitions";

export async function loadSocialLandingView(path: string): Promise<SocialLandingView | null> {
  if (!isSocialCollectionsEnabled()) return null;

  const page = getSocialLandingPage(path);
  if (!page) return null;

  const result = await listProducts({
    status: "ACTIVE",
    sort: page.sort,
    pageSize: 24,
    priceMax: page.maxPrice,
    query: page.queryHint,
    inStock: true,
  });

  const items = await Promise.all(
    result.items.map(async (product) => ({
      product,
      reasons: (await buildWhyReasons(product)).map((r) => r.label),
    })),
  );

  return { enabled: true, page, items };
}
