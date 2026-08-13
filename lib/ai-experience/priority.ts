import { ROUTES, sellerProductEditPath } from "@/lib/constants";

import type { PriorityRecommendation, PrioritySource } from "./types";

type PriorityCandidate = PriorityRecommendation & { rank: number };

function candidate(
  input: Omit<PriorityCandidate, "rank"> & { rank?: number },
): PriorityCandidate {
  return { ...input, rank: input.rank ?? input.priorityScore };
}

/** Pick ONE primary action from existing intelligence signals — no new scoring. */
export function pickPriorityRecommendation(
  candidates: PriorityRecommendation[],
): PriorityRecommendation | null {
  if (candidates.length === 0) return null;

  const sourceWeight: Record<PrioritySource, number> = {
    EXECUTION_PRIORITY: 95,
    GROWTH_SCORE: 90,
    EDUCATION_COACH: 88,
    QUALITY_SCORE: 85,
    PROMOTION_OPPORTUNITY: 80,
    COMMUNICATION: 75,
  };

  const sorted = [...candidates].sort((a, b) => {
    const aScore = a.priorityScore + (sourceWeight[a.source] ?? 0);
    const bScore = b.priorityScore + (sourceWeight[b.source] ?? 0);
    return bScore - aScore;
  });

  return sorted[0] ?? null;
}

export function priorityFromGrowthAction(input: {
  action: string;
  impact: string;
  reason: string;
  href?: string;
  productId?: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}): PriorityRecommendation {
  const score =
    input.priority === "HIGH" ? 90 : input.priority === "MEDIUM" ? 70 : 50;
  return candidate({
    id: "priority-growth",
    action: input.action,
    why: input.reason,
    benefit: input.impact,
    howTo: input.action,
    href:
      input.href ??
      (input.productId ? sellerProductEditPath(input.productId) : ROUTES.ACCOUNT_GROWTH),
    source: "GROWTH_SCORE",
    priorityScore: score,
  });
}

export function priorityFromCoach(input: {
  action: string;
  analysis: string;
  benefit: string;
  howTo: string;
  href?: string;
}): PriorityRecommendation {
  return candidate({
    id: "priority-coach",
    action: input.action,
    why: input.analysis,
    benefit: input.benefit,
    howTo: input.howTo,
    href: input.href,
    source: "EDUCATION_COACH",
    priorityScore: 88,
  });
}

export function priorityFromExecution(input: {
  title: string;
  description: string;
  href: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}): PriorityRecommendation {
  const score =
    input.priority === "HIGH" ? 92 : input.priority === "MEDIUM" ? 72 : 55;
  return candidate({
    id: "priority-execution",
    action: input.title,
    why: input.description,
    benefit: "Продвигает операционный план маркетплейса",
    howTo: input.title,
    href: input.href,
    source: "EXECUTION_PRIORITY",
    priorityScore: score,
  });
}

export function priorityFromPromotion(input: {
  productTitle: string;
  reason: string;
  href: string;
}): PriorityRecommendation {
  return candidate({
    id: "priority-promotion",
    action: `Запустить продвижение «${input.productTitle.slice(0, 40)}»`,
    why: input.reason,
    benefit: "Больше показов и быстрее проверка спроса",
    howTo: "Откройте раздел продвижения и выберите тариф",
    href: input.href,
    source: "PROMOTION_OPPORTUNITY",
    priorityScore: 78,
  });
}

export function priorityFromQuality(input: {
  action: string;
  why: string;
  href: string;
}): PriorityRecommendation {
  return candidate({
    id: "priority-quality",
    action: input.action,
    why: input.why,
    benefit: "Увеличит доверие к карточке",
    howTo: input.action,
    href: input.href,
    source: "QUALITY_SCORE",
    priorityScore: 84,
  });
}

export function priorityFromCommunication(input: {
  headline: string;
  body: string;
  href: string;
}): PriorityRecommendation {
  return candidate({
    id: "priority-communication",
    action: input.headline,
    why: input.body,
    benefit: "Связано с коммуникационной кампанией маркетплейса",
    howTo: "Выполните рекомендацию в кабинете",
    href: input.href,
    source: "COMMUNICATION",
    priorityScore: 76,
  });
}
