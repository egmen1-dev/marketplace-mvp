# EPIC — LOT Mobile Visual Polish & Design System Audit

**Status:** `READY_FOR_BUILD`  
**Recorded:** 2026-08-23  
**APK / RC5:** Not built in this EPIC (separate release task)

## Executive summary

Closed Beta RC4 (`0.1.9-beta.1`) shipped functional interaction fixes from PR #139. Physical testing on **RC3** (`0.1.8-beta.1`) exposed unacceptable catalog category presentation (giant circles) and a generic boot screen.

This EPIC refines visual quality on `main` without changing business logic or building a new APK:

- Compact **Chip**-based category rail (no giant circles)
- **Sort dropdown + Filters** bar to raise product grid above the fold
- **Branded BootSplash** with human-readable progressive boot copy
- Icon-based **EmptyState** / **ErrorState** system
- Token extensions (`semantic.ts`, `typography.price`, `h3`)
- Profile identity hierarchy refinement

Functional fixes (cart, favorites, filters, seller nav, session, update) are preserved.

## RC3 vs main vs this EPIC

| Observation | RC3 device | main before EPIC | After EPIC |
|-------------|------------|------------------|------------|
| Giant category circles | Yes (physical) | Pills on main; RC3 path obsolete | Compact `Chip` rail |
| Boot spinner | Yes | `ActivityIndicator` + «Загрузка…» | `BootSplash` branded |
| Catalog header height | High | Sort pills row + categories | Sort + Filters compact bar |

## Screen inventory

See `artifacts/mobile-visual-polish/screen-inventory.json` (19 routes).

## Component inventory

See `artifacts/mobile-visual-polish/component-inventory.json`.

## Catalog before/after

**Before:** Categories consumed excessive vertical space; sort options rendered as a full horizontal pill row.

**After:**

- `CategoryRail` → horizontal `Chip` row (`[ Все ] [ Категория ] …`)
- `CatalogToolbar` → `Сортировка: … ▼` + `Фильтры` with active-count badge
- Reduced catalog screen vertical gaps (`spacing.sm`)

## Boot/loading before/after

**Before:** Centered gray logo, large `ActivityIndicator`, «Загрузка…».

**After:** `BootSplash` — LOT mark, tagline «Покупайте. Продавайте.», subtle progress animation, stage-mapped copy via `boot-stage-messages.ts`. Technical diagnostics preserved on boot failure.

## Tests

```bash
npm test -- tests/mobile-visual-polish.test.ts
npm run mobile:visual-polish-audit
```

## Final verdict

`READY_FOR_BUILD` — physical validation and RC5 APK are out of scope for this EPIC.
