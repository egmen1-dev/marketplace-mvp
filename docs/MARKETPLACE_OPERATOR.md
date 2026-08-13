# Marketplace Operator (MARKETPLACE-OPERATOR-001)

Operational AI layer that turns marketplace analytics into **strategic action plans**.

- **Marketplace Intelligence** → «Что происходит?»
- **Marketplace Operator** → «Что делать дальше?»

Advisory only — **no automatic execution**. Human approval required.

## Feature flag

```bash
MARKETPLACE_OPERATOR_ENABLED=true   # default: off
```

Works best with `MARKETPLACE_INTELLIGENCE_ENABLED=true` (falls back to direct signal collection).

## Architecture

```
Marketplace Intelligence signals
            ↓
     Diagnosis Engine (diagnosis.ts)
            ↓
   Strategy Generator (strategy.ts)
            ↓
      Action Plans (action-plans.ts)
            ↓
      Prioritization + Impact
            ↓
       Human approval
```

### Module layout

| File | Role |
|------|------|
| `diagnosis.ts` | `generateMarketplaceDiagnosis()` |
| `strategy.ts` | `generateGrowthStrategy()` — 4-week plans |
| `action-plans.ts` | `MarketplaceActionPlan` builder |
| `prioritization.ts` | Rank plans, extract top actions |
| `impact.ts` | `ImpactScore` 0–100 (no exact ₽ promises) |
| `queries.ts` | Dashboard + seller/buyer connections |

## Diagnosis categories

- Demand
- Supply
- Conversion
- Revenue
- Seller activity
- Buyer experience

## Impact model (advisory)

| Factor | Weight |
|--------|--------|
| Revenue opportunity | 30 |
| Demand growth | 25 |
| Current weakness | 20 |
| Execution ease | 15 |
| Confidence | 10 |

## Surfaces

| Route | Audience |
|-------|----------|
| `/admin/operator` | Admin — status, problems, growth plans, actions |
| `/account/growth` | Seller — operator + growth connection |
| `/catalog?q=` | Buyer — demand actions strip |

## Analytics

- `operator_view`
- `strategy_view`
- `action_plan_view`
- `recommendation_execute`

## Tests

- Unit: `tests/marketplace-operator.test.ts`
- E2E: `tests/e2e/marketplace-operator.spec.ts`

## Future autonomous mode

Planned evolution (not implemented):

1. Operator playbooks with approval workflows
2. Scheduled replanning from live signals
3. Seller task assignment (opt-in)
4. Impact score calibration from historical outcomes
5. Guardrailed auto-actions behind explicit admin toggles

## Boundaries

Does **not** change catalog core, search/organic ranking, orders, finance calculations, or promotion ranking.
