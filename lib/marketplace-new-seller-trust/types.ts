export type TrustTierId = "new_seller" | "developing" | "reliable" | "high_trust";

export type TrustTier = {
  id: TrustTierId;
  label: string;
  subtitle: string;
};

export type TrustProgressStep = {
  id: string;
  label: string;
  done: boolean;
};

export type SellerCoachItem = {
  label: string;
  remaining: number;
};

export type SellerCoachSnapshot = {
  nextLevelLabel: string;
  items: SellerCoachItem[];
};

export type NewSellerTrustSnapshot = {
  enabled: true;
  isNewSeller: boolean;
  daysSinceJoined: number;
  joinedLabel: string;
  trustScore: number;
  trustTier: TrustTier;
  startExplanation: string;
  progressSteps: TrustProgressStep[];
  coach: SellerCoachSnapshot | null;
};

export type BuyerNewSellerSnapshot = {
  enabled: true;
  isNewSeller: boolean;
  trustTier: TrustTier;
  firstBuyerLines: string[];
  protectionLines: string[];
  showFirstBuyerExperience: boolean;
};

export type FirstReviewPromptSnapshot = {
  enabled: true;
  message: string;
  productName: string;
};

export type AdminNewSellerStats = {
  todayCount: number;
  verifiedCount: number;
  firstOrderCount: number;
  firstReviewCount: number;
};
