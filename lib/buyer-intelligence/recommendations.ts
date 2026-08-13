import type {
  BuyerIntent,
  BuyerMatchBreakdown,
  BuyerProductMatch,
  BuyerProductRecommendation,
  BuyerProfile,
  SellerBuyerFitSummary,
} from "./types";
import { MATCH_WEIGHTS } from "./types";

export type ProductMatchCandidate = {
  id: string;
  title: string;
  category: string | null;
  price: number;
  currency: string;
  stock: number;
  imageUrl: string | null;
  seller: {
    isVerified: boolean;
    rating: number;
  };
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function sellerTrustScore(seller: ProductMatchCandidate["seller"]): number {
  let score = 40;
  if (seller.isVerified) score += 35;
  if (seller.rating >= 4.5) score += 15;
  else if (seller.rating >= 4) score += 8;
  return clamp(score, 0, 100);
}

/** Advisory match score — NOT used for catalog/search ranking. */
export function computeBuyerProductMatch(
  product: ProductMatchCandidate,
  intent: BuyerIntent,
  profile: BuyerProfile,
): BuyerProductMatch {
  const breakdown: BuyerMatchBreakdown = {
    intentMatch: 0,
    budgetMatch: 0,
    categoryMatch: 0,
    sellerTrust: 0,
    availability: 0,
  };
  const reasons: string[] = [];

  const q = intent.rawQuery.toLowerCase();
  const titleLower = product.title.toLowerCase();
  const categoryName = product.category ?? "";

  let intentPts = 40;
  const firstToken = q.split(" ")[0] ?? "";
  if (firstToken.length >= 3 && titleLower.includes(firstToken)) intentPts += 30;
  if (intent.needs.some((n) => titleLower.includes(n.split(" ")[0] ?? ""))) {
    intentPts += 20;
  }
  if (profile.viewedProductIds.includes(product.id)) intentPts += 10;
  breakdown.intentMatch = clamp(
    Math.round((intentPts / 100) * MATCH_WEIGHTS.intentMatch),
    0,
    MATCH_WEIGHTS.intentMatch,
  );
  if (breakdown.intentMatch >= 15) reasons.push("совпадает с вашим запросом");

  const budget = intent.budget ?? profile.averageViewPrice ?? null;
  if (budget != null) {
    if (product.price <= budget) {
      breakdown.budgetMatch = MATCH_WEIGHTS.budgetMatch;
      reasons.push("цена в вашем бюджете");
    } else if (product.price <= budget * 1.15) {
      breakdown.budgetMatch = Math.round(MATCH_WEIGHTS.budgetMatch * 0.5);
      reasons.push("чуть выше бюджета, но близко");
    } else {
      breakdown.budgetMatch = Math.round(MATCH_WEIGHTS.budgetMatch * 0.2);
    }
  } else {
    breakdown.budgetMatch = Math.round(MATCH_WEIGHTS.budgetMatch * 0.6);
  }

  if (
    (intent.category &&
      categoryName.toLowerCase() === intent.category.toLowerCase()) ||
    profile.favoriteCategories.includes(categoryName)
  ) {
    breakdown.categoryMatch = MATCH_WEIGHTS.categoryMatch;
    if (categoryName) reasons.push(`категория «${categoryName}»`);
  } else if (
    intent.category &&
    categoryName.toLowerCase().includes(intent.category.toLowerCase().slice(0, 4))
  ) {
    breakdown.categoryMatch = Math.round(MATCH_WEIGHTS.categoryMatch * 0.6);
  }

  const trust = sellerTrustScore(product.seller);
  breakdown.sellerTrust = clamp(
    Math.round((trust / 100) * MATCH_WEIGHTS.sellerTrust),
    0,
    MATCH_WEIGHTS.sellerTrust,
  );
  if (breakdown.sellerTrust >= 10) reasons.push("надёжный продавец");

  if (product.stock > 0) {
    breakdown.availability = MATCH_WEIGHTS.availability;
    reasons.push("есть в наличии / доставка");
  }

  const matchScore = clamp(
    breakdown.intentMatch +
      breakdown.budgetMatch +
      breakdown.categoryMatch +
      breakdown.sellerTrust +
      breakdown.availability,
    0,
    100,
  );

  if (intent.intent === "HOUSEHOLD_REPAIR" && !reasons.some((r) => r.includes("дом"))) {
    reasons.unshift("для дома");
  }

  return {
    productId: product.id,
    matchScore,
    reasons: reasons.slice(0, 4),
    breakdown,
  };
}

function formatReason(intent: BuyerIntent, match: BuyerProductMatch): string {
  const bullets = match.reasons.slice(0, 4).map((r) => `✓ ${r}`);
  if (bullets.length === 0) {
    bullets.push(`✓ подходит для ${intent.intent.toLowerCase()}`);
  }
  return `Подходит потому что:\n${bullets.join("\n")}`;
}

/** Generate advisory recommendations with mandatory explanations. */
export function generateBuyerRecommendations(
  candidates: ProductMatchCandidate[],
  intent: BuyerIntent,
  profile: BuyerProfile,
  limit = 4,
): BuyerProductRecommendation[] {
  return candidates
    .map((p) => {
      const match = computeBuyerProductMatch(p, intent, profile);
      return { product: p, match };
    })
    .filter((s) => s.match.matchScore >= 35)
    .sort((a, b) => b.match.matchScore - a.match.matchScore)
    .slice(0, limit)
    .map(({ product, match }) => ({
      productId: product.id,
      title: product.title,
      price: product.price,
      currency: product.currency,
      imageUrl: product.imageUrl,
      confidence: match.matchScore,
      matchScore: match.matchScore,
      reason: formatReason(intent, match),
      reasons: match.reasons.slice(0, 3).map((r) => `✓ ${r}`),
    }));
}

/** Seller-facing: why buyers match this product. */
export function buildSellerBuyerFitSummary(
  productId: string,
  sampleIntents: BuyerIntent[],
): SellerBuyerFitSummary {
  const levels = new Map<string, number>();
  const budgets: number[] = [];
  const useCases = new Map<string, number>();

  for (const intent of sampleIntents) {
    levels.set(intent.buyerLevel, (levels.get(intent.buyerLevel) ?? 0) + 1);
    if (intent.budget) budgets.push(intent.budget);
    useCases.set(intent.intent, (useCases.get(intent.intent) ?? 0) + 1);
  }

  const topLevel = [...levels.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const topUse = [...useCases.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const avgBudget =
    budgets.length > 0
      ? Math.round(budgets.reduce((a, b) => a + b, 0) / budgets.length)
      : null;

  const fitReasons: string[] = [];
  if (topLevel === "BEGINNER") fitReasons.push("начинающим пользователям");
  if (avgBudget) {
    fitReasons.push(`покупателям до ${avgBudget.toLocaleString("ru-RU")} ₽`);
  }
  if (topUse === "HOUSEHOLD_REPAIR") fitReasons.push("домашнему ремонту");
  if (topUse === "GIFT") fitReasons.push("покупателям подарков");
  if (fitReasons.length === 0) fitReasons.push("широкому кругу покупателей");

  const buyerTypes: string[] = [];
  if (topLevel === "BEGINNER") buyerTypes.push("BEGINNER");
  if (topUse === "HOUSEHOLD_REPAIR") buyerTypes.push("HOME_USER");
  if (topUse === "PROFESSIONAL") buyerTypes.push("PRO_USER");

  return {
    productId,
    fitReasons: fitReasons.slice(0, 4),
    buyerTypes,
    typicalBudget: avgBudget
      ? `до ${avgBudget.toLocaleString("ru-RU")} ₽`
      : null,
  };
}
