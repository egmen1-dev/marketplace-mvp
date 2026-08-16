# CCOS Wave 0 — Implementation Notes

Branch: `cursor/epic-77-wave-0-ccos-foundation-d03e`

## Delivered in Wave 0

### Core (`lib/ccos/`)

- Universal observation contract + metric registry
- `normalizeObservation()`, `createObservationId()`, dedupe + `recordObservation()`
- Publisher registry / observation bus (`registerPublisher`, `runPublishers`, `collectObservations`)
- Context types (no engine)
- Knowledge foundation: Evidence, Hypothesis, in-memory store, `proposeHypothesis()` stub
- Memory types (no persistence)
- Governance: maturity L1–L4, advisory/financial/moderation guards
- Telemetry events: `ccos_observation_recorded`, `ccos_publisher_failed`, `ccos_report_generated`, `ccos_hypothesis_proposed`

### Marketplace binding (`lib/marketplace-cognitive-platform/`)

- Publishers: content-quality, trust, behaviour, ranking (advisory)
- Genome aggregation with null dimensions + confidence
- Brain: `getCognitiveProductReport()` unified report
- Seller preview: 「Интеллект карточки」 on product edit (flagged)
- Admin debug: `/admin/cognitive/products/[id]` (flagged)

### Deploy P0 fixes

- Self-hosted fonts via `@fontsource/*` + `next/font/local` (no Google Fonts fetch at build)
- `rankingLabV2` typing fix in content-quality staging acceptance script

### Flags

```env
CCOS_ENABLED=false
MARKETPLACE_COGNITIVE_PLATFORM_ENABLED=false
```

Both must be `true` for cognitive UI/report.

## Explicitly out of scope

- Learning engine, Graph DB, Digital Twin, Autopilot execution
- Cross-app live publishers (DAOS/QuickSale) — contract only
- Persisted knowledge DB migrations

## Tests

See `tests/ccos-*.test.ts` and `tests/marketplace-*.test.ts` (Wave 0 suite).

## Next wave

EPIC-77-WAVE-1: richer Context, MCP consumer expansion, prediction/decision orchestration.
