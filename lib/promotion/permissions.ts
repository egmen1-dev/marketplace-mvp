import { PromotionCampaignStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export class PromotionForbiddenError extends Error {
  constructor(message = "Нет доступа к этому товару") {
    super(message);
    this.name = "PromotionForbiddenError";
  }
}

export class PromotionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PromotionValidationError";
  }
}

/** Seller may manage promotion only for own products. */
export async function assertSellerOwnsProduct(
  sellerProfileId: string,
  productId: string,
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, sellerId: sellerProfileId },
    select: { id: true, sellerId: true },
  });
  if (!product) {
    throw new PromotionForbiddenError();
  }
  return product;
}

export function isPromotionActive(
  status: PromotionCampaignStatus | null | undefined,
): boolean {
  return status === PromotionCampaignStatus.STARTED;
}
