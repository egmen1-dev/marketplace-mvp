/**
 * Search Intelligence — shared types (AGENT-020).
 * The parser is UI-independent and DB-agnostic (a lexicon is injected).
 */

export type SearchIntent =
  | "BRAND"
  | "MODEL"
  | "CATEGORY"
  | "PRODUCT_TYPE"
  | "ATTRIBUTE"
  | "MIXED"
  | "GENERIC";

export type ParsedAttribute = {
  raw: string;
  value: number;
  unit: string; // canonical unit, e.g. "Вт", "В", "кВт", "л", "Ач", "мм"
};

export type QueryExplain = { label: string; detail: string };

export type ParsedQuery = {
  original: string;
  normalized: string;
  /** Content tokens after normalization (excludes negatives / stopwords). */
  tokens: string[];
  /** Spell corrections applied: from → to. */
  corrections: Array<{ from: string; to: string }>;
  brands: string[];
  models: string[];
  attributes: ParsedAttribute[];
  /** Synonyms/related terms added for retrieval. */
  synonyms: string[];
  /** Negative terms (without/не …) — architecture prepared (section 12). */
  negatives: string[];
  /** Union of tokens + corrections + synonyms used for candidate generation. */
  expandedTerms: string[];
  intent: SearchIntent;
  explain: QueryExplain[];
};

/** Injected vocabulary for spell correction + taxonomy expansion. */
export type SearchLexicon = {
  /** ProductType names + aliases (normalized). */
  productTypeTerms: string[];
  /** Category names (normalized). */
  categoryTerms: string[];
};

export const EMPTY_LEXICON: SearchLexicon = {
  productTypeTerms: [],
  categoryTerms: [],
};
