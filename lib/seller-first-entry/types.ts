import { ROUTES } from "@/lib/constants";

export type SellerFirstEntryStep =
  | "SELLER_START"
  | "PRODUCT_CREATED"
  | "PRODUCT_PUBLISHED"
  | "CARD_IMPROVED"
  | "FIRST_VIEWS"
  | "FIRST_ORDER"
  | "BALANCE_AVAILABLE"
  | "FIRST_PAYOUT";

export type SellerFirstEntryGuide = {
  headline: string;
  why: string;
  actions: string[];
  ctaLabel: string;
  ctaHref: string;
  qualityScore?: number;
  tone: "info" | "success" | "warning";
};

export type SellerFirstEntryJourneyItem = {
  id: string;
  label: string;
  done: boolean;
  current: boolean;
};

export type SellerExperienceProgressDto = {
  sellerId: string;
  startedAt: string;
  completedAt: string | null;
  dismissedAt: string | null;
  currentStep: SellerFirstEntryStep | null;
};

export type SellerFirstEntryDashboard = {
  enabled: boolean;
  showWelcome: boolean;
  showNextStep: boolean;
  step: SellerFirstEntryStep;
  progressCurrent: number;
  progressTotal: number;
  journey: SellerFirstEntryJourneyItem[];
  guide: SellerFirstEntryGuide;
  experience: SellerExperienceProgressDto | null;
  qualityScore: number;
};

export type AdminSellerActivation = {
  enabled: boolean;
  newSellers: number;
  startedOnboarding: number;
  completedOnboarding: number;
  createdFirstProduct: number;
  firstSale: number;
};

export type SellerFirstEntryNotification = {
  id: string;
  type: "SELLER_START_GUIDE" | "SELLER_NEXT_STEP" | "SELLER_MILESTONE";
  title: string;
  body: string;
  href?: string;
  createdAt: string;
  read: boolean;
};

export const FIRST_ENTRY_JOURNEY: ReadonlyArray<{
  id: string;
  label: string;
  minStep: SellerFirstEntryStep;
}> = [
  { id: "create", label: "Создать товар", minStep: "PRODUCT_CREATED" },
  { id: "card", label: "Сделать сильную карточку", minStep: "CARD_IMPROVED" },
  { id: "views", label: "Получить первые просмотры", minStep: "FIRST_VIEWS" },
  { id: "order", label: "Получить первый заказ", minStep: "FIRST_ORDER" },
  { id: "money", label: "Получить деньги", minStep: "FIRST_PAYOUT" },
];

export const FIRST_ENTRY_STEP_ORDER: SellerFirstEntryStep[] = [
  "SELLER_START",
  "PRODUCT_CREATED",
  "PRODUCT_PUBLISHED",
  "CARD_IMPROVED",
  "FIRST_VIEWS",
  "FIRST_ORDER",
  "BALANCE_AVAILABLE",
  "FIRST_PAYOUT",
];

export const SELLER_ENTRY_TRIGGER_PATHS = [
  ROUTES.ACCOUNT_PRODUCTS,
  ROUTES.ACCOUNT_PRODUCTS_NEW,
  ROUTES.ACCOUNT_SALES,
  ROUTES.ACCOUNT_BALANCE,
  ROUTES.ACCOUNT_PAYOUTS,
  ROUTES.ACCOUNT_PROMOTION_CENTER,
  ROUTES.ACCOUNT_COMMAND_CENTER,
] as const;

export function firstEntryStepIndex(step: SellerFirstEntryStep): number {
  return FIRST_ENTRY_STEP_ORDER.indexOf(step);
}

export function firstEntryStepLabel(step: SellerFirstEntryStep): string {
  switch (step) {
    case "SELLER_START":
      return "Старт продавца";
    case "PRODUCT_CREATED":
      return "Товар создан";
    case "PRODUCT_PUBLISHED":
      return "Товар опубликован";
    case "CARD_IMPROVED":
      return "Карточка улучшена";
    case "FIRST_VIEWS":
      return "Первые просмотры";
    case "FIRST_ORDER":
      return "Первый заказ";
    case "BALANCE_AVAILABLE":
      return "Деньги доступны";
    case "FIRST_PAYOUT":
      return "Первая выплата";
    default:
      return step;
  }
}

export const FIRST_ENTRY_TOOLTIPS = {
  productCard:
    "Карточка товара — это ваша витрина. Покупатель принимает решение по ней.",
  photos: "Хорошие фотографии увеличивают доверие покупателей.",
  characteristics: "Характеристики помогают покупателям найти товар.",
  balance:
    "После завершения сделки деньги переходят из ожидания в доступные.",
  promotion:
    "Продвижение помогает показать товар большему количеству покупателей. Результат не гарантируется.",
} as const;
