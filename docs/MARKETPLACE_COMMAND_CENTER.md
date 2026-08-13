# Marketplace Command Center (MARKETPLACE-CONTROL-CENTER-001)

Unified Marketplace AI OS presentation layer — aggregates existing intelligence modules without new algorithms.

## Feature flag

```bash
MARKETPLACE_COMMAND_CENTER_ENABLED=true   # default: off
```

## Architecture

```
Existing modules (AI Experience, Growth, Trust, Learning, Operator, …)
        ↓
lib/marketplace-command-center/ (widgets + priorities + health)
        ↓
Seller / Admin Command Center UI
        ↓
Unified notifications + analytics
```

### Module layout

| File | Role |
|------|------|
| `dashboard.ts` | Empty states, AI summary copy |
| `widgets.ts` | Opportunity & admin widget cards |
| `priorities.ts` | `CommandCenterPriority` engine (TOP-5) |
| `health.ts` | Seller health scores aggregation |
| `queries.ts` | Seller/admin dashboards, notifications |
| `permissions.ts` | Admin/seller gates |
| `flags.ts` | `MARKETPLACE_COMMAND_CENTER_ENABLED` |

## Priority engine

`CommandCenterPriority` fields: title, source, impact, urgency, action, entity, why, howTo.

Sources: Seller Growth, Trust, Learning, Promotion, Operator, Execution, Communication, Education, AI Experience.

- Seller: **ONE** next action
- Admin: **TOP-5** priorities

## Surfaces

| Route | Audience | Blocks |
|-------|----------|--------|
| `/account/command-center` | Seller | Health, AI summary, next action, opportunities, what works |
| `/admin/command-center` | Admin | Health, AI priorities, execution, learning, trust, revenue |
| `/notifications` | Seller | Unified inbox when command center enabled |

## Aggregated modules

- AI Experience
- Seller Growth
- Buyer Intelligence (via existing stacks)
- Marketplace Intelligence
- Operator
- Execution
- Communication
- Education
- Trust Safety
- Learning Loop

## Analytics

- `command_center_view`
- `priority_view`
- `priority_action_click`

## Constraints

- No new scoring algorithms — reuses existing module outputs
- Does not change Catalog, Search, Ranking, Orders, Finance, Stripe, Promotion ranking

## Enable

```bash
MARKETPLACE_COMMAND_CENTER_ENABLED=true
# Recommended companion flags for full data:
AI_EXPERIENCE_ENABLED=true
SELLER_GROWTH_ENABLED=true
TRUST_SAFETY_ENABLED=true
MARKETPLACE_LEARNING_ENABLED=true
```
