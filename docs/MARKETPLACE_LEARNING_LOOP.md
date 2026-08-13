# Marketplace Learning Loop (MARKETPLACE-LEARNING-LOOP-001)

Self-learning analytical layer: every AI recommendation gets **reason → action → outcome → pattern**.

Does **not** change Catalog, Search, Ranking, Orders, Finance, Stripe, or Promotion ranking.

## Feature flag

```bash
MARKETPLACE_LEARNING_ENABLED=true   # default: off
```

## Architecture

```
AI Recommendation
        ↓
Learning Experiment (CREATED → RUNNING → SUCCESS/FAILED/INCONCLUSIVE)
        ↓
User Action (PRODUCT_IMAGE_UPDATE, START_PROMOTION, …)
        ↓
Marketplace Metrics (views, cart, orders, conversion)
        ↓
Outcome Evaluation (POSITIVE / NEGATIVE / NEUTRAL)
        ↓
Knowledge Pattern + Knowledge Base
```

### Module layout (`lib/marketplace-learning/`)

| File | Role |
|------|------|
| `experiments.ts` | `LearningExperiment` lifecycle |
| `actions.ts` | Action tracking linked to AI / Growth / Trust / Promo |
| `outcomes.ts` | `ExperimentOutcome` before/after metrics |
| `learning-signals.ts` | Metric snapshots, score helpers |
| `patterns.ts` | `LearningPattern` + seed knowledge |
| `recommendations.ts` | `RecommendationQualityScore`, knowledge base |
| `queries.ts` | Seller insights, admin dashboard |
| `store.ts` | In-memory experiment store (foundation) |
| `flags.ts` | `MARKETPLACE_LEARNING_ENABLED` |

## Surfaces

| Route | Purpose |
|-------|---------|
| `/account/ai-center` | Block «Что реально работает» |
| `/admin/learning` | Experiments, patterns, AI accuracy, knowledge base |

## Analytics

- `learning_experiment_created`
- `learning_action_started`
- `learning_action_completed`
- `learning_outcome_positive`
- `learning_pattern_created`
- `ai_recommendation_quality`

## Future roadmap

- **ML** — train models on stored experiment outcomes
- **Knowledge base** — persist patterns to DB / vector store
- **AI evolution** — LLM agents grounded in marketplace patterns

## Constraints

- Advisory / analytical only
- In-memory store for MVP — upgrade to Prisma when cross-restart durability is required
- Outcomes computed from existing seller-health metrics
