import type { DependencyAuditReport } from "./types";

export type DependencyLayer = {
  id: string;
  label: string;
};

export const DEPENDENCY_LAYERS: DependencyLayer[] = [
  { id: "ccos_core", label: "CCOS Core" },
  { id: "marketplace_binding", label: "Marketplace Binding" },
  { id: "application_routes", label: "Application Routes" },
  { id: "execution_systems", label: "Execution Systems" },
  { id: "external_apps", label: "External Apps" },
];

const FORBIDDEN_EDGES: Array<{ from: string; to: string; reason: string }> = [
  { from: "ccos_core", to: "marketplace_binding", reason: "CCOS must not import marketplace adapters" },
  { from: "ccos_core", to: "execution_systems", reason: "CCOS must not import finance/moderation execution" },
];

export function classifyDependencyLayers(report: DependencyAuditReport): {
  layers: DependencyLayer[];
  forbiddenViolations: string[];
  moduleLayer: Record<string, string>;
} {
  const moduleLayer: Record<string, string> = {
    observation: "ccos_core",
    knowledge: "ccos_core",
    graph: "ccos_core",
    twin: "ccos_core",
    product: "ccos_core",
    simulation: "ccos_core",
    contracts: "ccos_core",
    context: "ccos_core",
    governance: "ccos_core",
    memory: "ccos_core",
    signals: "ccos_core",
    api: "ccos_core",
    rc: "ccos_core",
    evolution: "ccos_core",
    core: "ccos_core",
  };

  const forbiddenViolations: string[] = [];
  if (report.marketplaceViolations.length > 0) {
    forbiddenViolations.push(
      `CCOS Core → Marketplace Binding: ${report.marketplaceViolations.length} direct imports`,
    );
  }

  for (const rule of FORBIDDEN_EDGES) {
    if (rule.from === "ccos_core" && report.marketplaceViolations.length > 0) {
      forbiddenViolations.push(rule.reason);
    }
  }

  return { layers: DEPENDENCY_LAYERS, forbiddenViolations, moduleLayer };
}
