# Mobile Auth Decision

EPIC-77-PRE-WAVE-6-FINAL-GATE-002

## Decision

**Decision A: Existing JWT extended with mobile access/refresh tokens** — web NextAuth unchanged.

## Rationale

| Factor | Finding |
|---|---|
| Session strategy | Auth.js `session.strategy = "jwt"` (web) |
| Mobile extension | Short-lived access JWT + long-lived refresh token |
| Session lifetime | Access 900s; refresh 30d (rotated) |
| Web auth | Unchanged — cookie-based NextAuth remains primary |
| Multi-device | Independent sessions per device (`deviceId` hash) |
| Token in URL | Forbidden — no token query params in mobile APIs |
| Secure cookies | Enabled on HTTPS deployments |

## Implemented endpoints

| Route | Status |
|---|---|
| `POST /api/mobile/auth/session` | Login + status |
| `POST /api/mobile/auth/refresh` | Token rotation |
| `POST /api/mobile/auth/logout` | Session revoke |

Refresh response shape:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "expiresIn": 900
}
```

Token values are never logged.

## Session registry

`MobileAuthSession` (Prisma) / in-memory store (tests):

- `sessionId`, `userId`, `deviceIdHash`
- `createdAt`, `lastUsedAt`, `expiresAt`, `revokedAt`

Logout revokes **one** session; other devices remain active.

## Security checks

| Check | Status |
|---|---|
| Token not in URL | PASS |
| Token not in logs | PASS |
| Refresh replay blocked | PASS |
| Expired token blocked | PASS |
| Revoked token blocked | PASS |
| Wrong session blocked | PASS |
| Web session unchanged | PASS |

## Native app readiness

```text
nativeAppReady: YES
refreshImplemented: true
```

Standalone APK auth is unblocked at backend level. Native shell EPIC can proceed in parallel with Wave 6.

## Related

- `lib/mobile/auth/`
- `docs/MOBILE_API_VERSIONING.md`
- `docs/ANDROID_RELEASE_SIGNING.md`
