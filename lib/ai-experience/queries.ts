import { ROUTES, sellerProductEditPath } from "@/lib/constants";
import { getProductBuyerMatch, isBuyerIntelligenceEnabled } from "@/lib/buyer-intelligence";
import {
  getSellerGrowthCoach,
  isMarketplaceEducationEnabled,
} from "@/lib/marketplace-education";
import { getBuyerHelpPrompts } from "@/lib/marketplace-education/queries";
import {
  getSellerLotRecommendation,
  isMarketplaceCommunicationEnabled,
} from "@/lib/marketplace-communication";
import {
  getSellerExecutionActions,
  isMarketplaceExecutionEnabled,
} from "@/lib/marketplace-execution";
import {
  getMarketplaceExecutionDashboard,
} from "@/lib/marketplace-execution/queries";
import {
  getMarketplaceIntelligenceDashboard,
  isMarketplaceIntelligenceEnabled,
} from "@/lib/marketplace-intelligence";
import {
  getMarketplaceOperatorDashboard,
  isMarketplaceOperatorEnabled,
} from "@/lib/marketplace-operator";
import { generatePromotionRecommendations } from "@/lib/promotion/intelligence/recommendations";
import { isPromotionIntelligenceEnabled } from "@/lib/promotion/intelligence/flags";
import {
  getSellerGrowthDashboard,
  isSellerGrowthEnabled,
} from "@/lib/seller-growth";
import { loadSellerHealthSnapshot } from "@/lib/seller-growth/seller-health";
import {
  ensureLearningExperimentFromRecommendation,
  getLearningCardsForAiCenter,
  getSellerLearningInsights,
  isMarketplaceLearningEnabled,
} from "@/lib/marketplace-learning";

import {
  buildAdminHealthCards,
  buildGrowthOpportunityCards,
} from "./cards";
import {
  emptyAdminAiCenter,
  emptySellerAiCenter,
  formatHappeningSummary,
  SELLER_AI_CENTER_TITLE,
} from "./dashboard";
import { isAiExperienceEnabled } from "./flags";
import {
  pickPriorityRecommendation,
  priorityFromCoach,
  priorityFromCommunication,
  priorityFromExecution,
  priorityFromGrowthAction,
  priorityFromPromotion,
  priorityFromQuality,
} from "./priority";
import { explainRecommendation } from "./recommendations";
import type {
  AdminAiCommandCenterDashboard,
  AiExperienceCard,
  AiNotification,
  BuyerAiAssistantExperience,
  PriorityRecommendation,
  SellerAiCenterDashboard,
} from "./types";

async function collectSellerPriorityCandidates(
  sellerProfileId: string,
): Promise<PriorityRecommendation[]> {
  const candidates: PriorityRecommendation[] = [];

  if (isSellerGrowthEnabled()) {
    const growth = await getSellerGrowthDashboard(sellerProfileId);
    if (growth?.nextAction) {
      candidates.push(
        priorityFromGrowthAction({
          action: growth.nextAction.action,
          impact: growth.nextAction.impact,
          reason:
            growth.insights[0]?.reason ??
            "Рекомендация на основе Growth Score",
          href: growth.nextAction.href,
          productId: growth.nextAction.productId,
          priority: growth.nextAction.priority,
        }),
      );
    }
  }

  if (isMarketplaceEducationEnabled()) {
    const coach = await getSellerGrowthCoach(sellerProfileId);
    if (coach && coach.steps[0]) {
      candidates.push(
        priorityFromCoach({
          action: coach.steps[0].text,
          analysis: coach.analysis,
          benefit: "Поможет улучшить конверсию карточки",
          howTo: coach.steps[0].text,
          href: coach.steps[0].href ?? coach.href,
        }),
      );
    }
  }

  if (isMarketplaceExecutionEnabled()) {
    const actions = await getSellerExecutionActions(sellerProfileId);
    const top = actions[0];
    if (top) {
      candidates.push(
        priorityFromExecution({
          title: top.headline,
          description: top.description,
          href: top.href,
          priority: "HIGH",
        }),
      );
    }
  }

  if (isPromotionIntelligenceEnabled()) {
    const promo = await generatePromotionRecommendations(sellerProfileId);
    const ready = promo.recommendations.find((r) => r.ready && !r.isPromoted);
    if (ready) {
      candidates.push(
        priorityFromPromotion({
          productTitle: ready.productTitle,
          reason: ready.reasons[0] ?? ready.recommendation,
          href: ROUTES.ACCOUNT_PROMOTIONS,
        }),
      );
    }
  }

  const health = await loadSellerHealthSnapshot(sellerProfileId);
  if (health) {
    const weak = [...health.products].sort(
      (a, b) => a.qualityScore - b.qualityScore,
    )[0];
    if (weak && weak.qualityScore < 75) {
      const photoBlock = weak.blockers.find((b) =>
        b.toLowerCase().includes("фото"),
      );
      const charBlock = weak.blockers.find((b) =>
        b.toLowerCase().includes("характеристик"),
      );
      candidates.push(
        priorityFromQuality({
          action: photoBlock
            ? "Добавьте фото к товару"
            : charBlock
              ? "Добавьте характеристики"
              : "Улучшите карточку товара",
          why: photoBlock
            ? "Покупатели смотрят товар, но редко добавляют в корзину"
            : "Слабая карточка снижает доверие",
          href: sellerProductEditPath(weak.id),
        }),
      );
    }
  }

  if (isMarketplaceCommunicationEnabled()) {
    const lot = await getSellerLotRecommendation(sellerProfileId);
    if (lot) {
      candidates.push(
        priorityFromCommunication({
          headline: lot.headline,
          body: lot.body.split("\n")[0] ?? lot.body,
          href: lot.href,
        }),
      );
    }
  }

  return candidates;
}

export async function getSellerAiCenterDashboard(
  sellerProfileId: string,
): Promise<SellerAiCenterDashboard> {
  if (!isAiExperienceEnabled()) {
    return emptySellerAiCenter();
  }

  const health = await loadSellerHealthSnapshot(sellerProfileId);
  const totalViews =
    health?.products.reduce((s, p) => s + (p.productViews || p.views), 0) ?? 0;

  let growthLevel: SellerAiCenterDashboard["growthLevel"] = null;
  let opportunities: AiExperienceCard[] = [];
  const insightCards: AiExperienceCard[] = [];

  if (isSellerGrowthEnabled()) {
    const growth = await getSellerGrowthDashboard(sellerProfileId);
    if (growth) {
      growthLevel = {
        score: growth.score.score,
        level: growth.score.level,
        levelLabel: growth.score.levelLabel,
        strengths: growth.score.strengths.slice(0, 3),
        weaknesses: growth.score.weaknesses.slice(0, 3),
      };
      opportunities = buildGrowthOpportunityCards({
        readyForPromotion: growth.opportunities.readyForPromotionCount,
        needsImprovement: growth.opportunities.needsImprovementCount,
        lowStock: growth.opportunities.lowStockCount,
        singleProduct: growth.opportunities.singleProductSeller,
      });
      for (const insight of growth.insights.slice(0, 2)) {
        insightCards.push({
          id: `insight-${insight.type}`,
          title: insight.title,
          body: insight.reason,
          testId: `ai-insight-${insight.type.toLowerCase()}`,
        });
      }
    }
  }

  const candidates = await collectSellerPriorityCandidates(sellerProfileId);
  const picked = pickPriorityRecommendation(candidates);
  const priority = picked ? explainRecommendation(picked) : null;

  let whatWorks: AiExperienceCard[] = [];
  let learningExperimentId: string | null = null;

  if (isMarketplaceLearningEnabled()) {
    const learning = await getSellerLearningInsights(sellerProfileId);
    if (learning.enabled) {
      whatWorks = getLearningCardsForAiCenter(learning);
    }
    if (picked) {
      const weakProduct = health?.products
        .slice()
        .sort((a, b) => a.qualityScore - b.qualityScore)[0];
      learningExperimentId = await ensureLearningExperimentFromRecommendation({
        sellerProfileId,
        productId: weakProduct?.id ?? null,
        recommendation: picked,
      });
    }
  }

  return {
    enabled: true,
    title: SELLER_AI_CENTER_TITLE,
    growthLevel,
    happeningSummary: formatHappeningSummary({
      totalViews,
      totalProducts: health?.productCount ?? 0,
    }),
    priority,
    opportunities,
    insightCards,
    whatWorks,
    learningExperimentId,
  };
}

export async function getAdminAiCommandCenterDashboard(): Promise<AdminAiCommandCenterDashboard> {
  if (!isAiExperienceEnabled()) {
    return emptyAdminAiCenter();
  }

  const marketplaceHealth: AiExperienceCard[] = [];
  const topOpportunities: AiExperienceCard[] = [];
  const activeStrategies: AiExperienceCard[] = [];
  const executionProgress: AiExperienceCard[] = [];

  if (isMarketplaceIntelligenceEnabled()) {
    const intel = await getMarketplaceIntelligenceDashboard();
    if (intel.enabled) {
      marketplaceHealth.push(...buildAdminHealthCards(intel.health));
      for (const opp of intel.opportunities.slice(0, 4)) {
        topOpportunities.push({
          id: `opp-${opp.id}`,
          title: opp.title,
          body: opp.reason,
          href: ROUTES.ADMIN_INTELLIGENCE,
          testId: `ai-admin-opp-${opp.id}`,
        });
      }
    }
  }

  if (isMarketplaceOperatorEnabled()) {
    const operator = await getMarketplaceOperatorDashboard();
    if (operator.enabled) {
      for (const plan of operator.actionPlans.slice(0, 4)) {
        activeStrategies.push({
          id: `strategy-${plan.id}`,
          title: plan.title,
          body: plan.expectedEffect,
          href: ROUTES.ADMIN_OPERATOR,
          testId: `ai-admin-strategy-${plan.id}`,
        });
      }
    }
  }

  if (isMarketplaceExecutionEnabled()) {
    const execution = await getMarketplaceExecutionDashboard();
    if (execution.enabled) {
      executionProgress.push({
        id: "exec-progress",
        title: "Execution progress",
        body: `${execution.progress.tasksCompleted}/${execution.progress.tasksTotal} задач · ${execution.progress.completionRate}%`,
        href: ROUTES.ADMIN_EXECUTION,
        testId: "ai-admin-execution-progress",
      });
      for (const task of execution.taskPipeline.slice(0, 3)) {
        executionProgress.push({
          id: `task-${task.id}`,
          title: task.title,
          body: task.status,
          href: ROUTES.ADMIN_EXECUTION,
          testId: `ai-admin-task-${task.id}`,
        });
      }
    }
  }

  return {
    enabled: true,
    marketplaceHealth,
    topOpportunities,
    activeStrategies,
    executionProgress,
  };
}

export async function getAiNotifications(input: {
  sellerProfileId?: string | null;
  userId?: string | null;
}): Promise<AiNotification[]> {
  if (!isAiExperienceEnabled()) return [];

  const notifications: AiNotification[] = [];
  const now = new Date().toISOString();

  if (input.sellerProfileId) {
    const dashboard = await getSellerAiCenterDashboard(input.sellerProfileId);
    if (dashboard.priority) {
      notifications.push({
        id: "notif-priority",
        type: "AI_RECOMMENDATION",
        title: dashboard.priority.action,
        body: dashboard.priority.why,
        href: dashboard.priority.href,
        createdAt: now,
        read: false,
      });
    }

    if (isMarketplaceExecutionEnabled()) {
      const actions = await getSellerExecutionActions(input.sellerProfileId);
      for (const action of actions.slice(0, 2)) {
        notifications.push({
          id: `notif-task-${action.taskId}`,
          type: "TASK_READY",
          title: action.headline,
          body: action.description,
          href: action.href,
          createdAt: now,
          read: false,
        });
      }
    }

    if (isPromotionIntelligenceEnabled()) {
      const promo = await generatePromotionRecommendations(input.sellerProfileId);
      for (const rec of promo.recommendations
        .filter((r) => r.ready && !r.isPromoted)
        .slice(0, 2)) {
        notifications.push({
          id: `notif-promo-${rec.productId}`,
          type: "PROMOTION_OPPORTUNITY",
          title: `Продвижение: ${rec.productTitle}`,
          body: rec.reasons[0] ?? rec.recommendation,
          href: ROUTES.ACCOUNT_PROMOTIONS,
          createdAt: now,
          read: false,
        });
      }
    }

    const health = await loadSellerHealthSnapshot(input.sellerProfileId);
    const weak = health?.products
      .filter((p) => p.qualityScore < 60)
      .slice(0, 2);
    for (const product of weak ?? []) {
      notifications.push({
        id: `notif-product-${product.id}`,
        type: "PRODUCT_ISSUE",
        title: `Слабая карточка: ${product.name}`,
        body: product.blockers[0] ?? "Улучшите качество карточки",
        href: sellerProductEditPath(product.id),
        createdAt: now,
        read: false,
      });
    }
  }

  return notifications.slice(0, 12);
}

export async function getBuyerAiAssistantExperience(input: {
  productId: string;
  productTitle: string;
  userId?: string | null;
}): Promise<BuyerAiAssistantExperience> {
  if (!isAiExperienceEnabled()) {
    return { enabled: false, headline: "Помочь выбрать", prompts: [], matchSummary: null };
  }

  const prompts = isMarketplaceEducationEnabled()
    ? getBuyerHelpPrompts(input.productTitle)
    : [];

  let matchSummary: string | null = null;
  if (isBuyerIntelligenceEnabled()) {
    const match = await getProductBuyerMatch({
      productId: input.productId,
      userId: input.userId ?? null,
    });
    if (match?.reasons?.length) {
      matchSummary = match.reasons.slice(0, 2).join(" · ");
    }
  }

  if (prompts.length === 0 && !matchSummary) {
    return {
      enabled: false,
      headline: "Помочь выбрать",
      prompts: [],
      matchSummary: null,
    };
  }

  return {
    enabled: true,
    headline: "Помочь выбрать",
    prompts: prompts.map((p) => ({
      id: p.id,
      question: p.question,
      answerPreview: p.answerPreview,
    })),
    matchSummary,
  };
}
