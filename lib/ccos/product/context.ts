import type { BuildProductUnderstandingInput, ProductContext } from "./types";
import { resolveMarketSeason } from "../context/market-context";

export function buildProductContext(input: BuildProductUnderstandingInput): ProductContext {
  const season = input.context?.season ?? resolveMarketSeason();
  const price = input.price ?? null;
  let budget: ProductContext["budget"] = "medium";
  if (price != null) {
    if (price <= 2500) budget = "low";
    else if (price >= 8000) budget = "high";
  }

  return {
    season,
    climate: input.context?.climate ?? "temperate",
    region: input.context?.region ?? "RU",
    audience: input.context?.audience ?? "general",
    purpose: input.context?.purpose ?? input.title.slice(0, 40),
    budget,
    urgency: input.context?.urgency ?? "medium",
  };
}

export function applyContextToGenomeDimensions(
  dimensions: Record<string, number | null>,
  context: ProductContext,
): Record<string, number | null> {
  const next = { ...dimensions };
  if (context.season === "summer" && next.functional != null) {
    next.seasonality = Math.min(100, (next.seasonality ?? 60) + 10);
  }
  if (context.season === "winter" && next.functional != null) {
    next.seasonality = Math.max(0, (next.seasonality ?? 60) - 15);
  }
  if (context.budget === "low" && next.commercial != null) {
    next.priceSegment = Math.min(100, (next.priceSegment ?? 50) + 8);
  }
  return next;
}
