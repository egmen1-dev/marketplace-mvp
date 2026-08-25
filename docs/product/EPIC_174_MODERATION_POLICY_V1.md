# EPIC 174 — Moderation Policy v1 (`LOT_POLICY_V1`)

## Automation mode (closed beta)

Default: `MODERATION_AUTOMATION_MODE=SHADOW`

| Mode | Behavior |
|------|----------|
| OFF | All submitted LOTs → manual queue |
| SHADOW | Engine computes recommendation; human decides |
| ENFORCE | Limited auto-decisions for deterministic rules only |

## Reason codes

Stable machine-readable codes with seller `userMessage` and `remediation`.

See `lib/moderation/types.ts`.

## Rule types

| Type | Behavior |
|------|----------|
| HARD_RULE | Deterministic — may auto NEEDS_CHANGES or REJECT (weapons/drugs only for REJECT in ENFORCE) |
| SOFT_SIGNAL | Increases risk score → MANUAL_REVIEW |

## Category policy

| Class | v1 handling |
|-------|-------------|
| ALLOWED | Normal flow |
| RESTRICTED | SOFT_SIGNAL → manual review |
| PROHIBITED | HARD only for weapons/drugs patterns |
| REQUIRES_MANUAL_REVIEW | Ambiguous keyword hits |

## Text checks

- Phone / email / messenger / URL patterns
- Obfuscation-tolerant regex
- Contact bypass → NEEDS_CHANGES (not silent reject)

## Image / OCR

| Capability | v1 status |
|------------|-----------|
| IMAGE_MODERATION | NOT_EVALUATED |
| OCR | NOT_EVALUATED |

Stub providers return `NOT_EVALUATED` — never `SAFE`.

## Publication truth

```text
ACTIVE + moderation APPROVED + contentVersion match => buyer visible
PENDING_REVIEW / NEEDS_FIX / REJECTED / DRAFT => not public
```

Admin «Опубликовать» performs transactional ACTIVE transition.

## Content versioning

Editing photos/title/description/category/ProductType/characteristics/condition bumps `contentVersion` and invalidates prior approval.

## SLA

Timestamps recorded: `submittedAt`, `reviewStartedAt`, `reviewedAt`, `needsChangesAt`, `rejectedAt`, `publishedAt`.

Stuck detection: `MODERATION_STUCK_THRESHOLD_HOURS` (default 48) — overdue counter in admin, no auto-approve.

## Appeals foundation

Schema supports future appeal states; not implemented in v1 UI.
