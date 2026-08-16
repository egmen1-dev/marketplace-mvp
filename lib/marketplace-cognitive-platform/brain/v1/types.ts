import type { BuildCognitiveContextInput } from "@/lib/ccos/context/builder";
import type { CognitiveContext } from "@/lib/ccos/context/types";
import type { ContextualSignal } from "@/lib/ccos/signals/types";
import type { BrainMaturityLevel } from "@/lib/ccos/governance/maturity";
import type { UniversalObservation } from "@/lib/ccos/observation/types";
import type { PublisherHealth } from "@/lib/ccos/observation/types";

import type { MarketplaceGenomeV1 } from "../../genome/contextual";

export type BrainFactor = {
  label: string;
  delta: number;
  domain: string;
  provenance?: string;
};

export type BrainBlocker = {
  code: string;
  title: string;
  source: string;
  layer: string;
  enforcementNote: string;
};

export type BrainRecommendation = {
  title: string;
  why: string;
  expectedImpact: string;
  effort: "low" | "medium" | "high";
  ctaLabel?: string;
  score: number;
  suppressed?: boolean;
  suppressionReason?: string;
};

export type BrainSimulation = {
  intervention: string;
  predicted: {
    positionDelta?: number;
    ctrDeltaPct?: number;
    conversionDeltaPct?: number;
    salesDeltaPct?: number;
  };
  confidence: number;
  modelSource: string;
  advisoryOnly: true;
  wording: string;
};

export type CognitiveDecision = {
  allowed: boolean;
  blockedCapabilities: string[];
  reasons: string[];
  sourceSystems: string[];
};

export type ActionCandidate = BrainRecommendation & {
  id: string;
  source: string;
  category: "quality" | "trust" | "behaviour" | "ranking" | "promotion" | "data";
  severity: number;
  hardBlocker?: boolean;
};

export interface MarketplaceBrainReport {
  productId: string;
  context: CognitiveContext;
  observations: UniversalObservation[];
  signals: ContextualSignal[];
  genome: MarketplaceGenomeV1;
  estimatedPosition?: {
    value: number | null;
    confidence: number;
    advisoryOnly: true;
  };
  strengths: BrainFactor[];
  weaknesses: BrainFactor[];
  blockers: BrainBlocker[];
  nextBestAction: BrainRecommendation | null;
  actionCandidates: ActionCandidate[];
  simulations: BrainSimulation[];
  explanation: string[];
  summary: {
    now: string;
    why: string;
    nextStep: string | null;
    predictionHint: string | null;
    contextLabel: string | null;
  };
  decision: CognitiveDecision;
  confidence: number;
  maturity: BrainMaturityLevel;
  brainVersion: string;
  advisoryOnly: true;
  publisherHealth: PublisherHealth[];
  provenance: Array<{ claim: string; sourceModule: string; sourceVersion: string }>;
}

export type MarketplaceBrainContextInput = {
  query?: string;
  device?: "mobile" | "desktop" | "tablet" | "unknown";
  sessionGoal?: CognitiveContext["buyer"] extends { sessionGoal: infer S } ? S : never;
  includeSimulations?: boolean;
  contextOverrides?: BuildCognitiveContextInput["overrides"];
};
