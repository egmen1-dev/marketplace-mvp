export type AppId =
  | "marketplace"
  | "daos"
  | "quicksale"
  | "crm"
  | "erp"
  | "wms"
  | "pim"
  | "advertising"
  | "unknown";

export type EntityType =
  | "product"
  | "sku"
  | "seller"
  | "buyer"
  | "campaign"
  | "order"
  | "query"
  | "category"
  | "image"
  | "video"
  | "marketplace";

export type ObservationDomain =
  | "content"
  | "visual"
  | "seo"
  | "trust"
  | "behaviour"
  | "commercial"
  | "seller"
  | "buyer"
  | "query"
  | "delivery"
  | "promotion"
  | "finance"
  | "fraud"
  | "moderation"
  | "product";

export type ObservationPolarity = "positive" | "negative" | "neutral";

export interface UniversalObservation {
  id: string;
  metric: string;
  domain: ObservationDomain;
  value: number | string | boolean | null;
  normalizedScore?: number;
  unit?: string;
  confidence: number;
  polarity: ObservationPolarity;
  entity: {
    type: EntityType;
    id: string;
  };
  app: AppId;
  evidence: string[];
  source: {
    module: string;
    version: string;
  };
  observedAt: string;
  contextRef?: string;
  tags?: string[];
  validFrom?: string;
  validUntil?: string;
  window?: string;
}

export type PublisherContext = {
  app: AppId;
  entity: {
    type: EntityType;
    id: string;
  };
  context?: import("../context/types").CognitiveContext;
};

export interface ObservationPublisher {
  name: string;
  publish(context: PublisherContext): Promise<UniversalObservation[]>;
}

export type PublisherHealthStatus = "OK" | "DEGRADED" | "SKIPPED";

export type PublisherHealth = {
  name: string;
  status: PublisherHealthStatus;
  observationCount: number;
  error?: string;
};

export type RecordObservationResult =
  | { ok: true; observation: UniversalObservation; deduplicated: boolean }
  | { ok: false; errors: string[] };
