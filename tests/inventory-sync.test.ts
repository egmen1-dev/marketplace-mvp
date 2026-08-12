import { ProductStatus } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { setInventoryQuantity } from "@/features/orders/lib/inventory-sync";

type Calls = ReturnType<typeof buildTx>;

function buildTx(initialStatus: ProductStatus, existingQty: number | null) {
  const productUpdate = vi.fn(async () => ({}));
  const inventoryUpsert = vi.fn(async () => ({}));
  const historyCreate = vi.fn(async () => ({}));

  const tx = {
    productInventory: {
      findUnique: vi.fn(async () =>
        existingQty === null ? null : { quantity: existingQty },
      ),
      upsert: inventoryUpsert,
    },
    product: {
      update: productUpdate,
      findUnique: vi.fn(async () => ({ status: initialStatus })),
    },
    inventoryHistory: { create: historyCreate },
  };

  return { tx, productUpdate, inventoryUpsert, historyCreate };
}

describe("setInventoryQuantity", () => {
  it("clamps negative quantities to zero (no negative stock)", async () => {
    const { tx, productUpdate } = buildTx(ProductStatus.ACTIVE, 5);
    const res = await setInventoryQuantity(tx as never, {
      productId: "p1",
      quantity: -10,
    });
    expect(res.quantity).toBe(0);
    // First product.update mirrors stock = clamped quantity (0).
    expect(productUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { stock: 0 },
    });
  });

  it("floors fractional quantities", async () => {
    const { tx } = buildTx(ProductStatus.ACTIVE, 0);
    const res = await setInventoryQuantity(tx as never, {
      productId: "p1",
      quantity: 7.9,
    });
    expect(res.quantity).toBe(7);
  });

  it("auto-sets OUT_OF_STOCK when an ACTIVE product drops to 0", async () => {
    const { tx, productUpdate } = buildTx(ProductStatus.ACTIVE, 3);
    await setInventoryQuantity(tx as never, { productId: "p1", quantity: 0 });
    expect(productUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { status: ProductStatus.OUT_OF_STOCK },
    });
  });

  it("re-activates an OUT_OF_STOCK product when restocked", async () => {
    const { tx, productUpdate } = buildTx(ProductStatus.OUT_OF_STOCK, 0);
    await setInventoryQuantity(tx as never, { productId: "p1", quantity: 12 });
    expect(productUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { status: ProductStatus.ACTIVE },
    });
  });

  it("skips history when quantity is unchanged (delta 0)", async () => {
    const { tx, historyCreate } = buildTx(ProductStatus.ACTIVE, 5);
    await setInventoryQuantity(tx as never, { productId: "p1", quantity: 5 });
    expect(historyCreate).not.toHaveBeenCalled();
  });
});

void ({} as Calls);
