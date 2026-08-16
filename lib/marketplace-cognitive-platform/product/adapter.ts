import { prisma } from "@/lib/prisma";
import { understandProduct } from "@/lib/product-understanding";
import {
  buildProductUnderstanding,
  daosSignalsFromContentQuality,
  type BuildProductUnderstandingInput,
  type ProductUnderstanding,
} from "@/lib/ccos/product";

export async function loadProductUnderstandingInput(
  productId: string,
): Promise<BuildProductUnderstandingInput | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: { select: { name: true, slug: true } },
      images: { select: { id: true } },
      characteristicValues: {
        include: { definition: { select: { slug: true, name: true } } },
      },
      qualitySnapshot: true,
    },
  });
  if (!product) return null;

  const attributes: Record<string, string | number> = {};
  for (const cv of product.characteristicValues) {
    if (cv.valueText) attributes[cv.definition.slug] = cv.valueText;
    else if (cv.valueNumber != null) attributes[cv.definition.slug] = Number(cv.valueNumber);
  }

  const snapshot = product.qualitySnapshot;
  const daosConnected = process.env.DAOS_LIVE_CONNECTION === "true";

  return {
    productId,
    title: product.name,
    description: product.description,
    categoryName: product.category?.name ?? null,
    categorySlug: product.category?.slug ?? null,
    brandName: product.brandId ? product.name.split(" ")[0] : null,
    price: Number(product.price),
    photoCount: product.images.length,
    hasVideo: false,
    attributes,
    daos: daosSignalsFromContentQuality({
      connected: daosConnected,
      photoQuality: snapshot?.overallScore ?? null,
      thumbnailQuality: null,
      photoContrast: null,
    }),
  };
}

export async function buildMarketplaceProductUnderstanding(
  productId: string,
): Promise<ProductUnderstanding | null> {
  const base = await loadProductUnderstandingInput(productId);
  if (!base) return null;

  let input: BuildProductUnderstandingInput = base;

  try {
    const ai = await understandProduct(prisma, {
      title: input.title,
      description: input.description,
      categoryHint: input.categoryName ?? undefined,
    });
    input = {
      ...input,
      productTypeName: ai.productTypeSuggestion?.name ?? input.productTypeName,
      categoryName: ai.categorySuggestion?.name ?? input.categoryName,
      brandName: ai.brand?.name ?? input.brandName,
      modelName: ai.model?.name ?? input.modelName,
    };
  } catch {
    // taxonomy optional — rule-based identity still works
  }

  return buildProductUnderstanding(input);
}

export async function buildProductUnderstandingFromScan(input: {
  title: string;
  description?: string;
  imageCount?: number;
  categoryHint?: string;
}): Promise<ProductUnderstanding> {
  return buildProductUnderstanding({
    title: input.title,
    description: input.description,
    categoryName: input.categoryHint,
    photoCount: input.imageCount ?? 1,
    daos: daosSignalsFromContentQuality({ connected: false }),
  });
}
