export type SellerLifecycleStage =
  | "NOT_STARTED"
  | "SELLER_ACTIVATED"
  | "FIRST_PRODUCT_CREATED"
  | "FIRST_PRODUCT_PUBLISHED"
  | "PRODUCT_OPTIMIZED"
  | "FIRST_VIEWS"
  | "FIRST_CART"
  | "FIRST_ORDER"
  | "ORDER_COMPLETED"
  | "BALANCE_AVAILABLE"
  | "FIRST_PAYOUT"
  | "GROWING_SELLER";

export type SellerMilestoneType =
  | "FIRST_PRODUCT"
  | "FIRST_VIEW"
  | "FIRST_FAVORITE"
  | "FIRST_CART"
  | "FIRST_ORDER"
  | "FIRST_PAYOUT";

export type SellerJourneyStep = {
  id: string;
  label: string;
  done: boolean;
  current: boolean;
  href?: string;
};

export type SellerJourneyCoach = {
  headline: string;
  body: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
  tone: "info" | "success" | "warning";
};

export type SellerMilestone = {
  type: SellerMilestoneType;
  label: string;
  emoji: string;
  achievedAt: string | null;
};

export type SellerLifecycleDashboard = {
  enabled: boolean;
  stage: SellerLifecycleStage;
  stageLabel: string;
  progressCurrent: number;
  progressTotal: number;
  steps: SellerJourneyStep[];
  coach: SellerJourneyCoach;
  milestones: SellerMilestone[];
  nextStep: SellerJourneyStep | null;
};

export type AdminSellerFunnelStep = {
  label: string;
  count: number;
  percentOfPrevious: number | null;
  percentOfStarted: number;
};

export type AdminSellerFunnel = {
  enabled: boolean;
  started: number;
  steps: AdminSellerFunnelStep[];
};

export type SellerLifecycleNotification = {
  id: string;
  type:
    | "SELLER_NEXT_STEP"
    | "SELLER_MILESTONE"
    | "SELLER_PROGRESS"
    | "SELLER_MONEY_AVAILABLE";
  title: string;
  body: string;
  href?: string;
  createdAt: string;
  read: boolean;
};

export const JOURNEY_STEP_DEFINITIONS: ReadonlyArray<{
  id: string;
  label: string;
  minStage: SellerLifecycleStage;
}> = [
  { id: "activated", label: "Аккаунт продавца создан", minStage: "SELLER_ACTIVATED" },
  { id: "product", label: "Создайте первый товар", minStage: "FIRST_PRODUCT_CREATED" },
  { id: "published", label: "Опубликуйте товар", minStage: "FIRST_PRODUCT_PUBLISHED" },
  { id: "views", label: "Получите первые просмотры", minStage: "FIRST_VIEWS" },
  { id: "order", label: "Получите первый заказ", minStage: "FIRST_ORDER" },
  { id: "completed", label: "Завершите сделку", minStage: "ORDER_COMPLETED" },
  { id: "balance", label: "Деньги доступны", minStage: "BALANCE_AVAILABLE" },
  { id: "payout", label: "Выведите деньги", minStage: "FIRST_PAYOUT" },
];

export const STAGE_ORDER: SellerLifecycleStage[] = [
  "NOT_STARTED",
  "SELLER_ACTIVATED",
  "FIRST_PRODUCT_CREATED",
  "FIRST_PRODUCT_PUBLISHED",
  "PRODUCT_OPTIMIZED",
  "FIRST_VIEWS",
  "FIRST_CART",
  "FIRST_ORDER",
  "ORDER_COMPLETED",
  "BALANCE_AVAILABLE",
  "FIRST_PAYOUT",
  "GROWING_SELLER",
];

export function stageIndex(stage: SellerLifecycleStage): number {
  return STAGE_ORDER.indexOf(stage);
}

export function stageLabel(stage: SellerLifecycleStage): string {
  switch (stage) {
    case "NOT_STARTED":
      return "Не начат";
    case "SELLER_ACTIVATED":
      return "Продавец активирован";
    case "FIRST_PRODUCT_CREATED":
      return "Первый товар создан";
    case "FIRST_PRODUCT_PUBLISHED":
      return "Товар опубликован";
    case "PRODUCT_OPTIMIZED":
      return "Карточка улучшена";
    case "FIRST_VIEWS":
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
      return stage;
  }
}

export function milestoneLabel(type: SellerMilestoneType): string {
  switch (type) {
    case "FIRST_PRODUCT":
      return "Первый товар опубликован";
    case "FIRST_VIEW":
      return "Первый покупатель посмотрел товар";
    case "FIRST_FAVORITE":
      return "Первое добавление в избранное";
    case "FIRST_CART":
      return "Первое добавление в корзину";
    case "FIRST_ORDER":
      return "Первая продажа";
    case "FIRST_PAYOUT":
      return "Первая выплата";
    default:
      return type;
  }
}

export function milestoneEmoji(type: SellerMilestoneType): string {
  switch (type) {
    case "FIRST_PRODUCT":
      return "🎉";
    case "FIRST_VIEW":
      return "👀";
    case "FIRST_FAVORITE":
      return "❤️";
    case "FIRST_CART":
      return "🛒";
    case "FIRST_ORDER":
      return "🎉";
    case "FIRST_PAYOUT":
      return "💰";
    default:
      return "✓";
  }
}
