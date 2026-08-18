import { setInventoryQuantity } from "@/features/orders/lib/inventory-sync";
import { prisma } from "@/lib/prisma";

import type { InventoryAdjustInput, InventoryStockRow } from "./types";
import { getSellerInventoryProductDetail } from "./stock";

const ADJUSTMENT_NOTE = "Корректировка остатка продавцом";

async function resolveTargetQuantity(
  sellerProfileId: string,
  input: InventoryAdjustInput,
): Promise<number | null> {
  const product = await prisma.product.findFirst({
    where: { id: input.productId, sellerId: sellerProfileId },
    select: { stock: true, inventory: { select: { quantity: true } } },
  });
  if (!product) return null;

  const current = product.inventory?.quantity ?? product.stock ?? 0;
  if (input.quantity !== undefined) return Math.max(0, Math.floor(input.quantity));
  if (input.delta !== undefined) return Math.max(0, Math.floor(current + input.delta));
  return null;
}

export async function adjustSellerInventory(input: {
  sellerProfileId: string;
  actorUserId: string;
  adjustment: InventoryAdjustInput;
}): Promise<{ ok: true; product: InventoryStockRow } | { ok: false; error: string }> {
  const target = await resolveTargetQuantity(input.sellerProfileId, input.adjustment);
  if (target === null) return { ok: false, error: "NOT_FOUND" };

  try {
    await prisma.$transaction(async (tx) => {
      await setInventoryQuantity(tx, {
        productId: input.adjustment.productId,
        quantity: target,
        actorUserId: input.actorUserId,
        note: input.adjustment.note ?? ADJUSTMENT_NOTE,
      });
    });
  } catch {
    return { ok: false, error: "ADJUST_FAILED" };
  }

  const product = await getSellerInventoryProductDetail(
    input.sellerProfileId,
    input.adjustment.productId,
  );
  if (!product) return { ok: false, error: "NOT_FOUND" };
  return { ok: true, product };
}

export async function batchAdjustSellerInventory(input: {
  sellerProfileId: string;
  actorUserId: string;
  items: InventoryAdjustInput[];
}): Promise<{
  ok: boolean;
  updated: InventoryStockRow[];
  failed: Array<{ productId: string; error: string }>;
}> {
  const updated: InventoryStockRow[] = [];
  const failed: Array<{ productId: string; error: string }> = [];

  for (const item of input.items) {
    const result = await adjustSellerInventory({
      sellerProfileId: input.sellerProfileId,
      actorUserId: input.actorUserId,
      adjustment: item,
    });
    if (result.ok) {
      updated.push(result.product);
    } else {
      failed.push({ productId: item.productId, error: result.error });
    }
  }

  return { ok: failed.length === 0, updated, failed };
}
