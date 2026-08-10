# Staging vs Production environments

| | **Production** | **Staging** |
|--|----------------|-------------|
| Host | **Vercel** | **Railway** |
| URL | https://marketplace-mvp-one.vercel.app (canonical may vary) | https://web-production-e56fb.up.railway.app |
| App process | Vercel serverless / Next runtime | Long-lived `next start` (Node 20) |
| Database | Vercel-linked Postgres (e.g. Prisma Cloud / Neon) | Railway Postgres (`DATABASE_URL` → `Postgres` service) |
| Migrations | Vercel build / release hooks | `npx prisma migrate deploy` on container start |
| Storage | Vercel Blob (OIDC on Vercel + `BLOB_READ_WRITE_TOKEN` for client uploads) | Same Blob store via **`BLOB_READ_WRITE_TOKEN`** (required off-Vercel) |
| Payments / CDEK | Optional Stripe + CDEK | Optional (usually unset on staging) |

## Environment variables

### Shared / required

| Variable | Production | Staging |
|----------|------------|---------|
| `DATABASE_URL` | Vercel project env | Railway `web` ← `${{Postgres.DATABASE_URL}}` |
| `AUTH_SECRET` | Vercel | Railway (can differ from prod) |
| `NEXT_PUBLIC_APP_URL` | Production origin | `https://web-production-e56fb.up.railway.app` |
| `AUTH_URL` | Same as app URL | Same as staging URL |

### Storage

| Variable | Notes |
|----------|--------|
| `BLOB_READ_WRITE_TOKEN` | Static RW token — **required on Railway** for uploads + `/api/media` proxy |
| `BLOB_STORE_ID` | Optional metadata (`store_…`) |
| `BLOB_ACCESS` | `private` (default) — matches current Blob store; set `public` only if store is public |
| `NEXT_PUBLIC_BLOB_ACCESS` | Client upload access; use `private` on staging/production with this store |
| `STORAGE_PROVIDER` | `vercel-blob` |

Private Blob objects are displayed via `/api/media?url=…` (see `resolvePublicImageUrl`).

### Optional

`STRIPE_*`, `CDEK_*` — leave empty on staging unless testing payments/delivery.

## Deployment flow

### Production (Vercel)

1. Push / deploy to the Vercel project (unchanged).
2. Env managed in Vercel Dashboard.
3. Blob connected to the project (OIDC at runtime + RW token for `handleUpload`).

### Staging (Railway)

1. Link CLI: `railway link` → project `marketplace-mvp-backup`.
2. Deploy: `railway up --service web`.
3. Start command: `npx prisma migrate deploy && npm run start`.
4. Seed once (TCP proxy or one-off): `npm run db:seed` against staging DB.
5. After env changes that affect build (`NEXT_PUBLIC_*`), redeploy.

See also [BACKUP_DEPLOYMENT.md](./BACKUP_DEPLOYMENT.md).
