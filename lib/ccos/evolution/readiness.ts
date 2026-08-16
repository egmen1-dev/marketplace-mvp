import {
  currentMarketplaceBrainVersion,
  getBrainVersionRegistry,
  KNOWLEDGE_PACK_VERSION,
} from "@/lib/ccos/knowledge/versions";
import { listGraphVersions, rollbackGraphVersion } from "@/lib/ccos/graph/versioning";

import {
  createShadowEvaluationStub,
  resolveVersionPointers,
  type CognitiveApproval,
  type ShadowEvaluationInput,
} from "./contracts";

type DependencyAuditSnapshot = {
  architectureClean: boolean;
  passed: boolean;
  summary: { violationCount: number; cycleCount: number };
};

export type EvolutionReadinessCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

export type EvolutionReadinessReport = {
  ready: boolean;
  checks: Record<string, boolean>;
  checkList: EvolutionReadinessCheck[];
  versionPointers: ReturnType<typeof resolveVersionPointers>;
  shadowEvaluationContract: ReturnType<typeof createShadowEvaluationStub>;
  humanApprovalFoundation: boolean;
  productionPromotionDisabled: true;
  evaluatedAt: string;
};

export function buildEvolutionReadinessReport(input?: {
  graphAccepted?: boolean;
  twinAccepted?: boolean;
  dependencyAudit: DependencyAuditSnapshot;
}): EvolutionReadinessReport {
  if (!input?.dependencyAudit) {
    throw new Error(
      "buildEvolutionReadinessReport requires dependencyAudit — compose at API/route layer to avoid rc↔evolution cycle",
    );
  }
  const audit = input.dependencyAudit;
  const versions = resolveVersionPointers();
  const graphRollbackOk = rollbackGraphVersion(versions.graph.previous ?? "") != null || listGraphVersions().length > 0;

  const checkList: EvolutionReadinessCheck[] = [
    {
      id: "dependencyClean",
      label: "Dependency clean",
      ok: audit.architectureClean && audit.passed,
      detail: `${audit.summary.violationCount} marketplace imports, ${audit.summary.cycleCount} cycles`,
    },
    {
      id: "graphAccepted",
      label: "Graph staging accepted",
      ok: input?.graphAccepted ?? process.env.CCOS_GRAPH_PLATFORM_ENABLED === "true",
      detail: "Wave 4 staging gate",
    },
    {
      id: "twinAccepted",
      label: "Twin staging accepted",
      ok: input?.twinAccepted ?? process.env.CCOS_TWIN_PLATFORM_ENABLED === "true",
      detail: "Wave 5 full graph connected gate",
    },
    {
      id: "brainVersioned",
      label: "Brain versioned",
      ok: Boolean(versions.brain.current),
      detail: versions.brain.current,
    },
    {
      id: "knowledgeVersioned",
      label: "Knowledge versioned",
      ok: Boolean(versions.knowledge.current),
      detail: versions.knowledge.current,
    },
    {
      id: "rollbackAvailable",
      label: "Rollback available",
      ok: graphRollbackOk && Boolean(versions.brain.previous),
      detail: `graph rollback + brain previous ${versions.brain.previous ?? "n/a"}`,
    },
    {
      id: "shadowSimulationAvailable",
      label: "Shadow simulation contract",
      ok: true,
      detail: "shadow-evaluation-v1 stub",
    },
    {
      id: "humanApprovalFoundation",
      label: "Human approval contract",
      ok: true,
      detail: "CognitiveApproval interface defined",
    },
  ];

  const checks = Object.fromEntries(checkList.map((c) => [c.id, c.ok]));
  const ready = checkList.every((c) => c.ok);

  const shadowStub = createShadowEvaluationStub({
    currentBrainVersion: versions.brain.current,
    candidateBrainVersion: "candidate-brain-v-next",
    entityId: "staging-product",
    observations: [],
  } satisfies ShadowEvaluationInput);

  void ({} as CognitiveApproval);

  return {
    ready,
    checks,
    checkList,
    versionPointers: versions,
    shadowEvaluationContract: shadowStub,
    humanApprovalFoundation: true,
    productionPromotionDisabled: true,
    evaluatedAt: new Date().toISOString(),
  };
}
