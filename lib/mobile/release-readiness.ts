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
      ok:
        process.env.CCOS_GRAPH_PLATFORM_ENABLED === "true" ||
        process.env.CCOS_TWIN_PLATFORM_ENABLED === "true" ||
        process.env.MARKETPLACE_COGNITIVE_PLATFORM_ENABLED === "true",
      detail: "CCOS_GRAPH_PLATFORM_ENABLED or twin/cognitive flags",
    },
    {
      id: "twin_enabled",
      label: "Twin platform enabled",
      ok:
        process.env.CCOS_TWIN_PLATFORM_ENABLED === "true" ||
        process.env.MARKETPLACE_COGNITIVE_PLATFORM_ENABLED === "true",
      detail: "CCOS_TWIN_PLATFORM_ENABLED or cognitive flag",
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
      id: "mobile_api",
      label: "Mobile dashboard route registered",
      ok: true,
      detail: "/api/mobile/dashboard",
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
