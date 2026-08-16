# EPIC 84 · Wave 0 — UX Audit (screen matrix)

> **Superseded scoring model:** use `docs/product/EPIC_84_WAVE_0_DESIGN_SYSTEM.md` for Product Design Standard v1, Marketplace Score (0–10), CRUD detection, and Marketplace Quality Index.

This file retains the **operator walkthrough checklist**. Automated scoring lives in:

- `artifacts/epic-84-wave-0/marketplace-quality-audit.json`
- `npm run product:epic-84:wave0`

---

## Quick reference — legacy dimensions → new criteria

| Legacy (EPIC 84 v1) | New criterion |
|---------------------|---------------|
| Visual | visualQuality |
| UX | consistency + accessibility |
| Conversion | conversion |
| Marketplace Feel | marketplaceFeel |
| Trust | trust |
| Completeness | premiumFeel + errorExperience |

---

## Buyer screens — walkthrough

| Screen | Route | Audited? | P0 | Notes |
|--------|-------|----------|-----|-------|
| Splash / Boot | boot | ⬜ | | |
| Login | login | ⬜ | | |
| Buyer Home | `(tabs)/index` | ⬜ | | |
| Catalog | `(tabs)/catalog` | ⬜ | | |
| Product (PDP) | `product/[id]` | ⬜ | | |
| Favorites | `(tabs)/favorites` | ⬜ | | |
| Cart | `cart` | ⬜ | | |
| Checkout | `checkout` | ⬜ | | |
| Orders | `(tabs)/orders` | ⬜ | | |
| Wallet | `(tabs)/wallet` | ⬜ | | |
| Profile | `(tabs)/profile` | ⬜ | | |

## Seller screens — walkthrough

| Screen | Route | Audited? | P0 | Notes |
|--------|-------|----------|-----|-------|
| Seller Home | `(tabs)/seller-home` | ⬜ | | |
| Seller Products | `(tabs)/seller-products` | ⬜ | | |
| Seller Sales | `(tabs)/seller-sales` | ⬜ | | |

## Cross-cutting (physical device)

See `docs/mobile/EPIC_81_PHYSICAL_ACCEPTANCE_CHECKLIST.md` + screenshot pack under `artifacts/epic-84-wave-0/screenshots/`.

---

## Workflow

1. Score screen in `marketplace-quality-audit.json` (10 criteria, 0–10)
2. Run `npm run product:epic-84:wave0` → refreshes Marketplace Score + CRUD scan
3. Capture before/after screenshots
4. Wave 0 complete when index ≥ 8.0 and P0 = 0
