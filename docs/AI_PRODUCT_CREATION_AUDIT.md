# AI Product Creation Audit — EPIC-A-004

**Scope:** Local + Railway staging. Vercel production not modified.  
**Date:** 2026-08-12

## 1. Current seller create flow

```
/account/products/new
  → ProductForm (create)
      → title (controlled)
      → TaxonomySelector (matchProductTypes recommendations + manual browser)
      → DynamicCharacteristicsFields (from ProductType definitions)
      → description / price / stock / city / condition
      → pickup / dimensions
      → seoTitle / seoDescription (existing fields)
      → createProductAction → createProduct → ACTIVE (or validation fail)
```

Edit flow reuses the same form with `mode="edit"` and loads `ProductDetail`.

## 2. What already works (pre-A-004)

| Area | Status |
|------|--------|
| Seller product creation | Working — Server Action + Zod + Prisma |
| Taxonomy suggestion | Working — deterministic `matchProductTypes` in TaxonomySelector |
| ProductType selection | Required for ACTIVE publish (Catalog Core) |
| Characteristics | Dynamic fields from definitions; required chars validated |
| Validation | Zod schemas + `canPublishActive` / `assertActivePublishRequirements` |
| SEO fields | `seoTitle` / `seoDescription` on Product (no duplicates) |
| Publish flow | ACTIVE after save; facets via characteristic values |
| Facets | EPIC-A-003 — filterable defs → facet API |

## 3. Gaps where AI layer is needed

| Gap | Why AI / understanding helps |
|-----|------------------------------|
| Brand only in free text | No Brand entity; search weak for brand queries |
| Model mixed into title | No structured model field |
| Char extraction manual | Seller retypes power/voltage from title |
| SEO empty by default | Seller rarely fills SEO |
| Confidence UX | Matcher shows scores but no unified suggestion card |
| Learning from edits | No correction log for future LLM / rules tuning |

## 4. Design constraints (kept)

- **Do not replace** `matchProductTypes` — Understanding Engine **calls** it for ProductType.
- AI is **suggestion only** → human Apply → form fields → save.
- No silent publish of AI data.
- No mass brand backfill / mass import.
- Catalog Core + Facets unchanged as source of truth.

## 5. Post-A-004 flow

```
Title
  → AI analysis (rules-v1 + matcher)  [AiUnderstandingCard]
  → Suggestion card (category, ProductType, brand, model, chars, SEO, confidence)
  → Seller confirms (Apply) and/or edits
  → TaxonomySelector still available for manual override
  → Create / publish
  → Brand lazy-created; chars → ProductCharacteristicValue → facets
  → Correction row logged on Apply (knowledge loop foundation)
```
