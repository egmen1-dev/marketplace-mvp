# Trust & Safety (TRUST-SAFETY-001)

Advisory trust layer on top of the existing marketplace — **no changes** to Catalog Core, Search, Ranking, Orders lifecycle, Finance ledger, or Stripe payment flow.

Helps buyers understand seller/product trust and purchase protection. Helps sellers improve trust signals.

## Feature flag

```bash
TRUST_SAFETY_ENABLED=true   # default: off
```

## Architecture

```
Existing seller/product/order signals
        ↓
lib/trust-safety/ (scores + risk + recommendations)
        ↓
Buyer PDP · Seller growth/AI center · Admin trust center · Notifications
        ↓
Analytics
```

### Module layout

| File | Role |
|------|------|
| `trust-score.ts` | Score clamping, level labels, formatting |
| `seller-trust.ts` | `SellerTrustScore` 0–100 from account/orders/completeness |
| `product-trust.ts` | `ProductTrustScore` 0–100 from card quality + seller trust |
| `transaction-protection.ts` | Safe deal flow copy (uses finance education narrative) |
| `risk-signals.ts` | `RiskSignal` detection — recommendations only |
| `recommendations.ts` | Seller trust coach improvements |
| `queries.ts` | PDP experience, coach, admin dashboard, notifications |
| `permissions.ts` | Admin/seller gates |
| `flags.ts` | `TRUST_SAFETY_ENABLED` |

## Trust model

### SellerTrustScore (0–100)

Factors (informational, **not ranking**):

- Account age
- Completed orders & successful deliveries
- Cancellation rate
- Response activity (seller messages)
- Product completeness (avg quality score)
- Customer disputes (return/refund statuses)
- Finance history proxy (verification + completed sales)

### ProductTrustScore (0–100)

Factors:

- Photos, characteristics, description (via existing quality score)
- Seller trust contribution
- Stock availability
- Price presence

### RiskSignal types

- `SELLER_NEW`
- `NO_PRODUCT_PHOTO`
- `PRICE_TOO_LOW`
- `HIGH_CANCEL_RATE`
- `LOW_COMPLETION_RATE`

**No automatic blocks** — only surfaced recommendations.

## Surfaces

| Route | Audience | Purpose |
|-------|----------|---------|
| PDP `/product/[id]` | Buyer | «Почему можно доверять покупке» block |
| `/account/growth` | Seller | Trust coach panel |
| `/account/ai-center` | Seller | Trust coach panel |
| `/admin/trust-center` | Admin | Marketplace trust health |
| `/notifications` | Seller | `TRUST_WARNING`, `TRUST_IMPROVEMENT`, `TRANSACTION_PROTECTION` |

## Analytics

- `trust_view`
- `seller_trust_view`
- `product_trust_view`
- `trust_improvement_click`
- `risk_signal_view`

## Future roadmap

- **Verification** — document-based seller verification badges
- **KYC** — identity checks for high-volume sellers
- **AI fraud detection** — anomaly scoring with human review (still advisory)

## Constraints

- Does not alter search ranking or catalog sort
- Does not change Stripe Checkout or order state machine
- Escrow/hold messaging reuses existing finance education copy until real ledger ships
