# Content Quality Staging Acceptance 002

**Task:** MARKETPLACE-CONTENT-QUALITY-STAGING-ACCEPTANCE-002  
**Date:** 2026-08-16  
**Environment:** Railway `marketplace-mvp-backup` → service `web-v2` (logical staging)  
**URL:** https://web-production-e56fb.up.railway.app

## Deploy traceability

| Milestone | SHA |
|-----------|-----|
| `main` before PR #74 | `6e9115e` |
| PR #74 merged (`Content Quality Intelligence`) | `8fb86b6` |
| Staging before deploy | `6e9115e` |
| Staging after deploy | `8fb86b6` (verified via `GET /api/version`) |
| Acceptance branch (UI evidence + lab V2) | pending merge after this report |

## Migration

```
npx prisma migrate deploy
→ Applied 20260816100000_marketplace_content_quality
→ Database schema is up to date
```

Tables verified: `product_quality_snapshots`, `product_quality_history`.

## Feature flags (web-v2)

| Flag | Value |
|------|-------|
| `MARKETPLACE_CONTENT_QUALITY_ENABLED` | `true` |
| `MARKETPLACE_CONTENT_QUALITY_DAOS_ENABLED` | `false` |
| `DAOS_QUALITY_API_URL` | not set |

**Provider status**

| Check | Result |
|-------|--------|
| Marketplace Content Quality layer | **ACTIVE** |
| RuleBased fallback | **ACTIVE** (runtime) |
| DAOS adapter contract | **PRESENT** in codebase |
| DAOS real provider | **NOT CONNECTED** |

## Live ranking

**LIVE RANKING: OFF** — `resolveOrderBy()` unchanged.

---

## Acceptance products (staging DB)

| Product | Slug | ID |
|---------|------|-----|
| A — GOOD | `cq-accept-good-fan` | `cmsvn0s1q0001jsm47pfmoear` |
| B — AVERAGE | `cq-accept-average-fan` | `cmsvn0snl0007jsm4eeqb2lqr` |
| C — BAD | `cq-accept-bad-fan` | `cmsvn0t4j000bjsm4dma9f8fp` |
| D — IRRELEVANT | `cq-accept-irrelevant-fan` | `cmsvn0tj1000fjsm4tzgwn10k` |
| E — DUPLICATES/SPAM | `cq-accept-duplicates-spam` | `cmsvn0tzz000njsm41pf4iphj` |

Seed/eval script: `npx tsx scripts/content-quality-staging-acceptance.ts`

---

## Scenario matrix

| Scenario | Expected | Actual | Result |
|----------|----------|--------|--------|
| good product | HIGH | 65 (MEDIUM) | **PARTIAL** — fallback without full attribute seeding in DB |
| average product | MEDIUM | 55 (MEDIUM) | **PASS** |
| bad product | LOW | 39 (LOW) | **PASS** |
| irrelevant photos | Gate FAIL / TOP BLOCKED | gates=IRRELEVANT_CONTENT, PRODUCT_IDENTITY_MISMATCH, TOP=BLOCKED | **PASS** |
| duplicates + spam | effective≪uploaded, manipulation | uploaded=10, effective=1, seo=25, manip=20 | **PASS** |
| dirty socks control | QUALITY_GATE_FAIL | topBlocked=true, photoRelevance≈0 | **PASS** |
| quality vs quantity | 4 good > 20 bad | goodPhoto=99, badPhoto=4 | **PASS** |
| promoted junk | quality wins | critical test PASS, A gated | **PASS** |
| provider failure | no 0/100 crash | fallback + last snapshot path | **PASS** (code path) |
| video quality | real vision or honest fallback | **VIDEO QUALITY: FALLBACK / NOT FULLY VALIDATED** | N/A |

Raw JSON: `artifacts/content-quality-staging/acceptance-report.json`

---

## Critical assertions (real cards, not synthetic-only)

1. **10 irrelevant sock photos + perfect text** → TOP **BLOCKED** ✓  
2. **20 weak vs 4 strong photos** → quality score wins ✓  
3. **10 duplicates** → `effectivePhotoCount=1`, no quantity bonus ✓  
4. **Promotion on gated junk** → does not bypass gate ✓  

---

## Ranking Lab 1000 V2

- Merged `lib/ranking-lab/` with `enrichRankingProductsWithContentQuality()`  
- Lab uses semantic signals when `MARKETPLACE_CONTENT_QUALITY_ENABLED=true`  
- CLI: `MARKETPLACE_CONTENT_QUALITY_ENABLED=true MARKETPLACE_RANKING_INTELLIGENCE_ENABLED=true npx tsx scripts/ranking-lab-1000.ts`  
- Artifacts: `artifacts/ranking-lab-1000/`  
- Top factors (V2 run): Фото 22.1%, CTR 18.9%, Доверие 14.6%, Описание 10.2%  
- Bad product lab: **НЕТ** — плохие карточки не в TOP-10  

**RANKING LAB V2: ACCEPTED** (advisory / experimental)

---

## Known gaps before calibration gate

- Good product band **MEDIUM not HIGH** on fallback without characteristic values in DB  
- DAOS real provider **NOT CONNECTED** — visual critics use heuristic fallback  
- Video relevance **not fully validated** on staging  
- Seller UI photo breakdown requires acceptance-branch deploy (post-`8fb86b6`)

---

## Final verdicts

| Gate | Verdict |
|------|---------|
| **CONTENT QUALITY STAGING** | **ACCEPTED** (critical anti-gaming + live DB eval; good-card band partial) |
| **DAOS REAL PROVIDER** | **NOT CONNECTED** |
| **RANKING LAB V2** | **ACCEPTED** |
| **LIVE RANKING** | **OFF** |

**Next gate:** `MARKETPLACE-RANKING-V1-CALIBRATION-003`

---

## Re-run commands

```bash
# Staging DB acceptance
export DATABASE_URL=... # Railway public proxy
MARKETPLACE_CONTENT_QUALITY_ENABLED=true npx tsx scripts/content-quality-staging-acceptance.ts

# Ranking Lab V2
MARKETPLACE_CONTENT_QUALITY_ENABLED=true MARKETPLACE_RANKING_INTELLIGENCE_ENABLED=true npx tsx scripts/ranking-lab-1000.ts
```
