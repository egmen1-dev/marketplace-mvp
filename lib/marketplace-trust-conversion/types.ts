export type TrustFunnelStep = {
  id: string;
  label: string;
  event: string;
  count: number;
  uniqueVisitors: number;
  conversionFromPrev: number | null;
};

export type TrustImpactSnapshot = {
  enabled: true;
  windowDays: number;
  withTrustBlock: {
    views: number;
    cartAdds: number;
    purchases: number;
    viewToCartRate: number | null;
    viewToPurchaseRate: number | null;
  };
  withoutTrustBlock: {
    views: number;
    cartAdds: number;
    purchases: number;
    viewToCartRate: number | null;
    viewToPurchaseRate: number | null;
  };
};

export type BuyerDoubtReason = {
  id: string;
  label: string;
  active: boolean;
};

export type BuyerDoubtSnapshot = {
  enabled: true;
  show: boolean;
  views: number;
  cartAdds: number;
  reasons: BuyerDoubtReason[];
};

export type ProductTrustExplanationLine = {
  id: string;
  text: string;
  positive: boolean;
};

export type ProductTrustExplanationSnapshot = {
  enabled: true;
  headline: string;
  lines: ProductTrustExplanationLine[];
};

export type SellerTrustFeedbackItem = {
  rank: number;
  problem: string;
  fix: string;
};

export type SellerTrustFeedbackSnapshot = {
  enabled: true;
  doubts: SellerTrustFeedbackItem[];
  fixes: string[];
};

export type TrustLossInsight = {
  rank: number;
  reason: string;
  sharePercent: number;
};

export type AdminTrustInsightsSnapshot = {
  enabled: true;
  windowDays: number;
  topReasons: TrustLossInsight[];
};

export type TrustExperimentStatus = "draft" | "running" | "completed";

export type TrustExperiment = {
  id: string;
  name: string;
  hypothesis: string;
  variant: string;
  metric: string;
  beforeRate: number;
  afterRate: number;
  status: TrustExperimentStatus;
};

export type TrustExperimentFoundation = {
  enabled: true;
  experiments: TrustExperiment[];
};

export type TrustConversionFunnelSnapshot = {
  enabled: true;
  windowDays: number;
  steps: TrustFunnelStep[];
};

export type PdpTrustBlockOrder = "new_seller" | "experienced";
