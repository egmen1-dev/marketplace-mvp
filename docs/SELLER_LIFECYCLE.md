# Seller Lifecycle (SELLER-LIFECYCLE-001)

Unified seller journey from first seller activation to first payout — advisory presentation layer over existing modules. Uses a **single user account** (buyer + seller); no separate seller account or global onboarding.

## Feature flag

```bash
SELLER_LIFECYCLE_ENABLED=true   # default: off
```

Recommended companion flags:

```bash
SELLER_PAYOUT_ENABLED=true
# Optional when merged: MARKETPLACE_COMMAND_CENTER, SELLER_GROWTH, MARKETPLACE_EDUCATION
```

## Architecture

```
Products · Orders · Finance · Payout (+ optional Growth, Education, Promotion)
        ↓
lib/seller-lifecycle/
        ↓
Command Center journey · Coach · Milestones · Admin funnel · Notifications
```

### Module layout

| File | Role |
|------|------|
| `types.ts` | Stages, milestones, dashboard DTOs |
| `progress.ts` | Load signals from Prisma (products, orders, balance, payout) |
| `journey.ts` | Stage resolution, 8-step checklist, progress |
| `milestones.ts` | FIRST_PRODUCT, FIRST_VIEW, FIRST_ORDER, FIRST_PAYOUT, … |
| `recommendations.ts` | Seller Journey Coach + empty-state copy |
| `queries.ts` | Seller dashboard, admin funnel, notifications |
| `analytics.ts` | Lifecycle analytics events |
| `permissions.ts` | Seller/admin gates |
| `flags.ts` | `SELLER_LIFECYCLE_ENABLED` |

## Seller journey stages

```
NOT_STARTED → SELLER_ACTIVATED → FIRST_PRODUCT_CREATED → FIRST_PRODUCT_PUBLISHED
→ PRODUCT_OPTIMIZED → FIRST_VIEWS → FIRST_CART → FIRST_ORDER → ORDER_COMPLETED
→ BALANCE_AVAILABLE → FIRST_PAYOUT → GROWING_SELLER
```

Progress is computed automatically from existing data — never manually set.

## Surfaces

| Route | Block |
|-------|--------|
| `/account/command-center` | **Ваш путь продавца** + AI coach + milestones |
| `/account` | Journey panel for sellers (when enabled) |
| `/admin/sellers` | Seller Funnel metrics |
| `/notifications` | SELLER_NEXT_STEP, SELLER_MILESTONE, SELLER_PROGRESS, SELLER_MONEY_AVAILABLE |

## Simplified seller nav

When `SELLER_LIFECYCLE_ENABLED=true`:

- Мой магазин · Товары · Заказы · Продвижение · Аналитика · Деньги · AI помощник

## Analytics (no PII)

- `seller_journey_view`
- `seller_milestone_reached`
- `seller_next_step_click`
- `seller_activation_completed`
- `seller_first_sale`
- `seller_first_payout`

## Constraints

- Does **not** modify Catalog, Search, Ranking, Orders lifecycle, Finance ledger, Stripe, or Promotion billing
- Reuses completeness scoring from `lib/conversion/completeness` for PRODUCT_OPTIMIZED stage

## Future

- Deep merge with Marketplace Command Center priorities when both epics are on one branch
- Promotion stage signal when Promotion Campaign models are available
- Milestone celebration modals and push notifications

## Tests

- Unit: `tests/seller-lifecycle.test.ts`
- E2E: `tests/e2e/seller-lifecycle.spec.ts`
