# CCOS Context Engine V1

Location: `lib/ccos/context/`

## Modules

| File | Role |
|------|------|
| `types.ts` | `CognitiveContext`, `QueryIntent`, `CategoryBenchmark` |
| `builder.ts` | `buildCognitiveContext`, `buildGlobalCategoryContext` |
| `query-context.ts` | Rule-based query intent |
| `category-context.ts` | Category medians + global fallback |
| `market-context.ts` | Season, country, daypart |
| `device-context.ts` | mobile/desktop/tablet/unknown |
| `seller-context.ts` | new/growing/established lifecycle |
| `confidence.ts` | Per-dimension context confidence |
| `fingerprint.ts` | Deterministic cache/compare key |
| `normalizers.ts` | Query normalization, `CONTEXT_VERSION` |

## Principles

- Context is **optional** — Brain works with global/category fallback
- Missing data → lower confidence, not crashes
- Context confidence is separate from observation confidence
