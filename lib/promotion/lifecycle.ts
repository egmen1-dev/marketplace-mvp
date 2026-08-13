import { PromotionCampaignStatus, type Prisma } from "@prisma/client";

import { toPriceNumber } from "@/features/products/mappers";
import {
  assertSellerOwnsProduct,
  PromotionValidationError,
} from "@/lib/promotion/permissions";
import { evaluatePromotionReadiness } from "@/lib/promotion/readiness";
import type { PromotionCampaignDto } from "@/lib/promotion/types";
import { prisma } from "@/lib/prisma";

function mapCampaign(row: {
  id: string;
  productId: string;
  sellerId: string;
  status: PromotionCampaignStatus;
  budget: Prisma.Decimal | null;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
}): PromotionCampaignDto {
  return {
    id: row.id,
    productId: row.productId,
    sellerId: row.sellerId,
    status: row.status,
    budget: row.budget != null ? toPriceNumber(row.budget) : null,
    startedAt: row.startedAt?.toISOString() ?? null,
    endedAt: row.endedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function loadPromotionSnapshotSource(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: { select: { id: true } },
      seller: { select: { isBlocked: true, isVerified: true } },
      productType: {
        select: {
          characteristics: {
            where: { required: true },
            select: { id: true },
          },
        },
      },
      characteristicValues: { select: { definitionId: true, valueText: true, valueNumber: true, valueBoolean: true, valueJson: true } },
    },
  });
  if (!product) {
    throw new PromotionValidationError("Товар не найден");
  }

  const requiredIds = new Set(
    product.productType?.characteristics.map((c) => c.id) ?? [],
  );
  const filledRequired = product.characteristicValues.filter((cv) => {
    if (!requiredIds.has(cv.definitionId)) return false;
    if (cv.valueText?.trim()) return true;
    if (cv.valueNumber != null) return true;
    if (cv.valueBoolean != null) return true;
    if (cv.valueJson != null) return true;
    return false;
  }).length;

  return {
    product,
    source: {
      status: product.status,
      stock: product.stock,
      price: toPriceNumber(product.price),
      title: product.name,
      description: product.description,
      productTypeId: product.productTypeId,
      categoryId: product.categoryId,
      imageCount: product.images.length,
      sellerId: product.sellerId,
      sellerBlocked: product.seller.isBlocked,
      sellerVerified: product.seller.isVerified,
      requiredCharacteristicCount: requiredIds.size,
      filledRequiredCharacteristicCount: filledRequired,
      characteristicCount: product.characteristicValues.length,
    },
  };
}

export async function startPromotionCampaign(
  sellerProfileId: string,
  productId: string,
): Promise<PromotionCampaignDto> {
  await assertSellerOwnsProduct(sellerProfileId, productId);
  const { source } = await loadPromotionSnapshotSource(productId);
  const readiness = evaluatePromotionReadiness(source);

  if (!readiness.ready) {
    throw new PromotionValidationError(
      readiness.blockers[0] ?? "Товар не готов к продвижению",
    );
  }

  const now = new Date();
  const existing = await prisma.promotionCampaign.findUnique({
    where: { productId },
  });

  if (existing?.status === PromotionCampaignStatus.STARTED) {
    throw new PromotionValidationError("Продвижение уже активно");
  }

  const row = await prisma.$transaction(async (tx) => {
    const campaign = existing
      ? await tx.promotionCampaign.update({
          where: { id: existing.id },
          data: {
            status: PromotionCampaignStatus.STARTED,
            startedAt: now,
            endedAt: null,
          },
        })
      : await tx.promotionCampaign.create({
          data: {
            productId,
            sellerId: sellerProfileId,
            status: PromotionCampaignStatus.STARTED,
            startedAt: now,
          },
        });

    const { activatePlacementsForCampaign } = await import(
      "@/lib/promotion/placements"
    );
    await activatePlacementsForCampaign(campaign.id, productId, tx);
    return campaign;
  });

  return mapCampaign(row);
}

export async function pausePromotionCampaign(
  sellerProfileId: string,
  productId: string,
): Promise<PromotionCampaignDto> {
  await assertSellerOwnsProduct(sellerProfileId, productId);

  const existing = await prisma.promotionCampaign.findUnique({
    where: { productId },
  });
  if (!existing || existing.status !== PromotionCampaignStatus.STARTED) {
    throw new PromotionValidationError("Нет активного продвижения");
  }

  const row = await prisma.$transaction(async (tx) => {
    const campaign = await tx.promotionCampaign.update({
      where: { id: existing.id },
      data: { status: PromotionCampaignStatus.PAUSED },
    });
    const { deactivatePlacementsForCampaign } = await import(
      "@/lib/promotion/placements"
    );
    await deactivatePlacementsForCampaign(existing.id, tx);
    return campaign;
  });

  return mapCampaign(row);
}

export async function endPromotionCampaign(
  sellerProfileId: string,
  productId: string,
): Promise<PromotionCampaignDto> {
  await assertSellerOwnsProduct(sellerProfileId, productId);

  const existing = await prisma.promotionCampaign.findUnique({
    where: { productId },
  });
  if (!existing) {
    throw new PromotionValidationError("Кампания не найдена");
  }

  const row = await prisma.$transaction(async (tx) => {
    const campaign = await tx.promotionCampaign.update({
      where: { id: existing.id },
      data: {
        status: PromotionCampaignStatus.ENDED,
        endedAt: new Date(),
      },
    });
    const { deactivatePlacementsForCampaign } = await import(
      "@/lib/promotion/placements"
    );
    await deactivatePlacementsForCampaign(existing.id, tx);
    return campaign;
  });

  return mapCampaign(row);
}
