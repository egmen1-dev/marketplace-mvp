export type ReviewDto = {
  id: string;
  rating: number;
  text: string | null;
  pros: string | null;
  cons: string | null;
  buyerName: string | null;
  createdAt: string;
  photos: { id: string; url: string }[];
};

export type ProductRatingSnapshot = {
  averageRating: number;
  reviewsCount: number;
  distribution: { stars: number; percent: number; count: number }[];
};

export type SellerReputationSnapshot = {
  averageRating: number;
  reviewsCount: number;
  trustScore: number;
  trustLabel: string;
  strengths: string[];
  improvements: string[];
  completedOrders: number;
  satisfactionPercent: number;
};

export type ModerationIssue = {
  id: string;
  severity: "error" | "warning" | "info";
  message: string;
  recommendation?: string;
};

export type ProductQualityReport = {
  score: number;
  issues: ModerationIssue[];
};

export type PhotoQualityReport = {
  score: number;
  issues: ModerationIssue[];
};

export type TrustSignalsSnapshot = {
  verifiedSeller: boolean;
  completedOrders: number;
  satisfactionPercent: number;
  hasBuyerPhotos: boolean;
  productRating: number | null;
  reviewsCount: number;
  trustScore?: number;
  trustLevel?: string;
  buyerReasons?: string[];
  verificationDetails?: string[];
};

export type ModerationQueueSummary = {
  newProducts: number;
  reviews: number;
  reports: number;
  suspicious: number;
};

export type AdminTrustHealth = {
  enabled: boolean;
  averageRating: number;
  reviewsCount: number;
  highTrustSellersPercent: number;
  pendingModeration: number;
  problematicCards: number;
  prohibitedAttempts: number;
  cardsWithoutPhotos: number;
  lowQualityCards: number;
};
