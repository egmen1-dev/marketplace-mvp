# EPIC 158.1 — Seller LOT Creation UX Hardening

## Goal

Make LOT creation understandable for non-technical sellers. **The user must never lose a filled-in LOT.**

## Verdict matrix

| Check | Status |
|-------|--------|
| LOT terminology (no user-facing «черновик») | PASS |
| Autosave with «Сохранено» indicator | PASS |
| Restore prompt («Вы начали создавать ЛОТ») | PASS |
| Navigation / error state preservation | PASS |
| Pickup points in draft + API | PASS |
| Gate `npm run mobile:epic-158-1:gate` | PASS |
| Physical seller re-test | NOT_RUN |

**Final status:** `READY_FOR_SELLER_TEST`

## Product deliverables

1. Autosave during `/sell/create` with visible «Сохранено» feedback.
2. Restore overlay with **Продолжить** / **Удалить** for unfinished LOTs.

## Release deliverables

1. Draft storage v2 (`lot-draft-v2`) with pickup + server id fields.
2. `GET /api/mobile/seller/pickup-points` for seller pickup selection.
3. Regression tests + gate script.

## Key changes

| Area | Change |
|------|--------|
| Terminology | «Сохранить ЛОТ», «Сохранённые» tab, DRAFT → «Сохранён» |
| Autosave | Debounced 400ms + save on navigation blur |
| Restore | `LotRestorePrompt` replaces Alert |
| Pickup | Toggle + multi-select; errors preserve form |
| Errors | Human messages; `flushSave` on all failure paths |

## Tests

```bash
npm run test -- tests/mobile-epic-158-1-seller-lot-ux.test.ts
npm run mobile:epic-158-1:gate
cd apps/mobile && npm run typecheck
```
