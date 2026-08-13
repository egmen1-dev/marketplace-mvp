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
  TRUST_BLOCK_VIEW: "trust_block_view",
  CTA_CLICK: "cta_click",
  /** Featured hero product card click (homepage). */
  HERO_PRODUCT_CLICK: "hero_product_click",
  /** Paid/ad traffic landing — fired when homepage loads with UTM attribution. */
  AD_LANDING_VIEW: "ad_landing_view",
  /** PDP section entered viewport */
  PDP_SECTION_VIEW: "pdp_section_view",
  /** Seller card / trust seller block viewed */
  SELLER_BLOCK_VIEW: "seller_block_view",
  /** Buyer expanded characteristics */
  CHARACTERISTICS_EXPAND: "characteristics_expand",
  /** Delivery section viewed */
  DELIVERY_VIEW: "delivery_view",
  /** Strong buy intent (buy / sticky buy / reserve) */
  BUY_INTENT: "buy_intent",
  /** DESIGN-001 homepage — category tile tap */
  CATEGORY_CLICK: "category_click",
  /** DESIGN-001 homepage — search field focused / started */
  SEARCH_START: "search_start",
  /** DESIGN-001 homepage — popular products grid tap */
  POPULAR_PRODUCT_CLICK: "popular_product_click",
  /** DESIGN-001 homepage — scroll depth milestone */
  SCROLL_HOMEPAGE: "scroll_homepage",
  /** DESIGN-001 homepage — sell / seller CTA tap */
  CTA_SELL_CLICK: "cta_sell_click",
  /** Trust: buyer confirmed receipt */
  BUYER_CONFIRMATION: "buyer_confirmation",
  /** Trust: dispute opened */
  DISPUTE_CREATED: "dispute_created",
  /** Trust: dispute resolved by admin */
  DISPUTE_RESOLVED: "dispute_resolved",
  /** Trust: seller trust score viewed on PDP */
  SELLER_TRUST_VIEW: "seller_trust_view",
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
  /** Anonymous visitor cookie id */
  visitorId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
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
  { event: ANALYTICS_EVENTS.CATEGORY_VIEW, label: "Catalog view" },
  { event: ANALYTICS_EVENTS.PRODUCT_VIEW, label: "Product view" },
  { event: ANALYTICS_EVENTS.ADD_TO_CART, label: "Add to cart" },
  { event: ANALYTICS_EVENTS.CHECKOUT_START, label: "Checkout start" },
  { event: ANALYTICS_EVENTS.PURCHASE_COMPLETE, label: "Purchase" },
];

/** Full ads measurement funnel including traffic entry. */
export const MEASUREMENT_FUNNEL: ReadonlyArray<{
  event: AnalyticsEventName;
  label: string;
}> = [
  { event: ANALYTICS_EVENTS.PAGE_VIEW, label: "Traffic" },
  ...FUNNEL_STEPS,
];
