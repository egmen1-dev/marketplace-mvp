# CCOS Shadow Evaluation

Candidate runs in shadow:

```text
same input → Current Brain (seller-visible)
same input → Candidate Brain (hidden)
```

Critical disagreement example:

```text
Current: QUALITY BLOCKED
Candidate: PROMOTE
→ FAIL
```

Stored as `EvolutionShadowResult` in `lib/ccos/evolution/shadow.ts`.
