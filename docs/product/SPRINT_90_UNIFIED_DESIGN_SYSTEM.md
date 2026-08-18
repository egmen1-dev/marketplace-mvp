# Sprint 90 — Unified Design System Migration

**Baseline:** Closed Alpha 0.1.5-alpha · Sprint 89 COMPLETE  
**Branch:** `cursor/sprint-90-unified-design-system-d03e`  
**Gate:** PASS · **Ready for EPIC 86 Seller Experience:** YES

---

## Goal

Eliminate the dual UI architecture. After this sprint there is **one** source of truth:

```
apps/mobile/src/design-system/
```

Legacy `apps/mobile/src/components/ui/` has been **removed**. Visual appearance is unchanged — architecture only.

---

## Part 1 — Legacy Inventory

Full inventory: `artifacts/sprint-90-unified-design-system/legacy-inventory.json`

| Action | Count | Examples |
|--------|-------|----------|
| MERGE | 6 | ShimmerBlock, Badge, skeleton helpers |
| REPLACE | 9 | PrimaryButton → `design-system/forms/buttons` |
| KEEP (relocated) | 11 | TabBarIcon, WalletCard, CommerceSearchBar |
| DELETE | 13 | CatalogToolbar, DangerButton, dead exports |

**Why not delete blindly:** Each symbol was classified by consumer count and DS replacement readiness. Seller cards and empty-state presets were moved intact to preserve visual parity.

---

## Part 2 — Migration Matrix

`artifacts/sprint-90-unified-design-system/migration-matrix.json`

| Legacy | DS Replacement | Status |
|--------|----------------|--------|
| `components/ui/*` | `design-system/{forms,layout,primitives,navigation,cards,feedback,commerce}` | ✅ Complete |
| DS → legacy cycles | Broken (Shimmer, GhostButton in DS) | ✅ Fixed |

---

## Part 3 — Commerce Screen Migration

**14 screens** now import only from `design-system/*` sub-barrels (no `components/ui`):

- Home · Catalog · PDP · Cart · Checkout · Orders · Order Detail  
- Favorites · Profile · Wallet  
- Seller Home · Seller Products · Seller Sales · Public Seller Profile  

---

## Part 4 — Barrel Split

Root `design-system/index.ts` is **token-safe** (no RN component re-exports). Screens use targeted imports:

| Barrel | Path |
|--------|------|
| tokens | `design-system/tokens` |
| forms | `design-system/forms` |
| layout | `design-system/layout` |
| primitives | `design-system/primitives` |
| navigation | `design-system/navigation` |
| cards | `design-system/cards` |
| feedback | `design-system/feedback` |
| commerce | `design-system/commerce` |
| components | `design-system/components/*` (screen-specific) |

---

## Part 5 — Shared Commerce Components

Proven duplicates consolidated under DS (no new abstractions):

- **Shimmer** → `primitives/Shimmer.tsx` (6 skeleton consumers)
- **Empty / skeleton states** → `feedback/States.tsx`
- **Recommendation rails** → existing `CartRecommendationsRail`, `OrdersRecommendationsRail`, `PdpRelatedRail`
- **Search history** → `storage/search-history.ts` (removed `POPULAR_SEARCHES` re-export from dead CatalogToolbar)

---

## Part 6 — Design System Rules

Audit: `artifacts/sprint-90-unified-design-system/design-system-report.json`

- Component-level hardcoded HEX in sticky CTAs, skeletons, and product cards **fixed** (use `semantic`, `surface`, `text` tokens)
- Remaining HEX only in `design-system/tokens/*` (canonical palette definitions)

---

## Part 7 — Legacy Deletion

Removed entire directory:

```
apps/mobile/src/components/ui/   (13 files)
```

Confirmed: **0** runtime `components/ui` imports in mobile app.

---

## Part 8 — Regression

| Check | Result |
|-------|--------|
| `mobile:typecheck` | PASS |
| `mobile:test` | PASS (11/11) |
| `mobile:p0:token-cycle-gate` | PASS |
| `mobile:p0:token-architecture-guard` | PASS |
| Marketplace score | 9.2 |
| Startup / P0 | No changes to startup path |

---

## Part 9 — Performance

`artifacts/sprint-90-unified-design-system/bundle-report.json`

| Metric | Before | After |
|--------|--------|-------|
| Legacy UI files | 13 | 0 |
| Legacy import sites | 29 | 0 |
| DS module files | ~60 | 79 |
| Release bundle | cached | unchanged (architecture-only) |

Tree-shaking improved: screens import sub-barrels instead of monolithic legacy barrel.

---

## Part 10 — Seller Readiness

**Can EPIC 86 Seller Experience start?** **YES**

No blockers. Seller screens (`seller-home`, `seller-products`, `seller-sales`) run on unified DS paths.

---

## Final Report

| Metric | Value |
|--------|-------|
| Legacy Components Removed | **13** |
| Commerce Screens Migrated | **14** |
| Remaining Legacy | **0** |
| Bundle Change | 13 legacy files → 79 DS files |
| Marketplace Score | **9.2** |
| Ready for Seller Experience | **YES** |

---

## Verification

```bash
npm run mobile:sprint-90:gate
```

Artifacts: `artifacts/sprint-90-unified-design-system/`
