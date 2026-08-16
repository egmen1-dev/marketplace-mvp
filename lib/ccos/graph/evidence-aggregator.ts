import type { KnowledgeEvidence } from "@/lib/ccos/knowledge/types";
import type { AggregatedGraphEvidence } from "./types";

type AggregatedInternal = AggregatedGraphEvidence & {
  conflict?: boolean;
  polarities?: number[];
};

const POLARITY_STRIP =
  /(improves|improve|улучшает|улучш|повышает|повыш|снижает|сниж|ухудшает|ухудш|decline|drop|negative|positive|better|worse|growth)/gi;

function claimKey(claim: string): string {
  return claim
    .toLowerCase()
    .replace(POLARITY_STRIP, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function claimPolarity(claim: string): number {
  const c = claim.toLowerCase();
  if (/(снижает|сниж|ухудш|negative|worse|decline|drop)/i.test(c)) return -1;
  if (/(повыш|улучш|improve|positive|better|growth)/i.test(c)) return 1;
  return 0;
}

export function aggregateEvidenceForGraph(input: {
  evidence: KnowledgeEvidence[];
  factTitles?: Map<string, string>;
}): AggregatedGraphEvidence[] {
  const byClaim = new Map<string, AggregatedInternal>();

  for (const ev of input.evidence) {
    const key = claimKey(ev.claim);
    const existing = byClaim.get(key);
    const sources = ev.sources.map((s) => `${s.system}/${s.module}`);
    const polarity = claimPolarity(ev.claim);

    if (existing) {
      existing.evidenceIds.push(ev.id);
      existing.sources.push(...sources);
      existing.polarities = [...(existing.polarities ?? []), polarity];

      const hasConflict =
        existing.polarities.includes(1) && existing.polarities.includes(-1);
      existing.conflict = hasConflict;

      if (hasConflict) {
        existing.confidence = Math.max(0.15, Math.min(existing.confidence, ev.confidence) * 0.55);
      } else {
        existing.confidence = Math.min(1, (existing.confidence + ev.confidence) / 2 + 0.05);
      }
    } else {
      byClaim.set(key, {
        claim: ev.claim,
        confidence: ev.confidence,
        evidenceIds: [ev.id],
        sources: [...new Set(sources)],
        factIds: [],
        conflict: false,
        polarities: [polarity],
      });
    }
  }

  return [...byClaim.values()]
    .map(({ polarities: _polarities, ...rest }) => rest)
    .sort((a, b) => b.confidence - a.confidence);
}

export function detectEvidenceConflict(items: AggregatedGraphEvidence[]): boolean {
  return items.some((item) => item.conflict === true);
}

export function mergeEvidenceSources(sources: string[]): string {
  const unique = [...new Set(sources)];
  if (unique.length >= 4) return "Ranking Lab + DAOS + Marketplace + QuickSale";
  if (unique.some((s) => s.includes("ranking"))) return "Ranking Lab + Marketplace";
  return unique.join(", ") || "Marketplace";
}
