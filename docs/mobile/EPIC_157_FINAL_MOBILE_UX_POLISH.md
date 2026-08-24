# EPIC 157 — Final Mobile Marketplace UX Polish

**Status:** `READY_FOR_RC9_BUILD`  
**Recorded:** 2026-08-23  
**Base:** Closed Beta RC8 (`0.1.13-beta.1`, code 13)

## Summary

Mobile-only UX polish to remove beta-app feel before RC9. No backend or API contract changes.

## Changes

| Area | Delivery |
|------|----------|
| Native header | `headerShown: false` on tab navigator + Home/Catalog — only `CommerceHeader` |
| Home spacing | Compact `gap`, tagline below header, tighter sections |
| ProductCard | Stable body min-height, CTA pinned bottom, no empty placeholder rows |
| Image fallback | Branded `ProductImageFallback` (icon + «Нет фото») |
| Category chips | `variant="category"` — 2-line readable labels in `CategoryRail` |
| Empty states | `catalogCategory`, `catalogSearch` presets + contextual selector |
| Cart CTA | `ProductCartCta` with add button + inline `[-] qty [+]` stepper |

## Files

- `apps/mobile/app/(tabs)/_layout.tsx`
- `apps/mobile/app/(tabs)/index.tsx`
- `apps/mobile/app/(tabs)/catalog.tsx`
- `apps/mobile/app/(tabs)/favorites.tsx`
- `apps/mobile/app/product/[id].tsx`
- `apps/mobile/app/seller/[id].tsx`
- `apps/mobile/src/components/CommerceHeader.tsx`
- `apps/mobile/src/components/ui/ProductCard.tsx`
- `apps/mobile/src/components/ui/ProductCartCta.tsx`
- `apps/mobile/src/components/ui/ProductImageFallback.tsx`
- `apps/mobile/src/components/ui/Chip.tsx`
- `apps/mobile/src/components/ui/CatalogToolbar.tsx`
- `apps/mobile/src/components/ui/feedback.tsx`
- `apps/mobile/src/components/ui/layout.tsx`
- `apps/mobile/src/components/ui/product-card-layout.ts`
- `apps/mobile/src/commerce/cart-quantities-store.ts`
- `apps/mobile/src/commerce/refresh-tab-badges.ts`
- `apps/mobile/src/hooks/useCommerceActions.ts`

## Tests

```bash
npm run build
npm run mobile:typecheck
npm test -- tests/mobile-epic-157-ux-polish.test.ts tests/mobile-product-card-layout.test.ts
npm run mobile:epic-157:gate
```

## Physical validation

**Status: `NOT_RUN`** — see `artifacts/epic-157/physical-checklist.json`

## Verdict

`READY_FOR_RC9_BUILD` — automated gates PASS; device walkthrough pending.
