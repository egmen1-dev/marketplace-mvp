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
  /** Promotion MVP — seller promotion panel viewed */
  PROMOTION_VIEW: "promotion_view",
  /** Promotion MVP — seller started promotion */
  PROMOTION_START: "promotion_start",
  /** Promotion MVP — seller paused promotion */
  PROMOTION_PAUSE: "promotion_pause",
  /** Promotion distribution — surface impression */
  PROMOTION_IMPRESSION: "promotion_impression",
  /** Promotion distribution — surface click */
  PROMOTION_CLICK: "promotion_click",
  /** Promotion analytics — seller campaign card viewed */
  PROMOTION_CAMPAIGN_VIEW: "promotion_campaign_view",
  /** Promotion analytics — seller dashboard viewed */
  PROMOTION_DASHBOARD_VIEW: "promotion_dashboard_view",
  /** Promotion analytics — ROI block viewed */
  PROMOTION_ROI_VIEW: "promotion_roi_view",
  /** Promotion billing — seller started checkout */
  PROMOTION_PURCHASE_STARTED: "promotion_purchase_started",
  /** Promotion billing — Stripe payment succeeded */
  PROMOTION_PAYMENT_SUCCESS: "promotion_payment_success",
  /** Promotion billing — paid period ended */
  PROMOTION_EXPIRED: "promotion_expired",
  /** Promotion intelligence — recommendations block viewed */
  PROMOTION_RECOMMENDATION_VIEW: "promotion_recommendation_view",
  /** Promotion intelligence — recommendation row clicked */
  PROMOTION_RECOMMENDATION_CLICK: "promotion_recommendation_click",
  /** Promotion intelligence — seller acted on recommendation */
  PROMOTION_RECOMMENDATION_ACCEPT: "promotion_recommendation_accept",
  /** Seller growth — dashboard viewed */
  SELLER_GROWTH_VIEW: "seller_growth_view",
  /** Seller growth — insight viewed */
  SELLER_INSIGHT_VIEW: "seller_insight_view",
  /** Seller growth — action clicked */
  SELLER_ACTION_CLICK: "seller_action_click",
  /** Seller growth — action completed (navigation) */
  SELLER_ACTION_COMPLETE: "seller_action_complete",
  /** Buyer intelligence — search intent parsed */
  BUYER_INTENT_DETECTED: "buyer_intent_detected",
  /** Buyer intelligence — advisory recommendations block viewed */
  BUYER_RECOMMENDATION_VIEW: "buyer_recommendation_view",
  /** Buyer intelligence — advisory recommendation clicked */
  BUYER_RECOMMENDATION_CLICK: "buyer_recommendation_click",
  /** Buyer intelligence — product match score computed */
  BUYER_MATCH_SCORE: "buyer_match_score",
  /** Marketplace intelligence — dashboard viewed */
  INTELLIGENCE_VIEW: "intelligence_view",
  /** Marketplace intelligence — opportunity block viewed */
  OPPORTUNITY_VIEW: "opportunity_view",
  /** Marketplace intelligence — recommendation clicked */
  INTELLIGENCE_RECOMMENDATION_CLICK: "recommendation_click",
  /** Marketplace operator — dashboard viewed */
  OPERATOR_VIEW: "operator_view",
  /** Marketplace operator — strategy block viewed */
  STRATEGY_VIEW: "strategy_view",
  /** Marketplace operator — action plan viewed */
  ACTION_PLAN_VIEW: "action_plan_view",
  /** Marketplace operator — operator marks plan for execution (advisory) */
  RECOMMENDATION_EXECUTE: "recommendation_execute",
  /** Marketplace execution — dashboard viewed */
  EXECUTION_VIEW: "execution_view",
  /** Marketplace execution — plan materialized */
  EXECUTION_PLAN_CREATED: "execution_plan_created",
  /** Marketplace execution — human started task */
  TASK_STARTED: "task_started",
  /** Marketplace execution — human completed task */
  TASK_COMPLETED: "task_completed",
  /** Marketplace execution — all plan tasks done */
  PLAN_COMPLETED: "plan_completed",
  /** Marketplace communication — dashboard viewed */
  COMMUNICATION_VIEW: "communication_view",
  /** Marketplace communication — campaign materialized */
  COMMUNICATION_CAMPAIGN_CREATED: "communication_campaign_created",
  /** Marketplace communication — message approved by human */
  COMMUNICATION_MESSAGE_APPROVED: "communication_message_approved",
  /** Marketplace communication — send recorded (no auto email yet) */
  COMMUNICATION_MESSAGE_SENT: "communication_message_sent",
  /** Marketplace communication — recipient clicked CTA */
  COMMUNICATION_CLICKED: "communication_clicked",
  /** Marketplace communication — downstream conversion signal */
  COMMUNICATION_CONVERSION: "communication_conversion",
  /** Marketplace education — guidance surface viewed */
  EDUCATION_VIEW: "education_view",
  /** Marketplace education — guide/checklist started */
  EDUCATION_GUIDE_STARTED: "guide_started",
  /** Marketplace education — guide/checklist completed */
  EDUCATION_GUIDE_COMPLETED: "guide_completed",
  /** Marketplace education — contextual tooltip opened */
  EDUCATION_TOOLTIP_OPEN: "tooltip_open",
  /** @deprecated Use EDUCATION_TOOLTIP_OPEN */
  EDUCATION_TOOLTIP_OPENED: "tooltip_open",
  /** Marketplace education — AI coach CTA clicked */
  EDUCATION_COACH_ACTION_CLICK: "coach_action_click",
  /** AI Experience — unified center viewed */
  AI_CENTER_VIEW: "ai_center_view",
  /** AI Experience — recommendation block viewed */
  AI_RECOMMENDATION_VIEW: "ai_recommendation_view",
  /** AI Experience — user clicked recommended action */
  AI_ACTION_CLICK: "ai_action_click",
  /** AI Experience — notification opened */
  AI_NOTIFICATION_OPEN: "ai_notification_open",
  /** Trust & Safety — trust block / center viewed */
  TRUST_VIEW: "trust_view",
  /** Trust & Safety — seller trust section viewed */
  SELLER_TRUST_VIEW: "seller_trust_view",
  /** Trust & Safety — product trust section viewed */
  PRODUCT_TRUST_VIEW: "product_trust_view",
  /** Trust & Safety — seller clicked improvement CTA */
  TRUST_IMPROVEMENT_CLICK: "trust_improvement_click",
  /** Trust & Safety — risk signal surfaced */
  RISK_SIGNAL_VIEW: "risk_signal_view",
  /** Marketplace Learning — experiment created */
  LEARNING_EXPERIMENT_CREATED: "learning_experiment_created",
  /** Marketplace Learning — seller started recommended action */
  LEARNING_ACTION_STARTED: "learning_action_started",
  /** Marketplace Learning — seller completed recommended action */
  LEARNING_ACTION_COMPLETED: "learning_action_completed",
  /** Marketplace Learning — positive outcome recorded */
  LEARNING_OUTCOME_POSITIVE: "learning_outcome_positive",
  /** Marketplace Learning — pattern derived */
  LEARNING_PATTERN_CREATED: "learning_pattern_created",
  /** Marketplace Learning — AI recommendation quality viewed */
  AI_RECOMMENDATION_QUALITY: "ai_recommendation_quality",
  /** Command Center — unified seller/admin center viewed */
  COMMAND_CENTER_VIEW: "command_center_view",
  /** Command Center — priority block viewed */
  PRIORITY_VIEW: "priority_view",
  /** Command Center — priority CTA clicked */
  PRIORITY_ACTION_CLICK: "priority_action_click",
  /** Seller Promotion Center — dashboard viewed */
  PROMOTION_CENTER_VIEW: "promotion_center_view",
  /** Seller Promotion Center — product recommendation viewed */
  PROMOTION_PRODUCT_RECOMMENDATION_VIEW: "promotion_product_recommendation_view",
  /** Seller Promotion Center — campaign detail opened */
  PROMOTION_CAMPAIGN_OPEN: "promotion_campaign_open",
  /** Seller Promotion Center — budget recommendation viewed */
  PROMOTION_BUDGET_RECOMMENDATION_VIEW: "promotion_budget_recommendation_view",
  /** Seller Promotion Center — AI advice clicked */
  PROMOTION_AI_ADVICE_CLICK: "promotion_ai_advice_click",
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
