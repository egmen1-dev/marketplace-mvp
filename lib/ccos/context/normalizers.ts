export const CONTEXT_VERSION = "context-v1";

export function normalizeQuery(raw: string): { normalized: string; tokens: string[] } {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s.-]/gu, "");
  const tokens = normalized.split(" ").filter((t) => t.length > 1);
  return { normalized, tokens };
}

export function detectDaypart(date = new Date()): string {
  const hour = date.getUTCHours() + 3; // MSK-ish for RU marketplace
  const h = ((hour % 24) + 24) % 24;
  if (h >= 6 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  if (h >= 18 && h < 23) return "evening";
  return "night";
}
