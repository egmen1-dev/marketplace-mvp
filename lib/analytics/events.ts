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
  /** DESIGN-001 homepage — hero featured product tap */
  HERO_PRODUCT_CLICK: "hero_product_click",
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
  /** EPIC-FINANCE-001 — finance layer events (no PII) */
  TRANSACTION_CREATED: "transaction_created",
  PAYMENT_HELD: "payment_held",
  PAYMENT_RELEASED: "payment_released",
  REFUND_CREATED: "refund_created",
  DISPUTE_CREATED: "dispute_created",
  /** SELLER-PAYOUT-001 — payout workflow events (no PII) */
  PAYOUT_PAGE_VIEW: "payout_page_view",
  PAYOUT_REQUEST_STARTED: "payout_request_started",
  PAYOUT_REQUEST_CREATED: "payout_request_created",
  PAYOUT_COMPLETED: "payout_completed",
  PAYOUT_REJECTED: "payout_rejected",
  /** SELLER-LIFECYCLE-001 — seller journey events (no PII) */
  SELLER_JOURNEY_VIEW: "seller_journey_view",
  SELLER_MILESTONE_REACHED: "seller_milestone_reached",
  SELLER_NEXT_STEP_CLICK: "seller_next_step_click",
  SELLER_ACTIVATION_COMPLETED: "seller_activation_completed",
  SELLER_FIRST_SALE: "seller_first_sale",
  SELLER_FIRST_PAYOUT: "seller_first_payout",
  /** SELLER-FIRST-ENTRY-001 — seller activation events (no PII) */
  SELLER_ENTRY_STARTED: "seller_entry_started",
  SELLER_ONBOARDING_STARTED: "seller_onboarding_started",
  SELLER_ONBOARDING_STEP_COMPLETED: "seller_onboarding_step_completed",
  SELLER_ONBOARDING_COMPLETED: "seller_onboarding_completed",
  SELLER_GUIDE_ACTION_CLICK: "seller_guide_action_click",
  /** SELLER-JOURNEY-UX-002 — unified seller journey UX (no PII) */
  SELLER_STEP_VIEW: "seller_step_view",
  SELLER_NEXT_ACTION_CLICK: "seller_next_action_click",
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
