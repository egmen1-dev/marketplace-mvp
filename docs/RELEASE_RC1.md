# RELEASE RC1 — Marketplace «ЛОТ»

**Codename:** RELEASE-001  
**Status:** Release Candidate 1  
**Commit:** `10de465` (branch `main`)  
**Staging:** https://web-production-e56fb.up.railway.app  
**Production (unchanged):** https://marketplace-mvp-one.vercel.app  

Vercel production was **not modified** during RC1 preparation.

---

## What's new since initial MVP RC

### Order Lifecycle (OMS)
- Full delivery + pickup state machines with immutable history/events
- Buyer timeline, seller sales buckets, admin order management
- SLA deadlines + automatic overdue processor (`isOverdue` flag)
- Secret-gated cron: `POST /api/cron/orders-overdue`
- Transactional `PickupOrderCoordinator` (reservation ↔ order consistency)
- Idempotent transitions + chat deduplication

### Pickup & Reservation
- Pickup points, prepayment, status machine, buyer cancel, seller reject
- Admin `/admin/reservations`
- Deterministic E2E fixtures (`E2E_FIXTURE_SECRET`)

### Chat
- Buyer ↔ seller messaging from PDP and cabinet
- Unread badge, IDOR protection, admin read-only access
- ORDER system messages on lifecycle events

### Taxonomy & Search
- WB-compatible category tree + smart product creation
- Russian stemming, synonyms, category matcher
- Catalog ranking: popular / newest / price sorts

### Platform hardening (CORE-060.1)
- Checkout hydration #418 root-cause fixes
- Deterministic formatters (`lib/format/*`) — no `Intl`/`toLocale*` in SSR paths
- Playwright local DB override (avoids `.env.production.local` cloud DB)
- Stable header tree (messages slot always present)

---

## Subsystems — RC1 status

| Subsystem | Status | Notes |
|-----------|--------|-------|
| Auth & roles | **READY** | BUYER / SELLER / ADMIN, session gates |
| Unified account | **READY** | `/account/*` cabinet, mobile nav |
| Catalog & PDP | **READY** | Filters, infinite scroll, SEO metadata |
| Taxonomy | **READY** | WB tree, matcher, char definitions |
| Search | **READY** | Stemming, suggest API, URL persistence |
| Ranking | **PARTIAL** | Views/favorites/recency; no review-based rank |
| Cart & Checkout | **READY** | Guest merge, CDEK mock/real, pickup branch |
| OMS | **READY** | Delivery, pickup, overdue, chat events |
| Pickup / Reservation | **READY** | Coordinator + admin panel |
| Chat | **READY** | Security hardened (056.1) |
| Favorites | **READY** | Auth-gated, optimistic toggle |
| Seller dashboard | **READY** | KPIs, products, orders, pickup points |
| Admin | **READY** | Users, sellers, products, categories, orders, reservations |
| Uploads / Blob | **READY** | Client-direct upload; 503 without token |
| Reviews | **BLOCKED** | Not implemented; `reviewEligibleAt` scaffold only |
| Trust & Risk | **PARTIAL** | Seller badges + admin moderation; no automated risk engine |
| Analytics | **PARTIAL** | Seller KPIs + admin stats; no charts/time-series |
| Stripe | **PARTIAL** | Optional; unset = no real charge |
| CDEK | **PARTIAL** | Mock when credentials empty |
| Cron (overdue) | **READY** | Railway `CRON_SECRET` configured |

---

## Known limitations

1. **Reviews / star ratings** — not shipped; seller `rating` field unused in UI
2. **Advanced analytics** — dashboard KPIs only; `/seller/analytics` redirects
3. **Automated fraud/risk** — manual admin moderation only
4. **Search backend** — PostgreSQL `contains` + stemming (no Elasticsearch)
5. **Stripe / CDEK** — optional; staging usually runs without them
6. **Intermittent hydration #418** — rare in long Playwright suites (catalog/favorites); root causes addressed; monitor post-deploy
7. **Legal copy** — MVP summaries; replace before commercial launch

---

## Breaking changes

None for existing API consumers. OMS migration adds columns/tables — apply migrations before deploy.

### New required env (staging/production with OMS cron)

| Variable | Purpose |
|----------|---------|
| `CRON_SECRET` | Protects `/api/cron/orders-overdue` |

### Optional (staging E2E)

| Variable | Purpose |
|----------|---------|
| `E2E_FIXTURE_SECRET` | Deterministic pickup fixtures |

---

## Deployment notes

### Staging (Railway) — verified RC1 path

```bash
railway link          # project: marketplace-mvp-backup
railway up --service web
# start: npx prisma migrate deploy && npm run start
# health: GET /api/health → 200
```

Required Railway vars: `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`.

### Production (Vercel) — **do not deploy until explicit GO**

1. Set `CRON_SECRET` on Vercel (or external cron hitting `/api/cron/orders-overdue`)
2. Run `prisma migrate deploy` against production DB
3. Verify `NEXT_PUBLIC_APP_URL` matches canonical origin
4. Smoke: `/api/health`, buyer checkout, seller confirm order, admin orders
5. Monitor first 24h: hydration errors, cron logs, Blob 503 rate

See [ROLLBACK.md](./ROLLBACK.md) and [ENVIRONMENTS.md](./ENVIRONMENTS.md).

---

## Quality evidence (RC1)

| Gate | Result |
|------|--------|
| `prisma validate` | PASS |
| `tsc --noEmit` | PASS |
| `eslint .` | PASS |
| `npm run build` | PASS |
| Unit tests | 117/117 |
| Playwright local `--retries=0` × 3 | 67/67 × 3 (CORE-060.1 h13 logs) |
| Railway health | 200 |
| Railway cron | 200 |
| Railway OMS E2E | 2/2 PASS |

Full Railway Playwright run: see RELEASE-001 final report.

---

## Demo accounts

Password: `demo1234`

| Email | Role |
|-------|------|
| `buyer@demo.lot` | BUYER |
| `seller@demo.lot` | SELLER (RAIZZ) |
| `admin@demo.lot` | ADMIN |

---

## Docs index

- [ORDER_LIFECYCLE.md](./ORDER_LIFECYCLE.md) — OMS engine
- [PICKUP.md](./PICKUP.md) — pickup & reservation
- [CHAT.md](./CHAT.md) — messaging security
- [TAXONOMY.md](./TAXONOMY.md) — category engine
- [ENVIRONMENTS.md](./ENVIRONMENTS.md) — staging vs production
- [BACKUP_DEPLOYMENT.md](./BACKUP_DEPLOYMENT.md) — Railway/Render
- [ROLLBACK.md](./ROLLBACK.md) — rollback procedure
