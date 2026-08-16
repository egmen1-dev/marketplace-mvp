export type RankingFactorGroup = "product" | "seller" | "behaviour" | "commercial";

export type RankingWeightRow = {
  factorKey: string;
  groupKey: RankingFactorGroup;
  label: string;
  weightPercent: number;
};

export type RankingAlgorithmVersionInfo = {
  id: string;
  version: string;
  label: string;
  description: string | null;
  isActive: boolean;
};

export type RankingEligibilityReason =
  | "no_photos"
  | "no_stock"
  | "seller_blocked"
  | "under_moderation"
  | "prohibited"
  | "trust_rejected"
  | "poor_content"
  | "missing_category"
  | "missing_title"
  | "invalid_price"
  | "archived"
  | "deleted"
  | "not_active";

export type RankingEligibilityResult = {
  status: "ELIGIBLE" | "NOT_ELIGIBLE";
  reasons: RankingEligibilityReason[];
  messages: string[];
};

export type RankingFactorScore = {
  factorKey: string;
  groupKey: RankingFactorGroup;
  label: string;
  weightPercent: number;
  score: number;
  maxScore: number;
};

export type RankingScoreBreakdown = {
  overall: number;
  label: string;
  product: number;
  seller: number;
  behaviour: number;
  commercial: number;
  factors: RankingFactorScore[];
};

export type RankingBlocker = {
  title: string;
  estimatedLoss: number;
  detail?: string;
};

export type RankingExplanation = {
  estimatedPosition: number | null;
  blockers: RankingBlocker[];
  strengths: string[];
};

export type RankingNextAction = {
  title: string;
  why: string;
  expectedGain: number;
  ctaLabel: string;
  ctaHref: string;
};

export type RankingSimulationChange = {
  key: string;
  label: string;
  applied: boolean;
};

export type RankingSimulationResult = {
  changes: RankingSimulationChange[];
  currentScore: number;
  predictedScore: number;
  currentPosition: number | null;
  predictedPosition: number | null;
};

export type RankingHistoryItem = {
  id: string;
  oldScore: number;
  newScore: number;
  reason: string;
  eventType: string;
  createdAt: string;
};

export type QualityGateResult = {
  passed: boolean;
  topBlocked: boolean;
  reason: string | null;
};

export type RankingProductRow = {
  id: string;
  name: string;
  imageUrl: string | null;
  price: number;
  eligibility: RankingEligibilityResult;
  score: RankingScoreBreakdown | null;
  explanation: RankingExplanation | null;
  nextAction: RankingNextAction | null;
  qualityGate: QualityGateResult;
  history: RankingHistoryItem[];
};

export type SellerRankingDashboard = {
  enabled: boolean;
  algorithmVersion: string;
  averageScore: number;
  eligibleCount: number;
  notEligibleCount: number;
  products: RankingProductRow[];
};

export type RankingInfluenceRow = {
  factorKey: string;
  label: string;
  influencePercent: number;
};

export type RankingExperimentRow = {
  id: string;
  name: string;
  purpose: string;
  datasetSize: number;
  changedFactor: string;
  status: string;
  rankingImpact: string | null;
  confidence: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type AdminRankingDashboard = {
  enabled: boolean;
  algorithmVersion: string;
  marketplaceAverage: number;
  averageTrust: number;
  averageSeo: number;
  averagePhotoQuality: number;
  topFailureReasons: Array<{ reason: string; count: number }>;
  worstCategories: Array<{ name: string; avgScore: number }>;
  influences: RankingInfluenceRow[];
  runningExperiments: number;
  rankingHealth: "good" | "attention" | "critical";
  experiments: RankingExperimentRow[];
};

export type RankingProductInput = {
  id: string;
  name: string;
  price: number;
  compareAt: number | null;
  status: string;
  stock: number;
  views: number;
  favoritesCount: number;
  categoryId: string | null;
  categoryName: string | null;
  descriptionLength: number;
  seoTitleLength: number;
  seoDescriptionLength: number;
  photoCount: number;
  hasVideo: boolean;
  characteristicCount: number;
  hasBrand: boolean;
  sellerId: string;
  sellerBlocked: boolean;
  sellerTrustScore: number;
  sellerReviewsCount: number;
  sellerAverageRating: number;
  sellerCompletedOrders: number;
  sellerCancellationRate: number;
  moderationStatus: string | null;
  prohibitedHit: boolean;
  qualityScore: number | null;
  cartAdds: number;
  ordersCount: number;
  promotionActive: boolean;
  /** Advisory content quality signals — from Content Quality Intelligence layer */
  photoQuality?: number | null;
  thumbnailQuality?: number | null;
  descriptionQuality?: number | null;
  seoQuality?: number | null;
  attributesQuality?: number | null;
  videoQuality?: number | null;
  consistencyQuality?: number | null;
  commercialQuality?: number | null;
  photoRelevance?: number | null;
  effectivePhotoCount?: number | null;
  contentQualityScore?: number | null;
  contentQualityGateFailed?: boolean;
  contentQualityTopBlocked?: boolean;
  contentQualityGateReason?: string | null;
};

export type RankingSimulateInput = {
  addVideo?: boolean;
  improveFirstPhoto?: boolean;
  reducePricePercent?: number;
};
