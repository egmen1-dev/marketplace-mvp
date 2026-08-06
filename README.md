# Marketplace MVP

Современный каркас маркетплейса (как упрощённые Wildberries / Avito / Ozon).  
Auth, каталог, корзина, заказы, Stripe Checkout и доставка СДЭК (mock / real).

---

## Vision / Видение

B2C marketplace: покупатели ищут товары в каталоге, кладут в корзину, оформляют заказ; продавцы управляют витриной; платежи через Stripe; доставка через CDEK.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui |
| Backend | Next.js Server Actions + API routes (stubs) |
| DB | PostgreSQL + Prisma ORM |
| Deploy | Vercel |

---

## Architecture

```
app/                 # App Router: pages, layouts, API routes
components/          # Shared UI (layout + components/ui = shadcn)
features/            # Feature modules (actions / components / types stubs)
  auth/
  products/
  catalog/
  cart/
  orders/
  seller/
  payments/
lib/                 # prisma, utils, env, stripe, storage, delivery
prisma/              # schema.prisma
types/               # Shared TS types / re-exports from Prisma
```

- **Feature-based modules** — логика фичи живёт в `features/<name>/`, страницы в `app/` тонкие.
- **Shared UI** — `components/ui` (shadcn), layout в `components/layout`.
- **Prisma singleton** — `lib/prisma.ts` (защита от hot-reload дублей в Next.js).

---

## Getting started

### 1. Clone & install

```bash
cd marketplace-mvp
npm install
```

### 2. Environment

```bash
cp .env.example .env
# Отредактируйте DATABASE_URL под ваш PostgreSQL
```

### 3. Database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Dev server

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `NEXT_PUBLIC_APP_URL` | yes | Public app URL (e.g. `http://localhost:3000`) |
| `STRIPE_SECRET_KEY` | no* | Stripe secret key (`sk_test_…` / `sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | no* | Webhook signing secret (`whsec_…`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | no | Publishable key (optional for Checkout redirect flow) |
| `CDEK_CLIENT_ID` | no | CDEK API client id (empty → mock) |
| `CDEK_CLIENT_SECRET` | no | CDEK API secret (empty → mock) |
| `CDEK_API_URL` | no | CDEK API base URL (edu/prod) |
| `CDEK_FROM_CITY_CODE` | no | Warehouse city code for tariff calc |
| `AUTH_SECRET` | yes (auth) | Auth.js secret |
| `BLOB_READ_WRITE_TOKEN` | yes (uploads) | Vercel Blob read/write token |

---

## Product image uploads (Vercel Blob)

Seller product forms upload photos via `POST /api/uploads` → Vercel Blob (`products/<uuid>.ext`). URLs are stored in `ProductImage`.

**Limits:** max 10 images per product · 5 MB per file · JPEG / PNG / WebP / GIF.

### Enable Blob on Vercel

1. Open the project in [Vercel Dashboard](https://vercel.com/dashboard) → **Storage** → **Create** → **Blob**.
2. Connect the Blob store to this project (Production + Preview).
3. Vercel injects `BLOB_READ_WRITE_TOKEN` automatically for deployments.
4. For local dev, either:
   - `vercel link` then `vercel env pull`, or
   - copy the token from Storage → Blob → `.env.local` snippet into `.env`.

Without the token, the upload API returns **503** with a clear error — uploads are not faked as success.

Abstraction: `lib/storage` (Vercel Blob today; swap provider later if needed).

UI: `features/seller/components/product-image-uploader.tsx` (drag & drop, reorder, delete).

---

## Stripe payments (Checkout Sessions)

Cart → Checkout form → Order (`NEW`) → Stripe Checkout → webhook → Order (`PAID`).

**Currency:** amounts are sent as **RUB** (`currency: 'rub'`). Stripe expects the smallest unit — **kopecks**: `Math.round(price * 100)`.

Without `STRIPE_SECRET_KEY`, the app still builds and runs; checkout shows «Платежи не настроены» instead of crashing.

### Local webhook testing

```bash
# Terminal 1 — app
npm run dev

# Terminal 2 — forward Stripe events
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the printed whsec_… into STRIPE_WEBHOOK_SECRET
```

Test card: `4242 4242 4242 4242`, any future expiry, any CVC.

Demo buyer: `buyer@demo.lot` / `demo1234`.  
Demo admin: `admin@demo.lot` / `demo1234` (после seed) — панель `/admin`.

Webhook events handled: `checkout.session.completed`, `payment_intent.succeeded` (idempotent).

Key code: `lib/stripe.ts`, `features/payments/`, `app/api/webhooks/stripe/route.ts`.

---

## CDEK delivery

Checkout → choose **ПВЗ** or **Курьер** → quote (cost + ETA) → order total includes shipping → Stripe line item «Доставка».

**Mock vs real**

| Credentials | Behaviour |
|-------------|-----------|
| `CDEK_CLIENT_ID` + `CDEK_CLIENT_SECRET` empty | Deterministic mock PVZ + quotes (`lib/delivery/mock-cdek.ts`) |
| Both set | Real CDEK v2 client (`lib/delivery/real-cdek.ts`); **falls back to mock** on API/auth errors |

Factory: `lib/delivery/index.ts` → `getDeliveryProvider()`.

API: `GET /api/delivery/points?city=…`, `POST /api/delivery/quote`.

Schema: `Delivery` row per order (`method`, `cost`, `estimatedMinDays`/`MaxDays`, `pickupPointId`, `trackingNumber`, `status`, `provider=CDEK`).

To enable real CDEK: set credentials in `.env` (edu: `https://api.edu.cdek.ru/v2`), optionally `CDEK_FROM_CITY_CODE` (e.g. `44` for Moscow warehouse), restart the app.

---

## Planned modules

| Module | Path | Status |
|--------|------|--------|
| Auth | `features/auth` | done |
| Catalog | `features/catalog` | done |
| Products | `features/products` | done |
| Cart | `features/cart` | guest + auth |
| Orders + Stripe | `features/orders`, `features/payments` | Checkout Sessions |
| CDEK delivery | `lib/delivery` | mock + real stub |
| Seller | `features/seller` | done |

API: `GET /api/health`, `POST /api/webhooks/stripe`, `GET /api/delivery/points`, `POST /api/delivery/quote`.

---

## Scripts

```bash
npm run dev          # Next.js dev (Turbopack)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run format       # Prettier write
npm run db:generate  # prisma generate
npm run db:migrate   # prisma migrate dev
npm run db:studio    # Prisma Studio
```

---

## Prisma domain models

`User`, `SellerProfile`, `Category`, `Product`, `ProductImage`, `Cart`, `CartItem`, `Order`, `OrderItem`, `Payment`, `Address`, `Delivery`, `AdminActionLog`

Enums: `UserRole`, `ProductStatus`, `OrderStatus`, `PaymentStatus`, `DeliveryProvider`, `DeliveryMethod`, `DeliveryStatus`, `AddressType`

### Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Buyer | `buyer@demo.lot` | `demo1234` |
| Seller | `seller@demo.lot` | `demo1234` |
| Private seller | `private@demo.lot` | `demo1234` |
| Admin | `admin@demo.lot` | `demo1234` |

Admin panel: `/admin` (DB role `ADMIN` required). Create via seed or:

```bash
npx prisma db seed
# or promote manually in Prisma Studio / SQL:
# UPDATE users SET role = 'ADMIN' WHERE email = 'you@example.com';
```

---

## License

Private / MVP — all rights reserved.
