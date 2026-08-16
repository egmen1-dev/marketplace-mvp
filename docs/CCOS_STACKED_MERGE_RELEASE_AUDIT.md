# CCOS Stacked Merge Release Audit

EPIC-77-STACKED-MERGE-AND-STAGING-ACCEPTANCE-001  
Generated: 2026-08-16

## Stack inventory

| PR | Wave | Branch | Base | Head SHA | Unique commits | Depends on | Mergeable | On main (pre-merge) |
|---|---:|---|---|---|---:|---|---|---|
| #76 | 1 — Brain & Context | `cursor/epic-77-wave-1-marketplace-brain-context-d03e` | `main` | `3d880ee` | 1 | Wave 0 | YES (CLEAN) | NO |
| #77 | 2 — Knowledge & Experiment | `cursor/epic-77-wave-2-knowledge-experiment-d03e` | Wave 1 | `a8ec7ed` | 1 | #76 | YES (CLEAN) | NO |
| #78 | 3 — Product Genome | `cursor/epic-77-wave-3-product-genome-d03e` | Wave 2 | `58c0e82` | 1 | #77 | YES (CLEAN) | NO |
| #79 | 5 — Digital Twin | `cursor/epic-77-wave-5-digital-twin-d03e` | Wave 3 | `d3aad3c` | 1 | #78 | YES (CLEAN) | NO |
| #80 | 4 — Knowledge Graph | `cursor/epic-77-wave-4-knowledge-graph-d03e` | Wave 5 | `353c70a` | 2 | #79 | YES (CLEAN) | NO |
| #81 | RC-1 | `cursor/epic-77-rc-freeze-d03e` | Wave 4 | `15cab8a` | 1 | #80 | YES (CLEAN) | NO |
| #82 | Pre-Wave-6 | `cursor/epic-77-pre-wave-6-d03e` | RC-1 | `8349e1c` | 1 | #81 | YES (CLEAN) | NO |

All PRs are **draft OPEN**. Each PR adds **1 unique commit** (PR #80 adds 2: Wave 4 platform + staging acceptance).

## Duplicate content check

- `cursor/epic-77-pre-wave-6-d03e` is a **linear ancestor chain** containing all wave tips.
- No duplicate migration files added in Wave 1–Pre-Wave-6 stack (CCOS is in-memory / lib-only; no new Prisma migrations).
- No duplicate commits detected when merging tip → `main` (8 commits above Wave 0 docs tip).

## Merge strategy

Because the stack is linear, merge **once**:

```text
origin/main ← cursor/epic-77-stacked-merge-staging-d03e (tip)
```

Equivalent to merging #76→#82 in order without duplicate merge commits.

## Feature flags (staging target)

```env
CCOS_ENABLED=true
CCOS_KNOWLEDGE_PLATFORM_ENABLED=true
CCOS_PRODUCT_PLATFORM_ENABLED=true
CCOS_GRAPH_PLATFORM_ENABLED=true
CCOS_TWIN_PLATFORM_ENABLED=true
MARKETPLACE_COGNITIVE_PLATFORM_ENABLED=true
MARKETPLACE_BRAIN_LEVEL=simulator
MARKETPLACE_RANKING_INTELLIGENCE_ENABLED=true  # advisory only
```

Live sort / autopilot remain OFF.

## Post-merge release marker

Updated after merge — see `docs/CCOS_FULL_STACK_STAGING_ACCEPTANCE.md`.
