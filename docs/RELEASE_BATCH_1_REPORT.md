# Release Batch 1 Report — Marketplace Trust Foundation

**Date:** 2026-08-14  
**Merge train:** MARKETPLACE-RELEASE-MERGE-TRAIN-001  
**Target branch:** `main`  
**Deploy target:** Railway staging (`https://web-production-e56fb.up.railway.app`)

---

## Summary

Batch 1 merges the marketplace trust foundation into `main`. Because feature branches are stacked linearly, this merge also includes prerequisite epics required for trust modules to compile and run.

| Item | Value |
|------|-------|
| **Merge commit** | `93429d1` |
| **Previous staging SHA** | `f7cab39` |
| **Build** | ✅ `npm run build` |
| **Tests** | ✅ 411/411 |
| **Prisma migrate status** | ⚠️ Local/DB history diverged — see Migrations |

---

## Merged PRs (Batch 1 targets)

| Order | PR | Epic | Branch tip |
|-------|-----|------|------------|
| 1 | #47 | MARKETPLACE-TRUST-LOOP-001 | `marketplace-trust-loop-001-d03e` |
| 2 | #55 | MARKETPLACE-TRUST-SCORE-MODEL-001 | `marketplace-trust-score-model-001-d03e` |
| 3 | #56 | MARKETPLACE-TRUST-EXPERIENCE-001 | `marketplace-trust-experience-001-d03e` |
| 4 | #57 | MARKETPLACE-NEW-SELLER-TRUST-001 | `marketplace-new-seller-trust-001-d03e` |

### Prerequisite merges (required by branch stack)

These were included in the same merge commit because `#55–#57` depend on them:

| PRs | Area |
|-----|------|
| #39–#40 | Seller payout / lifecycle |
| #41–#45 | Seller UX (first entry → business intelligence) |
| #46 | Foundation audit |
| #48–#49 | Delivery / launch readiness |
| #50–#53 | Discovery, social, UX completion, conversion |
| #54 | Design spec alignment |

> **Note:** Batches 2–4 from the merge train spec are largely satisfied by this prerequisite chain. Remaining work: #58 (trust conversion), #59 (deploy visibility audit), and explicit Batch 2–4 flag rollout verification.

---

## Conflict resolution

| Area | Resolution |
|------|------------|
| `prisma/schema.prisma` | Marketplace finance + trust models; retained `StripeWebhookEvent` from main |
| `lib/trust-safety/*` | Adapted to merged dispute model (`openedBy`, string `reason`) |
| `features/finance/*` | Bridged to `lib/finance` (EPIC-FINANCE-001) |
| `lib/constants.ts` | Merged route registry + restored `resolveLegacySellerCabinetRedirect` |
| UI pages (balance, trust, PDP) | Took marketplace branch implementations |

---

## Migrations

Pending local migrations (not yet applied to dev DB):

- `20260813140000_payment_finance_ledger`
- `20260813150000_trust_safety_disputes`
- `20260813170000_seller_first_entry`
- `20260813180000_marketplace_trust_loop`
- `20260813190000_marketplace_delivery`
- `20260813200000_marketplace_social_growth`
- `20260813210000_marketplace_trust_score_model`

**Action required on staging:** run `npx prisma migrate deploy` after deploy, or reconcile migration history if DB has promotion_* migrations from a parallel branch.

---

## Staging deploy verification

### Pre-push baseline

```json
{"environment":"staging","commit":"f7cab39","buildTime":"2026-08-13T16:29:59.612Z","version":"0.1.0"}
```

### Post-push check

After Railway deploys `main` at `93429d1`:

```bash
curl -sS https://web-production-e56fb.up.railway.app/api/version
# expect: commit === "93429d1"
```

### Health routes (after flags enabled)

| Role | Routes |
|------|--------|
| Buyer | `/`, `/catalog`, `/product/[id]`, `/account`, `/orders`, `/favorites` |
| Seller | `/account/business`, `/account/reputation`, `/account/balance`, `/account/payouts`, `/account/promotions`, `/account/seller-start` |
| Admin | `/admin/trust`, `/admin/trust-center`, `/admin/launch`, `/admin/health` |

---

## Feature flags — enable on Railway staging

Set after successful deploy + migration:

```env
MARKETPLACE_TRUST_LOOP_ENABLED=true
MARKETPLACE_TRUST_SCORE_MODEL_ENABLED=true
MARKETPLACE_TRUST_EXPERIENCE_ENABLED=true
MARKETPLACE_NEW_SELLER_TRUST_ENABLED=true

# Included via prerequisite merge (enable for full Batch 1 smoke):
SELLER_FIRST_ENTRY_ENABLED=true
SELLER_JOURNEY_ENABLED=true
SELLER_OPERATING_DESK_ENABLED=true
SELLER_OPERATIONS_ENABLED=true
SELLER_BUSINESS_INTELLIGENCE_ENABLED=true
SELLER_PAYOUT_ENABLED=true
MARKETPLACE_DELIVERY_ENABLED=true
MARKETPLACE_DISCOVERY_ENABLED=true
MARKETPLACE_SOCIAL_GROWTH_ENABLED=true
MARKETPLACE_UX_COMPLETION_ENABLED=true
MARKETPLACE_CONVERSION_ENABLED=true
```

Legacy trust-safety (main pre-merge):

```env
TRUST_SAFETY_ENABLED=true
NEXT_PUBLIC_TRUST_SAFETY_ENABLED=true
```

---

## Demo verification personas

Seed (when #59 deploy visibility lands on main):

| Email | Persona |
|-------|---------|
| `demo-new-seller@demo.lot` | New seller — starter trust, growth path |
| `demo-growing@demo.lot` | Growing seller — ratings, operations |
| `demo-problems@demo.lot` | Problem seller — recommendations, trust drops |

Password: `demo1234`

---

## Issues found

1. **Migration history divergence** — local migrations vs DB promotion_* migrations need reconcile before `migrate deploy` on staging.
2. **Dual finance paths** — `features/finance` bridged to `lib/finance`; monitor for duplicate ledger writes in production.
3. **Trust admin pages** — `/admin/trust` now uses marketplace-trust-loop dashboard; legacy trust-safety admin UI superseded.
4. **PRs #58–#59 not merged** — trust conversion analytics and deploy visibility audit remain on feature branches.

---

## Next steps

1. Push `main` → wait for Railway deploy → verify `/api/version` SHA
2. Run migrations on staging DB
3. Enable feature flags (above)
4. Smoke test buyer/seller/admin routes
5. Merge #58 + #59 in follow-up PR
6. Proceed to explicit Batch 2–4 verification (mostly code already on main)
