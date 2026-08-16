import type { KnowledgeFact, KnowledgePackId, KnowledgeTimelineEntry } from "./types";
import { getKnowledgeRepository } from "./repository";

export function getKnowledgeTimeline(factId: string): KnowledgeTimelineEntry[] {
  const fact = getKnowledgeRepository().getFact(factId);
  return fact?.timeline ?? [];
}

export function explainBrainAdvice(input: {
  factIds: string[];
  brainVersion: string;
}): Array<{
  factId: string;
  title: string;
  timeline: KnowledgeTimelineEntry[];
  brainVersion: string;
}> {
  const repo = getKnowledgeRepository();
  return input.factIds
    .map((id) => repo.getFact(id))
    .filter((f): f is KnowledgeFact => f != null)
    .map((f) => ({
      factId: f.id,
      title: f.title,
      timeline: f.timeline,
      brainVersion: input.brainVersion,
    }));
}

export function getKnowledgeTimelineForPack(pack: KnowledgePackId): KnowledgeTimelineEntry[] {
  const facts = getKnowledgeRepository().listFacts({ pack });
  return facts.flatMap((f) => f.timeline).sort((a, b) => a.at.localeCompare(b.at));
}
