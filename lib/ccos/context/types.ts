export type MarketSeason =
  | "summer"
  | "winter"
  | "holiday"
  | "back_to_school"
  | "normal";

export type DeviceType = "mobile" | "desktop" | "tablet" | "unknown";

export type SellerLifecycleStage = "new" | "growing" | "established" | "unknown";

export type SessionGoal =
  | "browse"
  | "buy"
  | "compare"
  | "gift"
  | "research"
  | "unknown";

export interface QueryIntent {
  category?: string;
  features: string[];
  useCases: string[];
  price?: {
    min?: number;
    max?: number;
    sensitivity?: "low" | "medium" | "high";
  };
  gift?: boolean;
  urgency?: "low" | "medium" | "high";
}

export interface CategoryBenchmark {
  categoryId?: string;
  ctrMedian?: number;
  conversionMedian?: number;
  priceMedian?: number;
  trustMedian?: number;
  contentQualityMedian?: number;
  deliveryMedianHours?: number;
  sampleSize: number;
  confidence: number;
  source: string;
}

export interface ContextConfidence {
  overall: number;
  query?: number;
  category?: number;
  buyer?: number;
  seller?: number;
  device?: number;
}

export interface CognitiveContext {
  id: string;
  contextVersion: string;

  query?: {
    raw: string;
    normalized: string;
    tokens: string[];
    intent: QueryIntent;
    confidence: number;
  };

  category?: {
    id: string;
    slug?: string;
    name?: string;
    benchmarkRef?: string;
    benchmark?: CategoryBenchmark;
  };

  market?: {
    country?: string;
    region?: string;
    season: MarketSeason;
    daypart?: string;
  };

  device?: {
    type: DeviceType;
  };

  buyer?: {
    sessionGoal: SessionGoal;
    confidence: number;
  };

  seller?: {
    lifecycle: SellerLifecycleStage;
    trustTier?: string;
    completedOrders?: number;
  };

  product?: {
    id: string;
    name: string;
    price?: number;
  };

  confidence: ContextConfidence;
  fingerprint: string;
  createdAt: string;
}

export function createContextId(seed: string): string {
  return `ctx_${seed.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64)}`;
}

/** Partial legacy Wave 0 shape — merged by builder. */
export type LegacyCognitiveContextPatch = Partial<
  Pick<CognitiveContext, "id" | "query" | "market" | "buyer" | "seller" | "createdAt">
>;
