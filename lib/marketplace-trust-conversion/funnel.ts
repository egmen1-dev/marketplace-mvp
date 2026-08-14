import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { pctRate } from "@/lib/analytics/funnel-metrics";

import type { TrustFunnelStep } from "./types";

const TRUST_FUNNEL_EVENTS = [
  { id: "product", label: "Открыл товар", event: ANALYTICS_EVENTS.PRODUCT_VIEW },
  { id: "trust-block", label: "Увидел Trust Block", event: ANALYTICS_EVENTS.TRUST_BLOCK_VIEW },
  { id: "trust-details", label: "Открыл объяснение", event: ANALYTICS_EVENTS.TRUST_DETAILS_OPEN },
  { id: "cart", label: "Добавил в корзину", event: ANALYTICS_EVENTS.ADD_TO_CART },
  { id: "purchase", label: "Купил", event: ANALYTICS_EVENTS.PURCHASE_COMPLETE },
] as const;

export function buildTrustConversionFunnel(input: {
  counts: Record<string, number>;
  uniques: Record<string, number>;
}): TrustFunnelStep[] {
  const steps: TrustFunnelStep[] = [];
  let prevUnique = 0;

  for (const step of TRUST_FUNNEL_EVENTS) {
    const uniqueVisitors = input.uniques[step.event] ?? 0;
    const count = input.counts[step.event] ?? 0;
    const conversionFromPrev =
      prevUnique > 0 ? pctRate(uniqueVisitors, prevUnique) : null;

    steps.push({
      id: step.id,
      label: step.label,
      event: step.event,
      count,
      uniqueVisitors,
      conversionFromPrev,
    });

    if (uniqueVisitors > 0) prevUnique = uniqueVisitors;
  }

  return steps;
}
