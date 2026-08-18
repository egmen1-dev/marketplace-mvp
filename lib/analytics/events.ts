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
  /** SELLER-OPERATING-DESK-001 — seller business workspace (no PII) */
  SELLER_OPERATING_DESK_VIEW: "seller_operating_desk_view",
  SELLER_OPERATING_DESK_ISSUE_CLICK: "seller_operating_desk_issue_click",
  SELLER_OPERATING_DESK_ACTION_CLICK: "seller_operating_desk_action_click",
  /** SELLER-OPERATIONS-WORKSPACE-001 — daily operations (no PII) */
  SELLER_OPERATIONS_VIEW: "seller_operations_view",
  SELLER_TASK_OPEN: "seller_task_open",
  SELLER_TASK_COMPLETE: "seller_task_complete",
  SELLER_PRIORITY_CLICK: "seller_priority_click",
  SELLER_AI_ADVICE_CLICK: "seller_ai_advice_click",
  /** SELLER-BUSINESS-INTELLIGENCE-001 — AI business assistant (no PII) */
  SELLER_BUSINESS_VIEW: "seller_business_view",
  SELLER_AI_SUMMARY_VIEW: "seller_ai_summary_view",
  SELLER_NEXT_ACTION_VIEW: "seller_next_action_view",
  SELLER_ACTION_CLICK: "seller_action_click",
  SELLER_INSTRUCTION_STARTED: "seller_instruction_started",
  SELLER_INSTRUCTION_COMPLETED: "seller_instruction_completed",
  SELLER_MONEY_EXPLANATION_VIEW: "seller_money_explanation_view",
  SELLER_PROBLEM_VIEW: "seller_problem_view",
  SELLER_PROBLEM_FIXED: "seller_problem_fixed",
  /** MARKETPLACE-FOUNDATION-AUDIT-001 — core readiness audit (no PII) */
  FOUNDATION_AUDIT_VIEW: "foundation_audit_view",
  BUYER_FLOW_CHECK: "buyer_flow_check",
  SELLER_FLOW_CHECK: "seller_flow_check",
  ORDER_FLOW_CHECK: "order_flow_check",
  PAYMENT_CHECK: "payment_check",
  FOUNDATION_ISSUE_DETECTED: "foundation_issue_detected",
  FOUNDATION_ISSUE_FIXED: "foundation_issue_fixed",
  /** MARKETPLACE-TRUST-LOOP-001 — reviews & moderation (no PII) */
  REVIEW_VIEW: "review_view",
  REVIEW_STARTED: "review_started",
  REVIEW_CREATED: "review_created",
  REVIEW_PUBLISHED: "review_published",
  RATING_UPDATED: "rating_updated",
  MODERATION_ITEM_CREATED: "moderation_item_created",
  MODERATION_APPROVED: "moderation_approved",
  MODERATION_REJECTED: "moderation_rejected",
  PHOTO_QUALITY_ISSUE_FOUND: "photo_quality_issue_found",
  PRODUCT_QUALITY_ISSUE_FOUND: "product_quality_issue_found",
  TRUST_SIGNAL_VIEW: "trust_signal_view",
  /** MARKETPLACE-DELIVERY-001 */
  DELIVERY_CREATED: "delivery_created",
  SHIPMENT_CREATED: "shipment_created",
  DELIVERY_TRACKING_VIEW: "delivery_tracking_view",
  DELIVERY_STATUS_CHANGED: "delivery_status_changed",
  DELIVERY_COMPLETED: "delivery_completed",
  RETURN_CREATED: "return_created",
  /** MARKETPLACE-LAUNCH-READINESS-001 */
  LAUNCH_AUDIT_STARTED: "launch_audit_started",
  LAUNCH_CHECK_PASSED: "launch_check_passed",
  LAUNCH_CHECK_FAILED: "launch_check_failed",
  PRODUCTION_HEALTH_VIEW: "production_health_view",
  /** MARKETPLACE-DISCOVERY-001 */
  DISCOVERY_VIEW: "discovery_view",
  DISCOVERY_SECTION_VIEW: "discovery_section_view",
  DISCOVERY_PRODUCT_CLICK: "discovery_product_click",
  DISCOVERY_PRODUCT_VIEW: "discovery_product_view",
  DISCOVERY_ADD_TO_CART: "discovery_add_to_cart",
  DISCOVERY_PURCHASE: "discovery_purchase",
  COLLECTION_OPENED: "collection_opened",
  DAILY_FIND_VIEW: "daily_find_view",
  DAILY_FIND_CLICK: "daily_find_click",
  PRICE_GAME_STARTED: "price_game_started",
  PRICE_GAME_COMPLETED: "price_game_completed",
  SITUATION_SELECTED: "situation_selected",
  /** MARKETPLACE-SOCIAL-GROWTH-001 */
  SHARE_CARD_VIEW: "share_card_view",
  SHARE_CLICKED: "share_clicked",
  CONTENT_GENERATED: "content_generated",
  CONTENT_SHARED: "content_shared",
  VIRAL_CARD_OPENED: "viral_card_opened",
  EXTERNAL_VISIT: "external_visit",
  COLLECTION_CREATED: "collection_created",
  COLLECTION_SHARED: "collection_shared",
  CREATOR_COLLECTION_VIEW: "creator_collection_view",
  SOCIAL_PURCHASE: "social_purchase",
  /** MARKETPLACE-UX-COMPLETION-001 */
  UX_PAGE_VIEW: "ux_page_view",
  ONBOARDING_STARTED: "onboarding_started",
  ONBOARDING_COMPLETED: "onboarding_completed",
  EMPTY_STATE_VIEW: "empty_state_view",
  EMPTY_STATE_ACTION_CLICK: "empty_state_action_click",
  SETTINGS_OPENED: "settings_opened",
  ACCOUNT_MODE_SWITCH: "account_mode_switch",
  AI_EXPLANATION_VIEW: "ai_explanation_view",
  SELLER_DASHBOARD_ACTION_CLICK: "seller_dashboard_action_click",
  BUYER_DISCOVERY_OPENED: "buyer_discovery_opened",
  /** MARKETPLACE-CONVERSION-AUDIT-001 */
  CONVERSION_FUNNEL_VIEW: "conversion_funnel_view",
  DROPOFF_DETECTED: "dropoff_detected",
  CONVERSION_PROBLEM_VIEW: "conversion_problem_view",
  CONVERSION_ACTION_CLICK: "conversion_action_click",
  SELLER_CONVERSION_VIEW: "seller_conversion_view",
  BUYER_SEGMENT_VIEW: "buyer_segment_view",
  /** MARKETPLACE-TRUST-EXPERIENCE-001 */
  TRUST_CENTER_VIEW: "trust_center_view",
  TRUST_FACTOR_OPEN: "trust_factor_open",
  TRUST_HISTORY_VIEW: "trust_history_view",
  TRUST_IMPROVEMENT_CLICK: "trust_improvement_click",
  TRUST_LEVEL_REACHED: "trust_level_reached",
  /** MARKETPLACE-NEW-SELLER-TRUST-001 */
  NEW_SELLER_STARTED: "new_seller_started",
  FIRST_ORDER_COMPLETED: "first_order_completed",
  FIRST_REVIEW_RECEIVED: "first_review_received",
  BUYER_NEW_SELLER_PURCHASE: "buyer_new_seller_purchase",
  /** TRUST-SAFETY-001 — buyer protection events (no PII) */
  BUYER_CONFIRMATION: "buyer_confirmation",
  DISPUTE_RESOLVED: "dispute_resolved",
  SELLER_TRUST_VIEW: "seller_trust_view",
  /** MARKETPLACE-TRUST-CONVERSION-001 */
  TRUST_DETAILS_OPEN: "trust_details_open",
  SELLER_REPUTATION_OPEN: "seller_reputation_open",
  NEW_SELLER_TRUST_VIEW: "new_seller_trust_view",
  TRUST_PURCHASE_AFTER_VIEW: "trust_purchase_after_view",
  TRUST_CONVERSION_VIEW: "trust_conversion_view",
  /** LOT Wallet + account unification */
  WALLET_VIEW: "wallet_view",
  WALLET_TOPUP_STARTED: "wallet_topup_started",
  WALLET_TOPUP_COMPLETED: "wallet_topup_completed",
  WALLET_PAYMENT_SELECTED: "wallet_payment_selected",
  WALLET_PRODUCT_PURCHASE: "wallet_product_purchase",
  WALLET_INTERNAL_PURCHASE: "wallet_internal_purchase",
  WALLET_PROMOTION_PURCHASE: "wallet_promotion_purchase",
  WALLET_PAYOUT_STARTED: "wallet_payout_started",
  WALLET_PAYOUT_CREATED: "wallet_payout_created",
  WALLET_TRANSACTION_HISTORY_VIEW: "wallet_transaction_history_view",
  PROMOTION_CENTER_VIEW: "promotion_center_view",
  PROMOTION_PRODUCT_SELECTED: "promotion_product_selected",
  PROMOTION_WALLET_PAYMENT_SELECTED: "promotion_wallet_payment_selected",
  PROMOTION_OPENED: "promotion_opened",
  PROMOTION_CREATED: "promotion_created",
  PROMOTION_UPDATED: "promotion_updated",
  PROMOTION_DELETED: "promotion_deleted",
  PROMOTION_PUBLISHED: "promotion_published",
  PROMOTION_FINISHED: "promotion_finished",
  /** MARKETPLACE-RANKING-INTELLIGENCE-001 — advisory ranking layer (no PII) */
  RANKING_VIEW: "ranking_view",
  RANKING_SIMULATION: "ranking_simulation",
  RANKING_RECOMMENDATION_CLICK: "ranking_recommendation_click",
  RANKING_FACTOR_OPEN: "ranking_factor_open",
  RANKING_HISTORY_VIEW: "ranking_history_view",
  RANKING_LAB_RUN: "ranking_lab_run",
  RANKING_EXPERIMENT_CREATED: "ranking_experiment_created",
  RANKING_VERSION_CHANGED: "ranking_version_changed",
  RANKING_WEIGHT_CHANGED: "ranking_weight_changed",
  RANKING_QUALITY_GATE_FAILED: "ranking_quality_gate_failed",
  ACCOUNT_SETTINGS_VIEW: "account_settings_view",
  PROFILE_UPDATED: "profile_updated",
  NOTIFICATION_SETTINGS_UPDATED: "notification_settings_updated",
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
