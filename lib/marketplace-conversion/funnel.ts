import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { buildFunnelStepMetrics, pctRate } from "@/lib/analytics/funnel-metrics";

export type FunnelStepDisplay = {
  id: string;
  label: string;
  count: number;
  uniqueVisitors: number;
  conversionFromPrevious: number | null;
  dropOff: number | null;
};

export const BUYER_FUNNEL_STEPS = [
  { id: "landing", event: ANALYTICS_EVENTS.LANDING_VIEW, label: "Landing" },
  { id: "homepage", event: ANALYTICS_EVENTS.PAGE_VIEW, label: "Homepage" },
  {
    id: "discovery",
    event: ANALYTICS_EVENTS.DISCOVERY_VIEW,
    label: "Search / Discovery",
  },
  { id: "product", event: ANALYTICS_EVENTS.PRODUCT_VIEW, label: "Product View" },
  { id: "cart", event: ANALYTICS_EVENTS.ADD_TO_CART, label: "Add Cart" },
  { id: "checkout", event: ANALYTICS_EVENTS.CHECKOUT_START, label: "Checkout" },
  {
    id: "payment",
    event: ANALYTICS_EVENTS.PURCHASE_COMPLETE,
    label: "Payment",
  },
  {
    id: "delivery",
    event: ANALYTICS_EVENTS.DELIVERY_COMPLETED,
    label: "Delivery",
  },
  { id: "review", event: ANALYTICS_EVENTS.REVIEW_CREATED, label: "Review" },
] as const;

export function buildBuyerFunnelDisplay(input: {
  counts: Record<string, number>;
  uniques: Record<string, number>;
}): FunnelStepDisplay[] {
  const metrics = buildFunnelStepMetrics(
    BUYER_FUNNEL_STEPS.map((s) => ({ event: s.event, label: s.label })),
    input.counts,
    input.uniques,
  );

  return metrics.map((m, i) => ({
    id: BUYER_FUNNEL_STEPS[i]!.id,
    label: m.label,
    count: m.count,
    uniqueVisitors: m.uniqueVisitors,
    conversionFromPrevious: m.conversionFromPrevious,
    dropOff: m.dropOff,
  }));
}

export function funnelSummaryLine(steps: FunnelStepDisplay[]): string[] {
  const traffic = steps.find((s) => s.id === "homepage")?.uniqueVisitors ?? steps[0]?.uniqueVisitors ?? 0;
  const lines: string[] = [`${traffic} посетителей`];

  for (const step of steps) {
    if (step.id === "homepage") continue;
    if (step.uniqueVisitors <= 0 && step.count <= 0) continue;
    const pct = pctRate(step.uniqueVisitors, traffic);
    lines.push(`↓ ${step.uniqueVisitors} ${step.label.toLowerCase()}${pct != null ? ` (${pct}%)` : ""}`);
  }

  return lines;
}
