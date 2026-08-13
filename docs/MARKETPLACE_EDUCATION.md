# Marketplace Education (MARKETPLACE-EDUCATION-001)

Unified AI Marketplace Coach Layer — contextual explanations integrated into user flows, not a separate help center.

The marketplace explains **what is happening**, **why it matters**, and **what to do next**.

## Goals

- Reduce confusion for new sellers
- Improve listing quality
- Increase buyer trust

## Feature flag

```bash
MARKETPLACE_EDUCATION_ENABLED=true   # default: off
```

## Architecture

```
User scenario → EducationContent → Contextual UI → Analytics
```

### Module layout

| File | Role |
|------|------|
| `types.ts` | `EducationContent` model and related types |
| `guides.ts` | GUIDE definitions |
| `tooltips.ts` | TOOLTIP definitions + `selectEducationContent()` |
| `checklists.ts` | CHECKLIST + onboarding + empty states |
| `coach.ts` | Quality breakdown + seller AI coach + finance copy |
| `queries.ts` | Dashboard, content registry, overrides |
| `actions.ts` | Admin CMS toggle / priority / edit |
| `permissions.ts` | Admin/seller gates |
| `flags.ts` | Feature flag |

## Content model — `EducationContent`

| Field | Description |
|-------|-------------|
| `id` | Stable identifier |
| `type` | `GUIDE` · `TOOLTIP` · `CHECKLIST` · `COACH_MESSAGE` |
| `audience` | `SELLER` · `BUYER` · `ADMIN` |
| `context` | Surface (ONBOARDING, PRODUCT_CREATE, GROWTH, PDP, …) |
| `title` / `description` | Copy |
| `steps[]` | Step list for guides/checklists |
| `priority` | Selection order |
| `enabled` | CMS toggle |

Admin overrides persisted via `AdminActionLog` (`entityType: MARKETPLACE_EDUCATION_CONTENT`).

## Surfaces

| Route | Feature |
|-------|---------|
| `/account/onboarding` | 5-step seller path |
| `/account/products/new` & edit | Product creation coach |
| `/account/products/[id]/edit` | «Почему N баллов?» quality breakdown |
| `/account/growth` | «Ваш AI помощник» with metrics |
| `/account/promotions` | Promotion education (no sales promises) |
| `/account/balance` | «Как работает баланс» |
| `/product/[id]` | Buyer education + «Помочь выбрать» |
| `/admin/education` | Content CMS (list, edit, enable, priority) |

## AI Coach connections

Seller coach reads health snapshot and annotates sources when available:

- Seller Growth
- Promotion Intelligence
- Marketplace Execution

Advisory only — no promotion logic, finance calculations, or ranking changes.

## Tooltip system

`EducationTooltip` on Quality Score, Growth Score, Promotion, Balance, Analytics, Conversion.

## Analytics

- `education_view`
- `guide_started` / `guide_completed`
- `tooltip_open`
- `coach_action_click`

## Future: AI tutor

Conversational tutor on top of the same `EducationContent` registry — still advisory, human-readable, no automatic catalog/order changes.

## Tests

- Unit: `tests/marketplace-education.test.ts`
- E2E: `tests/e2e/marketplace-education.spec.ts`

## Out of scope (unchanged)

Catalog Core · Search · Ranking · Orders · Finance calculations · Promotion logic · AI Understanding
