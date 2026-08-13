# Marketplace Execution (MARKETPLACE-EXECUTION-001)

Operational layer that turns Marketplace Operator strategies into **executable task plans**.

- **Operator** → «Что нужно сделать?»
- **Execution** → «Как выполнить это действие?»

**Human-in-the-loop only** — AI organizes work; no automatic catalog, pricing, order, or payment changes.

## Feature flag

```bash
MARKETPLACE_EXECUTION_ENABLED=true   # default: off
MARKETPLACE_OPERATOR_ENABLED=true    # recommended
```

## Architecture

```
Marketplace Operator plans
        ↓
Execution Plan (execution-plan.ts)
        ↓
Tasks (tasks.ts) + Workflows (workflows.ts)
        ↓
Human execution (server actions)
        ↓
Progress tracking (progress.ts) + Impact measurement
```

### Module layout

| File | Role |
|------|------|
| `execution-plan.ts` | `MarketplaceExecutionPlan` from operator |
| `tasks.ts` | `generateExecutionTasks()` |
| `workflows.ts` | Task lifecycle validation |
| `progress.ts` | `ExecutionProgress` metrics |
| `permissions.ts` | Admin/seller gates |
| `actions.ts` | Start/complete task (AdminActionLog + analytics) |
| `queries.ts` | Dashboard + seller/buyer connections |

## Execution plan statuses

`DRAFT` · `ACTIVE` · `PAUSED` · `COMPLETED` · `ARCHIVED`

## Task types

`SELLER_OUTREACH` · `PRODUCT_IMPROVEMENT` · `PROMOTION_LAUNCH` · `CATEGORY_EXPANSION` · `PRICE_OPTIMIZATION` · `BUYER_ACQUISITION` · `CONTENT_IMPROVEMENT`

## Progress metrics

- `tasks_total` / `tasks_completed` / `tasks_in_progress`
- `completion_rate`
- `impact_score` (from operator plans)
- Weekly summary from analytics (`task_completed`)

Task state persisted via `AdminActionLog` (`entityType: MARKETPLACE_EXECUTION_TASK`).

## Surfaces

| Route | Audience |
|-------|----------|
| `/admin/execution` | Admin execution dashboard |
| `/account/growth` | Seller fix actions with «Исправить» button |
| `/catalog?q=` | Buyer demand → category expansion link |

## Analytics

- `execution_view`
- `execution_plan_created`
- `task_started`
- `task_completed`
- `plan_completed`

## Tests

- Unit: `tests/marketplace-execution.test.ts`
- E2E: `tests/e2e/marketplace-execution.spec.ts`

## Human approval model

1. Operator generates strategic recommendation  
2. Execution expands into tasks  
3. Admin marks **Начать** / **Выполнено** (writes audit log + analytics)  
4. Seller uses deep links to fix products manually  
5. No background jobs mutate catalog or finance  

## Future autonomous mode (not implemented)

- Approval queues with assignees  
- Scheduled replanning  
- Guardrailed auto-actions behind explicit admin opt-in  
- Calibrated impact measurement from historical outcomes  

## Boundaries

Does **not** change catalog core, search/organic ranking, orders, finance calculations, or payment flow.
