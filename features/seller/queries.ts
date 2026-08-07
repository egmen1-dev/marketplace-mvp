import {
  OrderStatus,
  Prisma,
  ProductStatus,
  UserRole,
} from "@prisma/client";

import { ORDER_STATUS_LABELS } from "@/features/orders/lib/status";
import { toPriceNumber } from "@/features/products/mappers";
import { mapProductListItem } from "@/features/products/mappers";
import type { ProductListItem } from "@/features/products/types";
import {
  canTransitionOrderStatus,
} from "@/features/seller/lib/order-transitions";
import { isLowStock, LOW_STOCK_THRESHOLD } from "@/features/orders/lib/inventory-sync";
import { prisma } from "@/lib/prisma";

export type SellerDashboardStats = {
  totalProducts: number;
  activeProducts: number;
  salesCount: number;
  ordersCount: number;
  revenue: number;
  viewsSum: number;
  favoritesSum: number;
  lowStockCount: number;
};

export type SellerOrderListItem = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  currency: string;
  createdAt: string;
  buyerName: string | null;
  buyerEmail: string;
  itemCount: number;
  sellerSubtotal: number;
  sellerItemNames: string[];
};

export type SellerOrderFilters = {
  status?: OrderStatus | "ALL";
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
};

export type SellerPublicProfile = {
  id: string;
  storeName: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  rating: number;
  isVerified: boolean;
  productCount: number;
  joinedAt: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  shippingDefaults: string | null;
};

export type SellerSettings = {
  id: string;
  storeName: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  shippingDefaults: string | null;
  rating: number;
  kind: string;
};

export class SellerServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = "SellerServiceError";
  }
}

export async function getSellerDashboardStats(
  sellerProfileId: string,
): Promise<SellerDashboardStats> {
  const [productAggs, activeProducts, lowStockCount, orderItems] =
    await Promise.all([
      prisma.product.aggregate({
        where: { sellerId: sellerProfileId },
        _count: { _all: true },
        _sum: { views: true, favoritesCount: true },
      }),
      prisma.product.count({
        where: { sellerId: sellerProfileId, status: ProductStatus.ACTIVE },
      }),
      prisma.productInventory.count({
        where: {
          product: { sellerId: sellerProfileId },
          quantity: { gt: 0, lte: LOW_STOCK_THRESHOLD },
        },
      }),
      prisma.orderItem.findMany({
        where: {
          product: { sellerId: sellerProfileId },
          order: {
            status: {
              in: [
                OrderStatus.PAID,
                OrderStatus.PROCESSING,
                OrderStatus.SHIPPED,
                OrderStatus.DELIVERED,
              ],
            },
          },
        },
        select: {
          quantity: true,
          totalPrice: true,
          orderId: true,
        },
      }),
    ]);

  const orderIds = new Set(orderItems.map((i) => i.orderId));
  const salesCount = orderItems.reduce((sum, i) => sum + i.quantity, 0);
  const revenue = orderItems.reduce(
    (sum, i) => sum + toPriceNumber(i.totalPrice),
    0,
  );

  return {
    totalProducts: productAggs._count._all,
    activeProducts,
    salesCount,
    ordersCount: orderIds.size,
    revenue,
    viewsSum: productAggs._sum.views ?? 0,
    favoritesSum: productAggs._sum.favoritesCount ?? 0,
    lowStockCount,
  };
}

export async function listSellerOrders(
  sellerProfileId: string,
  filters: SellerOrderFilters = {},
): Promise<{
  items: SellerOrderListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 20, 100);
  const status = filters.status ?? "ALL";

  const orderWhere: Prisma.OrderWhereInput = {
    items: { some: { product: { sellerId: sellerProfileId } } },
  };

  if (status !== "ALL") {
    orderWhere.status = status;
  }

  if (filters.from || filters.to) {
    orderWhere.createdAt = {};
    if (filters.from) orderWhere.createdAt.gte = filters.from;
    if (filters.to) orderWhere.createdAt.lte = filters.to;
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where: orderWhere }),
    prisma.order.findMany({
      where: orderWhere,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { name: true, email: true } },
        items: {
          where: { product: { sellerId: sellerProfileId } },
          select: {
            quantity: true,
            totalPrice: true,
            productName: true,
          },
        },
      },
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    items: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      total: toPriceNumber(o.total),
      currency: o.currency,
      createdAt: o.createdAt.toISOString(),
      buyerName: o.user.name,
      buyerEmail: o.user.email,
      itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
      sellerSubtotal: o.items.reduce(
        (s, i) => s + toPriceNumber(i.totalPrice),
        0,
      ),
      sellerItemNames: o.items.map((i) => i.productName),
    })),
  };
}

export async function updateSellerOrderStatus(params: {
  orderId: string;
  toStatus: OrderStatus;
  actorUserId: string;
  actorRole: UserRole;
  sellerProfileId: string;
  note?: string | null;
}): Promise<{ status: OrderStatus }> {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: {
      items: {
        select: {
          product: { select: { sellerId: true } },
        },
      },
    },
  });

  if (!order) {
    throw new SellerServiceError("NOT_FOUND", "Заказ не найден", 404);
  }

  const sellerIds = new Set(
    order.items.map((i) => i.product.sellerId),
  );
  const ownsItems = sellerIds.has(params.sellerProfileId);
  const isAdmin = params.actorRole === UserRole.ADMIN;

  if (!ownsItems && !isAdmin) {
    throw new SellerServiceError(
      "FORBIDDEN",
      "Нет доступа к этому заказу",
      403,
    );
  }

  if (
    !canTransitionOrderStatus(order.status, params.toStatus, params.actorRole)
  ) {
    throw new SellerServiceError(
      "INVALID_TRANSITION",
      `Нельзя сменить статус ${order.status} → ${params.toStatus}`,
      400,
    );
  }

  const fromStatus = order.status;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: params.orderId },
      data: { status: params.toStatus },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId: params.orderId,
        fromStatus,
        toStatus: params.toStatus,
        changedByUserId: params.actorUserId,
        note: params.note ?? null,
      },
    });
  });

  return { status: params.toStatus };
}

export async function getSellerSettings(
  sellerProfileId: string,
): Promise<SellerSettings> {
  const profile = await prisma.sellerProfile.findUnique({
    where: { id: sellerProfileId },
  });
  if (!profile) {
    throw new SellerServiceError("NOT_FOUND", "Профиль не найден", 404);
  }
  return {
    id: profile.id,
    storeName: profile.storeName,
    slug: profile.slug,
    description: profile.description,
    logoUrl: profile.logoUrl,
    phone: profile.phone,
    email: profile.email,
    address: profile.address,
    shippingDefaults: profile.shippingDefaults,
    rating: toPriceNumber(profile.rating),
    kind: profile.kind,
  };
}

export async function updateSellerSettings(
  sellerProfileId: string,
  input: {
    storeName?: string;
    description?: string | null;
    logoUrl?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    shippingDefaults?: string | null;
  },
): Promise<SellerSettings> {
  const data: Prisma.SellerProfileUpdateInput = {};
  if (input.storeName !== undefined) data.storeName = input.storeName.trim();
  if (input.description !== undefined) data.description = input.description;
  if (input.logoUrl !== undefined) data.logoUrl = input.logoUrl;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.email !== undefined) data.email = input.email;
  if (input.address !== undefined) data.address = input.address;
  if (input.shippingDefaults !== undefined) {
    data.shippingDefaults = input.shippingDefaults;
  }

  const profile = await prisma.sellerProfile.update({
    where: { id: sellerProfileId },
    data,
  });

  return {
    id: profile.id,
    storeName: profile.storeName,
    slug: profile.slug,
    description: profile.description,
    logoUrl: profile.logoUrl,
    phone: profile.phone,
    email: profile.email,
    address: profile.address,
    shippingDefaults: profile.shippingDefaults,
    rating: toPriceNumber(profile.rating),
    kind: profile.kind,
  };
}

export async function getPublicSellerProfile(
  idOrSlug: string,
): Promise<{
  profile: SellerPublicProfile;
  products: ProductListItem[];
} | null> {
  const profile = await prisma.sellerProfile.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
  });
  if (!profile) return null;

  const [productCount, products] = await Promise.all([
    prisma.product.count({
      where: { sellerId: profile.id, status: ProductStatus.ACTIVE },
    }),
    prisma.product.findMany({
      where: { sellerId: profile.id, status: ProductStatus.ACTIVE },
      orderBy: [{ views: "desc" }, { createdAt: "desc" }],
      take: 24,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: {
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          take: 1,
        },
        seller: { select: { id: true, storeName: true, slug: true } },
      },
    }),
  ]);

  return {
    profile: {
      id: profile.id,
      storeName: profile.storeName,
      slug: profile.slug,
      description: profile.description,
      logoUrl: profile.logoUrl,
      rating: toPriceNumber(profile.rating),
      isVerified: profile.isVerified,
      productCount,
      joinedAt: profile.createdAt.toISOString(),
      phone: profile.phone,
      email: profile.email,
      address: profile.address,
      shippingDefaults: profile.shippingDefaults,
    },
    products: products.map(mapProductListItem),
  };
}


export type SellerActivityItem = {
  id: string;
  type: "product_created" | "price_changed" | "order_status";
  title: string;
  description: string | null;
  createdAt: string;
};

/** Presentation-only feed — real product/order events only, no fakes. */
export async function listSellerDashboardActivity(
  sellerProfileId: string,
  limit = 8,
): Promise<SellerActivityItem[]> {
  const [products, statusRows] = await Promise.all([
    prisma.product.findMany({
      where: { sellerId: sellerProfileId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, name: true, createdAt: true },
    }),
    prisma.orderStatusHistory.findMany({
      where: {
        order: {
          items: { some: { product: { sellerId: sellerProfileId } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        fromStatus: true,
        toStatus: true,
        createdAt: true,
        order: { select: { orderNumber: true } },
      },
    }),
  ]);

  const items: SellerActivityItem[] = [
    ...products.map((p) => ({
      id: `product-created-${p.id}`,
      type: "product_created" as const,
      title: "Создан товар",
      description: p.name,
      createdAt: p.createdAt.toISOString(),
    })),
    ...statusRows.map((row) => {
      const toLabel = ORDER_STATUS_LABELS[row.toStatus] ?? row.toStatus;
      const fromLabel = row.fromStatus
        ? (ORDER_STATUS_LABELS[row.fromStatus] ?? row.fromStatus)
        : null;
      return {
        id: `order-status-${row.id}`,
        type: "order_status" as const,
        title: `Статус заказа ${row.order.orderNumber}`,
        description: fromLabel ? `${fromLabel} → ${toLabel}` : toLabel,
        createdAt: row.createdAt.toISOString(),
      };
    }),
  ];

  return items
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, limit);
}

export { isLowStock, LOW_STOCK_THRESHOLD };
