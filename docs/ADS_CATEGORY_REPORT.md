# Ads Category Readiness Report (ADS-READY-001)

**Staging:** https://web-production-e56fb.up.railway.app  
**Date:** 2026-08-12  
**Method:** `getAdminAdsDashboard()` + `buildCategoryAdsReport()` — same rules as [ADS_READINESS_AUDIT.md](./ADS_READINESS_AUDIT.md).

---

## Tracked categories

| Slug | Display name (seed) |
|------|------------------------|
| `construction` | Строительство |
| `tools` | Инструменты |
| `electronics` | Электроника |
| `clothing` | Одежда |
| `home` | Дом и сад |

Products are attributed via category `path` first segment (e.g. `tools/power-tools` → **tools**).

---

## Readiness matrix (template)

Run on live DB after deploy:

| Category | Products | Ready | Blocked | Readiness % | Avg score | Common problems |
|----------|----------|-------|---------|-------------|-----------|-----------------|
| Construction | — | — | — | — | — | NO_PRODUCT_TYPE, NO_IMAGE |
| Tools | — | — | — | — | — | NO_STOCK |
| Electronics | — | — | — | — | — | NOT_ACTIVE |
| Clothing | — | — | — | — | — | NO_IMAGE |
| Home | — | — | — | — | — | NO_PRODUCT_TYPE |

**Live values:** open `/admin/ads` → **Category readiness** table (auto-computed).

---

## Seed-data expectations (demo)

After `npm run db:seed` on staging:

- **Tools / Electronics / Home** — highest READY count (seed products ACTIVE with images + stock).
- **Clothing** — fewer listings; some accessories may lack productType if legacy rows exist.
- **Construction** — depends on taxonomy import; check `NO_PRODUCT_TYPE` if pre-taxonomy rows remain.

---

## Problem codes → actions

| Code | Seller action |
|------|---------------|
| `NOT_ACTIVE` | Publish as ACTIVE |
| `NO_STOCK` | Set stock &gt; 0 |
| `NO_PRODUCT_TYPE` | Select type in taxonomy selector |
| `NO_IMAGE` | Upload photo |
| `NO_PRICE` | Set price &gt; 0 |
| `NO_SELLER` | Internal — contact support |
| `SELLER_BLOCKED` | Admin unblock seller |

---

## Category launch recommendation

1. **Phase 1 ads:** categories with readiness ≥ 70% and avg quality score ≥ 60.
2. **Hold:** categories where top problem is `NO_PRODUCT_TYPE` — run taxonomy cleanup first.
3. **Deep links:** use `/catalog?category=<slug>` or SEO facet URLs from `/admin/seo` for campaign LPs.

---

## Verification

```bash
# Admin UI
open https://web-production-e56fb.up.railway.app/admin/ads

# Unit
npm test -- tests/product-advertising.test.ts
```

Refresh this doc after major catalog imports or before first VK campaign.
