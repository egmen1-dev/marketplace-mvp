import { ROUTES } from "@/lib/constants";
import type { SellerProgressSignals } from "@/lib/seller-lifecycle/progress";
import type { NextBusinessAction } from "./types";
import type { GrowthProblem } from "./types";
import type { SellerBusinessNotification } from "./types";

export function buildBusinessNotifications(input: {
  signals: SellerProgressSignals;
  nextAction: NextBusinessAction;
  problems: GrowthProblem[];
}): SellerBusinessNotification[] {
  const now = new Date().toISOString();
  const notifications: SellerBusinessNotification[] = [];

  if (input.signals.totalProducts === 0) {
    notifications.push({
      id: "bi-first-step",
      type: "SELLER_FIRST_STEP",
      title: "Первый шаг продавца",
      body: "Создайте первый товар — это ваша витрина на маркетплейсе.",
      href: ROUTES.ACCOUNT_PRODUCTS_NEW,
      createdAt: now,
      read: false,
    });
  }

  const productIssue = input.problems.find((p) => p.category === "product_cards");
  if (productIssue) {
    notifications.push({
      id: "bi-product-issue",
      type: "SELLER_PRODUCT_ISSUE",
      title: productIssue.title,
      body: productIssue.explanation,
      href: productIssue.ctaHref,
      createdAt: now,
      read: false,
    });
  }

  if (input.signals.viewsSum >= 100 && input.signals.ordersCount === 0) {
    notifications.push({
      id: "bi-sales-warning",
      type: "SELLER_SALES_WARNING",
      title: `Ваш товар посмотрели ${input.signals.viewsSum} человек`,
      body: "Проверьте карточку — возможно, покупателю не хватает информации.",
      href: ROUTES.ACCOUNT_BUSINESS,
      createdAt: now,
      read: false,
    });
  }

  const promo = input.problems.find((p) => p.category === "promotion");
  if (promo) {
    notifications.push({
      id: "bi-promotion-ready",
      type: "SELLER_PROMOTION_READY",
      title: promo.title,
      body: promo.explanation,
      href: promo.ctaHref,
      createdAt: now,
      read: false,
    });
  }

  if (input.signals.availableBalance > 0) {
    notifications.push({
      id: "bi-balance-available",
      type: "SELLER_BALANCE_AVAILABLE",
      title: "Деньги доступны",
      body: `${input.signals.availableBalance.toLocaleString("ru-RU")} ₽ к выводу`,
      href: ROUTES.ACCOUNT_PAYOUTS,
      createdAt: now,
      read: false,
    });
  }

  if (input.signals.ordersCount === 1) {
    notifications.push({
      id: "bi-first-sale",
      type: "SELLER_MILESTONE",
      title: "Поздравляем! У вас первая продажа",
      body: "Завершите заказ вовремя — это путь к первой выплате.",
      href: ROUTES.ACCOUNT_SALES,
      createdAt: now,
      read: false,
    });
  }

  if (input.signals.availableBalance > 0 && input.signals.completedPayouts === 0) {
    notifications.push({
      id: "bi-payout-ready",
      type: "SELLER_PAYOUT_READY",
      title: "Можно вывести средства",
      body: "Заказ выполнен — создайте заявку на вывод.",
      href: ROUTES.ACCOUNT_PAYOUTS,
      createdAt: now,
      read: false,
    });
  }

  if (notifications.length === 0) {
    notifications.push({
      id: "bi-next-action",
      type: "SELLER_FIRST_STEP",
      title: "Ваш следующий шаг",
      body: input.nextAction.title,
      href: input.nextAction.ctaHref,
      createdAt: now,
      read: false,
    });
  }

  return notifications.slice(0, 8);
}
