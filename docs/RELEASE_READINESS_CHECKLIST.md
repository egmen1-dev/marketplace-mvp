# Release Readiness Checklist

Automated via `GET /api/mobile/readiness`.

## Required flags (staging/production)

```bash
CCOS_ENABLED=true
MARKETPLACE_COGNITIVE_PLATFORM_ENABLED=true
CCOS_KNOWLEDGE_PLATFORM_ENABLED=true
CCOS_GRAPH_PLATFORM_ENABLED=true
CCOS_PRODUCT_PLATFORM_ENABLED=true
CCOS_TWIN_PLATFORM_ENABLED=true
MARKETPLACE_BRAIN_LEVEL=simulator
```

## Checks

| Check | Description |
|-------|-------------|
| CCOS enabled | Core platform on |
| Brain enabled | Cognitive or knowledge platform |
| Graph enabled | Causal graph available |
| Twin enabled | Decision simulation available |
| Knowledge sync | Verified knowledge APIs |
| Autopilot off | L4 must remain blocked |
| Mobile API | `/api/mobile/dashboard` registered |

## Mobile endpoints for app release

| Endpoint | Bundle |
|----------|--------|
| `/api/mobile/dashboard?productId=` | Brain + Genome + Graph + Twin |
| `/api/ccos/graph/insights?productId=` | Graph insights only |
| `/api/ccos/graph/cache` | Offline graph cache |
| `/api/ccos/twin/mobile` | Scenario simulator |
| `/api/mobile/readiness` | This checklist |

## Manual staging steps

1. Open seller product with cognitive preview — graph cause visible
2. Call `/api/mobile/dashboard` — compact JSON under 50KB
3. Disable network — graph cache returns last insights
4. Verify `resolveOrderBy()` unchanged (no graph imports)
5. Confirm autopilot execution throws

## Verdict

- [ ] **RELEASE READINESS: PASS**
- [ ] **RELEASE READINESS: FAIL**
