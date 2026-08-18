# EPIC 105 — Closed Beta Launch Validation

**Goal:** Transform evidence-backed `NOT_READY` into `READY_FOR_CLOSED_BETA`. Release validation only — no new marketplace features, UI redesign, architecture work, or AI expansion.

**Branch:** `cursor/epic-105-closed-beta-launch-validation-d03e`

## Gate

```bash
npm run product:epic-105:closed-beta-launch-validation
```

Exits **1** when any launch criterion is not satisfied. **Evidence only — never upgrade UNKNOWN or NOT_RUN to PASS.**

## Parts

| Part | Scope | Cloud agent |
|------|--------|-------------|
| 1 — Deployment | Commit SHA, build version, API version, flags, beta modules | Automated |
| 2 — Beta infrastructure | Six beta API routes (see below) | Automated on staging |
| 3 — Physical Android | Buyer + seller UI journeys, screenshots, recordings, logcat | **NOT_RUN** (operator) |
| 4 — Checkout | Mobile → web redirect → enter → cookie → return deep link | Automated (no payment) |
| 5 — Crash-free | JS/native crashes, ErrorBoundary, ANR target ≥99% | Automated when DB + traffic |
| 6 — Performance | P50/P95/P99 for key screens | Automated when beta perf API deployed |
| 7 — UX | Dead ends, rage taps, back loops from telemetry | Automated when data exists |
| 8 — Dashboard | Dashboard vs readiness snapshot parity | Automated |
| 9 — Final report | Single `READY_FOR_CLOSED_BETA` or `NOT_READY` | Automated |

## Beta API Routes (staging)

Mapped from spec `/beta/*` to deployed paths:

- `GET /api/product-ops/beta/dashboard`
- `GET /api/product-ops/beta/journey`
- `GET /api/product-ops/beta/performance`
- `GET /api/product-ops/beta/crashes`
- `GET /api/product-ops/beta/readiness`
- `GET /api/product-ops/beta/exit-report`

## Exit Criteria

| Criterion | Requirement |
|-----------|-------------|
| Deployment parity | Staging commit SHA = candidate SHA |
| Beta API | All routes HTTP 200, valid schema |
| Buyer journey | API golden path PASS (+ physical PASS) |
| Seller journey | API golden path PASS (+ physical PASS) |
| Checkout redirect | `web_redirect` handoff chain PASS |
| Crash-free | ≥99% (≥100 sessions in 24h) |
| Critical bugs | 0 |
| Dashboard accuracy | Dashboard ↔ readiness snapshot match |
| Physical validation | Operator evidence on real Android |

## Artifacts

```
artifacts/epic-105/
├── deployment-validation.json
├── physical-device-report.json
├── checkout-validation.json
├── performance-validation.json
├── crash-validation.json
├── ux-validation.json
├── dashboard-validation.json
└── release-readiness.json
```

Beta route probe details are embedded in `release-readiness.json` → `betaInfrastructure`.

## Physical Device (Operator)

After staging deploy, run on a physical Android device:

**Buyer:** login → search → PDP → favorite → cart → checkout redirect → web checkout opens → return to app → orders → logout

**Seller:** login → workspace → products → product editor → inventory → orders → promotion → intelligence → wallet → logout

Collect: screenshots, screen recordings, logcat, timing. Place under `artifacts/epic-105/screenshots/`, `screen_recordings/`, `logcat.txt`, `timing.json`. Update `physical-device-report.json` verdict to PASS only with that evidence.

Checklist reference: `docs/mobile/EPIC_81_PHYSICAL_ACCEPTANCE_CHECKLIST.md`

## Deploy Blocker (current)

Staging (`https://web-production-e56fb.up.railway.app`) commit does not match candidate until EPIC 102–105 changes are merged and deployed. Beta routes and `/api/mobile/checkout/web-url` return **404** until then → gate verdict **NOT_READY**.

## Checkout (Mode A)

Same as EPIC 104: one-time JWT handoff → `/api/mobile/checkout/enter` sets session cookie → web `/checkout` → return `lot://orders`. Gate validates redirect chain only; no simulated payments.
