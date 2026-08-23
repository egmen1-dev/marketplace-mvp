# RC5 False-Positive Test Audit

**Recorded:** 2026-08-23  
**Context:** Physical Android testing on RC3 (`0.1.8-beta.1` / code 7) contradicted PR #139 "42/42 fixed" report. This audit documents tests that can PASS while runtime behavior remains broken.

## Executive summary

| Risk class | Count | Impact |
|------------|-------|--------|
| Static source grep | 12+ | High — code exists but APK stale or unwired |
| Mock-only API | 6 | High — handler never hits staging |
| Route definition only | 4 | Medium — navigation registered, tap unwired |
| Logic unit (no integration) | 8 | Medium — eligibility math correct, download broken |
| Staging smoke (server only) | 1 | Medium — backend OK, client auth/session may fail |

**Root finding:** `tests/mobile-interaction-audit.test.ts` validates **2 of 148** audited interactions. The `42/42 fixed` metric is a **documentation artifact**, not runtime proof.

---

## `tests/mobile-interaction-audit.test.ts`

| What it tests | What it does NOT test | Why it passes while physical fails | Replacement required |
|---------------|----------------------|-----------------------------------|-------------------|
| `isUpdateEligibleForInstall` downgrade math | Actual MRP publish state, download, install | RC3 device correctly rejects RC2 downgrade; no RC4/RC5 ever published | Staging update API contract + publish gate |
| `mapLotDeepLinkToHref` string mapping | Seller screen render, sellerId from product DTO | Route string exists; tap may be no-op on old APK | E2E: deep link → seller products visible |

---

## `tests/mobile-visual-polish.test.ts`

| What it tests | What it does NOT test | False-positive risk | Replacement |
|---------------|----------------------|---------------------|-------------|
| `CategoryRail` contains `<Chip` | Category filter API contract | Giant circles gone in source; RC3 APK still has old UI | APK bundle + physical screenshot |
| `BootSplash` in `index.tsx` | Boot actually shows branded splash | Source updated; old APK shows ActivityIndicator | Physical cold start |
| `ProductCard` favorite slot | Heart tap → API → persistence | Slot reserved; callback may be missing on surface | Integration: toggle favorite on Home + PDP |
| Russian `Кошелёк` in tabs | Profile menu completeness | Label exists; cart missing from menu until RC5 | Profile navigation matrix |

---

## `tests/mobile-navigation.test.ts` / `mobile-deep-links.test.ts`

| What it tests | What it does NOT test | False-positive risk | Replacement |
|---------------|----------------------|---------------------|-------------|
| Route table / href strings | `router.push` wired on ProductCard seller tap | Route registered; card may not call it | Staging smoke: seller catalog by sellerId |
| Deep link parser | Auth session before commerce | Parser OK; 401 silently fails add-to-cart | `MOBILE_COMMERCE_ACTION` telemetry + login redirect |

---

## `tests/mobile-post-auth-navigation.test.ts` / `mobile-session-resilience.test.ts`

| What it tests | What it does NOT test | False-positive risk | Replacement |
|---------------|----------------------|---------------------|-------------|
| Session storage helpers | `warmSessionFromStorage` on app mount (added RC5) | Helpers exist; cold start may skip warm | Kill app → restart → cart add without re-login |
| Token refresh logic | Bearer header on cart POST | Refresh unit test passes; header not attached | Staging `cart_add_bearer` with real token |

---

## `tests/mobile-android-update-contract.test.ts` / `mobile-update-state.test.ts`

| What it tests | What it does NOT test | False-positive risk | Replacement |
|---------------|----------------------|---------------------|-------------|
| Update payload JSON shape | MRP has versionCode > installed | Contract OK; API returns NO_UPDATE for code 7 | Publish RC5 to MRP; verify update_v8 returns OPTIONAL_UPDATE |
| `resolveUpdateState` | `Linking.openURL` install handoff | State machine correct; telemetry falsely fired `downloaded` before browser open (fixed RC5) | Profile update flow physical test |

---

## `scripts/mobile-staging-integration-smoke.ts`

| What it tests | What it does NOT test | False-positive risk | Replacement |
|---------------|----------------------|---------------------|-------------|
| Staging API cart/favorites with bearer token | Mobile client attaches token | Backend proven; client may not send auth | `tests/mobile-commerce-integration.test.ts` + device test |
| Catalog GET | categoryId filter semantics | List works; wrong param → empty results | `rc5-staging-runtime-smoke.mjs` category filter case |

---

## `scripts/mobile-interaction-audit.mjs`

| What it tests | What it does NOT test | False-positive risk | Replacement |
|---------------|----------------------|---------------------|-------------|
| Grep for handler symbols in source | Handler invoked at runtime | `useCommerceActions` exists in bundle; RC3 lacks it | APK forensic grep + physical tap |
| File existence checks | API contract alignment | File present; wrong category param | Catalog filter staging requests |

---

## New tests added in RC5

| File | Level | Coverage |
|------|-------|----------|
| `tests/mobile-commerce-integration.test.ts` | B — Integration | API param contracts, auth failure redirect, telemetry shape |
| `scripts/rc5-staging-runtime-smoke.mjs` | C — Staging | Real cart, favorites, category filter, seller catalog |
| `scripts/rc5-release-identity-gate.mjs` | Release | APK versionName/code/commit match expected |

---

## Policy (from RC5 onward)

```
CODE EXISTS        ≠ PASS
UNIT TEST PASSES   ≠ PASS
BUNDLE HAS SYMBOL  ≠ PASS
APK BUILDS         ≠ PASS
```

P0 interactions require: **code + wiring + API contract + staging evidence + APK provenance**, then physical device validation.
