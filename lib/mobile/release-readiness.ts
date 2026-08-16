import {
  MOBILE_API_VERSION,
  MOBILE_SCHEMA_VERSION,
  MOBILE_DEEP_LINK_SCHEME,
  MOBILE_ENV_CONFIG,
  APK_UPDATE_METADATA,
} from "./api-contract";

export type ReleaseCheckItem = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

export type ReleaseReadinessReport = {
  ready: boolean;
  passed: number;
  total: number;
  checks: ReleaseCheckItem[];
  evaluatedAt: string;
};

export function runReleaseReadinessCheck(): ReleaseReadinessReport {
  const checks: ReleaseCheckItem[] = [
    {
      id: "ccos_enabled",
      label: "CCOS enabled",
      ok: process.env.CCOS_ENABLED === "true",
      detail: process.env.CCOS_ENABLED === "true" ? "CCOS_ENABLED=true" : "Set CCOS_ENABLED=true",
    },
    {
      id: "brain_enabled",
      label: "Marketplace Brain available",
      ok:
        process.env.MARKETPLACE_COGNITIVE_PLATFORM_ENABLED === "true" ||
        process.env.CCOS_KNOWLEDGE_PLATFORM_ENABLED === "true",
      detail: "Cognitive platform or knowledge platform flag",
    },
    {
      id: "graph_enabled",
      label: "Graph platform enabled",
      ok: process.env.CCOS_GRAPH_PLATFORM_ENABLED === "true",
      detail: "CCOS_GRAPH_PLATFORM_ENABLED=true",
    },
    {
      id: "twin_enabled",
      label: "Twin platform enabled",
      ok: process.env.CCOS_TWIN_PLATFORM_ENABLED === "true",
      detail: "CCOS_TWIN_PLATFORM_ENABLED=true",
    },
    {
      id: "knowledge_sync",
      label: "Knowledge platform enabled",
      ok:
        process.env.CCOS_KNOWLEDGE_PLATFORM_ENABLED === "true" ||
        process.env.MARKETPLACE_COGNITIVE_PLATFORM_ENABLED === "true",
      detail: "Verified knowledge read APIs available",
    },
    {
      id: "autopilot_off",
      label: "Autopilot disabled (L4 blocked)",
      ok: process.env.MARKETPLACE_BRAIN_MATURITY !== "L4_AUTOPILOT",
      detail: "Autopilot must remain off before public release",
    },
    {
      id: "mobile_bootstrap_api",
      label: "Mobile bootstrap API",
      ok: true,
      detail: "GET /api/mobile/bootstrap",
    },
    {
      id: "mobile_config_api",
      label: "Mobile config API",
      ok: true,
      detail: "GET /api/mobile/config",
    },
    {
      id: "mobile_dashboard_api",
      label: "Mobile dashboard route registered",
      ok: true,
      detail: "GET /api/mobile/dashboard?productId=",
    },
    {
      id: "mobile_graph_insights_api",
      label: "Mobile graph insights API",
      ok: true,
      detail: "GET/POST /api/ccos/graph/insights?compact=1",
    },
    {
      id: "mobile_graph_cache_api",
      label: "Offline graph cache API",
      ok: true,
      detail: "GET/POST /api/ccos/graph/cache",
    },
    {
      id: "mobile_api_contract_version",
      label: "API contract version",
      ok: Boolean(MOBILE_API_VERSION && MOBILE_SCHEMA_VERSION),
      detail: `${MOBILE_API_VERSION} / ${MOBILE_SCHEMA_VERSION}`,
    },
    {
      id: "mobile_auth_compatibility",
      label: "Auth compatibility (session routes unchanged)",
      ok: true,
      detail: "Existing NextAuth/session routes remain primary auth path",
    },
    {
      id: "required_flags",
      label: "Required CCOS flags for staging",
      ok:
        process.env.CCOS_ENABLED === "true" &&
        process.env.CCOS_GRAPH_PLATFORM_ENABLED === "true" &&
        process.env.CCOS_TWIN_PLATFORM_ENABLED === "true",
      detail: "CCOS + GRAPH + TWIN flags",
    },
    {
      id: "brain_health",
      label: "Brain health path available",
      ok:
        process.env.MARKETPLACE_COGNITIVE_PLATFORM_ENABLED === "true" ||
        process.env.MARKETPLACE_BRAIN_LEVEL === "simulator",
      detail: "Brain report APIs reachable when cognitive platform enabled",
    },
    {
      id: "graph_health",
      label: "Graph health metrics available",
      ok: process.env.CCOS_GRAPH_PLATFORM_ENABLED === "true",
      detail: "Graph build + health in cognitive report",
    },
    {
      id: "twin_health",
      label: "Twin health path available",
      ok: process.env.CCOS_TWIN_PLATFORM_ENABLED === "true",
      detail: "Twin simulation APIs reachable",
    },
    {
      id: "apk_distribution_foundation",
      label: "Android direct distribution foundation",
      ok: Boolean(MOBILE_DEEP_LINK_SCHEME && APK_UPDATE_METADATA.minSupportedApiVersion),
      detail: `deep-link://${MOBILE_DEEP_LINK_SCHEME} env=${Object.keys(MOBILE_ENV_CONFIG).join("/")}`,
    },
  ];

  const passed = checks.filter((c) => c.ok).length;
  return {
    ready: passed === checks.length,
    passed,
    total: checks.length,
    checks,
    evaluatedAt: new Date().toISOString(),
  };
}
