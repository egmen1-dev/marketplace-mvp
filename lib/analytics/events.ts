/** Conversion funnel events — no PII. Provider-agnostic names. */
export const ANALYTICS_EVENTS = {
  PAGE_VIEW: "page_view",
  LANDING_VIEW: "landing_view",
  CATEGORY_VIEW: "category_view",
  PRODUCT_VIEW: "product_view",
  SEARCH_USED: "search_used",
  ADD_TO_CART: "add_to_cart",
  CHECKOUT_START: "checkout_start",
  PURCHASE_COMPLETE: "purchase_complete",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export const ANALYTICS_EVENT_NAMES = Object.values(
  ANALYTICS_EVENTS,
) as AnalyticsEventName[];

export type AnalyticsEventPayload = {
  event: AnalyticsEventName;
  route?: string;
  /** Product id, category slug, etc. — never email/phone. */
  entityId?: string;
  webview?: boolean;
};

export function isAnalyticsEventName(value: string): value is AnalyticsEventName {
  return (ANALYTICS_EVENT_NAMES as string[]).includes(value);
}

/** Ordered funnel steps for dashboards. */
export const FUNNEL_STEPS: ReadonlyArray<{
  event: AnalyticsEventName;
  label: string;
}> = [
  { event: ANALYTICS_EVENTS.LANDING_VIEW, label: "Landing view" },
  { event: ANALYTICS_EVENTS.CATEGORY_VIEW, label: "Catalog / category" },
  { event: ANALYTICS_EVENTS.PRODUCT_VIEW, label: "Product view" },
  { event: ANALYTICS_EVENTS.ADD_TO_CART, label: "Add to cart" },
  { event: ANALYTICS_EVENTS.CHECKOUT_START, label: "Checkout start" },
  { event: ANALYTICS_EVENTS.PURCHASE_COMPLETE, label: "Purchase complete" },
];
