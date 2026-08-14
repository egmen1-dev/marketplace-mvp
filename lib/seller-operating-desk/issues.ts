import { ROUTES } from "@/lib/constants";
import type { SellerProgressSignals } from "@/lib/seller-lifecycle/progress";
import type { SellerDashboardStats } from "@/features/seller/queries";

import type { OperatingDeskIssue } from "./types";

const QUALITY_THRESHOLD = 70;

export function detectOperatingDeskIssues(input: {
  stats: SellerDashboardStats;
  signals: SellerProgressSignals;
  orderCounters: {
    newCount: number;
    overdue: number;
  };
}): OperatingDeskIssue[] {
  const { stats, signals, orderCounters } = input;
  const issues: OperatingDeskIssue[] = [];

  if (orderCounters.overdue > 0) {
    issues.push({
      id: "overdue-orders",
      severity: "critical",
      title: "Просроченные заказы",
      description: `${orderCounters.overdue} заказ(ов) требуют срочного внимания`,
      why: "Просрочка снижает доверие покупателей и может повлиять на рейтинг.",
      ctaLabel: "Открыть заказы",
      ctaHref: `${ROUTES.ACCOUNT_SALES}?bucket=OVERDUE`,
    });
  }

  if (orderCounters.newCount > 0) {
    issues.push({
      id: "new-orders",
      severity: "warning",
      title: "Новые заказы ждут обработки",
      description: `${orderCounters.newCount} заказ(ов) нужно подтвердить или собрать`,
      why: "Быстрая реакция повышает шанс успешной сделки.",
      ctaLabel: "Обработать заказы",
      ctaHref: `${ROUTES.ACCOUNT_SALES}?bucket=NEW`,
    });
  }

  if (stats.activeProducts === 0 && stats.totalProducts === 0) {
    issues.push({
      id: "no-products",
      severity: "critical",
      title: "Магазин пуст",
      description: "Нет товаров — покупатели не смогут оформить заказ",
      why: "Без карточки товара продажи невозможны.",
      ctaLabel: "Создать товар",
      ctaHref: ROUTES.ACCOUNT_PRODUCTS_NEW,
    });
  } else if (stats.activeProducts === 0 && stats.totalProducts > 0) {
    issues.push({
      id: "no-published",
      severity: "warning",
      title: "Нет опубликованных товаров",
      description: "Черновики не видны в каталоге",
      why: "Опубликуйте карточку, чтобы покупатели могли её найти.",
      ctaLabel: "Открыть товары",
      ctaHref: ROUTES.ACCOUNT_PRODUCTS,
    });
  }

  if (
    signals.activeProducts > 0 &&
    signals.bestCompletenessScore < QUALITY_THRESHOLD
  ) {
    issues.push({
      id: "weak-cards",
      severity: "warning",
      title: "Слабые карточки товаров",
      description: `Качество карточки: ${signals.bestCompletenessScore} / 100`,
      why: "Хорошая карточка получает больше доверия и просмотров.",
      ctaLabel: "Улучшить карточку",
      ctaHref: ROUTES.ACCOUNT_PRODUCTS,
    });
  }

  if (signals.viewsSum > 0 && signals.ordersCount === 0) {
    issues.push({
      id: "views-no-sales",
      severity: "info",
      title: "Просмотры есть, продаж пока нет",
      description: "Покупатели смотрят, но не покупают",
      why: "Проверьте цену, доверие и полноту карточки.",
      ctaLabel: "Получить рекомендации",
      ctaHref: ROUTES.ACCOUNT_GROWTH,
    });
  }

  if (stats.lowStockCount > 0) {
    issues.push({
      id: "low-stock",
      severity: "warning",
      title: "Заканчивается остаток",
      description: `${stats.lowStockCount} товар(ов) с низким остатком`,
      why: "Товар может пропасть из каталога при нулевом остатке.",
      ctaLabel: "Проверить склад",
      ctaHref: ROUTES.ACCOUNT_PRODUCTS,
    });
  }

  if (signals.pendingBalance > 0 && signals.availableBalance === 0) {
    issues.push({
      id: "pending-money",
      severity: "info",
      title: "Средства в ожидании",
      description: `${signals.pendingBalance.toLocaleString("ru-RU")} ₽ после завершения сделок`,
      why: "После завершения заказа деньги станут доступны для вывода.",
      ctaLabel: "Открыть баланс",
      ctaHref: ROUTES.ACCOUNT_BALANCE,
    });
  }

  return issues.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
}

function severityRank(severity: OperatingDeskIssue["severity"]): number {
  switch (severity) {
    case "critical":
      return 0;
    case "warning":
      return 1;
    default:
      return 2;
  }
}
