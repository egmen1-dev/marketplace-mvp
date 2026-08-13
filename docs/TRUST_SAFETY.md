# Trust & Safety (TRUST-SAFETY-001)

Buyer protection and dispute foundation for marketplace trust.
Does **not** change Catalog Core, Search, Ranking, OMS lifecycle, finance math, or Stripe.

## Flag

| Env | Default | Effect |
|-----|---------|--------|
| `TRUST_SAFETY_ENABLED` | `false` | Server UI + actions |
| `NEXT_PUBLIC_TRUST_SAFETY_ENABLED` | unset | Client-visible parity |

Set both to `true` on Railway staging to surface trust UX.

## Architecture

```
lib/trust-safety/
  flags.ts              # isTrustSafetyEnabled()
  buyer-protection.ts   # BuyerProtectionState (derived)
  trust-score.ts        # SellerTrustScore 0–100 (display only)
  seller-trust.ts       # PDP formatting
  disputes.ts           # statuses, reasons, transitions
  guarantees.ts         # timeline + copy wiring
  guarantees-copy.ts    # RU copy (no «эскроу»)
  permissions.ts        # actor gates
  queries.ts            # Order/Finance/Dispute reads
  actions.ts            # confirm wrapper + create/resolve dispute
```

UI: `components/trust/*`  
Admin: `/admin/trust`  
Docs: this file.

## Buyer protection

`BuyerProtectionState` is **derived** from Order + Payment + Dispute + Finance RELEASE — not a new OMS column.

| State | Meaning |
|-------|---------|
| PAYMENT_PROTECTED | Paid / protected |
| SELLER_PROCESSING | Seller preparing |
| DELIVERY_PENDING | In transit / pickup |
| BUYER_CONFIRMATION | Delivered — confirm or dispute |
| FUNDS_RELEASED | COMPLETED / RELEASE ledger |
| DISPUTE_OPEN | Open dispute |

Buyer confirm uses existing OMS `buyerConfirmReceivedAction` → `COMPLETED` → existing finance release hook. Trust layer does not recalculate commission.

## Order timeline

Display-only steps on order detail (when flag on):

Оплата → Продавец готовит → Доставка → Получение → Подтверждение → Выплата продавцу

## Dispute system

Model `Dispute` with:

- Status: `OPEN` → `SELLER_RESPONSE` / `UNDER_REVIEW` → `RESOLVED_BUYER` | `RESOLVED_SELLER`
- Reasons: `ITEM_NOT_MATCH`, `DAMAGED`, `NOT_RECEIVED`, `WRONG_ITEM`

Parallel to OMS — opening a dispute does not change order status in v1.

## Seller trust

`SellerTrustScore` 0–100 from: completed orders, dispute rate, response time, product quality, account age (+ verified bonus).

**Does not feed ranking/search.** Shown on PDP as «Надёжный продавец» + sales + joined date when score qualifies.

## Surfaces (flag on)

1. Checkout — «Безопасная сделка»
2. PDP — «Почему можно доверять» + trust score badge
3. Order — timeline + «Получил товар» / «Есть проблема»
4. Seller balance — «Как работает выплата»
5. Admin `/admin/trust` — disputes, queue, seller overview, risk signals

## Analytics

| Event | When |
|-------|------|
| `trust_block_view` | Trust block in viewport |
| `buyer_confirmation` | Buyer confirms receipt |
| `dispute_created` | Dispute opened |
| `dispute_resolved` | Admin resolves |
| `seller_trust_view` | PDP seller trust badge |

## Future automation

- Auto-release after N days without dispute
- Seller response SLA + auto-escalation to UNDER_REVIEW
- Partial refunds / chargeback linkage
- Trust score → seller education nudges (still not ranking)

## Deploy checklist

1. Apply migration `20260813150000_trust_safety_disputes`
2. Set `TRUST_SAFETY_ENABLED=true` (+ public twin if needed)
3. Smoke: `/admin/trust`, checkout safe-deal, order panel, PDP why-trust
4. Confirm finance release still only on OMS COMPLETED
