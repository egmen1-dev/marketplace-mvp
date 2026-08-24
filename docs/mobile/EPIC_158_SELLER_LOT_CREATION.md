# EPIC 158 — Mobile Seller LOT Creation MVP

## Goal

Enable sellers to create and publish LOTs from the mobile app, reusing the existing web/backend product domain without duplicating business logic.

## Verdict matrix

| Check | Status |
|-------|--------|
| Seller auth bridge (`requireSellerFromRequest`) | PASS |
| Mobile POST `/api/mobile/seller/products` | PASS |
| Mobile PATCH `/api/mobile/seller/products/:id` | PASS |
| Mobile POST `/api/mobile/seller/uploads` | PASS |
| Sell tab → «Создать ЛОТ» | PASS |
| `/sell/create` wizard (photos → details → preview → publish) | PASS |
| «Мои ЛОТы» tabs (Активные / Черновики / Проданные) | PASS |
| Local draft (`lot-draft-v1`) | PASS |
| Seller list image fallback («Нет фото») | PASS |
| EPIC 152 seller loop regression (orders, chat, cart) | PASS |
| Physical Android checklist | NOT_RUN |
| Gate `npm run mobile:epic-158:gate` | PASS |

**Final status:** `READY_FOR_RC9_SELLER_CREATION`

## Product deliverables

1. Native multi-step LOT creation flow at `/sell/create` (camera/gallery, taxonomy, preview, publish).
2. «Мои ЛОТы» seller inventory with Active / Drafts / Sold tabs and LOT terminology.

## Release deliverables

1. Mobile seller mutation APIs (Bearer JWT) wrapping existing `createProduct` / `updateProduct` / storage upload.
2. Automated gate + regression tests (`tests/mobile-epic-158-seller-lot-creation.test.ts`).

## Reused APIs and domain

| Layer | Reuse |
|-------|--------|
| Product create | `createProduct` + `createProductSchema` |
| Product update/publish | `updateProduct` + `updateProductSchema` |
| Image upload | `lib/storage` (`validateImageFile`, `buildProductImagePathname`) |
| Taxonomy | `GET /api/taxonomy/browse` |
| Type suggestion | `POST /api/product-understanding` |
| Seller inventory list | `listProducts` via `buildMobileSellerProductsFromRequest` |
| Seller onboarding (non-seller) | Existing `openWebHandoff("/account/seller-start")` |

## New mobile screens

| Route | Purpose |
|-------|---------|
| `/sell/create` | LOT creation wizard |
| `/(tabs)/sell` | Entry: «Создать ЛОТ» (seller) or onboarding (non-seller) |
| `/(tabs)/seller-products` | «Мои ЛОТы» with status tabs |

## Key files changed

### Backend

- `features/auth/resolve-request-user.ts` — `requireSellerFromRequest`
- `app/api/mobile/seller/products/route.ts` — GET tab filter + POST create
- `app/api/mobile/seller/products/[id]/route.ts` — PATCH update/publish
- `app/api/mobile/seller/uploads/route.ts` — multipart image upload
- `lib/mobile/seller-products-data.ts` — `active` / `drafts` / `sold` tab filter

### Mobile

- `apps/mobile/app/(tabs)/sell.tsx` — LOT entry point
- `apps/mobile/app/sell/create.tsx` — creation wizard
- `apps/mobile/app/sell/_layout.tsx` — sell stack
- `apps/mobile/app/(tabs)/seller-products.tsx` — «Мои ЛОТы»
- `apps/mobile/src/api/seller-lot.ts` — taxonomy, upload, create client
- `apps/mobile/src/seller/lot-draft-storage.ts` — SecureStore draft
- `apps/mobile/src/seller/lot-create-constants.ts` — condition labels, category emoji
- `apps/mobile/src/components/ui/ProductImageFallback.tsx` — «Нет фото» fallback
- `apps/mobile/src/components/ui/SellerProductCard.tsx` — fallback in seller list

## Tests

```bash
npm run test -- tests/mobile-epic-158-seller-lot-creation.test.ts
npm run mobile:epic-158:gate
cd apps/mobile && npm run typecheck
npm run build
```

## Out of scope (this EPIC)

- Web-parity characteristics editor
- Seller analytics / promotion / paid placement
- Server-side draft sync
- Bulk upload

## Integration chain (post-publish)

```
Seller creates LOT → catalog → PDP → chat → cart → order → seller orders
```

Existing EPIC 152 seller loop (orders, chat handoff, buyer cart) must remain unchanged.
