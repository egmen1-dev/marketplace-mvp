# Commerce Domain Migration Checklist

**EPIC:** 92 → Sprint 93+ · **Baseline:** 7 fat screens, 40 API import sites, 5 DS API files

Use this checklist when migrating each surface. Do not skip steps.

---

## Phase 0 — Prerequisites

- [ ] `npm run mobile:epic-92:validate` PASS
- [ ] ADR read for domain being migrated
- [ ] Contract entities match screen needs
- [ ] Telemetry event names defined

---

## Phase 1 — Infrastructure

- [ ] `RestCommerceTransport` method for domain endpoints
- [ ] DTO → entity mapper in transport or repository (not hook)
- [ ] `Rest{Domain}Repository` implements frozen interface
- [ ] Unit tests for mapper + error mapping (`ApiClientError` → `DomainError`)
- [ ] Cache keys registered in CacheRepository

---

## Phase 2 — Use cases

- [ ] Use cases created under `domain/use-cases/{domain}/`
- [ ] Each returns `Result<T, DomainError>`
- [ ] Mutations publish domain events
- [ ] Telemetry tracked via TelemetryRepository
- [ ] Use case unit tests with mock repositories

---

## Phase 3 — Feature hook

- [ ] Create or refactor `use{Feature}Data.ts`
- [ ] Hook calls use cases only (not repositories directly unless hook IS the composition root — prefer factory)
- [ ] Map entities → ViewModel for Experience
- [ ] Remove all `api/endpoints` imports from hook
- [ ] Remove duplicate state (badges, favorites) — subscribe to events

---

## Phase 4 — Experience / screen

- [ ] Experience uses ViewModel props only
- [ ] Remove `api/*` imports from Experience
- [ ] Screen (`app/`) is thin shell: hook → Experience
- [ ] Design-system children receive callbacks not API calls

---

## Phase 5 — Verification

- [ ] `npm run mobile:typecheck`
- [ ] `npm run mobile:test`
- [ ] `npm run mobile:epic-92:validate` — API import count decreased or unchanged
- [ ] Manual test happy path + offline path per state-contract
- [ ] No new DTO types in features/ or design-system/

---

## Per-screen migration order (recommended)

| Priority | Screen / feature | Use cases | Repository |
|----------|------------------|-----------|------------|
| P0 | `design-system` recommendation rails | Pass callbacks only | — |
| P1 | `favorites.tsx` | LoadFavorites, ToggleFavorite | FavoritesRepository |
| P1 | `CartExperience` path | AddToCart, LoadCart, … | CartRepository |
| P2 | `catalog` + `buyer-home` | LoadCatalog, SearchProducts | CatalogRepository, SearchRepository |
| P2 | `product/[id]` | LoadProduct, ShareProduct | ProductRepository |
| P2 | `orders` | LoadOrders, LoadOrderDetail | OrderRepository |
| P3 | `wallet.tsx` | LoadWallet | WalletRepository |
| P3 | `seller-home.tsx` | LoadSellerHome | SellerRepository |
| P3 | `seller-products.tsx` | LoadSellerProducts | SellerRepository |
| P3 | `seller-sales` | LoadSellerOrders | SellerRepository |
| P3 | `profile.tsx` | LoadProfile, SwitchAppMode, SubmitProductFeedback | ProfileRepository, AuthRepository |
| P4 | `login.tsx` | LoginUser, LogoutUser | AuthRepository |
| P4 | `boot` pipeline | RunStartupBootstrap | BootstrapRepository |

---

## Fat screen checklist (wallet, favorites, seller-home, seller-products, profile)

- [ ] Extract `features/{name}/use{Name}Data.ts`
- [ ] Extract `features/{name}/{Name}Experience.tsx` if inline UI > 50 lines
- [ ] Delete all `fetch*` calls from `app/(tabs)/{name}.tsx`
- [ ] Screen file ≤ 15 lines (shell only)

---

## Design-system rail checklist

Files: `CartRecommendationsRail`, `OrdersRecommendationsRail`, `PdpRelatedRail`

- [ ] Remove `api/endpoints` import
- [ ] Add props: `onAddToCart?`, `onToggleFavorite?`
- [ ] Parent hook binds use case to prop
- [ ] Verify `design_system_api_imports_within_baseline` gate

---

## Badge migration checklist

- [ ] Remove `setBadges` from `useCartData`
- [ ] Remove cart fetch from `useTabBadges` (keep orchestration only)
- [ ] Implement `BadgeProjection` subscriber on CartUpdated, FavoriteChanged, OrderCreated
- [ ] Single writer to badge store slice

---

## Done criteria (Sprint 93 exit)

- [ ] API import sites ≤ 5 (transport + boot only)
- [ ] Screen direct API = 0
- [ ] Design-system direct API = 0
- [ ] DTO leaks to UI = 0
- [ ] All commerce flows through use cases
- [ ] `domain/use-cases/` populated for P1 domains
- [ ] EPIC 86 seller domain readiness re-evaluated

---

## Rollback

If migration breaks P0 gates:

1. Revert feature branch
2. Do not revert contract files without ADR
3. File incident if contract gap discovered
