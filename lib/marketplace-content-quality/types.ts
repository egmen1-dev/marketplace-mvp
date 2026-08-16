export type QualityModelVersion = string;
export type CriticVersion = string;

export type QualityGateCode =
  | "NO_RELEVANT_MAIN_PHOTO"
  | "PRODUCT_IDENTITY_MISMATCH"
  | "PROHIBITED_PRODUCT"
  | "MODERATION_REJECTED"
  | "SERIOUS_TEXT_IMAGE_CONTRADICTION"
  | "IRRELEVANT_CONTENT"
  | "INVALID_PRODUCT_INFORMATION";

export type TopEligibility = "ELIGIBLE" | "BLOCKED";

export type QualityEvidence = {
  reasons: string[];
  imageIndex?: number;
  imageUrl?: string;
};

export type QualityFactorScore = {
  score: number;
  confidence: number;
  evidence: QualityEvidence;
};

export type ImageQualityEvaluation = {
  imageId: string;
  index: number;
  url: string;
  score: number;
  relevance: number;
  confidence: number;
  isPrimary: boolean;
  tags: string[];
  evidence: QualityEvidence;
};

export type QualityRecommendation = {
  id: string;
  title: string;
  why: string;
  ctaLabel: string;
  ctaHref: string;
  priority: number;
  imageIndex?: number;
  imageUrl?: string;
};

export type ProductQualityEvaluation = {
  productId: string;
  overallScore: number;
  confidence: number;
  commercialQualityScore: number;
  provider: string;
  providerVersion: string;
  qualityModelVersion: QualityModelVersion;
  criticVersion: CriticVersion;
  evaluatedAt: string;
  topEligibility: TopEligibility;
  qualityGateFailed: boolean;
  failedGates: QualityGateCode[];
  photo: QualityFactorScore & {
    uploadedPhotoCount: number;
    effectivePhotoCount: number;
    images: ImageQualityEvaluation[];
  };
  thumbnail: QualityFactorScore;
  description: QualityFactorScore;
  seo: QualityFactorScore;
  attributes: QualityFactorScore;
  video: QualityFactorScore;
  consistency: QualityFactorScore;
  commercialValue: QualityFactorScore;
  compliance: QualityFactorScore & { complianceStatus: string };
  manipulation: QualityFactorScore;
  buyerValue: QualityFactorScore;
  blockers: string[];
  warnings: string[];
  strengths: string[];
  recommendations: QualityRecommendation[];
  contentHash: string | null;
  daosUsed: boolean;
  fallbackUsed: boolean;
};

export type ProductImageInput = {
  id: string;
  url: string;
  alt?: string | null;
  sortOrder: number;
  isPrimary: boolean;
  pathname?: string | null;
};

export type ProductCharacteristicInput = {
  name: string;
  slug: string;
  value: string;
};

/** Lab/benchmark metadata — not sent to external providers in production paths. */
export type ContentQualityHints = {
  scenarioId?: string;
  photoRelevance?: number;
  primaryPhotoQuality?: number;
  thumbnailQuality?: number;
  commercialVisibility?: number;
  compositionScore?: number;
  backgroundScore?: number;
  lightingScore?: number;
  readabilityScore?: number;
  duplicateRatio?: number;
  effectivePhotoCount?: number;
  descriptionQuality?: number;
  seoQuality?: number;
  videoQuality?: number;
  productIdentityScore?: number;
  textImageConsistency?: number;
  irrelevantPhotos?: boolean;
  productIdentityMismatch?: boolean;
  keywordStuffing?: boolean;
  attributeConflict?: boolean;
  volumeConflict?: { title?: string; description?: string; attribute?: string };
  videoShowsProduct?: boolean;
  prohibited?: boolean;
  moderationRejected?: boolean;
  manipulationRisk?: number;
  buyerValue?: number;
  commercialIntent?: number;
  allPhotosIrrelevant?: boolean;
};

export type ProductQualityInput = {
  productId: string;
  name: string;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  images: ProductImageInput[];
  characteristics: ProductCharacteristicInput[];
  hasVideo: boolean;
  videoUrl?: string | null;
  moderationStatus?: string | null;
  prohibitedHit?: boolean;
  contentHash?: string | null;
  hints?: ContentQualityHints;
};

export type ProductQualitySnapshotRow = {
  productId: string;
  overallScore: number;
  confidence: number;
  factorScores: Record<string, number>;
  provider: string;
  qualityModelVersion: string;
  criticVersion: string;
  providerVersion: string;
  topEligibility: TopEligibility;
  failedGates: QualityGateCode[];
  blockers: string[];
  warnings: string[];
  strengths: string[];
  recommendations: QualityRecommendation[];
  photoEvaluations: ImageQualityEvaluation[];
  evaluatedAt: string;
  contentHash: string | null;
  evaluation: ProductQualityEvaluation;
};

export type ProductQualityHistoryItem = {
  id: string;
  productId: string;
  overallScore: number;
  factorScores: Record<string, number>;
  provider: string;
  qualityModelVersion: string;
  createdAt: string;
};

export type ContentQualityReEvaluationEvent =
  | "PRODUCT_CREATED"
  | "PRODUCT_UPDATED"
  | "PHOTO_ADDED"
  | "PHOTO_REMOVED"
  | "VIDEO_CHANGED"
  | "DESCRIPTION_CHANGED"
  | "ATTRIBUTES_CHANGED"
  | "MODERATION_CHANGED";

export type AdminContentQualityDashboard = {
  enabled: boolean;
  averageOverall: number;
  averagePhotoQuality: number;
  averageDescriptionQuality: number;
  averageSeoQuality: number;
  averageConsistency: number;
  hardGateFailures: Array<{ gate: QualityGateCode; count: number }>;
  manipulationAttempts: number;
  worstCategories: Array<{ name: string; avgScore: number }>;
  bestCategories: Array<{ name: string; avgScore: number }>;
  providerBreakdown: Array<{ provider: string; count: number }>;
};

export type ContentQualityProviderName = "daos" | "rule-based-fallback";

export type ContentQualityProviderMeta = {
  name: ContentQualityProviderName;
  version: string;
};
