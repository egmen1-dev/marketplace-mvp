# Production Checklist — RC1 (GO)

Mark each area **READY**, **WARNING**, or **BLOCKED** before Vercel GO.

**Decision matrix:** [GO_NO_GO_MATRIX.md](./GO_NO_GO_MATRIX.md)  
**Deploy steps:** [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

| Area | Status | Notes |
|------|--------|-------|
| **Database** | READY | 19 migrations; migrate deploy on GO |
| **Environment** | WARNING | Vercel prod needs CRON_SECRET + AUTH_URL + Blob flags |
| **Uploads** | READY | Blob token present on Vercel |
| **Search** | READY | Stemming, filters, suggest |
| **OMS** | READY | Staging verified; cron on GO |
| **Pickup** | READY | Coordinator + admin |
| **Reviews** | BLOCKED | RC2 — out of scope |
| **Trust** | WARNING | Admin moderation; no auto-risk |
| **Ranking** | WARNING | Views/favorites/recency |
| **Cron** | WARNING | Secret missing on Vercel prod — add on GO |
| **Railway** | READY | Staging @ `edf9751` |
| **Vercel** | WARNING | Deploy stale (Aug 8); env incomplete |
| **Blob** | READY | Shared Vercel Blob store |
| **Monitoring** | WARNING | Health ✅; Sentry prepared not active |
| **Logging** | WARNING | JSON on critical paths |
| **Security** | READY | IDOR, roles, cron auth |
| **Backups** | WARNING | Checklist ready; manual snapshot on GO |
| **Rollback** | READY | ROLLBACK.md + emergency steps |
| **Hydration** | WARNING | No allowlist; monitor post-GO |

---

## Pre-GO gates (all must PASS)

- [ ] [PRODUCTION_BACKUP_CHECKLIST.md](./PRODUCTION_BACKUP_CHECKLIST.md) complete
- [ ] [PRODUCTION_ENV_AUDIT.md](./PRODUCTION_ENV_AUDIT.md) vars added to Vercel
- [ ] `npx prisma migrate deploy` on production DB (dry-run reviewed)
- [ ] `npx prisma validate` + `npm run build` on `main`
- [ ] `npm run test` → 117/117
- [ ] [GO_NO_GO_MATRIX.md](./GO_NO_GO_MATRIX.md) — no BLOCKED (except Reviews = excluded)
- [ ] Owner GO sign-off

---

## Post-GO smoke

→ [POST_DEPLOY_SMOKE.md](./POST_DEPLOY_SMOKE.md)

---

## Sign-off

| Role | Name | Date | GO / NO-GO |
|------|------|------|------------|
| Engineering | | | |
| Product | | | |
| Ops | | | |

**Recommendation:** **CONDITIONAL GO** — execute [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) on owner approval.
