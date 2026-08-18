# EPIC 110 — Main Branch Promotion & Production Release Gate

**Goal:** Safely promote EPIC 102–109 stack to `main`, verify Railway deploy, gate Closed Beta.

## Gate

```bash
npm run product:epic-110:production-release
```

Exits **0** only when verdict is `READY_FOR_CLOSED_BETA`.

## Library

```
lib/release/promotion/
├── PromotionPlanner    — PR stack graph (#124–#131)
├── PromotionExecutor — merge dry-run (PROMOTION_EXECUTE=1 to merge)
├── PromotionValidator — SHA quartet + Railway routes
├── PromotionRollback  — rollback readiness (read-only)
├── PromotionReporter  — writes artifacts/epic-110/
```

## Admin

`/admin/release` — live SHA, health, routes, stack summary.

## Artifacts

```
artifacts/epic-110/
├── release-pr-stack.json
├── deployment-diff.json
├── railway-route-report.json
├── release-evidence.json
├── rollback-report.json
├── production-gate.json
└── final-verdict.json
```

## Operator flow

1. Mark PRs **Ready for review** (#124–#131)
2. Merge stack (or merge tip PR #131)
3. Redeploy Railway from `main`
4. `npm run product:epic-110:production-release`
5. `npm run product:epic-108:release-candidate-final`

## Merge execution (optional)

```bash
PROMOTION_EXECUTE=1 npm run product:epic-110:production-release
```

Only when operator explicitly enables — default is **dry-run**.

See `docs/RELEASE_PIPELINE.md`.
