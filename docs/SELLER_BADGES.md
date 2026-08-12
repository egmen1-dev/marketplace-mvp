# Seller Badges

Seller badges are small trust signals shown next to a store name on the product
page (PDP seller card) and the public seller profile header. They are derived
purely from real data — never manually toggled.

Source of truth: `features/seller/lib/reputation.ts` (`resolveSellerBadges`).
Rendering: `features/seller/components/seller-badge.tsx` (`SellerBadges`).

## Badge variants

| Variant           | Label (RU)             | Shown when                                        |
| ----------------- | ---------------------- | ------------------------------------------------- |
| `STORE`           | Магазин                | `SellerProfile.kind === SHOP`                     |
| `VERIFIED_SELLER` | Проверенный продавец   | `SellerProfile.isVerified === true`               |
| `NEW_SELLER`      | Новый продавец         | Seller is still "new" (business rule below)       |

Multiple badges can appear at once (e.g. a verified shop shows both `STORE` and
`VERIFIED_SELLER`).

## "New seller" business rule

**A seller is NEW while BOTH conditions hold:**

- account age ≤ **30 days** (`NEW_SELLER_DAYS`), **AND**
- completed (`DELIVERED`) orders < **5** (`NEW_SELLER_MAX_ORDERS`).

The badge disappears as soon as **either** milestone is crossed — whichever
comes first:

- 30 days elapse since registration, **or**
- the seller reaches 5 completed sales.

### Why AND-graduation (not OR)

The task offered two candidate criteria — "first 30 days" **or** "first N
completed orders". We combine them with **AND for eligibility / OR for
graduation** so that:

- A genuinely new store (few days old, 0 sales) is clearly marked as new.
- A store that quickly earns 5 real completed sales graduates early — sales are
  a stronger trust signal than the calendar.
- A slow store still graduates automatically after 30 days, so the badge can
  **never linger indefinitely** (the failure mode of a pure "< N orders" rule).

`completedOrdersCount` is the count of distinct `DELIVERED` orders, computed by
`getSellerReputationMetrics` and passed into the badge from both the PDP seller
card and the public seller header.

## Where it is displayed

- **Buyer view / product page** — `ProductSellerCard` (PDP seller block).
- **Seller profile** — `SellerPublicHeader` (public store page).

Both pass the seller's real `completedOrdersCount`, so graduation-by-sales works
consistently across surfaces.

## Tuning

Adjust the two constants in `features/seller/lib/reputation.ts`:

```ts
export const NEW_SELLER_DAYS = 30;      // time window
export const NEW_SELLER_MAX_ORDERS = 5; // sales window
```

Unit tests covering the rule live in `tests/seller-badges.test.ts`.
