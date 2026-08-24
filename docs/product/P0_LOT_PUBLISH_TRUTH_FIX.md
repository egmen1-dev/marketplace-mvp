# P0 — LOT Publish State Truth Fix

Physical RC10.1 finding: seller tapped **«Опубликовать ЛОТ»**, saw contradictory **«ЛОТ сохранён»** copy, **«Посмотреть ЛОТ»** opened public PDP **404**, and the LOT was missing from **«Мои ЛОТы»** (active tab).

## ROOT CAUSE

Mobile `publishOnServer` treated any publish failure as success:

1. Attempt `PATCH status=ACTIVE`
2. On any error → silently `PATCH status=DRAFT` and set `savedForReview` copy
3. Success UI inferred outcome from that string, not server state

When marketplace trust loop is enabled, `updateProduct(ACTIVE)` calls `submitProductForModeration()` then throws `MODERATION_PENDING` — the product remains **DRAFT + PENDING_REVIEW**, not published.

## ACTUAL PRODUCT STATE

After physical **«Опубликовать ЛОТ»** with trust loop enabled:

| Field | Value |
|-------|-------|
| `Product.status` | `DRAFT` (publish did not reach ACTIVE) |
| `ProductModeration.status` | `PENDING_REVIEW` (submitted during failed ACTIVE transition) |
| Public catalog | excluded (`ACTIVE` only) |
| Seller inventory | should appear under **На проверке** / **Сохранённые**, not **Активные** |

## MY LOTS ROOT CAUSE

1. Default tab is **Активные** (`status=ACTIVE` only)
2. Moderation-pending LOTs are `DRAFT`, so they never appeared on the default tab
3. No **На проверке** tab existed for `ProductModeration.PENDING_REVIEW`

## PDP ROOT CAUSE

`fetchProduct` → `GET /api/products/:id` used cookie session (`getSessionUser`) and ignored mobile `Authorization: Bearer` JWT. Anonymous rules applied → **DRAFT/non-public LOT returned 404** even for the owning seller.

## FIX

- Canonical `resolveLotPublishOutcome()` in `lib/mobile/seller-product-publish.ts`
- Mobile publish flow persists DRAFT, then publishes once; reads `publishOutcome` from API (no catch-all fallback)
- Seller API responses include `{ id, status, isPublic, moderationState, publishOutcome }`
- `MODERATION_PENDING` PATCH returns `200` with truthful pending contract
- `GET /api/products/:id` uses `resolveRequestUser(request)` for Bearer auth
- New `GET /api/mobile/seller/products/:id` + mobile `/sell/lot/[id]` seller detail screen
- **Мои ЛОТы** tab **На проверке** + routing to seller detail for non-public LOTs
- Bootstrap `sellerPublish.publishCtaLabel` → **«Отправить на проверку»** when moderation required
- State-aware success screens (published / pending / saved)

## STAGING E2E

Run: `npm run mobile:lot-publish-truth:smoke`

Artifact: `artifacts/mobile-lot-publish-truth/staging-smoke.json`

## TESTS

- `tests/mobile-lot-publish-truth.test.ts`
- Gate: `npm run mobile:lot-publish-truth:gate`

## VERDICT

`READY_FOR_RC10.2_BUILD` after merge + gate PASS on staging.
