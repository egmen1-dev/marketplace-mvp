# MARKETPLACE-LAUNCH-READINESS-001

Production readiness audit before real marketplace launch. No new AI layers — focuses on stability, UX, security, and operational processes.

## Feature flag

```bash
MARKETPLACE_LAUNCH_READINESS_ENABLED=true
```

Recommended stack for full audit:

```bash
MARKETPLACE_LAUNCH_READINESS_ENABLED=true
MARKETPLACE_FOUNDATION_AUDIT_ENABLED=true
MARKETPLACE_TRUST_LOOP_ENABLED=true
MARKETPLACE_DELIVERY_ENABLED=true
SELLER_FIRST_ENTRY_ENABLED=true
SELLER_PAYOUT_ENABLED=true
```

## Architecture

```
lib/marketplace-launch-readiness/
  audit.ts              — scoring helpers
  buyer-checks.ts       — buyer journey audit
  seller-checks.ts      — seller journey audit
  admin-checks.ts       — admin surface audit
  payment-checks.ts     — Stripe + live payment counts
  delivery-checks.ts    — CDEK + delivery layer
  security-checks.ts    — auth + ownership patterns
  ux-checks.ts          — content/UX signals
  moderation-checks.ts  — trust loop moderation
  queries.ts            — report aggregators
  permissions.ts
  analytics.ts
  actions.ts
  flags.ts
  index.ts
```

## Admin surfaces

| Route | Purpose |
|-------|---------|
| `/admin/launch` | Full launch readiness score + checklist |
| `/admin/health` | Marketplace health dashboard (orders, payments, delivery, trust) |
| `/admin/payments` | Stripe config, pending/failed payments |
| `/admin/delivery/health` | Provider OK/MOCK/ERROR + delivery metrics |
| `/admin/ux-health` | Missing photos, empty descriptions, UX checks |

## Launch checklist sections

### Technical
- Database backup documented
- Stripe configured
- CDEK configured
- Storage configured

### Marketplace
- First seller / product / order / delivery / payout

### Trust
- Reviews, moderation, delivery layer flags

## Analytics

- `launch_audit_started`
- `launch_check_passed`
- `launch_check_failed`
- `production_health_view`

## Tests

```bash
MARKETPLACE_LAUNCH_READINESS_ENABLED=true npm run test -- tests/marketplace-launch-readiness.test.ts
MARKETPLACE_LAUNCH_READINESS_ENABLED=true npm run build
```

## Relationship to Foundation Audit

- **Foundation audit** (`MARKETPLACE_FOUNDATION_AUDIT_ENABLED`) — structural readiness before AI scaling
- **Launch readiness** — production operations audit with live DB metrics and go-live checklist

Use both before public launch.
