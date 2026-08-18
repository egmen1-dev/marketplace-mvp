import { ProductStatus } from "@prisma/client";

import { LOW_STOCK_THRESHOLD } from "@/features/orders/lib/inventory-sync";
import { prisma } from "@/lib/prisma";

export type InventoryDashboardSummary = {
  totalSkus: number;
  totalUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  inStockCount: number;
  lowStockThreshold: number;
};

export async function getInventoryDashboardSummary(
  sellerProfileId: string,
): Promise<InventoryDashboardSummary> {
  const [totalSkus, inventoryAgg, outOfStockCount, lowStockCount, inStockCount] = await Promise.all([
    prisma.product.count({
      where: {
        sellerId: sellerProfileId,
        status: { in: [ProductStatus.ACTIVE, ProductStatus.OUT_OF_STOCK] },
      },
    }),
    prisma.productInventory.aggregate({
      where: { product: { sellerId: sellerProfileId } },
      _sum: { quantity: true },
    }),
    prisma.product.count({
      where: {
        sellerId: sellerProfileId,
        OR: [
          { stock: { lte: 0 } },
          { status: ProductStatus.OUT_OF_STOCK },
          { inventory: { quantity: { lte: 0 } } },
        ],
      },
    }),
    prisma.productInventory.count({
      where: {
        quantity: { gt: 0, lte: LOW_STOCK_THRESHOLD },
        product: { sellerId: sellerProfileId, status: ProductStatus.ACTIVE },
      },
    }),
    prisma.productInventory.count({
      where: {
        quantity: { gt: LOW_STOCK_THRESHOLD },
        product: { sellerId: sellerProfileId, status: ProductStatus.ACTIVE },
      },
    }),
  ]);

  return {
    totalSkus,
    totalUnits: inventoryAgg._sum.quantity ?? 0,
    lowStockCount,
    outOfStockCount,
    inStockCount,
    lowStockThreshold: LOW_STOCK_THRESHOLD,
  };
}
