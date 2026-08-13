import { ROUTES, sellerProductEditPath } from "@/lib/constants";

import type { CommandCenterWidget } from "./types";

export function buildSellerOpportunityWidgets(input: {
  readyForPromotion: number;
  needsImprovement: number;
  lowStock: number;
  weakProductId?: string | null;
}): CommandCenterWidget[] {
  const widgets: CommandCenterWidget[] = [];

  if (input.readyForPromotion > 0) {
    widgets.push({
      id: "opp-promotion",
      title: "Продвижение",
      body: `${input.readyForPromotion} товар(ов) готовы к продвижению`,
      href: ROUTES.ACCOUNT_PROMOTIONS,
      testId: "cc-opp-promotion",
    });
  }

  if (input.needsImprovement > 0) {
    widgets.push({
      id: "opp-cards",
      title: "Улучшение карточки",
      body: `${input.needsImprovement} карточек требуют доработки`,
      href: input.weakProductId
        ? sellerProductEditPath(input.weakProductId)
        : ROUTES.ACCOUNT_PRODUCTS,
      testId: "cc-opp-cards",
    });
  }

  widgets.push({
    id: "opp-assortment",
    title: "Ассортимент",
    body: "Расширьте каталог — больше точек входа для покупателей",
    href: ROUTES.ACCOUNT_PRODUCTS_NEW,
    testId: "cc-opp-assortment",
  });

  if (input.lowStock > 0) {
    widgets.push({
      id: "opp-stock",
      title: "Остатки",
      body: `${input.lowStock} товар(ов) с низким остатком`,
      href: ROUTES.ACCOUNT_PRODUCTS,
      testId: "cc-opp-stock",
    });
  }

  widgets.push({
    id: "opp-price",
    title: "Цена",
    body: "Проверьте цены относительно спроса в категории",
    href: ROUTES.ACCOUNT_GROWTH,
    testId: "cc-opp-price",
  });

  return widgets.slice(0, 5);
}

export function buildWhatWorksWidgets(
  statements: Array<{ id: string; statement: string }>,
): CommandCenterWidget[] {
  return statements.map((item) => ({
    id: item.id,
    title: "Что работает",
    body: item.statement,
    testId: `cc-works-${item.id}`,
  }));
}

export function buildAdminHealthWidgets(input: {
  gmv: number;
  sellers: number;
  buyers: number;
  conversionRate: number | null;
  activeProducts: number;
}): CommandCenterWidget[] {
  return [
    {
      id: "health-gmv",
      title: "GMV",
      body: `${Math.round(input.gmv).toLocaleString("ru-RU")} ₽`,
      testId: "cc-admin-gmv",
    },
    {
      id: "health-sellers",
      title: "Sellers",
      body: String(input.sellers),
      testId: "cc-admin-sellers",
    },
    {
      id: "health-buyers",
      title: "Buyers",
      body: String(input.buyers),
      testId: "cc-admin-buyers",
    },
    {
      id: "health-conversion",
      title: "Conversion",
      body:
        input.conversionRate != null
          ? `${Math.round(input.conversionRate * 1000) / 10}%`
          : "—",
      testId: "cc-admin-conversion",
    },
    {
      id: "health-products",
      title: "Products",
      body: String(input.activeProducts),
      testId: "cc-admin-products",
    },
  ];
}

export function buildExecutionWidgets(input: {
  activePlans: number;
  openTasks: number;
  completedTasks: number;
}): CommandCenterWidget[] {
  return [
    {
      id: "exec-plans",
      title: "Активные планы",
      body: String(input.activePlans),
      testId: "cc-admin-exec-plans",
    },
    {
      id: "exec-tasks",
      title: "Задачи",
      body: `${input.openTasks} открыто · ${input.completedTasks} выполнено`,
      testId: "cc-admin-exec-tasks",
    },
    {
      id: "exec-progress",
      title: "Прогресс",
      body:
        input.openTasks + input.completedTasks > 0
          ? `${Math.round((input.completedTasks / (input.openTasks + input.completedTasks)) * 100)}%`
          : "—",
      href: ROUTES.ADMIN_EXECUTION,
      testId: "cc-admin-exec-progress",
    },
  ];
}
