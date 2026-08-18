import { OrderStatus, ProductStatus } from "@prisma/client";

import { resolveRequestUser, isSellerCapable } from "@/features/auth/resolve-request-user";
import { LOW_STOCK_THRESHOLD } from "@/features/orders/lib/inventory-sync";
import { getWalletOverview, isLotWalletEnabled } from "@/lib/lot-wallet";
import { prisma } from "@/lib/prisma";

import { buildMobileSellerHomePayload, type MobileSellerHomePayload } from "./seller-home";

export async function buildMobileSellerHomeForUser(userId: string, sellerProfileId: string | null): Promise<MobileSellerHomePayload> {
  if (!sellerProfileId) {
    return buildMobileSellerHomePayload();
  }

  const [activeProducts, outOfStockCount, lowStockCount, needActionOrders, promotionActive, wallet] = await Promise.all([
    prisma.product.count({ where: { sellerId: sellerProfileId, status: ProductStatus.ACTIVE } }),
    prisma.product.count({
      where: {
        sellerId: sellerProfileId,
        status: ProductStatus.ACTIVE,
        stock: { lte: 0 },
      },
    }),
    prisma.productInventory.count({
      where: {
        quantity: { gt: 0, lte: LOW_STOCK_THRESHOLD },
        product: { sellerId: sellerProfileId, status: ProductStatus.ACTIVE },
      },
    }),
    prisma.order.count({
      where: {
        status: { in: [OrderStatus.PAID, OrderStatus.PROCESSING] },
        items: { some: { product: { sellerId: sellerProfileId } } },
      },
    }),
    Promise.resolve(0).then(async () => {
      try {
        return await prisma.promotionCampaign.count({
          where: { sellerId: sellerProfileId, status: "STARTED" },
        });
      } catch {
        return 0;
      }
    }),
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
    products: { active: activeProducts, needAttention: outOfStockCount + lowStockCount },
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
