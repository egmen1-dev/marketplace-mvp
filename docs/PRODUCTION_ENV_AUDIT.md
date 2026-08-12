# Production Environment Audit — RELEASE-004

**Audit date:** 2026-08-12  
**Code baseline:** `edf9751` (main)  
**Vercel production:** https://marketplace-mvp-one.vercel.app — **NOT modified during this audit**  
**Railway staging:** https://web-production-e56fb.up.railway.app

---

## 1. Environment variable matrix

| Variable | Tier | Used for | Railway staging | Vercel production | GO action |
|----------|------|----------|-----------------|-------------------|-----------|
| `DATABASE_URL` | **Required** | Prisma / Postgres | ✅ Set | ✅ Set | Verify pooled URL on GO |
| `AUTH_SECRET` | **Required** | Auth.js sessions | ✅ Set | ✅ Set | Rotate only if compromised |
| `NEXT_PUBLIC_APP_URL` | **Required** | Canonical origin, cookies | ✅ Railway URL | ✅ prod URL | Must match live domain exactly |
| `AUTH_URL` | Recommended | Auth redirects | ✅ Set | ⚠️ **Missing** | Set = same as `NEXT_PUBLIC_APP_URL` |
| `NEXTAUTH_URL` | Legacy alias | Fallback in `getCanonicalAppUrl` | — | ⚠️ Missing | Optional if `AUTH_URL` set |
| `NODE_ENV` | Auto | `production` on hosts | Auto | Auto | Do not override |
| `BLOB_READ_WRITE_TOKEN` | **Required** (uploads) | Vercel Blob RW | ✅ Set | ✅ Set | Shared store OK |
| `BLOB_ACCESS` | Recommended | private/public | ✅ `private` | ⚠️ **Missing** | Set `private` |
| `NEXT_PUBLIC_BLOB_ACCESS` | Recommended | Client upload mode | ✅ `private` | ⚠️ **Missing** | Set `private` |
| `STORAGE_PROVIDER` | Optional | Default `vercel-blob` | — | — | Default OK |
| `CRON_SECRET` | **Required** (OMS overdue) | `/api/cron/orders-overdue` | ✅ Set | ❌ **Missing** | **Add before GO** + schedule cron |
| `STRIPE_SECRET_KEY` | Optional | Real payments | — | — | Add if payments enabled |
| `STRIPE_WEBHOOK_SECRET` | Optional | Webhook verify | — | — | Add + update Stripe dashboard URL |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional | Client Stripe | — | — | Pair with secret key |
| `CDEK_CLIENT_ID` | Optional | Real CDEK | — | — | Empty = mock delivery |
| `CDEK_CLIENT_SECRET` | Optional | Real CDEK | — | — | — |
| `CDEK_API_URL` | Optional | CDEK API | — | — | Default edu API |
| `CDEK_FROM_CITY_CODE` | Optional | Warehouse city | — | — | e.g. `44` Moscow |
| `SENTRY_DSN` | Recommended | Server errors | — | — | Add within 24h of GO |
| `NEXT_PUBLIC_SENTRY_DSN` | Recommended | Client / hydration | — | — | After `@sentry/nextjs` wizard |
| `SENTRY_ENVIRONMENT` | Recommended | `production` | — | — | — |
| `E2E_FIXTURE_SECRET` | Staging only | E2E fixtures | ✅ Set | ❌ **Must NOT set** | Never on production |
| `TAXONOMY_SYNC_SECRET` | Optional | `/api/taxonomy/sync` | — | — | Or reuse `CRON_SECRET` |

---

## 2. Conflicts & hygiene

| Issue | Severity | Resolution |
|-------|----------|------------|
| Vercel prod **4 env vars only** vs RC1 needs `CRON_SECRET` | **HIGH** | Add vars before deploy |
| `localhost` vs `127.0.0.1` in URLs | Medium | Use one host consistently |
| `.env.production.local` (local) vs `.env` | Dev only | Playwright overrides via config |
| `E2E_FIXTURE_SECRET` on Railway | OK staging | Do not copy to Vercel |
| Shared Blob token Railway + Vercel | OK | Same store by design |

**No obsolete env vars detected** in Vercel (minimal set).

---

## 3. Vercel project audit (read-only)

| Setting | Value |
|---------|--------|
| Project | `marketplace-mvp` (team `raizz`) |
| Production URL | https://marketplace-mvp-one.vercel.app |
| Node version | **24.x** (Vercel dashboard) |
| Region | **iad1** (US East) |
| Last production deploy | **2026-08-08** — ⚠️ **pre-RC1 / pre-OMS** |
| Build | Next.js serverless (default `@vercel/next`) |
| Output | Lambda routes (~10MB bundles) |
| Blob | Integrated (`BLOB_READ_WRITE_TOKEN` present) |

**Critical:** Production deployment is **~4 days behind** `main` (`edf9751`). GO requires **new deploy**, not promote old build.

### Recommended Vercel build settings (defaults OK)

| Setting | Expected |
|---------|----------|
| Install | `npm ci` (default) |
| Build | `npm run build` (runs `prisma generate` via postinstall) |
| Output | Next.js App Router |
| Migrations | Run via build command or post-deploy: `npx prisma migrate deploy` |

**Note:** Vercel does not run `prisma migrate deploy` automatically unless added to build script. **Add to GO checklist:**

```json
"build": "prisma migrate deploy && next build"
```

Or run migration as one-off before/after deploy (see DEPLOYMENT_CHECKLIST.md).

---

## 4. Railway staging (reference)

| Setting | Value |
|---------|--------|
| Node | 20 (`NIXPACKS_NODE_VERSION`) |
| Start | `npx prisma migrate deploy && npm run start` |
| Health | `/api/health` |
| Migrations | Auto on start ✅ |

---

## 5. Pre-GO env checklist

- [ ] Snapshot production DB
- [ ] Add `CRON_SECRET` to Vercel Production
- [ ] Set `AUTH_URL` = production origin
- [ ] Set `BLOB_ACCESS=private`, `NEXT_PUBLIC_BLOB_ACCESS=private`
- [ ] Confirm `NEXT_PUBLIC_APP_URL` = https://marketplace-mvp-one.vercel.app (or canonical)
- [ ] Schedule external cron → `POST /api/cron/orders-overdue` (Vercel Cron or cron-job.org)
- [ ] Optional: Stripe, CDEK, Sentry
- [ ] Confirm **no** `E2E_FIXTURE_SECRET` on Vercel Production
- [ ] Run `npx prisma migrate deploy` against production DB before traffic
