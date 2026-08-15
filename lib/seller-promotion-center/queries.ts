import { ProductStatus } from "@prisma/client";

import { computeProductCompletenessScore } from "@/lib/conversion/completeness";
import { prisma } from "@/lib/prisma";

import { isSellerPromotionCenterEnabled } from "./flags";
import type { PromotionPlanId } from "./plans";

export type PromotionProductRow = {
  id: string;
  name: string;
  imageUrl: string | null;
  price: number;
  ready: boolean;
  completenessScore: number;
  missing: string[];
};

export type PromotionCenterDashboard = {
  enabled: boolean;
  activeCampaigns: number;
  spent30d: number;
  orders30d: number;
  revenue30d: number;
  products: PromotionProductRow[];
};

function readinessMissing(input: {
  photosCount: number;
  completenessScore: number;
}): string[] {
  const missing: string[] = [];
  if (input.photosCount < 3) missing.push("фотографий");
  if (input.completenessScore < 70) missing.push("характеристик");
  return missing;
}

export async function getPromotionCenterDashboard(
  sellerProfileId: string,
): Promise<PromotionCenterDashboard> {
  if (!isSellerPromotionCenterEnabled()) {
    return {
      enabled: false,
      activeCampaigns: 0,
      spent30d: 0,
      orders30d: 0,
      revenue30d: 0,
      products: [],
    };
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [products, ledgerSpend, orderAgg] = await Promise.all([
    prisma.product.findMany({
      where: { sellerId: sellerProfileId, status: ProductStatus.ACTIVE },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        name: true,
        price: true,
        description: true,
        categoryId: true,
        productTypeId: true,
        images: { select: { url: true } },
        stock: true,
      },
    }),
    prisma.walletLedgerEntry.aggregate({
      where: {
        type: "PROMOTION_PURCHASE",
        createdAt: { gte: since },
        user: { sellerProfile: { id: sellerProfileId } },
      },
      _sum: { amount: true },
    }),
    prisma.order.aggregate({
      where: {
        createdAt: { gte: since },
        items: { some: { product: { sellerId: sellerProfileId } } },
      },
      _count: { _all: true },
      _sum: { total: true },
    }),
  ]);

  const productRows: PromotionProductRow[] = products.map((p) => {
    const completeness = computeProductCompletenessScore({
      photoCount: p.images.length,
      titleLength: p.name.length,
      descriptionLength: p.description?.length ?? 0,
      characteristicCount: 0,
      hasCategory: Boolean(p.categoryId),
      hasProductType: Boolean(p.productTypeId),
      price: Number(p.price),
      hasSeller: true,
    });
    const missing = readinessMissing({
      photosCount: p.images.length,
      completenessScore: completeness.score,
    });
    return {
      id: p.id,
      name: p.name,
      imageUrl: p.images[0]?.url ?? null,
      price: Number(p.price),
      ready: missing.length === 0 && (p.stock ?? 0) > 0,
      completenessScore: completeness.score,
      missing,
    };
  });

  return {
    enabled: true,
    activeCampaigns: 0,
    spent30d: Number(ledgerSpend._sum.amount ?? 0),
    orders30d: orderAgg._count._all,
    revenue30d: Number(orderAgg._sum.total ?? 0),
    products: productRows,
  };
}

export type PurchasePromotionInput = {
  userId: string;
  sellerProfileId: string;
  productId: string;
  planId: PromotionPlanId;
};
