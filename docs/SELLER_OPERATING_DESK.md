# SELLER-OPERATING-DESK-001 — Seller Business Workspace

Unified **«Мой бизнес»** screen — daily seller command center combining KPIs, issues, today's actions, money snapshot, and journey coach.

## Feature flag

```bash
SELLER_OPERATING_DESK_ENABLED=true   # default: false
```

Recommended stack:

```bash
SELLER_JOURNEY_ENABLED=true
SELLER_FIRST_ENTRY_ENABLED=true
SELLER_OPERATING_DESK_ENABLED=true
```

## Route

| Route | Nav label |
|-------|-----------|
| `/account/business` | Мой бизнес |

When enabled, sellers visiting `/account` redirect to `/account/business`.

## Architecture

```
lib/seller-operating-desk/
├── types.ts
├── flags.ts
├── issues.ts          # problem detection
├── actions.ts         # today's prioritized actions
├── queries.ts         # dashboard aggregation
├── analytics.ts
├── permissions.ts
└── server-actions.ts
```

Reuses:
- `getSellerDashboardStats`, `getSellerOrderCounters`, `listSellerDashboardActivity`
- `loadSellerProgressSignals`
- `getSellerJourneyDashboard` (coach)
- `getSellerBalance`

## UI sections

1. **Сейчас происходит** — live headline + order counters
2. **KPI cards** — products, sales, revenue
3. **Требует внимания** — detected issues with «Почему»
4. **Сделать сегодня** — prioritized actions
5. **Деньги** — pending / available / payout CTA
6. **Journey coach** — when `SELLER_JOURNEY_ENABLED`
7. **Recent orders + activity**

## Analytics

- `seller_operating_desk_view`
- `seller_operating_desk_issue_click`
- `seller_operating_desk_action_click`

## Tests

```bash
SELLER_OPERATING_DESK_ENABLED=true npm run test -- tests/seller-operating-desk.test.ts
```

## Out of scope

Does not modify catalog, orders lifecycle, finance ledger, Stripe, or promotion billing.
