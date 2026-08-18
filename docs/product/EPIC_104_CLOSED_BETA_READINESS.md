# EPIC 104 — Closed Beta Readiness

**Goal:** Eliminate blockers between RC and first external beta testers. No new marketplace features.

**Branch:** `cursor/epic-104-closed-beta-readiness-d03e`

## Checkout Strategy (Part 3)

**Selected: Mode A — Web Checkout Redirect**

| Step | Behavior |
|------|----------|
| Buyer taps Checkout | Mobile loads `/api/mobile/checkout/web-url` |
| Handoff | One-time token → `/api/mobile/checkout/enter` sets web session cookie |
| Payment | User completes checkout on secure web (`/checkout`) |
| Return | User returns to app via `lot://orders` or Orders tab |

No native payment fabrication. Strategy constant: `web_redirect` in `app/api/mobile/checkout/web-url/route.ts`.

## Gate

```bash
npm run product:epic-104:closed-beta-readiness
```

Exits **1** when any exit criterion fails.

## Exit Criteria

| Criterion | Requirement |
|-----------|-------------|
| Deployment parity | Staging commit SHA = candidate SHA |
| Beta API | All 6 routes HTTP 200, valid schema |
| Buyer journey | API golden path PASS |
| Seller journey | API golden path PASS |
| Checkout | `web_redirect` supported |
| Crash-free | ≥99% (when data available) |
| Critical bugs | 0 |

## Artifacts

```
artifacts/epic-104/
├── deployment-report.json
├── beta-api-report.json
├── journey-report.json
├── performance-report.json
├── crash-report.json
├── ux-report.json
├── release-dashboard.json
└── gate-report.json
```

## Beta API Routes

- `GET /api/product-ops/beta/dashboard`
- `GET /api/product-ops/beta/journey`
- `GET /api/product-ops/beta/exit-report`
- `GET /api/product-ops/beta/performance`
- `GET /api/product-ops/beta/crashes`
- `GET /api/product-ops/beta/readiness`

## Physical Device

Golden journey UI validation remains **NOT_RUN** in cloud — operator must verify on physical Android after staging deploy.

## Deploy Blocker

Until candidate is deployed to staging Railway, `deployment-report.json` verdict = **FAIL** and beta API routes return **404**.
