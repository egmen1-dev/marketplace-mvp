# APP-SHELL-0 Architecture

## Principle

```
Mobile UI → Mobile API v1 → Marketplace services → DB
```

Mobile does not embed ranking, wallet ledger, trust scoring, or CCOS core logic.

## Project layout

```
apps/mobile/
├── app/                 # Expo Router screens
├── src/api/             # Typed HTTP client + endpoints
├── src/auth/            # (via storage + client)
├── src/navigation/      # Server manifest consumption in tabs
├── src/storage/         # Secure session + offline snapshots
├── src/deep-links/      # lot:// parsing + routing
├── src/features/        # Camera/media foundation
├── src/components/      # Error boundary, network banner
├── src/config/          # API_BASE_URL, release channel
└── src/theme/           # LOT light design tokens
```

## Boot flow

1. Splash (`app/index.tsx`) → `GET /api/mobile/bootstrap`
2. Restore secure session → refresh if 401
3. Login or tabs based on token
4. Server navigation manifest drives tab visibility by mode

## Auth

- `POST /api/mobile/auth/session` login
- Bearer access token in memory + secure storage metadata
- Refresh token in expo-secure-store only
- Auto refresh on `TOKEN_EXPIRED`, clear on `REFRESH_REVOKED`

## Modes

Single app with buyer/seller mode switch in profile. Backend remains source of truth for seller eligibility.

## Offline

In-memory snapshots for buyer/seller home. No fake offline writes — UI shows explicit internet requirement.

## CCOS

Consumer only via mobile APIs. `evolutionVisible=false` in bootstrap for regular users.
