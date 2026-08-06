import { Prisma } from "@prisma/client";

import { decrementInventory } from "@/features/orders/lib/inventory-sync";
import { prisma } from "@/lib/prisma";

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
 * Soft-hold architecture for a future TTL reservation layer.
 *
 * Today this does **not** reduce sellable stock. Creating an order
 * (status NEW) only validates availability; stock is decremented in
 * `commitInventory` when the order is marked PAID.
 */
export async function reserveInventory(
  orderId: string,
  tx?: Tx,
): Promise<void> {
  void orderId;
  void tx;
}

export async function releaseInventory(
  orderId: string,
  tx?: Tx,
): Promise<void> {
  void orderId;
  void tx;
}

/**
 * Decrement inventory for all line items of a paid order.
 * Updates ProductInventory + Product.stock (+ history) in the same transaction.
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

export async function commitInventoryStandalone(orderId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await commitInventory(orderId, tx);
  });
}
