/**
 * Admin panel data access — marketplace owner MVP (not ERP).
 * All mutating callers must use requireAdminSession() first.
 */

import {
  OrderStatus,
  ProductStatus,
  UserRole,
  type Prisma,
} from "@prisma/client";

import { toPriceNumber } from "@/features/products/mappers";
import { prisma } from "@/lib/prisma";

export type AdminDashboardStats = {
  usersCount: number;
  sellersCount: number;
  productsCount: number;
  activeProductsCount: number;
  ordersCount: number;
  revenue: number;
};

export type AdminRecentUser = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  isBlocked: boolean;
  createdAt: Date;
};

export type AdminRecentOrder = {
  id: string;
  orderNumber: string;
  total: number;
  status: OrderStatus;
  createdAt: Date;
  buyerEmail: string;
  buyerName: string | null;
};

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  isBlocked: boolean;
  createdAt: Date;
  hasSellerProfile: boolean;
};

export type AdminSellerRow = {
  id: string;
  storeName: string;
  slug: string;
  isVerified: boolean;
  isBlocked: boolean;
  kind: string;
  productCount: number;
  createdAt: Date;
  ownerName: string | null;
  ownerEmail: string;
  ownerId: string;
};

export type AdminProductRow = {
  id: string;
  name: string;
  slug: string;
  price: number;
  status: ProductStatus;
  imageUrl: string | null;
  categoryName: string | null;
  storeName: string;
  sellerId: string;
  orderItemCount: number;
  createdAt: Date;
};

export type AdminOrderRow = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  currency: string;
  createdAt: Date;
  buyerEmail: string;
  buyerName: string | null;
  sellerNames: string[];
};

export type AdminOrderDetail = AdminOrderRow & {
  subtotal: number;
  shippingCost: number;
  notes: string | null;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    storeName: string;
  }>;
  paymentStatus: string | null;
};

export type AdminCategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  level: number;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  childrenCount: number;
};

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const [
    usersCount,
    sellersCount,
    productsCount,
    activeProductsCount,
    ordersCount,
    revenueAgg,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.sellerProfile.count(),
    prisma.product.count(),
    prisma.product.count({ where: { status: ProductStatus.ACTIVE } }),
    prisma.order.count(),
    prisma.order.aggregate({
      where: {
        status: {
          in: [
            OrderStatus.PAID,
            OrderStatus.PROCESSING,
            OrderStatus.SHIPPED,
            OrderStatus.DELIVERED,
          ],
        },
      },
      _sum: { total: true },
    }),
  ]);

  return {
    usersCount,
    sellersCount,
    productsCount,
    activeProductsCount,
    ordersCount,
    revenue: toPriceNumber(revenueAgg._sum.total),
  };
}

export async function listRecentUsers(limit = 8): Promise<AdminRecentUser[]> {
  const rows = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isBlocked: true,
      createdAt: true,
    },
  });
  return rows;
}

export async function listRecentOrders(limit = 8): Promise<AdminRecentOrder[]> {
  const rows = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      orderNumber: true,
      total: true,
      status: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    orderNumber: row.orderNumber,
    total: toPriceNumber(row.total),
    status: row.status,
    createdAt: row.createdAt,
    buyerEmail: row.user.email,
    buyerName: row.user.name,
  }));
}

export async function listAdminUsers(params?: {
  q?: string;
  role?: UserRole | "ALL";
}): Promise<AdminUserRow[]> {
  const where: Prisma.UserWhereInput = {};
  if (params?.role && params.role !== "ALL") {
    where.role = params.role;
  }
  if (params?.q?.trim()) {
    const q = params.q.trim();
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isBlocked: true,
      createdAt: true,
      sellerProfile: { select: { id: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isBlocked: row.isBlocked,
    createdAt: row.createdAt,
    hasSellerProfile: Boolean(row.sellerProfile),
  }));
}

export async function listAdminSellers(): Promise<AdminSellerRow[]> {
  const rows = await prisma.sellerProfile.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      storeName: true,
      slug: true,
      isVerified: true,
      isBlocked: true,
      kind: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { products: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    storeName: row.storeName,
    slug: row.slug,
    isVerified: row.isVerified,
    isBlocked: row.isBlocked,
    kind: row.kind,
    productCount: row._count.products,
    createdAt: row.createdAt,
    ownerName: row.user.name,
    ownerEmail: row.user.email,
    ownerId: row.user.id,
  }));
}

export async function listAdminProducts(params?: {
  status?: ProductStatus | "ALL";
  q?: string;
}): Promise<AdminProductRow[]> {
  const where: Prisma.ProductWhereInput = {};
  if (params?.status && params.status !== "ALL") {
    where.status = params.status;
  }
  if (params?.q?.trim()) {
    where.name = { contains: params.q.trim(), mode: "insensitive" };
  }

  const rows = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      status: true,
      createdAt: true,
      sellerId: true,
      category: { select: { name: true } },
      seller: { select: { storeName: true } },
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        take: 1,
        select: { url: true },
      },
      _count: { select: { orderItems: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    price: toPriceNumber(row.price),
    status: row.status,
    imageUrl: row.images[0]?.url ?? null,
    categoryName: row.category?.name ?? null,
    storeName: row.seller.storeName,
    sellerId: row.sellerId,
    orderItemCount: row._count.orderItems,
    createdAt: row.createdAt,
  }));
}

export async function listAdminOrders(params?: {
  status?: OrderStatus | "ALL";
}): Promise<AdminOrderRow[]> {
  const where: Prisma.OrderWhereInput = {};
  if (params?.status && params.status !== "ALL") {
    where.status = params.status;
  }

  const rows = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      currency: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
      items: {
        select: {
          product: {
            select: { seller: { select: { storeName: true } } },
          },
        },
      },
    },
  });

  return rows.map((row) => {
    const sellerNames = [
      ...new Set(
        row.items
          .map((item) => item.product.seller.storeName)
          .filter(Boolean),
      ),
    ];
    return {
      id: row.id,
      orderNumber: row.orderNumber,
      status: row.status,
      total: toPriceNumber(row.total),
      currency: row.currency,
      createdAt: row.createdAt,
      buyerEmail: row.user.email,
      buyerName: row.user.name,
      sellerNames,
    };
  });
}

export async function getAdminOrderDetail(
  orderId: string,
): Promise<AdminOrderDetail | null> {
  const row = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      subtotal: true,
      shippingCost: true,
      total: true,
      currency: true,
      notes: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
      payment: { select: { status: true } },
      items: {
        select: {
          id: true,
          productId: true,
          productName: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          product: {
            select: { seller: { select: { storeName: true } } },
          },
        },
      },
    },
  });
  if (!row) return null;

  const sellerNames = [
    ...new Set(row.items.map((item) => item.product.seller.storeName)),
  ];

  return {
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    total: toPriceNumber(row.total),
    currency: row.currency,
    createdAt: row.createdAt,
    buyerEmail: row.user.email,
    buyerName: row.user.name,
    sellerNames,
    subtotal: toPriceNumber(row.subtotal),
    shippingCost: toPriceNumber(row.shippingCost),
    notes: row.notes,
    paymentStatus: row.payment?.status ?? null,
    items: row.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: toPriceNumber(item.unitPrice),
      totalPrice: toPriceNumber(item.totalPrice),
      storeName: item.product.seller.storeName,
    })),
  };
}

export async function listAdminCategories(): Promise<AdminCategoryRow[]> {
  const rows = await prisma.category.findMany({
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      parentId: true,
      level: true,
      sortOrder: true,
      isActive: true,
      _count: { select: { products: true, children: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    parentId: row.parentId,
    level: row.level,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    productCount: row._count.products,
    childrenCount: row._count.children,
  }));
}

export async function logAdminAction(params: {
  adminId: string;
  action: string;
  entityType: string;
  entityId: string;
  meta?: Record<string, unknown> | null;
}): Promise<void> {
  await prisma.adminActionLog.create({
    data: {
      adminId: params.adminId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      meta: params.meta ? JSON.stringify(params.meta) : null,
    },
  });
}

export class AdminServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = "AdminServiceError";
  }
}

export async function updateUserRole(params: {
  adminId: string;
  userId: string;
  role: UserRole;
}): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, role: true },
  });
  if (!user) {
    throw new AdminServiceError("NOT_FOUND", "Пользователь не найден", 404);
  }
  if (user.id === params.adminId && params.role !== UserRole.ADMIN) {
    throw new AdminServiceError(
      "FORBIDDEN",
      "Нельзя снять роль ADMIN с собственного аккаунта",
      403,
    );
  }

  const fromRole = user.role;
  await prisma.user.update({
    where: { id: params.userId },
    data: { role: params.role },
  });

  await logAdminAction({
    adminId: params.adminId,
    action: "USER_ROLE_CHANGE",
    entityType: "User",
    entityId: params.userId,
    meta: { fromRole, toRole: params.role },
  });
}

export async function setUserBlocked(params: {
  adminId: string;
  userId: string;
  isBlocked: boolean;
}): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, role: true },
  });
  if (!user) {
    throw new AdminServiceError("NOT_FOUND", "Пользователь не найден", 404);
  }
  if (user.id === params.adminId && params.isBlocked) {
    throw new AdminServiceError(
      "FORBIDDEN",
      "Нельзя заблокировать собственный аккаунт",
      403,
    );
  }

  await prisma.user.update({
    where: { id: params.userId },
    data: { isBlocked: params.isBlocked },
  });

  await logAdminAction({
    adminId: params.adminId,
    action: params.isBlocked ? "USER_BLOCK" : "USER_UNBLOCK",
    entityType: "User",
    entityId: params.userId,
  });
}

export async function setSellerBlocked(params: {
  adminId: string;
  sellerId: string;
  isBlocked: boolean;
}): Promise<void> {
  const seller = await prisma.sellerProfile.findUnique({
    where: { id: params.sellerId },
    select: { id: true },
  });
  if (!seller) {
    throw new AdminServiceError("NOT_FOUND", "Продавец не найден", 404);
  }

  await prisma.sellerProfile.update({
    where: { id: params.sellerId },
    data: { isBlocked: params.isBlocked },
  });

  await logAdminAction({
    adminId: params.adminId,
    action: params.isBlocked ? "SELLER_BLOCK" : "SELLER_UNBLOCK",
    entityType: "SellerProfile",
    entityId: params.sellerId,
  });
}

export async function setSellerVerified(params: {
  adminId: string;
  sellerId: string;
  isVerified: boolean;
}): Promise<void> {
  const seller = await prisma.sellerProfile.findUnique({
    where: { id: params.sellerId },
    select: { id: true },
  });
  if (!seller) {
    throw new AdminServiceError("NOT_FOUND", "Продавец не найден", 404);
  }

  await prisma.sellerProfile.update({
    where: { id: params.sellerId },
    data: { isVerified: params.isVerified },
  });

  await logAdminAction({
    adminId: params.adminId,
    action: params.isVerified ? "SELLER_VERIFY" : "SELLER_UNVERIFY",
    entityType: "SellerProfile",
    entityId: params.sellerId,
  });
}

export async function setAdminProductStatus(params: {
  adminId: string;
  productId: string;
  status: ProductStatus;
}): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: params.productId },
    select: { id: true, status: true },
  });
  if (!product) {
    throw new AdminServiceError("NOT_FOUND", "Товар не найден", 404);
  }

  await prisma.product.update({
    where: { id: params.productId },
    data: { status: params.status },
  });

  const action =
    params.status === ProductStatus.ARCHIVED
      ? "PRODUCT_HIDE"
      : params.status === ProductStatus.ACTIVE
        ? "PRODUCT_ACTIVATE"
        : "PRODUCT_STATUS_CHANGE";

  await logAdminAction({
    adminId: params.adminId,
    action,
    entityType: "Product",
    entityId: params.productId,
    meta: { fromStatus: product.status, toStatus: params.status },
  });
}

/**
 * Hard-delete when no OrderItem FK; otherwise archive (preserve order history).
 */
export async function deleteOrArchiveAdminProduct(params: {
  adminId: string;
  productId: string;
}): Promise<"deleted" | "archived"> {
  const product = await prisma.product.findUnique({
    where: { id: params.productId },
    select: {
      id: true,
      _count: { select: { orderItems: true } },
    },
  });
  if (!product) {
    throw new AdminServiceError("NOT_FOUND", "Товар не найден", 404);
  }

  if (product._count.orderItems > 0) {
    await prisma.product.update({
      where: { id: params.productId },
      data: { status: ProductStatus.ARCHIVED },
    });
    await logAdminAction({
      adminId: params.adminId,
      action: "PRODUCT_DELETE_ARCHIVED",
      entityType: "Product",
      entityId: params.productId,
      meta: { reason: "has_order_items" },
    });
    return "archived";
  }

  await prisma.product.delete({ where: { id: params.productId } });
  await logAdminAction({
    adminId: params.adminId,
    action: "PRODUCT_DELETE",
    entityType: "Product",
    entityId: params.productId,
  });
  return "deleted";
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[ё]/g, "e")
    .replace(/[^a-z0-9а-я]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "category";
}

async function uniqueCategorySlug(base: string, excludeId?: string) {
  const slug = slugify(base);
  let n = 0;
  while (true) {
    const candidate = n === 0 ? slug : `${slug}-${n}`;
    const existing = await prisma.category.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
    n += 1;
  }
}

export async function createAdminCategory(params: {
  adminId: string;
  name: string;
  slug?: string;
  description?: string | null;
  parentId?: string | null;
  sortOrder?: number;
}): Promise<string> {
  const name = params.name.trim();
  if (name.length < 2) {
    throw new AdminServiceError("VALIDATION", "Название слишком короткое");
  }

  let level = 1;
  if (params.parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: params.parentId },
      select: { id: true, level: true },
    });
    if (!parent) {
      throw new AdminServiceError("NOT_FOUND", "Родительская категория не найдена", 404);
    }
    level = parent.level + 1;
  }

  const slug = await uniqueCategorySlug(params.slug?.trim() || name);
  const created = await prisma.category.create({
    data: {
      name,
      slug,
      description: params.description?.trim() || null,
      parentId: params.parentId || null,
      level,
      sortOrder: params.sortOrder ?? 0,
      isActive: true,
    },
  });

  await logAdminAction({
    adminId: params.adminId,
    action: "CATEGORY_CREATE",
    entityType: "Category",
    entityId: created.id,
    meta: { name, parentId: params.parentId ?? null },
  });

  return created.id;
}

export async function updateAdminCategory(params: {
  adminId: string;
  categoryId: string;
  name?: string;
  slug?: string;
  description?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<void> {
  const existing = await prisma.category.findUnique({
    where: { id: params.categoryId },
    select: { id: true, parentId: true, level: true, name: true },
  });
  if (!existing) {
    throw new AdminServiceError("NOT_FOUND", "Категория не найдена", 404);
  }

  const data: Prisma.CategoryUpdateInput = {};
  if (params.name !== undefined) data.name = params.name.trim();
  if (params.description !== undefined) {
    data.description = params.description?.trim() || null;
  }
  if (params.sortOrder !== undefined) data.sortOrder = params.sortOrder;
  if (params.isActive !== undefined) data.isActive = params.isActive;

  if (params.slug !== undefined && params.slug.trim()) {
    data.slug = await uniqueCategorySlug(params.slug, params.categoryId);
  }

  if (params.parentId !== undefined) {
    if (params.parentId === params.categoryId) {
      throw new AdminServiceError("VALIDATION", "Категория не может быть родителем самой себе");
    }
    if (params.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: params.parentId },
        select: { id: true, level: true },
      });
      if (!parent) {
        throw new AdminServiceError("NOT_FOUND", "Родительская категория не найдена", 404);
      }
      data.parent = { connect: { id: parent.id } };
      data.level = parent.level + 1;
    } else {
      data.parent = { disconnect: true };
      data.level = 1;
    }
  }

  await prisma.category.update({
    where: { id: params.categoryId },
    data,
  });

  await logAdminAction({
    adminId: params.adminId,
    action:
      params.isActive === false
        ? "CATEGORY_HIDE"
        : params.isActive === true
          ? "CATEGORY_SHOW"
          : "CATEGORY_UPDATE",
    entityType: "Category",
    entityId: params.categoryId,
    meta: {
      name: params.name ?? existing.name,
      isActive: params.isActive,
    },
  });
}
