# Seller Payout System (SELLER-PAYOUT-001)

Manual seller withdrawal workflow on top of the Marketplace Finance Layer — no Stripe Connect, no automatic bank payouts in MVP.

## Feature flag

```bash
SELLER_PAYOUT_ENABLED=true   # default: off
```

Requires finance foundation from EPIC-FINANCE-001 (`SellerBalance`, `FinanceTransaction`).

## Architecture

```
Finance Layer (unchanged ledger)
        ↓
lib/seller-payout/
        ↓
Seller balance UI · /account/payouts · Admin queue · Notifications
```

### Module layout

| File | Role |
|------|------|
| `types.ts` | DTOs, status labels, `MIN_PAYOUT_AMOUNT` |
| `requests.ts` | Create/cancel payout requests, validation |
| `methods.ts` | Seller payment method references (masked) |
| `lifecycle.ts` | Status transitions + reserved balance moves |
| `queries.ts` | Seller/admin dashboards |
| `actions.ts` | Server actions + `AdminActionLog` + analytics |
| `permissions.ts` | Seller/admin gates |
| `notifications.ts` | Payout inbox events |
| `flags.ts` | `SELLER_PAYOUT_ENABLED` |

## Database

- `PayoutRequest` — seller withdrawal request with status lifecycle
- `SellerPaymentMethod` — CARD / BANK_ACCOUNT reference only (no raw PAN)
- `PayoutTransaction` — completed manual payout record
- `SellerBalance.reservedForPayoutAmount` — funds locked while request is active

## Balance logic

| Event | availableAmount | reservedForPayoutAmount | paidAmount |
|-------|-----------------|----------------------|------------|
| Request created | −amount | +amount | — |
| Rejected / cancelled | +amount | −amount | — |
| Completed | — | −amount | +amount |

Finance ledger (`FinanceTransaction`) and order lifecycle are **not** modified.

## Payout lifecycle

```
REQUESTED / UNDER_REVIEW
    → APPROVED → PROCESSING → COMPLETED (+ PayoutTransaction)
    → REJECTED (funds returned)
    → CANCELLED by seller (funds returned)
```

Admin actions are logged in `AdminActionLog` with entity type `PAYOUT_REQUEST`.

## Seller surfaces

| Route | Purpose |
|-------|---------|
| `/account/balance` | Pending / available / paid + education + «Вывести деньги» |
| `/account/payouts` | Amount → method → confirm → history |

## Admin surfaces

| Route | Purpose |
|-------|---------|
| `/admin/payouts` | Queue, obligations, paid today |
| `/admin/payouts/[id]` | Approve, reject, processing, complete |

## Notifications (`/notifications`)

- `PAYOUT_REQUEST_CREATED`
- `PAYOUT_UNDER_REVIEW`
- `PAYOUT_APPROVED`
- `PAYOUT_PROCESSING`
- `PAYOUT_COMPLETED`
- `PAYOUT_REJECTED`

## Analytics (no PII)

- `payout_page_view`
- `payout_request_started`
- `payout_request_created`
- `payout_completed`
- `payout_rejected`

## Security model

- Sellers see only their balance and requests
- Payment details stored as masked references only
- Reserved balance prevents double withdrawal
- Admin audit trail on every status change

## Future

- **Stripe Connect** — replace manual `externalReference` with connected account transfers
- **KYC** — gate payout methods and limits
- **Automatic payouts** — scheduled batch after approval rules

## Tests

- Unit: `tests/seller-payout.test.ts`
- E2E: `tests/e2e/seller-payout.spec.ts` (uses `/api/e2e/payout-fixture`)
