import { ProductStatus, UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  canViewProduct,
  resolveListStatusFilter,
} from "@/features/products/queries";
import { toStripeAmount } from "@/features/payments/lib/amounts";

describe("C2 product visibility", () => {
  it("anonymous cannot see DRAFT products", () => {
    expect(
      canViewProduct(ProductStatus.DRAFT, "seller_1", null),
    ).toBe(false);
    expect(
      canViewProduct(ProductStatus.DRAFT, "seller_1", undefined),
    ).toBe(false);
  });

  it("anonymous can see ACTIVE products", () => {
    expect(canViewProduct(ProductStatus.ACTIVE, "seller_1", null)).toBe(true);
  });

  it("seller can see own DRAFT / ARCHIVED", () => {
    const viewer = {
      role: UserRole.SELLER,
      sellerProfileId: "seller_1",
    };
    expect(canViewProduct(ProductStatus.DRAFT, "seller_1", viewer)).toBe(true);
    expect(canViewProduct(ProductStatus.ARCHIVED, "seller_1", viewer)).toBe(
      true,
    );
    expect(canViewProduct(ProductStatus.DRAFT, "other_seller", viewer)).toBe(
      false,
    );
  });

  it("admin can see any status", () => {
    const viewer = { role: UserRole.ADMIN, sellerProfileId: null };
    expect(canViewProduct(ProductStatus.DRAFT, "seller_1", viewer)).toBe(true);
  });

  it("public list forces ACTIVE even if DRAFT requested", () => {
    expect(
      resolveListStatusFilter(ProductStatus.DRAFT, null, undefined),
    ).toBe(ProductStatus.ACTIVE);
    expect(resolveListStatusFilter("ALL", null, undefined)).toBe(
      ProductStatus.ACTIVE,
    );
  });

  it("owner seller may request ALL for own catalog", () => {
    const viewer = {
      role: UserRole.SELLER,
      sellerProfileId: "seller_1",
    };
    expect(resolveListStatusFilter("ALL", viewer, "seller_1")).toBe("ALL");
  });
});

describe("C3 BUYER cannot create product (seller session)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("requireSellerSession rejects BUYER role", async () => {
    vi.doMock("@/auth", () => ({
      auth: vi.fn(async () => ({
        user: {
          id: "u1",
          email: "buyer@demo.lot",
          name: "Buyer",
          role: UserRole.BUYER,
          sellerProfileId: "stale_profile",
        },
      })),
    }));
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        sellerProfile: {
          findUnique: vi.fn(),
        },
      },
    }));

    const { requireSellerSession, SellerRequiredError } = await import(
      "@/features/auth/session"
    );

    await expect(requireSellerSession()).rejects.toBeInstanceOf(
      SellerRequiredError,
    );
  });
});

describe("M3 Stripe amount helpers", () => {
  it("converts major units to kopecks", () => {
    expect(toStripeAmount(4990)).toBe(499_000);
    expect(toStripeAmount(10.5)).toBe(1050);
  });
});
