# Seller badges

Badges on the public seller profile and product page (`SellerBadges` component).

## Variants

| Badge | Label | Rule |
|-------|-------|------|
| `NEW_SELLER` | Новый продавец | See below |
| `VERIFIED_SELLER` | Проверенный продавец | `SellerProfile.isVerified === true` (admin action) |
| `STORE` | Магазин | `SellerProfile.kind === SHOP` |

Badges are **not mutually exclusive** — a new verified shop can show all three at once.

## NEW_SELLER business rule (HOTFIX-UX-001)

**Chosen rule:** combined window — badge is shown while **both** conditions hold:

1. **Registration age:** seller joined ≤ **30 calendar days** ago (`SellerProfile.createdAt`).
2. **Order volume:** seller has fewer than **5 completed orders**.

A completed order is one in status `COMPLETED`, `DELIVERED`, or `PICKED_UP` (same as trust metrics).

The badge disappears when **either** threshold is exceeded (whichever comes first).

### Why this rule

| Alternative | Drawback |
|-------------|----------|
| 30 days only | High-volume new sellers stay “new” too long |
| N orders only | Inactive sellers keep the badge indefinitely |
| **30 days AND &lt; 5 orders** | Predictable for buyers; rewards early traction |

Constants: `NEW_SELLER_DAYS`, `NEW_SELLER_MAX_COMPLETED_ORDERS` in `features/seller/lib/reputation.ts`.

### Where displayed

- Product page — `ProductSellerCard`
- Public seller page — `SellerPublicHeader`

Not shown on catalog product cards (by design).

## Implementation

```ts
resolveSellerBadges({
  isVerified,
  kind,
  joinedAt,
  completedOrdersCount,
});
```

Metrics source: `getSellerReputationMetrics()` → `completedOrdersCount`.
