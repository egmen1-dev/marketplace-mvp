# Release Batch 3 Report — Finance, Payout & Delivery

**Epic:** MARKETPLACE-RELEASE-BATCHES-2-4-001  
**Date:** 2026-08-15  
**Environment:** Railway staging — `https://web-production-e56fb.up.railway.app`  
**Staging SHA:** `b556424`

---

## Flags

Verified ON on Railway / `/admin/system-flags`:

```env
SELLER_PAYOUT_ENABLED=true
MARKETPLACE_DELIVERY_ENABLED=true
```

Finance foundation uses merged `lib/finance` (no separate env flag). Batch 1 trust + UX flags remained ON.

---

## Database

```bash
npx prisma migrate status
# 46 migrations found
# Database schema is up to date!
```

Confirmed tables present via prior Batch 1 reconciliation: payout, balance, delivery, return-request foundation.

---

## Seller payout acceptance

**Account:** `demo-growing@demo.lot` / `demo1234`

| Route | Result | Notes |
|-------|--------|-------|
| `/account/balance` | ✅ PASS | Labels «Ожидается», «Доступно», «Получено» понятны |
| `/account/payouts` | ✅ PASS (UI) | Manual payout flow disclosed; no Stripe Connect |

**Payout methods UX:** UI shows masked reference / placeholder methods.  
**Real payout provider:** `manual / not connected` — admin manually processes requests.

**Payout lifecycle E2E** (`available → request → reserved → admin → completed/rejected`): **NOT TESTED** — demo-growing seller has zero available balance; no staging fixture created (out of scope per «no new features»).

---

## Delivery acceptance

| Route | Result | Notes |
|-------|--------|-------|
| `/account/sales` | ⚠️ PARTIAL | Page loads; **no active orders** for demo-growing to validate ship flow |
| `/account/orders/ship` | ⚠️ NOT TESTED | No shippable orders |
| Shipping deadline UX | ⚠️ GAP | Warning UI exists on sales page structure, but countdown / date breakdown not validated on a real overdue order |

---

## Admin acceptance

**Account:** `admin@demo.lot` / `demo1234` (re-seeded demo visibility; admin login confirmed)

| Route | Result | Notes |
|-------|--------|-------|
| `/admin/payouts` | ✅ PASS | Queue loads; 0 active requests |
| `/admin/payouts/[id]` | ⚠️ NOT TESTED | No payout requests in queue |
| `/admin/delivery` | ✅ PASS | Delivery health dashboard |
| `/admin/delivery/health` | ✅ PASS | Provider status visible |

**CDEK provider state:**

```text
CDEK_MOCK
```

Delivery runs with mock CDEK fallback — **not production-ready**.

**Stripe payment flow:** unchanged; checkout uses existing integration state (not re-validated in this batch).

---

## Acceptance checklist

| Criterion | Result |
|-----------|--------|
| Balance UX понятен | ✅ |
| Payout request работает | ⚠️ UI only; lifecycle not E2E |
| Reserve logic работает | ⚠️ Not tested |
| Admin payout queue работает | ✅ |
| Delivery UI работает | ✅ (admin); ⚠️ seller ship flow untested |
| Seller понимает срок отправки | ⚠️ GAP — no fixture order |
| Buyer видит tracking progress | ⚠️ Not tested |
| Admin видит delivery health | ✅ |
| Database synced | ✅ |
| Core finance не повреждён | ✅ (no regressions observed) |

---

## Bugs & gaps

| ID | Severity | Description |
|----|----------|-------------|
| GAP-B3-001 | MAJOR | No staging order fixture → shipping deadline UX not visually validated |
| GAP-B3-002 | MAJOR | Payout reserve / reject / double-withdrawal not E2E tested |
| INF-B3-001 | INFO | CDEK_MOCK — expected for staging |
| INF-B3-002 | INFO | Payout provider manual — UI honest about admin processing |

---

## Screenshots

- `/opt/cursor/artifacts/batch3_1_balance_page.webp`
- `/opt/cursor/artifacts/batch3_2_payouts_page.webp`
- `/opt/cursor/artifacts/batch3_4_sales_page_no_orders.webp`
- `/opt/cursor/artifacts/batch34_admin_payouts.webp`
- `/opt/cursor/artifacts/batch34_admin_delivery_health.webp`

---

## Verdict

Seller/admin **UI surfaces work** and honestly represent manual payout + mock delivery. Critical **lifecycle paths were not end-to-end validated** due to missing balance and orders on demo personas.

```text
BATCH 3 NOT ACCEPTED
```

**Recommendation:** Add safe staging fixtures (order awaiting shipment + seller with available balance) and re-run Batch 3 acceptance before production finance/delivery gate.
