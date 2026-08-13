import { ProductStatus } from "@prisma/client";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { parseBuyerIntent } from "@/lib/buyer-intelligence/intent-parser";
import {
  buildMarketplaceProblems,
  collectMarketplaceSignals,
} from "@/lib/marketplace-intelligence";
import { getMarketplaceIntelligenceDashboard } from "@/lib/marketplace-intelligence/queries";
import { isMarketplaceIntelligenceEnabled } from "@/lib/marketplace-intelligence/flags";
import { prisma } from "@/lib/prisma";
import { getSellerGrowthDashboard } from "@/lib/seller-growth/queries";
import { isSellerGrowthEnabled } from "@/lib/seller-growth/flags";

import { buildMarketplaceActionPlans } from "./action-plans";
import { generateMarketplaceDiagnosis } from "./diagnosis";
import { isMarketplaceOperatorEnabled } from "./flags";
import {
  extractRecommendedActions,
  prioritizeActionPlans,
} from "./prioritization";
import { generateGrowthStrategy } from "./strategy";
import type {
  BuyerDemandAction,
  MarketplaceOperatorDashboard,
  OperatorStatus,
  SellerOperatorConnection,
} from "./types";

export class MarketplaceOperatorForbiddenError extends Error {
  readonly status = 403;

  constructor(message = "Marketplace operator недоступен") {
    super(message);
    this.name = "MarketplaceOperatorForbiddenError";
  }
}

export function assertMarketplaceOperatorAccess(role: string | undefined): void {
  if (role !== "ADMIN") {
    throw new MarketplaceOperatorForbiddenError();
  }
}

function buildOperatorStatus(
  diagnoses: MarketplaceOperatorDashboard["diagnoses"],
  plans: MarketplaceOperatorDashboard["actionPlans"],
): OperatorStatus {
  const highCount = diagnoses.filter((d) => d.severity === "HIGH").length;
  const healthScore = Math.max(
    20,
    100 - highCount * 12 - diagnoses.length * 3,
  );

  return {
    headline:
      highCount > 0
        ? `${highCount} критических зон требуют внимания оператора`
        : "Площадка стабильна — фокус на росте",
    summary: `${plans.length} стратегических планов подготовлено (требуют ручного approval)`,
    healthScore,
    topTaskCount: Math.min(3, plans.length),
  };
}

export async function getMarketplaceOperatorDashboard(): Promise<MarketplaceOperatorDashboard> {
  if (!isMarketplaceOperatorEnabled()) {
    return {
      enabled: false,
      status: {
        headline: "Marketplace Operator выключен",
        summary: "MARKETPLACE_OPERATOR_ENABLED=false",
        healthScore: 0,
        topTaskCount: 0,
      },
      diagnoses: [],
      strategies: [],
      actionPlans: [],
      topProblems: [],
      recommendedActions: [],
    };
  }

  const intelligence = isMarketplaceIntelligenceEnabled()
    ? await getMarketplaceIntelligenceDashboard()
    : null;
  const signals =
    intelligence?.signals.length
      ? intelligence.signals
      : await collectMarketplaceSignals();
  const problems =
    intelligence?.problems.length
      ? intelligence.problems
      : buildMarketplaceProblems(signals);
  const diagnoses = generateMarketplaceDiagnosis({ signals, problems });
  const strategies = generateGrowthStrategy(diagnoses);
  const actionPlans = prioritizeActionPlans(
    buildMarketplaceActionPlans({ diagnoses, strategies }),
  );
  const recommendedActions = extractRecommendedActions(actionPlans);
  const status = buildOperatorStatus(diagnoses, actionPlans);

  return {
    enabled: true,
    status,
    diagnoses,
    strategies,
    actionPlans,
    topProblems: diagnoses.slice(0, 5),
    recommendedActions,
  };
}

/** Seller operator connection — strategic actions for seller cabinet. */
export async function getSellerOperatorConnection(
  sellerProfileId: string,
): Promise<SellerOperatorConnection | null> {
  if (!isMarketplaceOperatorEnabled()) return null;

  const [dashboard, products, growth] = await Promise.all([
    getMarketplaceOperatorDashboard(),
    prisma.product.findMany({
      where: { sellerId: sellerProfileId, status: ProductStatus.ACTIVE },
      select: {
        stock: true,
        category: { select: { name: true } },
      },
      take: 40,
    }),
    isSellerGrowthEnabled()
      ? getSellerGrowthDashboard(sellerProfileId)
      : Promise.resolve(null),
  ]);

  if (!dashboard.enabled) return null;

  const sellerCategories = new Set(
    products.map((p) => p.category?.name).filter((c): c is string => Boolean(c)),
  );

  const insights: SellerOperatorConnection["insights"] = [];

  for (const plan of dashboard.actionPlans.slice(0, 2)) {
    const diagnosis = dashboard.diagnoses.find((d) => d.id === plan.diagnosisId);
    if (!diagnosis?.categoryName) continue;
    if (!sellerCategories.has(diagnosis.categoryName)) continue;

    const lowStock = products.some(
      (p) =>
        p.category?.name === diagnosis.categoryName &&
        p.stock > 0 &&
        p.stock <= 3,
    );

    insights.push({
      headline: `Категория «${diagnosis.categoryName}» растёт`,
      reasons: [
        diagnosis.issue,
        "Ваш товар подходит этому спросу",
        lowStock ? "Рекомендуем увеличить остатки" : "Поддерживайте наличие",
      ],
      recommendedAction: lowStock
        ? "Увеличить остатки по растущей категории"
        : plan.actions[0]?.description ?? "Улучшить карточку товара",
      href: "/account/products",
    });
  }

  if (growth?.nextAction) {
    insights.push({
      headline: "Следующий шаг Seller Growth",
      reasons: [growth.nextAction.impact, growth.nextAction.action],
      recommendedAction: growth.nextAction.action,
      href: growth.nextAction.href,
    });
  }

  return { insights: insights.slice(0, 3) };
}

/** Buyer-facing demand actions from operator diagnosis. */
export async function getBuyerDemandActions(): Promise<BuyerDemandAction[]> {
  if (!isMarketplaceOperatorEnabled()) return [];

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const searches = await prisma.analyticsEvent.findMany({
    where: {
      event: ANALYTICS_EVENTS.SEARCH_USED,
      createdAt: { gte: since },
    },
    select: { entityId: true },
    take: 3000,
  });

  const queryCounts = new Map<string, number>();
  for (const row of searches) {
    const q = row.entityId?.trim();
    if (!q || q.length < 3) continue;
    queryCounts.set(q, (queryCounts.get(q) ?? 0) + 1);
  }

  const actions: BuyerDemandAction[] = [];

  for (const [query, count] of [...queryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)) {
    if (count < 3) continue;
    const intent = parseBuyerIntent(query);
    const category = intent.category ?? "категорию";
    const activeCount = intent.category
      ? await prisma.product.count({
          where: {
            status: ProductStatus.ACTIVE,
            category: {
              name: { equals: intent.category, mode: "insensitive" },
            },
          },
        })
      : 0;

    if (activeCount < Math.max(3, count / 5)) {
      actions.push({
        headline: `${count} пользователей ищут «${query}»`,
        detail: `Не хватает предложений в категории ${category} (${activeCount} активных SKU)`,
        query,
        userCount: count,
      });
    }
  }

  return actions.slice(0, 3);
}

export { isMarketplaceOperatorEnabled } from "./flags";
