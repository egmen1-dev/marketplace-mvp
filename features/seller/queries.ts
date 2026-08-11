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
  getSellerTrustProfile,
  type SellerTrustProfile,
} from "@/features/seller/lib/reputation";
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
  fulfillmentType: "DELIVERY" | "SELLER_PICKUP";
  isOverdue: boolean;
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
  /** Named filter buckets from OMS dashboard */
  bucket?: string;
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
                OrderStatus.AWAITING_SELLER_CONFIRMATION,
                OrderStatus.CONFIRMED,
                OrderStatus.PROCESSING,
                OrderStatus.READY_FOR_SHIPMENT,
                OrderStatus.SHIPPED,
                OrderStatus.IN_TRANSIT,
                OrderStatus.ARRIVED,
                OrderStatus.READY_FOR_PICKUP,
                OrderStatus.PICKED_UP,
                OrderStatus.DELIVERED,
                OrderStatus.COMPLETED,
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

  const { SELLER_ORDER_FILTER_BUCKETS } = await import(
    "@/features/orders/lib/status"
  );

  const orderWhere: Prisma.OrderWhereInput = {
    items: { some: { product: { sellerId: sellerProfileId } } },
  };

  if (filters.bucket && filters.bucket in SELLER_ORDER_FILTER_BUCKETS) {
    const key = filters.bucket as keyof typeof SELLER_ORDER_FILTER_BUCKETS;
    orderWhere.status = {
      in: [...SELLER_ORDER_FILTER_BUCKETS[key]],
    };
  } else if (status !== "ALL") {
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
      fulfillmentType: o.fulfillmentType,
      isOverdue: o.isOverdue,
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

export async function getSellerOrderCounters(sellerProfileId: string): Promise<{
  newCount: number;
  inProgress: number;
  awaitingShipment: number;
  readyForPickup: number;
  overdue: number;
}> {
  const base: Prisma.OrderWhereInput = {
    items: { some: { product: { sellerId: sellerProfileId } } },
  };
  const [newCount, inProgress, awaitingShipment, readyForPickup, overdue] =
    await Promise.all([
      prisma.order.count({
        where: {
          ...base,
          status: {
            in: [
              OrderStatus.NEW,
              OrderStatus.AWAITING_SELLER_CONFIRMATION,
              OrderStatus.PAID,
            ],
          },
        },
      }),
      prisma.order.count({
        where: {
          ...base,
          status: { in: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING] },
        },
      }),
      prisma.order.count({
        where: {
          ...base,
          status: OrderStatus.READY_FOR_SHIPMENT,
        },
      }),
      prisma.order.count({
        where: {
          ...base,
          status: OrderStatus.READY_FOR_PICKUP,
        },
      }),
      prisma.order.count({
        where: { ...base, isOverdue: true },
      }),
    ]);
  return { newCount, inProgress, awaitingShipment, readyForPickup, overdue };
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

  const { transitionOrderWithEffects, OrderLifecycleError, userRoleToActorRole } =
    await import("@/features/order-lifecycle");

  try {
    const result = await transitionOrderWithEffects({
      orderId: params.orderId,
      toStatus: params.toStatus,
      actorUserId: params.actorUserId,
      actorRole: userRoleToActorRole(params.actorRole),
      reason: params.note ?? null,
    });

    // Keep pickup reservations in sync for seller-pickup orders.
    if (order.fulfillmentType === "SELLER_PICKUP") {
      const { syncReservationsWithOrderStatus } = await import(
        "@/features/order-lifecycle/lib/pickup-sync"
      );
      await syncReservationsWithOrderStatus({
        orderId: params.orderId,
        orderStatus: result.status,
        sellerId: params.sellerProfileId,
      });
    }

    return { status: result.status };
  } catch (err) {
    if (err instanceof OrderLifecycleError) {
      throw new SellerServiceError(err.code, err.message, err.status);
    }
    throw err;
  }
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

export type PublicSellerPageData = {
  trust: SellerTrustProfile;
  products: ProductListItem[];
};

export async function getPublicSellerPageData(
  idOrSlug: string,
): Promise<PublicSellerPageData | null> {
  const trust = await getSellerTrustProfile(idOrSlug);
  if (!trust) return null;

  const products = await prisma.product.findMany({
    where: { sellerId: trust.id, status: ProductStatus.ACTIVE },
    orderBy: [{ views: "desc" }, { createdAt: "desc" }],
    take: 48,
    include: {
      category: { select: { id: true, name: true, slug: true } },
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        take: 1,
      },
      seller: { select: { id: true, storeName: true, slug: true } },
    },
  });

  return {
    trust,
    products: products.map(mapProductListItem),
  };
}

/** @deprecated Prefer getPublicSellerPageData — kept for metadata helpers. */
export async function getPublicSellerProfile(
  idOrSlug: string,
): Promise<{
  profile: SellerPublicProfile;
  products: ProductListItem[];
} | null> {
  const data = await getPublicSellerPageData(idOrSlug);
  if (!data) return null;

  const { trust, products } = data;
  return {
    profile: {
      id: trust.id,
      storeName: trust.storeName,
      slug: trust.slug,
      description: trust.description,
      logoUrl: trust.logoUrl,
      rating: 0,
      isVerified: trust.isVerified,
      productCount: trust.metrics.activeProducts,
      joinedAt: trust.joinedAt,
      phone: null,
      email: null,
      address: null,
      shippingDefaults: null,
    },
    products,
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
