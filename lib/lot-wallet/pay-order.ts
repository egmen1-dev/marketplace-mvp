import { OrderStatus, PaymentStatus } from "@prisma/client";

import { finalizePaidOrderInTx } from "@/features/orders/lib/finalize-paid-order";
import { toStripeAmount } from "@/features/payments/lib/amounts";
import { toPriceNumber } from "@/features/products/mappers";
import { loadUserAuthFromDb } from "@/features/auth";
import { prisma } from "@/lib/prisma";

import { payInternalProduct } from "./payment";
import { isLotWalletEnabled } from "./flags";
import { walletSpendableForCheckout } from "./payment";

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

  const debit = await payInternalProduct({
    userId: input.userId,
    sellerProfileId: dbUser?.sellerProfileId ?? null,
    productType: "PRODUCT_ORDER",
    amount,
    referenceId: order.id,
    title: `Покупка · заказ ${order.orderNumber}`,
    idempotencyKey: `order:wallet:${order.id}`,
  });

  if (!debit.ok) return debit;

  try {
    await prisma.$transaction(async (tx) => {
      await finalizePaidOrderInTx(tx, {
        orderId: order.id,
        amountTotal: toStripeAmount(amount),
        currency: "RUB",
        source: "lot_wallet",
      });
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Не удалось завершить оплату",
    };
  }

  return { ok: true };
}
