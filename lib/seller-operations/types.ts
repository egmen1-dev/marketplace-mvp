import { ROUTES } from "@/lib/constants";

export type OperationsTaskPriority = "high" | "medium" | "low";

export type OperationsTaskCategory =
  | "order"
  | "product"
  | "inventory"
  | "promotion"
  | "money"
  | "growth";

export type SellerDailyPriority = {
  rank: number;
  id: string;
  category: OperationsTaskCategory;
  priority: OperationsTaskPriority;
  title: string;
  why: string;
  ctaLabel: string;
  ctaHref: string;
};

export type TodaySummaryLine = {
  id: string;
  label: string;
  count?: number;
  highlight?: boolean;
};

export type OrderOperationsSnapshot = {
  newOrders: number;
  shipToday: number;
  overdue: number;
  inProgress: number;
  awaitingShipment: number;
  ctaHref: string;
};

export type ProductAttentionItem = {
  id: string;
  productId: string;
  productName: string;
  type: "no_sales" | "low_stock" | "weak_card";
  headline: string;
  reason: string;
  suggestion: string;
  qualityScore?: number;
  stockLeft?: number;
  views?: number;
  ctaLabel: string;
  ctaHref: string;
};

export type InventoryInsight = {
  id: string;
  productId: string;
  productName: string;
  kind: "popular" | "attention" | "low_stock";
  label: string;
  detail: string;
};

export type AiDailyAdvice = {
  headline: string;
  opportunity: string;
  action: string;
  why: string;
  ctaLabel: string;
  ctaHref: string;
};

export type PromotionTodaySnapshot = {
  activeCampaigns: number;
  bestCampaign: { name: string; metric: string } | null;
  weakCampaign: { name: string; recommendation: string } | null;
  ctaHref: string;
};

export type MoneyOperationsSnapshot = {
  salesTotal: number;
  pendingAmount: number;
  availableAmount: number;
  paidAmount: number;
  ctaLabel: string;
  ctaHref: string;
};

export type DevelopmentChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export type OperationsEmptyState = {
  kind: "no_products" | "no_sales";
  title: string;
  body: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
} | null;

export type SellerOperationsWorkspace = {
  enabled: boolean;
  mode: "today";
  todaySummary: TodaySummaryLine[];
  priorities: SellerDailyPriority[];
  orders: OrderOperationsSnapshot;
  products: ProductAttentionItem[];
  inventory: InventoryInsight[];
  aiAdvice: AiDailyAdvice;
  promotion: PromotionTodaySnapshot;
  money: MoneyOperationsSnapshot;
  checklist: DevelopmentChecklistItem[];
  emptyState: OperationsEmptyState;
  resultSummary: string;
};

export type SellerOperationsNotification = {
  id: string;
  type:
    | "ORDER_ACTION_REQUIRED"
    | "PRODUCT_NEEDS_ATTENTION"
    | "STOCK_WARNING"
    | "AI_DAILY_RECOMMENDATION"
    | "PROMOTION_INSIGHT"
    | "PAYOUT_AVAILABLE";
  title: string;
  body: string;
  href?: string;
  createdAt: string;
  read: boolean;
};

export type AdminOperationsHealth = {
  enabled: boolean;
  sellersWithOpenTasks: number;
  sellersWithOverdueOrders: number;
  productsWithoutSales: number;
  growthPotentialSellers: number;
};

export const OPERATIONS_HOME = ROUTES.ACCOUNT_BUSINESS;
