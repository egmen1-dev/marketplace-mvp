# Sentry GO Preparation — RC1

**Status:** Prepared, not activated. No `@sentry/nextjs` in repo yet.

---

## 1. Scope

| Surface | What to capture |
|---------|-----------------|
| **Frontend** | React errors, hydration #418, unhandled rejections |
| **Backend** | API 500s, server actions, cron failures |
| **API routes** | `/api/uploads`, `/api/cron/*`, webhooks |
| **Release** | Commit SHA via `SENTRY_RELEASE` or Vercel git integration |

---

## 2. Environment separation

| Env | `SENTRY_ENVIRONMENT` | DSN |
|-----|---------------------|-----|
| Railway staging | `staging` | Separate project or same project, filtered |
| Vercel production | `production` | Production DSN |

Use **separate Sentry projects** or `environment` filter for alerts.

---

## 3. Installation (on GO day or +24h)

```bash
npx @sentry/nextjs@latest
```

Wizard creates:

- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- Updates `next.config.ts`

---

## 4. Vercel environment variables

| Variable | Scope | Notes |
|----------|-------|-------|
| `SENTRY_DSN` | Production, Preview | Server ingest |
| `NEXT_PUBLIC_SENTRY_DSN` | Production | Client (safe to expose) |
| `SENTRY_ENVIRONMENT` | Production | `production` |
| `SENTRY_AUTH_TOKEN` | CI only | Source maps upload |

---

## 5. PII & secrets filtering

Configure `beforeSend` in Sentry config:

```typescript
beforeSend(event) {
  // Strip cookies, authorization headers
  if (event.request?.headers) {
    delete event.request.headers.cookie;
    delete event.request.headers.authorization;
  }
  // Do not send request bodies with passwords
  return event;
}
```

**Never capture:**

- Passwords, `AUTH_SECRET`, `CRON_SECRET`, Stripe keys
- Full email bodies in chat
- Raw `DATABASE_URL`

**Existing app protection:** `lib/logger.ts` sanitizes secret-like field names.

---

## 6. Hydration errors (#418)

- Enable Sentry **client** SDK
- Tag: `mechanism: hydration`
- Alert threshold: >5/hour on production
- Cross-ref Playwright — no allowlist in tests

---

## 7. Integration with existing code

After wizard, wire optional calls:

```typescript
import { captureError } from "@/lib/monitoring/capture-error";
// Extend capture-error.ts to call Sentry.captureException when DSN set
```

Or rely on Sentry automatic instrumentation for unhandled errors.

---

## 8. Alerts (minimum)

| Alert | Condition |
|-------|-----------|
| Error spike | >20 events / 5 min |
| Health down | Synthetic or uptime on `/api/health` |
| Cron failure | Log `cron_overdue_failed` or Sentry event |
| Upload failure rate | `upload_*_failed` |

---

## 9. Checklist

- [ ] Sentry org/project created
- [ ] DSN added to Vercel Production
- [ ] Wizard run on `main`
- [ ] Source maps uploaded (optional)
- [ ] `beforeSend` PII scrubbing verified
- [ ] Test error in staging → appears in Sentry
- [ ] Alert rules configured
- [ ] On-call knows Sentry dashboard URL

See also: [OBSERVABILITY_AUDIT.md](./OBSERVABILITY_AUDIT.md)
