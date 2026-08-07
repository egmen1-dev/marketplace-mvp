import { ProductStatus, SellerKind, UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getVisibleSellerMetrics,
  NEW_SELLER_DAYS,
  resolveSellerBadges,
} from "@/features/seller/lib/reputation";

describe("seller trust badges", () => {
  it("shows VERIFIED_SELLER only when isVerified", () => {
    const verified = resolveSellerBadges({
      isVerified: true,
      kind: SellerKind.INDIVIDUAL,
      joinedAt: new Date("2020-01-01"),
    });
    expect(verified).toContain("VERIFIED_SELLER");

    const notVerified = resolveSellerBadges({
      isVerified: false,
      kind: SellerKind.INDIVIDUAL,
      joinedAt: new Date("2020-01-01"),
    });
    expect(notVerified).not.toContain("VERIFIED_SELLER");
  });

  it("shows STORE badge for SHOP kind", () => {
    const badges = resolveSellerBadges({
      isVerified: false,
      kind: SellerKind.SHOP,
      joinedAt: new Date("2020-01-01"),
    });
    expect(badges).toContain("STORE");
  });

  it("shows NEW_SELLER for recent join date", () => {
    const recent = new Date();
    recent.setDate(recent.getDate() - Math.floor(NEW_SELLER_DAYS / 2));

    const badges = resolveSellerBadges({
      isVerified: false,
      kind: SellerKind.INDIVIDUAL,
      joinedAt: recent,
    });
    expect(badges).toContain("NEW_SELLER");
  });
});

describe("seller visible metrics", () => {
  it("hides zero-value metrics", () => {
    const visible = getVisibleSellerMetrics({
      totalProducts: 0,
      activeProducts: 0,
      completedOrdersCount: 0,
      salesCount: 0,
      joinedAt: new Date().toISOString(),
    });
    expect(visible).toEqual([]);
  });

  it("shows only non-zero metrics", () => {
    const visible = getVisibleSellerMetrics({
      totalProducts: 5,
      activeProducts: 3,
      completedOrdersCount: 2,
      salesCount: 7,
      joinedAt: new Date().toISOString(),
    });
    expect(visible.map((m) => m.key)).toEqual(["products", "orders", "sales"]);
    expect(visible[0]?.value).toBe(3);
    expect(visible[1]?.value).toBe(2);
    expect(visible[2]?.value).toBe(7);
  });
});

describe("seller reputation metrics (DB)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("counts completed DELIVERED orders and sales units", async () => {
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        product: {
          count: vi
            .fn()
            .mockResolvedValueOnce(4)
            .mockResolvedValueOnce(3),
        },
        orderItem: {
          findMany: vi.fn(async () => [
            { quantity: 2, orderId: "o1" },
            { quantity: 1, orderId: "o1" },
            { quantity: 3, orderId: "o2" },
          ]),
        },
        sellerProfile: {
          findUnique: vi.fn(async () => ({
            createdAt: new Date("2024-06-01"),
          })),
        },
      },
    }));

    const { getSellerReputationMetrics } = await import(
      "@/features/seller/lib/reputation"
    );
    const metrics = await getSellerReputationMetrics("sp1");

    expect(metrics.totalProducts).toBe(4);
    expect(metrics.activeProducts).toBe(3);
    expect(metrics.completedOrdersCount).toBe(2);
    expect(metrics.salesCount).toBe(6);
  });
});

describe("buyer cannot verify sellers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("requireAdminSession blocks SELLER role", async () => {
    vi.doMock("@/auth", () => ({
      auth: vi.fn(async () => ({
        user: {
          id: "s1",
          email: "seller@demo.lot",
          name: "Seller",
          role: UserRole.SELLER,
          sellerProfileId: "sp1",
        },
      })),
    }));
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        user: {
          findUnique: vi.fn(async () => ({
            id: "s1",
            email: "seller@demo.lot",
            name: "Seller",
            image: null,
            role: UserRole.SELLER,
            sellerProfile: { id: "sp1", storeName: "Demo" },
          })),
        },
      },
    }));
    vi.doMock("@/lib/logger", () => ({
      log: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
    }));

    const { requireAdminSession, AdminRequiredError } = await import(
      "@/features/auth/session"
    );
    await expect(requireAdminSession()).rejects.toBeInstanceOf(
      AdminRequiredError,
    );
  });
});

describe("public seller page data", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns trust profile and active products", async () => {
    vi.doMock("@/features/seller/lib/reputation", () => ({
      getSellerTrustProfile: vi.fn(async () => ({
        id: "sp1",
        storeName: "Demo Shop",
        slug: "demo-shop",
        description: "Test",
        logoUrl: null,
        kind: SellerKind.SHOP,
        isVerified: true,
        verifiedAt: null,
        joinedAt: new Date().toISOString(),
        shippingDefaults: null,
        metrics: {
          totalProducts: 1,
          activeProducts: 1,
          completedOrdersCount: 0,
          salesCount: 0,
          joinedAt: new Date().toISOString(),
        },
      })),
    }));
    vi.doMock("@/features/products/mappers", () => ({
      mapProductListItem: vi.fn((row: { id: string }) => ({
        id: row.id,
        title: "Item",
        slug: "item",
        description: null,
        price: 100,
        compareAt: null,
        currency: "RUB",
        stock: 1,
        city: null,
        condition: "NEW",
        status: ProductStatus.ACTIVE,
        views: 0,
        favoritesCount: 0,
        createdAt: new Date().toISOString(),
        category: null,
        primaryImage: null,
        seller: { id: "sp1", storeName: "Demo Shop", slug: "demo-shop" },
      })),
      toPriceNumber: vi.fn((v: number) => v),
    }));
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        product: {
          findMany: vi.fn(async () => [{ id: "p1" }]),
        },
      },
    }));

    const { getPublicSellerPageData } = await import(
      "@/features/seller/queries"
    );
    const data = await getPublicSellerPageData("demo-shop");
    expect(data?.trust.storeName).toBe("Demo Shop");
    expect(data?.products).toHaveLength(1);
  });
});
