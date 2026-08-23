# Closed Beta RC7 — Android Build Record

**Candidate:** `0.1.12-beta.1` (versionCode `12`)  
**Status:** `READY_FOR_PHYSICAL_VALIDATION`  
**Recorded:** 2026-08-23

## Purpose

Closed Beta build after PR #148 (physical validation fixes) on RC6 base (CommerceHeader + chat preserved).

## Version

| Field | Value |
|-------|-------|
| Package | `ru.lot.marketplace.alpha` |
| versionName | `0.1.12-beta.1` |
| versionCode | `12` |
| RC label | RC7 |
| Previous RC | RC6 `0.1.11-beta.1` (code 11) |

## RC7 features (from PR #148)

| Area | Delivery |
|------|----------|
| CategoryRail | Compact Chip pills; empty categories hidden via `catalogProductCount` |
| Filters | Full reset via `clearFilters` |
| ProductCard | Stable grid layout contract |
| Cart images | `resolveImageUrl` for relative API paths |
| BootSplash | Branded logo ring + indeterminate progress |
| BetaBanner | Compact pill (version in About) |

## RC6 preserved

CommerceHeader, search, messages, chat, badges, PDP→chat, seller storefront, update flow.

## Gates

```bash
npm run mobile:typecheck
npx vitest run tests/mobile-product-card-layout.test.ts tests/mobile-physical-fixes.test.ts
npm run mobile:rc7:staging-gate
npm run mobile:rc7:apk-verify
EXPECTED_VERSION=0.1.12-beta.1 EXPECTED_VERSION_CODE=12 npm run mobile:rc5:identity-gate -- artifacts/closed-beta-rc7/lot_android_closed_beta_0.1.12_beta.1.apk
```

## MRP publish (post-merge to main)

```bash
node scripts/rc7-mrp-publish-via-admin-api.mjs
node scripts/rc7-update-api-verification.mjs
```

## Physical validation

**Status: `NOT_RUN`** — see `artifacts/closed-beta-rc7/physical-checklist.json`.
