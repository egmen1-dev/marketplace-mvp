# Observability Audit — RC1 (RELEASE-003)

**Date:** 2026-08-12  
**Commit baseline:** `main` post RELEASE-001 docs  
**Scope:** Local + Railway staging. Vercel production not modified.

---

## 1. Current state summary

| Area | Status | Notes |
|------|--------|-------|
| Structured logging | **PARTIAL** | `lib/logger.ts` — JSON lines; used in auth, payments, uploads |
| Request correlation | **GAP** | No global `x-request-id`; rely on host request IDs (Railway/Vercel) |
| Error monitoring (Sentry) | **NOT WIRED** | Env placeholders in `.env.example`; no `@sentry/nextjs` yet |
| Health endpoint | **READY** (post-003) | `/api/health` — DB + auth required; storage/cron/stripe optional |
| Cron observability | **READY** (post-003) | Structured `cron_overdue_*` events |
| Process hooks | **READY** (post-003) | `instrumentation.ts` → unhandled rejection/exception logs |
| APM / dashboards | **NONE** | No Datadog/New Relic |
| Log drain | **HOST-DEPENDENT** | Railway/Vercel stdout JSON → connect on GO |

---

## 2. What is visible today

### Logged (structured JSON via `lib/logger`)

| Domain | Events / locations |
|--------|-------------------|
| **Auth** | `features/auth/session.ts` — forbidden mutations |
| **Payments** | `create-checkout-session`, `webhook`, `finalize-paid-order` |
| **Uploads** | `app/api/uploads/route.ts` — token, multipart, delete, ownership |
| **Cron** | `cron_overdue_completed`, `cron_overdue_failed`, `cron_overdue_unauthorized` |

### Logged (unstructured `console.error`)

| Domain | Risk |
|--------|------|
| OMS transitions | Chat/notification failures — `[order-lifecycle] …` |
| Checkout / orders | `[createOrderFromCart]`, delivery quote |
| Admin pages | `[admin/orders]`, `[admin/dashboard]` |
| Chat actions | `[startConversationAction]`, etc. |
| Pickup actions | CRUD failures |
| API routes | Generic `[GET /api/…]` |

**Gap:** Hard to query/alert on unstructured lines. Migrate critical paths to `log.*` incrementally post-GO.

---

## 3. What is lost

| Scenario | Visibility |
|----------|------------|
| React hydration #418 (client) | Playwright `pageerror` only — **not** sent to server |
| Client checkout JS errors | Browser console — unless Sentry client added |
| In-memory event bus drops | Side effects logged on failure; no persistent outbox metrics |
| Slow queries | No query timing logs |
| 401/403 auth denials (most routes) | Silent unless explicit `log.warn` |
| Stripe webhook duplicates | Idempotent handler logs via `log.info` on success path |

---

## 4. Critical operations — diagnosability

| Operation | Can diagnose? | How |
|-----------|---------------|-----|
| Order creation | ⚠️ Partial | `console.error` on failure; payment path uses `log` |
| OMS transition | ⚠️ Partial | DB state + OrderEvent; chat fail = console.error |
| Overdue cron | ✅ Yes | Structured cron logs + HTTP 500 body |
| Blob upload | ✅ Yes | Full upload_* event chain |
| Stripe webhook | ✅ Yes | `log` in webhook handler |
| Search / catalog | ❌ No | Errors only on page-level console.error |
| Admin moderation | ❌ No | AdminActionLog in DB; no log export |

---

## 5. Error monitoring — Sentry (prepare on GO)

**Current:** Not installed. **Recommended before Vercel GO:**

```bash
npx @sentry/nextjs@latest
# Follow wizard — sets sentry.client.config.ts, sentry.server.config.ts, edge config
```

**Env (Vercel + Railway):**

| Variable | Required | Purpose |
|----------|----------|---------|
| `SENTRY_DSN` | Yes (if enabled) | Server ingest |
| `NEXT_PUBLIC_SENTRY_DSN` | Yes (client) | Browser errors, hydration |
| `SENTRY_ENVIRONMENT` | Recommended | `production` / `staging` |

**Scrubbing:** Enable `beforeSend` to strip cookies, Authorization, email bodies. Never send passwords/tokens.

**Minimum alerts:**

- Error rate spike (>10/min)
- `/api/health` 503
- Cron `cron_overdue_failed`
- Upload `upload_*_failed` rate

**Until Sentry:** Use Railway/Vercel log search on JSON `level=error` and `event` field.

---

## 6. Correlation / request ID

**Recommendation for GO:**

1. Add `x-request-id` in middleware (or use platform header).
2. Pass to `log.*` as optional field on API routes.
3. Return `x-request-id` in error JSON responses for support tickets.

Not implemented in RC1 to avoid middleware/auth interaction risk pre-GO.

---

## 7. Hydration errors

- **Detection:** Playwright `attachErrorCollector` treats #418 as failure (no allowlist).
- **Production:** Requires Sentry client + `captureException` on `window.onerror` (post-wizard).
- **Known flake routes:** catalog, chat/messages, sign-in under long suite load.

---

## 8. Action items

| Priority | Action | Owner |
|----------|--------|-------|
| P0 | Connect log drain + error alert on `level=error` | Ops |
| P0 | Run Sentry wizard before Vercel GO | Eng |
| P1 | Migrate OMS/checkout `console.error` → `log.error` | Eng |
| P1 | Add `x-request-id` middleware | Eng |
| P2 | Query timing for catalog/search | Eng |
| P2 | Dashboard: orders/min, 5xx rate, cron last success | Ops |

---

## 9. Files (RELEASE-003)

| File | Purpose |
|------|---------|
| `lib/logger.ts` | Structured JSON logger |
| `lib/monitoring/register.ts` | Process-level error hooks |
| `lib/monitoring/capture-error.ts` | Unified `captureError()` |
| `instrumentation.ts` | Next.js register hook |
| `app/api/health/route.ts` | Dependency health checks |
| `app/api/cron/orders-overdue/route.ts` | Cron structured logs |
