# Closed Beta — Moderation Operating Model (P0)

**Status:** Product decision document (RC10.4 physical failure follow-up)  
**Staging default:** `MODERATION_AUTOMATION_MODE=SHADOW`

## Problem observed in physical validation

- Seller LOTs remain `PENDING_REVIEW` indefinitely when no human moderator acts.
- `SHADOW` is **correct** for safety: the engine evaluates and recommends; **humans decide**.
- A moderation engine without an operator is not an operational moderation system.

## Modes

| Mode | System behavior | Closed beta use |
|------|-----------------|-----------------|
| `OFF` | Always manual queue | Too slow for beta |
| `SHADOW` | Recommendation logged; human required | **Current default** — safe |
| `ENFORCE` | Auto-approve/reject when policy allows | Future; see guards below |

## Closed-beta decision matrix (target)

| Risk | Image/OCR | Policy | Decision |
|------|-----------|--------|----------|
| LOW | Evaluated safe | No prohibited/ambiguous hits | **May auto-approve** under `ENFORCE` only |
| LOW | `NOT_EVALUATED` | Clean text | **Human review** — absence of signal ≠ safe |
| MEDIUM / UNKNOWN | Any | Ambiguous category/title | **Human review** |
| HIGH / HARD | Any | Prohibited / restricted class | **Block or human** per policy |

### NOT_EVALUATED guard (mandatory)

Image moderation and OCR remain `NOT_IMPLEMENTED` / `NOT_EVALUATED`.  
**Never auto-approve** solely because text checks passed while image/OCR are unevaluated.

## Who decides (closed beta v1)

1. **Primary:** Human moderator via `/admin/moderation` (APPROVE / NEEDS_CHANGES / REJECT).
2. **Fallback:** No silent auto-publish in `SHADOW`.
3. **Future (`ENFORCE`):** System may approve only LOW-risk + evaluated dimensions per matrix above.

## SLA (product contract — closed beta)

| Stage | Seller UX | Ops |
|-------|-----------|-----|
| Immediately after submit | `ЛОТ отправлен на проверку` | Queue entry created |
| Pending (within SLA) | `Обычно проверка занимает до 60 минут` (business hours) | Counter + age visible in admin |
| SLA exceeded | `Проверка занимает дольше обычного` | `overdue` counter + admin breach indicator |

**Initial closed-beta SLA target:** 60 minutes while moderators are online (09:00–21:00 MSK).  
Outside window: show “следующий рабочий день” copy — implementation tracked separately.

## Operator checklist

- [ ] At least one moderator monitors `/admin/moderation` during beta sessions
- [ ] `MODERATION_AUTOMATION_MODE=SHADOW` until ENFORCE guards ship
- [ ] Physical retest includes admin APPROVE step

## Restricted product: «Жидкость для вэйпа»

- **Policy status:** `POLICY_GAP` — no dedicated vape/nicotine/tobacco rule in `prohibited-products.ts` as of RC10.4.
- Title alone does **not** prove nicotine content.
- Wording is sufficient to require **human classification** (category + description review).
- **Do not** auto-approve for physical test convenience.

Recommended policy follow-up (separate EPIC): age-restricted / vape / nicotine taxonomy rules.
