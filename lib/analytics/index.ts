export {
  ANALYTICS_EVENTS,
  ANALYTICS_EVENT_NAMES,
  FUNNEL_STEPS,
  isAnalyticsEventName,
  type AnalyticsEventName,
  type AnalyticsEventPayload,
} from "./events";

export {
  createHttpAnalyticsAdapter,
  noopAnalyticsAdapter,
  type AnalyticsAdapter,
} from "./adapter";

export {
  getAnalyticsAdapter,
  resetAnalyticsAdapter,
  setAnalyticsAdapter,
  trackCtaClick,
  trackEvent,
} from "./client";

export { trackServerEvent, type TrackServerEventInput } from "./track-server";

export {
  parseUtmFromSearch,
  type AnalyticsAttribution,
  type UtmAttribution,
  VISITOR_COOKIE,
  UTM_COOKIE,
} from "./attribution";

export {
  buildFunnelStepMetrics,
  formatPct,
  type FunnelStepMetric,
} from "./funnel-metrics";

export { MEASUREMENT_FUNNEL } from "./events";
