# APP-SHELL-0 — Mobile Stack Technology Decision

**Date:** 2026-08-16  
**Status:** Accepted  
**Decision:** React Native + Expo (SDK 57)

## Context

APP-SHELL-0 requires the first installable native ЛОТ client on top of frozen Mobile API v1. The team already ships TypeScript on Next.js; mobile must be Android-first with iOS-compatible architecture, secure auth, deep links, camera foundation, and fast Alpha delivery without duplicating marketplace business logic.

## Options compared

| Criterion | Expo / React Native | Capacitor | Native Kotlin / Swift |
|---|---|---|---|
| Native UX | Strong with RN primitives; not WebView | WebView-heavy; weaker native feel | Best |
| Camera / gallery | expo-camera / image-picker | Plugins via web bridge | Best |
| Push | expo-notifications | Supported | Best |
| Background sync | Good with native modules | Limited | Best |
| Deep links | expo-linking + scheme | Supported | Best |
| Secure auth storage | expo-secure-store (Keychain/Keystore) | Capacitor Secure Storage | Best |
| Android APK | EAS / Gradle via prebuild | APK via Android Studio | Gradle |
| iOS | Shared codebase | Shared web shell | Separate apps |
| Performance | Good for marketplace UI | Web overhead | Best |
| Maintainability | High for small team TS stack | Medium (web + native glue) | Low (2 codebases) |
| Existing Next.js backend | Bearer JWT + REST fits cleanly | Same | Same |

## Decision

**React Native + Expo** is selected because:

1. TypeScript alignment with the monorepo and Mobile API contracts.
2. Single codebase for Android Alpha and future iOS without WebView compromises.
3. Secure storage, deep links, image pipeline, and OTA/update path are first-class.
4. Faster Alpha than dual native apps; better native UX than Capacitor for catalog/PDP/camera flows.
5. Business logic stays on backend — mobile is a thin typed client.

Capacitor was rejected: marketplace Alpha needs native navigation, secure token storage, and future camera/DAOS path without wrapping the full web app.

Native Kotlin/Swift was rejected for APP-SHELL-0 scope: two teams/codebases would delay first installable artifact without improving backend integration.

## Consequences

- App lives at `apps/mobile/` with Expo Router.
- Android builds via `expo prebuild` + Gradle or EAS Build.
- No second mobile implementation in this repo.
- Production signing keys stay outside git.

## Package identifier

- Android: `ru.lot.marketplace.alpha`
- iOS: `ru.lot.marketplace.alpha`
- URL scheme: `lot://`
