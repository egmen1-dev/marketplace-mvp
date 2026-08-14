import { ROUTES } from "@/lib/constants";

export type BusinessPeriodMetrics = {
  viewsTotal: number;
  cartAdds7d: number;
  orders7d: number;
  ordersTotal: number;
};

export type BusinessSummary = {
  headline: string;
  periodLines: string[];
  mainProblem: string | null;
  nextStepHint: string;
};

export type NextBusinessAction = {
  id: string;
  title: string;
  why: string;
  benefit: string;
  ctaLabel: string;
  ctaHref: string;
};

export type GrowthProblemCategory =
  | "product_cards"
  | "sales"
  | "price"
  | "inventory"
  | "promotion";

export type GrowthProblem = {
  id: string;
  category: GrowthProblemCategory;
  title: string;
  explanation: string;
  ctaLabel: string;
  ctaHref: string;
};

export type SellerAssistantSnapshot = {
  headline: string;
  strengths: string[];
  improvements: string[];
  nextStep: string;
  nextStepWhy: string;
  ctaLabel: string;
  ctaHref: string;
};

export type FirstSellerJourneyStep = {
  id: string;
  step: number;
  label: string;
  explanation: string;
  done: boolean;
  href?: string;
};

export type MoneyEducationSnapshot = {
  pendingExplanation: string;
  availableExplanation: string;
  payoutExplanation: string;
  flowSteps: string[];
};

export type PromotionInsight = {
  headline: string;
  bullets: string[];
  recommendation: string;
  ctaLabel: string;
  ctaHref: string;
};

export type SmartEmptyState = {
  kind: "no_products" | "no_sales";
  title: string;
  body: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
} | null;

export type SellerBusinessDashboard = {
  enabled: boolean;
  summary: BusinessSummary;
  nextAction: NextBusinessAction;
  problems: GrowthProblem[];
  assistant: SellerAssistantSnapshot;
  firstJourney: FirstSellerJourneyStep[];
  promotion: PromotionInsight;
  emptyState: SmartEmptyState;
};

export type SellerBusinessNotification = {
  id: string;
  type:
    | "SELLER_FIRST_STEP"
    | "SELLER_PRODUCT_ISSUE"
    | "SELLER_SALES_WARNING"
    | "SELLER_PROMOTION_READY"
    | "SELLER_BALANCE_AVAILABLE"
    | "SELLER_PAYOUT_READY"
    | "SELLER_MILESTONE";
  title: string;
  body: string;
  href?: string;
  createdAt: string;
  read: boolean;
};

export type AdminSellerActivationIntelligence = {
  enabled: boolean;
  sellersWithoutProduct: number;
  sellersWithoutSales: number;
  sellersWithWeakCards: number;
  sellersPromotionReady: number;
  sellersAwaitingPayout: number;
};

export const BUSINESS_HOME = ROUTES.ACCOUNT_BUSINESS;
