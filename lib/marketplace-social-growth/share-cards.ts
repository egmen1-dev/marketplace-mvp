import type { ProductListItem } from "@/features/products/types";
import { formatPrice } from "@/features/products/mappers";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { getCanonicalAppUrl } from "@/lib/env";
import { buildWhyReasons } from "@/lib/marketplace-discovery/recommendation-context";

import { isSocialShareCardsEnabled } from "./flags";
import type { ShareCardData, ShareCardFormat } from "./types";
import { validateSocialContent } from "./trust-guard";

export async function buildShareCard(input: {
  product: ProductListItem;
  format?: ShareCardFormat;
  headline?: string;
}): Promise<ShareCardData | null> {
  if (!isSocialShareCardsEnabled()) return null;

  const validation = await validateSocialContent({ product: input.product });
  if (!validation.allowed) return null;

  const reasons = (await buildWhyReasons(input.product)).map((r) => r.label);
  const origin = getCanonicalAppUrl();
  const shareUrl = `${origin}${ROUTES.PRODUCT}/${input.product.id}?utm_source=social&utm_medium=share_card`;

  const compareHint =
    input.product.compareAt != null && input.product.compareAt > input.product.price
      ? "Выглядит дороже своей цены"
      : "Нашли на ЛОТ";

  return {
    productId: input.product.id,
    title: input.product.title,
    headline: input.headline ?? `🔥 ${compareHint}`,
    priceLabel: formatPrice(input.product.price, input.product.currency),
    imageUrl: input.product.primaryImage?.url ?? null,
    reasons: reasons.slice(0, 3),
    ctaLabel: `Открыть на ${APP_NAME}`,
    shareUrl,
    format: input.format ?? "vertical",
  };
}

export function shareCardAspectClass(format: ShareCardFormat): string {
  switch (format) {
    case "story":
    case "vertical":
      return "aspect-[9/16] max-w-[280px]";
    case "post":
      return "aspect-square max-w-[320px]";
    case "mobile":
    default:
      return "aspect-[4/5] max-w-[300px]";
  }
}
