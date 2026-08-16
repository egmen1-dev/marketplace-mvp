import type { UniversalObservation } from "@/lib/ccos/observation/types";
import type { PublisherHealth } from "@/lib/ccos/observation/types";
import type { BrainMaturityLevel } from "@/lib/ccos/governance/maturity";
import type { GenomeProfile } from "../genome/types";

export type DecisionBlocker = {
  code: string;
  title: string;
  source: string;
  enforcementNote: string;
};

export type BrainFactorDelta = {
  label: string;
  delta: number;
  domain: string;
};

export type CognitiveProductReport = {
  productId: string;
  observations: UniversalObservation[];
  genome: GenomeProfile;
  explanation: {
    headline: string;
    factorDeltas: BrainFactorDelta[];
  };
  blockers: DecisionBlocker[];
  strengths: string[];
  missingData: string[];
  nextStep: string | null;
  publisherHealth: PublisherHealth[];
  maturityLevel: BrainMaturityLevel;
  brainVersion: string;
  advisoryOnly: true;
  provenance: Array<{ claim: string; sourceModule: string; sourceVersion: string }>;
};
