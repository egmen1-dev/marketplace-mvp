import type {
  CcosExperiment,
  ExperimentVerdict,
  KnowledgeFact,
  KnowledgeScope,
} from "../types";
import { createCandidateFromExperiment } from "../approval";
import { getKnowledgeRepository } from "../repository";

const experiments = new Map<string, CcosExperiment>();

export function registerExperiment(experiment: CcosExperiment): CcosExperiment {
  experiments.set(experiment.id, experiment);
  return experiment;
}

export function getExperiment(id: string): CcosExperiment | null {
  return experiments.get(id) ?? null;
}

export function listExperiments(filter?: {
  status?: CcosExperiment["status"];
  pack?: KnowledgeScope["pack"];
}): CcosExperiment[] {
  return [...experiments.values()].filter((e) => {
    if (filter?.status && e.status !== filter.status) return false;
    if (filter?.pack && e.scope.pack !== filter.pack) return false;
    return true;
  });
}

export function resetExperimentRegistry(): void {
  experiments.clear();
}

export function completeExperiment(input: {
  experimentId: string;
  result: Record<string, unknown>;
  verdict: ExperimentVerdict;
  knowledgeTitle: string;
  knowledgeDescription: string;
  evidenceIds: string[];
  confidence: number;
}): { experiment: CcosExperiment; candidate: KnowledgeFact } {
  const experiment = experiments.get(input.experimentId);
  if (!experiment) throw new Error(`Experiment not found: ${input.experimentId}`);

  const candidate = createCandidateFromExperiment({
    experiment,
    title: input.knowledgeTitle,
    description: input.knowledgeDescription,
    evidenceIds: input.evidenceIds,
    confidence: input.confidence,
  });

  const repo = getKnowledgeRepository();
  repo.saveCandidate(candidate);

  const updated: CcosExperiment = {
    ...experiment,
    status: "completed",
    result: input.result,
    verdict: input.verdict,
    knowledgeProducedIds: [candidate.id],
    completedAt: new Date().toISOString(),
  };
  experiments.set(updated.id, updated);
  return { experiment: updated, candidate };
}

export function createExperiment(input: {
  title: string;
  goal: string;
  dataset: string;
  metrics: string[];
  scope: KnowledgeScope;
  brainVersion: string;
  hypothesisId?: string;
}): CcosExperiment {
  const experiment: CcosExperiment = {
    id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: input.title,
    goal: input.goal,
    dataset: input.dataset,
    metrics: input.metrics,
    brainVersion: input.brainVersion,
    experimentVersion: "experiment-v1",
    knowledgeProducedIds: [],
    hypothesisId: input.hypothesisId,
    verdict: "pending",
    status: "draft",
    scope: input.scope,
    createdAt: new Date().toISOString(),
  };
  return registerExperiment(experiment);
}
