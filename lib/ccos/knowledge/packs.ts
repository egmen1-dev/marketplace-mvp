import type { KnowledgeFact, KnowledgePackId } from "./types";
import { getKnowledgeRepository } from "./repository";
import { KNOWLEDGE_PACKS } from "./scope";

export type KnowledgePackExport = {
  pack: KnowledgePackId;
  version: string;
  exportedAt: string;
  facts: KnowledgeFact[];
};

export function exportKnowledgePack(pack: KnowledgePackId): KnowledgePackExport {
  const facts = getKnowledgeRepository().listVerifiedFacts(pack);
  return {
    pack,
    version: "knowledge-pack-export-v1",
    exportedAt: new Date().toISOString(),
    facts,
  };
}

export function importKnowledgePack(
  payload: KnowledgePackExport,
  mode: "merge" | "replace" = "merge",
): { imported: number } {
  const repo = getKnowledgeRepository();
  if (mode === "replace") {
    for (const existing of repo.listFacts({ pack: payload.pack })) {
      if (existing.status === "verified") {
        repo.saveFact({ ...existing, status: "archived", archivedAt: new Date().toISOString() });
      }
    }
  }
  for (const fact of payload.facts) {
    if (fact.status !== "verified") continue;
    repo.saveFact(fact);
  }
  return { imported: payload.facts.length };
}

export function listAvailablePacks(): KnowledgePackId[] {
  return KNOWLEDGE_PACKS.filter(
    (pack) => getKnowledgeRepository().listVerifiedFacts(pack).length > 0 || true,
  );
}

export function getCategoryKnowledge(categoryId: string, pack: KnowledgePackId = "marketplace") {
  return getKnowledgeRepository().getKnowledgeByScope({
    pack,
    categoryId,
  });
}
