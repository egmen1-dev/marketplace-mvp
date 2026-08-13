import { ROUTES } from "@/lib/constants";
import {
  getSellerDashboardStats,
  getSellerOrderCounters,
  listSellerOrders,
} from "@/features/seller/queries";
import { getSellerBalance } from "@/lib/finance";
import { loadSellerProgressSignals } from "@/lib/seller-lifecycle/progress";
import { getSellerJourneyDashboard } from "@/lib/seller-journey/queries";
import { isSellerJourneyEnabled } from "@/lib/seller-journey/flags";

import { buildTodayActions } from "./actions";
import { isSellerOperatingDeskEnabled } from "./flags";
import { detectOperatingDeskIssues } from "./issues";
import type {
  OperatingDeskMoneySnapshot,
  OperatingDeskNowSnapshot,
  SellerOperatingDeskDashboard,
} from "./types";

function buildNowSnapshot(input: {
  stats: Awaited<ReturnType<typeof getSellerDashboardStats>>;
  orderCounters: Awaited<ReturnType<typeof getSellerOrderCounters>>;
}): OperatingDeskNowSnapshot {
  const { stats, orderCounters } = input;
  const parts: string[] = [];

  if (orderCounters.newCount > 0) {
    parts.push(`${orderCounters.newCount} новых заказов`);
  }
  if (stats.viewsSum > 0) {
    parts.push(`${stats.viewsSum} просмотров товаров`);
  }
  if (stats.salesCount > 0) {
    parts.push(`${stats.salesCount} продаж`);
  }

  const headline =
    parts.length > 0 ? parts.join(" · ") : "Пока спокойно — время улучшить магазин";

  return {
    headline,
    summary:
      orderCounters.overdue > 0
        ? "Есть срочные задачи — начните с просроченных заказов"
        : orderCounters.newCount > 0
          ? "Есть новые заказы — обработайте их в первую очередь"
          : "Следите за карточками и продвижением для роста продаж",
    stats,
    orderCounters,
  };
}

function buildMoneySnapshot(input: {
  pendingAmount: number;
  availableAmount: number;
  paidAmount: number;
}): OperatingDeskMoneySnapshot {
  const { pendingAmount, availableAmount, paidAmount } = input;

  if (availableAmount > 0) {
    return {
      pendingAmount,
      availableAmount,
      paidAmount,
      headline: "Деньги готовы к выводу",
      explanation: `Доступно: ${availableAmount.toLocaleString("ru-RU")} ₽`,
      ctaLabel: "Вывести деньги",
      ctaHref: ROUTES.ACCOUNT_PAYOUTS,
    };
  }

  if (pendingAmount > 0) {
    return {
      pendingAmount,
      availableAmount,
      paidAmount,
      headline: "Средства ожидаются",
      explanation: `${pendingAmount.toLocaleString("ru-RU")} ₽ после завершения сделок станут доступны`,
      ctaLabel: "Открыть баланс",
      ctaHref: ROUTES.ACCOUNT_BALANCE,
    };
  }

  return {
    pendingAmount,
    availableAmount,
    paidAmount,
    headline: "Первая выплата после продажи",
    explanation:
      "После успешной сделки деньги появятся в ожидании, затем станут доступны для вывода",
    ctaLabel: "Как это работает",
    ctaHref: ROUTES.ACCOUNT_BALANCE,
  };
}

const disabledDashboard: SellerOperatingDeskDashboard = {
  enabled: false,
  now: {
    headline: "SELLER_OPERATING_DESK_ENABLED=false",
    summary: "",
    stats: {
      totalProducts: 0,
      activeProducts: 0,
      salesCount: 0,
      ordersCount: 0,
      revenue: 0,
      viewsSum: 0,
      favoritesSum: 0,
      lowStockCount: 0,
    },
    orderCounters: {
      newCount: 0,
      inProgress: 0,
      awaitingShipment: 0,
      readyForPickup: 0,
      overdue: 0,
    },
  },
  issues: [],
  todayActions: [],
  money: {
    pendingAmount: 0,
    availableAmount: 0,
    paidAmount: 0,
    headline: "",
    explanation: "",
    ctaLabel: "",
    ctaHref: ROUTES.ACCOUNT,
  },
  coach: null,
};

export async function getSellerOperatingDeskDashboard(
  sellerProfileId: string,
): Promise<SellerOperatingDeskDashboard> {
  if (!isSellerOperatingDeskEnabled()) return disabledDashboard;

  const [stats, orderCounters, signals, balance, journey] = await Promise.all([
    getSellerDashboardStats(sellerProfileId),
    getSellerOrderCounters(sellerProfileId),
    loadSellerProgressSignals(sellerProfileId),
    getSellerBalance(sellerProfileId),
    isSellerJourneyEnabled()
      ? getSellerJourneyDashboard(sellerProfileId)
      : Promise.resolve(null),
  ]);

  const now = buildNowSnapshot({ stats, orderCounters });
  const issues = detectOperatingDeskIssues({
    stats,
    signals,
    orderCounters: {
      newCount: orderCounters.newCount,
      overdue: orderCounters.overdue,
    },
  });
  const coach = journey?.enabled ? journey.coach : null;
  const todayActions = buildTodayActions({ issues, coach });
  const money = buildMoneySnapshot({
    pendingAmount: balance.pendingAmount,
    availableAmount: balance.availableAmount,
    paidAmount: balance.paidAmount,
  });

  return {
    enabled: true,
    now,
    issues,
    todayActions,
    money,
    coach,
  };
}

export async function getSellerOperatingDeskRecentOrders(sellerProfileId: string) {
  return listSellerOrders(sellerProfileId, { pageSize: 5 });
}
