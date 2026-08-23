import type { Prisma } from "@prisma/client";
import type { OrderStatus } from "@prisma/client";
import { UserRole } from "@prisma/client";

import { resolveRequestUser, isSellerCapable } from "@/features/auth/resolve-request-user";
import { getAllowedOrderTransitions } from "@/features/seller/lib/order-transitions";
import {
  SellerServiceError,
  updateSellerOrderStatus,
} from "@/features/seller/queries";
import { prisma } from "@/lib/prisma";
import { toPriceNumber } from "@/features/products/mappers";

import {
  mobileSellerOrderTabToStatuses,
  toMobileSellerOrderStatus,
  type MobileSellerOrderItem,
  type MobileSellerOrderTab,
  type MobileSellerOrdersPayload,
} from "./seller-orders";

function parseTab(raw: string | null): MobileSellerOrderTab {
  if (raw === "in_progress" || raw === "completed") return raw;
  return "new";
}

export async function buildMobileSellerOrdersForUser(
  sellerProfileId: string,
  tab: MobileSellerOrderTab,
): Promise<MobileSellerOrdersPayload> {
  const statuses = mobileSellerOrderTabToStatuses(tab);

  const [total, orders] = await Promise.all([
    prisma.order.count({
      where: {
        status: { in: statuses },
        items: { some: { product: { sellerId: sellerProfileId } } },
      },
    }),
    prisma.order.findMany({
      where: {
        status: { in: statuses },
        items: { some: { product: { sellerId: sellerProfileId } } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { name: true, email: true } },
        items: {
          where: { product: { sellerId: sellerProfileId } },
          select: {
            quantity: true,
            totalPrice: true,
            productName: true,
            productId: true,
            product: {
              select: {
                images: {
                  orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
                  take: 1,
                  select: { url: true },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    tab,
    total,
    orders: orders.map((order) => mapMobileSellerOrder(order)),
  };
}

function mapMobileSellerOrder(order: {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  fulfillmentType: "DELIVERY" | "SELLER_PICKUP";
  currency: string;
  createdAt: Date;
  user: { name: string | null; email: string };
  items: Array<{
    quantity: number;
    totalPrice: Prisma.Decimal | number | string;
    productName: string;
    productId: string | null;
    product: { images: Array<{ url: string }> } | null;
  }>;
}): MobileSellerOrderItem {
  const primary = order.items[0];
  const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const amount = order.items.reduce((sum, item) => sum + toPriceNumber(item.totalPrice), 0);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: toMobileSellerOrderStatus(order.status),
    rawStatus: order.status,
    product: {
      id: primary?.productId ?? null,
      title: primary?.productName ?? "Товар",
      imageUrl: primary?.product?.images[0]?.url ?? null,
    },
    quantity,
    amount,
    currency: order.currency,
    buyer: {
      name: order.user.name,
      email: order.user.email,
    },
    createdAt: order.createdAt.toISOString(),
    fulfillmentType: order.fulfillmentType,
  };
}

export async function buildMobileSellerOrdersFromRequest(
  request: Request,
): Promise<MobileSellerOrdersPayload> {
  const { searchParams } = new URL(request.url);
  const tab = parseTab(searchParams.get("tab"));

  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return { orders: [], tab, total: 0 };
  }

  return buildMobileSellerOrdersForUser(user.sellerProfileId, tab);
}

export async function patchMobileSellerOrderStatusFromRequest(
  request: Request,
  orderId: string,
): Promise<{ ok: true; status: OrderStatus } | { ok: false; error: string; status: number }> {
  const user = await resolveRequestUser(request);
  if (!user) {
    return { ok: false, error: "Требуется вход", status: 401 };
  }
  if (!isSellerCapable(user.role) || !user.sellerProfileId) {
    return { ok: false, error: "Режим продавца недоступен", status: 403 };
  }

  let body: { status?: string };
  try {
    body = (await request.json()) as { status?: string };
  } catch {
    return { ok: false, error: "Некорректное тело запроса", status: 400 };
  }

  const toStatus = body.status?.trim().toUpperCase() as OrderStatus | undefined;
  if (!toStatus) {
    return { ok: false, error: "Укажите status", status: 400 };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      fulfillmentType: true,
      items: { select: { product: { select: { sellerId: true } } } },
    },
  });

  if (!order) {
    return { ok: false, error: "Заказ не найден", status: 404 };
  }

  const ownsItems = order.items.some((item) => item.product.sellerId === user.sellerProfileId);
  if (!ownsItems) {
    return { ok: false, error: "Нет доступа к этому заказу", status: 403 };
  }

  const allowed = getAllowedOrderTransitions(order.status, user.role as UserRole, order.fulfillmentType);
  if (!allowed.includes(toStatus)) {
    return { ok: false, error: "Недопустимый переход статуса", status: 409 };
  }

  try {
    const result = await updateSellerOrderStatus({
      orderId,
      toStatus,
      actorUserId: user.id,
      actorRole: user.role as UserRole,
      sellerProfileId: user.sellerProfileId,
    });
    return { ok: true, status: result.status };
  } catch (err) {
    if (err instanceof SellerServiceError) {
      return { ok: false, error: err.message, status: err.status };
    }
    console.error("[patchMobileSellerOrderStatus]", err);
    return { ok: false, error: "Не удалось обновить статус", status: 500 };
  }
}

export function getSellerOrderNextActions(order: MobileSellerOrderItem, role: UserRole) {
  return getAllowedOrderTransitions(order.rawStatus, role, order.fulfillmentType);
}
