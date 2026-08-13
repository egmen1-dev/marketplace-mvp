# Buyer Protection & Disputes (EPIC-TRUST-001)

Foundation layer on EPIC-FINANCE-001 — buyer confirmation before seller payout, disputes, admin resolution.

## Flow

```
Payment → HELD → DELIVERED → AWAITING_BUYER_CONFIRMATION
                              ↓ confirm          ↓ dispute
                         COMPLETED → RELEASED   DISPUTE_OPEN → admin → REFUND / RELEASE
                              ↑
                    auto after protectionEndsAt (cron hook)
```

## Modules

| Path | Role |
|------|------|
| `lib/trust/confirmation.ts` | Buyer confirm, protection entry, auto-confirm |
| `lib/trust/dispute.ts` | Open/resolve disputes + finance hooks |
| `lib/trust/protection-cron.ts` | `processExpiredProtectionWindows()` |
| `features/trust/` | Buyer/admin UI + server actions |

## Cron hook (not scheduled in MVP)

```bash
POST /api/cron/trust-protection
Authorization: Bearer $CRON_SECRET
```

## Default protection window

3 days (`ProtectionPolicy.defaultProtectionDays`).

## Deploy

```bash
npx prisma migrate deploy
npm run test -- tests/trust-protection.test.ts
```

Stacked on `cursor/epic-finance-001-d03e`.
