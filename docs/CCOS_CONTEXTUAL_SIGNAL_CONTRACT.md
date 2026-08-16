# CCOS Contextual Signal Contract

## Type

```typescript
interface ContextualSignal {
  observationId: string;
  contextId: string;
  domain: string;
  metric: string;
  interpretation: "strong_positive" | "positive" | "neutral" | "negative" | "strong_negative";
  relativeScore?: number;
  confidence: number;
  explanation: string;
}
```

## Interpreters

Registry in `lib/ccos/signals/interpret.ts`. Marketplace domains:

- `behaviour` — CTR/conversion vs category median
- `content` / `visual` — quality vs category median
- `trust` — lifecycle-aware trust interpretation
- `commercial` — price vs median (not auto-bad)
- `query` — relevance separate from content quality

## Version

`INTERPRETER_VERSION = interpreter-v1`
