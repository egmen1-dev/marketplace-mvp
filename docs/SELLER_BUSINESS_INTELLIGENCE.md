# SELLER-BUSINESS-INTELLIGENCE-001 — AI Business Assistant

Unified AI layer that aggregates existing seller modules into a business partner experience on `/account/business`.

## Feature flag

```bash
SELLER_BUSINESS_INTELLIGENCE_ENABLED=true   # default: false
```

Recommended stack:

```bash
SELLER_FIRST_ENTRY_ENABLED=true
SELLER_JOURNEY_ENABLED=true
SELLER_OPERATING_DESK_ENABLED=true
SELLER_OPERATIONS_ENABLED=true
SELLER_BUSINESS_INTELLIGENCE_ENABLED=true
```

When enabled, BI takes precedence on `/account/business` over operations/desk panels.

## Architecture

```
lib/seller-business-intelligence/
├── types.ts
├── flags.ts
├── summary.ts           # «Сейчас происходит»
├── next-action.ts       # single next best action
├── diagnosis.ts         # «Что мешает расти»
├── assistant.ts         # AI помощник block
├── money.ts             # balance education
├── promotion.ts         # promotion insight (decision help)
├── onboarding.ts        # first seller journey steps
├── empty-states.ts      # smart empty states
├── notifications.ts     # smart seller notifications
├── queries.ts           # dashboard + admin intelligence
├── permissions.ts
├── analytics.ts
├── actions.ts
└── index.ts
```

Aggregates (no new business algorithms):
- `loadSellerProgressSignals`
- `getSellerDailyPriorities` (top 1 action)
- `loadProductAttentionItems`
- `getSellerJourneyDashboard`
- `getSellerBalance`
- order counters and 7-day metrics

## UI sections on `/account/business`

1. **Сейчас происходит** — AI summary + main problem
2. **Ваш следующий шаг** — single priority action with why/benefit
3. **Что мешает расти** — product cards, sales, price, inventory, promotion
4. **Ваш AI помощник** — strengths, improvements, next step
5. **Продвижение** — decision-oriented insight
6. **Путь развития** — 6-step first seller journey

## Balance education

`/account/balance` adds **Как работают ваши деньги** when flag enabled.

## Notifications

When BI enabled, replaces operations/journey notifications on `/notifications`:

- `SELLER_FIRST_STEP`
- `SELLER_PRODUCT_ISSUE`
- `SELLER_SALES_WARNING`
- `SELLER_PROMOTION_READY`
- `SELLER_BALANCE_AVAILABLE`
- `SELLER_PAYOUT_READY`
- `SELLER_MILESTONE`

## Analytics

- `seller_business_view`
- `seller_ai_summary_view`
- `seller_next_action_view`
- `seller_action_click`
- `seller_instruction_started` (reserved)
- `seller_instruction_completed` (reserved)
- `seller_money_explanation_view`
- `seller_problem_view`
- `seller_problem_fixed` (reserved)

## Admin

`/admin/sellers` — **Seller Activation Intelligence** block.

## Tests

```bash
SELLER_BUSINESS_INTELLIGENCE_ENABLED=true npm run test -- tests/seller-business-intelligence.test.ts
SELLER_BUSINESS_INTELLIGENCE_ENABLED=true npm run test:e2e -- tests/e2e/seller-business-intelligence.spec.ts
```

## Out of scope

Does not modify catalog core, search, ranking, orders lifecycle, finance ledger, Stripe, or buyer experience.
