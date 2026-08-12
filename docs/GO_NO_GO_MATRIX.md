# GO / NO-GO Matrix — RC1 Production

**Date:** 2026-08-12  
**Baseline commit:** `edf9751`  
**Decision:** ☐ GO  ☐ NO-GO  ☐ CONDITIONAL GO

---

| Category | Status | Evidence / blocker |
|----------|--------|-------------------|
| **Database** | **READY** | 19 migrations; local + staging up to date; additive OMS |
| **Environment** | **WARNING** | Vercel prod missing `CRON_SECRET`, `AUTH_URL`, Blob access flags |
| **Uploads / Blob** | **READY** | Token on Vercel + Railway; structured upload logs |
| **Security** | **READY** | IDOR unit tests; cron 401; role gates; chat hardened |
| **OMS** | **READY** | Staging verified; coordinator + overdue processor |
| **Pickup** | **READY** | Staging E2E; transactional coordinator |
| **Search / Taxonomy** | **READY** | Stemming, WB tree, unit tests |
| **Ranking** | **WARNING** | Views/favorites only; no review signals |
| **Trust / Risk** | **WARNING** | Admin moderation only; no auto-risk |
| **Reviews** | **BLOCKED** | Not in RC1 scope — explicit RC2 |
| **Performance** | **WARNING** | No formal load test; acceptable for MVP |
| **Monitoring** | **WARNING** | Structured logs + health; Sentry not wired |
| **Backup** | **WARNING** | Docs + checklist ready; manual snapshot required on GO day |
| **Rollback** | **READY** | ROLLBACK.md + emergency steps |
| **Hydration** | **WARNING** | No allowlist; intermittent #418 in long E2E |
| **Vercel deploy freshness** | **WARNING** | Last prod deploy **2026-08-08** — pre-OMS; **must redeploy** |
| **Playwright stability** | **WARNING** | h13: 67/67×3; recent runs 66/67 flake |

---

## Status legend

| Status | Meaning |
|--------|---------|
| **READY** | Safe to GO with standard checklist |
| **WARNING** | Acceptable risk — document + monitor |
| **BLOCKED** | Must not GO until resolved (or scope excluded) |

---

## Conditional GO criteria

GO is acceptable if **all** true:

1. Production DB snapshot taken ([PRODUCTION_BACKUP_CHECKLIST.md](./PRODUCTION_BACKUP_CHECKLIST.md))
2. Vercel env updated per [PRODUCTION_ENV_AUDIT.md](./PRODUCTION_ENV_AUDIT.md)
3. `prisma migrate deploy` run on production DB
4. Fresh Vercel deploy from `edf9751` or later
5. [POST_DEPLOY_SMOKE.md](./POST_DEPLOY_SMOKE.md) PASS
6. Cron scheduled with `CRON_SECRET`
7. Reviews explicitly deferred to RC2
8. Sentry planned within 24h post-GO

---

## NO-GO triggers

- Migration fails on production DB
- `/api/health` 503 after deploy
- Auth/session broken on production URL
- Missing `CRON_SECRET` with OMS overdue enabled
- No DB backup before first OMS migration on prod

---

## Sign-off

| Role | GO / NO-GO | Date | Notes |
|------|------------|------|-------|
| Engineering | | | |
| Product | | | |
| Ops | | | |
