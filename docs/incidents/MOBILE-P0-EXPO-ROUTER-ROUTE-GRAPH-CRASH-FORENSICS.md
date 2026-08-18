# P0 — Expo Router Route-Graph JS Crash Forensics (0.1.5-alpha)

**Generated:** 2026-08-17  
**Branch:** `cursor/mobile-p0-physical-crash-forensics-d03e`  
**APK:** `lot-android-alpha-0.1.5.apk` (SHA256 `a468413a…`)  
**Source map:** `apps/mobile/android/app/build/generated/sourcemaps/react/release/index.android.bundle.map`  
**Rule:** Evidence only — no code changes in this report.

---

## Firebase boot trail (observed)

```
JS_BUNDLE_START
→ startup crash handlers installed
→ index.js
→ ROUTER_ENTRY
→ expo-router/entry loaded
→ Running "main"
→ CRASH (before ROOT_LAYOUT_INIT)
```

**Absent (confirmed resolved):** AnyTypeProvider, ErrorUtils.getGlobalHandler

**Present:**

1. `TypeError: Cannot read property 'colors' of undefined` — PRIMARY
2. `TypeError: Cannot read property 'ErrorBoundary' of undefined` — in `getQualifiedRouteComponent` → `fromImport`

---

## PART 1 — Route graph audit (`apps/mobile/app/`)

| Route file | Default export | ErrorBoundary export | Top-level side effects | Key imports (route graph) |
|---|---|---|---|---|
| `_layout.tsx` | `RootLayout` | **none** | `bootStage("ROOT_LAYOUT_INIT")` inside render; `bootMark("app/_layout module evaluated")` at EOF | `colors` from `theme/tokens`, Stack, lazy NetworkBanner/UpdateHost |
| `index.tsx` | `BootScreen` | **none** | `bootMark("app/index module evaluated")`; **`StyleSheet.create` uses `colors` at module scope** | `colors, spacing, typography` from `theme/tokens` |
| `login.tsx` | `LoginScreen` | **none** | none | `LoginExperience` (DS colors via feature) |
| `build-info.tsx` | `BuildInfoRoute` | **none** | none | `BuildInfoScreen` → `theme/tokens` |
| `startup-diagnostics.tsx` | `StartupDiagnosticsRoute` | **none** | none | `StartupDiagnosticsScreen` → `theme/tokens` |
| `cart.tsx` | `CartScreen` | **none** | none | `CartExperience` → DS tokens |
| `checkout.tsx` | `CheckoutScreen` | **none** | none | `CheckoutExperience` → DS tokens |
| `product/[id].tsx` | `ProductScreen` | **none** | none | `ProductDetailExperience` → DS tokens |
| `order/[id].tsx` | `OrderDetailScreen` | **none** | none | `OrderDetailExperience` → DS tokens |
| `(tabs)/_layout.tsx` | `TabsLayout` | **none** | none | **`colors` from `theme/tokens`**, `TabBarIcon`/`TabBarBadge` from `components/ui` |
| `(tabs)/index.tsx` | `BuyerHomeScreen` | **none** | none | `BuyerHomeExperience` → DS |
| `(tabs)/catalog.tsx` | `CatalogScreen` | **none** | none | `CatalogDiscoveryExperience` → DS |
| `(tabs)/favorites.tsx` | `FavoritesScreen` | **none** | none | `spacing` from `theme/tokens`; `ProductCard` → `theme/tokens` |
| `(tabs)/orders.tsx` | `OrdersScreen` | **none** | none | `OrdersExperience` → DS |
| `(tabs)/profile.tsx` | `ProfileScreen` | **none** | none | **`StyleSheet.create` uses `colors` at module scope** |
| `(tabs)/wallet.tsx` | `WalletScreen` | **none** | none | **`StyleSheet.create` uses `colors` at module scope** |
| `(tabs)/seller-home.tsx` | `SellerHomeScreen` | **none** | none | **`StyleSheet.create` uses `colors` at module scope** |
| `(tabs)/seller-products.tsx` | `SellerProductsScreen` | **none** | none | `CommerceSearchBar` → `theme/tokens` |
| `(tabs)/seller-sales.tsx` | re-export of `./orders` | **none** | none | Valid default via `./orders` — **not a missing export** |

### Route-graph findings

| Check | Result |
|---|---|
| Missing default export | **None** — all routes have valid default exports |
| Missing ErrorBoundary export | **All routes** — none export `ErrorBoundary` (Expo Router optional) |
| Barrel returning undefined | **`(tabs)/seller-sales.tsx`** re-exports `./orders` — valid, not undefined |
| Invalid lazy route config | **None found** in `app/` |
| Circular deps affecting routes | **YES** — see Part 6 |

---

## PART 2 — `.colors` search (mobile codebase)

No literal `theme.colors` / `tokens.colors` / `sellerTheme.colors` property access in TS source.

**Runtime-relevant `colors` usage during route-graph construction:**

| Category | Files | Executes at module load? |
|---|---|---|
| **`theme/tokens` re-export** | `src/theme/tokens.ts` → `../design-system` barrel | **YES** — any `import { colors } from theme/tokens` |
| **Route `_layout`** | `app/_layout.tsx:14,65-67` | import **YES**; property access in render |
| **Route boot screen** | `app/index.tsx:20,146-151` | import **YES**; **`StyleSheet.create` YES** |
| **Tabs layout** | `app/(tabs)/_layout.tsx:9,31-42` | import **YES** |
| **Legacy UI barrel** | `src/components/ui/*.tsx` (buttons, cards, ProductCard, TabBarIcon…) | **YES** — many use `StyleSheet.create({ … colors.* })` at module scope |
| **DS components** | `src/design-system/components/*` | import `../tokens/colors` directly — OK unless pulled via **`design-system/index.ts` barrel** |

**Critical path:** `theme/tokens.ts` does **not** import `./tokens/colors` directly. It re-exports the **full component barrel**:

```5:24:apps/mobile/src/theme/tokens.ts
export {
  brand, accent, semantic, surface, text, border,
  colors, typography, spacing, radii, shadows, elevation, blur, opacity, borders, gradients, layout,
  DESIGN_SYSTEM_VERSION,
} from "../design-system";
```

Loading `colors` from `theme/tokens` eagerly evaluates `design-system/index.ts`, which re-exports **all DS components**.

---

## PART 3 — Source-map proof (release bundle)

**Tool:** `npx metro-symbolicate android/app/build/generated/sourcemaps/react/release/index.android.bundle.map`

### PRIMARY — `colors of undefined`

| Field | Value |
|---|---|
| Firebase message | `TypeError: Cannot read property 'colors' of undefined` |
| Release bundle column (Hermes `1:column`) | **`335138`** (first `colors.*` access in circular chain) |
| **Source file** | **`apps/mobile/src/components/ui/buttons.tsx`** |
| **Line : column** | **`82 : 11`** |
| **Symbol** | module-init / `StyleSheet.create` → `primary: { backgroundColor: colors.orange }` |

Supporting columns in same init chain:

| Bundle col | Source |
|---|---|
| 335070 | `buttons.tsx:74` — `StyleSheet.create` |
| 335385 | `theme/tokens.ts:5` — re-export block start |
| 336072 | `theme/tokens.ts:24` — re-export block end |
| 336120+ | `design-system/index.ts` — component barrel exports |

**Mechanism (compiled interop):** Metro/Babel compiles `export { colors } from "../design-system"` into getters that read `_designSystem.colors`. During the circular import, `_designSystem` is **still undefined**, so the getter throws **`Cannot read property 'colors' of undefined`** — matching Firebase exactly (not `'orange'`, which would indicate a resolved but empty `colors` object).

### SECONDARY — `ErrorBoundary of undefined`

| Field | Value |
|---|---|
| Firebase stack | `getQualifiedRouteComponent@1:869559` |
| **Source file** | **`node_modules/expo-router/build/useScreens.js`** |
| **Line : symbol** | **`141 : fromImport`** |
| Code | `function fromImport(value, { ErrorBoundary, SuspenseFallback, ...component })` |

When a route `loadRoute()` returns **`undefined`** (module failed to attach exports after the primary throw), destructuring/access throws **`ErrorBoundary of undefined`**.

---

## PART 4 — ErrorBoundary failure analysis

| Question | Answer |
|---|---|
| **Which route?** | Route being qualified by Expo Router immediately after the primary module-init failure — typically **`app/_layout`** or **`app/index`** (first routes loaded in sync import mode). No route exports `ErrorBoundary`; failure is **not** a missing route ErrorBoundary export. |
| **Which imported module?** | Failed route module object is **`undefined`** when passed to `fromImport` |
| **Why undefined?** | Primary `colors` exception during `require()` left the route module incomplete / undefined in Metro cache |
| **Missing ErrorBoundary or whole module?** | **Whole route module undefined** — not a missing `ErrorBoundary` export |

Expo Router `fromImport` (expo-router `useScreens.js:141`) expects `loadRoute()` to return a module object. It is **not** looking for a route-level `ErrorBoundary` export in this crash — the module object itself is missing.

---

## PART 5 — Causality

**Verdict: A — PRIMARY then SECONDARY**

| Evidence | Interpretation |
|---|---|
| Boot trail reaches `ROUTER_ENTRY` / `Running "main"` but **not** `ROOT_LAYOUT_INIT` | Crash during **route module evaluation**, before `RootLayout` render |
| Primary error mentions **`colors`** | Matches `_designSystem.colors` getter in `theme/tokens` re-export chain |
| Secondary at `fromImport` line 141 | Router continues qualifying routes after global handler logs primary error |
| Timestamps (Firebase) | Primary logged first; Router fatal follows |

They are **not** independent crashes.

---

## PART 6 — Design-system audit (EPIC 84/85)

### Circular dependencies (madge, release graph)

```
1) theme/tokens.ts
   → design-system/index.ts
   → design-system/components/AuthErrorCard.tsx
   → components/ui/buttons.tsx
   → theme/tokens.ts

2) theme/tokens.ts
   → design-system/index.ts
   → design-system/components/BuyerHomeHeader.tsx
   → components/ui/TabBarBadge.tsx
   → theme/tokens.ts
```

### Export mismatch (root design issue)

| Expected by legacy callers | Actual EPIC 84 structure |
|---|---|
| `import { colors } from "../theme/tokens"` | `theme/tokens.ts` re-exports **entire** `design-system/index.ts` |
| Thin token shim | Barrel pulls **AuthErrorCard**, **BuyerHomeHeader**, … which pull **legacy `components/ui/*`** back into `theme/tokens` |

**No sellerTheme / designSystem named export bug found** — failure is **barrel + circular dependency**, not wrong identifier spelling.

---

## PART 7 — Production bundle parity (why TS passes, release fails)

| Layer | Behavior |
|---|---|
| **TypeScript** | Statically resolves types across re-exports; **does not execute** Metro runtime `require` order |
| **Release bundle** | Eager sync route loading (`EXPO_ROUTER_IMPORT_MODE=sync` in release) evaluates **all route modules** and **all barrel exports** |
| **Root cause class** | **Circular dependency + barrel export mismatch** — `theme/tokens` → full DS index → components → `theme/tokens` |
| **Not caused by** | Clipboard, SecureStore, ErrorUtils, New Architecture, Hermes engine bug |

Dev/typecheck PASS is **insufficient** — proven by release source map on APK-matching bundle (2,706,940 bytes).

---

## PART 8 — Minimal proven fix (NOT APPLIED — evidence gate)

**Change `theme/tokens.ts` to re-export tokens only** — never the component barrel:

```diff
-} from "../design-system";
+} from "../design-system/tokens/colors";
+  typography, spacing, radii, … from individual token files OR new `design-system/tokens/index.ts`
```

**Do not** import `design-system/index.ts` from `theme/tokens.ts`.

Optional hardening: split `design-system/index.ts` into `tokens/index.ts` + `components/index.ts` so legacy UI cannot pull components when asking for colors.

---

## PART 9 — Regression gate (NOT IMPLEMENTED — spec)

Release-level smoke test should:

1. Metro-export **release** bundle + source map (same as `assembleRelease`)
2. Resolve every `app/**` route via Expo Router context (sync mode)
3. Assert each route module has `default` export
4. Assert `import { colors, spacing, typography } from theme/tokens` does not throw
5. Fail on madge circular paths touching `theme/tokens.ts`

---

## PART 10 / 11 — Candidate build & Firebase

**Not executed** — blocked on Part 8 fix per “evidence first” rule.

After fix: rebuild candidate, new SHA256, FTL Pixel 5 / API 30 / Robo, require boot trail through `ROOT_LAYOUT_INIT`.

---

## FINAL REPORT

```
FIRST EXCEPTION:
  TypeError: Cannot read property 'colors' of undefined

SOURCE FILE:
  apps/mobile/src/components/ui/buttons.tsx:82
  (initiated by apps/mobile/src/theme/tokens.ts:5 re-export chain)

UNDEFINED VALUE:
  design-system barrel module object (_designSystem) during circular import
  when resolving `colors` re-export getter from theme/tokens → design-system/index

ROUTE:
  Route graph init via app/_layout.tsx (import theme/tokens:14)
  and/or app/index.tsx (import theme/tokens:20 + module-scope StyleSheet)
  Crash occurs before any screen renders

ERRORBOUNDARY FAILURE:
  SECONDARY — expo-router useScreens.js:141 fromImport;
  route module undefined after primary throw

ROOT CAUSE:
  theme/tokens.ts re-exports the full design-system component barrel, creating
  circular dependencies (tokens → DS index → AuthErrorCard/BuyerHomeHeader →
  components/ui → theme/tokens). In release sync route loading, the partially-
  initialized barrel is undefined when the colors re-export getter runs.

FIX:
  Re-point theme/tokens.ts to token-only modules (no design-system/index barrel).
  Minimal 1-file change possible; optional barrel split for defense in depth.

RELEASE BUNDLE ROUTE-GRAPH GATE:
  NOT IMPLEMENTED (spec in Part 9)

FIREBASE:
  FAIL (observed on 0.1.5-alpha — colors + ErrorBoundary; pre-ROOT_LAYOUT_INIT)

P0:
  OPEN
```
