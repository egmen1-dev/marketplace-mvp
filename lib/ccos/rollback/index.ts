import { getActiveGraphVersion, listGraphVersions } from "@/lib/ccos/graph/versioning";

import { getActiveBrainVersion, getPreviousBrainVersion } from "./brain";
import { getActiveKnowledgePackVersion, getPreviousKnowledgePackVersion } from "./knowledge";
import { bootstrapVerifiedVersions, getVerifiedGraphVersion } from "./registry";
import { canRollbackGraph } from "./graph";
import { canRollbackBrain } from "./brain";
import { canRollbackKnowledge } from "./knowledge";
import type { VersionPointerBundle } from "./types";

export function resolveRollbackVersionPointers(): VersionPointerBundle {
  bootstrapVerifiedVersions();
  const graphCurrent = getActiveGraphVersion();
  const graphList = listGraphVersions().map((v) => v.version);
  const graphIdx = graphList.indexOf(graphCurrent);
  const graphPrevious = graphIdx > 0 ? graphList[graphIdx - 1] : graphList.length > 1 ? graphList[graphList.length - 2] : null;

  return {
    graph: {
      current: graphCurrent,
      previous: graphPrevious,
    },
    brain: {
      current: getActiveBrainVersion(),
      previous: getPreviousBrainVersion(),
    },
    knowledge: {
      current: getActiveKnowledgePackVersion(),
      previous: getPreviousKnowledgePackVersion(),
    },
  };
}

export function isRollbackFoundationReady(): boolean {
  bootstrapVerifiedVersions();
  const pointers = resolveRollbackVersionPointers();

  const graphReady =
    Boolean(pointers.graph.previous) &&
    Boolean(getVerifiedGraphVersion(pointers.graph.previous!)) &&
    canRollbackGraph(pointers.graph.current, pointers.graph.previous!);

  const brainReady =
    Boolean(pointers.brain.previous) &&
    canRollbackBrain(pointers.brain.current, pointers.brain.previous!);

  const knowledgeReady =
    Boolean(pointers.knowledge.previous) &&
    canRollbackKnowledge(pointers.knowledge.current, pointers.knowledge.previous!);

  return graphReady && brainReady && knowledgeReady;
}

export * from "./types";
export * from "./audit";
export * from "./governance";
export * from "./registry";
export * from "./graph";
export * from "./brain";
export * from "./knowledge";
