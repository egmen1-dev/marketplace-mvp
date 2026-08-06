import { Prisma } from "@prisma/client";

import { decrementInventory } from "@/features/orders/lib/inventory-sync";

type Tx = Prisma.TransactionClient;

export class InventoryError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 409,
  ) {
    super(message);
    this.name = "InventoryError";
  }
}

/**
 * Decrement inventory for all line items of a paid order.
 * Called only from `finalizePaidOrder` inside a transaction.
 * Updates ProductInventory + Product.stock (+ history).
 *
 * Stock is never reduced at Order NEW creation — only on confirmed payment.
 */
export async function commitInventory(
  orderId: string,
  tx: Tx,
): Promise<void> {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: {
      productId: true,
      quantity: true,
      productName: true,
    },
  });

  for (const item of items) {
    try {
      await decrementInventory(tx, {
        productId: item.productId,
        amount: item.quantity,
        note: `Оплата заказа ${orderId}`,
        requireActive: true,
      });
    } catch (err) {
      const code = err instanceof Error ? err.message : "OUT_OF_STOCK";
      if (code === "OUT_OF_STOCK" || code === "PRODUCT_NOT_FOUND") {
        throw new InventoryError(
          "OUT_OF_STOCK",
          `Недостаточно «${item.productName}» для оплаты заказа`,
          409,
        );
      }
      throw err;
    }
  }
}
