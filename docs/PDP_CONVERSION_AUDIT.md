# PDP Conversion Audit — EPIC-A-007

**Scope:** Railway staging. Catalog Core / Ranking / Auth / OMS / Vercel production unchanged.

## 1. First 5 seconds

| Signal | Status | Notes |
|--------|--------|-------|
| Photo | OK | Gallery primary |
| Title | OK | Large H1 |
| Price | OK | Primary color, large |
| CTA | OK | Purchase panel + sticky mobile |
| Trust near CTA | OK | `PdpTrustBlock` below buy |
| Brand | Partial | Badge if `brandId` set |
| City | OK | Map pin |

## 2. Gaps (pre-A-007)

- No explicit «Почему покупают» conversion block
- Specs mix meta (SKU/city) with product attributes — important chars not prioritized
- Reviews placeholder exists but empty-state copy can be clearer («будьте первым»)
- No product completeness score for sellers
- Funnel has product_view / add_to_cart / cta_click / trust_block_view — missing section-level intents
- Admin analytics exists; dedicated conversion dashboard (low-quality listings) missing

## 3. Improvements in A-007

1. ProductCompletenessScore (0–100) — seller list + admin conversion
2. PDP: why-buy strip, prioritized specs, smarter empty states
3. Analytics: `pdp_section_view`, `seller_block_view`, `characteristics_expand`, `delivery_view`, `buy_intent`
4. `/admin/conversion` — funnel + low converters + no-photo / low-score listings

## 4. Non-goals

- Ranking changes
- Fake reviews/ratings
- Vercel production deploy
