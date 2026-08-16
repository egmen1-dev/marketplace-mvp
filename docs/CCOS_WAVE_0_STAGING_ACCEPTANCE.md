# CCOS Wave 0 — Staging Acceptance

## Verdict

| Check | Status |
|---|---|
| **CCOS FOUNDATION** | **PENDING STAGING** (local build + tests pass on branch) |
| **MARKETPLACE COGNITIVE BRAIN** | L2 ADVISORY (when flags on) |
| **LIVE RANKING** | UNCHANGED |
| **AUTOPILOT** | DISABLED |
| **CROSS-APP KNOWLEDGE** | CONTRACT READY / NOT YET CONNECTED |

> Wording: **CCOS WAVE 0 FOUNDATION READY** — not 「CCOS READY」.

## Pre-merge gates (local)

- [x] `npm run build` — self-hosted fonts, no Google Fonts fetch
- [x] `npm test` — Wave 0 CCOS/MCP test suite
- [x] Advisory boundary test — `resolveOrderBy()` isolated from CCOS

## Staging checklist (post-merge)

1. Railway deploy succeeds
2. `/api/version` matches main
3. `/api/health` PASS
4. Enable `CCOS_ENABLED=true` + `MARKETPLACE_COGNITIVE_PLATFORM_ENABLED=true`
5. Seller product edit → 「Интеллект карточки」 block
6. Admin `/admin/cognitive/products/[id]` debug view
7. Degraded publisher (disable one upstream flag) → report still loads
8. Disable flags → identical behaviour to pre-Wave-0

## Evidence artifacts (to capture on staging)

- `ccos-product-intelligence.png`
- `ccos-admin-observations.png`
- `ccos-publisher-health.png`
- `ccos-low-confidence.png`

## Notes

Staging screenshots not captured in Cloud Agent run — run checklist after merge to Railway.

Deploy reliability fix included: fonts moved to `@fontsource` local loading; `rankingLabV2` acceptance script typing fixed.
