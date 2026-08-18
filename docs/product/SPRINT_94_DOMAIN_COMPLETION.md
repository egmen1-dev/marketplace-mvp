# Sprint 94 — Domain Completion & Seller Foundation

**Baseline:** Sprint 93 COMPLETE · EPIC 92 contracts FROZEN · Closed Alpha 0.1.5-alpha  
**Branch:** `cursor/sprint-94-domain-completion-d03e`

## Mission

Finish the domain layer migration and establish seller domain foundation for EPIC 86.

Target architecture (all commerce features):

```
Screens → Hooks → Use Cases → Repositories → Transport → REST API
```

Composition root (wiring only): `apps/mobile/src/composition/commerce-container.ts`

## Delivered

### Buyer domain completion

| Surface | Hook | Use cases |
|---------|------|-----------|
| PDP | `useProductDetailData` | LoadProductDetail, LoadRelatedProducts, AddToCart, ToggleFavorite |
| Orders | `useOrdersData`, `useOrderDetailData` | LoadOrders, LoadOrderDetail, ShareOrder, ReorderItems |
| Checkout | `useCheckoutData` | LoadCart, QuoteCheckoutDelivery, LoadPickupPoints, LoadWallet |
| Buyer home | `useBuyerHomeData` | LoadCatalog, LoadCategories, AddToCart, ToggleFavorite |
| Login | `useAuth` | LoginUser, LogoutUser |
| Wallet | `useWalletData` | LoadWallet, LoadSellerOrders (seller recent sales) |

Alpha checkout redirect behavior preserved (web checkout URL — no native payment fabrication).

### Seller foundation

| Repository | Use cases | Screens |
|------------|-----------|---------|
| `RestSellerRepository` | LoadSellerHome, LoadSellerProducts, LoadSellerOrders, LoadSellerPublicProfile | seller-home, seller-products, seller-sales, seller/[id] |

Seller entities mapped independently from buyer API DTOs in `infrastructure/mappers/seller-mapper.ts`.

### Design System decoupling

- **Zero** `api/` imports under `design-system/`
- Recommendation rails accept callbacks (`onToggleFavorite`) — no mutations in DS
- `MobileProductCardData` replaces `MobileProductListItem` in UI paths

### DTO elimination

- `MobileUpdateInfo` moved to `update/types.ts`
- UI/features use domain entities + view mappers (`features/*/ *-view.ts`)
- DTO leak count: **10 → 0**

### State ownership

- Tab badges derived from domain events + `useTabBadges` use-case loads
- Cart/favorites/profile badges subscribe to `CartUpdated`, `FavoriteChanged`, `ProfileUpdated`

### Event bus

Existing events plus seller/wallet emissions:

- `WalletChanged` on LoadWallet
- `SellerOrderChanged` on LoadSellerOrders
- `OrderCreated` ready via checkout repository (alpha redirect path)

### Startup boundary

Application infrastructure allowlisted (not commerce domain):

- `app/index.tsx` boot pipeline
- `boot/run-startup-pipeline.ts`
- `boot/startup-telemetry.ts`
- `update/mobile-update-client.ts`

## Architecture enforcement

Gate: `npm run mobile:sprint-94:gate`

Hard FAIL targets:

- Screen → API imports = **0**
- Design System → API imports = **0**
- DTO leaks = **0**
- Domain → React/infrastructure = **0** (composition root moved out of domain/)
- Domain cycles = **0**
- Repository cycles = **0**

## Migration delta

| Metric | Sprint 91 | Sprint 93 | Sprint 94 |
|--------|-----------|-----------|-----------|
| Screen → API | 7 | 6 | **0** |
| DTO leaks | 26 | 10 | **0** |
| DS API mutations | 3 | 3 | **0** |
| Domain cycles | 0 | 0 | **0** |

## Artifacts

- `artifacts/sprint-94-domain-completion/domain-migration-report.json`
- `artifacts/sprint-94-domain-completion/seller-domain-report.json`
- `artifacts/sprint-94-domain-completion/dto-leak-report.json`
- `artifacts/sprint-94-domain-completion/architecture-boundary-report.json`
- `artifacts/sprint-94-domain-completion/state-ownership-report.json`
- `artifacts/sprint-94-domain-completion/regression-report.json`
- `artifacts/sprint-94-domain-completion/gate-report.json`

## Seller readiness gate

| Check | Status |
|-------|--------|
| SellerRepository implemented | YES |
| Seller use cases implemented | YES |
| Seller screens migrated | YES |
| Seller DTO leakage | 0 |
| Seller direct API imports | 0 |
| Domain tests PASS | YES |

**SELLER PLATFORM FOUNDATION = READY**

## Next

EPIC 86 Seller Experience (visual implementation) may proceed. No additional architecture EPICs required unless product scope changes.
