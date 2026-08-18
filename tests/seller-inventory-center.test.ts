import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/seller-inventory-center/flags", () => ({
  isSellerInventoryCenterEnabled: () => true,
}));

const productFindMany = vi.fn(async () => [
  {
    id: "p1",
    name: "Product A",
    sku: "SKU-1",
    status: "ACTIVE",
    stock: 3,
    updatedAt: new Date("2026-08-01T00:00:00Z"),
    images: [{ url: "https://example.com/a.jpg" }],
    inventory: { quantity: 3, reservedQuantity: 0, updatedAt: new Date("2026-08-01T00:00:00Z") },
  },
]);

const historyFindMany = vi.fn(async () => [
  {
    id: "h1",
    productId: "p1",
    delta: -1,
    quantityAfter: 3,
    note: "Корректировка остатка продавцом",
    createdAt: new Date("2026-08-01T12:00:00Z"),
    actorUserId: "u1",
    product: { name: "Product A" },
  },
]);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      count: vi.fn(async () => 1),
      findMany: productFindMany,
      findFirst: vi.fn(async () => null),
    },
    productInventory: {
      aggregate: vi.fn(async () => ({ _sum: { quantity: 3 } })),
      count: vi.fn(async (args: { where?: { quantity?: { gt?: number; lte?: number } } }) => {
        if (args.where?.quantity?.lte === 5 && args.where?.quantity?.gt === 0) return 1;
        if (args.where?.quantity?.gt === 5) return 0;
        return 0;
      }),
    },
    inventoryHistory: {
      count: vi.fn(async () => 1),
      findMany: historyFindMany,
    },
  },
}));

describe("seller inventory center", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hides unsupported sections", async () => {
    const { getInventoryCenterSections } = await import("@/lib/seller-inventory-center/sections");
    const payload = await getInventoryCenterSections("seller1");
    const ids = payload.sections.map((s) => s.id);
    expect(ids).not.toContain("incoming");
    expect(ids).not.toContain("reserved");
    expect(ids).not.toContain("warehouses");
    expect(ids).not.toContain("thresholds");
    expect(ids).not.toContain("movements");
  });

  it("maps stock rows with real availability labels", async () => {
    const { listSellerInventoryStock } = await import("@/lib/seller-inventory-center/stock");
    const page = await listSellerInventoryStock({ sellerProfileId: "seller1", filter: "all" });
    expect(page.items[0]?.availability).toBe("LOW");
    expect(page.items[0]?.quantity).toBe(3);
  });

  it("reads inventory history from database", async () => {
    const { listInventoryHistory } = await import("@/lib/seller-inventory-center/history");
    const page = await listInventoryHistory({ sellerProfileId: "seller1" });
    expect(page.items[0]?.delta).toBe(-1);
    expect(page.items[0]?.productName).toBe("Product A");
  });
});
