# EPIC 159 — Closed Beta Seller Acceptance Report

**Date:** 2026-08-24  
**Mode:** AUDIT + CRITICAL FIX ONLY  
**Baseline:** RC9.1 (`0.1.14-beta.2`, versionCode 15) + EPIC 158.1–158.3 + EPIC 159 fixes  
**Physical Android:** `NOT_RUN` — see `docs/mobile/EPIC_159_PHYSICAL_ACCEPTANCE_CHECKLIST.md`

---

## Final status

### `READY_FOR_FIRST_BETA_USERS`

Code audit and automated gates pass. Physical operator checklist pending before production closed-beta sign-off with real sellers.

| Gate | Verdict |
|------|---------|
| P0 blockers | **0** (after EPIC 159 S1 fix) |
| Automated tests | PASS |
| Physical acceptance | NOT_RUN |

---

## 1. Seller journey

| Step | Code audit | Physical |
|------|------------|----------|
| Продать → Создать ЛОТ | PASS — native wizard `/sell/create` | NOT_RUN |
| All fields (photo, title, category, price, stock, description, condition, city, pickup) | PASS | NOT_RUN |
| Human copy, no technical errors | PASS — EPIC 158.2/158.3 error mapper | NOT_RUN |
| Autosave + restore prompt | PASS — `lot-draft-v2`, `LotRestorePrompt` | NOT_RUN |
| Preview «Проверьте ЛОТ» | PASS — EPIC 158.3 | NOT_RUN |
| Publish success copy | PASS — «Ваш ЛОТ теперь виден покупателям» | NOT_RUN |
| Save → Publish (no duplicate) | **FIXED** — PATCH via `savedProductId` | NOT_RUN |

**Test accounts:** `seller@demo.lot` / `demo1234`

---

## 2. Buyer journey

| Step | Code audit | Physical |
|------|------------|----------|
| Catalog browse / search | PASS | NOT_RUN |
| PDP (photo, price, seller, cart, chat) | PASS | NOT_RUN |
| Cart → Checkout → browser handoff | PASS | NOT_RUN |
| Return deep link → order success | PASS — `useCheckoutReturnRefresh` | NOT_RUN |
| Orders list + human status | PASS | NOT_RUN |

**Test accounts:** `buyer@demo.lot` / `demo1234`

---

## 3. Order lifecycle

| Step | Code audit | Physical |
|------|------------|----------|
| Seller sees new order in «Продажи» | PASS — `seller-sales.tsx` | NOT_RUN |
| Accept order | PASS — «Принять заказ» | NOT_RUN |
| Status progression (4-step machine) | PASS — CONFIRMED → PROCESSING → READY → SHIPPED | NOT_RUN |
| Buyer timeline updates | PASS — `buildBuyerOrderTimeline` | NOT_RUN |
| Chat system message on order | PASS | NOT_RUN |

**Note:** Tester guide still describes 2-step seller ship flow; code uses 4 steps. Guide update deferred (docs).

---

## 4. Update flow

| Step | Code audit | Physical |
|------|------------|----------|
| Boot update check | PASS | NOT_RUN |
| Foreground refresh (post-RC) | PASS — EPIC 158.3 `AppState` listener | NOT_RUN |
| Modal «Доступно обновление» | PASS — EPIC 158.3 copy | NOT_RUN |
| «Обновить сейчас» → APK URL | PASS — `startApkDownload` | NOT_RUN |
| Profile badge «Обновление доступно» | PASS — EPIC 158.3 | NOT_RUN |

**Diagnosis (why updates were missed before 158.3):** boot-only stale `pendingUpdate`, no foreground re-check, silent API failure → `NO_UPDATE`.

---

## 5. Found issues

| ID | Priority | Area | Issue |
|----|----------|------|-------|
| S1 | P1 | Seller create | Save → Publish created duplicate LOTs (always POST) |
| S2 | P1 | Seller create | Success screen showed «опубликован» when saved for review |
| S3 | P1 | Мои ЛОТы | No «Опубликовать» action on saved DRAFT rows |
| S4 | P1 | Мои ЛОТы | Cannot resume server DRAFT into wizard |
| U1 | P1 | Update | No profile badge before EPIC 158.3 |
| D1 | — | Docs | Tester guide still says web-only product creation |
| D2 | — | Docs | Seller ship steps in guide ≠ code (2 vs 4) |
| N1 | — | Physical | No operator pass on RC9.1 checklist |

---

## 6. Fixed issues (EPIC 159)

| ID | Fix |
|----|-----|
| S1 | `persistServerDraft` / `publishOnServer` use `updateSellerLot` + `publishSellerLot` PATCH when `savedProductId` exists |
| S2 | Success screen branches: published vs `savedForReview` |
| U1 | Included via EPIC 158.3 merge (foreground refresh + profile badge) |
| Copy | `successBody` → «Ваш ЛОТ теперь виден покупателям»; `createAnother` → «Создать ещё один» |

---

## 7. Deferred issues

| ID | Reason | Target |
|----|--------|--------|
| S3 | Not P0 — seller can publish in one wizard session | Future EPIC (seller inventory actions) |
| S4 | Requires edit/resume route — scope beyond audit fix | Future EPIC |
| D1, D2 | Documentation only | Update `CLOSED_BETA_TESTER_GUIDE.md` after physical pass |
| N1 | Requires physical device | Operator checklist |

---

## Trust layer audit — Missing elements (future EPIC)

Present today (buyer-visible):

- Seller name / store name
- `joinedLabel` (registration date text from API)
- Active product count on storefront
- «Проверенный продавец» badge when `isVerified`
- «Новый продавец» fallback badge
- «Ответы в чате» hint
- Favorites / views counts on PDP (not fabricated)

**Missing trust elements (do not add in EPIC 159):**

| Element | Notes |
|---------|-------|
| Star rating / review score on seller card | Intentionally absent (no fake metrics) |
| Completed sales count | Not exposed on mobile storefront |
| Response time SLA | Only static «Ответы в чате» hint |
| Return / dispute policy badge | Not on PDP |
| Seller verification explanation | Badge without detail sheet |
| LOT terminology on storefront | Still shows «N товаров» in seller header |
| Identity verification level | Beyond boolean `isVerified` |

---

## Verification commands

```bash
npm run build
npm run mobile:typecheck
npm run mobile:epic-159:gate
npm run mobile:epic-158-3:gate
npm run mobile:epic-154:gate
npm test -- tests/mobile-epic-159-seller-beta-acceptance.test.ts
```

---

## Deliverables

| Artifact | Path |
|----------|------|
| Acceptance report | `docs/product/SELLER_BETA_ACCEPTANCE_REPORT.md` |
| Physical checklist | `docs/mobile/EPIC_159_PHYSICAL_ACCEPTANCE_CHECKLIST.md` |
| Gate | `npm run mobile:epic-159:gate` |
| Tests | `tests/mobile-epic-159-seller-beta-acceptance.test.ts` |

**No APK build in this EPIC** — RC build after merge.
