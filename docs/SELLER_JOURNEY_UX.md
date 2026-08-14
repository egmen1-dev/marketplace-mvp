# SELLER-JOURNEY-UX-002 — Seller Experience Completion

Unified seller journey UX layer that connects First Entry, Lifecycle, Growth signals, Command Center, Promotion, Balance, and Payout into one AI-guided path inside seller sections only.

## Feature flag

```bash
SELLER_JOURNEY_ENABLED=true   # default: false
```

Recommended deploy stack:

```bash
SELLER_FIRST_ENTRY_ENABLED=true
SELLER_LIFECYCLE_ENABLED=true
SELLER_PAYOUT_ENABLED=true
SELLER_JOURNEY_ENABLED=true
npx prisma migrate deploy
```

When `SELLER_JOURNEY_ENABLED=true`, journey UX takes precedence over lifecycle/first-entry notifications and account nav.

## Architecture

```
lib/seller-journey/
├── types.ts           # state machine + DTOs
├── steps.ts           # 6-step checklist + progress math
├── progress.ts        # resolveSellerJourneyStep from signals
├── recommendations.ts # coach + empty states
├── messages.ts        # step headlines + «why»
├── milestones.ts      # FIRST_PRODUCT … FIRST_PAYOUT
├── queries.ts         # dashboard, funnel, notifications
├── permissions.ts
├── analytics.ts
├── flags.ts
└── actions.ts
```

Progress is computed from `loadSellerProgressSignals` (products, quality, views, carts, orders, balance, payouts).

## State machine

`NOT_STARTED` → `SELLER_STARTED` → `FIRST_PRODUCT_CREATED` → `PRODUCT_PUBLISHED` → `PRODUCT_READY` → `FIRST_VISITS` → `FIRST_CART` → `FIRST_ORDER` → `ORDER_COMPLETED` → `BALANCE_AVAILABLE` → `FIRST_PAYOUT` → `GROWING_SELLER`

## UI

| Component | Where |
|-----------|--------|
| `SellerJourneyCard` | `/account/growth`, `/account/seller-start`, `/account/command-center` (compact), `/account` (compact) |
| `SellerJourneyCoach` | Inside journey card |
| `SellerJourneyEmptyState` | products, sales (when journey enabled) |
| `AdminSellerJourneyFunnelPanel` | `/admin/sellers` |

## Routes

| Route | Purpose |
|-------|---------|
| `/account/growth` | AI помощник — main journey hub |
| `/account/seller-start` | First entry + journey card |
| `/account/command-center` | Analytics + compact journey |

## Nav (when enabled)

Мой магазин · Товары · Заказы · Продвижение · Аналитика · AI помощник · Деньги · Настройки

## Notifications

`SELLER_NEXT_STEP`, `SELLER_PROGRESS`, `SELLER_MILESTONE`, `SELLER_FIRST_ORDER`, `SELLER_FIRST_PAYOUT`

## Analytics

- `seller_journey_view`
- `seller_step_view`
- `seller_next_action_click`
- `seller_milestone_reached`
- `seller_first_sale` / `seller_first_payout`

## Tests

```bash
SELLER_JOURNEY_ENABLED=true npm run test -- tests/seller-journey.test.ts
SELLER_JOURNEY_ENABLED=true E2E_FIXTURE_SECRET=... npm run test:e2e -- tests/e2e/seller-journey.spec.ts
```

## Out of scope

Does not modify catalog core, search, ranking, order lifecycle, finance ledger, Stripe, or promotion billing logic.
