# APP-SHELL-0 Auth

## Endpoints

| Action | Method | Path |
|--------|--------|------|
| Login | POST | `/api/mobile/auth/session` |
| Refresh | POST | `/api/mobile/auth/refresh` |
| Logout | POST | `/api/mobile/auth/logout` |

## Token storage

| Token | Storage |
|-------|---------|
| Access | Memory + optional secure metadata |
| Refresh | expo-secure-store (Keychain / Keystore) |

Never store refresh token in AsyncStorage plain text, URLs, or logs.

## Refresh interceptor

```
request → 401 TOKEN_EXPIRED → refresh → rotate → retry once
```

On `REFRESH_REVOKED` / `REFRESH_INVALID` / `REFRESH_REPLAY`:

- clear local session
- navigate to login
- no infinite refresh loop

## Logout

Backend revoke + local token cleanup + offline snapshot cleanup (via `clearSession`).

## Deferred deep link

Logged-out user opens `lot://product/{id}` → pending link stored → login → route to product.

Implementation: `useDeepLinkHandler` + login `pendingDeepLink` param.
