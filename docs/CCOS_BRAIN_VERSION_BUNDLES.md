# CCOS Brain Version Bundles

```typescript
interface CognitiveVersionBundle {
  brainVersion: string;
  knowledgePackVersion: string;
  graphVersion: string;
  reasoningPolicyVersion: string;
  actionPolicyVersion: string;
}
```

Promotion switches bundle atomically. Pre-promotion snapshot saved for rollback target.
