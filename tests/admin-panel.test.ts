import { ProductStatus, UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("admin access — requireAdminSession", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("rejects BUYER even if JWT claims ADMIN", async () => {
    vi.doMock("@/auth", () => ({
      auth: vi.fn(async () => ({
        user: {
          id: "u1",
          email: "buyer@demo.lot",
          name: "Buyer",
          role: UserRole.ADMIN,
          sellerProfileId: null,
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
      },
    }));
    vi.doMock("@/lib/logger", () => ({
      log: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
    }));

    const { requireAdminSession, AdminRequiredError } =
      await import("@/features/auth/session");
    await expect(requireAdminSession()).rejects.toBeInstanceOf(
      AdminRequiredError,
    );
  });

  it("rejects SELLER", async () => {
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

    const { requireAdminSession, AdminRequiredError } =
      await import("@/features/auth/session");
    await expect(requireAdminSession()).rejects.toBeInstanceOf(
      AdminRequiredError,
    );
  });

  it("allows ADMIN from DB", async () => {
    vi.doMock("@/auth", () => ({
      auth: vi.fn(async () => ({
        user: {
          id: "a1",
          email: "admin@demo.lot",
          name: "Admin",
          role: UserRole.BUYER,
          sellerProfileId: null,
        },
      })),
    }));
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        user: {
          findUnique: vi.fn(async () => ({
            id: "a1",
            email: "admin@demo.lot",
            name: "Admin",
            image: null,
            role: UserRole.ADMIN,
            sellerProfile: null,
          })),
        },
      },
    }));
    vi.doMock("@/lib/logger", () => ({
      log: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
    }));

    const { requireAdminSession } = await import("@/features/auth/session");
    const admin = await requireAdminSession();
    expect(admin.role).toBe(UserRole.ADMIN);
    expect(admin.id).toBe("a1");
  });
});

describe("admin mutations — role change logs + product hide", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("updateUserRole writes AdminActionLog", async () => {
    const userUpdate = vi.fn(async () => ({}));
    const logCreate = vi.fn(async () => ({}));

    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        user: {
          findUnique: vi.fn(async () => ({
            id: "u2",
            role: UserRole.BUYER,
          })),
          update: userUpdate,
        },
        adminActionLog: { create: logCreate },
      },
    }));

    const { updateUserRole } = await import("@/features/admin/queries");
    await updateUserRole({
      adminId: "a1",
      userId: "u2",
      role: UserRole.SELLER,
    });

    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: "u2" },
      data: { role: UserRole.SELLER },
    });
    expect(logCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adminId: "a1",
          action: "USER_ROLE_CHANGE",
          entityType: "User",
          entityId: "u2",
        }),
      }),
    );
  });

  it("setAdminProductStatus ARCHIVED logs PRODUCT_HIDE", async () => {
    const productUpdate = vi.fn(async () => ({}));
    const logCreate = vi.fn(async () => ({}));

    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        product: {
          findUnique: vi.fn(async () => ({
            id: "p1",
            status: ProductStatus.ACTIVE,
          })),
          update: productUpdate,
        },
        adminActionLog: { create: logCreate },
      },
    }));

    const { setAdminProductStatus } = await import("@/features/admin/queries");
    await setAdminProductStatus({
      adminId: "a1",
      productId: "p1",
      status: ProductStatus.ARCHIVED,
    });

    expect(productUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { status: ProductStatus.ARCHIVED },
    });
    expect(logCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "PRODUCT_HIDE",
          entityType: "Product",
          entityId: "p1",
        }),
      }),
    );
  });

  it("deleteOrArchiveAdminProduct archives when order items exist", async () => {
    const productUpdate = vi.fn(async () => ({}));
    const productDelete = vi.fn(async () => ({}));
    const logCreate = vi.fn(async () => ({}));

    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        product: {
          findUnique: vi.fn(async () => ({
            id: "p1",
            _count: { orderItems: 2 },
          })),
          update: productUpdate,
          delete: productDelete,
        },
        adminActionLog: { create: logCreate },
      },
    }));

    const { deleteOrArchiveAdminProduct } =
      await import("@/features/admin/queries");
    const result = await deleteOrArchiveAdminProduct({
      adminId: "a1",
      productId: "p1",
    });

    expect(result).toBe("archived");
    expect(productDelete).not.toHaveBeenCalled();
    expect(productUpdate).toHaveBeenCalled();
  });
});

describe("admin actions — non-admin cannot mutate", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("changeUserRoleAction rejects non-admin", async () => {
    const { AdminRequiredError } = await import("@/features/auth/session");
    vi.doMock("@/features/auth", () => ({
      requireAdminSession: vi.fn(async () => {
        throw new AdminRequiredError();
      }),
      AdminRequiredError,
      AuthRequiredError: class AuthRequiredError extends Error {
        constructor() {
          super("Требуется вход");
          this.name = "AuthRequiredError";
        }
      },
    }));
    vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));
    vi.doMock("@/lib/prisma", () => ({
      prisma: { user: { findUnique: vi.fn(), update: vi.fn() } },
    }));
    vi.doMock("@/features/admin/queries", () => ({
      logAdminAction: vi.fn(),
    }));

    const { changeUserRoleAction } =
      await import("@/features/admin/actions");
    const result = await changeUserRoleAction("u2", UserRole.ADMIN);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/администратор/i);
  });

  it("setProductStatusAction rejects SELLER", async () => {
    const { AdminRequiredError } = await import("@/features/auth/session");
    vi.doMock("@/features/auth", () => ({
      requireAdminSession: vi.fn(async () => {
        throw new AdminRequiredError();
      }),
      AdminRequiredError,
      AuthRequiredError: class AuthRequiredError extends Error {
        constructor() {
          super("Требуется вход");
          this.name = "AuthRequiredError";
        }
      },
    }));
    vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));
    vi.doMock("@/lib/prisma", () => ({
      prisma: { product: { findUnique: vi.fn(), update: vi.fn() } },
    }));
    vi.doMock("@/features/admin/queries", () => ({
      logAdminAction: vi.fn(),
    }));

    const { setProductStatusAction } =
      await import("@/features/admin/actions");
    const result = await setProductStatusAction(
      "p1",
      ProductStatus.ARCHIVED,
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/администратор/i);
  });
});
