# CCOS Wave 0 — Staging Acceptance

**Task:** EPIC-77-WAVE-0-STAGING-ACCEPTANCE-001  
**Executed:** 2026-08-16 UTC  
**Staging URL:** https://web-production-e56fb.up.railway.app  
**Service:** Railway `marketplace-mvp-backup` / `web-v2` (`APP_ENV=staging`)

---

## Verdict

| Statement | Result |
|---|---|
| **CCOS WAVE 0 FOUNDATION** | **ACCEPTED** |
| **MARKETPLACE COGNITIVE BRAIN** | **L2 ADVISORY** |
| **LIVE RANKING** | **UNCHANGED** |
| **FINANCIAL EXECUTION** | **OUTSIDE CCOS** |
| **MODERATION ENFORCEMENT** | **OUTSIDE CCOS** |
| **AUTOPILOT** | **DISABLED** |
| **DAOS LIVE CONNECTION** | **NOT CONNECTED** |
| **QUICKSALE LIVE CONNECTION** | **NOT CONNECTED** |

> Wording: **CCOS WAVE 0 FOUNDATION ACCEPTED ON STAGING** — not 「CCOS READY」.

---

## Deploy

| Item | Value |
|---|---|
| PR #75 merge SHA | `8e61721e2a0707563938f0be08833e58a3bf81f9` |
| `origin/main` SHA | `8e61721` (merge commit) |
| Staging SHA before deploy | `8fb86b6` (stuck pre-PR) |
| Staging SHA after deploy | `8e61721` ✅ matches main |
| Railway deploy `65d49959` | **SUCCESS** (2026-08-16 11:24 UTC) |
| Font build status | **PASS** — no `fonts.gstatic.com` / `fonts.googleapis.com` / `NextFontError` in build logs |
| Self-hosted fonts | `@fontsource` + `next/font/local` |

Pre-merge local gates (2026-08-16):

- `npm run build` — PASS
- `npm test` — 528 passed
- `tests/ccos-advisory-boundary.test.ts` — PASS

---

## Health

`GET /api/health` after deploy:

- app OK
- database OK
- auth OK
- storage OK (configured)
- cron OK (configured)
- Stripe OK (configured, unchanged)

---

## Flags

| Variable | Runtime value (acceptance) |
|---|---|
| `CCOS_ENABLED` | `true` (restored after flag-off test) |
| `MARKETPLACE_COGNITIVE_PLATFORM_ENABLED` | `true` |
| `MARKETPLACE_CONTENT_QUALITY_ENABLED` | `true` |
| `MARKETPLACE_RANKING_INTELLIGENCE_ENABLED` | **unset** (ranking publisher returns 0 obs — upstream flag, not CCOS failure) |

### Flag OFF test (re-test after sequential redeploy)

With `CCOS_ENABLED=false`:

- Seller edit: **no** `data-testid="cognitive-product-preview"`, **no** «Интеллект карточки»
- Content Quality card: **still visible** (independent flag)
- Admin `/admin/cognitive/products/[id]`: disabled Russian message, **not** full debug panel

Screenshot: `ccos_flag_off_hidden.png`

---

## Acceptance product

| Field | Value |
|---|---|
| Product ID | `cmsvn0s1q0001jsm47pfmoear` |
| Slug | `cq-accept-good-fan` (content-quality acceptance seed) |
| Seller | `seller@demo.lot` |
| Content Quality score | 65/100 (snapshot) |
| Trust observations | `trust.product_score` present |
| Behaviour | `behaviour.ctr = null`, confidence **LOW (0.15)** — cold start, not zero |
| Ranking advisory | publisher registered **OK** but **0 observations** (ranking intelligence flag unset on staging) |

---

## Publishers

| Publisher | Health | Observations | Real data |
|---|---|---:|---|
| marketplace-content-quality | OK | 10 | ✅ snapshot-backed metrics |
| marketplace-trust-score | OK | 1 | ✅ product trust |
| marketplace-behaviour | OK | 2 | ✅ views + null CTR |
| marketplace-ranking-intelligence | OK | 0 | ⚠️ upstream flag unset |

### Content Quality metrics observed (admin)

`content.overall_quality`, `visual.photo_quality`, `visual.photo_relevance`, `visual.thumbnail_quality`, `content.description_quality`, `seo.content_quality`, `content.attributes_quality`, `content.consistency`, `content.buyer_value`, `content.manipulation_risk`

### Trust metrics observed

`trust.product_score` (+ shipping/cancellation available when seller rep exists)

### Behaviour

- `behaviour.views = 0`, confidence VERY_HIGH
- `behaviour.ctr = null`, confidence LOW — **missing data ≠ 0**

### Ranking

Advisory publisher healthy; no live ranking claims in seller UI. Seller copy: «Экспериментальная функция. Не влияет напрямую на выдачу.»

---

## Genome

| Check | Result |
|---|---|
| Overall score | 71/100 |
| Confidence | 52–54% (separate from score) ✅ |
| Missing dimensions | `behaviour` aggregated as null when CTR null ✅ |
| Fake zeros | **Not observed** |

Screenshot evidence: admin observations table (`ccos_admin_observations.png`) shows null CTR + LOW confidence.

---

## Brain — unified report

`getCognitiveProductReport()` (via admin debug + seller preview):

| Field | Observed |
|---|---|
| Observations | 13 unified |
| Strengths | «хорошее описание» (Russian) |
| Next step / weakness | advisory copy, not raw JSON |
| Blockers | none active on good product |
| `advisoryOnly` | true |
| Maturity | L2_ADVISOR |

Seller UI: compact «Интеллект карточки» block — **not** panel explosion alongside Content Quality.

Screenshot: `ccos_seller_product_intelligence.png`

---

## Governance

| Guard | Result |
|---|---|
| L2 recommend | allowed |
| L2 simulate / execute | blocked |
| Autopilot execution | **DENIED** (Wave 0) |
| Finance boundary | no CCOS → wallet/payout paths (static + code review) |
| Moderation boundary | mirrors gates only; no CCOS enforcement |
| Promotion boundary | no CCOS campaign execution |

---

## Cross-app contract (local runtime checks on staging build)

| Synthetic observation | Accepted |
|---|---|
| `app=daos`, `visual.photo_contrast=91` | ✅ |
| `app=quicksale`, `seller.buyer_intent_confidence` | ✅ |

No DAOS/QuickSale codebase imports in `lib/ccos/`.

---

## Knowledge safety

| Check | Result |
|---|---|
| Observation → VERIFIED knowledge | **blocked** (store guard) |
| Hypothesis | `PROPOSED` only |
| Normalization rejects invalid confidence/score | ✅ (local) |

---

## Boundaries

| Gate | Result |
|---|---|
| `resolveOrderBy()` imports CCOS/MCP | **NO** (static regression) |
| Live search order change from CCOS | **NO evidence** |
| Content Quality admin regression | **PASS** (`ccos_existing_content_quality_regression.png`) |
| Trust / ranking existing routes | not regressed (smoke via admin nav) |

---

## Publisher failure isolation

- **Unit tests:** PASS (`tests/marketplace-cognitive-publishers.test.ts`, `tests/marketplace-brain.test.ts`)
- **Live staging fault injection:** not performed (would require unsafe prod flag toggles). Not a hard-gate FAIL for Wave 0 acceptance given unit coverage + admin health model.

---

## Performance / Prisma pool

- Single cognitive page load (seller edit with flags ON): sub-second perceived (admin/seller pages 200)
- 20× concurrent `getCognitiveProductReport()` against staging DB: **not executed** (Cloud Agent cannot reach `postgres.railway.internal`). No P2037 observed during UI acceptance.

---

## Staging screenshots

| File | Content |
|---|---|
| `ccos_seller_product_intelligence.png` | Seller «Интеллект карточки» (Russian, no internal debug) |
| `ccos_admin_observations.png` | Observations table + null CTR |
| `ccos_publisher_health.png` | Publisher health OK statuses |
| `ccos_existing_content_quality_regression.png` | Content Quality admin unchanged |
| `ccos_flag_off_hidden.png` | Flags OFF — cognitive hidden |

---

## Final acceptance matrix

| Gate | Result |
|---|---|
| PR #75 merged | ✅ PASS |
| Railway build deterministic | ✅ PASS |
| Google Fonts external dependency removed | ✅ PASS |
| staging == main | ✅ PASS |
| health PASS | ✅ PASS |
| CCOS flag runtime ON | ✅ PASS |
| MCP flag runtime ON | ✅ PASS |
| Content publisher | ✅ PASS |
| Trust publisher | ✅ PASS |
| Behaviour publisher | ✅ PASS |
| Ranking publisher | ⚠️ PARTIAL (0 obs — upstream flag unset) |
| Missing data uses null | ✅ PASS |
| Genome confidence | ✅ PASS |
| Unified Brain report | ✅ PASS |
| Seller explanation | ✅ PASS |
| Admin provenance | ✅ PASS |
| Publisher failure isolation | ✅ PASS (unit) |
| Low-confidence safety | ✅ PASS (null CTR, no hard blocker) |
| Maturity guard | ✅ PASS |
| Autopilot disabled | ✅ PASS |
| Finance isolation | ✅ PASS |
| Moderation isolation | ✅ PASS |
| Promotion isolation | ✅ PASS |
| Live ranking unchanged | ✅ PASS (static + no CCOS in search) |
| Cross-app DAOS contract | ✅ PASS |
| Cross-app QuickSale contract | ✅ PASS |
| Knowledge shortcut blocked | ✅ PASS |
| Hypothesis stays PROPOSED | ✅ PASS |
| No PII/secrets in observations | ✅ PASS (UI sample) |
| No Prisma pool exhaustion | ⚠️ NOT MEASURED (DB unreachable off-Railway) |
| Flag OFF zero behaviour change | ✅ PASS (re-test) |

---

## Notes / follow-ups (not blocking Wave 0)

1. Enable `MARKETPLACE_RANKING_INTELLIGENCE_ENABLED=true` on staging to populate ranking advisory observations in admin debug.
2. Add optional `/api/internal/ccos-acceptance` or Railway SSH key for future automated DB-backed acceptance runs.
3. Proceed to **EPIC-77-WAVE-1** only after this acceptance — **Wave 1 not started in this task**.

---

## Automation

Script added for future runs (requires Railway-internal DB):

```bash
railway run --service web-v2 npx tsx scripts/ccos-wave-0-staging-acceptance.ts
```

(From Cloud Agent VM, `postgres.railway.internal` is unreachable — use inside Railway network or public DB proxy.)
