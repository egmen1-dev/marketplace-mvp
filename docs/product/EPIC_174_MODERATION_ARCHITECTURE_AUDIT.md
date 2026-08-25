# EPIC 174 — Moderation Architecture Audit

Generated: 2026-08-25

## CURRENT FLOW

```text
Seller saves DRAFT
        ↓
Seller PATCH status=ACTIVE (mobile/web)
        ↓
[MARKETPLACE_TRUST_LOOP_ENABLED=true only]
        ↓
First publish attempt:
  submitProductForModeration(productId)
    → runProductModerationChecks (photo + content + prohibited regex)
    → upsert ProductModeration (PENDING_REVIEW | NEEDS_FIX | REJECTED)
    → create ModerationQueueItem (always new row — duplicate risk)
    → Product stays DRAFT
    → API returns publishOutcome=PENDING_REVIEW / MODERATION_PENDING
        ↓
Admin /admin/moderation:
  approveProductModeration → moderation APPROVED (product still DRAFT)
  rejectProductModeration → moderation REJECTED
        ↓
Seller publish again:
  assertProductModerationApproved → ACTIVE allowed
        ↓
Buyer catalog: Product.status === ACTIVE only
```

### Existing primitives (reuse, do not duplicate)

| Layer | Location | Notes |
|-------|----------|-------|
| Schema | `prisma/schema.prisma` | `ProductModeration`, `ModerationQueueItem`, `ModerationStatus` |
| Feature flag | `lib/marketplace-trust-loop/flags.ts` | `MARKETPLACE_TRUST_LOOP_ENABLED` |
| Submit | `lib/marketplace-trust-loop/moderation/rules.ts` | `submitProductForModeration` |
| Decisions | `lib/marketplace-trust-loop/moderation/decisions.ts` | approve/reject only |
| Queue | `lib/marketplace-trust-loop/moderation/queue.ts` | basic list |
| Prohibited | `lib/marketplace-trust-loop/risk/prohibited-products.ts` | regex patterns |
| Publish gate | `features/products/queries.ts` | `updateProduct` ACTIVE path |
| Mobile truth | `lib/mobile/seller-product-publish.ts` | `publishOutcome`, `isPublic` |
| Seller tabs | `lib/mobile/seller-products-data.ts` | «На проверке» filter |
| Admin UI | `features/marketplace-trust-loop/components/admin-moderation-panel.tsx` | approve/reject buttons only |
| Analytics | `lib/marketplace-trust-loop/analytics.ts` | no AdminActionLog |

### What worked before EPIC 174

- Truthful publish contract (`PENDING_REVIEW`, `isPublic=false`)
- Seller «На проверке» tab
- Buyer catalog excludes non-ACTIVE
- Basic prohibited keyword detection
- Photo/content quality scoring

### Root gaps (why PENDING_REVIEW was incomplete)

1. **No guaranteed queue processing** — items created but no SLA, stuck detection, or overdue escalation
2. **Approve ≠ publish** — admin approves but product stays DRAFT; seller must publish again (easy dead-end)
3. **No re-submit after NEEDS_FIX** — second publish only checks APPROVED, does not re-run checks
4. **No content versioning** — approved LOT can be edited without re-review
5. **No audit trail** — approve/reject not in append-only log
6. **No structured reason codes** — issues JSON only, no remediation contract
7. **Auto-reject on regex** — prohibited hit → immediate REJECTED (no MANUAL_REVIEW for ambiguity)
8. **No shadow mode** — no separation of system recommendation vs human decision
9. **Image/OCR** — not evaluated; no NOT_EVALUATED honesty
10. **No seller notifications** on decision
11. **Duplicate queue rows** on re-submit
12. **Trust loop OFF by default** — moderation path inactive unless env set

---

## TARGET FLOW (EPIC 174 v1)

```text
SELLER SUBMITS LOT
        ↓
STRUCTURAL VALIDATION (characteristics, images, price)
        ↓
POLICY CHECKS (registry LOT_POLICY_V1)
        ↓
CONTENT CHECKS (text signals, image NOT_EVALUATED)
        ↓
RISK ENGINE → score + traceable signals
        ↓
DECISION ENGINE (mode: OFF | SHADOW | ENFORCE)
        ↓
┌─────────────────────────────────────────────────────┐
│ SHADOW (closed beta default):                       │
│   status = PENDING_REVIEW + reviewMode=MANUAL       │
│   systemRecommendation stored                       │
│   human decides in admin queue                      │
├─────────────────────────────────────────────────────┤
│ ENFORCE (limited):                                  │
│   deterministic NEEDS_CHANGES / MANUAL_REVIEW only  │
│   no auto-reject on ambiguous keywords              │
└─────────────────────────────────────────────────────┘
        ↓
ADMIN: Опубликовать | Попросить исправить | Отклонить | Эскалировать
        ↓
APPROVE (transactional):
  moderation APPROVED
  Product.status ACTIVE
  publishedAt set
  contentVersion hash locked
        ↓
BUYER catalog/search/PDP visible
```

### Backward compatibility

- Keep `ModerationStatus.PENDING_REVIEW`, `NEEDS_FIX` (UI maps to «Нужно исправить»)
- Keep `publishOutcome=PENDING_REVIEW` mobile contract
- Map `reviewMode` + `stage` on `ProductModeration` without breaking RC10.3 clients

### New modules

```text
lib/moderation/
  config.ts
  types.ts
  policies/
  signals/
  risk-engine.ts
  decision-engine.ts
  content-version.ts
  lifecycle.ts
  audit.ts
  notifications.ts
  queue.ts
```

### Data model additions

- `Product.contentVersion`, `Product.publishedAt`
- `ProductModeration` timestamps, risk, policy, reason codes, content version fields
- `ProductModerationAuditEvent` append-only log
