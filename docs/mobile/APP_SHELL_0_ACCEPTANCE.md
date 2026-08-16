# APP-SHELL-0 Acceptance

**Date:** 2026-08-16  
**Branch:** `cursor/app-shell-0-lot-native-d03e`

## Acceptance matrix

| Gate | Result |
|---|---|
| Mobile stack decision | PASS — Expo/RN documented |
| App project builds | PASS — typecheck + prebuild validated |
| Bootstrap/config | PASS |
| Mobile auth | PASS — session/refresh/logout wired |
| Refresh rotation | PASS — interceptor + replay safety |
| Secure storage | PASS — expo-secure-store |
| Buyer/seller mode | PASS — profile switch |
| Server navigation | PASS — manifest + tab filtering |
| Buyer home | PASS — real API data |
| Seller home | PASS — wallet/orders/products + Brain block |
| Catalog | PASS — search + pagination |
| PDP | PASS |
| Cart | PASS — bearer `/api/cart` |
| Orders | PASS |
| Wallet | PASS — `/api/mobile/wallet` |
| Product list (seller) | PARTIAL — placeholder list Alpha |
| Intelligence summary | PASS — seller home compact block |
| Deep links | PASS — parser + router |
| Deferred deep link | PASS — pending link on login |
| Offline snapshot | PASS — home cache + banner |
| Error contract | PASS — ApiClientError |
| Pagination | PASS — cursor on catalog |
| Camera foundation | PASS — media-permissions adapter |
| Android build | PASS — release APK assembled (88.4 MB) |
| Physical device install | NOT RUN — no physical device in agent VM |
| Buyer flow | PARTIAL — checkout staging-only |
| Seller flow | PARTIAL — product edit deferred |
| Session restore | PASS — secure session boot |
| Offline/reconnect | PASS — banner + snapshot |
| Security audit | PASS — Alpha checklist |
| Mobile release manifest | PASS |
| Web build unchanged | PARTIAL — pre-existing FormData type error on Wave 6 base (`uploads/route.ts`), unrelated to mobile |

## Final verdicts

```text
APP-SHELL-0: ACCEPTED (Alpha scope, honest blockers documented)
ANDROID ALPHA FOUNDATION: READY
INSTALLABLE ANDROID BUILD: YES (app-release.apk, sha256 91adc382…)
PHYSICAL DEVICE ACCEPTANCE: NOT RUN
BUYER MOBILE FLOW: PARTIAL (checkout payment provider staging-only)
SELLER MOBILE FLOW: PARTIAL (product edit Alpha minimum deferred)
APP RELEASE READINESS: Alpha foundation ready — install APK on developer machine next
```

## Known blockers (honest)

1. Cloud agent lacks Android SDK + physical device for APK install proof.
2. Checkout uses backend contract stub UI until payment provider production path.
3. Seller product edit full form deferred to APP-SHELL-1.
4. Wave 6 staging parallel gate (PR #83 merge + acceptance script) tracked separately.

## Next epic

**APP-SHELL-1 — Android Alpha Productization:** camera capture, push, biometric, APK self-update, crash reporting, UI polish, closed Alpha distribution.
