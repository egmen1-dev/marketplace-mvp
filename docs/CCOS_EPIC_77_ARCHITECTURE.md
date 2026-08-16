# CCOS EPIC 77 — Architecture

## Vision

**Cognitive Commerce Operating System (CCOS)** is the app-agnostic cognitive core for commerce products (Marketplace, DAOS, QuickSale, CRM, ERP, …).

Wave 0 delivers foundation only — not full CCOS.

## Layers (target)

```text
Apps → Observations → Context → Reasoning → Prediction → Decision → Explanation
              ↕ Knowledge · Memory · Experiments · Graph
```

Wave 0 implements: **Observation**, minimal **Knowledge** types, **Governance**, Marketplace **Genome + Brain** consumer.

## Boundaries

```text
lib/ccos/                     app-agnostic core (NO marketplace imports)
lib/marketplace-cognitive-platform/   marketplace publishers + genome + brain
```

Dependency direction:

```text
Marketplace modules → publishers → CCOS
```

Never:

```text
CCOS → Marketplace internals
```

## Observation ≠ Signal

- **Observation**: what the system measured (`behaviour.ctr = 1.8%`)
- **Signal**: contextual interpretation (deferred beyond Wave 0 production)

## Knowledge safety path

```text
Observation → Evidence → Hypothesis → Experiment → Verified Knowledge
  → Candidate → Validation → Human Approval → Production
```

Direct `Observation → production rule` is forbidden (enforced in store + tests).

## Maturity

| Component | Wave 0 level |
|---|---|
| CCOS Observation | L1_OBSERVER |
| Marketplace Brain | L2_ADVISOR |
| Autopilot | DISABLED |

## Hard guards

- No wallet / payout / refund from CCOS
- No moderation enforcement from CCOS (mirror only)
- No live ranking changes from CCOS

## Versioning

Every observation carries `source.module` + `source.version`. Genome and Brain export `genomeVersion` / `brainVersion`.

## Status wording

Use **「CCOS WAVE 0 FOUNDATION READY」** — not 「CCOS READY」.
