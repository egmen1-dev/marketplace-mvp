# Backup Strategy — Marketplace «ЛОТ» RC1

**Scope:** PostgreSQL (Railway staging + Vercel production), Vercel Blob assets.  
**Policy:** Back up **before** every production migration deploy.

---

## 1. What is backed up

| Asset | Location | Backup method |
|-------|----------|---------------|
| **PostgreSQL** | Railway Postgres (staging) / Vercel-linked Postgres (prod) | Provider snapshot or `pg_dump` |
| **Blob images** | Vercel Blob store | Provider retention; not in DB dump |
| **Code** | GitHub `main` | Git history; tagged releases recommended |
| **Env secrets** | Railway / Vercel dashboards | Manual export to secure vault (1Password etc.) — **never commit** |

---

## 2. Railway staging (marketplace-mvp-backup)

### Automated

- Railway Postgres may offer **point-in-time / daily backups** depending on plan — check Railway Dashboard → Postgres service → Backups.

### Manual (before risky migration)

```bash
# Via public TCP proxy URL from Railway (not internal URL)
pg_dump "$RAILWAY_DATABASE_URL" -Fc -f "backup-staging-$(date +%Y%m%d-%H%M).dump"
```

### Restore (staging only)

```bash
pg_restore -d "$RAILWAY_DATABASE_URL" --clean --if-exists backup-staging-YYYYMMDD.dump
```

**Warning:** `--clean` drops objects — use only on staging or empty DB.

---

## 3. Vercel production

### Before GO deploy

1. **Neon / Prisma / provider snapshot** — create manual snapshot in DB dashboard.
2. Or `pg_dump` using production `DATABASE_URL` from Vercel env (run from secure CI or local with VPN).

### Blob

- Images remain in Vercel Blob after DB restore.
- `ProductImage.url` / `pathname` must stay consistent — do not wipe Blob store during rollback.

---

## 4. What is NOT backed up automatically

- In-memory event bus side effects (chat already persisted in DB).
- Railway/Vercel build artifacts (rebuilt from git).
- E2E fixture data on staging (ephemeral; re-seed with `npm run db:seed`).

---

## 5. Recovery scenarios

| Scenario | Recovery |
|----------|----------|
| Bad app deploy | Promote previous Vercel deployment — see [ROLLBACK.md](./ROLLBACK.md) |
| Bad migration (additive) | Roll back app; new columns harmless |
| Bad migration (destructive) | Restore DB snapshot + roll back app |
| Accidental data delete | Restore snapshot; may lose posts-snapshot data |
| Blob token leak | Rotate `BLOB_READ_WRITE_TOKEN` in Vercel; old URLs may break until cache clears |

---

## 6. RPO / RTO (MVP targets)

| Metric | Target | Notes |
|--------|--------|-------|
| **RPO** (max data loss) | 24h | Without paid PITR; improve with Neon PITR on prod |
| **RTO** (time to restore) | 1–4h | Depends on snapshot size + operator availability |

---

## 7. Who runs backups

| Action | Owner |
|--------|-------|
| Pre-prod snapshot | Engineering lead before GO |
| Verify backup restorable | Engineering (quarterly drill on staging) |
| Blob token rotation | Ops + Engineering |
| Document incident | On-call / project owner |

---

## 8. Limitations

- No cross-region replica documented for MVP.
- Railway free/low tiers may lack long retention — verify plan.
- Reviews/OMS data in same DB — single restore point covers all.

---

## 9. Checklist before Vercel GO

- [ ] Production DB snapshot taken and labeled `pre-rc1-YYYY-MM-DD`
- [ ] Snapshot restore tested on staging clone (optional but recommended)
- [ ] `DATABASE_URL` backup stored in secure vault
- [ ] Rollback doc reviewed by ops
- [ ] On-call knows Railway vs Vercel rollback steps
