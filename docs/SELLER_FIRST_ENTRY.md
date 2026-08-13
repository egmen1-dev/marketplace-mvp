# SELLER-FIRST-ENTRY-001 — First Seller Experience

«Старт продавца» — guided first seller journey inside the unified buyer/seller account. Onboarding runs only when the user enters seller sections or clicks **Продать товар**, not as global user onboarding.

## Feature flag

```bash
SELLER_FIRST_ENTRY_ENABLED=true   # default: false
```

Deploy together with seller lifecycle/payout flags when those epics are merged:

```bash
SELLER_LIFECYCLE_ENABLED=true
SELLER_PAYOUT_ENABLED=true
SELLER_FIRST_ENTRY_ENABLED=true
npx prisma migrate deploy
npx prisma generate
```

## Routes

| Route | Purpose |
|-------|---------|
| `/account/seller-start` | Welcome screen + journey progress + AI coach |
| `/account/products` | Trigger path — redirects new sellers to seller-start |
| `/account/promotion-center` | Promotion placeholder + coach CTA target |

## Journey steps (computed)

Progress is derived from existing data (products, completeness score, views, orders, balance, payouts):

1. `SELLER_START` → create first product  
2. `PRODUCT_CREATED` → publish draft  
3. `PRODUCT_PUBLISHED` → improve card quality (≥ 70)  
4. `CARD_IMPROVED` → get first views  
5. `FIRST_VIEWS` → first order  
6. `FIRST_ORDER` → balance available  
7. `BALANCE_AVAILABLE` → first payout  
8. `FIRST_PAYOUT` — path complete  

UI shows **5 milestones**: create → strong card → views → order → money.

## Optional DB tracking

`SellerExperienceProgress` stores `startedAt`, `completedAt`, `dismissedAt`, `currentStep` — analytics and admin funnel only. Step resolution does not depend on manual writes.

## Integrations

- **Seller Growth / Lifecycle** — `loadSellerProgressSignals`  
- **Completeness** — product quality score for card-improvement step  
- **Command Center** — AI coach fallback when path complete  
- **Promotion Center** — CTA after publication (placeholder page on this branch)  
- **Balance / Payout** — money milestones  
- **Notifications** — `SELLER_START_GUIDE`, `SELLER_NEXT_STEP`, `SELLER_MILESTONE`  
- **Admin** — Seller Activation block on `/admin/sellers`  

## Analytics events

- `seller_entry_started`
- `seller_onboarding_started`
- `seller_onboarding_step_completed`
- `seller_guide_action_click`
- `seller_onboarding_completed`

## Tests

```bash
SELLER_FIRST_ENTRY_ENABLED=true npm run test -- tests/seller-first-entry.test.ts
SELLER_FIRST_ENTRY_ENABLED=true E2E_FIXTURE_SECRET=... npm run test:e2e -- tests/e2e/seller-first-entry.spec.ts
```

E2E uses `/api/e2e/first-entry-fixture` to reset `buyer@demo.lot` for the new-seller flow.

## Out of scope

Does not modify catalog core, search, ranking, order lifecycle, finance ledger, Stripe, or promotion campaign logic.
