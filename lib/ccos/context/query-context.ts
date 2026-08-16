import type { QueryIntent } from "./types";
import { normalizeQuery } from "./normalizers";

const FEATURE_PATTERNS: Array<{ pattern: RegExp; feature: string }> = [
  { pattern: /(?:^|\s)(тих[\p{L}]*|бесшум[\p{L}]*|quiet)(?:\s|$)/iu, feature: "quiet" },
  { pattern: /(?:^|\s)(мощн[\p{L}]*|powerful)(?:\s|$)/iu, feature: "powerful" },
  { pattern: /(?:^|\s)(компакт[\p{L}]*|compact)(?:\s|$)/iu, feature: "compact" },
];

const USE_CASE_PATTERNS: Array<{ pattern: RegExp; useCase: string }> = [
  { pattern: /(?:^|\s)(для офис[\p{L}]*|office)(?:\s|$)/iu, useCase: "office" },
  { pattern: /(?:^|\s)(для дом[\p{L}]*|home)(?:\s|$)/iu, useCase: "home" },
  { pattern: /(?:^|\s)(для дет[\p{L}]*|kids)(?:\s|$)/iu, useCase: "kids" },
];

const GIFT_PATTERNS = /(?:^|\s|\b)(в подарок|подарок|gift)(?:\s|$|\b)/i;

const PRICE_PATTERNS = [
  { pattern: /(?:^|\s)до\s+(\d[\d\s]*)/i, kind: "max" as const },
  { pattern: /(?:^|\s)от\s+(\d[\d\s]*)/i, kind: "min" as const },
  { pattern: /(?:^|\s)(дешев[\p{L}]*|недорог[\p{L}]*|budget)(?:\s|$)/iu, kind: "sensitive" as const },
];

export function classifyQueryIntent(raw: string): { intent: QueryIntent; confidence: number } {
  const { normalized, tokens } = normalizeQuery(raw);
  const intent: QueryIntent = { features: [], useCases: [] };

  if (tokens.length === 0) {
    return { intent, confidence: 0.1 };
  }

  for (const { pattern, feature } of FEATURE_PATTERNS) {
    if (pattern.test(normalized)) intent.features.push(feature);
  }
  for (const { pattern, useCase } of USE_CASE_PATTERNS) {
    if (pattern.test(normalized)) intent.useCases.push(useCase);
  }

  if (GIFT_PATTERNS.test(normalized)) {
    intent.gift = true;
    intent.urgency = "medium";
  }

  for (const { pattern, kind } of PRICE_PATTERNS) {
    const match = normalized.match(pattern);
    if (!match) continue;
    intent.price = intent.price ?? {};
    if (kind === "max" && match[1]) {
      intent.price.max = parseInt(match[1].replace(/\s/g, ""), 10);
      intent.price.sensitivity = "high";
    } else if (kind === "min" && match[1]) {
      intent.price.min = parseInt(match[1].replace(/\s/g, ""), 10);
    } else if (kind === "sensitive") {
      intent.price.sensitivity = "high";
    }
  }

  if (tokens.length >= 1) {
    intent.category = tokens[tokens.length - 1];
  }

  let confidence = 0.55;
  if (intent.features.length > 0) confidence += 0.15;
  if (intent.useCases.length > 0) confidence += 0.12;
  if (intent.gift) confidence += 0.1;
  if (intent.price?.max || intent.price?.min) confidence += 0.12;
  if (tokens.length === 1) confidence = Math.max(confidence, 0.65);

  return { intent, confidence: Math.min(1, confidence) };
}

export function buildQueryContext(raw?: string) {
  if (!raw?.trim()) return undefined;
  const { normalized, tokens } = normalizeQuery(raw);
  const { intent, confidence } = classifyQueryIntent(raw);
  return { raw: raw.trim(), normalized, tokens, intent, confidence };
}
