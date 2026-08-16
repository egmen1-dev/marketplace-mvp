# CCOS Cross-App Graph

## Supported apps

| App | Example nodes | Example path |
|-----|---------------|--------------|
| `marketplace` | Orders, Product | Conversion → Orders → Revenue |
| `daos` | Lighting, Contrast, Composition | Lighting → Photo → CTR |
| `quicksale` | Buyer Intent, Decision Maker | Buyer Intent → Conversion |

## Contract rules

1. Every edge stores `app: GraphAppId`
2. No DAOS / QuickSale codebase imports in `lib/ccos/graph/core`
3. Synthetic observations accepted via universal observation contract (Wave 0)
4. Cross-app edges materialized with `materializeEdges(..., { app: "daos" })`

## API surface

Graph build merges all registered app extensions:

```typescript
for (const app of ["marketplace", "daos", "quicksale"]) {
  const ext = crossAppGraphExtensions(app);
  // add nodes + edges
}
```

## Provenance in admin debug

Admin cognitive panel shows:

- node/edge list
- `causal` vs `correlates`
- `app` per edge
- evidence ids and sources

## Future apps

Add new `GraphAppId` + `crossAppGraphExtensions("advertising")` without changing traversal or confidence engines.
