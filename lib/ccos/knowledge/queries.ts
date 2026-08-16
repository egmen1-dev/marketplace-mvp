import type { KnowledgeFact, KnowledgePackId, KnowledgeStatus } from "./types";
import { getKnowledgeRepository } from "./repository";
import { filterBrainUsableFacts } from "./safety";

export function getKnowledge(factId: string): KnowledgeFact | null {
  return getKnowledgeRepository().getFact(factId);
}

export function searchKnowledge(query: string, pack?: KnowledgePackId): KnowledgeFact[] {
  return getKnowledgeRepository().searchKnowledge(query, pack);
}

export function getKnowledgeByScope(context: {
  pack: KnowledgePackId;
  categoryId?: string;
  categorySlug?: string;
  season?: string;
  device?: string;
}): KnowledgeFact[] {
  return getKnowledgeRepository().getKnowledgeByScope(context);
}

export function listVerifiedKnowledge(pack?: KnowledgePackId): KnowledgeFact[] {
  return getKnowledgeRepository().listVerifiedFacts(pack);
}

export function listKnowledgeByStatus(status: KnowledgeStatus, pack?: KnowledgePackId): KnowledgeFact[] {
  return getKnowledgeRepository().listFacts({ status, pack });
}

export function getBrainReadableKnowledge(context: {
  pack: KnowledgePackId;
  categoryId?: string;
  categorySlug?: string;
  season?: string;
  device?: string;
}): KnowledgeFact[] {
  return filterBrainUsableFacts(getKnowledgeByScope(context));
}

export { getKnowledgeTimeline, explainBrainAdvice, getKnowledgeTimelineForPack } from "./timeline";
