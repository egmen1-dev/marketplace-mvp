# CCOS Wave 5 — Cognitive Digital Twin & Decision Simulation Platform

## Goal

After Wave 4 causal knowledge, Wave 5 lets CCOS **safely simulate the future** before changing the real marketplace. Brain moves from single recommendations to multi-scenario decision reports with confidence, risk, and Monte Carlo probabilities.

## Pipeline

```
Real Marketplace → Observation → Knowledge Graph → Digital Twin
  → Simulation / Scenario / Risk Engines → Decision Report → Human approval
```

Twin **never** writes to production.

## Modules

| Deliverable | Path |
|-------------|------|
| Digital Twin Core | `lib/ccos/twin/types.ts`, `simulation.ts` |
| Causal Graph (Wave 4 bridge) | `lib/ccos/graph/` |
| Marketplace State Builder | `lib/ccos/twin/state-builder.ts` |
| Scenario Engine | `lib/ccos/twin/scenarios.ts` |
| Multi-Scenario Simulation | `lib/ccos/twin/simulation.ts` |
| Monte Carlo Engine | `lib/ccos/twin/monte-carlo.ts` |
| Risk Engine | `lib/ccos/twin/risk.ts` |
| Confidence Engine | `lib/ccos/twin/confidence.ts` |
| Shadow Ranking | `lib/ccos/twin/shadow-ranking.ts` |
| Twin Replay | `lib/ccos/twin/replay.ts` |
| Decision Comparison | `lib/ccos/twin/decision-compare.ts` |
| Twin Memory | `lib/ccos/twin/memory.ts` |
| Accuracy Engine | `lib/ccos/twin/accuracy.ts` |
| Learning Feedback | `lib/ccos/twin/learning-feedback.ts` |
| Cross-App Twin | `lib/ccos/twin/cross-app.ts` |
| Twin Governance | `lib/ccos/twin/governance.ts` |
| Offline Cache | `lib/ccos/twin/cache.ts` |
| Marketplace adapter | `lib/marketplace-cognitive-platform/twin/` |

## Shadow Ranking

Uses `computeRankingScore` copy via `shadow-ranking.ts`. Production `resolveOrderBy()` is **not** invoked from Twin.

## APIs

| Endpoint | Purpose |
|----------|---------|
| `GET/POST /api/ccos/twin/simulate` | Universal Twin simulation |
| `GET/POST /api/ccos/twin/mobile` | Mobile scenario simulator |
| `GET/POST /api/ccos/twin/cache` | Offline simulation cache sync |
| `GET /api/ccos/twin/replay` | Twin replay timeline |

## Brain integration

When `CCOS_TWIN_PLATFORM_ENABLED=true` and L3 simulator maturity:

- `getMarketplaceBrainReport()` attaches `twinDecisionReport` + `twinSummary`
- `buildBrainSimulations()` uses Twin multi-scenario engine
- Brain version: `marketplace-brain-v5-twin`

## Governance

```
Twin → Decision → Human → Production   ✅
Twin → Production                      ❌ blocked
```

## Flags

- `CCOS_ENABLED=true`
- `CCOS_TWIN_PLATFORM_ENABLED=true` (or product/cognitive flags)

## Invariants preserved

- Advisory/simulation only
- Live ranking unchanged
- Finance / moderation execution isolated
- Autopilot disabled
- Recommendations include confidence + explanation
