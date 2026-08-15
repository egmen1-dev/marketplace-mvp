# Ranking Lab 1000

**Epic:** MARKETPLACE-RANKING-LAB-1000-001  
**Module:** `lib/ranking-lab/`  
**Flag:** `MARKETPLACE_RANKING_INTELLIGENCE_ENABLED=true`

---

## Principle

Лаборатория анализа на **1000 синтетических товаров**.  
**Live search sort не изменяется** — `features/products/queries.ts` → `resolveOrderBy()` без изменений.

---

## Architecture

```text
lib/ranking-lab/
  generator-1000.ts      — 1000 structured products
  factor-analysis.ts     — per-product factor points (+14, -11, …)
  importance-engine.ts   — factor influence % (CTR 31%, …)
  sensitivity-engine.ts  — what-if position deltas
  bad-product-detector.ts — TOP gate for junk cards
  seller-advisor.ts      — actionable seller recommendations
  top-explainer.ts       — «Почему №12?»
  top-predictor.ts       — predicted position after changes
  ranking-academy.ts     — path to TOP-10
  marketplace-dashboard.ts — admin aggregates + heatmaps
  exports.ts             — JSON / CSV / markdown
  run-lab.ts             — full pipeline orchestrator
```

Scoring reuses advisory engine only:

- `computeRankingScore` from `lib/marketplace-ranking-intelligence/ranking-score.ts`
- `rankProductsByScore` from `calibration-100.ts`
- `DEFAULT_RANKING_WEIGHTS_V1`

---

## UI Routes

| Route | Audience | Purpose |
|-------|----------|---------|
| `/admin/ranking-lab` | Admin | Marketplace dashboard, importance, bad product lab, sensitivity |
| `/account/ranking-academy` | Seller | Academy, advisor, TOP predictor |

Existing `/admin/ranking` and `/account/ranking` unchanged.

---

## CLI

```bash
npm run ranking:lab:1000
```

Outputs to `artifacts/ranking-lab-1000/`:

| File | Format |
|------|--------|
| `ranking-lab-1000.json` | Full report |
| `product-reports.csv` | Per-product summary |
| `factor-importance.csv` | Importance engine |
| `RANKING_LAB_1000_REPORT.md` | Human-readable summary |

---

## Lab Stages

### 1. Generator (1000 products)

Deterministic seed `20260815`. Each product varies:

- price, photos, video, description, SEO, characteristics
- reviews, rating, trust, shipping proxy, promotion
- CTR, conversion, returns proxy, category (10 categories × 100)

Last 20 rows include **negative controls** (spam SEO, bad photos, prohibited, etc.).

### 2. Factor analysis

Per product:

```text
SEO        +14
Photos     +8
Reviews    +21
Trust      +18
CTR        +16
Conversion +27
Promotion  +4
Price      -11
```

Formula: `(factorScore - 50) × weight / 10`

### 3. Importance Engine

Pearson correlation between factor contribution and position, normalized to 100%.

Example output:

```text
CTR          31%
Conversion   24%
Trust        17%
SEO          10%
Photos       7%
Promotion    5%
Price        4%
Other        2%
```

### 4. Sensitivity Lab

Single-factor deltas on mid-tier product:

```text
+1 фото        #145 → #121
+10 отзывов    #121 → #84
доставка 1 день #84 → #61
```

### 5. Bad Product Lab

Dedicated junk cards merged into pool. Verdict:

```text
НЕТ — плохие карточки не попадают в TOP-10
```

Quality gates + low organic score block TOP even with promotion.

### 6. Seller Advisor

```text
Добавьте ещё 2 фотографии
ожидаемый рост +13 позиций
★★★★★
вероятность успеха 89%
```

### 7. Explain TOP

```text
Почему №12?
CTR выше среднего
очень хороший Trust
отличные отзывы
есть видео
не хватает SEO
```

### 8. TOP Predictor

```text
47 → 15 → 7
```

Combined advisor actions with confidence %.

### 9. Marketplace Dashboard

Admin panel metrics:

- TOP factors, category quality map
- good/bad card %
- average trust, SEO, CTR, conversion
- quality distribution bands
- heatmap data (category × factor)

### 10. Ranking Academy

Seller view:

```text
Ваш товар сейчас — 47 место
Чтобы попасть в TOP-10:
★★★★★ +3 фото
★★★★★ сделать видео
★★★★★ увеличить CTR
★★★★★ получить ещё 4 отзыва
Примерный шанс 82%
```

---

## Tests

```bash
npm test -- tests/ranking-lab-1000.test.ts
```

---

## Non-goals

- No changes to catalog sort order
- No production ranking activation
- No seller-facing promises tied to live search until Ranking V1 gate

Next business step after finance acceptance: controlled catalog expansion + Ranking V1 calibration using this lab.
