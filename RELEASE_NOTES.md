# Лот — Release Candidate Notes

**Product:** Marketplace Лот  
**Status:** Release Candidate (client handoff)  
**Production:** https://marketplace-mvp-one.vercel.app  
**Stack:** Next.js 15 (App Router), TypeScript, Tailwind, Prisma/PostgreSQL, Auth.js, Stripe (optional), CDEK (mock/real), Vercel

---

## What’s included

### Buyer
- Homepage with search, categories, popular products
- Catalog with filters (category, price, seller, stock) and sorting
- Search with suggestions (products + categories)
- Category pages (`/category/[slug]`)
- Product page: gallery, buy / add to cart, seller trust, specs, delivery, similar products
- Cart (guest + authenticated merge)
- Checkout with CDEK quote (pickup / courier)
- Orders, favorites, viewing history, profile/settings
- Light / dark theme (default light)

### Seller
- Onboarding via `/sell` and sign-up as seller
- Cabinet: dashboard, products, create/edit/archive, orders, settings
- Public storefront `/seller/[id]`
- Image upload when Blob storage is configured

### Admin
- Dashboard, users, sellers, products moderation, categories, orders
- Role-gated (`ADMIN` only)

### Platform
- Auth (email/password), roles BUYER / SELLER / ADMIN
- SEO: metadata, `robots.ts`, `sitemap.ts`
- Health: `/api/health`

---

## User roles

| Role | Access |
|------|--------|
| **BUYER** | Catalog, cart, checkout, orders, favorites, profile |
| **SELLER** | Seller cabinet + public store; cannot open `/admin` |
| **ADMIN** | `/admin/*`; cannot use seller cabinet as seller unless also seller |

Unauthenticated users can browse catalog and use guest cart; checkout/orders/favorites/seller/admin require sign-in (redirect to `/auth/sign-in`).

---

## QA seed accounts

Use only in non-production or shared demo DB. Password for all: `demo1234`

| Email | Role |
|-------|------|
| `buyer@demo.lot` | BUYER |
| `seller@demo.lot` | SELLER (store **RAIZZ**) |
| `private@demo.lot` | SELLER (**Дом и техника**) |
| `toolspro@demo.lot` | SELLER (**Инструменты PRO**) |
| `techstore@demo.lot` | SELLER (**Tech Store**) |
| `admin@demo.lot` | ADMIN |

Re-seed: `npx tsx prisma/seed.ts` (requires `DATABASE_URL`).

---

## Known limitations

1. **Stripe** — Optional. If `STRIPE_SECRET_KEY` / publishable key / webhook secret are unset, checkout payment step will not complete a real charge.
2. **Vercel Blob** — Optional. Without `BLOB_READ_WRITE_TOKEN`, image upload returns a user-friendly “temporarily unavailable” message; products can still be published without photos.
3. **CDEK** — Without CDEK credentials the app uses a deterministic mock for PVZ/quotes (fine for demos).
4. **Reviews / ratings** — Not implemented; seller trust shows only real metrics (products, completed orders) when counts &gt; 0.
5. **Seller analytics** — Summary lives on the dashboard; advanced charts are not shipped.
6. **Legal pages** — Concise MVP summaries (privacy/terms); replace with counsel-approved text before a public commercial launch.
7. **Email/password change** — Profile edit covers name/phone/city/avatar; dedicated email/password change UI is not included.

---

## Environment (production checklist)

Required:

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL` (canonical public URL, e.g. `https://marketplace-mvp-one.vercel.app`)

Recommended for full demo of payments & uploads:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `BLOB_READ_WRITE_TOKEN`

Optional delivery:

- `CDEK_CLIENT_ID`, `CDEK_CLIENT_SECRET`, `CDEK_API_URL`, `CDEK_FROM_CITY_CODE`

See `.env.example` for local setup.

---

## Local run

```bash
npm install
cp .env.example .env   # fill DATABASE_URL + AUTH_SECRET
npx prisma generate
npx prisma migrate deploy   # or migrate dev
npx tsx prisma/seed.ts      # optional demo catalog
npm run dev
```

Open http://localhost:3000

### Quality gates

```bash
npx tsc --noEmit
npm run lint
npm run build
npm run test          # unit (vitest)
npx playwright test   # e2e (needs DB + env)
```

### Production deploy

```bash
npx vercel deploy --prod
```

---

## Smoke checklist (production)

- [ ] `/` homepage loads, brand **Лот** visible
- [ ] `/catalog` lists products; search + filters work
- [ ] `/category/tools` (or any seeded slug) loads
- [ ] `/product/[id]` shows buy / cart / seller block
- [ ] `/cart` works for guest
- [ ] `/checkout` redirects to sign-in when logged out
- [ ] Buyer: favorites + orders after sign-in
- [ ] Seller: `/seller/dashboard` + create product
- [ ] Admin: `/admin` only for `admin@demo.lot`
- [ ] `/api/health` → `{ "ok": true }`

---

## Release notes history (recent)

- Theme default light; expanded demo catalog & sellers
- Catalog search stemming, filters URL persistence, empty states
- PDP conversion: sticky mobile CTA, gallery zoom, similar by price
- Client-facing copy cleanup (no ops/env leaks in UI)
