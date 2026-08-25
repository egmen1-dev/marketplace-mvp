# EPIC 174 — Moderation Operations

## Admin queue

Route: `/admin/moderation`

API:
- `GET /api/admin/moderation` — counters + queue
- `GET /api/admin/moderation/:productId/decision` — LOT detail for moderator
- `POST /api/admin/moderation/:productId/decision` — `{ action, reasonCodes?, comment? }`

Actions:
- `APPROVE` — publish LOT (ACTIVE + publishedAt)
- `NEEDS_CHANGES` — seller must fix and resubmit
- `REJECT` — terminal for listing
- `ESCALATE` — stays in manual queue, flagged

## Seller mobile

- `GET /api/mobile/seller/products/:id/moderation` — status + human reasons
- Publish flow unchanged contract: `publishOutcome=PENDING_REVIEW`

## Environment

```bash
MARKETPLACE_TRUST_LOOP_ENABLED=true
LOT_MODERATION_ENGINE_ENABLED=true   # default true
MODERATION_AUTOMATION_MODE=SHADOW    # OFF | SHADOW | ENFORCE
MODERATION_STUCK_THRESHOLD_HOURS=48
```

## Backfill

Existing `ProductModeration` rows with `PENDING_REVIEW` remain in queue.

No auto-publish of historical pending LOTs.

Run staging smoke after deploy:

```bash
npm run mobile:lot-moderation:gate
```

## Metrics (logged)

- `moderation_submitted_total` (via analytics events)
- Queue counters: pending, needsFix, highRisk, overdue
