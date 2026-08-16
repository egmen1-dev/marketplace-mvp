# EPIC 84 · Wave 0 — UX Product Audit

**Goal:** пройти каждый экран приложения и зафиксировать product gaps до Wave 1–2.

**Baseline:** `0.1.2-alpha` (versionCode 3) · staging only

---

## Scoring dimensions (1–5 each)

| Dimension | Question |
|-----------|----------|
| **Visual** | Выглядит ли экран как современный marketplace? |
| **UX** | Понятен ли следующий шаг без инструкций? |
| **Conversion** | Подталкивает ли экран к целевому действию? |
| **Marketplace Feel** | Ощущается ли как реальный магазин, а не MVP? |
| **Trust** | Есть ли сигналы надёжности (статусы, продавец, цена)? |
| **Completeness** | Нет ли заглушек, dead ends, «TODO» в UI? |

**Priority:** P0 (блокер) · P1 (до следующего релиза) · P2 (backlog)

---

## Buyer screens

| Screen | Route | Visual | UX | Conv | Feel | Trust | Complete | P | Notes |
|--------|-------|--------|----|----|------|-------|----------|---|-------|
| Splash / Boot | boot | | | | | | | | |
| Unsupported Client | unsupported | | | | | | | | |
| Update prompt | update | | | | | | | | |
| Login | login | | | | | | | | |
| Buyer Home | `(tabs)/index` | | | | | | | | |
| Catalog | `(tabs)/catalog` | | | | | | | | |
| Search | catalog toolbar | | | | | | | | |
| Product (PDP) | `product/[id]` | | | | | | | | |
| Favorites | `(tabs)/favorites` | | | | | | | | |
| Cart | `cart` | | | | | | | | |
| Checkout | `checkout` | | | | | | | | |
| Orders | `(tabs)/orders` | | | | | | | | |
| Wallet | `(tabs)/wallet` | | | | | | | | |
| Profile | `(tabs)/profile` | | | | | | | | |
| Offline / reconnect | network banner | | | | | | | | |

---

## Seller screens

| Screen | Route | Visual | UX | Conv | Feel | Trust | Complete | P | Notes |
|--------|-------|--------|----|----|------|-------|----------|---|-------|
| Seller Home | `(tabs)/seller-home` | | | | | | | | |
| Seller Products | `(tabs)/seller-products` | | | | | | | | |
| Seller Product tap | navigation → PDP/edit | | | | | | | | |
| Seller Sales | `(tabs)/seller-sales` | | | | | | | | |
| Mode switch | profile / header | | | | | | | | |

---

## Cross-cutting checks

| Check | Pass? | Priority | Notes |
|-------|-------|----------|-------|
| Orange LOT launcher icon | | | |
| Branded splash | | | |
| Login proportions + eye icon | | | |
| Real bottom-nav icons | | | |
| Product images load | | | |
| 2-column catalog | | | |
| Buyer home sections | | | |
| Seller dashboard | | | |
| Seller product navigation (no dead end) | | | |
| PDP hierarchy | | | |
| Wallet layout | | | |
| Russian statuses | | | |
| Empty / loading states | | | |
| Unsupported version screen (0.1.0/0.1.1) | | | |

---

## Audit workflow

1. Install `0.1.2-alpha` from [GitHub Release](https://github.com/egmen1-dev/marketplace-mvp/releases/tag/closed-alpha-0.1.2)
2. Walk buyer path → fill buyer table + screenshot pack
3. Switch to seller mode → fill seller table
4. Export P0/P1 list → `artifacts/epic-84-wave-0/ux-audit-report.json`
5. Run `npm run product:epic-84:gate` for POP metrics baseline

---

## Wave 0 exit criteria

- [ ] Every screen row scored (no blanks)
- [ ] All P0 issues filed with owner
- [ ] P0 = 0 before Wave 1 start
- [ ] Screenshot pack saved under `artifacts/epic-84-wave-0/screenshots/`
- [ ] POP release verdict baseline captured (`GET /api/admin/product-ops/release-verdict`)
