# EPIC 108 — Release Candidate Final Verification

**Goal:** Final gate before inviting external Closed Beta testers — **after** EPIC 102–107 merged and deployed.

**Gate:** `npm run product:epic-108:release-candidate-final`

Exits **1** when verdict is `NOT_READY_FOR_CLOSED_BETA`.

---

## Preconditions

Before running, verify:

- PR #124–#128 merged into `main`
- `git rev-parse HEAD` === `git rev-parse origin/main`
- `app/api/product-ops/beta/readiness/route.ts` exists on `origin/main`

---

## Current run (2026-08-18)

**Preconditions: FAIL** — PRs #124–#128 remain **OPEN**; `origin/main` = `feb4b8d`.

**Verdict: NOT_READY_FOR_CLOSED_BETA**

| Area | Status |
|------|--------|
| Deployment | FAIL |
| Buyer Journey | FAIL |
| Seller Journey | PASS |
| Beta API | FAIL |
| Checkout | FAIL |
| Dashboard | FAIL |
| Telemetry | PASS |
| Crash Observatory | FAIL |
| Performance | FAIL |
| **Final Verdict** | **NOT_READY_FOR_CLOSED_BETA** |

Staging `/api/version` reports `feb4b8d` (matches old `main`, not EPIC stack). All beta routes return **404**.

---

## Artifacts

```
artifacts/epic-108/
├── deployment-report.json
├── beta-api-report.json
├── buyer-journey.json
├── seller-journey.json
├── performance-report.json
├── observability-report.json
├── dashboard-report.json
├── release-gates.json
└── final-verdict.json
```

---

## Unblock

1. Merge PR #124 → #125 → #126 → #127 → #128 (or merge #128 once)
2. Redeploy Railway from `main`
3. Re-run `npm run product:epic-108:release-candidate-final`
4. Complete physical Android validation (EPIC 105)
