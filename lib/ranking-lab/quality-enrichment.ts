import { evaluateProductQualityInput } from "@/lib/marketplace-content-quality/evaluate";
import { isMarketplaceContentQualityEnabled } from "@/lib/marketplace-content-quality/flags";
import { applyContentQualityToRankingInput } from "@/lib/marketplace-content-quality/ranking-integration";
import type { ProductQualityInput } from "@/lib/marketplace-content-quality/types";
import type { RankingProductInput } from "@/lib/marketplace-ranking-intelligence/types";

/** Map lab product row to quality evaluator input (structural + optional hints). */
export function rankingProductToQualityInput(product: RankingProductInput): ProductQualityInput {
  const photoCount = product.photoCount;
  const images = Array.from({ length: photoCount }, (_, i) => ({
    id: `${product.id}-img-${i + 1}`,
    url: `https://lab.local/${product.id}/${i + 1}.jpg`,
    alt: product.name,
    sortOrder: i,
    isPrimary: i === 0,
    pathname: `lab/${product.id}/${i === 0 ? "hero" : `angle-${i}`}.jpg`,
  }));

  if (product.id.includes("NEG") || product.qualityScore != null && product.qualityScore < 20) {
    return {
      productId: product.id,
      name: product.name,
      description: " ".repeat(Math.max(0, product.descriptionLength)),
      seoTitle: product.name,
      seoDescription: " ".repeat(Math.max(0, product.seoDescriptionLength)),
      categoryId: product.categoryId,
      categoryName: product.categoryName,
      images: Array.from({ length: Math.max(photoCount, 10) }, (_, i) => ({
        id: `${product.id}-sock-${i}`,
        url: `https://lab.local/socks/${i}.jpg`,
        alt: "грязные носки",
        sortOrder: i,
        isPrimary: i === 0,
        pathname: `lab/socks/same.jpg`,
      })),
      characteristics: Array.from({ length: product.characteristicCount }, (_, i) => ({
        name: `Attr ${i + 1}`,
        slug: `attr-${i + 1}`,
        value: "filled",
      })),
      hasVideo: product.hasVideo,
      prohibitedHit: product.prohibitedHit,
      moderationStatus: product.moderationStatus,
    };
  }

  if (photoCount >= 15 && product.qualityScore != null && product.qualityScore < 40) {
    return {
      productId: product.id,
      name: product.name,
      description: " ".repeat(product.descriptionLength),
      categoryId: product.categoryId,
      categoryName: product.categoryName,
      images: Array.from({ length: photoCount }, (_, i) => ({
        id: `${product.id}-dup-${i}`,
        url: "https://lab.local/dup/same.jpg",
        alt: "same angle",
        sortOrder: i,
        isPrimary: i === 0,
        pathname: "lab/dup/same.jpg",
      })),
      characteristics: [],
      hasVideo: product.hasVideo,
      hints: { duplicateRatio: 0.92, effectivePhotoCount: 1 },
    };
  }

  const qualityHint =
    product.qualityScore != null
      ? Math.max(15, Math.min(95, product.qualityScore))
      : undefined;

  return {
    productId: product.id,
    name: product.name,
    description: " ".repeat(Math.max(0, product.descriptionLength)),
    seoTitle: product.name.slice(0, Math.max(8, product.seoTitleLength)),
    seoDescription: " ".repeat(Math.max(0, product.seoDescriptionLength)),
    categoryId: product.categoryId,
    categoryName: product.categoryName,
    images,
    characteristics: Array.from({ length: product.characteristicCount }, (_, i) => ({
      name: `Attr ${i + 1}`,
      slug: `attr-${i + 1}`,
      value: "value",
    })),
    hasVideo: product.hasVideo,
    prohibitedHit: product.prohibitedHit,
    moderationStatus: product.moderationStatus,
    hints: qualityHint
      ? {
          photoRelevance: qualityHint,
          primaryPhotoQuality: qualityHint,
          thumbnailQuality: Math.max(10, qualityHint - 5),
          descriptionQuality: Math.min(95, Math.round(product.descriptionLength / 4)),
          seoQuality: Math.min(95, Math.round(product.seoDescriptionLength / 3)),
        }
      : undefined,
  };
}

export async function enrichRankingProductsWithContentQuality(
  products: RankingProductInput[],
): Promise<RankingProductInput[]> {
  if (!isMarketplaceContentQualityEnabled()) return products;
  return Promise.all(
    products.map(async (product) => {
      const qualityInput = rankingProductToQualityInput(product);
      const evaluation = await evaluateProductQualityInput(qualityInput);
      return applyContentQualityToRankingInput(product, evaluation);
    }),
  );
}
