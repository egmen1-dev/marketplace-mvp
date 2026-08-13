import { Prisma, ProductStatus, PromotionCampaignStatus, PromotionSurfaceType } from "@prisma/client";

import { mapProductListItem, toPriceNumber } from "@/features/products/mappers";
import type { ProductListItem } from "@/features/products/types";
import { isPromotionSurfacesEnabled } from "@/lib/promotion/flags";
import { isPromotionBillingEnabled } from "@/lib/promotion/billing/flags";
import { getSellerPromotionOrderMap } from "@/lib/promotion/billing/orders";
import { listActivePromotionPlans } from "@/lib/promotion/billing/plans";
import {
  getAdminPromotionBillingSummary,
  listRecentPaidPromotionOrders,
} from "@/lib/promotion/billing/queries";
import { getSellerCampaignPerformanceMap } from "@/lib/promotion/analytics/queries";
import { isPromotionAnalyticsEnabled } from "@/lib/promotion/analytics/flags";
import { evaluatePromotionReadiness } from "@/lib/promotion/readiness";
import type {
  AdminPromotionDashboard,
  AdminPromotionFilter,
  AdminPromotionRow,
  PromotionCampaignDto,
  PromotionPlacementDto,
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
  return getPromotedProductsForSurface(PromotionSurfaceType.HOME_FEATURED, limit);
}

async function getPromotedProductsForSurface(
  surface: PromotionSurfaceType,
  limit = 8,
  categoryId?: string | null,
): Promise<ProductListItem[]> {
  if (!isPromotionSurfacesEnabled()) return [];

  const placements = await prisma.promotionPlacement.findMany({
    where: {
      active: true,
      surface,
      campaign: { status: PromotionCampaignStatus.STARTED },
      ...(categoryId && surface === PromotionSurfaceType.CATEGORY_TOP
        ? { product: { categoryId } }
        : {}),
    },
    orderBy: [{ priority: "desc" }, { campaign: { startedAt: "desc" } }],
    take: limit,
    include: {
      product: {
        include: listInclude,
      },
    },
  });

  return placements
    .map((p) => p.product)
    .filter(
      (product) =>
        product.status === ProductStatus.ACTIVE && product.stock > 0,
    )
    .slice(0, limit)
    .map(mapProductListItem);
}

/** Homepage promoted slot — organic sections unchanged; additive block only. */
export async function getHomepagePromotedProducts(
  limit = 8,
): Promise<ProductListItem[]> {
  return getPromotedProductsForSurface(
    PromotionSurfaceType.HOME_FEATURED,
    limit,
  );
}

/** Catalog top promoted strip — flag OFF returns []. */
export async function getCatalogPromotedProducts(
  limit = 4,
  categoryId?: string | null,
): Promise<ProductListItem[]> {
  const surface =
    categoryId != null
      ? PromotionSurfaceType.CATEGORY_TOP
      : PromotionSurfaceType.CATALOG_TOP;
  return getPromotedProductsForSurface(surface, limit, categoryId);
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
    include: {
      ...listInclude,
      promotionCampaign: {
        include: {
          placements: {
            orderBy: [{ priority: "desc" }, { surface: "asc" }],
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const campaignIds = products
    .map((p) => p.promotionCampaign?.id)
    .filter((id): id is string => Boolean(id));

  const performanceMap = await getSellerCampaignPerformanceMap(campaignIds);
  const orderMap = isPromotionBillingEnabled()
    ? await getSellerPromotionOrderMap(products.map((p) => p.id))
    : new Map();

  return products.map((product) => {
    const readiness = snapshotFromProduct(product);
    const campaign = product.promotionCampaign
      ? mapCampaign(product.promotionCampaign)
      : null;
    const placements: PromotionPlacementDto[] =
      product.promotionCampaign?.placements.map((p) => ({
        id: p.id,
        campaignId: p.campaignId,
        productId: p.productId,
        surface: p.surface,
        position: p.position,
        priority: p.priority,
        active: p.active,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })) ?? [];

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
      placements,
      activePlacementCount: placements.filter((p) => p.active).length,
      performance: campaign
        ? (performanceMap.get(campaign.id) ?? null)
        : null,
      activeOrder: orderMap.get(product.id) ?? null,
    };
  });
}

export async function listAdminPromotionCampaigns(opts?: {
  status?: AdminPromotionFilter;
}): Promise<AdminPromotionDashboard> {
  const statusFilter = opts?.status ?? "ALL";

  const campaigns = await prisma.promotionCampaign.findMany({
    where:
      statusFilter === "ALL"
        ? undefined
        : { status: statusFilter },
    include: {
      product: { select: { id: true, name: true } },
      seller: { select: { id: true, storeName: true } },
      placements: {
        orderBy: [{ priority: "desc" }, { surface: "asc" }],
      },
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
    const activePlacements = c.placements.filter((p) => p.active);
    return {
      campaignId: c.id,
      productId: c.productId,
      productTitle: c.product.name,
      sellerId: c.sellerId,
      sellerName: c.seller.storeName,
      status: c.status,
      startedAt: c.startedAt?.toISOString() ?? null,
      qualityScore: readiness.qualityScore,
      placementCount: activePlacements.length,
      surfaces: activePlacements.map((p) => p.surface),
      topPriority:
        activePlacements.length > 0
          ? Math.max(...activePlacements.map((p) => p.priority))
          : null,
    };
  });

  const allCampaigns = await prisma.promotionCampaign.findMany({
    select: { status: true },
  });
  const counts = {
    started: allCampaigns.filter((c) => c.status === PromotionCampaignStatus.STARTED)
      .length,
    paused: allCampaigns.filter((c) => c.status === PromotionCampaignStatus.PAUSED)
      .length,
    ended: allCampaigns.filter((c) => c.status === PromotionCampaignStatus.ENDED)
      .length,
  };

  const { getAdminPromotionAnalytics } = await import(
    "@/lib/promotion/analytics/queries"
  );
  const analyticsData = isPromotionAnalyticsEnabled()
    ? await getAdminPromotionAnalytics()
    : {
        summary: {
          impressions: 0,
          clicks: 0,
          productViews: 0,
          addToCart: 0,
          checkoutStarted: 0,
          orders: 0,
          revenue: 0,
          activeCampaigns: counts.started,
          ctr: 0,
        },
        rows: [],
      };

  const billing = isPromotionBillingEnabled()
    ? {
        summary: await getAdminPromotionBillingSummary(),
        recentOrders: await listRecentPaidPromotionOrders(),
      }
    : null;

  const plans = isPromotionBillingEnabled()
    ? await listActivePromotionPlans()
    : [];

  return {
    rows,
    counts,
    analytics: analyticsData.summary,
    analyticsRows: analyticsData.rows,
    billing,
    plans,
  };
}
