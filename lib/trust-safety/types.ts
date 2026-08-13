export type TrustLevelLabel =
  | "Высокий уровень доверия"
  | "Средний уровень доверия"
  | "Начальный уровень доверия";

export type SellerTrustScore = {
  score: number;
  levelLabel: TrustLevelLabel;
  factors: Array<{ key: string; label: string; value: string; contribution: number }>;
  highlights: string[];
};

export type ProductTrustScore = {
  score: number;
  reasons: string[];
  checklist: Array<{ ok: boolean; label: string }>;
};

export type RiskSignalType =
  | "SELLER_NEW"
  | "NO_PRODUCT_PHOTO"
  | "PRICE_TOO_LOW"
  | "HIGH_CANCEL_RATE"
  | "LOW_COMPLETION_RATE";

export type RiskSignal = {
  type: RiskSignalType;
  severity: "HIGH" | "MEDIUM" | "LOW";
  message: string;
  recommendation: string;
};

export type TrustImprovement = {
  id: string;
  action: string;
  why: string;
  href?: string;
};

export type SellerTrustCoach = {
  enabled: boolean;
  score: number;
  levelLabel: TrustLevelLabel;
  summary: string;
  improvements: TrustImprovement[];
  riskSignals: RiskSignal[];
};

export type TransactionProtectionStep = {
  label: string;
  body: string;
};

export type TransactionProtectionFlow = {
  title: string;
  steps: TransactionProtectionStep[];
};

export type PdpTrustExperience = {
  enabled: boolean;
  title: string;
  sellerSection: {
    headline: string;
    bullets: string[];
    score: number | null;
  };
  productSection: {
    headline: string;
    bullets: string[];
    score: number | null;
  };
  protectionSection: TransactionProtectionFlow;
  riskSignals: RiskSignal[];
};

export type AdminTrustCenterDashboard = {
  enabled: boolean;
  marketplaceHealth: Array<{ id: string; title: string; body: string; badge?: string }>;
  sellerRisks: Array<{ id: string; title: string; body: string; badge?: string }>;
  productsWithoutTrust: Array<{ id: string; title: string; body: string; href?: string }>;
  disputeOverview: Array<{ id: string; title: string; body: string }>;
};

export type TrustNotificationType =
  | "TRUST_WARNING"
  | "TRUST_IMPROVEMENT"
  | "TRANSACTION_PROTECTION";

export type TrustNotification = {
  id: string;
  type: TrustNotificationType;
  title: string;
  body: string;
  href?: string;
  createdAt: string;
  read: boolean;
};
