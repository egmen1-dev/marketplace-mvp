export type PurchaseIntent =
  | "RESEARCH"
  | "COMPARISON"
  | "READY_TO_BUY"
  | "URGENT_PURCHASE";

export type BuyerIntentType =
  | "HOUSEHOLD_REPAIR"
  | "HOME_IMPROVEMENT"
  | "PROFESSIONAL"
  | "GIFT"
  | "GENERAL";

export type BuyerLevel = "BEGINNER" | "INTERMEDIATE" | "PRO";

export type PriceSensitivity = "HIGH" | "MEDIUM" | "LOW";

export type BuyerType =
  | "HOME_USER"
  | "PRO_USER"
  | "BARGAIN_HUNTER"
  | "GENERAL";

export type BuyerIntent = {
  rawQuery: string;
  category: string | null;
  categorySlug: string | null;
  intent: BuyerIntentType;
  purchaseIntent: PurchaseIntent;
  buyerLevel: BuyerLevel;
  budget: number | null;
  needs: string[];
};

export type BuyerProfile = {
  buyerType: BuyerType;
  favoriteCategories: string[];
  priceSensitivity: PriceSensitivity;
  recentSearchQueries: string[];
  viewedProductCount: number;
  cartItemCount: number;
  purchaseCount: number;
  /** Advisory scoring — average viewed product price in RUB. */
  averageViewPrice: number | null;
  viewedProductIds: string[];
};

export type BuyerProductRecommendation = {
  productId: string;
  title: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  reason: string;
  reasons: string[];
  confidence: number;
  matchScore: number;
};

export type BuyerProductMatch = {
  productId: string;
  matchScore: number;
  reasons: string[];
  breakdown: BuyerMatchBreakdown;
};

export type AdminBuyerIntelligenceSummary = {
  popularIntents: Array<{ intent: BuyerIntentType; count: number; label: string }>;
  unmetQueries: Array<{ query: string; count: number; suggestedCategory: string | null }>;
  growingCategories: Array<{ category: string; searchCount: number }>;
  headlines: string[];
};

export type SellerBuyerFitSummary = {
  productId: string;
  fitReasons: string[];
  buyerTypes: string[];
  typicalBudget: string | null;
};

export type BuyerMatchBreakdown = {
  intentMatch: number;
  budgetMatch: number;
  categoryMatch: number;
  sellerTrust: number;
  availability: number;
};

/** Advisory weights — sum = 100, not used for catalog ranking. */
export const MATCH_WEIGHTS = {
  intentMatch: 30,
  budgetMatch: 20,
  categoryMatch: 20,
  sellerTrust: 15,
  availability: 15,
} as const;

export type SearchUnderstanding = {
  query: string;
  intent: BuyerIntent;
  profile: BuyerProfile;
  summary: string;
};
