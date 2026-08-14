import { ROUTES } from "@/lib/constants";

import type {
  OperationsTaskCategory,
  OperationsTaskPriority,
  ProductAttentionItem,
} from "./types";
import type { OrderOperationsSnapshot } from "./types";

export type CandidateTask = {
  id: string;
  category: OperationsTaskCategory;
  priority: OperationsTaskPriority;
  title: string;
  why: string;
  ctaLabel: string;
  ctaHref: string;
  score: number;
};

export function buildCandidateTasks(input: {
  orders: OrderOperationsSnapshot;
  products: ProductAttentionItem[];
  availableBalance: number;
  aiAction: { title: string; why: string; ctaLabel: string; ctaHref: string };
}): CandidateTask[] {
  const tasks: CandidateTask[] = [];

  if (input.orders.overdue > 0) {
    tasks.push({
      id: "task-overdue-orders",
      category: "order",
      priority: "high",
      title: "Обработайте просроченные заказы",
      why: `${input.orders.overdue} заказ(ов) с задержкой`,
      ctaLabel: "Открыть заказы",
      ctaHref: `${ROUTES.ACCOUNT_SALES}?bucket=OVERDUE`,
      score: 100,
    });
  }

  if (input.orders.newOrders > 0) {
    tasks.push({
      id: "task-new-orders",
      category: "order",
      priority: "high",
      title: "Обработайте новый заказ",
      why: "Покупатель ждёт подтверждения",
      ctaLabel: "Открыть заказ",
      ctaHref: `${ROUTES.ACCOUNT_SALES}?bucket=NEW`,
      score: 95,
    });
  }

  if (input.orders.shipToday > 0) {
    tasks.push({
      id: "task-ship-today",
      category: "order",
      priority: "medium",
      title: "Отправьте заказы сегодня",
      why: `${input.orders.shipToday} заказ(ов) ждут отправки или выдачи`,
      ctaLabel: "К заказам",
      ctaHref: ROUTES.ACCOUNT_SALES,
      score: 85,
    });
  }

  for (const product of input.products.slice(0, 3)) {
    const score =
      product.type === "no_sales" ? 80 : product.type === "low_stock" ? 75 : 70;
    tasks.push({
      id: `task-product-${product.id}`,
      category: "product",
      priority: product.type === "no_sales" ? "high" : "medium",
      title:
        product.type === "no_sales"
          ? "Улучшите карточку товара"
          : product.type === "low_stock"
            ? "Пополните остатки"
            : "Сделайте карточку сильнее",
      why: product.reason,
      ctaLabel: product.ctaLabel,
      ctaHref: product.ctaHref,
      score,
    });
  }

  if (input.availableBalance > 0) {
    tasks.push({
      id: "task-payout",
      category: "money",
      priority: "medium",
      title: "Выведите доступные средства",
      why: `${input.availableBalance.toLocaleString("ru-RU")} ₽ готовы к выводу`,
      ctaLabel: "Вывести",
      ctaHref: ROUTES.ACCOUNT_PAYOUTS,
      score: 60,
    });
  }

  tasks.push({
    id: "task-ai-daily",
    category: "growth",
    priority: "low",
    title: input.aiAction.title,
    why: input.aiAction.why,
    ctaLabel: input.aiAction.ctaLabel,
    ctaHref: input.aiAction.ctaHref,
    score: 50,
  });

  return tasks;
}
