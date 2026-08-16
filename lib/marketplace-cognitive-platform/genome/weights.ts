import type { GenomeDimensionKey } from "./types";

/** Candidate weights — NOT production ranking weights. */
export const GENOME_DIMENSION_WEIGHTS_V0: Record<GenomeDimensionKey, number> = {
  visual: 0.16,
  content: 0.18,
  seo: 0.1,
  trust: 0.14,
  behaviour: 0.14,
  commercial: 0.12,
  promotion: 0.04,
  delivery: 0.04,
  product: 0.08,
};

export const GENOME_METRIC_DIMENSION: Record<string, GenomeDimensionKey> = {
  "content.overall_quality": "content",
  "content.description_quality": "content",
  "content.attributes_quality": "content",
  "content.consistency": "content",
  "content.buyer_value": "content",
  "content.manipulation_risk": "content",
  "visual.photo_quality": "visual",
  "visual.photo_relevance": "visual",
  "visual.thumbnail_quality": "visual",
  "seo.content_quality": "seo",
  "trust.seller_score": "trust",
  "trust.product_score": "trust",
  "trust.review_quality": "trust",
  "trust.cancellation_health": "trust",
  "behaviour.ctr": "behaviour",
  "behaviour.conversion": "behaviour",
  "behaviour.views": "behaviour",
  "ranking.score": "commercial",
  "ranking.blocker_count": "commercial",
};
