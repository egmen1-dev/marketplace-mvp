import type { MarketSeason } from "./types";

export function resolveMarketSeason(date = new Date()): MarketSeason {
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  if (month === 12 && day >= 15) return "holiday";
  if (month === 1 && day <= 10) return "holiday";
  if (month >= 6 && month <= 8) return "summer";
  if (month === 12 || month === 1 || month === 2) return "winter";
  if (month === 8 || month === 9) return "back_to_school";
  return "normal";
}

export function buildMarketContext(input?: { country?: string; region?: string; at?: Date }) {
  return {
    country: input?.country ?? "RU",
    region: input?.region,
    season: resolveMarketSeason(input?.at),
    daypart: undefined,
  };
}
