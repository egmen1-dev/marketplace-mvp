# Production Checklist — RC1

Mark each area **READY**, **PARTIAL**, or **BLOCKED** before Vercel GO.

| Area | Status | Notes |
|------|--------|-------|
| **Database** | READY | 19 migrations; `prisma validate` PASS; additive OMS schema |
| **Uploads** | READY | Blob client-direct; 503 without token; `/api/media` proxy |
| **Search** | READY | Stemming, filters, suggest; DB-backed only |
| **OMS** | READY | Delivery/pickup/overdue/cron; Railway verified |
| **Reviews** | BLOCKED | Not implemented; eligibility scaffold only |
| **Trust** | PARTIAL | Seller badges + admin block/verify; no auto risk |
| **Ranking** | PARTIAL | Views/favorites/recency; no review/conversion signals |
| **Cron** | READY | `CRON_SECRET` on Railway; endpoint 200 |
| **Railway** | READY | Deploy `10de465`; health 200; migrations on start |
| **Vercel** | PARTIAL | Unchanged in RC1; awaiting explicit GO + env audit |
| **Blob** | READY | Token on Railway; private access + media proxy |
| **Monitoring** | WARNING | Structured logs + process hooks; Sentry not wired — connect on GO |
| **Logging** | WARNING | JSON `lib/logger` on critical paths; many routes still `console.error` |
| **Security** | READY | IDOR tests, role gates, cron secret, chat hardening |
| **Backups** | WARNING | Strategy documented; automated PITR depends on provider plan |
| **Rollback** | READY | [ROLLBACK.md](./ROLLBACK.md) + emergency steps |

---

## Pre-GO gates (all must PASS)

- [ ] `npx prisma validate`
- [ ] `npx tsc --noEmit`
- [ ] `eslint .`
- [ ] `npm run build`
- [ ] `npm run test` → 117/117
- [ ] Playwright local `--retries=0` × 3 green
- [ ] Railway full acceptance green
- [ ] Production DB backup taken — see [BACKUP_STRATEGY.md](./BACKUP_STRATEGY.md)
- [ ] `SENTRY_DSN` planned (optional at GO, recommended within 24h)
- [ ] `CRON_SECRET` set on Vercel (if using overdue cron)
- [ ] `NEXT_PUBLIC_APP_URL` matches canonical production origin
- [ ] Stripe webhook URL updated (if payments enabled)
- [ ] Smoke checklist in `RELEASE_RC1.md` executed on staging

---

## Post-GO smoke (first 30 min)

- [ ] `/` — homepage, light theme default
- [ ] `/catalog` — products, search, no console #418
- [ ] Buyer: cart → checkout → order created
- [ ] Seller: confirm order → OMS transition
- [ ] Admin: `/admin/orders` loads, overdue filter
- [ ] `/api/health` → 200 with `checks.database.ok: true`
- [ ] Connect log drain / Sentry before or immediately after GO
- [ ] Upload test image on seller product form
- [ ] Chat: buyer message → seller reply

---

## Sign-off

| Role | Name | Date | GO / NO-GO |
|------|------|------|------------|
| Engineering | | | |
| Product | | | |
| Ops | | | |

**RC1 recommendation:** **CONDITIONAL GO** — ship platform except Reviews; monitor hydration; schedule Reviews as RC2.
