# Auth module

Authentication (sign-in / sign-up, JWT sessions, role guards).

## Roles

- **BUYER** — default; catalog, cart, orders
- **SELLER** — seller cabinet + products
- **ADMIN** — `/admin/*` moderation (DB-verified on each request)

See [AUTH_ADMIN.md](../../docs/AUTH_ADMIN.md) for granting ADMIN safely.

## Sessions

- Auth.js v5 with **JWT strategy** — each browser/device gets its own session cookie
- Cookies: `httpOnly`, `secure` on HTTPS hosts, `sameSite: lax`
- Configure `NEXT_PUBLIC_APP_URL` (and optionally `AUTH_URL`) to match the public origin

## Multi-device login

Login is credentials-based — the same email/password works on any device **within the same deployment** (staging vs production use separate databases).

Emails are normalized to lowercase on sign-in/sign-up; legacy mixed-case rows are fixed via migration.
