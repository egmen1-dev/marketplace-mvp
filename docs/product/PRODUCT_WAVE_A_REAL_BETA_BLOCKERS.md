# Product Wave A — Real Beta Blockers

**Baseline:** RC26 (`0.1.15-beta.11`)  
**Goal:** Remove highest-impact real-beta product blockers without expanding scope into redesign or release infrastructure.

### Reconciliation note (PR #212)

Wave A was originally implemented from obsolete base `8ee031b` (audit doc on `release-integrity-gate` lineage). Cloud tests did not expose missing later RC26 redesign modules (checkout UI, home/catalog/cart/product redesign). Mac pre-native acceptance correctly blocked the branch before build (`BLOCKER=PR_BRANCH_MISSING_REQUIRED_BASE_FILES`).

**Reconciled branch:** `main` (`747f008`) + Release Integrity Gate (PR #211) + RC26 product redesign (cloud-session export `9cbc354`) + Wave A (`f606a82`).

No files were invented from test expectations; missing modules were recovered from documented export history. Updater hardening (chunked SHA-256, no native `onProgress`) preserved from PR #211 baseline.

---

## Implemented Issues

| ID | Area | Before | After |
|----|------|--------|-------|
| WA-01 | Home trust strip | Promised 14-day returns, 24/7 support, verified sellers | Truthful capabilities: chat, order status, LOT moderation |
| WA-02 | Seller PDP trust chip | `respondsInChat: true` for every seller | Hardcoded positive signal removed (`false`; chip hidden) |
| WA-03 | Seller LOT edit | `?lotId=` ignored; create form opened empty | Edit mode loads existing LOT, updates same `productId` |
| WA-04 | Checkout | Fake radio delivery/payment rows | Informational next-step copy + handoff banner |
| WA-05 | Profile | Truncated internal `userId` shown | Email from session (or neutral empty state) |
| WA-06 | Copy sweep | Unsupported discount hero/promo copy | Hero/promo softened to non-guarantee language |

---

## Domain Decisions

### Seller edit

- **Shared wizard:** Create and edit use `useLotCreateForm({ editLotId })` — no second form.
- **Duplicate prevention:** `savedProductId` is set from fetched LOT; save/publish paths call `updateSellerLot` when present.
- **Ownership:** Server already enforces seller ownership in `PATCH /api/mobile/seller/products/:id` (404 if not owner).
- **Moderation:** Re-submit publish remains available only for `DRAFT` or `NEEDS_FIX` (`resolveEditPublishAllowed`). Active approved LOTs save via update without forced re-publish CTA.
- **Characteristics:** Seller detail API now returns `characteristicValues` for edit prefill.

### Checkout

- Native checkout remains **summary + browser handoff** — no native payment/delivery built.
- CTA stays **«Перейти к оформлению»** (payment happens on next web step).

### Profile identity

- Email stored in secure session meta at login time.
- Users who logged in before this wave may see neutral copy until next login.

---

## Tests

```bash
npm test -- tests/mobile-product-wave-a.test.ts
npm test -- tests/mobile-interaction-audit.test.ts
cd apps/mobile && npm run typecheck
```

**Coverage highlights:**
- Unsupported home trust promises absent
- `respondsInChat` not hardcoded true
- Edit map + hook wiring + `updateSellerLot` on save
- Checkout without fake radio components; deep links preserved
- Profile without `userId.slice` display

---

## Remaining Gaps (out of Wave A scope)

- Search suggestions / history UI
- Product card unification
- In-app review submission
- Push notifications
- Full wallet top-up/withdraw
- Mac-verified edit journey on physical device (required below)

---

## Mac / AVD Acceptance Checklist

### Buyer — checkout handoff

1. Open **Главная** → verify trust strip has no return/24×7/verified-seller promises.
2. Open product → **Корзина** → **Оформление**.
3. Confirm banner: delivery/payment on next step; no selected radio rows.
4. Tap **Перейти к оформлению** → browser opens.
5. Complete or cancel web flow → return to app → orders/deep link still works.

### Seller — edit LOT

1. **Продать → Мои ЛОТы** → open LOT needing fix (or draft).
2. Tap **Редактировать ЛОТ**.
3. Confirm title **Редактировать ЛОТ** and fields prefilled (photos, title, price).
4. Change safe field (e.g. description) → **Предпросмотр** → **Сохранить изменения**.
5. Reopen same LOT → changes persisted; **no duplicate LOT** created.

### Seller — create regression

1. **Создать ЛОТ** from scratch → complete wizard → publish/save still works.

### Profile

1. Open **Профиль** → email shown (after login), not internal ID.

---

## Files Touched (summary)

- `apps/mobile/src/home/content.ts`
- `lib/mobile/seller-storefront-data.ts`
- `apps/mobile/src/seller/use-lot-create-form.ts`
- `apps/mobile/app/sell/create.tsx`
- `lib/mobile/seller-products-data.ts`
- `apps/mobile/app/checkout.tsx`
- `apps/mobile/src/checkout/ui/*`
- `apps/mobile/app/(tabs)/profile.tsx`
- `apps/mobile/src/storage/secure-session.ts`
- `apps/mobile/src/api/client.ts`
- `lib/mobile/seller-lot-edit-map.ts`
- `tests/mobile-product-wave-a.test.ts`

**Not changed:** MRP, RC26 artifact, RC27.
