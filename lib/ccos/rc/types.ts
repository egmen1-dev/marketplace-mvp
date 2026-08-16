/** EPIC 77 — Release Candidate Freeze (RC-1) types */

export type CcosModuleId =
  | "observation"
  | "knowledge"
  | "graph"
  | "twin"
  | "product"
  | "context"
  | "governance"
  | "memory"
  | "signals"
  | "api"
  | "rc"
  | "core";

export type DependencyEdge = {
  from: string;
  to: string;
  via: string;
};

export type MarketplaceImportViolation = {
  file: string;
  importPath: string;
  layer: CcosModuleId | "unknown";
};

export type AdapterBoundaryFinding = {
  adapter: string;
  importsCcos: boolean;
  importsMarketplaceDomain: boolean;
};

export type DependencyAuditReport = {
  generatedAt: string;
  rcVersion: "rc-1";
  modules: CcosModuleId[];
  edges: DependencyEdge[];
  layerStack: string[];
  cycles: string[][];
  marketplaceViolations: MarketplaceImportViolation[];
  adapterFindings: AdapterBoundaryFinding[];
  passed: boolean;
  architectureClean: boolean;
  summary: {
    cycleCount: number;
    violationCount: number;
    edgeCount: number;
  };
};

export type ReadinessStatus = "ready" | "stub" | "disabled" | "pending";

export type ReadinessRow = {
  id: string;
  label: string;
  status: ReadinessStatus;
  detail: string;
};

export type CcosReadinessDashboard = {
  rcVersion: "rc-1";
  evaluatedAt: string;
  rows: ReadinessRow[];
  dependencyAuditPassed: boolean;
  dependencyCyclesClear: boolean;
  architectureClean: boolean;
  releaseCandidateReady: boolean;
};
