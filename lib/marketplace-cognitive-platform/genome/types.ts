export type GenomeDimensionKey =
  | "visual"
  | "content"
  | "seo"
  | "trust"
  | "behaviour"
  | "commercial"
  | "promotion"
  | "delivery"
  | "product";

export type GenomeDimensions = Record<GenomeDimensionKey, number | null>;

export type GenomeProfile = {
  overall: number | null;
  confidence: number;
  dimensions: GenomeDimensions;
  genomeVersion: string;
  computedAt: string;
  observationCount: number;
  dimensionsPresent: number;
};
