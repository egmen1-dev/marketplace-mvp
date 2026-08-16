import {
  MOBILE_API_VERSION,
  MOBILE_SCHEMA_VERSION,
  MOBILE_DEEP_LINK_SCHEME,
  APK_UPDATE_METADATA,
  MOBILE_APP_VERSION,
  MOBILE_MIN_SUPPORTED_APP_VERSION,
  MOBILE_RECOMMENDED_APP_VERSION,
  MOBILE_ENV_CONFIG,
} from "./api-contract";
import { isCcosEnabled } from "@/lib/ccos/flags";
import { isCcosGraphPlatformEnabled } from "@/lib/ccos/graph/flags";
import { isCcosTwinPlatformEnabled } from "@/lib/ccos/twin/flags";
import { isCcosKnowledgePlatformEnabled } from "@/lib/ccos/knowledge/flags";
import { isCcosProductPlatformEnabled } from "@/lib/ccos/product/flags";
import {
  MARKETPLACE_BRAIN_MATURITY,
  assertBrainCapability,
} from "@/lib/ccos/governance/maturity";
import { currentMarketplaceBrainVersion } from "@/lib/ccos/knowledge/versions";
import { getActiveBrainVersion } from "@/lib/ccos/rollback/brain";
import { buildCognitiveCapabilitiesManifest } from "./cognitive-capabilities";
import { buildBrainCompatibilityFields } from "./brain-compatibility";
import {
  CLOSED_ALPHA_MINIMUM_SUPPORTED_VERSION_CODE,
  CLOSED_ALPHA_MINIMUM_SUPPORTED_VERSION_NAME,
} from "@/lib/mobile-release-platform/baseline";
import { KNOWLEDGE_GRAPH_CONTRACT_VERSION } from "@/lib/ccos/graph/types";
import { TWIN_CONTRACT_VERSION } from "@/lib/ccos/twin/types";

export type MobileBootstrapPayload = {
  apiVersion: typeof MOBILE_API_VERSION;
  schemaVersion: typeof MOBILE_SCHEMA_VERSION;
  minSupportedApiVersion: string;
  minSupportedSchemaVersion: string;
  deepLinkScheme: typeof MOBILE_DEEP_LINK_SCHEME;
  releaseChannel: "dev" | "staging" | "prod";
  baseUrl: string;
  featureFlags: {
    ccosEnabled: boolean;
    cognitivePlatform: boolean;
    graphPlatform: boolean;
    twinPlatform: boolean;
    productPlatform: boolean;
    knowledgePlatform: boolean;
  };
  brainCapabilities: {
    maturity: string;
    observe: boolean;
    recommend: boolean;
    simulate: boolean;
    execute: boolean;
    brainVersion: string;
  };
  cognitiveCapabilities: ReturnType<typeof buildCognitiveCapabilitiesManifest>;
  brainSchemaVersion: string;
  minimumSupportedBrainSchemaVersion: string;
  supportedModes: ("buyer" | "seller")[];
  supportedSchemaVersions: string[];
  recommendedSyncIntervalSec: number;
  minimumSupportedAppVersion: string;
  minimumSupportedVersionCode: number;
  recommendedAppVersion: string;
  forceUpgrade: boolean;
  endpoints: {
    dashboard: string;
    config: string;
    readiness: string;
    graphInsights: string;
    graphCache: string;
    twinMobile: string;
  };
  advisoryOnly: true;
};

function resolveReleaseChannel(): "dev" | "staging" | "prod" {
  const env = process.env.VERCEL_ENV ?? process.env.RAILWAY_ENVIRONMENT ?? process.env.NODE_ENV;
  if (env === "production") return "prod";
  if (env === "development") return "dev";
  return "staging";
}

export function buildMobileBootstrapPayload(): MobileBootstrapPayload {
  const channel = resolveReleaseChannel();
  const baseUrl =
    channel === "dev"
      ? MOBILE_ENV_CONFIG.dev.baseUrl
      : channel === "prod"
        ? MOBILE_ENV_CONFIG.prod.baseUrl
        : MOBILE_ENV_CONFIG.staging.baseUrl;

  const brainCompat = buildBrainCompatibilityFields();
  const cognitiveCapabilities = buildCognitiveCapabilitiesManifest();

  return {
    apiVersion: MOBILE_API_VERSION,
    schemaVersion: MOBILE_SCHEMA_VERSION,
    minSupportedApiVersion: APK_UPDATE_METADATA.minSupportedApiVersion,
    minSupportedSchemaVersion: APK_UPDATE_METADATA.minSupportedSchemaVersion,
    deepLinkScheme: MOBILE_DEEP_LINK_SCHEME,
    releaseChannel: channel,
    baseUrl,
    featureFlags: {
      ccosEnabled: isCcosEnabled(),
      cognitivePlatform: process.env.MARKETPLACE_COGNITIVE_PLATFORM_ENABLED === "true",
      graphPlatform: isCcosGraphPlatformEnabled(),
      twinPlatform: isCcosTwinPlatformEnabled(),
      productPlatform: isCcosProductPlatformEnabled(),
      knowledgePlatform: isCcosKnowledgePlatformEnabled(),
    },
    brainCapabilities: {
      maturity: MARKETPLACE_BRAIN_MATURITY,
      observe: assertBrainCapability(MARKETPLACE_BRAIN_MATURITY, "observe"),
      recommend: assertBrainCapability(MARKETPLACE_BRAIN_MATURITY, "recommend"),
      simulate: assertBrainCapability(MARKETPLACE_BRAIN_MATURITY, "simulate"),
      execute: assertBrainCapability(MARKETPLACE_BRAIN_MATURITY, "execute"),
      brainVersion: getActiveBrainVersion() || currentMarketplaceBrainVersion(),
    },
    cognitiveCapabilities,
    brainSchemaVersion: brainCompat.brainSchemaVersion,
    minimumSupportedBrainSchemaVersion: brainCompat.minimumSupportedBrainSchemaVersion,
    supportedModes: ["buyer", "seller"],
    supportedSchemaVersions: [MOBILE_SCHEMA_VERSION],
    recommendedSyncIntervalSec: 900,
    minimumSupportedAppVersion: CLOSED_ALPHA_MINIMUM_SUPPORTED_VERSION_NAME,
    minimumSupportedVersionCode: CLOSED_ALPHA_MINIMUM_SUPPORTED_VERSION_CODE,
    recommendedAppVersion: MOBILE_RECOMMENDED_APP_VERSION,
    forceUpgrade: false,
    endpoints: {
      dashboard: "/api/mobile/dashboard",
      config: "/api/mobile/config",
      readiness: "/api/mobile/readiness",
      graphInsights: "/api/ccos/graph/insights",
      graphCache: "/api/ccos/graph/cache",
      twinMobile: "/api/ccos/twin/mobile",
    },
    advisoryOnly: true,
  };
}
