import { OrderStatus, ProductStatus } from "@prisma/client";

import { resolveRequestUser, isSellerCapable } from "@/features/auth/resolve-request-user";
import { getWalletOverview, isLotWalletEnabled } from "@/lib/lot-wallet";
import { prisma } from "@/lib/prisma";

import { buildMobileSellerHomePayload, type MobileSellerHomePayload } from "./seller-home";

export async function buildMobileSellerHomeForUser(userId: string, sellerProfileId: string | null): Promise<MobileSellerHomePayload> {
  if (!sellerProfileId) {
    return buildMobileSellerHomePayload();
  }

  const [activeProducts, needAttention, needActionOrders, promotionActive, wallet] = await Promise.all([
    prisma.product.count({ where: { sellerId: sellerProfileId, status: ProductStatus.ACTIVE } }),
    prisma.product.count({
      where: {
        sellerId: sellerProfileId,
        status: ProductStatus.ACTIVE,
        OR: [{ stock: { lte: 0 } }, { moderationStatus: { not: "APPROVED" } }],
      },
    }),
    prisma.order.count({
      where: {
        sellerProfileId,
        status: { in: [OrderStatus.PAID, OrderStatus.PROCESSING] },
      },
    }),
    Promise.resolve(0),
    isLotWalletEnabled()
      ? getWalletOverview({ userId, sellerProfileId }).catch(() => null)
      : Promise.resolve(null),
  ]);

  return buildMobileSellerHomePayload({
    money: {
      available: wallet?.buckets.spendableAmount ?? 0,
      pending: wallet?.buckets.pendingFromSales ?? 0,
    },
    orders: { needAction: needActionOrders },
    products: { active: activeProducts, needAttention },
    promotion: { active: promotionActive },
    intelligence: { topAction: null, productId: null },
  });
}

export async function buildMobileSellerHomeFromRequest(request: Request): Promise<MobileSellerHomePayload> {
  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role)) {
    return buildMobileSellerHomePayload();
  }
  return buildMobileSellerHomeForUser(user.id, user.sellerProfileId);
}
