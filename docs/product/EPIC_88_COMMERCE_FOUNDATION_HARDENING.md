# EPIC 88 — Commerce Foundation Hardening

> **Status:** AUDIT COMPLETE (no code changes)  
> **Baseline:** Closed Alpha `0.1.5-alpha` (token-fix SHA `174295aa…`)  
> **Scope:** `apps/mobile` — dependency, components, navigation, performance, API, design system, accessibility  
> **Constraint:** Do not touch startup code unless required for compatibility. All startup P0 incidents are CLOSED.

---

## Executive Summary

EPIC 88 is a **read-only architectural audit** performed before Seller Experience implementation. The goal is to reduce future technical debt so every new screen is faster, cleaner, and easier to maintain.

| Area | Verdict | Top finding |
|------|---------|-------------|
| Dependencies | **PASS (cycles)** | 0 circular deps; dual UI stacks + barrel abuse remain |
| Shared components | **OPPORTUNITY** | High-value extractions identified; avoid over-abstraction |
| Navigation | **ISSUES** | Broken deep links; seller-sales reuses buyer orders |
| Performance | **MEDIUM RISK** | Tab badge API storm; N+1 enrichment; no FlashList |
| API layer | **MEDIUM RISK** | No request cache; dead endpoints; duplicated fetches |
| Design system | **PARTIAL** | Buyer commerce DS-compliant; seller/profile/wallet legacy |
| Accessibility | **GAPS** | No dynamic type policy; sub-44pt targets; missing labels |

**Design standard reference:** No EPIC 85 document exists in-repo. EPIC 88 audits against **EPIC 84 Product Design Standard v1** (`docs/product/EPIC_84_WAVE_0_DESIGN_SYSTEM.md`), which is the canonical design system baseline for Closed Alpha commerce flows.

---

## Part 1 — Dependency Audit

### Method

- `npx madge --circular --extensions ts,tsx src/` → **0 cycles** (165 files processed)
- Import graph analysis across `components/ui`, `design-system`, `theme/tokens`, feature modules
- Manual duplication scan

### Circular dependencies

| Status | Detail |
|--------|--------|
| **PASS** | 0 circular dependencies after P0 token fix (`theme/tokens.ts` → `design-system/tokens/*` only) |
| **Guarded** | `npm run mobile:p0:token-cycle-gate`, `npm run mobile:p0:route-graph-gate` |

Historical P0 cycle (CLOSED): `theme/tokens` → `design-system/index` → components → `theme/tokens`. See `docs/incidents/MOBILE-P0-EXPO-ROUTER-ROUTE-GRAPH-CRASH-FORENSICS.md`.

### Barrel abuse

| Barrel | Consumers | Risk |
|--------|-----------|------|
| `components/ui/index.ts` | ~26 files import from barrel | Pulls buttons, cards, shimmer, tab icons on every import |
| `design-system/index.ts` | 0 direct consumers (safe) | **Dangerous if imported** — would reintroduce route-graph risk |
| `theme/tokens.ts` | Legacy + DS migration path | Correct: re-exports tokens only |

**Recommendation:** Replace `from "@/components/ui"` barrel imports with direct file imports or migrate consumers to `design-system/*`.

### Dual UI stacks

Two parallel component systems coexist:

```
Legacy                          Design System
─────────────────────────────   ─────────────────────────────
components/ui/*                 design-system/components/*
theme/tokens (re-export)        design-system/tokens/*
```

| Pattern | Legacy locations | DS locations |
|---------|------------------|--------------|
| Product cards | `ProductCard.tsx`, `SellerProductCard.tsx` | `CatalogProductCard.tsx`, `CartLineCard.tsx` |
| Search bars | `CommerceSearchBar.tsx` | `CatalogSearchField.tsx`, `BuyerHomeHeader` |
| Category rails | (inline in buyer home) | `CategoryRail.tsx`, `CatalogCategoryRail.tsx` |
| Buttons | `buttons.tsx`, `GhostButton` | `PrimaryCTA.tsx`, `IconButton.tsx` |
| Skeletons | `Shimmer.tsx` | `*Skeleton.tsx` per screen |
| Empty states | `feedback.tsx` | `CartEmptyState.tsx`, `OrdersEmptyState.tsx` |

**DS → legacy inversion (8 files):** Design-system components import legacy `Shimmer`, `GhostButton`, or `TabBarBadge` from `components/ui`. This inverts the intended dependency direction.

### Duplicated utilities

| Utility | Locations | Notes |
|---------|-----------|-------|
| `loadAppConfig()` | Called per card render in `ProductCard`, `CatalogProductCard`, `SellerProductCard`, `PdpGallery` | Should be module-level or context |
| `resolveImageUrl()` | Duplicated image URL logic across cards | Consolidate in `lib/image-url.ts` |
| `enrichSeller()` | Identical in `useOrdersData.ts` and `useOrderDetailData.ts` | Extract shared helper |
| `CategoryItem` type | Defined in both `useBuyerHomeData.ts` and `useCatalogDiscovery.ts` | Single shared type |
| Offline banner logic | `NetworkBanner.tsx` vs `connectivity-check.ts` | Different reachability semantics |

### Duplicated hooks

| Hook pattern | Files | Issue |
|--------------|-------|-------|
| Inline `useEffect` fetch | `favorites.tsx`, `wallet.tsx`, `seller-home.tsx`, `seller-products.tsx` | No shared hook; inconsistent error/offline handling |
| Badge refresh | `useTabBadges.ts` | Duplicates cart/favorites/home API calls |
| Favorite toggle | Direct calls from `BuyerHomeExperience`, `CatalogDiscoveryExperience`, recommendation rails | No shared mutation hook; badge stale until tab focus |

### Duplicated UI patterns

| Pattern | Count | Examples |
|---------|-------|----------|
| Product card layouts | 3 | `ProductCard`, `CatalogProductCard`, `SellerProductCard` |
| Search + history | 2 | `CommerceSearchBar`, `CatalogSearchField` + buyer home header |
| Category horizontal rails | 3 | `CategoryRail`, `CatalogCategoryRail`, buyer home inline |
| Section headers | 2 | `CommerceSectionHeader` (DS), inline Text in legacy |
| Error cards | 2 | `SectionErrorCard` (DS), `ErrorState` (legacy feedback) |
| Offline states | 4+ | Per-feature inline handling; no `CommerceOfflineState` |

### Duplicated telemetry

| Event area | Files emitting `postTelemetry` |
|------------|-------------------------------|
| Boot | `startup-telemetry.ts`, `run-startup-pipeline.ts` |
| Login | `app/login.tsx` |
| Commerce | `useCartData`, `useCheckoutData`, `useOrdersData`, `useOrderDetailData`, `useProductDetailData` |
| Update | `use-update-check.ts`, `UpdateGate.tsx`, `profile.tsx` |

**Gaps:** Favorite/cart mutations from home/catalog UI emit no telemetry. `errorCode` field overloaded as metadata in checkout/update events.

### Duplicated loading / error / skeleton patterns

| Screen | Skeleton | Error | Loading state name |
|--------|----------|-------|-------------------|
| Login | None (fade-in) | `AuthErrorCard` | `submitting` |
| Buyer Home | Per-section shimmer | `SectionErrorCard` per section | `initialLoading` per section |
| Catalog | `CatalogGridSkeleton` | Inline error | `initialLoading`, `loadingMore` |
| PDP | `PdpSkeleton` | Full-screen error | `loading` |
| Cart | `CartSkeleton` | `SectionErrorCard` | `loading` |
| Checkout | `CheckoutSkeleton` | Inline | `loading`, `quoteLoading` |
| Orders | `OrdersSkeleton` | `SectionErrorCard` | `loading` |
| Favorites | `SkeletonGrid` (legacy) | **None** | `loading` (broken on refresh) |
| Wallet | None | **None** | One-shot |
| Seller tabs | Legacy shimmer | Inline | `loading` |

### Duplicated spacing / colors / typography

| Token source | Usage |
|--------------|-------|
| `design-system/tokens/*` | DS components (correct) |
| `theme/tokens` re-export | Legacy components + some features |
| Hardcoded HEX | `#FFFFFF`, `#DC2626`, `#EAEAEA` in DS components (`PdpStickyCta`, `CatalogProductCard`, `CartStickyCheckoutCta`, etc.) |
| Inline numeric spacing | Legacy `components/ui/*`, seller/profile/wallet screens |

**Rule violation:** EPIC 84 Product Design Standard v1 forbids random HEX and arbitrary spacing. ~6 DS files contain hardcoded colors.

---

## Part 2 — Shared Commerce Components

Principle: **Extract only if complexity decreases.** Never abstract for abstraction's sake.

### High-value extraction candidates

| Component / Module | Screens | Rationale | Avoid? |
|--------------------|---------|-----------|--------|
| `CommerceOfflineState` | All commerce screens | 4+ inline offline patterns; single DS component reduces branching | — |
| Recommendation rail internals | Home, Cart, Orders | 3 near-identical horizontal product rails | Do not unify sticky bars |
| `CheckoutSectionCard` | Checkout | Repeated section wrapper pattern | — |
| `useSearchHistory` | Home, Catalog | Duplicate search history logic | — |
| `useStickyScrollPadding` | PDP, Cart, Checkout | Shared sticky CTA padding math | — |
| Empty state unification | Orders, Favorites, Cart, Seller | `CartEmptyState` exists; extend pattern | Do not merge seller/buyer empty copy |
| `FavoritesExperience` feature module | Favorites tab | Move inline fetch to hook matching commerce pattern | — |
| `ProfileExperience` feature module | Profile tab | Legacy UI + mixed concerns | — |

### Do NOT extract (over-abstraction risk)

| Proposed abstraction | Reason to skip |
|---------------------|----------------|
| Unified `ProductCard` | DS `CatalogProductCard` vs legacy `ProductCard` serve different layouts (grid vs rail vs compact) |
| Unified category rail | Home vs catalog contexts differ (filter vs navigate) |
| Generic `CommerceScreen` wrapper | Would hide screen-specific loading/error semantics |
| Single mega-hook for all data | Hooks are well-scoped per feature; problem is cache dedup not hook count |

### Screen-by-screen pattern matrix

| Screen | DS coverage | Shared patterns to reuse |
|--------|-------------|---------------------------|
| Login | ✅ Full | `AuthErrorCard`, `PrimaryCTA`, `TextField` |
| Home | ✅ Mostly | `BuyerHomeHeader`, `CategoryRail`, `ProductCard` (legacy) |
| Catalog | ✅ Full | `CatalogSearchField`, `CatalogProductCard`, `CatalogSortSheet` |
| PDP | ✅ Full | Full DS block set; sticky CTA pattern |
| Cart | ✅ Full | `CartLineCard`, `CartSummaryBar`, recommendation rail |
| Checkout | ✅ Full | Section cards, delivery/payment blocks |
| Orders | ✅ Full | `OrderCard`, `OrdersEmptyState`, recommendation rail |
| Favorites | ❌ Legacy | Needs migration to DS grid + hook |
| Profile | ❌ Legacy | Mixed legacy UI, `Alert.alert` for actions |
| Wallet | ❌ Legacy | No DS, no skeleton, no error state |
| Seller Home | ❌ Legacy | In-memory offline cache only |
| Seller Products | ❌ Legacy | `SellerProductCard`, inline fetch |
| Seller Sales | ❌ Broken | Re-exports buyer `orders.tsx` |

---

## Part 3 — Navigation Audit

### Route inventory (19 files)

```
app/
├── _layout.tsx              Stack root
├── index.tsx                Boot splash → redirect
├── login.tsx
├── cart.tsx                 Stack (from tabs)
├── checkout.tsx             Stack
├── product/[id].tsx         Stack
├── order/[id].tsx           Stack
├── build-info.tsx
├── startup-diagnostics.tsx
└── (tabs)/
    ├── _layout.tsx          Tab navigator
    ├── index.tsx            Buyer home
    ├── catalog.tsx
    ├── orders.tsx
    ├── favorites.tsx
    ├── profile.tsx
    ├── wallet.tsx
    ├── seller-home.tsx
    ├── seller-products.tsx
    └── seller-sales.tsx     ← re-exports orders.tsx
```

### Unused / duplicate / dead routes

| Route | Status | Detail |
|-------|--------|--------|
| `seller-sales.tsx` | **Duplicate** | `export default OrdersScreen` from `./orders` — wrong data for seller |
| `build-info.tsx` | Low traffic | Diagnostics only; not in tab bar |
| `startup-diagnostics.tsx` | Diagnostics | Hidden; OK |
| `fetchNavigation` endpoint | **Dead** | Navigation hardcoded in `(tabs)/_layout.tsx` |

### Deep link audit

Parser: `src/deep-links/parse-lot-link.ts` → router: `src/deep-links/route-deep-link.ts`

| Deep link | Expected | Actual | Status |
|-----------|----------|--------|--------|
| `lot://home` | Buyer home | `/(tabs)` | ✅ |
| `lot://catalog` | Catalog tab | `/(tabs)/catalog` | ✅ |
| `lot://product/{id}` | PDP | `/product/{id}` | ✅ |
| `lot://cart` | Cart stack | `/cart` | ✅ |
| `lot://order/{id}` | Order detail | **`/(tabs)/orders` (list)** | ❌ **Broken** |
| `lot://seller/{id}` | Seller catalog filtered | **`/(tabs)/catalog` (ignores id)** | ❌ **Broken** |
| `lot://wallet` | Wallet tab | `/(tabs)/wallet` | ✅ |
| `lot://profile` | Profile tab | `/(tabs)/profile` | ✅ |

Handler deferred until post-bootstrap (correct for startup safety).

### Back behavior

| Flow | Behavior | Issue |
|------|----------|-------|
| Tab → Stack (PDP/cart/checkout) | Stack push with fade animation | Fade adds ~200–300ms perceived latency |
| Profile mode switch | `router.replace` to seller/buyer home | Full tab remount |
| Login redirect | `router.replace` after auth | Correct |
| Deep link unauthenticated | Stores pending link → login | Correct |

### Memory / navigation performance

| Pattern | Impact | File |
|---------|--------|------|
| `useTabBadges` on every tab focus | 3 API calls per tab switch | `hooks/useTabBadges.ts` |
| `useFocusEffect` full reload | Seller tabs refetch on every focus | `seller-home.tsx`, `seller-products.tsx` |
| Fade animation on tabs + stack | Slower perceived navigation | `_layout.tsx`, `(tabs)/_layout.tsx` |
| Eager route graph | Release bundle loads all routes at startup | `expo-router/entry` (do not modify per constraint) |

---

## Part 4 — Performance Audit

### First render

| Screen | Blocking work on first paint |
|--------|------------------------------|
| Boot | 5-stage pipeline: bootstrap → remote config → update → session → navigation |
| Buyer home | 4 parallel loads: categories, popular (split 3 ways), newest, recent views |
| Catalog | Categories + first catalog page |
| Orders | `fetchOrders` + up to 8× `fetchOrderDetail` enrichment |
| Cart | `fetchCart` + N× `fetchProduct` per line |
| Tab badges (any tab) | +3 API calls on focus |

**Post-boot deferral (good):** `NetworkBanner`, `UpdateHost` gated on `bootstrapped`; lazy `StartupErrorScreen`.

### List rendering

| Location | Virtualization | Tuning |
|----------|---------------|--------|
| `CatalogDiscoveryExperience.tsx` | `FlatList` 2-col | `removeClippedSubviews`, `initialNumToRender=8`, memoized `renderItem` |
| `favorites.tsx` | `FlatList` 2-col | No perf props; inline `renderItem` |
| `seller-products.tsx` | `FlatList` 1-col | No perf props |
| `PdpGallery.tsx` | Horizontal `FlatList` | `getItemLayout` ✓ |
| `BuyerHomeExperience.tsx` | **`ScrollView` + `.map()`** | Up to 6 rails + grid — all mounted |
| `OrdersExperience.tsx` | **`ScrollView` + `.map()`** | Grows with order history |
| `CartExperience.tsx` | **`ScrollView` + `.map()`** | N lines = N cards |

**FlashList:** Not installed. Zero usage. **P1 opportunity** for catalog grid (largest scrollable list).

### Memoization gaps

| Component | Status | Impact |
|-----------|--------|--------|
| DS components (36) | `memo()` ✓ | Good |
| `ProductCard` | Not memoized | Heavy home/favorites usage |
| `SellerProductCard` | Not memoized | Seller products list |
| `TabBarIcon` / `TabBarBadge` | Not memoized | Spring animation on every focus |
| `CartExperience` callbacks | Inline lambdas | Defeats `memo` on `CartLineCard` |
| Catalog `listHeader` useMemo | Depends on entire `state` object | Invalidates on any state change |

### Rerender hotspots

1. Tab layout subscribes to full `badges` object → rerender on any badge change
2. `tabIcon()` factory recreated every render in `(tabs)/_layout.tsx`
3. `NetworkBanner` polls every 5s → potential tree rerender
4. Buyer home: each section load triggers parent rerender

### Images

| Component | Library | `cachePolicy` |
|-----------|---------|---------------|
| DS cards (catalog, cart, orders) | `expo-image` | `memory-disk` ✓ |
| Legacy `ProductCard`, `SellerProductCard` | `expo-image` | **Missing** |
| Boot/login | RN `Image` (local assets) | OK |

No `placeholder`, `blurhash`, or `recyclingKey` anywhere.

### Layout shifts

**Mitigations:** Dedicated skeletons per screen; fixed image heights on catalog cards; sticky CTA padding reserved.

**Remaining risks:** Catalog skeleton → FlatList container swap; buyer home sections appear independently; tab badge appearance shifts icon layout; network banner pushes content down post-boot.

### Bundle size

- Lean runtime deps: Expo 57, React 19, RN 0.86, zustand, expo-image — no Reanimated/FlashList
- Metro `watchFolders` includes full monorepo root — slows resolution
- `@expo/vector-icons/MaterialCommunityIcons` in 40+ files
- No bundle analysis script in `apps/mobile/package.json`
- Release bundle ~2.7MB cited in P0 forensics doc

### Fonts and icons

- **Fonts:** System font only — no custom font loading (low startup cost)
- **Icons:** MaterialCommunityIcons throughout; category icons regex-mapped in `CategoryRail`

### Navigation latency

| Factor | Impact |
|--------|--------|
| Fade transitions (stack + tabs) | +200–300ms perceived |
| Tab badge refetch on focus | Network latency every tab switch |
| Orders N+1 enrichment | Up to 8 parallel detail fetches |
| Cart/checkout N+1 | 1 + N product fetches per load |

---

## Part 5 — API Audit

### Architecture

```
Screens/Experiences → Feature hooks (use*Data) → api/endpoints.ts → api/client.ts → Backend
Boot pipeline ──────────────────────────────────→ api/endpoints.ts
Tab badges ─────────────────────────────────────→ api/endpoints.ts (duplicate path)
```

No React Query/SWR. No HTTP-level cache. `apiRequest` retries only on 401 token refresh.

### Endpoint inventory (24 wrappers)

See Part 5 detail in subagent report. Key findings:

| Category | Status |
|----------|--------|
| Auth | ✅ Consistent (`client.ts`) |
| Boot/platform | ✅ Used; 2 dead endpoints (`fetchMobileConfig`, `fetchNavigation`) |
| Catalog/products | ⚠️ Mixed mobile/web paths |
| Cart/checkout | ⚠️ N+1 enrichment |
| Orders/favorites | ⚠️ N+1 + duplicate fetches |

### Consistency gaps

| Issue | Severity |
|-------|----------|
| Mixed API namespaces (`/api/mobile/*` vs `/api/cart`, `/api/orders`) | Medium |
| `fetchBuyerHome` defined but home ignores it (only tab badges use `orders.active`) | Medium |
| Loading state naming inconsistent (`initialLoading` vs `loading` vs `refreshing`) | Low |
| `ApiClientError.retryable` parsed but never used for auto-retry | Medium |
| `error.code` discarded in feature hooks (message only) | Medium |

### Pagination gaps

| Endpoint | Client support | Usage |
|----------|---------------|-------|
| `fetchCatalog` | Cursor pagination | Full in catalog discovery |
| `fetchSellerProducts` | Cursor param exists | Page 1 only in seller products |
| `fetchOrders` | None | Full list assumed |
| Deals filter | Client-side on current page | Incomplete for paginated deals |

### Offline / cache

| Data | Cache | Offline behavior |
|------|-------|-----------------|
| Product detail | SecureStore (24 entries) | Fallback to cache |
| Orders list/detail | SecureStore | Fallback to cache |
| Cart/checkout | None | Hard block |
| Buyer home/catalog | None | Sections stall empty |
| Seller home | In-memory Map | Lost on restart |
| Favorites/wallet | None | No handling |

### Duplicated requests (highest impact)

| Pattern | Locations | Frequency |
|---------|-----------|-----------|
| `fetchCart` | Tab badges, cart hook, checkout hook | Every tab focus + screen mount |
| `fetchFavorites` | Tab badges, cart hook, favorites screen | Every tab focus + screen mount |
| `fetchCatalog({ sort: "popular" })` | Home, orders recs, cart recs, PDP related | 4+ independent calls |
| `fetchCategories` | Buyer home + catalog discovery | Both tabs can mount |
| `fetchProduct` N+1 | Cart, checkout enrichment | 1 + N per load |
| `fetchOrderDetail` N+1 | Orders list enrichment | Up to 8 parallel per load |

**Highest-frequency duplicate:** `useTabBadges` — 3 parallel API calls on **every tab focus**.

### Dead endpoints

| Function | Path | Called? |
|----------|------|---------|
| `fetchMobileConfig` | `GET /api/mobile/config` | Never |
| `fetchNavigation` | `GET /api/mobile/navigation` | Never |

Backend routes exist but client ignores them. Boot uses `fetchRemoteConfig` instead.

---

## Part 6 — Design System Audit

**Reference:** EPIC 84 Product Design Standard v1 (EPIC 85 not found — EPIC 84 Wave 0 is canonical).

### Token architecture

| Token | File | Status |
|-------|------|--------|
| Colors | `tokens/colors.ts` | ✅ Semantic palette |
| Typography | `tokens/typography.ts` | ✅ Scale defined |
| Spacing | `tokens/spacing.ts` | ✅ 4–48 grid |
| Radius | `tokens/radius.ts` | ✅ |
| Elevation | `tokens/elevation.ts` | ✅ |
| Motion | `tokens/motion.ts` | ✅ Defined; fade used on nav |
| Gradients | `tokens/gradients.ts` | ✅ |

### Component registry

Registry at `design-system/components/registry.ts`. Coverage ~77.6% ready per Wave 0 audit.

| Category | DS component | Legacy equivalent | Gap |
|----------|-------------|-------------------|-----|
| Buttons | `PrimaryCTA`, `IconButton` | `buttons.tsx` | Legacy still used in seller/profile |
| Cards | `CatalogProductCard`, `CartLineCard`, `OrderCard` | `ProductCard`, `cards.tsx` | Dual stacks |
| Search | `CatalogSearchField` | `CommerceSearchBar` | Both active |
| Skeletons | Per-screen DS skeletons | `Shimmer.tsx` | DS skeletons import legacy Shimmer |
| Empty states | `CartEmptyState`, `OrdersEmptyState` | `feedback.tsx` | Favorites/wallet missing |
| Dialogs/Modals | `CatalogSortSheet` only | `Alert.alert` in seller/profile | **CRUD gate fail** |
| Toast | None | None | Missing |
| Bottom sheets | `CatalogSortSheet` | None elsewhere | Partial |

### Screen compliance matrix

| Screen | DS compliant | Hardcoded HEX | CRUD patterns |
|--------|-------------|---------------|---------------|
| Login | ✅ | None | None |
| Home | ⚠️ Mixed (legacy ProductCard) | None in DS parts | None |
| Catalog | ✅ | Favorite heart `#DC2626` | None |
| PDP | ✅ | Sticky CTA `#FFFFFF`, `#DC2626` | None |
| Cart | ✅ | Sticky bar `#FFFFFF` | None |
| Checkout | ✅ | Skeleton border `#EAEAEA` | None |
| Orders | ✅ | Timeline check `#FFFFFF` | None |
| Favorites | ❌ | Legacy spacing/colors | Basic grid |
| Profile | ❌ | Legacy throughout | None |
| Wallet | ❌ | Legacy throughout | None |
| Seller tabs | ❌ | Legacy cards | `Alert.alert` on seller products |

### Motion

- Screen transitions: fade on stack and tabs
- Card press: scale feedback on DS cards
- Tab icons: spring animation on focus
- Skeleton shimmer: legacy `Shimmer` component

### EPIC 84 alignment gaps for EPIC 85+ work

1. Replace hardcoded HEX in DS components with semantic tokens (favorite red → `colors.favorite` or similar)
2. Migrate favorites, profile, wallet, seller tabs to DS
3. Replace `Alert.alert` with DS dialog/bottom sheet
4. Add Toast component to registry
5. Eliminate DS → legacy imports (Shimmer, GhostButton, TabBarBadge)

---

## Part 7 — Accessibility Audit

### Touch targets

| Area | Status | Detail |
|------|--------|--------|
| Primary CTAs | ✅ | DS buttons ≥ 44dp |
| Catalog favorite button | ⚠️ | Icon button may be sub-44dp |
| Quick filter chips | ❌ | Sub-44dp height |
| Tab bar icons | ⚠️ | Badge overlay may reduce effective target |
| Profile action rows | ❌ | Some pressables unlabeled |

### Font scaling / dynamic type

| Check | Status |
|-------|--------|
| `allowFontScaling` policy | **Not defined** — no global policy |
| `maxFontSizeMultiplier` | **Absent** |
| Typography tokens | Fixed `fontSize` values — may overflow at large accessibility sizes |

**Risk:** Price rows and sticky CTAs may clip at 200%+ system font scale.

### Screen reader

| Component | `accessibilityLabel` | `accessibilityRole` |
|-----------|---------------------|---------------------|
| DS commerce cards | Partial (~50 files have a11y props) | Mixed |
| `CatalogProductCard` | ✅ Card-level label | ✅ |
| Legacy `ProductCard` | ❌ Missing card-level | Partial on buttons |
| Profile pressables | ❌ Unlabeled | Missing |
| Order timeline | ✅ Steps labeled | ✅ |

### Contrast

- Semantic color tokens generally meet WCAG for body text on light backgrounds
- Caption/secondary text on `surface.secondary` — verify at audit time on device
- Favorite heart red `#DC2626` on white — passes for icon accent

### Focus order

- No web-style focus order (mobile platform)
- VoiceOver/TalkBack traversal follows component tree order
- Modal/sheet focus trap: `CatalogSortSheet` — verify on device

### Recommendations

1. Define global `Text` wrapper with `maxFontSizeMultiplier={1.3}` for layout-critical UI
2. Add card-level a11y to legacy `ProductCard`
3. Label all profile/wallet pressables
4. Enforce 44dp minimum on chips and icon buttons
5. Physical TalkBack/VoiceOver pass on buyer + seller flows before Seller Experience EPIC

---

## Audit artifacts

| Artifact | Location |
|----------|----------|
| Release checklist (Part 8) | `docs/mobile/EPIC_88_RELEASE_CHECKLIST.md` |
| Technical debt backlog (Part 9) | `docs/product/EPIC_88_TECHNICAL_DEBT_BACKLOG.md` |
| Release gate runner | `npm run mobile:epic-88:gate` |
| P0 token cycle gate | `npm run mobile:p0:token-cycle-gate` |
| P0 route graph gate | `npm run mobile:p0:route-graph-gate` |
| P0 token architecture guard | `npm run mobile:p0:token-architecture-guard` |

---

## Next steps (post-audit — not in scope)

1. Review and prioritize backlog (`EPIC_88_TECHNICAL_DEBT_BACKLOG.md`)
2. Execute P0 items before Seller Experience EPIC
3. Run release checklist on every future Closed Alpha publish
4. Do **not** modify startup code unless a compatibility fix is required
