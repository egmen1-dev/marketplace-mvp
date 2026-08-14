import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

export type JourneyStage = {
  id: string;
  label: string;
  events: string[];
};

/** Buyer journey stages mapped to analytics events (read-only). */
export const BUYER_JOURNEY_STAGES: JourneyStage[] = [
  {
    id: "awareness",
    label: "Awareness",
    events: [ANALYTICS_EVENTS.LANDING_VIEW, ANALYTICS_EVENTS.PAGE_VIEW],
  },
  {
    id: "consideration",
    label: "Consideration",
    events: [
      ANALYTICS_EVENTS.DISCOVERY_VIEW,
      ANALYTICS_EVENTS.SEARCH_USED,
      ANALYTICS_EVENTS.CATEGORY_VIEW,
    ],
  },
  {
    id: "intent",
    label: "Intent",
    events: [ANALYTICS_EVENTS.PRODUCT_VIEW, ANALYTICS_EVENTS.BUY_INTENT],
  },
  {
    id: "conversion",
    label: "Conversion",
    events: [
      ANALYTICS_EVENTS.ADD_TO_CART,
      ANALYTICS_EVENTS.CHECKOUT_START,
      ANALYTICS_EVENTS.PURCHASE_COMPLETE,
    ],
  },
  {
    id: "retention",
    label: "Retention",
    events: [
      ANALYTICS_EVENTS.DELIVERY_COMPLETED,
      ANALYTICS_EVENTS.REVIEW_CREATED,
    ],
  },
];

export function stageCounts(
  counts: Record<string, number>,
): Array<{ stage: JourneyStage; total: number }> {
  return BUYER_JOURNEY_STAGES.map((stage) => ({
    stage,
    total: stage.events.reduce((sum, e) => sum + (counts[e] ?? 0), 0),
  }));
}
