# Mobile Auth Decision

EPIC-77-STACKED-MERGE-AND-STAGING-ACCEPTANCE-001

## Decision

**Decision A: Existing JWT can safely power native app** (with explicit refresh blocker).

## Rationale

| Factor | Finding |
|---|---|
| Session strategy | Auth.js `session.strategy = "jwt"` |
| Session lifetime | 14 days (`maxAge`) |
| Web auth | Unchanged — cookie-based NextAuth remains primary |
| Multi-device | Supported (stateless JWT per device/session) |
| Token in URL | Forbidden — no token query params in mobile APIs |
| Secure cookies | Enabled on HTTPS deployments |

Native shell options (App Shell EPIC):

1. **Secure WebView cookie bridge** — reuse existing session cookie (fastest MVP)
2. **Bearer token bridge** — expose JWT via authenticated mobile session endpoint (requires security review)

## Decision B status

Dedicated **access-token + refresh-token extension** is **not required for MVP**, but:

- `POST /api/mobile/auth/refresh` → **501 NOT IMPLEMENTED**
- `POST /api/mobile/auth/logout` → **501 NOT IMPLEMENTED**

These are **explicit app release blockers** for standalone APK without WebView cookie jar.

## API

`POST /api/mobile/auth/session` with `{ "action": "status" }` returns:

- `decision: "A"`
- `mode: "web_session_cookie_jwt"`
- `authenticated` / `role` when session cookie present
- `blockers: ["mobile_refresh_not_implemented", "native_token_bridge_not_built"]`

## Acceptance checklist

| Check | Status |
|---|---|
| Login/session creation (web) | PASS — existing NextAuth |
| Expiry handling | PASS — JWT maxAge documented |
| Logout (web) | PASS — existing routes |
| Unauthorized request | PASS — middleware + API guards |
| Two devices | PASS — JWT model |
| Token not in URLs/logs | PASS — contract enforced |
| Web session continues | PASS — no breaking changes |
| Mobile refresh | **BLOCKER** — not implemented |

## Native app readiness

```text
nativeAppReady: PARTIAL
```

Proceed with App Shell EPIC using Decision A + WebView bridge, or implement refresh foundation before standalone token auth.
