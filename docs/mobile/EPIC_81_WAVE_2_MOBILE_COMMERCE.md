# EPIC 81 Wave 2 — Mobile Commerce Experience

Status: **READY FOR PHYSICAL ACCEPTANCE**

## Goal

Elevate APP-SHELL-0.5 from «working Alpha» to **commercial marketplace UX** (WB / Ozon / Avito patterns) without new platform features or backend API changes.

## Scope delivered

### P0 — Buyer commerce core

| Area | Before (Wave 1) | After (Wave 2) |
|------|-------------------|------------------|
| **ProductCard** | Basic image + price | Discount badge, delivery badge, seller, social proof, favorite, inline CTA, press scale |
| **Catalog** | Search + 2-col grid | Sort chips, in-stock filter, category rail, shimmer skeleton, commerce search panel |
| **Buyer Home** | 3 sections | Full funnel: Search → Categories → Recommend → Popular → New → Continue → For you → Promo |

### P1 — Seller + transaction surfaces

| Area | Improvement |
|------|-------------|
| **Seller Home** | «Сегодня» agenda, orders, AI tip, promotion, sales KPI, wallet, actions |
| **PDP** | Hero gallery, trust row, delivery block, specs, similar products, sticky primary CTA |
| **Wallet** | Balance card, pending payouts, recent orders as transfers proxy, action buttons |
| **Seller Products** | Full cards with photo, status RU, stock, views, context menu |

### P2 — Production polish

- Empty state presets: favorites, cart, orders, sales, products, wallet, history, catalog
- Shimmer skeletons (no white flash screens)
- Light motion: fade screens, tab icon scale, card press scale, image fade
- Commerce search: clear button, history (local), popular queries
- Tab bar: safe area, badges (favorites/orders), active animation

## New client modules

```
apps/mobile/src/
├── hooks/useFadeIn.ts
├── hooks/usePressScale.ts
├── hooks/useTabBadges.ts
├── storage/search-history.ts
├── storage/recent-views.ts
└── components/ui/
    ├── CommerceSearchBar.tsx
    ├── CatalogToolbar.tsx
    ├── SellerProductCard.tsx
    ├── Shimmer.tsx
    └── TabBarBadge.tsx
```

## UX audit (screen-by-screen)

| Screen | Marketplace bar | Notes |
|--------|-----------------|-------|
| Buyer Home | ★★★★☆ | Product-led, not dashboard; real catalog data |
| Catalog | ★★★★☆ | Grid + filters; comparable to Ozon mobile listing |
| PDP | ★★★★☆ | Sticky CTA, gallery, similar — Avito/WB pattern |
| Favorites | ★★★★☆ | Grid cards + empty CTA |
| Cart | ★★★☆☆ | Functional; item photos = Wave 3 candidate |
| Seller Home | ★★★★☆ | Action-oriented «what today» |
| Seller Products | ★★★★☆ | Operational list with menu |
| Wallet | ★★★☆☆ | Strong balance UX; full ledger needs future API |
| Tab bar | ★★★★☆ | Icons, badges, safe area |

## Readiness score

| Metric | Wave 1 | Wave 2 |
|--------|--------|--------|
| Visual marketplace feel | 7/10 | **8.5/10** |
| Buyer journey completeness | 6/10 | **8/10** |
| Seller journey completeness | 7/10 | **8/10** |
| Production motion/loading | 5/10 | **8/10** |
| **Overall Alpha UX** | 7/10 | **8/10** |

**Self-assessment:** Without logo, a user could reasonably think this is a **real marketplace app in beta**, not an internal CRUD demo. Still below WB/Ozon polish on cart item photos, wallet ledger, and seller sales analytics.

## Constraints respected

- No Push / Camera / Biometrics / APP-SHELL-1
- No backend API changes
- No CCOS / Evolution changes
- Uses existing `/api/mobile/catalog`, `/api/products`, `/api/categories`, `/api/products/suggest`, wallet, orders

## Verification

```bash
cd apps/mobile && npm run typecheck   # PASS
```

Physical acceptance: see `EPIC_81_PHYSICAL_ACCEPTANCE_CHECKLIST.md`

## Out of scope (Wave 3 candidates)

- Cart line item thumbnails
- Wallet ledger API integration
- Seller sales analytics charts
- Screenshot/video pack (operator device)
