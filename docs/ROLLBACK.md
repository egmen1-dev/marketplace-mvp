# Rollback Plan — Marketplace «ЛОТ» RC1

This document describes how to quickly revert a bad deployment **without** data loss where possible.

**Scope:** Vercel production + Railway staging. RC1 preparation did **not** change Vercel production.

---

## 1. Application rollback (fastest)

### Vercel production

1. Open Vercel Dashboard → project → **Deployments**.
2. Find the last known-good deployment (green, pre-RC1).
3. Click **⋯ → Promote to Production**.
4. Verify:
   - `GET /api/health` → `{ "ok": true }`
   - Homepage, catalog, sign-in load
   - No spike in error logs

**Time:** ~2–5 minutes. No git revert required.

### Railway staging

```bash
railway link   # marketplace-mvp-backup / web
# Redeploy previous commit via Dashboard, or:
git checkout <previous-sha>
railway up --service web
```

Or: Railway Dashboard → Deployments → rollback to previous image.

**Time:** ~5–10 minutes (includes build).

---

## 2. Database migrations

### Before any production deploy

1. **Backup** production Postgres (Vercel/Neon/Prisma dashboard snapshot or `pg_dump`).
2. Review pending migrations: `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-migrations prisma/migrations`.
3. Apply on staging first; run smoke + Playwright.

### If a migration causes issues

Prisma migrations in this project are **forward-only**. Preferred recovery:

1. **Rollback app** to pre-migration deployment (§1) — old code may still run against new schema if changes are additive.
2. If migration is **destructive** or breaks old code:
   - Restore DB from backup (see §3).
   - Do **not** run `prisma migrate reset` on production.

### Manual down-migration (last resort)

Only if backup restore is impossible and a specific migration must be reversed:

1. Identify the failing migration in `prisma/migrations/`.
2. Write a one-off SQL script reversing DDL (drop column/table, restore enum values).
3. Run against DB with DBA review.
4. Mark migration as rolled back in `_prisma_migrations` **only** with explicit ops approval.

**RC1 OMS migrations (additive):**
- `20260811200000_order_lifecycle_oms`
- `20260811210000_oms_overdue_fields`

These add tables/columns — old app versions ignore new fields; app rollback alone is usually sufficient.

---

## 3. Database restore

### Vercel-linked Postgres

1. Use provider dashboard (Neon / Prisma / etc.) → **Restore snapshot** to a new branch or point-in-time.
2. Update `DATABASE_URL` in Vercel to restored instance **only** after validation.
3. Redeploy app.

### Railway Postgres

1. Railway Dashboard → Postgres service → **Backups** (if enabled) or manual snapshot.
2. Restore to new service or overwrite (destructive).
3. Update `DATABASE_URL` on `web` service.
4. Redeploy.

### Manual pg_dump restore

```bash
pg_dump "$DATABASE_URL" -Fc -f backup-$(date +%Y%m%d).dump   # before deploy
pg_restore -d "$DATABASE_URL" --clean --if-exists backup-YYYYMMDD.dump
```

---

## 4. Blob / uploads

- Images live in **Vercel Blob** (shared across Vercel + Railway).
- Rollback **does not** delete uploaded blobs.
- If a bad deploy wrote corrupt metadata in `ProductImage`, fix via admin product moderation or DB patch — do not wipe the Blob store.

---

## 5. Environment / secrets

| Action | Rollback |
|--------|----------|
| Wrong `AUTH_SECRET` | Revert env var → redeploy (invalidates all sessions) |
| Wrong `NEXT_PUBLIC_APP_URL` | Fix origin → redeploy (cookie/CORS issues) |
| `CRON_SECRET` leaked | Rotate secret on host + update cron job |
| Stripe webhook URL | Revert webhook endpoint in Stripe Dashboard |

---

## 6. Cron / OMS overdue

If overdue processor causes issues:

1. Remove or rotate `CRON_SECRET` to block `/api/cron/orders-overdue`.
2. Roll back app to version without processor (pre-`10de465`).
3. Overdue flags in DB are harmless (`isOverdue` boolean); no urgent data fix.

---

## 7. Communication checklist

After rollback:

- [ ] Confirm `/api/health` on affected host(s)
- [ ] Smoke buyer checkout + seller order confirm
- [ ] Check error monitoring (if configured)
- [ ] Document incident: commit SHA, migration ID, restore point
- [ ] Post-mortem before re-attempting RC1 deploy

---

## 8. Contacts & references

- Staging URL: https://web-production-e56fb.up.railway.app
- Production URL: https://marketplace-mvp-one.vercel.app
- Deploy configs: `railway.toml`, `docs/BACKUP_DEPLOYMENT.md`
- Release notes: `docs/RELEASE_RC1.md`
