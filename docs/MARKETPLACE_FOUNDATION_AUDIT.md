# MARKETPLACE-FOUNDATION-AUDIT-001 — Marketplace Core Readiness Audit

Read-only audit layer to verify marketplace foundation before scaling AI modules.

## Feature flag

```bash
MARKETPLACE_FOUNDATION_AUDIT_ENABLED=true   # default: false
```

## Architecture

```
lib/marketplace-foundation-audit/
├── buyer-flow.ts
├── seller-flow.ts
├── order-flow.ts
├── payment-flow.ts
├── delivery-flow.ts
├── review-flow.ts
├── moderation-flow.ts
├── admin-operations.ts
├── security-checks.ts
├── readiness-score.ts
├── recommendations.ts
├── queries.ts
├── permissions.ts
├── flags.ts
└── types.ts
```

## Admin routes

| Route | Purpose |
|-------|---------|
| `/admin/foundation` | Foundation score, checklist, critical issues, recommendations |
| `/admin/operations` | Live operator overview (orders, sellers, products, finance, trust) |

## Foundation Score (0–100)

| Area | Weight |
|------|-------:|
| Buyer journey | 20 |
| Seller journey | 20 |
| Order lifecycle | 15 |
| Payments | 15 |
| Delivery | 10 |
| Reviews & trust | 10 |
| Moderation | 5 |
| Operations (+ security) | 5 |

## Known foundation gaps (detected, not fixed by audit)

- **Reviews** — eligibility hook exists; Review model/UI not shipped
- **Moderation queue** — manual admin hide/activate; no PENDING/APPROVED workflow
- **CDEK** — mock provider when credentials missing

## Analytics

- `foundation_audit_view`
- `buyer_flow_check`, `seller_flow_check`, `order_flow_check`, `payment_check`
- `foundation_issue_detected`, `foundation_issue_fixed` (reserved)

## Tests

```bash
MARKETPLACE_FOUNDATION_AUDIT_ENABLED=true npm run test -- tests/marketplace-foundation-audit.test.ts
MARKETPLACE_FOUNDATION_AUDIT_ENABLED=true npm run test:e2e -- tests/e2e/marketplace-foundation-audit.spec.ts
```

## Out of scope

Does not modify catalog core, search, ranking, orders architecture, finance ledger, Stripe flow, or AI modules.
