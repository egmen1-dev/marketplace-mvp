# EPIC 81 — Physical Android Acceptance Checklist

Use this checklist **after each UX EPIC** on a real Android device with staging APK.

**Environment**

- Staging: `https://web-production-e56fb.up.railway.app`
- Buyer: `buyer@demo.lot` / `demo1234`
- Seller: `seller@demo.lot` / `demo1234`

---

## Wave 2 — Mobile Commerce Experience

### Buyer flow

| # | Step | Expected | Pass |
|---|------|----------|------|
| B1 | Open app → Buyer Home | Search bar, category chips, product sections (not dashboard counters) | ☐ |
| B2 | Tap search → see history/popular | Suggestions panel, clear button works | ☐ |
| B3 | Submit search | Navigates to catalog with results grid | ☐ |
| B4 | Catalog sort chips | Popular / New / Price sort changes list | ☐ |
| B5 | Category rail + «В наличии» | Filters apply, skeleton while loading | ☐ |
| B6 | Product card | Photo, discount badge (if compareAt), delivery badge, favorite, «В корзину» | ☐ |
| B7 | Card press animation | Subtle scale feedback | ☐ |
| B8 | Open PDP | Gallery, sticky «В корзину», secondary «Избранное» | ☐ |
| B9 | PDP similar products | Horizontal carousel loads | ☐ |
| B10 | Add to cart → open cart | Item listed, empty state if cleared | ☐ |
| B11 | Favorites tab | Grid + badge on tab if items exist | ☐ |
| B12 | Orders tab | Cards or empty state with CTA | ☐ |
| B13 | Tab bar safe area | No overlap with Android gesture bar | ☐ |

### Seller flow

| # | Step | Expected | Pass |
|---|------|----------|------|
| S1 | Profile → switch to Seller | Seller tabs visible | ☐ |
| S2 | Seller Home «Сегодня» | Task list, orders metric, wallet card | ☐ |
| S3 | Seller Home data | Product count > 0 for seller@demo.lot | ☐ |
| S4 | Seller Products | Photo cards, RU status, views, ⋮ menu | ☐ |
| S5 | Tap seller product | Opens PDP | ☐ |
| S6 | Wallet | Balance card, pending section, action buttons | ☐ |
| S7 | Seller Sales | Orders list or empty state | ☐ |

### Visual quality

| # | Check | Pass |
|---|-------|------|
| V1 | No white flash on screen open (skeleton/fade instead) | ☐ |
| V2 | Typography hierarchy consistent | ☐ |
| V3 | Touch targets ≥ 44dp on buttons | ☐ |
| V4 | Offline banner appears in airplane mode | ☐ |
| V5 | App feels like marketplace (not CRUD demo) | ☐ |

### Regression

| # | Check | Pass |
|---|-------|------|
| R1 | Login / logout works | ☐ |
| R2 | JWT session persists after restart | ☐ |
| R3 | Deep link `lot://product/{id}` opens PDP | ☐ |
| R4 | No crashes on tab switching buyer ↔ seller | ☐ |

---

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Operator | | | GO / NO-GO |
| Notes | | | |

**GO criteria:** All B1–B13, S1–S7, V1–V5, R1–R4 pass.

Record result in `artifacts/epic-81-wave-2/physical-acceptance.json` when running formal gate.
