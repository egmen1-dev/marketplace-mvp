# Release Batch 2 Report — Seller Experience

**Epic:** MARKETPLACE-RELEASE-BATCHES-2-4-001  
**Date:** 2026-08-15  
**Environment:** Railway staging — `https://web-production-e56fb.up.railway.app`  
**Service:** `web-v2`

---

## Deploy

```json
{
  "environment": "staging",
  "commit": "b556424",
  "buildTime": "2026-08-15T08:38:38.869Z",
  "version": "0.1.0"
}
```

| Field | Value |
|-------|-------|
| **Baseline SHA (start)** | `24a46ba` |
| **Accepted SHA** | `b556424` (includes business-page connection fix) |
| **environment** | `staging` |

---

## Flags (Batch 2)

All Batch 2 flags were already ON on Railway before this rollout; verified ACTIVE on `/admin/system-flags`:

```env
SELLER_FIRST_ENTRY_ENABLED=true
SELLER_JOURNEY_ENABLED=true
SELLER_OPERATING_DESK_ENABLED=true
SELLER_OPERATIONS_ENABLED=true
SELLER_BUSINESS_INTELLIGENCE_ENABLED=true
```

`SELLER_LIFECYCLE_ENABLED` exists in codebase (`lib/seller-lifecycle/flags.ts`) but is **not set** on Railway — nav uses default seller cabinet structure.

Batch 1 baseline flags remained ON (not disabled):

```env
MARKETPLACE_TRUST_LOOP_ENABLED=true
MARKETPLACE_TRUST_SCORE_MODEL_ENABLED=true
MARKETPLACE_TRUST_EXPERIENCE_ENABLED=true
MARKETPLACE_NEW_SELLER_TRUST_ENABLED=true
MARKETPLACE_UX_COMPLETION_ENABLED=true
MARKETPLACE_CONVERSION_ENABLED=true
```

---

## Blocker found & fix

| ID | Severity | Issue | Resolution |
|----|----------|-------|------------|
| BUG-B2-001 | **BLOCKER** | `/account/business` showed error page for all seller personas | Root cause: Prisma `P2037` — too many parallel DB connections on business page + Postgres pool exhaustion on staging |
| | | | **Fix:** `b556424` — skip unused operating-desk queries when BI panel is active; Railway `DATABASE_URL` updated with `connection_limit=5&pool_timeout=20`; Postgres service restarted |

---

## Demo personas

Password: `demo1234`

| Persona | Email | Routes tested |
|---------|-------|---------------|
| New seller | `demo-new-seller@demo.lot` | `/account`, `/account/seller-start`, `/account/business` |
| Growing seller | `demo-growing@demo.lot` | `/account/business`, `/account/products`, `/account/sales`, `/account/reputation` |
| Problem seller | `demo-problems@demo.lot` | `/account/business` |

---

## Acceptance results

| Criterion | Result |
|-----------|--------|
| Seller First Entry visible | ✅ PASS — `/account/seller-start` |
| Seller Journey visible | ✅ PASS — progress 4/5, coach, next step |
| Business dashboard visible | ✅ PASS — after fix at `b556424` |
| Seller Operations works | ✅ PASS — embedded in BI / conversion panels |
| Business Intelligence works | ✅ PASS — diagnosis, next action, assistant |
| No duplicate dashboard layers | ✅ PASS — single primary next-step flow |
| New seller understands first step | ✅ PASS |
| Growing seller understands business state | ✅ PASS — views, orders, revenue, attention |
| Problem seller gets concrete recommendations | ✅ PASS — weak cards, trust, CTA «Исправить» |
| Mobile usable (390px) | ✅ PASS |
| Buyer experience not broken | ✅ PASS — `/`, PDP |

### Navigation (actual state)

Sidebar mixes buyer + seller items (not the ideal 7-item seller-only nav from spec). Documented as **MAJOR UX gap**, not a Batch 2 blocker:

- Present: Главная, Профиль, Покупки, Избранное, Сообщения, Мои товары, Продажи, Баланс, Вывод, Репутация, …
- Missing as top-level: «Мой бизнес», «Продвижение», «Аналитика» as separate equal items

---

## Screenshots

Evidence in `/opt/cursor/artifacts/`:

- `batch2_test1_seller_start_desktop.png`
- `batch2_test1_new_seller_business_desktop.png`
- `batch2_test1_new_seller_business_mobile_390px.png`
- `batch2_test2_growing_seller_business.png`
- `batch2_test3_problems_seller_business.png`
- `batch2_test5_buyer_homepage.png`

---

## Remaining issues (non-blocking)

| ID | Severity | Description |
|----|----------|-------------|
| UX-B2-001 | MAJOR | Seller nav not aligned to target 7-item structure |
| UX-B2-002 | MINOR | Conversion panel shows English labels «Checkout», «View → cart» on `/account/business` |

---

## Verdict

```text
BATCH 2 ACCEPTED
```

Accepted at staging SHA **`b556424`** after blocker fix and full persona re-validation.
