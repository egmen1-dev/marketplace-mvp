import { getProductById } from "@/features/products";
import { buildWhyReasons } from "@/lib/marketplace-discovery/recommendation-context";

import { isMarketplaceSocialGrowthEnabled } from "./flags";
import { buildShareCard } from "./share-cards";
import type { ShareCardData, ViralContent, ViralFormatId } from "./types";
import { buildViralFormat } from "./viral-formats";
import { validateSocialContent } from "./trust-guard";
import { trackContentGenerated } from "./analytics";

export async function generateViralContent(input: {
  productId: string;
  formatId: ViralFormatId;
}): Promise<ViralContent | null> {
  if (!isMarketplaceSocialGrowthEnabled()) return null;

  const product = await getProductById(input.productId, null);
  if (!product || product.status !== "ACTIVE") return null;

  const validation = await validateSocialContent({
    product,
    photoCount: product.images.length,
  });

  const reasons = (await buildWhyReasons(product)).map((r) => r.label);
  const base = buildViralFormat(input.formatId, product, reasons);

  if (validation.allowed) {
    trackContentGenerated(product.id, input.formatId);
  }

  return {
    ...base,
    allowed: validation.allowed,
    blockers: validation.blockers,
  };
}

export async function generateShareCardForProduct(input: {
  productId: string;
  formatId?: ViralFormatId;
}): Promise<{ card: ShareCardData | null; viral: ViralContent | null }> {
  const formatId = input.formatId ?? "why-buy";
  const [card, viral] = await Promise.all([
    (async () => {
      const product = await getProductById(input.productId, null);
      if (!product) return null;
      return buildShareCard({ product, format: "vertical" });
    })(),
    generateViralContent({ productId: input.productId, formatId }),
  ]);
  return { card, viral };
}
