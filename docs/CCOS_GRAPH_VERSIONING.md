# CCOS Graph Versioning

Engine version: `graph-engine-v1`  
Contract version: `knowledge-graph-v1`

## Snapshots

```typescript
snapshotGraphVersion({ version, nodes, edges })
listGraphVersions()
rollbackGraphVersion(version)
diffGraphVersions(fromVersion, toVersion)
```

Each `buildKnowledgeGraph()` call creates a new snapshot label via `nextGraphVersionLabel()`.

## Diff

`diffGraphVersions` returns:

- `addedNodes` / `removedNodes`
- `addedEdges` / `removedEdges`
- `changedEdges` (weight, confidence, relation changes)

## Rollback

Rollback restores a prior snapshot for Brain/Twin replay. History list is preserved in memory (staging) — production should persist to store in future wave.

## Cache sync version

Offline cache key includes:

```text
{graph.version}:{propagatedConfidence}
```

See `buildGraphCacheEntry()` in `lib/ccos/graph/cache.ts`.

## Brain version mapping

When `CCOS_GRAPH_PLATFORM_ENABLED=true`:

- Brain version: `marketplace-brain-v4-graph`
- When Twin also enabled: `marketplace-brain-v5-twin` (Twin takes precedence)
