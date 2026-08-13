# Production Backup Checklist — GO Day

Execute **before** first production deploy (Vercel or Railway production cutover).  
**RELEASE-HARDENING-001:** Railway staging uses the same DB discipline before promoting traffic.

---

## Railway staging (pre-traffic / pre-release)

- [ ] Record staging commit: `curl -sS …/api/version | jq .commit`
- [ ] `GET /api/health` → `ok: true`, `checks.database.ok: true`
- [ ] `railway run --service web-v2 -- npx prisma migrate status` → no pending migrations
- [ ] Manual Postgres snapshot in Railway dashboard (Postgres service → Backup / snapshot)
- [ ] Snapshot label: `pre-release-YYYY-MM-DD`
- [ ] Document snapshot ID: ________________
- [ ] Rollback: redeploy previous successful deployment ID (see [ROLLBACK.md](./ROLLBACK.md))

---

## T-minus 24 hours (production)

- [ ] Confirm production `DATABASE_URL` provider (Neon / Prisma / etc.)
- [ ] Enable or verify **automated backups** on DB provider dashboard
- [ ] Document backup retention period: ______ days
- [ ] Assign **backup owner**: ________________
- [ ] Assign **rollback decision owner**: ________________

---

## T-minus 1 hour (mandatory)

### Database

- [ ] Create **manual snapshot** labeled `pre-rc1-YYYY-MM-DD-HHMM`
- [ ] Record snapshot ID / URL: ________________
- [ ] Optional: `pg_dump` to secure storage:

```bash
pg_dump "$PRODUCTION_DATABASE_URL" -Fc -f "backup-pre-rc1-$(date +%Y%m%d-%H%M).dump"
```

- [ ] Verify dump file size > 0
- [ ] Store dump in encrypted location (not git)

### Blob (Vercel Blob)

- [ ] Confirm `BLOB_READ_WRITE_TOKEN` is the production store
- [ ] **Do not** delete or rotate token during deploy
- [ ] Note: DB restore does not restore deleted blobs — avoid mass delete during deploy window

### Code & config

- [ ] Record deploy commit SHA: ________________
- [ ] Export Vercel Production env var **names** (not values) screenshot
- [ ] Tag git: `git tag rc1-pre-deploy-YYYY-MM-DD <sha>`

---

## Rollback order (if deploy fails)

1. **Promote previous Vercel deployment** (fastest — see ROLLBACK.md)
2. If migration broke schema: **stop traffic**, restore DB snapshot
3. If cron misbehaves: disable `CRON_SECRET` or unschedule cron job
4. Post-mortem before retry

---

## Migration rollback

| Migration type | Rollback |
|----------------|----------|
| Additive (RC1 OMS columns/tables) | App rollback usually sufficient |
| Destructive | **DB restore required** — do not run down migrations in prod |

RC1 migrations are **additive** (`20260811200000`, `20260811210000`).

---

## Post-deploy verification

- [ ] `/api/health` → `ok: true`, `checks.database.ok: true`
- [ ] Spot-check 3 random products still have images (Blob)
- [ ] Demo login works (`buyer@demo.lot` only if seed exists on prod)

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Engineering | | | |
| Ops | | | |

See also: [BACKUP_STRATEGY.md](./BACKUP_STRATEGY.md), [ROLLBACK.md](./ROLLBACK.md)
