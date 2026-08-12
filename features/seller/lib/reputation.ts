import { OrderStatus, ProductStatus, SellerKind } from "@prisma/client";

import { formatDateMoscow } from "@/lib/format/datetime";
import { prisma } from "@/lib/prisma";

/** Sellers registered within this window may receive NEW_SELLER badge. */
export const NEW_SELLER_DAYS = 90;

export type SellerTrustMetrics = {
  totalProducts: number;
  activeProducts: number;
  completedOrdersCount: number;
  salesCount: number;
  joinedAt: string;
};

export type SellerTrustProfile = {
  id: string;
  storeName: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  kind: SellerKind;
  isVerified: boolean;
  verifiedAt: string | null;
  joinedAt: string;
  /** Free-text seller shipping notes — only shown when set. */
  shippingDefaults: string | null;
  metrics: SellerTrustMetrics;
};

export type SellerBadgeVariant = "NEW_SELLER" | "VERIFIED_SELLER" | "STORE";

export type SellerMetricItem = {
  key: "products" | "orders" | "sales";
  label: string;
  value: number;
};

const BADGE_LABELS: Record<SellerBadgeVariant, string> = {
  NEW_SELLER: "Новый продавец",
  VERIFIED_SELLER: "Проверенный продавец",
  STORE: "Магазин",
};

export function sellerBadgeLabel(variant: SellerBadgeVariant): string {
  return BADGE_LABELS[variant];
}

export function formatSellerKindLabel(kind: SellerKind): string {
  return kind === SellerKind.SHOP ? "Магазин" : "Продавец";
}

export function resolveSellerBadges(input: {
  isVerified: boolean;
  kind: SellerKind;
  joinedAt: Date | string;
}): SellerBadgeVariant[] {
  const badges: SellerBadgeVariant[] = [];

  if (input.kind === SellerKind.SHOP) {
    badges.push("STORE");
  }

  if (input.isVerified) {
    badges.push("VERIFIED_SELLER");
  }

  const joinedMs = new Date(input.joinedAt).getTime();
  const daysSinceJoined =
    (Date.now() - joinedMs) / (1000 * 60 * 60 * 24);
  if (daysSinceJoined <= NEW_SELLER_DAYS) {
    badges.push("NEW_SELLER");
  }

  return badges;
}

/** Only surface metrics backed by real DB counts (> 0). */
export function getVisibleSellerMetrics(
  metrics: SellerTrustMetrics,
): SellerMetricItem[] {
  const items: SellerMetricItem[] = [];

  if (metrics.activeProducts > 0) {
    items.push({
      key: "products",
      label: "Товаров",
      value: metrics.activeProducts,
    });
  }

  if (metrics.completedOrdersCount > 0) {
    items.push({
      key: "orders",
      label: "Заказов",
      value: metrics.completedOrdersCount,
    });
  }

  if (metrics.salesCount > 0) {
    items.push({
      key: "sales",
      label: "Продаж",
      value: metrics.salesCount,
    });
  }

  return items;
}

export function formatSellerJoinedDate(joinedAt: Date | string): string {
  return formatDateMoscow(joinedAt);
}

export async function getSellerReputationMetrics(
  sellerProfileId: string,
): Promise<SellerTrustMetrics> {
  const [totalProducts, activeProducts, orderItems, profile] =
    await Promise.all([
      prisma.product.count({ where: { sellerId: sellerProfileId } }),
      prisma.product.count({
        where: {
          sellerId: sellerProfileId,
          status: ProductStatus.ACTIVE,
        },
      }),
      prisma.orderItem.findMany({
        where: {
          product: { sellerId: sellerProfileId },
          order: {
            status: {
              in: [
                OrderStatus.COMPLETED,
                OrderStatus.DELIVERED,
                OrderStatus.PICKED_UP,
              ],
            },
          },
        },
        select: { quantity: true, orderId: true },
      }),
      prisma.sellerProfile.findUnique({
        where: { id: sellerProfileId },
        select: { createdAt: true },
      }),
    ]);

  if (!profile) {
    throw new Error("Seller profile not found");
  }

  const orderIds = new Set(orderItems.map((item) => item.orderId));
  const salesCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  return {
    totalProducts,
    activeProducts,
    completedOrdersCount: orderIds.size,
    salesCount,
    joinedAt: profile.createdAt.toISOString(),
  };
}

export async function getSellerTrustProfile(
  idOrSlug: string,
): Promise<SellerTrustProfile | null> {
  const profile = await prisma.sellerProfile.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
    select: {
      id: true,
      storeName: true,
      slug: true,
      description: true,
      logoUrl: true,
      kind: true,
      isVerified: true,
      verifiedAt: true,
      createdAt: true,
      isBlocked: true,
      shippingDefaults: true,
    },
  });

  if (!profile || profile.isBlocked) return null;

  const metrics = await getSellerReputationMetrics(profile.id);

  return {
    id: profile.id,
    storeName: profile.storeName,
    slug: profile.slug,
    description: profile.description,
    logoUrl: profile.logoUrl,
    kind: profile.kind,
    isVerified: profile.isVerified,
    verifiedAt: profile.verifiedAt?.toISOString() ?? null,
    joinedAt: profile.createdAt.toISOString(),
    shippingDefaults: profile.shippingDefaults,
    metrics,
  };
}
