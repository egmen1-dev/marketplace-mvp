import { ModerationStatus, OrderStatus, ProductStatus } from "@prisma/client";

import { listConversationsForUser } from "@/features/chat/queries";
import { LOW_STOCK_THRESHOLD } from "@/features/orders/lib/inventory-sync";
import type { SellerOrderListItem } from "@/features/seller/queries";
import { getPromotionCenterDashboard } from "@/lib/seller-promotion-center/queries";
import { prisma } from "@/lib/prisma";

import type { MobileSellerWorkspace, MobileSellerWorkspaceItem, SellerActionKind } from "./seller-home";

const COMPLETED_STATUSES: OrderStatus[] = [
  OrderStatus.COMPLETED,
  OrderStatus.DELIVERED,
  OrderStatus.PICKED_UP,
];

const IN_PROGRESS_STATUSES = new Set<OrderStatus>([
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.READY_FOR_SHIPMENT,
]);

const URGENT_ORDER_STATUSES = new Set<OrderStatus>([
  OrderStatus.NEW,
  OrderStatus.PAID,
  OrderStatus.AWAITING_SELLER_CONFIRMATION,
]);

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function pushItem(
  items: MobileSellerWorkspaceItem[],
  item: Omit<MobileSellerWorkspaceItem, "actionKind" | "actionPayload" | "supportsUndo"> &
    Partial<Pick<MobileSellerWorkspaceItem, "actionKind" | "actionPayload" | "supportsUndo">>,
): void {
  items.push({
    actionKind: null,
    actionPayload: null,
    supportsUndo: false,
    ...item,
  });
}

function countPriorities(items: MobileSellerWorkspaceItem[]) {
  return items.reduce(
    (acc, item) => {
      acc[item.priority] += 1;
      return acc;
    },
    { urgent: 0, important: 0, routine: 0, completed: 0 },
  );
}

export async function buildSellerWorkspace(input: {
  userId: string;
  sellerProfileId: string;
  recentOrders: SellerOrderListItem[];
  orderCounters: {
    newCount: number;
    inProgress: number;
    awaitingShipment: number;
    overdue: number;
  };
  wallet: { spendableAmount: number; pendingFromSales: number } | null;
  productBuckets: {
    drafts: number;
    lowStock: number | null;
    outOfStock: number;
  };
  sellerSettings?: { storeName: string; phone: string | null; description: string | null } | null;
  now?: Date;
}): Promise<MobileSellerWorkspace> {
  const now = input.now ?? new Date();
  const dayStart = startOfDay(now);
  const items: MobileSellerWorkspaceItem[] = [];

  const [draftProducts, pendingModeration, lowStockProducts, completedTodayOrders, conversations, promotion] =
    await Promise.all([
      prisma.product.findMany({
        where: { sellerId: input.sellerProfileId, status: ProductStatus.DRAFT },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, name: true, updatedAt: true },
      }),
      prisma.productModeration.findMany({
        where: {
          status: { in: [ModerationStatus.PENDING_REVIEW, ModerationStatus.NEEDS_FIX] },
          product: { sellerId: input.sellerProfileId },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { productId: true, status: true, product: { select: { name: true } } },
      }),
      prisma.productInventory.findMany({
        where: {
          quantity: { gt: 0, lte: LOW_STOCK_THRESHOLD },
          product: { sellerId: input.sellerProfileId, status: ProductStatus.ACTIVE },
        },
        take: 5,
        select: { quantity: true, product: { select: { id: true, name: true } } },
      }),
      prisma.order.findMany({
        where: {
          status: { in: COMPLETED_STATUSES },
          updatedAt: { gte: dayStart },
          items: { some: { product: { sellerId: input.sellerProfileId } } },
        },
        orderBy: { updatedAt: "desc" },
        take: 8,
        select: {
          id: true,
          orderNumber: true,
          updatedAt: true,
          user: { select: { name: true } },
        },
      }),
      listConversationsForUser({ userId: input.userId }).catch(() => []),
      getPromotionCenterDashboard(input.sellerProfileId).catch(() => null),
    ]);

  const sellerConversations = conversations.filter((c) => c.counterpart.kind === "buyer");

  const settings = input.sellerSettings;
  const profileIncomplete =
    settings &&
    (!settings.storeName?.trim() || !settings.phone?.trim() || !settings.description?.trim());
  if (profileIncomplete && settings) {
    pushItem(items, {
      id: "complete-profile",
      title: "Заполните профиль продавца",
      subtitle: !settings.phone?.trim()
        ? "Добавьте телефон для связи с покупателями"
        : !settings.description?.trim()
          ? "Добавьте описание магазина"
          : "Укажите название магазина",
      priority: "important",
      source: "notifications",
      section: "todays_work",
      action: "profile",
      entityId: null,
      resumeKey: null,
      completedAt: null,
      actionKind: "complete_profile",
      actionPayload: {
        storeName: settings.storeName,
        phone: settings.phone,
        description: settings.description,
      },
      supportsUndo: true,
    });
  }

  for (const order of input.recentOrders) {
    if (order.isOverdue) {
      pushItem(items, {
        id: `urgent-overdue-${order.id}`,
        title: `Просрочен заказ ${order.orderNumber}`,
        subtitle: order.buyerName ?? "Покупатель",
        priority: "urgent",
        source: "orders",
        section: "urgent",
        action: "orders",
        entityId: order.id,
        resumeKey: `order:${order.id}`,
        completedAt: null,
        actionKind: "confirm_order",
        actionPayload: { orderId: order.id },
        supportsUndo: true,
      });
    }
  }

  if (input.orderCounters.overdue > 0 && !items.some((i) => i.section === "urgent" && i.source === "orders")) {
    pushItem(items, {
      id: "urgent-overdue-count",
      title: `${input.orderCounters.overdue} просроченных заказ(ов)`,
      subtitle: "Требуют срочной обработки",
      priority: "urgent",
      source: "orders",
      section: "urgent",
      action: "orders",
      entityId: null,
      resumeKey: null,
      completedAt: null,
    });
  }

  for (const order of input.recentOrders.filter((o) => URGENT_ORDER_STATUSES.has(o.status)).slice(0, 5)) {
    pushItem(items, {
      id: `today-order-${order.id}`,
      title: `Обработать заказ ${order.orderNumber}`,
      subtitle: order.buyerName ?? "Покупатель",
      priority: "important",
      source: "orders",
      section: "todays_work",
      action: "orders",
      entityId: order.id,
      resumeKey: `order:${order.id}`,
      completedAt: null,
      actionKind: "confirm_order",
      actionPayload: { orderId: order.id },
      supportsUndo: true,
    });
  }

  const resumeOrder = input.recentOrders.find((o) => IN_PROGRESS_STATUSES.has(o.status));
  if (resumeOrder) {
    pushItem(items, {
      id: `resume-order-${resumeOrder.id}`,
      title: `Продолжить заказ ${resumeOrder.orderNumber}`,
      subtitle: resumeOrder.buyerName ?? "Покупатель",
      priority: "important",
      source: "orders",
      section: "quick_resume",
      action: "orders",
      entityId: resumeOrder.id,
      resumeKey: `order:${resumeOrder.id}`,
      completedAt: null,
      actionKind: resumeOrder.status === OrderStatus.READY_FOR_SHIPMENT ? "ship_order" : "confirm_order",
      actionPayload: { orderId: resumeOrder.id },
      supportsUndo: true,
    });
  }

  const resumeDraft = draftProducts[0];
  if (resumeDraft) {
    pushItem(items, {
      id: `resume-draft-${resumeDraft.id}`,
      title: `Продолжить черновик «${resumeDraft.name}»`,
      subtitle: "Товар не опубликован",
      priority: "routine",
      source: "products",
      section: "quick_resume",
      action: "products",
      entityId: resumeDraft.id,
      resumeKey: `draft:${resumeDraft.id}`,
      completedAt: null,
      actionKind: "resume_draft",
      actionPayload: { productId: resumeDraft.id },
      supportsUndo: false,
    });
  }

  for (const draft of draftProducts) {
    pushItem(items, {
      id: `draft-${draft.id}`,
      title: draft.name,
      subtitle: "Черновик",
      priority: "routine",
      source: "products",
      section: "recent_drafts",
      action: "products",
      entityId: draft.id,
      resumeKey: `draft:${draft.id}`,
      completedAt: null,
      actionKind: "publish_product",
      actionPayload: { productId: draft.id },
      supportsUndo: true,
    });
  }

  for (const row of pendingModeration) {
    pushItem(items, {
      id: `moderation-${row.productId}`,
      title: row.product.name,
      subtitle: row.status === ModerationStatus.NEEDS_FIX ? "Нужны правки" : "Ожидает модерации",
      priority: "important",
      source: "products",
      section: "pending_publications",
      action: "products",
      entityId: row.productId,
      resumeKey: `product:${row.productId}`,
      completedAt: null,
      actionKind: "fix_moderation",
      actionPayload: { productId: row.productId },
      supportsUndo: false,
    });
  }

  for (const row of lowStockProducts) {
    pushItem(items, {
      id: `low-stock-${row.product.id}`,
      title: row.product.name,
      subtitle: `Остаток: ${row.quantity}`,
      priority: "important",
      source: "products",
      section: "low_stock",
      action: "products",
      entityId: row.product.id,
      resumeKey: `product:${row.product.id}`,
      completedAt: null,
      actionKind: "update_stock",
      actionPayload: { productId: row.product.id, quantity: LOW_STOCK_THRESHOLD + 5, previousQuantity: row.quantity },
      supportsUndo: true,
    });
  }

  if (input.productBuckets.outOfStock > 0 && lowStockProducts.length === 0) {
    pushItem(items, {
      id: "out-of-stock-count",
      title: `${input.productBuckets.outOfStock} товар(ов) нет в наличии`,
      subtitle: "Обновите остатки",
      priority: "important",
      source: "products",
      section: "low_stock",
      action: "products",
      entityId: null,
      resumeKey: null,
      completedAt: null,
    });
  }

  const awaitingOrders = input.recentOrders.filter((o) => o.status === OrderStatus.READY_FOR_SHIPMENT);
  if (awaitingOrders.length === 0 && input.orderCounters.awaitingShipment > 0) {
    pushItem(items, {
      id: "awaiting-shipment-count",
      title: `${input.orderCounters.awaitingShipment} заказ(ов) ждут отправки`,
      subtitle: null,
      priority: "important",
      source: "orders",
      section: "awaiting_shipment",
      action: "orders",
      entityId: null,
      resumeKey: null,
      completedAt: null,
    });
  }
  for (const order of awaitingOrders.slice(0, 5)) {
    pushItem(items, {
      id: `awaiting-${order.id}`,
      title: `Отправить заказ ${order.orderNumber}`,
      subtitle: order.buyerName ?? "Покупатель",
      priority: "important",
      source: "orders",
      section: "awaiting_shipment",
      action: "orders",
      entityId: order.id,
      resumeKey: `order:${order.id}`,
      completedAt: null,
      actionKind: "ship_order",
      actionPayload: { orderId: order.id },
      supportsUndo: true,
    });
  }

  for (const conversation of sellerConversations.filter((c) => c.unreadCount > 0).slice(0, 5)) {
    pushItem(items, {
      id: `reply-${conversation.id}`,
      title: `Ответить ${conversation.counterpart.name}`,
      subtitle: conversation.product.title,
      priority: "urgent",
      source: "notifications",
      section: "customer_replies",
      action: "profile",
      entityId: conversation.id,
      resumeKey: `chat:${conversation.id}`,
      completedAt: null,
      actionKind: "reply_buyer",
      actionPayload: { conversationId: conversation.id },
      supportsUndo: false,
    });
  }

  if (input.wallet?.pendingFromSales && input.wallet.pendingFromSales > 0) {
    pushItem(items, {
      id: "wallet-pending",
      title: "Ожидают выплаты",
      subtitle: formatRub(input.wallet.pendingFromSales),
      priority: "routine",
      source: "wallet",
      section: "financial_actions",
      action: "wallet",
      entityId: null,
      resumeKey: null,
      completedAt: null,
    });
  }
  if (input.wallet?.spendableAmount && input.wallet.spendableAmount > 0) {
    pushItem(items, {
      id: "wallet-withdraw",
      title: "Доступно к выводу",
      subtitle: formatRub(input.wallet.spendableAmount),
      priority: "routine",
      source: "wallet",
      section: "financial_actions",
      action: "wallet",
      entityId: null,
      resumeKey: null,
      completedAt: null,
      actionKind: "withdraw_funds",
      actionPayload: { amount: input.wallet.spendableAmount },
      supportsUndo: false,
    });
  }

  if (promotion?.enabled) {
    for (const product of promotion.products.filter((p) => !p.ready).slice(0, 3)) {
      pushItem(items, {
        id: `promotion-${product.id}`,
        title: `Доработать «${product.name}» для продвижения`,
        subtitle: product.missing.length > 0 ? `Не хватает: ${product.missing.join(", ")}` : "Не готов к кампании",
        priority: "routine",
        source: "promotion",
        section: "pending_publications",
        action: "products",
        entityId: product.id,
        resumeKey: `product:${product.id}`,
        completedAt: null,
        actionKind: "fix_moderation",
        actionPayload: { productId: product.id },
        supportsUndo: false,
      });
    }
  }

  for (const order of completedTodayOrders) {
    pushItem(items, {
      id: `completed-${order.id}`,
      title: `Заказ ${order.orderNumber} завершён`,
      subtitle: order.user.name ?? "Покупатель",
      priority: "completed",
      source: "orders",
      section: "completed_today",
      action: "orders",
      entityId: order.id,
      resumeKey: null,
      completedAt: order.updatedAt.toISOString(),
    });
  }

  const deduped = dedupeItems(items);
  return {
    items: deduped,
    counts: countPriorities(deduped),
  };
}

function dedupeItems(items: MobileSellerWorkspaceItem[]): MobileSellerWorkspaceItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function formatRub(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}
