import type { SellerScreenId } from "../blueprints/types";

export type SellerAuditMetric = {
  id: string;
  label: string;
  weight: number;
};

export type SellerScreenAuditProjection = {
  screenId: SellerScreenId;
  projectedScores: Record<string, number>;
  risks: string[];
  sprint: number;
};

/** Pre-implementation product audit projections — EPIC 86 */
export const SELLER_AUDIT_METRICS: SellerAuditMetric[] = [
  { id: "sellerProductivity", label: "Seller Productivity", weight: 1.4 },
  { id: "trust", label: "Trust", weight: 1.2 },
  { id: "clarity", label: "Clarity", weight: 1.2 },
  { id: "businessFeeling", label: "Business Feeling", weight: 1.3 },
  { id: "marketplaceFeeling", label: "Marketplace Feeling", weight: 1.0 },
  { id: "revenueFocus", label: "Revenue Focus", weight: 1.5 },
];

export const SELLER_SCREEN_AUDIT_PROJECTIONS: SellerScreenAuditProjection[] = [
  {
    screenId: "seller_home",
    sprint: 1,
    projectedScores: { sellerProductivity: 9.5, trust: 9.4, clarity: 9.6, businessFeeling: 9.5, marketplaceFeeling: 9.3, revenueFocus: 9.7 },
    risks: ["Legacy MetricCard on current screen", "Placeholder «Последние действия»"],
  },
  {
    screenId: "seller_products",
    sprint: 2,
    projectedScores: { sellerProductivity: 9.2, trust: 9.0, clarity: 9.3, businessFeeling: 9.1, marketplaceFeeling: 9.0, revenueFocus: 9.4 },
    risks: ["FlatList CRUD feel", "No revenue KPI on card"],
  },
  {
    screenId: "seller_product_detail",
    sprint: 3,
    projectedScores: { sellerProductivity: 9.3, trust: 9.2, clarity: 9.4, businessFeeling: 9.3, marketplaceFeeling: 8.9, revenueFocus: 9.5 },
    risks: ["Buyer PDP reuse without seller metrics"],
  },
  {
    screenId: "seller_orders",
    sprint: 4,
    projectedScores: { sellerProductivity: 9.6, trust: 9.5, clarity: 9.5, businessFeeling: 9.4, marketplaceFeeling: 9.2, revenueFocus: 9.3 },
    risks: ["Buyer orders screen reuse"],
  },
  {
    screenId: "seller_finance",
    sprint: 5,
    projectedScores: { sellerProductivity: 9.1, trust: 9.7, clarity: 9.6, businessFeeling: 9.6, marketplaceFeeling: 9.0, revenueFocus: 9.5 },
    risks: ["Legacy WalletCard", "Limited ledger API"],
  },
  {
    screenId: "seller_analytics",
    sprint: 6,
    projectedScores: { sellerProductivity: 9.0, trust: 9.3, clarity: 9.2, businessFeeling: 9.5, marketplaceFeeling: 9.1, revenueFocus: 9.6 },
    risks: ["No dedicated analytics API yet"],
  },
  {
    screenId: "seller_promotion",
    sprint: 7,
    projectedScores: { sellerProductivity: 9.2, trust: 9.1, clarity: 9.3, businessFeeling: 9.4, marketplaceFeeling: 9.2, revenueFocus: 9.5 },
    risks: ["Web-only campaign creation"],
  },
  {
    screenId: "seller_ai_assistant",
    sprint: 8,
    projectedScores: { sellerProductivity: 9.4, trust: 9.2, clarity: 9.5, businessFeeling: 9.6, marketplaceFeeling: 9.3, revenueFocus: 9.6 },
    risks: ["intelligence API single topAction only"],
  },
];

export function computeSellerExperienceIndex(scores: Record<string, number>): number {
  let weighted = 0;
  let total = 0;
  for (const metric of SELLER_AUDIT_METRICS) {
    const value = scores[metric.id];
    if (typeof value !== "number") continue;
    weighted += value * metric.weight;
    total += metric.weight;
  }
  return total > 0 ? Math.round((weighted / total) * 100) / 100 : 0;
}
