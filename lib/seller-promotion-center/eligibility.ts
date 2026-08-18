import { ProductStatus } from "@prisma/client";

import { computeProductCompletenessScore } from "@/lib/conversion/completeness";
import { prisma } from "@/lib/prisma";

import type { PromotionEligibilityResult } from "./types";

function readinessMissing(input: { photosCount: number; completenessScore: number; stock: number }): string[] {
  const missing: string[] = [];
  if (input.photosCount < 3) missing.push("фотографий");
  if (input.completenessScore < 70) missing.push("характеристик");
  if (input.stock <= 0) missing.push("остатка");
  return missing;
}

export async function loadPromotionEligibility(
  sellerProfileId: string,
  productId?: string | null,
): Promise<PromotionEligibilityResult[]> {
  const products = await prisma.product.findMany({
    where: {
      sellerId: sellerProfileId,
      status: ProductStatus.ACTIVE,
      ...(productId ? { id: productId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: productId ? 1 : 20,
    select: {
      id: true,
      name: true,
      description: true,
      categoryId: true,
      productTypeId: true,
      price: true,
      stock: true,
      images: { select: { url: true } },
    },
  });

  return products.map((product) => {
    const completeness = computeProductCompletenessScore({
      photoCount: product.images.length,
      titleLength: product.name.length,
      descriptionLength: product.description?.length ?? 0,
      characteristicCount: 0,
      hasCategory: Boolean(product.categoryId),
      hasProductType: Boolean(product.productTypeId),
      price: Number(product.price),
      hasSeller: true,
    });
    const missing = readinessMissing({
      photosCount: product.images.length,
      completenessScore: completeness.score,
      stock: product.stock ?? 0,
    });
    const reasons: string[] = [];
    if (missing.length === 0) reasons.push("Карточка готова к продвижению");
    return {
      productId: product.id,
      productName: product.name,
      eligible: missing.length === 0,
      reasons,
      missing,
      completenessScore: completeness.score,
    };
  });
}
