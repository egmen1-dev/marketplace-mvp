import { ROUTES } from "@/lib/constants";

/** Canonical seller journey state machine (computed from signals). */
export type SellerJourneyStep =
  | "NOT_STARTED"
  | "SELLER_STARTED"
  | "FIRST_PRODUCT_CREATED"
  | "PRODUCT_PUBLISHED"
  | "PRODUCT_READY"
  | "FIRST_VISITS"
  | "FIRST_CART"
  | "FIRST_ORDER"
  | "ORDER_COMPLETED"
  | "BALANCE_AVAILABLE"
  | "FIRST_PAYOUT"
  | "GROWING_SELLER";

export type SellerJourneyMilestoneType =
  | "FIRST_PRODUCT"
  | "FIRST_VIEW"
  | "FIRST_CART"
  | "FIRST_ORDER"
  | "FIRST_COMPLETED_ORDER"
  | "FIRST_PAYOUT";

export type SellerJourneyChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  current: boolean;
  href?: string;
};

export type SellerJourneyCoach = {
  headline: string;
  why: string;
  body: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
  tone: "info" | "success" | "warning";
};

export type SellerJourneyMilestone = {
  type: SellerJourneyMilestoneType;
  label: string;
  emoji: string;
  achievedAt: string | null;
};

export type SellerJourneyDashboard = {
  enabled: boolean;
  step: SellerJourneyStep;
  stepLabel: string;
  progressPercent: number;
  progressCurrent: number;
  progressTotal: number;
  checklist: SellerJourneyChecklistItem[];
  coach: SellerJourneyCoach;
  milestones: SellerJourneyMilestone[];
  nextAction: SellerJourneyChecklistItem | null;
};

export type SellerJourneyEmptyState = {
  title: string;
  body: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
};

export type AdminSellerJourneyFunnelStep = {
  label: string;
  count: number;
  percentOfPrevious: number | null;
  percentOfStarted: number;
};

export type AdminSellerJourneyFunnel = {
  enabled: boolean;
  started: number;
  steps: AdminSellerJourneyFunnelStep[];
};

export type SellerJourneyNotification = {
  id: string;
  type:
    | "SELLER_NEXT_STEP"
    | "SELLER_PROGRESS"
    | "SELLER_MILESTONE"
    | "SELLER_FIRST_ORDER"
    | "SELLER_FIRST_PAYOUT";
  title: string;
  body: string;
  href?: string;
  createdAt: string;
  read: boolean;
};

export const JOURNEY_STEP_ORDER: SellerJourneyStep[] = [
  "NOT_STARTED",
  "SELLER_STARTED",
  "FIRST_PRODUCT_CREATED",
  "PRODUCT_PUBLISHED",
  "PRODUCT_READY",
  "FIRST_VISITS",
  "FIRST_CART",
  "FIRST_ORDER",
  "ORDER_COMPLETED",
  "BALANCE_AVAILABLE",
  "FIRST_PAYOUT",
  "GROWING_SELLER",
];

export const JOURNEY_CHECKLIST_DEFINITIONS: ReadonlyArray<{
  id: string;
  label: string;
  minStep: SellerJourneyStep;
}> = [
  { id: "seller", label: "Создать аккаунт продавца", minStep: "SELLER_STARTED" },
  { id: "product", label: "Добавить первый товар", minStep: "FIRST_PRODUCT_CREATED" },
  {
    id: "card",
    label: "Сделать карточку привлекательной",
    minStep: "PRODUCT_READY",
  },
  { id: "visits", label: "Получить первые просмотры", minStep: "FIRST_VISITS" },
  { id: "order", label: "Получить первый заказ", minStep: "FIRST_ORDER" },
  { id: "money", label: "Получить деньги", minStep: "FIRST_PAYOUT" },
];

export function journeyStepIndex(step: SellerJourneyStep): number {
  return JOURNEY_STEP_ORDER.indexOf(step);
}

export function journeyStepLabel(step: SellerJourneyStep): string {
  switch (step) {
    case "NOT_STARTED":
      return "Не начат";
    case "SELLER_STARTED":
      return "Продавец активирован";
    case "FIRST_PRODUCT_CREATED":
      return "Первый товар создан";
    case "PRODUCT_PUBLISHED":
      return "Товар опубликован";
    case "PRODUCT_READY":
      return "Карточка готова";
    case "FIRST_VISITS":
      return "Первые просмотры";
    case "FIRST_CART":
      return "Первое добавление в корзину";
    case "FIRST_ORDER":
      return "Первый заказ";
    case "ORDER_COMPLETED":
      return "Сделка завершена";
    case "BALANCE_AVAILABLE":
      return "Баланс доступен";
    case "FIRST_PAYOUT":
      return "Первая выплата";
    case "GROWING_SELLER":
      return "Растущий продавец";
    default:
      return step;
  }
}

export function milestoneLabel(type: SellerJourneyMilestoneType): string {
  switch (type) {
    case "FIRST_PRODUCT":
      return "Первый товар создан";
    case "FIRST_VIEW":
      return "Первый покупатель посмотрел товар";
    case "FIRST_CART":
      return "Первое добавление в корзину";
    case "FIRST_ORDER":
      return "Первая продажа";
    case "FIRST_COMPLETED_ORDER":
      return "Первая завершённая сделка";
    case "FIRST_PAYOUT":
      return "Первая выплата";
    default:
      return type;
  }
}

export function milestoneEmoji(type: SellerJourneyMilestoneType): string {
  switch (type) {
    case "FIRST_PRODUCT":
      return "🎉";
    case "FIRST_VIEW":
      return "👀";
    case "FIRST_CART":
      return "🛒";
    case "FIRST_ORDER":
      return "🎉";
    case "FIRST_COMPLETED_ORDER":
      return "✅";
    case "FIRST_PAYOUT":
      return "💰";
    default:
      return "✓";
  }
}

export function checklistHref(id: string): string | undefined {
  switch (id) {
    case "product":
      return ROUTES.ACCOUNT_PRODUCTS_NEW;
    case "card":
    case "visits":
      return ROUTES.ACCOUNT_PRODUCTS;
    case "order":
      return ROUTES.ACCOUNT_SALES;
    case "money":
      return ROUTES.ACCOUNT_BALANCE;
    default:
      return undefined;
  }
}
