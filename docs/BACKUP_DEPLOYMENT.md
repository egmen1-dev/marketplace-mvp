# Backup deployment (Vercel alternative)

Primary production remains on **Vercel**. This document prepares a **fallback** host (Render / Railway preferred; Netlify with caveats) without changing the Vercel pipeline.

Stack target: **Next.js 15 App Router** — `npm run build` + `npm run start` (Node server). No Vercel-specific runtime APIs are required for the app to boot.

---

## Live backup (TASK 053)

| Field | Value |
|-------|--------|
| Platform | **Railway** |
| Project | `marketplace-mvp-backup` |
| Public URL | https://web-production-e56fb.up.railway.app |
| Database | Railway Postgres (private `DATABASE_URL` for web; TCP proxy used only for local seed) |
| Migrations | `prisma migrate deploy` on container start |
| Seed | Demo users/products seeded once via public TCP proxy |

Set `BLOB_READ_WRITE_TOKEN` in the Railway `web` service to enable image uploads (same Vercel Blob token as production). Until set, `/api/uploads` returns **503** with a friendly message.

---

## Local run

```bash
cp .env.example .env
# set DATABASE_URL, AUTH_SECRET, NEXT_PUBLIC_APP_URL=http://localhost:3000

npm install
npx prisma migrate deploy   # or: npx prisma migrate dev
npm run db:seed             # optional demo users
npm run build
npm run start               # http://localhost:3000
# or: npm run dev
```

Smoke paths after start:

| Path | Expect |
|------|--------|
| `/` | Home |
| `/catalog` | Catalog |
| `/product/[id]` | PDP (use an id from seed/catalog) |
| `/login` | Auth |
| `/account` | Cabinet (after sign-in) |
| `/admin` | Admin (demo admin after seed) |
| Product image upload | Needs `BLOB_READ_WRITE_TOKEN` (or shows 503 «временно недоступна») |

Health: `GET /api/health` → `{ ok: true }`.

---

## Production variables

### Required

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Canonical public origin, e.g. `https://your-app.onrender.com` |
| `AUTH_URL` | Optional; Auth.js — set to the same public origin if cookies/redirects misbehave |

`trustHost: true` is enabled in Auth.js; still set `NEXT_PUBLIC_APP_URL` / `AUTH_URL` explicitly on every host.

### Storage

| Variable | Notes |
|----------|--------|
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob RW token (works from any host — Blob is an HTTP API) |
| `STORAGE_PROVIDER` | Optional; default `vercel-blob`. Future: `s3` / `r2` / `supabase` |

**Alternatives (not implemented yet — interface only):**

| Option | When to use |
|--------|-------------|
| Keep **Vercel Blob** | Fastest backup: reuse the same token on Render/Railway |
| **S3-compatible** (AWS S3, MinIO) | Full vendor independence |
| **Cloudflare R2** | S3 API, no egress fees |
| **Supabase Storage** | If DB already on Supabase |

Code entry: `lib/storage` (`StorageProvider`: `upload` / `delete` / `getUrl` / `isOwnedUrl`). Client-direct upload still uses `@vercel/blob/client` today; swapping providers later means a new client path + server provider.

### Payment (Stripe, optional)

| Variable | Notes |
|----------|--------|
| `STRIPE_SECRET_KEY` | Server |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client (optional for redirect Checkout) |

Point Stripe webhook to `https://<backup-host>/api/webhooks/stripe`.

### Delivery (CDEK, optional)

| Variable | Notes |
|----------|--------|
| `CDEK_CLIENT_ID` | Empty → mock delivery |
| `CDEK_CLIENT_SECRET` | |
| `CDEK_API_URL` | Default edu API |
| `CDEK_FROM_CITY_CODE` | Warehouse city code |

### Platform-injected (optional fallbacks for canonical URL)

| Variable | Platform |
|----------|----------|
| `RENDER_EXTERNAL_URL` | Render |
| `RAILWAY_PUBLIC_DOMAIN` | Railway |
| `VERCEL_URL` / `VERCEL_PROJECT_PRODUCTION_URL` | Vercel |

App resolves origin via `getCanonicalAppUrl()` in `lib/env.ts` (explicit env first).

---

## Database setup

1. Provision managed PostgreSQL (Render Postgres, Railway Postgres, Neon, Supabase, etc.).
2. Set `DATABASE_URL` on the web service.
3. On deploy / first boot:

```bash
npx prisma migrate deploy
# optional: npm run db:seed
```

Do **not** migrate production Vercel DB unless you intentionally share one database between hosts.

Prisma `postinstall` runs `prisma generate` — keep that for all hosts.

---

## Storage setup

### Keep Vercel Blob (recommended for backup)

1. Vercel Dashboard → Storage → Blob → copy `BLOB_READ_WRITE_TOKEN`.
2. Paste the same token into the backup host env.
3. Ensure `next.config.ts` already allows `*.public.blob.vercel-storage.com` (done).

Uploads call Vercel Blob over the network; the app Node process does not need to run on Vercel.

### Future S3 / R2 / Supabase

1. Implement `createS3Storage()` (etc.) matching `StorageProvider`.
2. Register in `getStorage()` under `STORAGE_PROVIDER`.
3. Replace or branch `features/seller/lib/client-upload.ts` (today tied to `@vercel/blob/client`).
4. Add `images.remotePatterns` for the new CDN host in `next.config.ts`.

---

## Deployment on Render

Config reference: [`render.yaml`](../render.yaml).

1. Create a **Web Service** from this repo (or Blueprint with `render.yaml`).
2. Add a **PostgreSQL** instance; link `DATABASE_URL`.
3. Set env: `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` (Render URL), optional Blob/Stripe/CDEK.
4. Build: `npm ci && npx prisma generate && npm run build`
5. Start: `npx prisma migrate deploy && npm run start`
6. Health check: `/api/health`

Render runs a long-lived Node process — best match for App Router + middleware + Prisma.

---

## Deployment on Railway

Config reference: [`railway.toml`](../railway.toml).

1. New project → Deploy from GitHub.
2. Add PostgreSQL plugin; copy `DATABASE_URL`.
3. Variables: `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL=https://<railway-domain>`, Blob/Stripe as needed.
4. Railway uses Nixpacks; `railway.toml` sets build/start/healthcheck.
5. Generate domain → update `NEXT_PUBLIC_APP_URL` / Stripe webhook.

---

## Deployment on Netlify

Config reference: [`netlify.toml`](../netlify.toml).

**Status: possible but least preferred** for this app.

Constraints:

- Relies on `@netlify/plugin-nextjs` (OpenNext-style adapter).
- Serverless limits: request body size, duration — product uploads already prefer **client-direct Blob** to avoid large bodies.
- Middleware / Auth.js / Prisma need careful cold-start and connection pooling (`?connection_limit=1` or a pooler).
- Prefer Render/Railway for a faithful `next start` Node server.

Steps (if required):

```bash
npm install -D @netlify/plugin-nextjs
# set env in Netlify UI
# connect repo; build command from netlify.toml
```

---

## Limitations

| Topic | Detail |
|-------|--------|
| Vercel remains primary | Do not remove `@vercel/blob` or change the Vercel project for this task |
| Client upload SDK | Still `@vercel/blob/client` until an alternate client is written |
| Image optimization | `next/image` works on Node hosts; Netlify uses their image CDN via the plugin |
| No `vercel.json` | Redirects/rewrites live in Next / middleware — portable |
| Edge runtime | Upload + Prisma routes use `nodejs` — fine on Render/Railway |
| Shared DB | Optional; usually give the backup host its own Postgres |
| Cron / Blob store UI | Vercel dashboard features are Vercel-only; Blob HTTP API is not |

---

## Vercel coupling audit (summary)

| Dependency | Severity | Portable? |
|------------|----------|-----------|
| `@vercel/blob` + `BLOB_READ_WRITE_TOKEN` | Medium | Yes — use same token off-Vercel, or swap provider later |
| `@vercel/blob/client` in seller upload | Medium | Same |
| `lib/storage` abstraction | Low | Designed for swap |
| `VERCEL_*` in `getCanonicalAppUrl` | Low | Fallbacks only; prefer `NEXT_PUBLIC_APP_URL` |
| `process.env.VERCEL` in prod check | Low | Also treats Render/Railway markers |
| `next/image` remotePatterns for Blob host | Low | Host-agnostic config |
| Serverless 4.5MB body limit comments | N/A | Motivated client-direct upload; helps all serverless hosts |
| No `vercel.json` / Edge-only features | — | Good |

---

## Instruction cheat sheet

```bash
# Local production-like
npm run build && npm run start

# Quality gates
npx tsc --noEmit
npm run lint
npx playwright test
```

Backup host checklist:

1. Postgres + `prisma migrate deploy`
2. `AUTH_SECRET` + `NEXT_PUBLIC_APP_URL`
3. Optional: Blob token, Stripe (+ webhook URL), CDEK
4. Smoke `/`, `/catalog`, login, `/account`, upload
