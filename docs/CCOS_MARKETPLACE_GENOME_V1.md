# CCOS Marketplace Genome V1

## Structure

```typescript
interface MarketplaceGenomeV1 {
  base: GenomeProfile;        // Wave 0 aggregation — unchanged by query
  contextual: {
    overall: number | null;
    dimensions: Record<string, number | null>;
    confidence: number;
    contextId: string;
  };
  genomeVersion: string;
}
```

## Rules

- **Never rewrite** base observation scores
- Contextual overlay applies signal deltas + device adjustments (e.g. mobile visual −6)
- Query changes → contextual layer only

Implementation: `lib/marketplace-cognitive-platform/genome/contextual.ts`
