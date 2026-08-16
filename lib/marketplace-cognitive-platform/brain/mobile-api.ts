import type { MarketplaceBrainReport } from "./v1/types";

export type MobileBrainResponse = {
  productId: string;
  genome: number | null;
  confidence: number;
  topAction: {
    title: string;
    ctaLabel?: string;
    expectedGain: string;
  } | null;
  evidenceSummary: string[];
  oneButtonAction: {
    label: string;
    type: "edit" | "promotion" | "quality" | "data";
  } | null;
  syncVersion: string;
  advisoryOnly: true;
};

function resolveButtonType(title: string): "edit" | "promotion" | "quality" | "data" {
  const t = title.toLowerCase();
  if (t.includes("продвиж")) return "promotion";
  if (t.includes("качеств")) return "quality";
  if (t.includes("показ")) return "data";
  return "edit";
}

export function toMobileBrainResponse(report: MarketplaceBrainReport): MobileBrainResponse {
  const genome = report.genome.contextual.overall ?? report.genome.base.overall;
  const action = report.nextBestAction;

  return {
    productId: report.productId,
    genome,
    confidence: report.confidence,
    topAction: action
      ? {
          title: action.title,
          ctaLabel: action.ctaLabel,
          expectedGain: action.expectedImpact,
        }
      : null,
    evidenceSummary:
      report.recommendationEvidence?.map((e) => e.claim) ??
      action?.evidence?.map((e) => e.claim) ??
      [],
    oneButtonAction: action
      ? {
          label: action.ctaLabel ?? action.title,
          type: resolveButtonType(action.title),
        }
      : null,
    syncVersion: `${report.brainVersion}:${report.context.fingerprint}`,
    advisoryOnly: true,
  };
}
