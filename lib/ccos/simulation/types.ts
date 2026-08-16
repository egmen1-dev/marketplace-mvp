import type { UniversalObservation } from "@/lib/ccos/observation/types";
import type { SimulationScenario } from "@/lib/ccos/contracts/scenario";

export const SIMULATION_PORT_CONTRACT_VERSION = "simulation-port-v1";

export type SimulationAppId = "marketplace" | "daos" | "quicksale" | "advertising" | "search";

export type GraphSimulationContext = {
  coverage: number;
  propagatedConfidence: number;
  version?: string;
};

export type SimulationEntityDimensions = {
  rankingScore?: number | null;
  position?: number | null;
  ctr?: number | null;
  conversion?: number | null;
  revenueIndex?: number | null;
  trust?: number | null;
  contentQuality?: number | null;
  promotionActive?: boolean;
  price?: number | null;
  photoCount?: number | null;
  hasVideo?: boolean;
};

export interface RankingSimulationInput {
  entityId: string;
  entityLabel?: string;
  observations: UniversalObservation[];
  graphContext?: GraphSimulationContext;
  scenario: SimulationScenario;
  mode: "baseline" | "scenario";
  binding?: unknown;
}

export interface RankingSimulationOutput {
  estimatedPosition?: number | null;
  relativeScore?: number | null;
  positionDelta?: number | null;
  scoreDelta?: number | null;
  ctrDeltaPct?: number | null;
  conversionDeltaPct?: number | null;
  revenueDeltaPct?: number | null;
  dimensions?: SimulationEntityDimensions;
  factors: Array<{ key: string; contribution: number; confidence: number }>;
  confidence: number;
  source: {
    app: SimulationAppId;
    module: string;
    version: string;
    portId: string;
  };
}

export type RankingSimulationStatus = "OK" | "DEGRADED" | "TIMEOUT" | "ERROR";

export interface RankingSimulationResult extends RankingSimulationOutput {
  status: RankingSimulationStatus;
  failedPort?: string;
  failureReason?: string;
  retryable?: boolean;
}

export interface RankingSimulationPort {
  id: string;
  version: string;
  contractVersion: typeof SIMULATION_PORT_CONTRACT_VERSION;
  app: SimulationAppId;
  evaluate(input: RankingSimulationInput): Promise<RankingSimulationResult>;
}

export const DEFAULT_SIMULATION_TIMEOUT_MS = 8000;
