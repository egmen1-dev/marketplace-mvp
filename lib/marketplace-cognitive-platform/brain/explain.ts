import type { UniversalObservation } from "@/lib/ccos/observation/types";
import { confidenceBand } from "@/lib/ccos/observation/metrics";

import type { BrainFactorDelta, CognitiveProductReport } from "./types";

export function buildDecisionBlockers(observations: UniversalObservation[]) {
  const blockers = [];

  for (const obs of observations) {
    if (obs.metric === "content.gate_blocked" && obs.value === true) {
      blockers.push({
        code: "CONTENT_QUALITY_GATE",
        title: "Content Quality gate",
        source: obs.source.module,
        enforcementNote: "Enforcement остаётся в Content Quality / moderation layer",
      });
    }
    if (obs.metric === "content.quality_gate" && typeof obs.value === "string") {
      blockers.push({
        code: String(obs.value),
        title: `Gate: ${obs.value}`,
        source: obs.source.module,
        enforcementNote: "Advisory mirror of existing gate state",
      });
    }
  }

  return blockers;
}

export function buildExplanationFromObservations(observations: UniversalObservation[]): {
  headline: string;
  factorDeltas: BrainFactorDelta[];
  strengths: string[];
  missingData: string[];
} {
  const deltas: BrainFactorDelta[] = [];
  const strengths: string[] = [];
  const missingData: string[] = [];

  const ctr = observations.find((o) => o.metric === "behaviour.ctr");
  if (ctr?.normalizedScore != null && ctr.confidence >= 0.4) {
    if (ctr.normalizedScore < 45) {
      deltas.push({ label: "CTR ниже среднего", delta: -8, domain: "behaviour" });
    } else if (ctr.normalizedScore >= 70) {
      strengths.push("CTR в норме");
    }
  } else if (ctr?.value === null) {
    missingData.push("Недостаточно данных по CTR");
  }

  const photo = observations.find((o) => o.metric === "visual.photo_quality");
  if (photo?.normalizedScore != null) {
    if (photo.normalizedScore < 55) {
      deltas.push({ label: "главное фото слабое", delta: -5, domain: "visual" });
    } else if (photo.normalizedScore >= 80) {
      strengths.push("сильные фотографии");
      deltas.push({ label: "качественные фото", delta: 10, domain: "visual" });
    }
  }

  const desc = observations.find((o) => o.metric === "content.description_quality");
  if (desc?.normalizedScore != null && desc.normalizedScore >= 75) {
    strengths.push("хорошее описание");
    deltas.push({ label: "полное описание", delta: 7, domain: "content" });
  }

  const trust = observations.find((o) => o.metric === "trust.seller_score");
  if (trust?.normalizedScore != null && trust.normalizedScore >= 75) {
    strengths.push("высокий Trust продавца");
    deltas.push({ label: "высокий Trust", delta: 9, domain: "trust" });
  }

  const rankingScore = observations.find((o) => o.metric === "ranking.score");
  const headline =
    rankingScore?.normalizedScore != null
      ? `Advisory score карточки: ${rankingScore.normalizedScore}/100`
      : "Интеллект карточки (advisory)";

  return {
    headline,
    factorDeltas: deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 6),
    strengths: [...new Set(strengths)].slice(0, 4),
    missingData,
  };
}

export function pickNextStep(
  report: Pick<CognitiveProductReport, "blockers" | "explanation">,
): string | null {
  if (report.blockers.some((b) => b.code === "CONTENT_QUALITY_GATE")) {
    return "Исправьте проблемы качества карточки по подсказкам Content Quality";
  }
  const weakPhoto = report.explanation.factorDeltas.find((d) => d.label.includes("фото"));
  if (weakPhoto) return "Замените главное изображение";
  const weakCtr = report.explanation.factorDeltas.find((d) => d.label.includes("CTR"));
  if (weakCtr) return "Улучшите привлекательность карточки (фото и заголовок)";
  return null;
}

export function buildProvenance(observations: UniversalObservation[]) {
  return observations.slice(0, 8).map((o) => ({
    claim: o.evidence[0] ?? o.metric,
    sourceModule: o.source.module,
    sourceVersion: o.source.version,
  }));
}

export function lowConfidenceObservations(observations: UniversalObservation[]) {
  return observations.filter((o) => confidenceBand(o.confidence) === "LOW");
}
