# Post-Deploy Smoke Test — Production

Run within **30 minutes** of production deploy. Tester: ________________  
URL: https://marketplace-mvp-one.vercel.app  
Date: ________________

---

## 0. Infrastructure (2 min)

| # | Step | Expected | OK |
|---|------|----------|-----|
| 0.1 | `GET /api/health` | `ok: true`, `checks.database.ok: true` | ☐ |
| 0.2 | `GET /robots.txt` | 200 | ☐ |
| 0.3 | `GET /sitemap.xml` | 200, contains URLs | ☐ |
| 0.4 | Cron (manual) | `POST /api/cron/orders-overdue` + secret → 200 | ☐ |

---

## 1. Guest (5 min)

| # | Step | Expected | OK |
|---|------|----------|-----|
| 1.1 | Open `/` | Homepage loads, light theme | ☐ |
| 1.2 | Open `/catalog` | Products visible, no console #418 | ☐ |
| 1.3 | Search «дрель» | Results with count | ☐ |
| 1.4 | Open first PDP | Title, price, buy button | ☐ |
| 1.5 | Add to cart | Cart badge updates | ☐ |
| 1.6 | `/checkout` logged out | Redirect to sign-in | ☐ |

---

## 2. Buyer — `buyer@demo.lot` / `demo1234` (10 min)

| # | Step | Expected | OK |
|---|------|----------|-----|
| 2.1 | Sign in | Redirect from `/auth/sign-in` | ☐ |
| 2.2 | `/account/orders` | Orders list or empty state | ☐ |
| 2.3 | `/account/favorites` | Page loads, no #418 | ☐ |
| 2.4 | `/account/messages` | Messages UI loads | ☐ |
| 2.5 | PDP → «Написать продавцу» | Conversation opens | ☐ |
| 2.6 | Checkout (delivery) | Form loads, prices stable | ☐ |

---

## 3. Seller — `seller@demo.lot` (10 min)

| # | Step | Expected | OK |
|---|------|----------|-----|
| 3.1 | `/account/sales` | OMS buckets visible | ☐ |
| 3.2 | `/account/products` | Product list | ☐ |
| 3.3 | Confirm/update order (if exists) | Transition succeeds | ☐ |
| 3.4 | Upload image on product edit | Success or clear 503 message | ☐ |
| 3.5 | `/account/pickup-points` | Pickup CRUD page | ☐ |

---

## 4. Admin — `admin@demo.lot` (5 min)

| # | Step | Expected | OK |
|---|------|----------|-----|
| 4.1 | `/admin` | Dashboard loads | ☐ |
| 4.2 | `/admin/orders` | List + overdue filter | ☐ |
| 4.3 | `/admin/users` | User list | ☐ |
| 4.4 | Buyer → `/admin` | Denied / redirect | ☐ |

---

## 5. Security spot-check (3 min)

| # | Step | Expected | OK |
|---|------|----------|-----|
| 5.1 | Cron without secret | 401 | ☐ |
| 5.2 | `/api/e2e/pickup-fixture` without secret | 401/404 | ☐ |
| 5.3 | `/admin` as guest | Redirect sign-in | ☐ |

---

## Result

| Outcome | |
|---------|---|
| **PASS** — all critical (sections 0–4) | ☐ |
| **FAIL** — rollback per ROLLBACK.md | ☐ |

Notes: _______________________________________________
