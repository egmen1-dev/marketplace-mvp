# EPIC 103 — Closed Beta Release Candidate Validation

**Role:** Principal QA / Release Engineering validation of the Closed Beta candidate.  
**Branch:** `cursor/epic-103-closed-beta-rc-validation-d03e`  
**Candidate commit:** `5303e56` (EPIC 102 + validation harness)

## Golden Rule

Evidence > assumptions. Statuses are **PASS**, **FAIL**, **BLOCKED**, **NOT_RUN**, **NOT_SUPPORTED**, or **INSUFFICIENT_DATA** — never upgraded without evidence.

## Canonical Candidate

| Field | Value |
|-------|-------|
| Git commit | `5303e565f9b441d87b002f791aad7f835c2d90ac` |
| App version | `0.1.2-alpha` |
| versionCode | `3` |
| API base | `https://web-production-e56fb.up.railway.app` |
| Staging deploy | `feb4b8d` (does **not** match candidate) |

Artifact: `artifacts/epic-103-beta-rc/baseline.json`

## Final Scorecard

| Area | Status | Evidence |
|------|--------|----------|
| BUILD | PASS | APK SHA256 recorded in baseline |
| STAGING | **FAIL** | Staging commit ≠ candidate commit |
| BETA API | **FAIL** | `/api/product-ops/beta/*` → HTTP 404 on staging |
| TELEMETRY E2E | PASS | 6 event types accepted HTTP 200 |
| FEEDBACK E2E | PASS | 6 categories submitted HTTP 200 |
| CRASH OBSERVATORY | PASS | Crash event transport HTTP 200 |
| PERFORMANCE | BLOCKED | Beta API not deployed |
| BUYER JOURNEY | NOT_RUN | Physical Android required |
| SELLER JOURNEY | NOT_RUN | Physical Android required |
| CROSS-ROLE (API) | PASS | Seller home, catalog, cart add |
| CROSS-ROLE (purchase) | NOT_SUPPORTED | Mobile checkout placeholder |
| OFFLINE / RESTART | NOT_RUN | Physical device required |
| AUTHORIZATION | PASS | Buyer cannot access seller product list |
| PRIVACY | PASS | Static audit — 0 blockers |
| DASHBOARD ACCURACY | BLOCKED | Beta API not deployed |

## Bugs Found

| ID | Severity | Issue |
|----|----------|-------|
| EP103-001 | **P1** | EPIC 102 beta API routes return 404 on staging — not deployed |
| EP103-003 | **P1** | Mobile checkout screen is placeholder — buyer cannot complete checkout on device |

**P0:** 0 · **P1:** 2 · **P2:** 0 · **P3:** 0

## Final Verdict

# **NOT_READY_FOR_CLOSED_BETA**

### Blockers before Closed Beta

1. **Deploy EPIC 102** to staging Railway (`cursor/epic-102-closed-beta-program-d03e` or merged main).
2. **Re-run** `npm run product:epic-103:beta-rc` and confirm `BETA_API` → PASS.
3. **Physical device validation** — buyer/seller golden journeys, offline, restart, destructive taps (currently NOT_RUN).
4. **Checkout path** — document NOT_SUPPORTED for native mobile checkout OR implement alpha web redirect before claiming buyer journey complete.

### What already works (staging evidence)

- Core commerce APIs: buyer login, catalog, cart, favorites, orders, seller home (`mobile:staging-smoke` PASS)
- Telemetry transport: all EPIC 102 event types accepted
- Feedback ingestion: all 8 categories with metadata
- Crash event transport with context fields
- Privacy audit: no sensitive field leakage in beta modules

## Regression Command

```bash
npm run product:epic-103:beta-rc
```

Includes: typecheck, EPIC 102 gate, EPIC 83 gate, staging smoke, EPIC 103 unit tests, full RC validation harness.

## Artifacts

```
artifacts/epic-103-beta-rc/
├── baseline.json
├── staging-endpoints.json
├── telemetry-e2e.json
├── feedback-e2e.json
├── crash-observatory.json
├── cross-role-transaction.json
├── privacy-audit.json
├── release-gates-calibration.json
├── bugs.json
└── final-report.json
```

## Physical Android

**NOT_RUN** — Operator must execute buyer/seller golden journeys on physical device with canonical APK before Closed Beta launch.

## Next Steps

1. Merge EPIC 102 + EPIC 103 PRs
2. Deploy to staging
3. Re-run RC gate → expect BETA_API PASS
4. Physical acceptance on Android
5. If checkout remains NOT_SUPPORTED, scope Closed Beta buyer journey to cart-only + web checkout explicitly
