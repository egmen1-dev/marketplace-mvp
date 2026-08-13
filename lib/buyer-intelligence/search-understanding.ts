import type { BuyerIntent, BuyerProfile, SearchUnderstanding } from "./types";
import { parseBuyerIntent } from "./intent-parser";

/** AI understanding layer: intent + profile context (rule-based MVP). */
export function understandSearchQuery(
  query: string,
  profile: BuyerProfile,
): SearchUnderstanding {
  const intent = enrichIntent(parseBuyerIntent(query), profile);
  const summary = buildUnderstandingSummary(intent, profile);

  return { query: query.trim(), intent, profile, summary };
}

function enrichIntent(intent: BuyerIntent, profile: BuyerProfile): BuyerIntent {
  const next = { ...intent, needs: [...intent.needs] };

  if (!next.budget && profile.averageViewPrice) {
    next.budget = Math.round(profile.averageViewPrice * 1.2);
  }

  if (
    profile.favoriteCategories.length > 0 &&
    next.category &&
    !profile.favoriteCategories.includes(next.category)
  ) {
    next.needs.push(`интерес к ${profile.favoriteCategories[0]}`);
  }

  if (profile.priceSensitivity === "HIGH" && !next.needs.includes("доступная цена")) {
    next.needs.push("доступная цена");
  }

  return next;
}

function buildUnderstandingSummary(
  intent: BuyerIntent,
  profile: BuyerProfile,
): string {
  const parts: string[] = [];
  parts.push(`Намерение: ${intent.purchaseIntent.toLowerCase()}`);
  if (intent.category) parts.push(`Категория: ${intent.category}`);
  if (intent.budget) {
    parts.push(`Бюджет ~${intent.budget.toLocaleString("ru-RU")} ₽`);
  }
  if (profile.buyerType !== "GENERAL") {
    parts.push(`Профиль: ${profile.buyerType.toLowerCase()}`);
  }
  return parts.join(" · ");
}
