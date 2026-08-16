/** CCOS Product Understanding & Product Genome Platform — Wave 3 */

export const PRODUCT_GENOME_CONTRACT_VERSION = "product-genome-v1";
export const PRODUCT_IDENTITY_VERSION = "product-identity-v1";

export type ProductCategoryPackId =
  | "fans"
  | "flowers"
  | "tools"
  | "electronics"
  | "garden"
  | "construction"
  | "generic";

export type ProductGenomeDimensionKey =
  | "visual"
  | "commercial"
  | "functional"
  | "emotional"
  | "seasonality"
  | "audience"
  | "complexity"
  | "trust"
  | "lifecycle"
  | "priceSegment";

export type ProductGenomeDimensions = Record<ProductGenomeDimensionKey, number | null>;

export interface ProductIdentityEvidence {
  source: string;
  claim: string;
  confidence: number;
}

export interface ProductIdentity {
  category?: string;
  subcategory?: string;
  productType?: string;
  brand?: string;
  model?: string;
  family?: string;
  confidence: number;
  evidence: ProductIdentityEvidence[];
  version: string;
  conflicts: ProductIdentityConflict[];
}

export interface ProductIdentityConflict {
  field: string;
  expected: string;
  observed: string;
  severity: "low" | "medium" | "high";
  explanation: string;
}

export interface ProductDNA {
  primaryNeed: string;
  secondaryNeeds: string[];
  useCases: string[];
  targetAudience: string[];
  environment: string[];
  emotionalDrivers: string[];
  painPoints: string[];
  benefits: string[];
}

export interface NeedGraphNode {
  id: string;
  label: string;
  type: "problem" | "need" | "solution" | "product";
}

export interface NeedGraphEdge {
  from: string;
  to: string;
  relation: "causes" | "satisfies" | "alternative" | "upgrade";
}

export interface NeedGraph {
  nodes: NeedGraphNode[];
  edges: NeedGraphEdge[];
  rootProblemId?: string;
}

export type ProductRelationshipType =
  | "complementary"
  | "alternative"
  | "upgrade"
  | "accessory"
  | "replacement";

export interface ProductRelationship {
  type: ProductRelationshipType;
  targetLabel: string;
  reason: string;
  confidence: number;
}

export interface ProductComparisonAxis {
  axis: string;
  score: number | null;
  benchmark?: number | null;
  interpretation: string;
}

export interface ProductUseCase {
  id: string;
  label: string;
  fitScore: number;
  recommendation?: string;
  confidence: number;
}

export interface ProductContext {
  season?: string;
  climate?: string;
  region?: string;
  audience?: string;
  purpose?: string;
  budget?: "low" | "medium" | "high";
  urgency?: "low" | "medium" | "high";
}

export interface DaosVisualSignals {
  visualIdentity?: number | null;
  composition?: number | null;
  background?: number | null;
  lighting?: number | null;
  thumbnailQuality?: number | null;
  contrast?: number | null;
  commercialVisibility?: number | null;
  connected: boolean;
  source: string;
}

export interface CategoryKnowledgePack {
  id: ProductCategoryPackId;
  typicalMistakes: string[];
  bestPractices: string[];
  idealPhotos: string[];
  typicalBenefits: string[];
  criticalCharacteristics: string[];
}

export interface ProductConfidence {
  overall: number;
  identity: number;
  dna: number;
  genome: number;
  label: "high" | "medium" | "low";
}

export interface ProductGenome {
  overall: number | null;
  dimensions: ProductGenomeDimensions;
  confidence: number;
  version: string;
  contractVersion: string;
  computedAt: string;
}

export interface ProductUnderstanding {
  productId?: string;
  identity: ProductIdentity;
  genome: ProductGenome;
  dna: ProductDNA;
  needGraph: NeedGraph;
  relationships: ProductRelationship[];
  comparisons: ProductComparisonAxis[];
  useCases: ProductUseCase[];
  categoryPack: CategoryKnowledgePack;
  context: ProductContext;
  daos: DaosVisualSignals;
  confidence: ProductConfidence;
  advisoryOnly: true;
}

export interface CrossAppProductKnowledge {
  id: string;
  claim: string;
  sourceApp: "marketplace" | "daos" | "quicksale" | "advertising" | "search";
  targetApps: Array<"marketplace" | "daos" | "quicksale" | "advertising" | "search" | "buyer">;
  categoryPack?: ProductCategoryPackId;
  confidence: number;
  verified: boolean;
  createdAt: string;
}

export type BuildProductUnderstandingInput = {
  productId?: string;
  title: string;
  description?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  productTypeName?: string | null;
  brandName?: string | null;
  modelName?: string | null;
  price?: number | null;
  attributes?: Record<string, string | number | boolean>;
  photoCount?: number;
  hasVideo?: boolean;
  daos?: Partial<DaosVisualSignals>;
  context?: ProductContext;
};
