import type { TrustScoreEventType } from "@prisma/client";

import type { SellerFactorId } from "@/lib/marketplace-trust-score/types";
import type { TrustLevelUx } from "./constants";

export type TrustFactorInsight = {
  id: SellerFactorId;
  name: string;
  weight: number;
  score: number;
  summary: string;
  lastChange: {
    delta: number;
    reason: string;
    createdAt: string;
  } | null;
  improvementHint: string | null;
};

export type TrustHistoryTimelineEntry = {
  id: string;
  dateLabel: string;
  oldScore: number;
  newScore: number;
  delta: number;
  reason: string;
  eventType: TrustScoreEventType;
  advice: string;
};

export type TrustNextStep = {
  title: string;
  why: string;
  expectedEffect: string;
  ctaLabel: string;
  ctaHref: string;
};

export type TrustAchievement = {
  id: string;
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  target: number;
};

export type TrustTrendSummary = {
  windowDays: number;
  delta: number;
  direction: "up" | "down" | "flat";
  mainReason: string | null;
};

export type SellerTrustCenterSnapshot = {
  enabled: true;
  trustScore: number;
  trustScoreLabel: string;
  level: TrustLevelUx;
  trend: TrustTrendSummary;
  factors: TrustFactorInsight[];
  history: TrustHistoryTimelineEntry[];
  nextStep: TrustNextStep | null;
  achievements: TrustAchievement[];
  helps: string[];
};

export type BuyerTrustExperienceSnapshot = {
  enabled: true;
  level: TrustLevelUx;
  headline: string;
  reasons: string[];
  verificationDetails: string[];
};

export type TrustScoreNotification = {
  id: string;
  type: "TRUST_SCORE_UP" | "TRUST_SCORE_DOWN";
  title: string;
  body: string;
  action: string | null;
  href: string;
  createdAt: string;
  read: false;
};

export type AdminTrustCenterSnapshot = {
  enabled: true;
  averageTrustScore: number;
  declineReasons: Array<{ reason: string; count: number }>;
  monthlyGrowthPercent: number;
  sellerCount: number;
  highTrustPercent: number;
};
