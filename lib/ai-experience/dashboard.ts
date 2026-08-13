import type {
  AdminAiCommandCenterDashboard,
  SellerAiCenterDashboard,
} from "./types";

export const SELLER_AI_CENTER_TITLE = "Центр роста продавца";

export function emptySellerAiCenter(): SellerAiCenterDashboard {
  return {
    enabled: false,
    title: SELLER_AI_CENTER_TITLE,
    growthLevel: null,
    happeningSummary: "AI Experience выключен",
    priority: null,
    opportunities: [],
    insightCards: [],
  };
}

export function emptyAdminAiCenter(): AdminAiCommandCenterDashboard {
  return {
    enabled: false,
    marketplaceHealth: [],
    topOpportunities: [],
    activeStrategies: [],
    executionProgress: [],
  };
}

export function formatHappeningSummary(input: {
  totalViews: number;
  totalProducts: number;
}): string {
  if (input.totalProducts === 0) {
    return "Создайте первый товар — AI подскажет следующий шаг";
  }
  return `Ваши товары получили ${input.totalViews} просмотров`;
}
