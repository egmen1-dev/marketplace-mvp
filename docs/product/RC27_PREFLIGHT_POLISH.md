# RC27 Preflight Polish

**Base:** `ee8023502346e2557d6f1915145296c5b60de78e`  
**Scope:** Small P1 cleanup before RC27 freeze — no delivery removal, no CDEK, no navigation changes.

---

## Changes

### 1. Favorites → canonical ProductCard

`app/(tabs)/favorites.tsx` now uses `commerce/product-card` grid variant with shared cart/favorite busy scopes — same contract as Catalog.

**Delivery badge policy:** Canonical ProductCard does not render an unconditional `"Доставка"` badge. Delivery remains a real LOT product capability (checkout sections, PDP pickup data, future CDEK). The old favorites-only fake badge was removed by following canonical card behavior — not by removing delivery from LOT.

### 2. Cart checkout transition copy

Cart CTA loading text changed from `"Создание заказа…"` to `"Переходим к оформлению…"` while navigating to `/checkout`. Checkout screen browser handoff copy unchanged.

### 3. Delivery receipt section policy

`CartDeliveryCard` and `CheckoutNextStepInfo` **unchanged**. They explain that delivery/payment are selected during checkout — truthful for current browser handoff model. CDEK integration deferred (see `LOT_DELIVERY_CDEK_V1_PLAN.md`).

### 4. Seller capability refresh

After web seller onboarding (`lot://sell` return), `useWebHandoffSessionRefresh` calls `refreshSessionRole()` to update `sellerCapable` without re-login.

### 5. Checkout return correlation

Before browser handoff, checkout snapshots `knownOrderIds` + `startedAt`. On foreground return, `correlateCheckoutReturnOrder` matches new orders — never assumes `orders[0]`. Explicit `lot://order/{id}` deep links take priority.

### 6. Unknown LOT status fallback

Unknown product/moderation enums display `"Статус обновляется"` instead of raw backend values.

### 7. Chat test

`mobile-chat.test.ts` asserts CTA in `ProductSellerCard.tsx` (B3 extraction).

### 8. Bottom navigation

**Unchanged** (`BOTTOM_NAV_CHANGED=NO`).

---

## Gate matrix

| Gate | Verdict |
|------|---------|
| FAVORITES_CANONICAL_PRODUCT_CARD | PASS |
| FAVORITES_CART_SHARED_STATE | PASS |
| FAVORITES_FAVORITE_SHARED_STATE | PASS |
| CART_CHECKOUT_TRANSITION_COPY_TRUTHFUL | PASS |
| SELLER_CAPABLE_REFRESH_WITHOUT_RELOGIN | PASS |
| SELLER_ENTRY_AVAILABLE_AFTER_ONBOARDING | PASS |
| CHECKOUT_RETURN_SPECIFIC_ORDER_CORRELATION | PASS |
| CHECKOUT_RETURN_DOES_NOT_ASSUME_ORDERS_ZERO | PASS |
| KNOWN_LOT_STATUS_LABELS_PRESERVED | PASS |
| UNKNOWN_LOT_STATUS_RAW_ENUM_VISIBLE | NO |
| MOBILE_CHAT_TEST | PASS |
| BOTTOM_NAV_CHANGED | NO |
| CDEK_IMPLEMENTED | NO |

---

## Tests

`tests/mobile-rc27-preflight-polish.test.ts` — RC27-POLISH-01 … RC27-POLISH-11

Plus preserved Wave A, B0–B3, seller LOT, chat, auth suites.

---

## Deferred

See `docs/product/LOT_DELIVERY_CDEK_V1_PLAN.md` for post-RC27 CDEK delivery platform scope.
