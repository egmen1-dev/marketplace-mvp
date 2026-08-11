/**
 * SearchQueryParser (AGENT-020) — the intelligence core. Produces an explainable
 * `ParsedQuery` (brands, models, attributes, product types, synonyms, negatives,
 * intent) that drives candidate generation. Pure & DB-agnostic (lexicon injected).
 */

import {
  fixLayout,
  normalizeQuery,
  singularize,
  tokenize,
} from "./normalize";
import {
  COLORS,
  UNIT_ALTERNATION,
  canonicalUnit,
  expandSynonyms,
  isBrand,
  synonymVocabulary,
} from "./lexicon";
import { correctToken } from "./spell";
import {
  EMPTY_LEXICON,
  type ParsedAttribute,
  type ParsedQuery,
  type QueryExplain,
  type SearchIntent,
  type SearchLexicon,
} from "./types";

const NEGATION_TRIGGERS = new Set(["без", "не"]);
const STOPWORDS = new Set(["и", "или", "для", "с", "по", "в", "на"]);

function extractAttributes(normalized: string): ParsedAttribute[] {
  const out: ParsedAttribute[] = [];
  // Unicode letter lookahead instead of \b (which is ASCII-only and fails after
  // cyrillic like «вт»/«квт»).
  const re = new RegExp(
    `(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_ALTERNATION})(?!\\p{L})`,
    "giu",
  );
  for (const m of normalized.matchAll(re)) {
    const value = Number(m[1].replace(",", "."));
    const unit = canonicalUnit(m[2]);
    if (unit && Number.isFinite(value)) {
      out.push({ raw: m[0].trim(), value, unit });
    }
  }
  return out;
}

/** Model code: letters+digits (HR2470) or digit-hyphen-digit (2-26, 12-16). */
function isModelToken(token: string): boolean {
  if (/^[a-zа-я]+\d[\w-]*$/i.test(token)) return true; // hr2470, gbh2-26
  if (/^\d+-\d+/.test(token)) return true; // 2-26, 12-16
  return false;
}

function classifyIntent(p: {
  brands: string[];
  models: string[];
  attributes: ParsedAttribute[];
  typeMatched: boolean;
  categoryMatched: boolean;
}): SearchIntent {
  const signals =
    (p.brands.length ? 1 : 0) +
    (p.models.length ? 1 : 0) +
    (p.attributes.length ? 1 : 0) +
    (p.typeMatched || p.categoryMatched ? 1 : 0);
  if (signals >= 2) return "MIXED";
  if (p.models.length) return "MODEL";
  if (p.brands.length) return "BRAND";
  if (p.attributes.length) return "ATTRIBUTE";
  if (p.typeMatched) return "PRODUCT_TYPE";
  if (p.categoryMatched) return "CATEGORY";
  return "GENERIC";
}

const MAX_QUERY_LENGTH = 200;

export function parseSearchQuery(
  raw: string,
  opts?: { lexicon?: SearchLexicon },
): ParsedQuery {
  const lexicon = opts?.lexicon ?? EMPTY_LEXICON;
  // Security (section 23): cap length to prevent regex/DoS abuse.
  const safeRaw = (raw ?? "").slice(0, MAX_QUERY_LENGTH);
  const normalized = normalizeQuery(safeRaw);
  const explain: QueryExplain[] = [];

  const attributes = extractAttributes(normalized);
  // Remove attribute substrings before tokenizing content words.
  let residual = normalized;
  for (const a of attributes) residual = residual.replace(a.raw, " ");

  const rawTokens = tokenize(residual);
  const negatives: string[] = [];
  const contentTokens: string[] = [];
  for (let i = 0; i < rawTokens.length; i++) {
    const tok = rawTokens[i];
    if (NEGATION_TRIGGERS.has(tok) && rawTokens[i + 1]) {
      negatives.push(rawTokens[i + 1]);
      i += 1;
      continue;
    }
    if (STOPWORDS.has(tok)) continue;
    contentTokens.push(tok);
  }

  const vocabulary = [
    ...synonymVocabulary(),
    ...lexicon.productTypeTerms,
    ...lexicon.categoryTerms,
  ];

  const brands: string[] = [];
  const models: string[] = [];
  const colors: string[] = [];
  const corrections: Array<{ from: string; to: string }> = [];
  const cleanTokens: string[] = [];

  const vocabSet = new Set(vocabulary);
  for (const original of contentTokens) {
    // Classify legitimate latin brands/models BEFORE any layout fix, so real
    // brands (makita, iphone) and model codes (hr2470) are never corrupted.
    if (isBrand(original)) {
      brands.push(original);
      continue;
    }
    if (isModelToken(original)) {
      models.push(original.toUpperCase());
      continue;
    }
    if (COLORS.has(original)) {
      colors.push(original);
      continue;
    }

    // Conditional layout fix: only when a latin token maps to a known term.
    let token = original;
    const layout = fixLayout(original);
    if (
      layout !== original &&
      (vocabSet.has(layout) || SYNONYM_HAS(layout))
    ) {
      corrections.push({ from: original, to: layout });
      explain.push({ label: "layout", detail: `${original} → ${layout}` });
      token = layout;
    }

    const { corrected, changed } = correctToken(token, vocabulary);
    if (changed) {
      corrections.push({ from: token, to: corrected });
      explain.push({ label: "spell", detail: `${token} → ${corrected}` });
    }
    cleanTokens.push(corrected);
  }

  // Candidate phrases: full phrase, adjacent bigrams, and single tokens — so
  // multi-word groups (e.g. "тепловая пушка", "мойка высокого давления") match.
  const phrase = cleanTokens.join(" ");
  const phrases: string[] = [phrase];
  for (let i = 0; i < cleanTokens.length - 1; i++) {
    phrases.push(`${cleanTokens[i]} ${cleanTokens[i + 1]}`);
  }
  if (cleanTokens.length >= 3) {
    for (let i = 0; i < cleanTokens.length - 2; i++) {
      phrases.push(`${cleanTokens[i]} ${cleanTokens[i + 1]} ${cleanTokens[i + 2]}`);
    }
  }

  const synonyms = new Set<string>();
  for (const ph of phrases) for (const s of expandSynonyms(ph)) synonyms.add(s);
  for (const t of cleanTokens) {
    for (const s of expandSynonyms(t)) synonyms.add(s);
    for (const s of expandSynonyms(singularize(t))) synonyms.add(s);
  }
  // Brands can imply a product type (iphone → смартфон).
  for (const b of brands) for (const s of expandSynonyms(b)) synonyms.add(s);
  if (synonyms.size) {
    explain.push({ label: "synonyms", detail: [...synonyms].join(", ") });
  }
  if (attributes.length) {
    explain.push({
      label: "attributes",
      detail: attributes.map((a) => `${a.value} ${a.unit}`).join(", "),
    });
  }
  if (brands.length) explain.push({ label: "brand", detail: brands.join(", ") });
  if (models.length) explain.push({ label: "model", detail: models.join(", ") });

  const typeTermSet = new Set(lexicon.productTypeTerms);
  const typeMatched =
    cleanTokens.some((t) => typeTermSet.has(t)) ||
    phrases.some((p) => typeTermSet.has(p)) ||
    synonyms.size > 0 ||
    SYNONYM_MATCHES(cleanTokens, phrase);
  const categoryTermSet = new Set(lexicon.categoryTerms);
  const categoryMatched =
    phrases.some((p) => categoryTermSet.has(p)) ||
    cleanTokens.some((t) => categoryTermSet.has(t));

  const expandedTerms = [
    ...new Set([...cleanTokens, ...synonyms, ...colors].filter(Boolean)),
  ];

  const intent = classifyIntent({
    brands,
    models,
    attributes,
    typeMatched: Boolean(typeMatched),
    categoryMatched: Boolean(categoryMatched),
  });
  explain.push({ label: "intent", detail: intent });

  return {
    original: safeRaw,
    normalized,
    tokens: cleanTokens,
    corrections,
    brands,
    models,
    attributes,
    synonyms: [...synonyms],
    negatives,
    expandedTerms,
    intent,
    explain,
  };
}

/** True when tokens/phrase belong to a known synonym group (implies a type). */
function SYNONYM_MATCHES(tokens: string[], phrase: string): boolean {
  if (expandSynonyms(phrase).length) return true;
  return tokens.some((t) => expandSynonyms(t).length > 0);
}

/** True when a term is a member of a synonym group. */
function SYNONYM_HAS(term: string): boolean {
  return expandSynonyms(term).length > 0;
}
