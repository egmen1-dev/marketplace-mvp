# CCOS Wave 1 — Reality Audit

Audit date: 2026-08-16 · Branch baseline: `main` (Wave 0 accepted on staging)

## Purpose

Map existing marketplace context-like logic before Wave 1 implementation. **Do not duplicate** — Wave 1 adapters reuse these modules.

## Existing context-like structures

| Area | Location | Reuse in Wave 1 |
|------|----------|-----------------|
| Discovery recommendation context | `lib/marketplace-discovery/recommendation-context.ts` | `buildWhyReasons` — not duplicated; Brain uses CCOS query/category context |
| Ranking product input | `lib/marketplace-ranking-intelligence/queries.ts` | `loadProductInput` for prediction adapter |
| Ranking explainer | `lib/marketplace-ranking-intelligence/ranking-explainer.ts` | Observations via ranking publisher (staging flag) |
| Ranking recommendations / NBA | `lib/marketplace-ranking-intelligence/ranking-recommendations.ts` | Candidate source pattern; unified NBA in Brain V1 |
| Ranking sensitivity | `lib/ranking-lab/sensitivity-engine.ts` | `buildBrainSimulations` adapter |
| Top predictor | `lib/ranking-lab/top-predictor.ts` | Available; Wave 1 uses sensitivity first |
| Seller BI next action | `lib/seller-business-intelligence/next-action.ts` | Separate seller-level BI; product Brain merges product-level candidates |
| Seller lifecycle | `lib/seller-lifecycle/` + reputation orders | `seller-context.ts` lifecycle stages |
| Content quality blockers | `lib/marketplace-content-quality/` | Publisher + `decision.ts` quality gate mirror |
| Trust blockers | `lib/marketplace-trust-loop/` | Publisher observations; no enforcement in CCOS |
| Conversion completeness | `lib/conversion/` | Unchanged; not wired to Brain V1 |
| Season helpers | None dedicated | **New** `market-context.ts` deterministic seasons |
| Device/session | Partial in analytics | **New** `device-context.ts` optional dimension |

## Wave 0 CCOS baseline (must remain)

- `lib/ccos/observation/` — UniversalObservation, publishers, dedupe
- `lib/marketplace-cognitive-platform/genome/aggregate.ts` — base genome (unchanged scoring)
- `lib/marketplace-cognitive-platform/brain/report.ts` — Wave 0 report (still available)
- Governance: advisory-only, autopilot denied, no finance/moderation execution

## Gaps filled by Wave 1

1. **Context Engine V1** — `lib/ccos/context/*`
2. **Contextual signals** — `lib/ccos/signals/*` + marketplace interpreters
3. **Genome V1 overlay** — `genome/contextual.ts` (base + contextual profile)
4. **Brain V1** — `brain/v1/report.ts` orchestration
5. **Unified NBA** — `brain/v1/next-action.ts`
6. **Decision orchestrator** — `brain/v1/decision.ts`
7. **Prediction adapter** — `brain/v1/prediction.ts` → sensitivity-engine

## Isolation verified

- `features/products/queries.ts` — `resolveOrderBy()` has no CCOS/MCP imports (test: `ccos-advisory-boundary.test.ts`)
- Live ranking weights unchanged
- Financial execution guards in `lib/ccos/governance/advisory-guard.ts`

## Staging notes

- `MARKETPLACE_RANKING_INTELLIGENCE_ENABLED` optional for ranking observations on staging
- DAOS / QuickSale live connection **not required** for Wave 1

## Verdict

Wave 1 extends Wave 0 without replacing existing ranking, content quality, or trust enforcement modules.
