import { ModerationStatus } from "@prisma/client";

import type { ProductListItem } from "@/features/products/types";
import { prisma } from "@/lib/prisma";
import { detectProhibitedProduct } from "@/lib/marketplace-trust-loop/risk/prohibited-products";
import { isMarketplaceTrustLoopEnabled } from "@/lib/marketplace-trust-loop/flags";

import type { SocialContentValidation } from "./types";

export async function validateSocialContent(input: {
  product: Pick<ProductListItem, "id" | "title" | "price" | "primaryImage"> & {
    description?: string | null;
  };
  photoCount?: number;
}): Promise<SocialContentValidation> {
  const blockers: string[] = [];
  const warnings: string[] = [];

  const prohibited = detectProhibitedProduct({
    name: input.product.title,
    description: input.product.description ?? null,
  });
  if (prohibited.hit) {
    blockers.push(prohibited.label ?? "Товар не проходит проверку безопасности");
  }

  const photos = input.photoCount ?? (input.product.primaryImage ? 1 : 0);
  if (photos < 1) {
    blockers.push("Добавьте фото товара для социального контента");
  } else if (photos < 2) {
    warnings.push("Рекомендуем 2+ фото для лучшего CTR");
  }

  if (input.product.price <= 0) {
    blockers.push("Некорректная цена товара");
  }

  if (isMarketplaceTrustLoopEnabled()) {
    const moderation = await prisma.productModeration.findUnique({
      where: { productId: input.product.id },
      select: { status: true, prohibitedHit: true },
    });
    if (moderation?.prohibitedHit) {
      blockers.push("Товар заблокирован модерацией");
    }
    if (moderation?.status === ModerationStatus.REJECTED) {
      blockers.push("Товар отклонён модерацией");
    }
  }

  return {
    allowed: blockers.length === 0,
    blockers,
    warnings,
  };
}
