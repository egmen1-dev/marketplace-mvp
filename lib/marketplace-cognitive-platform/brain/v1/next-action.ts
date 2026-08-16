import { ROUTES } from "@/lib/constants";
import { OBSERVATION_METRICS } from "@/lib/ccos/observation/metrics";
import type { ContextualSignal } from "@/lib/ccos/signals/types";
import type { UniversalObservation } from "@/lib/ccos/observation/types";

import type { ActionCandidate, BrainRecommendation, CognitiveDecision } from "./types";

const ACTION_POLICY_VERSION = "action-policy-v1";

function impactFromInterpretation(i: ContextualSignal["interpretation"]): number {
  switch (i) {
    case "strong_negative":
      return 0.9;
    case "negative":
      return 0.7;
    case "neutral":
      return 0.3;
    case "positive":
      return 0.2;
    case "strong_positive":
      return 0.1;
    default:
      return 0.3;
  }
}

export function collectActionCandidates(input: {
  observations: UniversalObservation[];
  signals: ContextualSignal[];
  productId: string;
  qualityGateFailed: boolean;
  hasBehaviourData: boolean;
}): ActionCandidate[] {
  const candidates: ActionCandidate[] = [];
  const editHref = `${ROUTES.ACCOUNT_PRODUCTS}/${input.productId}/edit`;

  if (input.qualityGateFailed) {
    candidates.push({
      id: "fix-quality-gate",
      source: "content-quality",
      category: "quality",
      title: "Исправьте проблемы качества карточки",
      why: "Активен quality gate — продвижение не решит проблему видимости.",
      expectedImpact: "Снятие блокировки качества",
      effort: "medium",
      ctaLabel: "Открыть подсказки качества",
      score: 0,
      severity: 1,
      hardBlocker: true,
    });
  }

  const photoSignal = input.signals.find((s) => s.metric.includes("photo") || s.domain === "visual");
  const photoObs = input.observations.find(
    (o) => o.metric === OBSERVATION_METRICS.visual.photoQuality,
  );
  if (
    photoSignal?.interpretation === "negative" ||
    photoSignal?.interpretation === "strong_negative" ||
    (photoObs?.normalizedScore != null && photoObs.normalizedScore < 55)
  ) {
    candidates.push({
      id: "replace-hero-photo",
      source: "content-quality",
      category: "quality",
      title: "Замените главное фото",
      why: "Первое фото слабее ожиданий категории и влияет на CTR.",
      expectedImpact: "Улучшение привлекательности карточки",
      effort: "low",
      ctaLabel: "Редактировать фото",
      score: 0,
      severity: 0.85,
    });
  }

  const ctrSignal = input.signals.find((s) => s.metric === OBSERVATION_METRICS.behaviour.ctr);
  if (ctrSignal && (ctrSignal.interpretation === "negative" || ctrSignal.interpretation === "strong_negative")) {
    candidates.push({
      id: "improve-ctr-appeal",
      source: "behaviour",
      category: "behaviour",
      title: "Улучшите привлекательность карточки (фото и заголовок)",
      why: ctrSignal.explanation,
      expectedImpact: "Рост CTR относительно категории",
      effort: "medium",
      ctaLabel: "Редактировать карточку",
      score: 0,
      severity: 0.75,
    });
  }

  if (!input.hasBehaviourData) {
    candidates.push({
      id: "collect-first-views",
      source: "behaviour",
      category: "data",
      title: "Соберите первые показы",
      why: "Недостаточно behavioural history — нужны реальные просмотры.",
      expectedImpact: "Данные для оценки CTR и конверсии",
      effort: "low",
      ctaLabel: "Проверить видимость карточки",
      score: 0,
      severity: 0.4,
    });
  }

  const descObs = input.observations.find(
    (o) => o.metric === OBSERVATION_METRICS.content.descriptionQuality,
  );
  if (descObs?.normalizedScore != null && descObs.normalizedScore >= 75) {
    candidates.push({
      id: "maintain-description",
      source: "content-quality",
      category: "quality",
      title: "Поддерживайте сильное описание",
      why: "Описание выше медианы категории.",
      expectedImpact: "Сохранение сильной стороны",
      effort: "low",
      score: 0,
      severity: 0.2,
    });
  }

  candidates.push({
    id: "promotion-generic",
    source: "promotion",
    category: "promotion",
    title: "Запустите продвижение",
    why: "Увеличить показы карточки.",
    expectedImpact: "Больше просмотров",
    effort: "medium",
    ctaLabel: "Продвижение",
    score: 0,
    severity: 0.35,
  });

  for (const c of candidates) {
    const signalBoost = input.signals.reduce((max, s) => {
      if (c.category === "behaviour" && s.domain === "behaviour") {
        return Math.max(max, impactFromInterpretation(s.interpretation));
      }
      if (c.category === "quality" && (s.domain === "visual" || s.domain === "content")) {
        return Math.max(max, impactFromInterpretation(s.interpretation));
      }
      return max;
    }, c.severity);
    const urgency = c.hardBlocker ? 1.2 : 1;
    const effortPenalty = c.effort === "low" ? 1 : c.effort === "medium" ? 0.85 : 0.7;
    c.score = (signalBoost * urgency * effortPenalty) / effortPenalty;
  }

  return candidates;
}

export function selectNextBestAction(
  candidates: ActionCandidate[],
  decision: CognitiveDecision,
): { primary: BrainRecommendation | null; primaryCandidate: ActionCandidate | null; candidates: ActionCandidate[] } {
  const scored = [...candidates].map((c) => {
    let score = c.score;
    if (c.category === "promotion" && decision.blockedCapabilities.includes("promotion_advice")) {
      return {
        ...c,
        score: 0,
        suppressed: true,
        suppressionReason: "Quality/moderation gate — promotion suppressed",
      };
    }
    if (c.hardBlocker) score += 2;
    return { ...c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const primary = scored.find((c) => !c.suppressed && c.score > 0);
  if (!primary) return { primary: null, primaryCandidate: null, candidates: scored };

  return {
    primary: {
      title: primary.title,
      why: primary.why,
      expectedImpact: primary.expectedImpact,
      effort: primary.effort,
      ctaLabel: primary.ctaLabel,
      score: primary.score,
    },
    primaryCandidate: primary,
    candidates: scored,
  };
}

export { ACTION_POLICY_VERSION };
