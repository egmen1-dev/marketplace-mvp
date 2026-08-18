import { prisma } from "@/lib/prisma";

import type { PromotionHistoryRow } from "./types";

export async function listPromotionHistory(sellerProfileId: string): Promise<PromotionHistoryRow[]> {
  const [orders, ledger] = await Promise.all([
    prisma.promotionOrder.findMany({
      where: { sellerId: sellerProfileId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        product: { select: { id: true, name: true } },
        plan: { select: { name: true } },
      },
    }),
    prisma.walletLedgerEntry.findMany({
      where: {
        type: "PROMOTION_PURCHASE",
        user: { sellerProfile: { id: sellerProfileId } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        title: true,
        amount: true,
        referenceId: true,
        createdAt: true,
      },
    }),
  ]);

  const orderRows: PromotionHistoryRow[] = orders.map((order) => ({
    id: order.id,
    kind: "order",
    title: `${order.plan.name} · ${order.product.name}`,
    productId: order.product.id,
    productName: order.product.name,
    amount: Number(order.amount),
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    endedAt: order.endedAt?.toISOString() ?? null,
  }));

  const walletRows: PromotionHistoryRow[] = ledger.map((entry) => {
    const productId = entry.referenceId?.split(":")[0] ?? null;
    return {
      id: entry.id,
      kind: "wallet",
      title: entry.title,
      productId,
      productName: null,
      amount: Number(entry.amount),
      status: "PAID",
      createdAt: entry.createdAt.toISOString(),
      endedAt: null,
    };
  });

  return [...orderRows, ...walletRows]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 40);
}
