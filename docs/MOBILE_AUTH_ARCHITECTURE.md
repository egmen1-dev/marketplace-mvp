# Mobile Auth Architecture

EPIC-77-PRE-WAVE-6 — backward-compatible foundation for Android/iOS.

## Current web auth model

- **NextAuth** with **JWT session strategy** (`auth.config.ts`)
- Cookie-based session for web browsers
- `trustHost: true` for Railway/Vercel deployment
- Secure cookie policy derived from environment

## Mobile suitability audit

| Concern | Status | Notes |
|---|---|---|
| Cookie/session dependency | Web-primary | Mobile shell will need token bridge |
| JWT capability | YES | Session strategy is JWT — foundation exists |
| Refresh strategy | NOT IMPLEMENTED | Reserved endpoints return 501 |
| Logout | Web routes primary | `POST /api/mobile/auth/logout` reserved |
| Token expiry | JWT maxAge via NextAuth | Document in app shell epic |
| Multiple devices | Supported | JWT sessions are stateless per device |
| Revocation foundation | PARTIAL | Requires session denylist in app shell epic |

## Reserved mobile endpoints

| Endpoint | Status |
|---|---|
| `POST /api/mobile/auth/session` | Status probe (`action: "status"`) — documents web_session_cookie mode |
| `POST /api/mobile/auth/refresh` | 501 — not implemented |
| `POST /api/mobile/auth/logout` | 501 — not implemented |

## Backward compatibility

- Existing web NextAuth routes **unchanged**
- Mobile endpoints are additive and advisory-only
- No second user system introduced

## Recommended app shell path (future epic)

1. Mobile shell obtains session via secure WebView bootstrap or dedicated token exchange
2. Refresh via `POST /api/mobile/auth/refresh` once approved
3. Revocation via server-side session version or denylist
4. Keep JWT claims minimal (userId, role, sessionVersion)

## Blockers before native token issuance

- Security review of token exposure in APK
- Refresh rotation policy
- Multi-device revocation UX

## Related docs

- `docs/MOBILE_APP_COMPATIBILITY.md`
- `docs/MOBILE_DEEP_LINKS.md`
