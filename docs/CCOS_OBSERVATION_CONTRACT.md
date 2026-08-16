# CCOS Observation Contract

## UniversalObservation

Canonical atom published by apps into CCOS.

Key fields:

- `metric` — dotted canonical name (`behaviour.ctr`, `content.overall_quality`)
- `domain` — content | visual | trust | behaviour | …
- `value` — raw measurement; use `null` + low `confidence` for cold start (never fake `0`)
- `normalizedScore` — optional 0–100
- `confidence` — 0..1
- `entity` — `{ type, id }`
- `app` — marketplace | daos | quicksale | …
- `source` — `{ module, version }`
- `observedAt` — ISO timestamp
- `evidence` — human-readable strings

## Metric registry

Use `OBSERVATION_METRICS` in `lib/ccos/observation/metrics.ts`. Do not invent alternate spellings (`ctr` vs `CTR`).

## Units

| Metric family | Unit |
|---|---|
| CTR, conversion | ratio (0.018 = 1.8%) |
| Scores | 0–100 |
| Counts | count |
| Rank | rank |

## Confidence bands

| Range | Band |
|---|---|
| 0.00–0.39 | LOW |
| 0.40–0.69 | MEDIUM |
| 0.70–0.89 | HIGH |
| 0.90–1.00 | VERY_HIGH |

LOW confidence: admin display OK; no hard enforcement from CCOS alone.

## Validation

`recordObservation()`:

1. validates via `normalizeObservation()`
2. dedupes via `observationDeduplicationKey()`
3. records in-memory (Wave 0)
4. **no business side effects**

Invalid observations return typed errors — never silently dropped without caller handling.

## Identity

`createObservationId()` — deterministic hash from app + entity + metric + source version + context/window.

## Privacy

No passwords, payment secrets, or unnecessary PII in observations. Prefer session-scoped or aggregate buyer identifiers.

## Security (future)

Wave 0 records `source.app/module/version`. Future: signed publisher identity for cross-app ingestion.
