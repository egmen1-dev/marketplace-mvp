import { Prisma, ProductStatus, PromotionCampaignStatus } from "@prisma/client";

import { mapProductListItem, toPriceNumber } from "@/features/products/mappers";
import type { ProductListItem } from "@/features/products/types";
import { evaluatePromotionReadiness } from "@/lib/promotion/readiness";
import type {
  AdminPromotionRow,
  PromotionCampaignDto,
  SellerPromotionRow,
} from "@/lib/promotion/types";
import { prisma } from "@/lib/prisma";

const listInclude = {
  category: { select: { id: true, name: true, slug: true } },
  images: {
    orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }],
    take: 1,
  },
  seller: { select: { id: true, storeName: true, slug: true, isBlocked: true, isVerified: true } },
  productType: {
    select: {
      characteristics: {
        where: { required: true },
        select: { id: true },
      },
    },
  },
  characteristicValues: { select: { definitionId: true, valueText: true, valueNumber: true, valueBoolean: true, valueJson: true } },
  promotionCampaign: true,
} satisfies Prisma.ProductInclude;

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

function snapshotFromProduct(
  product: Prisma.ProductGetPayload<{ include: typeof listInclude }>,
) {
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

  return evaluatePromotionReadiness({
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
  });
}

/** Active promoted products for optional homepage/catalog surfaces. Does not touch search. */
export async function getPromotedProducts(
  limit = 8,
): Promise<ProductListItem[]> {
  const campaigns = await prisma.promotionCampaign.findMany({
    where: { status: PromotionCampaignStatus.STARTED },
    select: { productId: true },
    orderBy: { startedAt: "desc" },
    take: limit,
  });

  if (campaigns.length === 0) return [];

  const ids = campaigns.map((c) => c.productId);
  const rows = await prisma.product.findMany({
    where: { id: { in: ids }, status: ProductStatus.ACTIVE, stock: { gt: 0 } },
    include: listInclude,
  });

  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids
    .map((id) => byId.get(id))
    .filter((row): row is NonNullable<typeof row> => row != null)
    .map(mapProductListItem);
}

export async function isProductPromoted(productId: string): Promise<boolean> {
  const campaign = await prisma.promotionCampaign.findUnique({
    where: { productId },
    select: { status: true },
  });
  return campaign?.status === PromotionCampaignStatus.STARTED;
}

export async function listSellerPromotionRows(
  sellerProfileId: string,
): Promise<SellerPromotionRow[]> {
  const products = await prisma.product.findMany({
    where: { sellerId: sellerProfileId },
    include: listInclude,
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return products.map((product) => {
    const readiness = snapshotFromProduct(product);
    const campaign = product.promotionCampaign
      ? mapCampaign(product.promotionCampaign)
      : null;

    return {
      productId: product.id,
      title: product.name,
      price: toPriceNumber(product.price),
      currency: product.currency,
      status: product.status,
      imageUrl: product.images[0]?.url ?? null,
      readiness,
      campaign,
      isPromoted: campaign?.status === PromotionCampaignStatus.STARTED,
    };
  });
}

export async function listAdminPromotionCampaigns(): Promise<{
  rows: AdminPromotionRow[];
  counts: { started: number; paused: number; ended: number };
}> {
  const campaigns = await prisma.promotionCampaign.findMany({
    include: {
      product: { select: { id: true, name: true } },
      seller: { select: { id: true, storeName: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const productIds = campaigns.map((c) => c.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: listInclude,
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const rows: AdminPromotionRow[] = campaigns.map((c) => {
    const product = productMap.get(c.productId);
    const readiness = product ? snapshotFromProduct(product) : { qualityScore: 0 };
    return {
      campaignId: c.id,
      productId: c.productId,
      productTitle: c.product.name,
      sellerId: c.sellerId,
      sellerName: c.seller.storeName,
      status: c.status,
      startedAt: c.startedAt?.toISOString() ?? null,
      qualityScore: readiness.qualityScore,
    };
  });

  const counts = {
    started: campaigns.filter((c) => c.status === PromotionCampaignStatus.STARTED)
      .length,
    paused: campaigns.filter((c) => c.status === PromotionCampaignStatus.PAUSED)
      .length,
    ended: campaigns.filter((c) => c.status === PromotionCampaignStatus.ENDED)
      .length,
  };

  return { rows, counts };
}
