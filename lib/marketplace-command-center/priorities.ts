import { ROUTES, sellerProductEditPath } from "@/lib/constants";

import type {
  CommandCenterPriority,
  CommandCenterPrioritySource,
  CommandCenterUrgency,
} from "./types";

const SOURCE_WEIGHT: Record<CommandCenterPrioritySource, number> = {
  EXECUTION: 95,
  OPERATOR: 92,
  SELLER_GROWTH: 90,
  EDUCATION: 88,
  TRUST: 86,
  PROMOTION: 84,
  LEARNING: 80,
  COMMUNICATION: 78,
  AI_EXPERIENCE: 76,
};

const URGENCY_WEIGHT: Record<CommandCenterUrgency, number> = {
  HIGH: 30,
  MEDIUM: 15,
  LOW: 5,
};

export function priorityCandidate(
  input: Omit<CommandCenterPriority, "rankScore"> & { rankScore?: number },
): CommandCenterPriority {
  const rankScore =
    input.rankScore ??
    (SOURCE_WEIGHT[input.source] ?? 50) + URGENCY_WEIGHT[input.urgency];
  return { ...input, rankScore };
}

export function pickTopPriorities(
  candidates: CommandCenterPriority[],
  limit = 5,
): CommandCenterPriority[] {
  return [...candidates]
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, limit);
}

export function pickOneNextAction(
  candidates: CommandCenterPriority[],
): CommandCenterPriority | null {
  return pickTopPriorities(candidates, 1)[0] ?? null;
}

export function priorityFromGrowth(input: {
  action: string;
  reason: string;
  impact: string;
  productId?: string;
  href?: string;
  priority: CommandCenterUrgency;
}): CommandCenterPriority {
  return priorityCandidate({
    id: "cc-growth",
    title: input.action,
    source: "SELLER_GROWTH",
    impact: input.impact,
    urgency: input.priority,
    action: input.action,
    entity: input.productId ?? "seller",
    why: input.reason,
    howTo: input.action,
    href:
      input.href ??
      (input.productId
        ? sellerProductEditPath(input.productId)
        : ROUTES.ACCOUNT_GROWTH),
  });
}

export function priorityFromTrust(input: {
  action: string;
  why: string;
  href?: string;
}): CommandCenterPriority {
  return priorityCandidate({
    id: "cc-trust",
    title: input.action,
    source: "TRUST",
    impact: "Повысит доверие покупателей",
    urgency: "HIGH",
    action: input.action,
    entity: "seller",
    why: input.why,
    howTo: input.action,
    href: input.href ?? ROUTES.ACCOUNT_GROWTH,
  });
}

export function priorityFromExecution(input: {
  title: string;
  description: string;
  href: string;
}): CommandCenterPriority {
  return priorityCandidate({
    id: "cc-execution",
    title: input.title,
    source: "EXECUTION",
    impact: "Ускорит выполнение плана площадки",
    urgency: "HIGH",
    action: input.title,
    entity: "execution",
    why: input.description,
    howTo: input.description,
    href: input.href,
  });
}

export function priorityFromOperator(input: {
  title: string;
  body: string;
  href?: string;
}): CommandCenterPriority {
  return priorityCandidate({
    id: `cc-operator-${input.title.slice(0, 12)}`,
    title: input.title,
    source: "OPERATOR",
    impact: "Влияет на здоровье marketplace",
    urgency: "MEDIUM",
    action: input.title,
    entity: "marketplace",
    why: input.body,
    howTo: input.body,
    href: input.href ?? ROUTES.ADMIN_OPERATOR,
  });
}

export function priorityFromPromotion(input: {
  productTitle: string;
  reason: string;
}): CommandCenterPriority {
  return priorityCandidate({
    id: "cc-promotion",
    title: `Продвижение: ${input.productTitle.slice(0, 40)}`,
    source: "PROMOTION",
    impact: "Больше показов и быстрее проверка спроса",
    urgency: "MEDIUM",
    action: "Запустить продвижение",
    entity: input.productTitle,
    why: input.reason,
    howTo: "Откройте раздел продвижения и выберите тариф",
    href: ROUTES.ACCOUNT_PROMOTIONS,
  });
}

export function priorityFromLearning(input: {
  statement: string;
}): CommandCenterPriority {
  return priorityCandidate({
    id: "cc-learning",
    title: "Применить проверенный паттерн",
    source: "LEARNING",
    impact: input.statement,
    urgency: "LOW",
    action: input.statement,
    entity: "pattern",
    why: "Learning Loop показал положительный эффект",
    howTo: input.statement,
    href: ROUTES.ACCOUNT_AI_CENTER,
  });
}
