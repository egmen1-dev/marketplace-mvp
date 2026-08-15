# Ranking V1 Candidate

**Version label:** Ranking V1 Candidate  
**Status:** Advisory only — **not** applied to live search  
**Epics:** MARKETPLACE-INTEGRATION-VALIDATION-001, MARKETPLACE-INTEGRATION-STAGING-ACCEPTANCE-002

---

## Architecture (three layers)

```text
1. ELIGIBILITY — can the product participate in TOP?
2. ORGANIC RANKING — weighted factor score 0–100
3. PAID PROMOTION — capped boost on eligible products only
```

---

## Eligibility policy

Hard gates (TOP blocked):

- Prohibited / moderation rejected
- No hero photo or `<2` photos
- Stock = 0
- Keyword spam / duplicate / invalid price
- Overall quality `<45`
- Extremely low trust with active violations

Negative controls in lab (`NEG-*`) confirm `TOP ELIGIBILITY = BLOCKED`.

---

## Organic factors

Default weights (`DEFAULT_RANKING_WEIGHTS_V1`):

| Factor | Weight | Role |
|--------|-------:|------|
| Photos | 15% | SECONDARY |
| Description | 8% | SECONDARY |
| SEO (card quality) | 10% | PRIMARY |
| Category | 7% | SECONDARY |
| Inventory | 5% | HARD_GATE |
| Trust | 12% | PRIMARY |
| Reviews | 8% | SECONDARY |
| Shipping | 5% | SECONDARY |
| CTR | 18% | PRIMARY |
| Conversion | 7% | SECONDARY |
| Price | 5% | TIE_BREAKER |

**Query relevance** is measured separately from card SEO quality. A high-quality irrelevant card must not outrank a relevant competitor.

SEO components (lab decomposition):

```text
Title relevance
Category relevance
Attributes completeness
Description relevance
Semantic query match
Keyword stuffing penalty
```

---

## Promotion policy

- Max boost: **5%** of organic score (V1 advisory candidate)
- Only when eligibility = PASS
- `badPromoCannotBuyTop = true`
- `badPromoCannotBypassEligibility = true`
- Future UX: compare boost-inside-ranking vs separate «Продвигается» slots (not activated)

---

## Cold-start policy

New products without behavioural history receive a neutral prior in lab scoring so they are not permanently buried. Exploration window documented; not connected to live search.

---

## Trust & review confidence

- Trust 70 for a new seller ≠ trust 70 after 100 orders — seller explanation includes confidence caveat
- Review count + rating combined; single 5.0 review does not equal 500×4.9 confidence
- 4-day shipping late chain: delivery → trust input → ranking explanation (traceable in lab)

---

## Quality gates

See `lib/marketplace-ranking-intelligence/quality-gates.ts`. Lab validates 10+ negative card types.

---

## Update frequency (advisory recalculation)

Trigger events (aggregated windows allowed):

```text
PRODUCT_UPDATED
STOCK_CHANGED
PRICE_CHANGED
REVIEW_APPROVED
TRUST_CHANGED
ORDER_COMPLETED
SHIPPING_PERFORMANCE_CHANGED
PROMOTION_STARTED
PROMOTION_ENDED
```

Raw impressions do not force immediate recalc.

---

## Versioning & rollback

- Weights stored in `RankingAlgorithmVersion` + `RankingWeight`
- Admin creates new version via `/admin/ranking`; no silent edits
- Rollback = activate previous version + audit log

---

## Seller explanation policy

`/account/ranking` uses Russian seller-friendly labels:

```text
Участие в выдаче
Оценка позиции (не точное место)
Карточка / Продавец / Интерес покупателей / Условия покупки
```

Copy rule: «Оценочная позиция в тестовой модели: около N места» — never promise exact live rank before activation.

---

## What V1 does **not** do

- Does not change `resolveOrderBy()` / live catalog sort
- Does not auto-activate campaigns from ranking score alone
- Does not guarantee TOP placement

Verified on staging: `resolveOrderBy()` uses price/date/views/favorites only.

---

## Calibration evidence

| Artifact | Content |
|----------|---------|
| `artifacts/ranking-lab/100-products.json` | Controlled matrix |
| `artifacts/ranking-lab/dataset-audit.json` | Per-product factor table |
| `artifacts/ranking-lab/experiment-results.json` | 50 experiments + TOP-10 + #11 gap |
| `artifacts/ranking-lab/product-reports/` | 100 human-readable reports |
| `artifacts/ranking-lab/factor-influence.json` | Machine-readable influence |

Regenerate: `npm run ranking:lab:100`

---

## Next step

Complete manual sign-off in `docs/RANKING_V1_ACTIVATION_GATE.md` before any live search connection.
