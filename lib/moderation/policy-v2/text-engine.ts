import type { PolicyEvidenceHit, PolicyRuleRecord } from "./types";

const ENGINE = "LOT_POLICY_V2_TEXT_ENGINE/1.0.0";

/** Normalize for matching: lowercase, collapse obfuscation, unify cyrillic/latin o, targeted 0→о. */
export function normalizePolicyText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[@4]/g, "a")
    .replace(/([а-яё])0([а-яё])/gi, "$1о$2")
    .replace(/[oо]/g, "о")
    .replace(/3/g, "e")
    .replace(/1/g, "i")
    .replace(/[ё]/g, "е")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ACCESSORY_MARKERS = [
  /(?:^|\s)чехол(?:\s|$)/,
  /\bcase\b/,
  /аксессуар/,
  /\bholder\b/,
  /подставк/,
  /зарядн/,
  /(?:^|\s)кабель(?:\s|$)/,
  /\bcoil\b/,
  /испарител/,
];

const TOY_MARKERS = [/игрушечн/, /игрушк/, /\bnerf\b/i, /\btoy\b/i, /мягкие пули/];

export function detectAccessoryContext(text: string): boolean {
  const n = normalizePolicyText(text);
  return ACCESSORY_MARKERS.some((re) => re.test(n));
}

export function detectToyContext(text: string): boolean {
  const n = normalizePolicyText(text);
  return TOY_MARKERS.some((re) => re.test(n));
}

export function detectNicotinePatchContext(text: string): boolean {
  const n = normalizePolicyText(text);
  return /никотиновый пластырь|nicotine patch|никоретте|nicorette/.test(n);
}

export function detectAlcoholFreeContext(text: string): boolean {
  const n = normalizePolicyText(text);
  return /безалкоголь|alcohol[\s-]*free|0\s*%?\s*алкогол/.test(n);
}

export function detectNicotineFreeClaim(text: string): boolean {
  const n = normalizePolicyText(text);
  return /без\s*никотин|nicotine[\s-]*free|(?:^|\s)0\s*mg(?:\s|$)|(?:^|\s)0mg(?:\s|$)/.test(n);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function patternMatches(normalizedText: string, normalizedPattern: string, rawPattern: string, originalText: string): boolean {
  if (rawPattern.includes("+")) {
    try {
      return new RegExp(escapeRegex(rawPattern).replace(/\s+/g, "\\s*"), "iu").test(originalText.toLowerCase());
    } catch {
      return false;
    }
  }
  if (!normalizedPattern) return false;
  if (normalizedText.includes(normalizedPattern)) return true;
  const spaced = normalizedPattern.split("").join("\\s*");
  try {
    if (new RegExp(spaced, "iu").test(normalizedText)) return true;
  } catch {
    // ignore
  }
  if (normalizedPattern.length <= 4) {
    try {
      return new RegExp(`(?:^|\\s)${escapeRegex(normalizedPattern)}(?:\\s|$)`, "iu").test(normalizedText);
    } catch {
      return false;
    }
  }
  return false;
}

export function matchPatterns(text: string, patterns: string[]): string[] {
  const n = normalizePolicyText(text);
  const hits: string[] = [];
  for (const raw of patterns) {
    const p = normalizePolicyText(raw);
    if (patternMatches(n, p, raw, text)) hits.push(raw);
  }
  return [...new Set(hits)];
}

export function analyzeTitleDescriptionSignals(input: {
  title: string;
  description?: string | null;
  rules: PolicyRuleRecord[];
  patternGroups: Array<{
    groupId: string;
    policyId: string;
    patterns: string[];
    context: "MAIN_PRODUCT" | "ACCESSORY" | "ANY";
    decisionOverride?: string;
  }>;
  evaluatedAt: string;
}): { hits: PolicyEvidenceHit[]; triggeredRules: PolicyRuleRecord[] } {
  const combined = `${input.title}\n${input.description ?? ""}`;
  const isAccessory = detectAccessoryContext(combined);
  const hits: PolicyEvidenceHit[] = [];
  const triggered = new Map<string, PolicyRuleRecord>();

  for (const group of input.patternGroups) {
    if (group.context === "MAIN_PRODUCT" && isAccessory) continue;
    if (group.context === "ACCESSORY" && !isAccessory) continue;

    const titleHits = matchPatterns(input.title, group.patterns);
    const descHits = matchPatterns(input.description ?? "", group.patterns);
    const all = [...new Set([...titleHits, ...descHits])];
    if (all.length === 0) continue;

    const rule = input.rules.find((r) => r.policyId === group.policyId);
    if (!rule) continue;

    triggered.set(rule.policyId, rule);
    hits.push({
      source: titleHits.length ? "TITLE_SIGNAL" : "DESCRIPTION_SIGNAL",
      policyId: rule.policyId,
      confidence: isAccessory && group.context === "ACCESSORY" ? 0.55 : 0.85,
      matchedValue: all.join(", "),
      detail: `group=${group.groupId}; accessory=${isAccessory}`,
      engineVersion: ENGINE,
      evaluatedAt: input.evaluatedAt,
    });
  }

  return { hits, triggeredRules: [...triggered.values()] };
}
