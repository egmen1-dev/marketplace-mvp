# RELEASE-HARDENING-001 — Acceptance Report

**Date:** 2026-08-13  
**Commit:** `c92a371`  
**Staging:** https://web-production-e56fb.up.railway.app  
**Deploy:** GitHub → Railway `web-v2` SUCCESS

---

## Environment

| Check | Result |
|-------|--------|
| `GET /api/version` | `commit: c92a371`, `environment: staging`, `buildTime: 2026-08-13T13:49:15.637Z` |
| `GET /api/health` | `ok: true` |
| database | ✅ |
| auth | ✅ |
| storage | ✅ configured |
| cron | ✅ configured |
| stripe | `configured: false` (optional; keys not set) |

---

## CLS before / after

Measured with `node scripts/rc-performance.mjs` against staging.

| Page | Viewport | Before (RC-001) | After (`c92a371`) | Target |
|------|----------|-----------------|-------------------|--------|
| Homepage | Desktop 1440 | **0.41** | **0.00** | < 0.1 ✅ |
| Catalog | Desktop 1440 | — | **0.00** | < 0.1 ✅ |
| Homepage | Mobile 390 | — | **0.00** | < 0.1 ✅ |
| Catalog | Mobile 390 | **0.52** | **0.00** | < 0.1 ✅ |

---

## Playwright Railway acceptance

Suite: admin, seller, staging-version, traffic-funnel, cart-favorites-checkout, conversion-intelligence

| Result | Count |
|--------|-------|
| Passed | **16** |
| Failed | **1** |

**Passed:** version/health, admin access, seller create/edit, buyer legacy `/seller/dashboard` redirect, traffic funnel, conversion intelligence, guest cart, checkout stop before payment.

**Failed (non-blocking for release gate):**

- `favorites › buyer can favorite a product` — React #310 on `/favorites` redirect path (pageerror during soft nav). Favorite action itself works; access control OK. Soft follow-up.

---

## Hardening delivered

1. **CLS** — stable product cards, font preload, hero min-height, catalog infinite-scroll defer, filter skeletons
2. **Stripe readiness** — `checks.stripe.configured` in health; docs + unit tests; no live keys
3. **Redirects** — middleware edge redirects for non-admin `/admin` and legacy `/seller/*` (admin/seller permission e2e green)
4. **Analytics** — `hero_product_click` (via `HeroProductLink`)
5. **Finance hook** — `onOrderPaidForFinance` stub after PAID
6. **Backup checklist** — Railway staging section in `PRODUCTION_BACKUP_CHECKLIST.md`

---

## Remaining blockers

| # | Item | Status |
|---|------|--------|
| 1 | Stripe test keys + webhook on Railway | ❌ not configured |
| 2 | E2E paid order | ❌ blocked by Stripe |
| 3 | Manual DB snapshot before prod | ⚠️ checklist ready, not executed |
| 4 | React #310 on `/favorites` soft nav | ⚠️ soft (functional OK) |
| 5 | Vercel production | out of scope |

---

## Verdict

**READY FOR MARKETPLACE RELEASE: NO** (conditional)

Staging is ready for **ad traffic → catalog → cart → checkout UI** after CLS + redirect hardening.

**YES** for commercial launch requires: Stripe test/live keys + webhook + one paid order + DB backup snapshot.
