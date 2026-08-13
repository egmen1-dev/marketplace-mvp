import { FinanceForbiddenError } from "@/lib/finance/errors";
import { getSellerBalance } from "@/lib/finance/balance";
import { getTransactionByOrderId } from "@/lib/finance/transaction";
import { prisma } from "@/lib/prisma";

export async function assertSellerOwnsBalance(
  sellerProfileId: string,
  requestedSellerId: string,
): Promise<void> {
  if (sellerProfileId !== requestedSellerId) {
    throw new FinanceForbiddenError("Можно просматривать только свой баланс");
  }
}

export async function assertBuyerOwnsOrder(
  userId: string,
  orderId: string,
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { userId: true },
  });
  if (!order || order.userId !== userId) {
    throw new FinanceForbiddenError("Заказ не найден");
  }
}

export async function getSellerBalanceForSession(
  sellerProfileId: string,
) {
  await assertSellerOwnsBalance(sellerProfileId, sellerProfileId);
  return getSellerBalance(sellerProfileId);
}

export async function getBuyerOrderTransaction(
  userId: string,
  orderId: string,
) {
  await assertBuyerOwnsOrder(userId, orderId);
  return getTransactionByOrderId(orderId);
}
