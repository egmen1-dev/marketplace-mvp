import type {
  SellerInsight,
  SellerIntelligenceDashboard,
  SellerIntelligenceSection,
  SellerIntelligenceSectionId,
  SellerRevenueTrendPoint,
} from "../../../domain/contracts/entities/seller";

export type { SellerIntelligenceSectionId };
export type SellerInsightView = SellerInsight;
export type SellerIntelligenceSectionView = SellerIntelligenceSection;

export type SellerRevenueTrendPointView = SellerRevenueTrendPoint;

export type SellerIntelligenceView = {
  generatedAt: string;
  sections: SellerIntelligenceSectionView[];
  revenueTrend: SellerRevenueTrendPointView[] | null;
  sectionMap: Record<SellerIntelligenceSectionId, SellerIntelligenceSectionView | undefined>;
};

export const SELLER_INTELLIGENCE_SECTION_LABELS: Record<SellerIntelligenceSectionId, string> = {
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

export const SELLER_INTELLIGENCE_SECTION_ORDER: SellerIntelligenceSectionId[] = [
  "todays_risks",
  "todays_opportunities",
  "products_losing_sales",
  "products_gaining_sales",
  "low_stock_forecast",
  "revenue_trend",
  "top_products",
  "slow_products",
  "pending_actions",
  "completed_actions",
];

export function sellerIntelligenceToView(dashboard: SellerIntelligenceDashboard): SellerIntelligenceView {
  const sectionMap = {} as Record<SellerIntelligenceSectionId, SellerIntelligenceSectionView | undefined>;
  for (const section of dashboard.sections) {
    sectionMap[section.id] = section;
  }
  return {
    generatedAt: dashboard.generatedAt,
    sections: [...dashboard.sections],
    revenueTrend: dashboard.revenueTrend ? [...dashboard.revenueTrend] : null,
    sectionMap,
  };
}

export function insightToWorkspaceTask(insight: SellerInsightView): import("../seller-view").SellerWorkspaceItemView {
  return {
    id: insight.id,
    title: insight.title,
    subtitle: insight.recommendedAction,
    priority: "important",
    source: "notifications",
    section: "todays_work",
    action: insight.cta.route ?? "products",
    entityId: insight.cta.entityId,
    resumeKey: null,
    completedAt: null,
    actionKind: insight.cta.actionKind,
    actionPayload: insight.cta.actionPayload,
    supportsUndo: false,
  };
}

export function formatTrendDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" });
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}
