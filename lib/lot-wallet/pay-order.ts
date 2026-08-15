import { OrderStatus } from "@prisma/client";

import { finalizePaidOrderInTx } from "@/features/orders/lib/finalize-paid-order";
import { toStripeAmount } from "@/features/payments/lib/amounts";
import { toPriceNumber } from "@/features/products/mappers";
import { loadUserAuthFromDb } from "@/features/auth";
import { verifyWalletOrderPaidInTx } from "@/lib/financial-transaction-engine/verification";
import { prisma } from "@/lib/prisma";

import { payInternalProductWithFinalize, walletSpendableForCheckout } from "./payment";
import { isLotWalletEnabled } from "./flags";

export async function payOrderWithLotWallet(input: {
  userId: string;
  orderId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isLotWalletEnabled()) {
    return { ok: false, error: "Кошелёк ЛОТ временно недоступен" };
  }

  const order = await prisma.order.findFirst({
    where: { id: input.orderId, userId: input.userId },
    select: { id: true, total: true, status: true, orderNumber: true },
  });

  if (!order) return { ok: false, error: "Заказ не найден" };
  if (order.status !== OrderStatus.NEW) {
    return { ok: false, error: "Заказ уже оплачен или недоступен" };
  }

  const amount = toPriceNumber(order.total);
  if (amount <= 0) {
    return { ok: false, error: "Сумма заказа должна быть больше нуля" };
  }

  const dbUser = await loadUserAuthFromDb(input.userId);
  const spendable = await walletSpendableForCheckout({
    userId: input.userId,
    sellerProfileId: dbUser?.sellerProfileId ?? null,
  });

  if (spendable < amount) {
    return {
      ok: false,
      error: `Недостаточно средств в кошельке. Доступно: ${Math.round(spendable)} ₽`,
    };
  }

  return payInternalProductWithFinalize({
    userId: input.userId,
    sellerProfileId: dbUser?.sellerProfileId ?? null,
    productType: "PRODUCT_ORDER",
    amount,
    referenceId: order.id,
    title: `Покупка · заказ ${order.orderNumber}`,
    idempotencyKey: `order:wallet:${order.id}`,
    orderId: order.id,
    finalize: async (tx) => {
      await finalizePaidOrderInTx(tx, {
        orderId: order.id,
        amountTotal: toStripeAmount(amount),
        currency: "RUB",
        source: "lot_wallet",
      });
    },
    verifyAfter: async (tx) => {
      await verifyWalletOrderPaidInTx(tx, {
        userId: input.userId,
        orderId: order.id,
        amountRub: amount,
      });
    },
  });
}
