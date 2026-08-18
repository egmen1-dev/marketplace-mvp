import { OrderStatus, Prisma } from "@prisma/client";

import { resolveRequestUser, isSellerCapable } from "@/features/auth/resolve-request-user";
import { toPriceNumber } from "@/features/products/mappers";
import { tokenizeSearchQuery } from "@/features/products/search-query";
import {
  getSellerOrderCounters,
  listSellerOrders,
  SellerServiceError,
  type SellerOrderListItem,
} from "@/features/seller/queries";
import { parseMobilePageCursor, toMobilePagination } from "@/lib/mobile/pagination";
import { prisma } from "@/lib/prisma";

import type {
  MobileSellerOrderDetail,
  MobileSellerOrderFilter,
  MobileSellerOrderItem,
  MobileSellerOrdersPage,
  MobileSellerOrdersSummary,
} from "./seller-orders-types";

function mapOrderItem(order: SellerOrderListItem): MobileSellerOrderItem {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    fulfillmentType: order.fulfillmentType,
    isOverdue: order.isOverdue,
    overdueReason: order.overdueReason,
    total: order.total,
    sellerSubtotal: order.sellerSubtotal,
    currency: order.currency,
    createdAt: order.createdAt,
    buyerName: order.buyerName,
    buyerEmail: order.buyerEmail,
    itemCount: order.itemCount,
    sellerItemNames: order.sellerItemNames,
  };
}

function resolveListFilters(filter: MobileSellerOrderFilter): {
  bucket?: string;
  status?: OrderStatus;
} {
  switch (filter) {
    case "new":
      return { bucket: "NEW" };
    case "processing":
      return { bucket: "PROCESSING" };
    case "ready_shipment":
      return { status: OrderStatus.READY_FOR_SHIPMENT };
    case "awaiting_pickup":
      return { status: OrderStatus.READY_FOR_PICKUP };
    case "shipped":
      return { bucket: "SHIPPED" };
    case "completed":
      return { bucket: "COMPLETED" };
    case "cancelled":
      return { bucket: "CANCELLED" };
    case "overdue":
      return { bucket: "OVERDUE" };
    case "problem":
      return { bucket: "PROBLEM" };
    case "all":
    default:
      return {};
  }
}

function buildOrderSearchWhere(
  sellerProfileId: string,
  query: string,
): Prisma.OrderWhereInput {
  const tokens = tokenizeSearchQuery(query);
  const base: Prisma.OrderWhereInput = {
    items: { some: { product: { sellerId: sellerProfileId } } },
  };

  if (tokens.length === 0) {
    return base;
  }

  const or: Prisma.OrderWhereInput[] = [];
  for (const token of tokens) {
    or.push(
      { orderNumber: { contains: token, mode: "insensitive" } },
      { user: { name: { contains: token, mode: "insensitive" } } },
      { user: { email: { contains: token, mode: "insensitive" } } },
      {
        items: {
          some: {
            product: { sellerId: sellerProfileId },
            productName: { contains: token, mode: "insensitive" },
          },
        },
      },
    );
  }

  return { AND: [base, { OR: or }] };
}

async function searchSellerOrders(
  sellerProfileId: string,
  query: string,
  page: number,
  pageSize: number,
  filter: MobileSellerOrderFilter,
): Promise<{ items: MobileSellerOrderItem[]; total: number; page: number; pageSize: number }> {
  const where = buildOrderSearchWhere(sellerProfileId, query);
  const listFilters = resolveListFilters(filter);

  if (listFilters.bucket === "OVERDUE") {
    where.isOverdue = true;
  } else if (listFilters.status) {
    where.status = listFilters.status;
  } else if (listFilters.bucket) {
    const { SELLER_ORDER_FILTER_BUCKETS } = await import("@/features/orders/lib/status");
    if (listFilters.bucket in SELLER_ORDER_FILTER_BUCKETS) {
      const key = listFilters.bucket as keyof typeof SELLER_ORDER_FILTER_BUCKETS;
      where.status = { in: [...SELLER_ORDER_FILTER_BUCKETS[key]] };
    }
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
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
      overdueReason: o.overdueReason,
      total: toPriceNumber(o.total),
      currency: o.currency,
      createdAt: o.createdAt.toISOString(),
      buyerName: o.user.name,
      buyerEmail: o.user.email,
      itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
      sellerSubtotal: o.items.reduce((s, i) => s + toPriceNumber(i.totalPrice), 0),
      sellerItemNames: o.items.map((i) => i.productName),
    })),
  };
}

export async function buildMobileSellerOrdersSummaryFromRequest(
  request: Request,
): Promise<MobileSellerOrdersSummary> {
  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return {
      newCount: 0,
      inProgress: 0,
      awaitingShipment: 0,
      readyForPickup: 0,
      overdue: 0,
    };
  }

  return getSellerOrderCounters(user.sellerProfileId);
}

export async function buildMobileSellerOrdersFromRequest(
  request: Request,
  options: {
    cursor?: string | null;
    query?: string | null;
    filter?: MobileSellerOrderFilter;
  } = {},
): Promise<MobileSellerOrdersPage> {
  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return { items: [], nextCursor: null, hasMore: false, total: 0 };
  }

  const page = parseMobilePageCursor(options.cursor);
  const pageSize = 20;
  const filter = options.filter ?? "all";
  const query = options.query?.trim() ?? "";

  const result = query
    ? await searchSellerOrders(user.sellerProfileId, query, page, pageSize, filter)
    : await listSellerOrders(user.sellerProfileId, {
        page,
        pageSize,
        ...resolveListFilters(filter),
      });

  const items = result.items.map(mapOrderItem);
  const pagination = toMobilePagination({ page, pageSize, total: result.total });

  return {
    items,
    nextCursor: pagination.nextCursor,
    hasMore: pagination.hasMore,
    total: result.total,
  };
}

export async function buildMobileSellerOrderDetailFromRequest(
  request: Request,
  orderId: string,
): Promise<MobileSellerOrderDetail | null> {
  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return null;
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      items: { some: { product: { sellerId: user.sellerProfileId } } },
    },
    include: {
      user: { select: { name: true, email: true } },
      items: {
        where: { product: { sellerId: user.sellerProfileId } },
        select: {
          id: true,
          quantity: true,
          totalPrice: true,
          productName: true,
          product: { select: { sku: true } },
        },
      },
    },
  });

  if (!order) {
    throw new SellerServiceError("NOT_FOUND", "Заказ не найден", 404);
  }

  const sellerSubtotal = order.items.reduce((s, i) => s + toPriceNumber(i.totalPrice), 0);
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    fulfillmentType: order.fulfillmentType,
    isOverdue: order.isOverdue,
    overdueReason: order.overdueReason,
    total: toPriceNumber(order.total),
    sellerSubtotal,
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    buyerName: order.user.name,
    buyerEmail: order.user.email,
    itemCount,
    sellerItemNames: order.items.map((i) => i.productName),
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      quantity: item.quantity,
      totalPrice: toPriceNumber(item.totalPrice),
      sku: item.product.sku,
    })),
  };
}
