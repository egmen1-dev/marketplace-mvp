import type { TrustScoreEventType } from "@prisma/client";

import type { SELLER_FACTOR_WEIGHTS } from "./constants";

export type SellerFactorId = keyof typeof SELLER_FACTOR_WEIGHTS;

export type SellerFactorScore = {
  id: SellerFactorId;
  name: string;
  weight: number;
  score: number;
};

export type TrustScoreHistoryEntry = {
  id: string;
  oldScore: number;
  newScore: number;
  reason: string;
  eventType: TrustScoreEventType;
  createdAt: string;
  delta: number;
};

export type SellerTrustScoreSnapshot = {
  enabled: true;
  trustScore: number;
  trustScoreLabel: string;
  trustLevel: string;
  factors: SellerFactorScore[];
  helps: string[];
  hurts: string[];
  nextImprovement: string | null;
  history: TrustScoreHistoryEntry[];
  averageRating: number;
  reviewsCount: number;
  completedOrders: number;
  fulfillmentPercent: number;
  averageShippingHours: number | null;
  verificationDetails: string[];
};

export type BuyerSellerTrustSnapshot = {
  enabled: true;
  trustScore: number;
  trustLevel: string;
  reasons: string[];
  verificationDetails: string[];
};

export type ProductTrustScoreSnapshot = {
  enabled: true;
  productScore: number;
  productScoreLabel: string;
  sellerScore: number;
  factors: Array<{ name: string; weight: number; score: number }>;
};

export type TrustScoreEventContext = {
  eventType: TrustScoreEventType;
  reason: string;
  rawDelta: number;
};
