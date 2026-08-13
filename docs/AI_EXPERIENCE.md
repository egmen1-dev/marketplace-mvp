# AI Experience (MARKETPLACE-AI-EXPERIENCE-001)

Unified presentation layer for existing AI/Intelligence modules — **no new algorithms**.

Aggregates Buyer Intelligence, Seller Growth, Promotion Intelligence, Marketplace Intelligence, Operator, Execution, Communication, and Education into cohesive seller, buyer, and admin experiences.

## Feature flag

```bash
AI_EXPERIENCE_ENABLED=true   # default: off
```

Recommended companion flags (existing modules):

```bash
SELLER_GROWTH_ENABLED=true
MARKETPLACE_EDUCATION_ENABLED=true
MARKETPLACE_EXECUTION_ENABLED=true
MARKETPLACE_INTELLIGENCE_ENABLED=true
BUYER_INTELLIGENCE_ENABLED=true
```

## Architecture

```
Existing intelligence modules
        ↓
lib/ai-experience/ (aggregation + priority + cards)
        ↓
Seller / Buyer / Admin UI surfaces
        ↓
Analytics
```

### Module layout

| File | Role |
|------|------|
| `dashboard.ts` | Empty states + happening summary |
| `cards.ts` | Opportunity & admin health cards |
| `recommendations.ts` | Why / benefit / how formatting |
| `priority.ts` | `PriorityRecommendation` — ONE best action |
| `queries.ts` | Seller center, admin center, notifications, buyer assistant |
| `permissions.ts` | Admin/seller gates |
| `flags.ts` | `AI_EXPERIENCE_ENABLED` |

## Priority engine

`pickPriorityRecommendation()` reuses signals from:

- Growth Score (`nextAction`)
- Quality Score (weak cards)
- Promotion Opportunity
- Execution Priority
- Education Coach
- Communication LOT recommendation

Output: **one** action with `why`, `benefit`, `howTo` — not a list of 15 problems.

## Surfaces

| Route | Audience | Purpose |
|-------|----------|---------|
| `/account/ai-center` | Seller | «Центр роста продавца» |
| `/admin/ai-center` | Admin | Intelligence + Operator + Execution |
| `/notifications` | User | AI inbox foundation (no push/email) |
| PDP | Buyer | «Помочь выбрать» via Buyer Intelligence + Education |

## Notification types

- `AI_RECOMMENDATION`
- `TASK_READY`
- `PRODUCT_ISSUE`
- `PROMOTION_OPPORTUNITY`

## Analytics

- `ai_center_view`
- `ai_recommendation_view`
- `ai_action_click`
- `ai_notification_open`

## Future

- **LLM integration** — natural language explanations on top of same priority engine
- **Autonomous agents** — still human-in-the-loop; no catalog/order/finance changes

## Tests

- Unit: `tests/ai-experience.test.ts`
- E2E: `tests/e2e/ai-experience.spec.ts`

## Out of scope (unchanged)

Catalog · Search · Ranking · Orders · Finance · Payments · Promotion logic · AI Understanding algorithms
