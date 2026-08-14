# MARKETPLACE-UX-COMPLETION-001

UX aggregation layer — turns modular marketplace subsystems into a cohesive product experience without changing catalog core, search, ranking, orders, finance, or delivery logic.

## Feature flag

```bash
MARKETPLACE_UX_COMPLETION_ENABLED=true
```

All surfaces are no-ops when the flag is off.

## UX philosophy

```
Complex internal system
        ↓
Clear user experience
        ↓
Trust
        ↓
Conversion
```

This layer does **not** create new business algorithms. It aggregates and explains existing modules:

- Marketplace Education (purchase steps on PDP)
- AI Experience (seller next-step explanations)
- Seller Journey / Business Intelligence / Operations
- Trust Loop (PDP trust scores)
- Discovery (homepage + nav)
- Buyer Intelligence (PDP fit reasons)
- Notifications (settings links)
- Command Center (seller analytics nav)

**Not modified:** Catalog Core, Search, Ranking, Orders, Finance Ledger, Stripe, Delivery logic, Promotion ranking.

## Architecture

```
lib/marketplace-ux-completion/
  flags.ts
  types.ts
  navigation.ts
  onboarding.ts
  empty-states.ts
  account-overview.ts
  settings.ts
  buyer-home.ts
  seller-home.ts
  trust-ui.ts
  queries.ts
  analytics.ts
  permissions.ts
  actions.ts
  index.ts

features/marketplace-ux-completion/
  components/   — account, onboarding, settings, PDP, seller home, empty states, admin
  index.ts
```

## Buyer journey

| Step | Surface | Purpose |
|------|---------|---------|
| First entry | Home — welcome banner | Short intro, no long tutorial |
| Home | Greeting + Discovery sections | Habit beyond search |
| PDP | Trust + fit + purchase education | Explain value before buy |
| Empty states | Favorites / orders | Guide next action |
| Account | `/account` — «Мой аккаунт» | Unified buyer + seller identity |
| Settings | `/account/settings` | Full product-style settings |

## Seller journey

| Step | Surface | Purpose |
|------|---------|---------|
| Business home | `/account/business` | Today stats + AI next step |
| Empty products | `/account/products` | Create first listing |
| Settings | Sales section | Store, balance, payouts |
| Mode switch | Account overview | Buyer ↔ seller in one account |

## Navigation rules

**Buyer nav** (when UX completion enabled in account nav):

- Главная, Каталог, Находки, Избранное, Заказы, Профиль

**Seller nav** (conceptual — linked from account mode):

- Мой бизнес, Товары, Заказы, Продвижение, Аналитика, Деньги, Настройки

Mode cookie: `lot_account_mode` (`buyer` | `seller`).

Buyer onboarding cookie: `lot_buyer_onboarding_done`.

## Admin

Route: `/admin/dashboard` — Marketplace Health, attention items, AI tips (links into existing admin modules).

## Analytics

Events (see `lib/analytics/events.ts`):

- `ux_page_view`, `onboarding_started`, `onboarding_completed`
- `empty_state_view`, `empty_state_action_click`
- `settings_opened`, `account_mode_switch`
- `trust_block_view`, `ai_explanation_view`
- `seller_dashboard_action_click`, `buyer_discovery_opened`

## AI explanation layer

Each seller recommendation card shows:

- What is happening (title)
- Why it matters (why)
- Expected result (benefit)
- CTA to fix

No new AI models — reuses Seller Business Intelligence / Journey next actions.

## Trust visual layer

PDP blocks show unified trust copy:

- Seller score / product score (when Trust Loop data exists)
- Reasons list (verified seller, rating, description, delivery)

## Tests

```bash
npm test -- tests/marketplace-ux-completion.test.ts
npx playwright test tests/e2e/marketplace-ux-completion.spec.ts
```

Requires `MARKETPLACE_UX_COMPLETION_ENABLED=true` for e2e.

## Future improvements

- Persist buyer onboarding per device vs account
- Deep-link account mode from header without reload
- Admin health blocks with live metrics instead of static status
- Localized empty-state variants by user segment
- Wire buyer nav items into site header (currently account nav + home)
