# Search Intelligence Platform (AGENT-020)

A UI-independent, scalable search layer for LOT. It turns a raw query into an
explainable structured intent that drives retrieval; LOT Ranking v1 orders results.

## Pipeline (section 3)

```
Query → Normalization → Spell correction → Synonyms → Taxonomy expansion →
Intent detection → Candidate generation → Ranking → Diversification → Results
```

## Modules

| Layer | Where | Role |
| --- | --- | --- |
| Pure core | `lib/search-intelligence/` | normalize, lexicon (synonyms/brands/units), spell, `parseSearchQuery` |
| Server | `features/search/` | lexicon (cached from taxonomy), `expandSearch`, `diversifyBySeller`, analytics |
| Wiring | `features/products/queries.ts` | `buildWhere` uses expanded terms; `listProducts` diversifies |
| Admin | `/admin/search` | explainability + analytics (admin only) |

## Query understanding (`parseSearchQuery`)

- **Normalization** (§4): lowercase, ё→е, collapse spaces, unify hyphens, wrong
  keyboard-layout fix, light singular folding.
- **Spell correction** (§5): bounded Levenshtein vs an injected vocabulary
  (product types + aliases + synonyms). Numbers, model codes and brands are never
  "corrected". e.g. `болгарга→болгарка`, `перфораторр→перфоратор`.
- **Synonyms** (§6): centralized `SYNONYM_GROUPS` — `ушм↔болгарка`, `ноут↔ноутбук`,
  `смартфон↔телефон↔айфон↔iphone`, `минимойка↔мойка высокого давления`, …
- **Taxonomy expansion** (§7): the lexicon is built from ProductType names/aliases
  (TASK 058), so type terms are recognized and drive intent.
- **Brand** (§8): known `BRANDS` set (makita, bosch, kolner, samsung, apple, …).
- **Model** (§9): alphanumeric codes (HR2470, 2-26, 12-16).
- **Attributes** (§10): number + unit (`2200 Вт`, `18 В`, `16 литров`, `2 кВт`,
  `12 Ач`, `125 мм`) with canonical units; colors.
- **Mixed** (§11): `Makita перфоратор 800Вт` → brand + type + attribute → intent
  `MIXED`.
- **Negatives** (§12): `без/не X` captured (architecture prepared).
- **Intent** (§16): BRAND / MODEL / CATEGORY / PRODUCT_TYPE / ATTRIBUTE / MIXED /
  GENERIC (combination-based).

## Candidate generation & ranking

`buildWhere` matches products against the union of expanded terms (tokens +
corrections + synonyms + brands + models) plus attribute matches on
`ProductCharacteristicValue` — broad recall. Ordering is LOT Ranking v1
(`Product.rankingScore`), so precision comes from ranking, not boolean AND.

## Diversification (§20)

`diversifyBySeller` (≤2 consecutive per seller) is applied to search/browse pages
(not price sorts or single-seller storefronts).

## Explainability (§19)

`/admin/search` shows the full `ParsedQuery` (normalization, corrections, synonyms,
brands, models, attributes, expanded terms, intent) + result count. The parser also
returns an `explain[]` list (`label`/`detail`).

## Analytics (§21)

`SearchQueryLog` records each search (normalized text only — no PII): frequency,
empty queries, success rate, top empty queries. Surfaced on `/admin/search`.
CTR-ready via `clickedProductId`.

## Performance & security (§22/23)

- Lexicon cached in-process (5-min TTL) — no per-request N+1.
- Queries capped at 200 chars; unicode-safe attribute regex (no catastrophic
  backtracking); all DB matching via Prisma parameters (no SQL injection);
  regex-special input is handled safely.

## Tests

`tests/search-intelligence.test.ts` — 24-case dataset across all query kinds
(spell, synonyms, brand, model, attribute, mixed, intent, negatives, security).
