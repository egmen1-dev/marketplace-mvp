import type { KnowledgeEvidence } from "@/lib/ccos/knowledge/types";
import type { AggregatedGraphEvidence } from "./types";

export function aggregateEvidenceForGraph(input: {
  evidence: KnowledgeEvidence[];
  factTitles?: Map<string, string>;
}): AggregatedGraphEvidence[] {
  const byClaim = new Map<string, AggregatedGraphEvidence>();

  for (const ev of input.evidence) {
    const key = ev.claim.toLowerCase().slice(0, 120);
    const existing = byClaim.get(key);
    const sources = ev.sources.map((s) => `${s.system}/${s.module}`);

    if (existing) {
      existing.confidence = Math.min(1, (existing.confidence + ev.confidence) / 2 + 0.05);
      existing.evidenceIds.push(ev.id);
      existing.sources.push(...sources);
    } else {
      byClaim.set(key, {
        claim: ev.claim,
        confidence: ev.confidence,
        evidenceIds: [ev.id],
        sources: [...new Set(sources)],
        factIds: [],
      });
    }
  }

  return [...byClaim.values()].sort((a, b) => b.confidence - a.confidence);
}

export function mergeEvidenceSources(sources: string[]): string {
  const unique = [...new Set(sources)];
  if (unique.length >= 4) return "Ranking Lab + DAOS + Marketplace + QuickSale";
  if (unique.some((s) => s.includes("ranking"))) return "Ranking Lab + Marketplace";
  return unique.join(", ") || "Marketplace";
}
