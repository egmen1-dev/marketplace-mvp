# EPIC 81 — APP-SHELL-0.5 Mobile UX & Functional Hardening

Status: **IN PROGRESS** (Wave 1 — P0/P1/P2 foundation)

## Scope

Polish existing APP-SHELL-0 into a professional Closed Alpha UX. **No new platform features** (Push, Camera, Biometrics, APP-SHELL-1).

## UX Reference Pattern

Before each screen, patterns were aligned with mobile e-commerce leaders (Wildberries, Ozon, Avito, Yandex Market, Amazon):

- Home: search-first, horizontal chips, product grids, section headers
- Catalog: card grid, image-first, badges, favorite affordance
- PDP: hero gallery, price hierarchy, seller block, secondary favorite/share
- Seller cabinet: KPI cards, wallet summary, quick actions
- Login: single hierarchy, brand block, compact inputs, web fallbacks for signup

## P0 — Fixed

| # | Issue | Fix |
|---|-------|-----|
| 1 | Seller product tap did nothing | `GET /api/mobile/seller/products` + navigation to `/product/[id]` |
| 2 | Broken tab icons | MaterialCommunityIcons with active/inactive states |
| 3 | Seller Home «Товаров 0» | Seller-scoped API, role gating, refetch on focus, error handling |

## Design System

### Tokens (`apps/mobile/src/theme/tokens.ts`)

- **Colors**: orange `#FF6B00`, neutrals, semantic success/danger
- **Spacing**: 4 / 8 / 12 / 16 / 24 / 32
- **Typography**: display, h1, h2, body, caption, button
- **Radii / shadows / layout constants**

### Components (`apps/mobile/src/components/ui/`)

| Component | Purpose |
|-----------|---------|
| `PrimaryButton` / `SecondaryButton` / `GhostButton` / `DangerButton` | Button system |
| `PageContainer` / `PageScroll` / `AppHeader` / `SectionHeader` | Layout |
| `ProductCard` | Buyer catalog cards |
| `MetricCard` / `WalletCard` / `SellerCard` / `InfoCard` | Seller & wallet surfaces |
| `SearchBar` / `Badge` / `Avatar` / `Price` / `Rating` | Primitives |
| `EmptyState` / `ErrorState` / `LoadingState` / `SkeletonGrid` | Feedback |
| `TabBarIcon` | Bottom navigation icons |
| `NetworkBanner` | Offline banner |

## API (non-breaking)

- `GET /api/mobile/seller/products` — seller-scoped inventory (JWT `sellerProfileId`)
- Extended mobile client: `fetchSellerProducts`, `fetchCategories`, catalog `sort` param

## Screens Updated

- Boot / Splash (`app/index.tsx`)
- Login (`app/login.tsx`)
- Buyer Home, Catalog, Favorites, Orders, PDP
- Seller Home, Seller Products, Wallet, Profile
- `app.json` — branded splash, orange adaptive icon background

## Verification

```bash
cd apps/mobile && npm run typecheck
```

Staging smoke (seller):

```bash
# seller@demo.lot / demo1234
curl -H "Authorization: Bearer $TOKEN" \
  https://web-production-e56fb.up.railway.app/api/mobile/seller/products
```

## Alpha Readiness (preliminary)

| Area | Before | After |
|------|--------|-------|
| Visual consistency | Ad-hoc styles | Design tokens + shared components |
| Buyer journey | Debug counters | Search, sections, product cards |
| Seller journey | Broken nav, wrong catalog | Scoped products + KPI home |
| Tab bar | Placeholder icons | Professional icon pack |
| Login | Double title, bulky inputs | Brand block, compact form |
| Offline | Plain text | Branded banner |

**Estimated Alpha readiness: 7/10** — core UX hardened; wallet history, seller sales detail, and physical device walkthrough videos pending operator pass.

## Deliverables Checklist

- [x] UX audit (this doc)
- [x] Design tokens list
- [x] Component inventory
- [ ] Full screenshot set (requires device/build)
- [ ] Buyer walkthrough video
- [ ] Seller walkthrough video
- [ ] Physical Android sign-off

## Constraints Respected

- No Push / Camera / Biometrics / APP-SHELL-1
- Backend JWT, MRP, POP, CCOS unchanged (additive mobile API only)
