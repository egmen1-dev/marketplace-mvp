import type {
  AdminCommandCenterDashboard,
  SellerCommandCenterDashboard,
  SellerHealthScores,
} from "./types";

export const SELLER_COMMAND_CENTER_TITLE = "Command Center";

export function emptySellerCommandCenter(): SellerCommandCenterDashboard {
  return {
    enabled: false,
    title: SELLER_COMMAND_CENTER_TITLE,
    health: {
      growthScore: null,
      trustScore: null,
      qualityScore: null,
      learningScore: null,
    },
    aiSummary: "MARKETPLACE_COMMAND_CENTER_ENABLED=false",
    nextAction: null,
    opportunities: [],
    whatWorks: [],
    topPriorities: [],
  };
}

export function emptyAdminCommandCenter(): AdminCommandCenterDashboard {
  return {
    enabled: false,
    marketplaceHealth: [],
    aiPriorities: [],
    executionStatus: [],
    learning: [],
    trust: [],
    revenueOpportunities: [],
    topPriorities: [],
  };
}

export function buildSellerAiSummary(input: {
  totalViews: number;
  totalProducts: number;
  health: SellerHealthScores;
  primaryWeakness?: string | null;
}): string {
  if (input.totalProducts === 0) {
    return "Создайте первый товар — Command Center покажет здоровье магазина и следующий шаг.";
  }

  const trustLow =
    input.health.trustScore != null && input.health.trustScore < 60;
  const qualityLow =
    input.health.qualityScore != null && input.health.qualityScore < 65;

  if (input.totalViews > 0 && (trustLow || qualityLow)) {
    const reason = trustLow
      ? "недостаток доверия"
      : "слабые карточки товаров";
    return `Ваши товары получают просмотры, но покупатели уходят. Главная причина — ${reason}.`;
  }

  if (input.totalViews > 0) {
    return `Ваши товары получили ${input.totalViews} просмотров. AI анализирует, что улучшить дальше.`;
  }

  if (input.primaryWeakness) {
    return `Сейчас важнее всего: ${input.primaryWeakness.toLowerCase()}.`;
  }

  return "Магазин на площадке — выполните главное действие ниже, чтобы ускорить рост.";
}
