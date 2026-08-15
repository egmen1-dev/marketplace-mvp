# Marketplace Staging Release Acceptance

**Epic:** MARKETPLACE-RELEASE-BATCHES-2-4-001  
**Date:** 2026-08-15  
**Staging URL:** `https://web-production-e56fb.up.railway.app`

---

## Environment

| Field | Value |
|-------|-------|
| **staging URL** | `https://web-production-e56fb.up.railway.app` |
| **SHA** | `b556424` |
| **buildTime** | `2026-08-15T08:57:40.602Z` |
| **environment** | `staging` |
| **migration count** | 46 — `Database schema is up to date` |
| **Prisma** | ✅ synchronized |

---

## Batch status

| Batch | Scope | Verdict |
|-------|-------|---------|
| Batch 1 | Trust foundation | **ACCEPTED** (prior rollout) |
| Batch 2 | Seller experience | **ACCEPTED** |
| Batch 3 | Finance, payout, delivery | **NOT ACCEPTED** |
| Batch 4 | Discovery, social, conversion | **ACCEPTED** |

Reports:

- `docs/RELEASE_BATCH_2_REPORT.md`
- `docs/RELEASE_BATCH_3_REPORT.md`
- `docs/RELEASE_BATCH_4_REPORT.md`
- `docs/RELEASE_FEATURE_FLAG_MATRIX.md`

---

## Integrated smoke (2026-08-15)

### Buyer — PASS

| Step | Route | Result |
|------|-------|--------|
| Homepage | `/` | ✅ |
| Search / catalog | `/catalog` | ✅ |
| Discovery | Homepage blocks + `/discover/collections/nakhodki-do-500` | ✅ |
| PDP | `/product/cmssvqoas000ajsf24b4e59hj` | ✅ Trust block |
| Cart / checkout | Not re-run E2E this session | ⚠️ Assumed from Batch 1 |

### Seller — PASS (with Batch 3 gaps)

| Step | Route | Result |
|------|-------|--------|
| Seller start | `/account/seller-start` | ✅ |
| Business dashboard | `/account/business` | ✅ (after `b556424` fix) |
| Products | `/account/products` | ✅ |
| Orders / sales | `/account/sales` | ✅ UI; no active orders |
| Balance / payouts | `/account/balance`, `/account/payouts` | ✅ UI |
| Shipment | `/account/orders/ship` | ⚠️ Not tested (no orders) |
| Reputation | `/account/reputation` | ✅ |
| Discovery education | `/account/discovery` | ✅ |

### Admin — PASS

| Route | Result |
|-------|--------|
| `/admin/system-flags` | ✅ All rollout flags ACTIVE |
| `/admin/health` | ✅ (Batch 1) |
| `/admin/trust-center` | ✅ (Batch 1) |
| `/admin/payouts` | ✅ |
| `/admin/delivery` | ✅ |
| `/admin/delivery/health` | ✅ CDEK_MOCK |
| `/admin/conversion` | ✅ |
| `/admin/discovery` | ✅ |
| `/admin/social-growth` | ✅ |

---

## Flow verdicts

| Flow | Verdict |
|------|---------|
| **Buyer** | **PASS** |
| **Seller** | **PASS** (UI); finance/delivery lifecycle gaps remain |
| **Admin** | **PASS** |

---

## Remaining blockers

| ID | Class | Description |
|----|-------|-------------|
| GAP-B3-001 | **MAJOR** | Shipping deadline UX not validated on real order |
| GAP-B3-002 | **MAJOR** | Payout lifecycle (reserve/reject/double-withdraw) not E2E tested |
| INF-B3-001 | INFO | CDEK provider = MOCK |
| INF-B3-002 | INFO | Payout provider = manual admin processing |
| UX-B2-001 | MAJOR | Seller nav not matching target 7-item structure |
| UX-B2-002 | MINOR | English labels on seller conversion panel |

No **BLOCKER** issues remain after `b556424` business-page fix.

---

## Production gate

| Gate | Status |
|------|--------|
| All batches accepted | ❌ Batch 3 NOT ACCEPTED |
| Prisma synced | ✅ |
| Staging SHA current | ✅ `b556424` |
| Critical flags validated | ✅ |
| Buyer E2E passed | ✅ (smoke) |
| Seller E2E passed | ⚠️ Partial (no ship/payout lifecycle) |
| Admin smoke passed | ✅ |
| Stripe state explicitly known | ⚠️ Not re-audited — assume existing checkout |
| Delivery provider explicitly known | ✅ **CDEK_MOCK** |
| No BLOCKER issues | ✅ |

```text
READY FOR FULL COMMERCIAL LAUNCH: NO
READY FOR CONTROLLED STAGING / DEMO: YES
```

---

## Key fix shipped in this rollout

Commit `b556424`: reduce parallel Prisma queries on `/account/business` when `SELLER_BUSINESS_INTELLIGENCE_ENABLED=true`, plus Railway `DATABASE_URL` connection pool limits — resolves staging `P2037` pool exhaustion that blocked Batch 2 acceptance.

---

## Demo accounts

Password `demo1234`:

- `demo-new-seller@demo.lot`
- `demo-growing@demo.lot`
- `demo-problems@demo.lot`
- `admin@demo.lot`
