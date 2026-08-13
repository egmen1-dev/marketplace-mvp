# Pre-Payment Backup Checklist

Run **before** enabling live (`sk_live_`) Stripe keys or first real charge.

---

## 1. Migration state

```bash
railway run --service web-v2 -- npx prisma migrate status
```

- [ ] No pending migrations
- [ ] Migration `20260813140000_payment_finance_ledger` applied (webhook events + finance ledger)

Apply if needed:

```bash
railway run --service web-v2 -- npx prisma migrate deploy
```

---

## 2. Database backup

- [ ] Railway Postgres → create manual snapshot labeled `pre-payment-YYYY-MM-DD`
- [ ] Record snapshot ID: ________________
- [ ] Optional: `pg_dump` to encrypted storage (not git)

---

## 3. Environment verification

- [ ] Staging `/api/health` → `ok: true`, `checks.database.ok: true`
- [ ] Stripe test keys only on staging until GO
- [ ] Webhook endpoint points at staging URL
- [ ] Commit SHA recorded: `curl -sS …/api/version | jq .commit`

---

## 4. Rollback plan

| Failure | Action |
|---------|--------|
| Bad webhook / double credit | Redeploy previous deployment; Stripe events are idempotent by `stripeEventId` |
| Ledger corruption | Restore DB snapshot; do **not** run destructive down migrations |
| Wrong Stripe mode (live on staging) | Remove live keys immediately; rotate keys in Stripe Dashboard |

See also: [ROLLBACK.md](./ROLLBACK.md), [PRODUCTION_BACKUP_CHECKLIST.md](./PRODUCTION_BACKUP_CHECKLIST.md)

---

## 5. Sign-off

| Role | Name | Date |
|------|------|------|
| Engineering | | |
| Ops | | |

**Do not enable `sk_live_` until this checklist is signed.**
