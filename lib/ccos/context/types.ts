export interface CognitiveContext {
  id: string;
  query?: {
    raw: string;
    normalized?: string;
    intent?: string[];
  };
  market?: {
    country?: string;
    region?: string;
    season?: string;
    device?: "mobile" | "desktop" | "tablet";
  };
  buyer?: {
    sessionGoal?: "browse" | "buy" | "gift" | "compare" | "unknown";
  };
  seller?: {
    lifecycle?: "new" | "growing" | "established" | "unknown";
    trustTier?: string;
  };
  createdAt: string;
}

export function createContextId(seed: string): string {
  return `ctx_${seed.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64)}`;
}
