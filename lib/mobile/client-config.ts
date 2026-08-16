import { MOBILE_API_VERSION, MOBILE_SCHEMA_VERSION, MOBILE_ENV_CONFIG } from "./api-contract";
import { isCcosGraphPlatformEnabled } from "@/lib/ccos/graph/flags";
import { isCcosTwinPlatformEnabled } from "@/lib/ccos/twin/flags";
import { isCcosProductPlatformEnabled } from "@/lib/ccos/product/flags";
import { KNOWLEDGE_GRAPH_CONTRACT_VERSION, GRAPH_ENGINE_VERSION } from "@/lib/ccos/graph/types";
import { TWIN_CONTRACT_VERSION } from "@/lib/ccos/twin/types";
import { currentMarketplaceBrainVersion } from "@/lib/ccos/knowledge/versions";
import { getActiveBrainVersion } from "@/lib/ccos/rollback/brain";
import { buildBrainCompatibilityFields } from "./brain-compatibility";

export type MobileClientConfigPayload = {
  apiVersion: typeof MOBILE_API_VERSION;
  schemaVersion: typeof MOBILE_SCHEMA_VERSION;
  releaseChannel: "dev" | "staging" | "prod";
  environments: typeof MOBILE_ENV_CONFIG;
  modules: {
    brain: { enabled: boolean; version: string };
    productGenome: { enabled: boolean };
    graph: { enabled: boolean; contractVersion: string; engineVersion: string };
    twin: { enabled: boolean; contractVersion: string };
    offlineCache: { enabled: boolean };
  };
  supportedFeatures: string[];
  limits: {
    maxDashboardPayloadKb: number;
    maxConcurrentSyncRequests: number;
    graphPathDepthMax: number;
  };
  brainSchemaVersion: string;
  minimumSupportedBrainSchemaVersion: string;
  supportedModes: ("buyer" | "seller")[];
  advisoryOnly: true;
};

function resolveReleaseChannel(): "dev" | "staging" | "prod" {
  const env = process.env.VERCEL_ENV ?? process.env.RAILWAY_ENVIRONMENT ?? process.env.NODE_ENV;
  if (env === "production") return "prod";
  if (env === "development") return "dev";
  return "staging";
}

export function buildMobileClientConfig(): MobileClientConfigPayload {
  const graphOn = isCcosGraphPlatformEnabled();
  const twinOn = isCcosTwinPlatformEnabled();
  const cognitive = process.env.MARKETPLACE_COGNITIVE_PLATFORM_ENABLED === "true";

  const supportedFeatures = ["auth_session", "mobile_dashboard", "readiness_check"];
  if (graphOn) supportedFeatures.push("graph_insights_compact", "graph_offline_cache");
  if (twinOn) supportedFeatures.push("twin_scenario_simulator");
  if (cognitive) supportedFeatures.push("brain_advisory_report");
  if (isCcosProductPlatformEnabled()) supportedFeatures.push("product_genome");

  const brainCompat = buildBrainCompatibilityFields();

  return {
    apiVersion: MOBILE_API_VERSION,
    schemaVersion: MOBILE_SCHEMA_VERSION,
    releaseChannel: resolveReleaseChannel(),
    environments: MOBILE_ENV_CONFIG,
    modules: {
      brain: { enabled: cognitive, version: getActiveBrainVersion() || currentMarketplaceBrainVersion() },
      productGenome: { enabled: isCcosProductPlatformEnabled() },
      graph: {
        enabled: graphOn,
        contractVersion: KNOWLEDGE_GRAPH_CONTRACT_VERSION,
        engineVersion: GRAPH_ENGINE_VERSION,
      },
      twin: { enabled: twinOn, contractVersion: TWIN_CONTRACT_VERSION },
      offlineCache: { enabled: graphOn },
    },
    supportedFeatures,
    limits: {
      maxDashboardPayloadKb: 50,
      maxConcurrentSyncRequests: 20,
      graphPathDepthMax: 12,
    },
    brainSchemaVersion: brainCompat.brainSchemaVersion,
    minimumSupportedBrainSchemaVersion: brainCompat.minimumSupportedBrainSchemaVersion,
    supportedModes: ["buyer", "seller"],
    advisoryOnly: true,
  };
}
