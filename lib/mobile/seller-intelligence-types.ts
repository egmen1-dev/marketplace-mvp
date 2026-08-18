import type { SellerActionKind } from "./seller-home";

export type SellerIntelligenceSectionId =
  | "todays_risks"
  | "todays_opportunities"
  | "products_losing_sales"
  | "products_gaining_sales"
  | "low_stock_forecast"
  | "revenue_trend"
  | "top_products"
  | "slow_products"
  | "pending_actions"
  | "completed_actions";

export type SellerInsightEvidence = {
  label: string;
  value: string;
};

export type SellerInsightCta = {
  label: string;
  actionKind: SellerActionKind | null;
  actionPayload: Record<string, string | number | boolean | null> | null;
  route: "orders" | "products" | "wallet" | "profile" | null;
  entityId: string | null;
};

export type SellerInsight = {
  id: string;
  title: string;
  evidence: SellerInsightEvidence[];
  reason: string;
  recommendedAction: string;
  cta: SellerInsightCta;
};

export type SellerIntelligenceSection = {
  id: SellerIntelligenceSectionId;
  title: string;
  insights: SellerInsight[];
};

export type SellerRevenueTrendPoint = {
  date: string;
  revenue: number;
  orders: number;
};

export type MobileSellerIntelligencePayload = {
  generatedAt: string;
  sections: SellerIntelligenceSection[];
  revenueTrend: SellerRevenueTrendPoint[] | null;
  evidenceOnly: true;
  advisoryOnly: true;
};

export const SELLER_INTELLIGENCE_SECTION_TITLES: Record<SellerIntelligenceSectionId, string> = {
  todays_risks: "Риски сегодня",
  todays_opportunities: "Возможности сегодня",
  products_losing_sales: "Товары теряют продажи",
  products_gaining_sales: "Товары набирают продажи",
  low_stock_forecast: "Прогноз низкого остатка",
  revenue_trend: "Динамика выручки",
  top_products: "Топ товары",
  slow_products: "Медленные товары",
  pending_actions: "Ожидают действий",
  completed_actions: "Завершённые действия",
};

export function buildMobileSellerIntelligencePayload(
  input?: Partial<MobileSellerIntelligencePayload>,
): MobileSellerIntelligencePayload {
  return {
    generatedAt: input?.generatedAt ?? new Date().toISOString(),
    sections: input?.sections ?? [],
    revenueTrend: input?.revenueTrend ?? null,
    evidenceOnly: true,
    advisoryOnly: true,
  };
}
