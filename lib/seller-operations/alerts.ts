import type {
  AiDailyAdvice,
  ProductAttentionItem,
  SellerOperationsNotification,
  TodaySummaryLine,
} from "./types";
import type { OrderOperationsSnapshot } from "./types";

export function buildTodaySummary(input: {
  orders: OrderOperationsSnapshot;
  productAttentionCount: number;
  aiAdvice: AiDailyAdvice;
  availableBalance: number;
  revenue: number;
}): TodaySummaryLine[] {
  const lines: TodaySummaryLine[] = [];

  if (input.orders.newOrders > 0) {
    lines.push({
      id: "new-orders",
      label: `${input.orders.newOrders} новых заказа`,
      count: input.orders.newOrders,
      highlight: true,
    });
  }

  if (input.productAttentionCount > 0) {
    lines.push({
      id: "products-attention",
      label: `${input.productAttentionCount} товар(ов) требуют внимания`,
      count: input.productAttentionCount,
    });
  }

  lines.push({
    id: "ai-rec",
    label: "1 рекомендация AI",
    count: 1,
  });

  if (input.availableBalance > 0) {
    lines.push({
      id: "payout",
      label: `${input.availableBalance.toLocaleString("ru-RU")} ₽ доступны к выводу`,
      highlight: true,
    });
  } else if (input.revenue > 0) {
    lines.push({
      id: "sales",
      label: `Выручка: ${input.revenue.toLocaleString("ru-RU")} ₽`,
    });
  }

  if (lines.length === 0) {
    lines.push({
      id: "calm",
      label: "Спокойный день — время улучшить магазин",
    });
  }

  return lines;
}

export function buildOperationsNotifications(input: {
  orders: OrderOperationsSnapshot;
  products: ProductAttentionItem[];
  aiAdvice: AiDailyAdvice;
  availableBalance: number;
}): SellerOperationsNotification[] {
  const now = new Date().toISOString();
  const notifications: SellerOperationsNotification[] = [];

  if (input.orders.newOrders > 0 || input.orders.overdue > 0) {
    notifications.push({
      id: "ops-order-action",
      type: "ORDER_ACTION_REQUIRED",
      title: "Заказы требуют внимания",
      body:
        input.orders.overdue > 0
          ? `${input.orders.overdue} просрочено, ${input.orders.newOrders} новых`
          : `${input.orders.newOrders} новых заказов`,
      href: "/account/sales",
      createdAt: now,
      read: false,
    });
  }

  if (input.products.length > 0) {
    notifications.push({
      id: "ops-product-attention",
      type: "PRODUCT_NEEDS_ATTENTION",
      title: "Товары требуют внимания",
      body: input.products[0]!.headline,
      href: input.products[0]!.ctaHref,
      createdAt: now,
      read: false,
    });
  }

  const stockWarning = input.products.find((p) => p.type === "low_stock");
  if (stockWarning) {
    notifications.push({
      id: "ops-stock-warning",
      type: "STOCK_WARNING",
      title: "Мало остатков",
      body: stockWarning.reason,
      href: stockWarning.ctaHref,
      createdAt: now,
      read: false,
    });
  }

  notifications.push({
    id: "ops-ai-daily",
    type: "AI_DAILY_RECOMMENDATION",
    title: "AI совет дня",
    body: input.aiAdvice.action,
    href: input.aiAdvice.ctaHref,
    createdAt: now,
    read: false,
  });

  if (input.availableBalance > 0) {
    notifications.push({
      id: "ops-payout-available",
      type: "PAYOUT_AVAILABLE",
      title: "Деньги доступны",
      body: `${input.availableBalance.toLocaleString("ru-RU")} ₽ к выводу`,
      href: "/account/payouts",
      createdAt: now,
      read: false,
    });
  }

  return notifications.slice(0, 6);
}

export function buildResultSummary(input: {
  ordersProcessedHint: number;
  issuesRemaining: number;
  availableBalance: number;
}): string {
  if (input.issuesRemaining === 0 && input.ordersProcessedHint === 0) {
    return "День идёт спокойно — сфокусируйтесь на росте продаж";
  }
  if (input.issuesRemaining === 0) {
    return "Основные задачи закрыты — отличная работа";
  }
  return `Осталось ${input.issuesRemaining} важных задач на сегодня`;
}
