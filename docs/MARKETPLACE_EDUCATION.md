# Marketplace Education (UX-EDUCATION-001)

Guidance and education layer integrated directly into marketplace user flows — not a separate help center.

**Goal:** New sellers understand what to do and why; new buyers understand product fit, safe purchase, and post-order flow.

**Human-readable only** — no changes to catalog core, search, ranking, orders, finance logic, or AI understanding.

## Feature flag

```bash
MARKETPLACE_EDUCATION_ENABLED=true   # default: off
```

## Architecture

```
User scenario (onboarding, product form, PDP, growth…)
        ↓
EducationGuide / Tooltip / Checklist (lib/marketplace-education/)
        ↓
Contextual UI (features/marketplace-education/)
        ↓
Analytics (education_view, guide_started, …)
```

### Module layout

| File | Role |
|------|------|
| `concepts.ts` | Core “why it matters” copy |
| `guides.ts` | `EducationGuide` definitions |
| `tooltips.ts` | Reusable tooltip content + product form tips |
| `checklists.ts` | Seller onboarding + empty-state copy |
| `progress.ts` | Quality score breakdown helpers |
| `permissions.ts` | Admin/seller gates |
| `queries.ts` | Onboarding, coach, buyer topics, dashboard |

## EducationGuide

Fields: `id`, `target` (SELLER/BUYER/ADMIN), `title`, `description`, `steps[]`, `context`, `priority`.

Examples:
- Seller: «Как сделать первую продажу»
- Buyer: «Как безопасно купить товар»

## Surfaces

| Route | Purpose |
|-------|---------|
| `/account/onboarding` | Seller 5-step onboarding path |
| `/account/products/new` | Contextual tips (title, photos, characteristics) |
| `/account/products/[id]/edit` | Quality score «Почему N/100?» breakdown |
| `/account/growth` | AI Coach «Ваш следующий шаг» |
| `/account/promotions` | «Как работает продвижение» (no result promises) |
| `/account/balance` | «Почему деньги ожидаются?» (UX only) |
| `/product/[id]` | Buyer trust topics + «Помочь выбрать» assistant |
| `/admin/education` | Content manager (guides, tooltips, onboarding preview) |

Empty states (favorites, sales) use educational copy when flag is on.

## Tooltip system

`EducationTooltip` — reusable component for Quality Score, Promotion, Balance, Analytics, Conversion contexts.

## Analytics

- `education_view`
- `guide_started`
- `guide_completed`
- `tooltip_opened`
- `coach_action_click`

## Future: AI tutor

Planned extension: conversational tutor on top of the same guides/tooltips — still advisory, no automatic catalog or order changes. Content management via `/admin/education`.

## Tests

- Unit: `tests/education-engine.test.ts`
- E2E: `tests/e2e/marketplace-education.spec.ts`

## Out of scope (unchanged)

Catalog Core · Search · Ranking · Orders · Finance logic · AI Understanding
