# Deployment Checklist — RC1 Production GO

**Owner GO required.** Do not execute Vercel deploy until sign-off.

**Target:** https://marketplace-mvp-one.vercel.app  
**Code:** `main` @ commit recorded below  
**Staging verified:** https://web-production-e56fb.up.railway.app

---

## Phase 0 — Pre-flight (T-24h)

- [ ] Read [PRODUCTION_ENV_AUDIT.md](./PRODUCTION_ENV_AUDIT.md)
- [ ] Complete [PRODUCTION_BACKUP_CHECKLIST.md](./PRODUCTION_BACKUP_CHECKLIST.md)
- [ ] Review [GO_NO_GO_MATRIX.md](./GO_NO_GO_MATRIX.md) — no BLOCKED items
- [ ] Confirm Reviews scope excluded (RC2)

---

## Phase 1 — Backup

- [ ] Production DB snapshot created & labeled
- [ ] Snapshot ID recorded
- [ ] Optional pg_dump stored securely
- [ ] Git tag `rc1-pre-deploy-*` created

---

## Phase 2 — Environment (Vercel Dashboard)

Add/update **Production** environment variables:

| Variable | Action |
|----------|--------|
| `DATABASE_URL` | Verify pooled connection string |
| `AUTH_SECRET` | Already set — do not change unless rotating |
| `NEXT_PUBLIC_APP_URL` | `https://marketplace-mvp-one.vercel.app` |
| `AUTH_URL` | Same as above |
| `BLOB_READ_WRITE_TOKEN` | Already set |
| `BLOB_ACCESS` | `private` |
| `NEXT_PUBLIC_BLOB_ACCESS` | `private` |
| `CRON_SECRET` | **Generate new** (`openssl rand -hex 32`) |
| `SENTRY_DSN` | Optional day-1 |
| `STRIPE_*` | If payments enabled |
| `CDEK_*` | If real delivery enabled |

**Do NOT set:** `E2E_FIXTURE_SECRET`

- [ ] All required vars saved
- [ ] Redeploy **not** triggered yet (env-only save OK)

---

## Phase 3 — Database migration

Run **once** against production DB (before or during deploy):

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

- [ ] 19 migrations applied
- [ ] No errors
- [ ] `_prisma_migrations` table shows latest: `20260811210000_oms_overdue_fields`

**Do not** run `migrate dev` or `db push` on production.

---

## Phase 4 — Deploy (Vercel)

```bash
# After explicit GO only:
git checkout main && git pull
npx vercel deploy --prod
```

Or: Vercel Dashboard → Deployments → Deploy `main`

- [ ] Build succeeded
- [ ] No build-time env errors
- [ ] Deployment URL matches production alias

---

## Phase 5 — Cron setup

Schedule **after** deploy (external to Vercel if no Vercel Cron):

```
POST https://marketplace-mvp-one.vercel.app/api/cron/orders-overdue
Header: x-cron-secret: $CRON_SECRET
Interval: every 15–60 min
```

- [ ] First manual curl returns `200` + `{ ok: true, ... }`
- [ ] Unauthorized without secret returns `401`

---

## Phase 6 — Smoke test

Run [POST_DEPLOY_SMOKE.md](./POST_DEPLOY_SMOKE.md) — all critical paths.

- [ ] Smoke PASS
- [ ] No spike in error logs first 15 min

---

## Phase 7 — Monitoring

- [ ] `/api/health` returns full checks JSON
- [ ] Log drain connected (Vercel → observability)
- [ ] Sentry wizard run within 24h (recommended)
- [ ] Alert on health 503

---

## Phase 8 — GO sign-off

| Check | Owner | OK |
|-------|-------|-----|
| Backup verified | Ops | ☐ |
| Env complete | Eng | ☐ |
| Migrations applied | Eng | ☐ |
| Deploy green | Eng | ☐ |
| Smoke green | QA | ☐ |
| Monitoring live | Ops | ☐ |
| Product GO | Product | ☐ |

**STOP** after sign-off. Monitor 24h before announcing.

---

## Rollback trigger

Rollback immediately if:

- `/api/health` 503 > 5 min
- Auth broken (cannot sign in)
- Checkout creates orders with wrong amounts
- Migration corruption suspected

→ [ROLLBACK.md](./ROLLBACK.md)
