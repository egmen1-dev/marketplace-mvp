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
import {
  buildCategoryAdsReport,
  buildProductAdSnapshot,
  type AdEligibilityReason,
  type CategoryAdsReportRow,
} from "@/lib/product-advertising";
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
  isOverdue?: boolean;
  overdueAt?: Date | null;
  overdueReason?: string | null;
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
  path: string | null;
  externalSource: string | null;
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

export type AnalyticsFunnelCounts = {
  windowDays: number;
  since: Date;
  counts: Record<string, number>;
  webviewCounts: Record<string, number>;
  totalEvents: number;
};

export async function getAnalyticsFunnelCounts(
  windowDays = 7,
): Promise<AnalyticsFunnelCounts> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const grouped = await prisma.analyticsEvent.groupBy({
    by: ["event", "webview"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
  });

  const counts: Record<string, number> = {};
  const webviewCounts: Record<string, number> = {};
  let totalEvents = 0;

  for (const row of grouped) {
    const n = row._count._all;
    totalEvents += n;
    counts[row.event] = (counts[row.event] ?? 0) + n;
    if (row.webview) {
      webviewCounts[row.event] = (webviewCounts[row.event] ?? 0) + n;
    }
  }

  return { windowDays, since, counts, webviewCounts, totalEvents };
}

export type ProductAnalyticsRow = {
  productId: string;
  title: string;
  views: number;
  addToCart: number;
  viewToCartRate: number | null;
  checkoutStarts: number;
  checkoutRate: number | null;
};

export type UtmSourceRow = {
  source: string;
  events: number;
  visitors: number;
};

export type AnalyticsMeasurementDashboard = {
  windowDays: number;
  since: Date;
  overview: {
    visitors: number;
    productsViewed: number;
    cartAdditions: number;
    checkoutStarts: number;
    purchases: number;
  };
  counts: Record<string, number>;
  uniqueByEvent: Record<string, number>;
  funnelSteps: ReturnType<
    typeof import("@/lib/analytics/funnel-metrics").buildFunnelStepMetrics
  >;
  productRows: ProductAnalyticsRow[];
  popularByViews: ProductAnalyticsRow[];
  utmSources: UtmSourceRow[];
  engagement: {
    ctaClicks: number;
    trustBlockViews: number;
  };
};

function aggregateUniques(
  rows: Array<{ event: string; visitorId: string | null }>,
): Record<string, number> {
  const sets: Record<string, Set<string>> = {};
  for (const row of rows) {
    if (!row.visitorId) continue;
    if (!sets[row.event]) sets[row.event] = new Set();
    sets[row.event]!.add(row.visitorId);
  }
  const out: Record<string, number> = {};
  for (const [event, set] of Object.entries(sets)) {
    out[event] = set.size;
  }
  return out;
}

export async function getAnalyticsMeasurementDashboard(
  windowDays = 7,
): Promise<AnalyticsMeasurementDashboard> {
  const { buildFunnelStepMetrics } = await import("@/lib/analytics/funnel-metrics");
  const { MEASUREMENT_FUNNEL } = await import("@/lib/analytics/events");

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [grouped, visitorRows, productViewGroups, productCartGroups, utmGrouped] =
    await Promise.all([
      prisma.analyticsEvent.groupBy({
        by: ["event", "webview"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
      prisma.analyticsEvent.findMany({
        where: { createdAt: { gte: since }, visitorId: { not: null } },
        select: { event: true, visitorId: true },
      }),
      prisma.analyticsEvent.groupBy({
        by: ["entityId"],
        where: {
          event: "product_view",
          createdAt: { gte: since },
          entityId: { not: null },
        },
        _count: { _all: true },
        orderBy: { _count: { entityId: "desc" } },
        take: 15,
      }),
      prisma.analyticsEvent.groupBy({
        by: ["entityId"],
        where: {
          event: "add_to_cart",
          createdAt: { gte: since },
          entityId: { not: null },
        },
        _count: { _all: true },
      }),
      prisma.analyticsEvent.groupBy({
        by: ["utmSource"],
        where: {
          createdAt: { gte: since },
          utmSource: { not: null },
        },
        _count: { _all: true },
      }),
    ]);

  const counts: Record<string, number> = {};
  for (const row of grouped) {
    const n = row._count._all;
    counts[row.event] = (counts[row.event] ?? 0) + n;
  }

  const uniqueByEvent = aggregateUniques(visitorRows);
  const allVisitors = new Set(
    visitorRows.map((r) => r.visitorId).filter(Boolean) as string[],
  );

  const cartByProduct = new Map(
    productCartGroups
      .filter((g) => g.entityId)
      .map((g) => [g.entityId!, g._count._all]),
  );

  const productIds = [
    ...new Set(
      productViewGroups
        .map((g) => g.entityId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const products =
    productIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true },
        })
      : [];
  const titleById = new Map(products.map((p) => [p.id, p.name]));

  const productRows: ProductAnalyticsRow[] = productViewGroups
    .filter((g) => g.entityId)
    .map((g) => {
      const productId = g.entityId!;
      const views = g._count._all;
      const addToCart = cartByProduct.get(productId) ?? 0;
      const viewToCartRate =
        views > 0 ? Math.round((addToCart / views) * 1000) / 10 : null;
      return {
        productId,
        title: titleById.get(productId) ?? productId.slice(0, 8),
        views,
        addToCart,
        viewToCartRate,
        checkoutStarts: 0,
        checkoutRate: null,
      };
    });

  const utmVisitorSets = new Map<string, Set<string>>();
  const utmRows = await prisma.analyticsEvent.findMany({
    where: { createdAt: { gte: since }, utmSource: { not: null }, visitorId: { not: null } },
    select: { utmSource: true, visitorId: true },
  });
  for (const row of utmRows) {
    if (!row.utmSource || !row.visitorId) continue;
    if (!utmVisitorSets.has(row.utmSource)) {
      utmVisitorSets.set(row.utmSource, new Set());
    }
    utmVisitorSets.get(row.utmSource)!.add(row.visitorId);
  }

  const utmSources: UtmSourceRow[] = utmGrouped
    .filter((g) => g.utmSource)
    .map((g) => ({
      source: g.utmSource!,
      events: g._count._all,
      visitors: utmVisitorSets.get(g.utmSource!)?.size ?? 0,
    }))
    .sort((a, b) => b.events - a.events);

  const funnelSteps = buildFunnelStepMetrics(
    MEASUREMENT_FUNNEL,
    counts,
    uniqueByEvent,
  );

  const productsViewedUnique = uniqueByEvent.product_view ?? 0;

  return {
    windowDays,
    since,
    overview: {
      visitors: allVisitors.size,
      productsViewed: productsViewedUnique,
      cartAdditions: counts.add_to_cart ?? 0,
      checkoutStarts: counts.checkout_start ?? 0,
      purchases: counts.purchase_complete ?? 0,
    },
    counts,
    uniqueByEvent,
    funnelSteps,
    productRows,
    popularByViews: productRows.slice(0, 10),
    utmSources,
    engagement: {
      ctaClicks: counts.cta_click ?? 0,
      trustBlockViews: counts.trust_block_view ?? 0,
    },
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
  q?: string;
  overdue?: boolean;
}): Promise<AdminOrderRow[]> {
  const where: Prisma.OrderWhereInput = {};
  if (params?.status && params.status !== "ALL") {
    where.status = params.status;
  }
  if (params?.overdue) {
    where.isOverdue = true;
  }
  const q = params?.q?.trim();
  if (q) {
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      {
        items: {
          some: {
            OR: [
              { productName: { contains: q, mode: "insensitive" } },
              {
                product: {
                  seller: {
                    storeName: { contains: q, mode: "insensitive" },
                  },
                },
              },
            ],
          },
        },
      },
    ];
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
      isOverdue: true,
      overdueAt: true,
      overdueReason: true,
      confirmationDeadline: true,
      shipmentDeadline: true,
      pickupExpiresAt: true,
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
      isOverdue: row.isOverdue,
      overdueAt: row.overdueAt,
      overdueReason: row.overdueReason,
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
      path: true,
      externalSource: true,
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
    path: row.path,
    externalSource: row.externalSource,
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
    data: {
      isVerified: params.isVerified,
      verifiedAt: params.isVerified ? new Date() : null,
    },
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

export type AdminBrandRow = {
  id: string;
  name: string;
  slug: string;
  aliases: string[];
  productCount: number;
  isActive: boolean;
};

export type AdminUnderstandingCorrectionRow = {
  id: string;
  field: string;
  suggested: string | null;
  corrected: string | null;
  title: string | null;
  productTypeId: string | null;
  createdAt: string;
};

export async function listAdminBrands(limit = 100): Promise<AdminBrandRow[]> {
  const rows = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    take: limit,
    include: { _count: { select: { products: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    aliases: r.aliases,
    productCount: r._count.products,
    isActive: r.isActive,
  }));
}

export async function listAdminUnderstandingCorrections(
  limit = 50,
): Promise<AdminUnderstandingCorrectionRow[]> {
  const rows = await prisma.productUnderstandingCorrection.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    field: r.field,
    suggested: r.suggested,
    corrected: r.corrected,
    title: r.title,
    productTypeId: r.productTypeId,
    createdAt: r.createdAt.toISOString(),
  }));
}

export type AdminImportBatchRow = {
  id: string;
  source: string;
  version: string;
  hash: string;
  status: string;
  statistics: Record<string, number> | null;
  itemCount: number;
  createdAt: string;
  appliedAt: string | null;
};

export async function listAdminImportBatches(
  limit = 30,
): Promise<AdminImportBatchRow[]> {
  const rows = await prisma.taxonomyImportBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { _count: { select: { items: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    source: r.source,
    version: r.version,
    hash: r.hash,
    status: r.status,
    statistics: (r.statistics as Record<string, number> | null) ?? null,
    itemCount: r._count.items,
    createdAt: r.createdAt.toISOString(),
    appliedAt: r.appliedAt?.toISOString() ?? null,
  }));
}

export async function getAdminImportBatch(batchId: string) {
  return prisma.taxonomyImportBatch.findUnique({
    where: { id: batchId },
    include: {
      items: {
        orderBy: [{ status: "asc" }, { action: "asc" }],
        take: 200,
      },
    },
  });
}

export type AdminAdsProductRow = {
  id: string;
  title: string;
  status: ProductStatus;
  eligible: boolean;
  reasons: AdEligibilityReason[];
  qualityScore: number;
  imageUrl: string | null;
  storeName: string;
  categoryName: string | null;
};

export type AdminAdsDashboard = {
  totalProducts: number;
  readyCount: number;
  blockedCount: number;
  avgQualityScore: number;
  products: AdminAdsProductRow[];
  categories: CategoryAdsReportRow[];
};

function topLevelCategorySlug(path: string | null | undefined): string | null {
  if (!path) return null;
  const first = path.split("/").filter(Boolean)[0];
  return first ?? null;
}

export async function getAdminAdsDashboard(): Promise<AdminAdsDashboard> {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        stock: true,
        price: true,
        description: true,
        productTypeId: true,
        categoryId: true,
        sellerId: true,
        seller: {
          select: {
            isBlocked: true,
            isVerified: true,
            storeName: true,
          },
        },
        category: { select: { name: true, path: true, slug: true } },
        images: {
          take: 1,
          orderBy: { sortOrder: "asc" },
          select: { url: true },
        },
        _count: { select: { images: true, characteristicValues: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.category.findMany({
      where: {
        level: 1,
        slug: {
          in: ["construction", "tools", "electronics", "clothing", "home"],
        },
      },
      select: { slug: true, name: true },
    }),
  ]);

  const categoryNames = Object.fromEntries(
    categories.map((c) => [c.slug, c.name]),
  );

  const snapshots = products.map((p) => {
    return {
      product: p,
      topLevelSlug: topLevelCategorySlug(p.category?.path ?? p.category?.slug),
      snapshot: buildProductAdSnapshot({
        status: p.status,
        stock: p.stock,
        price: toPriceNumber(p.price),
        title: p.name,
        description: p.description,
        productTypeId: p.productTypeId,
        categoryId: p.categoryId,
        imageCount: p._count.images,
        sellerId: p.sellerId,
        sellerBlocked: p.seller.isBlocked,
        sellerVerified: p.seller.isVerified,
        sellerCompletedOrders: 0,
        characteristicCount: p._count.characteristicValues,
      }),
    };
  });

  const rows: AdminAdsProductRow[] = snapshots.map(({ product: p, snapshot }) => ({
    id: p.id,
    title: p.name,
    status: p.status,
    eligible: snapshot.eligibility.eligible,
    reasons: snapshot.eligibility.reasons,
    qualityScore: snapshot.quality.score,
    imageUrl: p.images[0]?.url ?? null,
    storeName: p.seller.storeName,
    categoryName: p.category?.name ?? null,
  }));

  const readyCount = rows.filter((r) => r.eligible).length;
  const qualitySum = snapshots.reduce(
    (sum, { snapshot }) => sum + snapshot.quality.score,
    0,
  );

  const categoriesReport = buildCategoryAdsReport(
    snapshots.map(({ product: p, topLevelSlug }) => ({
      status: p.status,
      stock: p.stock,
      price: toPriceNumber(p.price),
      title: p.name,
      description: p.description,
      productTypeId: p.productTypeId,
      categoryId: p.categoryId,
      imageCount: p._count.images,
      sellerId: p.sellerId,
      sellerBlocked: p.seller.isBlocked,
      sellerVerified: p.seller.isVerified,
      sellerCompletedOrders: 0,
      characteristicCount: p._count.characteristicValues,
      categorySlug: p.category?.slug ?? null,
      categoryName: p.category?.name ?? null,
      topLevelSlug,
    })),
    categoryNames,
  );

  return {
    totalProducts: rows.length,
    readyCount,
    blockedCount: rows.length - readyCount,
    avgQualityScore:
      rows.length > 0 ? Math.round(qualitySum / rows.length) : 0,
    products: rows,
    categories: categoriesReport,
  };
}
