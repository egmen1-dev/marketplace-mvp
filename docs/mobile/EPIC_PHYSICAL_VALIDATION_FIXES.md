# EPIC — Physical Validation Fixes

**Status:** `READY_FOR_REVIEW`  
**Base:** `main` with RC6 (CommerceHeader + chat)  
**Physical ground truth:** RC5.1 `0.1.10-beta.2` device testing  
**No APK built in this EPIC**

## Physical findings addressed

| Issue | Root cause | Fix |
|-------|------------|-----|
| Giant category circles | Stale RC5.1 APK used deleted DS `CategoryRail` (88×88); current source already uses `Chip` rail | Hardened Chip dimensions; full category list |
| Empty category results | Stale `q` ANDed with `categoryId` + some categories have 0 products in staging | `useFocusEffect` clears `q`; coverage audit |
| Filters PARTIAL | Partial reset only cleared one dimension | `clearFilters` + `onResetFilters` |
| ProductCard heights | Grid didn't stretch; meta row variance | `flex:1` card, reserved meta slots, `cardCell` wrapper |
| Cart images missing | `cart.tsx` skipped `resolveImageUrl` | Same resolver as Home/PDP |
| BootSplash FAIL | Weak branding, fake progress, beta bar clash | Logo ring, indeterminate progress, compact Beta banner |

## Category data audit

Run: `node scripts/mobile-category-coverage-audit.mjs`

Example: **Женская одежда** → `NO_CATEGORY_FIXTURE_DATA` (0 eligible products in staging DB).  
This is not a filter bug — UI correctly shows empty state.

## Staging smoke

```bash
node scripts/mobile-category-coverage-audit.mjs
node scripts/mobile-cart-image-staging-smoke.mjs
node scripts/mobile-filter-matrix-staging.mjs
```

## Tests

```bash
npm run mobile:typecheck
npx vitest run tests/mobile-physical-fixes.test.ts tests/mobile-commerce-integration.test.ts
```

## RC6 regression

CommerceHeader, chat, update flow unchanged and guarded by tests.

## Physical validation

All fix verifications remain **NOT_RUN** until a new APK is built and installed.

## Artifacts

`artifacts/mobile-physical-fixes/` — findings, coverage, filter matrix, layout audit, cart contract, boot UX, regression matrix, final report.
