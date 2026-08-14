# SELLER-OPERATIONS-WORKSPACE-001 — Seller Daily Operations

Evolve **«Мой бизнес»** from analytics dashboard into a daily seller operating workspace with **«Сегодня»** mode.

## Feature flag

```bash
SELLER_OPERATIONS_ENABLED=true   # default: false
```

Recommended stack:

```bash
SELLER_FIRST_ENTRY_ENABLED=true
SELLER_JOURNEY_ENABLED=true
SELLER_OPERATING_DESK_ENABLED=true
SELLER_OPERATIONS_ENABLED=true
```

When `SELLER_OPERATIONS_ENABLED=true`, `/account/business` shows the Today workspace instead of the operating desk panel.

## Route

| Route | Nav label |
|-------|-----------|
| `/account/business` | Мой бизнес |

## Architecture

```
lib/seller-operations/
├── types.ts
├── flags.ts
├── permissions.ts
├── orders.ts
├── inventory.ts
├── products.ts
├── tasks.ts
├── priorities.ts       # getSellerDailyPriorities() — max 5
├── alerts.ts
├── recommendations.ts
├── queries.ts
├── actions.ts
├── analytics.ts
└── index.ts
```

Reuses:
- Seller Operating Desk (order counters, stats)
- Seller Journey (checklist, coach signals)
- Seller Growth / Learning (AI advice CTAs)
- Finance (`getSellerBalance`)
- Product completeness (`getProductCompletenessMap`)

## Today workspace sections

1. **Сегодня у вас** — summary lines (orders, products, AI, money)
2. **Сегодня важно** — up to 5 daily priorities
3. **Заказы требуют внимания** — new / ship today / overdue
4. **Деньги** — sales, pending, available, payout CTA
5. **Товары требуют внимания** — no sales, low stock, weak card
6. **Остатки** — popular, low stock, stale inventory
7. **AI совет дня** — growth recommendation
8. **Продвижение сегодня** — campaigns snapshot
9. **Путь развития** — seller checklist
10. **Результат** — daily outcome summary

## Notifications

When enabled, replaces journey/first-entry/lifecycle seller notifications on `/notifications`:

- `ORDER_ACTION_REQUIRED`
- `PRODUCT_NEEDS_ATTENTION`
- `STOCK_WARNING`
- `AI_DAILY_RECOMMENDATION`
- `PROMOTION_INSIGHT`
- `PAYOUT_AVAILABLE`

## Analytics

- `seller_operations_view`
- `seller_task_open`
- `seller_task_complete` (reserved)
- `seller_priority_click`
- `seller_ai_advice_click`

No PII in event payloads.

## Admin

`/admin/sellers` — **Seller Operations Health** block:

- sellers with open tasks
- overdue orders
- products without sales
- growth potential sellers

## Tests

```bash
SELLER_OPERATIONS_ENABLED=true npm run test -- tests/seller-operations.test.ts
SELLER_OPERATIONS_ENABLED=true npm run test:e2e -- tests/e2e/seller-operations.spec.ts
```

## Out of scope

Does not modify catalog core, search, ranking, payment flow, or finance ledger.
