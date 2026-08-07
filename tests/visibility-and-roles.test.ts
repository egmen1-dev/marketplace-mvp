import { ProductStatus, UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  canViewProduct,
  resolveListStatusFilter,
} from "@/features/products/queries";
import { toStripeAmount } from "@/features/payments/lib/amounts";
import {
  detectImageMimeFromMagic,
  isProductPathOwnedBySeller,
  isAvatarPathOwnedByUser,
  validateImageFile,
} from "@/lib/storage/validate";
import { StorageError, PRODUCT_IMAGE_TOO_LARGE_MESSAGE } from "@/lib/storage/types";

describe("product visibility", () => {
  it("anonymous cannot see DRAFT products", () => {
    expect(canViewProduct(ProductStatus.DRAFT, "seller_1", null)).toBe(false);
    expect(
      canViewProduct(ProductStatus.DRAFT, "seller_1", undefined),
    ).toBe(false);
  });

  it("anonymous cannot see ARCHIVED products", () => {
    expect(
      canViewProduct(ProductStatus.ARCHIVED, "seller_1", null),
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

  it("buyer cannot escalate status filter via query", () => {
    const buyer = { role: UserRole.BUYER, sellerProfileId: null };
    expect(
      resolveListStatusFilter(ProductStatus.DRAFT, buyer, undefined),
    ).toBe(ProductStatus.ACTIVE);
  });

  it("owner seller may request ALL for own catalog", () => {
    const viewer = {
      role: UserRole.SELLER,
      sellerProfileId: "seller_1",
    };
    expect(resolveListStatusFilter("ALL", viewer, "seller_1")).toBe("ALL");
  });
});

describe("roles — BUYER blocked from seller ops", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("requireSellerSession rejects BUYER role (DB authoritative)", async () => {
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
        user: {
          findUnique: vi.fn(async () => ({
            id: "u1",
            email: "buyer@demo.lot",
            name: "Buyer",
            image: null,
            role: UserRole.BUYER,
            sellerProfile: null,
          })),
        },
        sellerProfile: {
          findUnique: vi.fn(),
        },
      },
    }));
    vi.doMock("@/lib/logger", () => ({
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));

    const { requireSellerSession, SellerRequiredError } = await import(
      "@/features/auth/session"
    );

    await expect(requireSellerSession()).rejects.toBeInstanceOf(
      SellerRequiredError,
    );
  });

  it("requireSellerSession uses DB role even if JWT says SELLER", async () => {
    vi.doMock("@/auth", () => ({
      auth: vi.fn(async () => ({
        user: {
          id: "u2",
          email: "ex@demo.lot",
          name: "Ex",
          role: UserRole.SELLER,
          sellerProfileId: "sp_old",
        },
      })),
    }));
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        user: {
          findUnique: vi.fn(async () => ({
            id: "u2",
            email: "ex@demo.lot",
            name: "Ex",
            image: null,
            role: UserRole.BUYER,
            sellerProfile: null,
          })),
        },
      },
    }));
    vi.doMock("@/lib/logger", () => ({
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));

    const { requireSellerSession, SellerRequiredError } = await import(
      "@/features/auth/session"
    );

    await expect(requireSellerSession()).rejects.toBeInstanceOf(
      SellerRequiredError,
    );
  });

  it("updateProduct rejects foreign sellerId", async () => {
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        product: {
          findUnique: vi.fn(async () => ({
            id: "prod_1",
            sellerId: "seller_owner",
            name: "X",
            stock: 1,
          })),
        },
      },
    }));

    const { updateProduct } = await import("@/features/products/queries");

    await expect(
      updateProduct("prod_1", "other_seller", { title: "Hacked" }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
  });

  it("createProduct requires sellerId (no demo fallback)", async () => {
    const { createProduct } = await import("@/features/products/queries");

    await expect(
      createProduct({
        title: "No seller",
        price: 100,
        status: ProductStatus.DRAFT,
        images: [],
        stock: 0,
        condition: "NEW",
      } as never),
    ).rejects.toMatchObject({
      code: "SELLER_REQUIRED",
    });
  });
});

describe("AUTH_SECRET production validation", () => {
  it("getEnv throws when AUTH_SECRET missing", async () => {
    vi.resetModules();
    const prev = process.env.AUTH_SECRET;
    const prevDb = process.env.DATABASE_URL;
    delete process.env.AUTH_SECRET;
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ??
      "postgresql://u:p@localhost:5432/db?schema=public";

    const { getEnv, __resetEnvCacheForTests } = await import("@/lib/env");
    __resetEnvCacheForTests();

    expect(() => getEnv()).toThrow(/AUTH_SECRET is required/);

    if (prev !== undefined) process.env.AUTH_SECRET = prev;
    else delete process.env.AUTH_SECRET;
    if (prevDb !== undefined) process.env.DATABASE_URL = prevDb;
    __resetEnvCacheForTests();
  });
});

describe("upload ownership + magic bytes", () => {
  it("detects JPEG / PNG magic bytes", () => {
    expect(
      detectImageMimeFromMagic(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])),
    ).toBe("image/jpeg");
    expect(
      detectImageMimeFromMagic(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe("image/png");
  });

  it("rejects non-image magic bytes", () => {
    expect(() =>
      validateImageFile({
        name: "x.jpg",
        type: "image/jpeg",
        size: 100,
        magicBytes: new Uint8Array([0x00, 0x01, 0x02, 0x03]),
      }),
    ).toThrow(StorageError);
  });

  it("allows PNG around 12MB and rejects over 20MB with friendly message", () => {
    const pngMagic = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    const twelveMb = 12 * 1024 * 1024;
    const overLimit = 20 * 1024 * 1024 + 1;

    expect(
      validateImageFile({
        name: "large.png",
        type: "image/png",
        size: twelveMb,
        magicBytes: pngMagic,
      }),
    ).toEqual({ contentType: "image/png", extension: ".png" });

    expect(() =>
      validateImageFile({
        name: "huge.png",
        type: "image/png",
        size: overLimit,
        magicBytes: pngMagic,
      }),
    ).toThrow(PRODUCT_IMAGE_TOO_LARGE_MESSAGE);

    try {
      validateImageFile({
        name: "huge.png",
        type: "image/png",
        size: overLimit,
        magicBytes: pngMagic,
      });
      throw new Error("expected TOO_LARGE");
    } catch (err) {
      expect(err).toBeInstanceOf(StorageError);
      expect((err as StorageError).code).toBe("TOO_LARGE");
      expect((err as StorageError).message).toBe(
        PRODUCT_IMAGE_TOO_LARGE_MESSAGE,
      );
    }
  });

  it("allows jpg/jpeg/png/webp extensions", () => {
    const jpegMagic = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const pngMagic = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    const webpMagic = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
    ]);

    expect(
      validateImageFile({
        name: "a.jpg",
        type: "image/jpeg",
        size: 1024,
        magicBytes: jpegMagic,
      }).extension,
    ).toBe(".jpg");
    expect(
      validateImageFile({
        name: "a.jpeg",
        type: "image/jpeg",
        size: 1024,
        magicBytes: jpegMagic,
      }).contentType,
    ).toBe("image/jpeg");
    expect(
      validateImageFile({
        name: "a.png",
        type: "image/png",
        size: 1024,
        magicBytes: pngMagic,
      }).contentType,
    ).toBe("image/png");
    expect(
      validateImageFile({
        name: "a.webp",
        type: "image/webp",
        size: 1024,
        magicBytes: webpMagic,
      }).contentType,
    ).toBe("image/webp");
  });

  it("seller path ownership is scoped to sellerId prefix", () => {
    expect(
      isProductPathOwnedBySeller("products/seller_a/uuid.jpg", "seller_a"),
    ).toBe(true);
    expect(
      isProductPathOwnedBySeller("products/seller_b/uuid.jpg", "seller_a"),
    ).toBe(false);
    expect(isAvatarPathOwnedByUser("avatars/user_1/a.png", "user_1")).toBe(
      true,
    );
    expect(isAvatarPathOwnedByUser("avatars/user_2/a.png", "user_1")).toBe(
      false,
    );
  });
});

describe("Stripe amount helpers", () => {
  it("converts major units to kopecks (integer)", () => {
    expect(toStripeAmount(4990)).toBe(499_000);
    expect(toStripeAmount(10.5)).toBe(1050);
    expect(Number.isInteger(toStripeAmount(99.99))).toBe(true);
  });
});

describe("e2e hydration allowlist", () => {
  it("does not allowlist React hydration #418", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const helpers = await fs.readFile(
      path.join(process.cwd(), "tests/e2e/helpers.ts"),
      "utf8",
    );
    expect(helpers).not.toMatch(/Minified React error #418/);
    expect(helpers).not.toMatch(/Hydration failed/);
  });
});
