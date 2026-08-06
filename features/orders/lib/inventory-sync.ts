import { Prisma, ProductStatus } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export const LOW_STOCK_THRESHOLD = 5;

/**
 * Ensure ProductInventory exists and set absolute quantity.
 * Mirrors `quantity` onto Product.stock and writes InventoryHistory when delta !== 0.
 */
export async function setInventoryQuantity(
  tx: Tx,
  params: {
    productId: string;
    quantity: number;
    actorUserId?: string | null;
    note?: string | null;
  },
): Promise<{ quantity: number; delta: number }> {
  const qty = Math.max(0, Math.floor(params.quantity));

  const existing = await tx.productInventory.findUnique({
    where: { productId: params.productId },
    select: { quantity: true },
  });

  const prev = existing?.quantity ?? 0;
  const delta = qty - prev;

  await tx.productInventory.upsert({
    where: { productId: params.productId },
    create: {
      productId: params.productId,
      quantity: qty,
      reservedQuantity: 0,
    },
    update: { quantity: qty },
  });

  await tx.product.update({
    where: { id: params.productId },
    data: { stock: qty },
  });

  if (delta !== 0) {
    await tx.inventoryHistory.create({
      data: {
        productId: params.productId,
        delta,
        quantityAfter: qty,
        note: params.note ?? null,
        actorUserId: params.actorUserId ?? null,
      },
    });
  }

  const product = await tx.product.findUnique({
    where: { id: params.productId },
    select: { status: true },
  });

  if (product?.status === ProductStatus.ACTIVE && qty <= 0) {
    await tx.product.update({
      where: { id: params.productId },
      data: { status: ProductStatus.OUT_OF_STOCK },
    });
  } else if (product?.status === ProductStatus.OUT_OF_STOCK && qty > 0) {
    await tx.product.update({
      where: { id: params.productId },
      data: { status: ProductStatus.ACTIVE },
    });
  }

  return { quantity: qty, delta };
}

/**
 * Decrement inventory atomically (payment commit path).
 * Updates Product.stock + ProductInventory + history.
 */
export async function decrementInventory(
  tx: Tx,
  params: {
    productId: string;
    amount: number;
    actorUserId?: string | null;
    note?: string | null;
    requireActive?: boolean;
  },
): Promise<number> {
  const amount = Math.floor(params.amount);
  if (amount <= 0) {
    throw new Error("INVALID_AMOUNT");
  }

  let inv = await tx.productInventory.findUnique({
    where: { productId: params.productId },
  });

  if (!inv) {
    const product = await tx.product.findUnique({
      where: { id: params.productId },
      select: { stock: true },
    });
    if (!product) {
      throw new Error("PRODUCT_NOT_FOUND");
    }
    inv = await tx.productInventory.create({
      data: {
        productId: params.productId,
        quantity: product.stock,
        reservedQuantity: 0,
      },
    });
  }

  if (inv.quantity < amount) {
    throw new Error("OUT_OF_STOCK");
  }

  if (params.requireActive !== false) {
    const product = await tx.product.findUnique({
      where: { id: params.productId },
      select: { status: true },
    });
    if (!product || product.status !== ProductStatus.ACTIVE) {
      throw new Error("OUT_OF_STOCK");
    }
  }

  const updated = await tx.productInventory.updateMany({
    where: {
      productId: params.productId,
      quantity: { gte: amount },
    },
    data: { quantity: { decrement: amount } },
  });

  if (updated.count !== 1) {
    throw new Error("OUT_OF_STOCK");
  }

  const after = await tx.productInventory.findUniqueOrThrow({
    where: { productId: params.productId },
    select: { quantity: true },
  });

  await tx.product.update({
    where: { id: params.productId },
    data: {
      stock: after.quantity,
      ...(after.quantity <= 0
        ? { status: ProductStatus.OUT_OF_STOCK }
        : {}),
    },
  });

  await tx.inventoryHistory.create({
    data: {
      productId: params.productId,
      delta: -amount,
      quantityAfter: after.quantity,
      note: params.note ?? "Оплата заказа",
      actorUserId: params.actorUserId ?? null,
    },
  });

  return after.quantity;
}

export function isLowStock(quantity: number): boolean {
  return quantity > 0 && quantity <= LOW_STOCK_THRESHOLD;
}
