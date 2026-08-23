# EPIC — Full Mobile Interaction Audit & Fix

## Scope

End-to-end audit and fix of buyer/seller commerce interactions in `apps/mobile` without visual redesign for its own sake.

## P0/P1 fixes delivered

| Area | Fix |
|------|-----|
| Cart | `useCommerceActions` awaits API, shows toast on error/success, refreshes badges |
| Favorites | Optimistic toggle + rollback, favorites store hydration, unfavorite on Favorites screen |
| Catalog filters | Reads `sort`, `sellerId`, `deals` route params; resolves category names; deals client filter |
| Seller navigation | `app/seller/[id].tsx` storefront, pressable `SellerCard`, seller taps on cards, deep link fix |
| Localization | Hidden tab titles in Russian (`Кошелёк`, `Избранное`, …) |
| Profile IA | Grouped `ProfileMenu` sections (Покупки / Продажи / Финансы / Поддержка / Приложение) |
| ProductCard | Reserved slots for favorite, rating, seller, CTA to keep grid height consistent |
| Auto-update | `isUpdateEligibleForInstall` — no downgrade prompts |

## Key files

- `apps/mobile/src/hooks/useCommerceActions.ts`
- `apps/mobile/src/commerce/*`
- `apps/mobile/app/seller/[id].tsx`
- `apps/mobile/src/components/ProfileMenu.tsx`
- `apps/mobile/src/utils/update-eligibility.ts`

## Artifacts

`artifacts/mobile-interaction-audit/` — audit JSON bundle + `final-report.json`

## Validation

```bash
npm run build
cd apps/mobile && npm run typecheck
npm test -- tests/mobile-interaction-audit.test.ts
node scripts/mobile-interaction-audit.mjs
```

## Verdict

`READY_FOR_BUILD` — physical Android remains `NOT_RUN` (separate RC build task).
