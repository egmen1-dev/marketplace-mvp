# ЛОТ Mobile — Native App Shell (Alpha)

Android-first native client for ЛОТ marketplace on frozen Mobile API v1.

## Stack

- React Native + Expo SDK 57
- Expo Router
- expo-secure-store for refresh tokens
- TypeScript

## Environments

Set via env at build time:

```bash
EXPO_PUBLIC_RELEASE_CHANNEL=staging   # development | staging | production
EXPO_PUBLIC_API_BASE_URL=https://web-production-e56fb.up.railway.app
```

## Commands

```bash
cd apps/mobile
npm install --legacy-peer-deps
npm run typecheck
npm test
npm run android   # requires Android SDK / device
```

## Architecture

Mobile is a thin client. Business logic stays on backend (`/api/mobile/*`, cart, orders, wallet).

See `docs/mobile/APP_SHELL_0_ARCHITECTURE.md`.

## Package

- Android: `ru.lot.marketplace.alpha`
- Deep link scheme: `lot://`
