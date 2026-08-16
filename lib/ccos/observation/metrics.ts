/** Canonical metric names — use dotted notation only. */
export const OBSERVATION_METRICS = {
  content: {
    overallQuality: "content.overall_quality",
    descriptionQuality: "content.description_quality",
    attributesQuality: "content.attributes_quality",
    consistency: "content.consistency",
    buyerValue: "content.buyer_value",
    manipulationRisk: "content.manipulation_risk",
    qualityGate: "content.quality_gate",
    gateBlocked: "content.gate_blocked",
  },
  visual: {
    photoQuality: "visual.photo_quality",
    photoRelevance: "visual.photo_relevance",
    thumbnailQuality: "visual.thumbnail_quality",
    photoContrast: "visual.photo_contrast",
  },
  seo: {
    contentQuality: "seo.content_quality",
  },
  trust: {
    sellerScore: "trust.seller_score",
    productScore: "trust.product_score",
    shippingReliability: "trust.shipping_reliability",
    reviewQuality: "trust.review_quality",
    cancellationHealth: "trust.cancellation_health",
  },
  behaviour: {
    ctr: "behaviour.ctr",
    cartRate: "behaviour.cart_rate",
    conversion: "behaviour.conversion",
    views: "behaviour.views",
    favouriteRate: "behaviour.favourite_rate",
    returnRate: "behaviour.return_rate",
  },
  ranking: {
    estimatedPosition: "ranking.estimated_position",
    score: "ranking.score",
    topGap: "ranking.top_gap",
    blockerCount: "ranking.blocker_count",
  },
} as const;

export type ObservationMetric =
  | (typeof OBSERVATION_METRICS.content)[keyof typeof OBSERVATION_METRICS.content]
  | (typeof OBSERVATION_METRICS.visual)[keyof typeof OBSERVATION_METRICS.visual]
  | (typeof OBSERVATION_METRICS.seo)[keyof typeof OBSERVATION_METRICS.seo]
  | (typeof OBSERVATION_METRICS.trust)[keyof typeof OBSERVATION_METRICS.trust]
  | (typeof OBSERVATION_METRICS.behaviour)[keyof typeof OBSERVATION_METRICS.behaviour]
  | (typeof OBSERVATION_METRICS.ranking)[keyof typeof OBSERVATION_METRICS.ranking];

export const METRIC_UNITS: Record<string, string> = {
  "behaviour.ctr": "ratio",
  "behaviour.conversion": "ratio",
  "behaviour.cart_rate": "ratio",
  "behaviour.favourite_rate": "ratio",
  "behaviour.return_rate": "ratio",
  "behaviour.views": "count",
  "ranking.estimated_position": "rank",
  "ranking.score": "score",
};

export type ConfidenceBand = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

export function confidenceBand(confidence: number): ConfidenceBand {
  if (confidence < 0.4) return "LOW";
  if (confidence < 0.7) return "MEDIUM";
  if (confidence < 0.9) return "HIGH";
  return "VERY_HIGH";
}
