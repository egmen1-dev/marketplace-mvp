import { ROUTES } from "@/lib/constants";
import { getAiNotifications, isAiExperienceEnabled } from "@/lib/ai-experience";
import {
  getSellerLotRecommendation,
  isMarketplaceCommunicationEnabled,
} from "@/lib/marketplace-communication";
import {
  getSellerExecutionActions,
  getMarketplaceExecutionDashboard,
  isMarketplaceExecutionEnabled,
} from "@/lib/marketplace-execution";
import {
  getMarketplaceIntelligenceDashboard,
  isMarketplaceIntelligenceEnabled,
} from "@/lib/marketplace-intelligence";
import {
  getSellerLearningInsights,
  getAdminLearningCenterDashboard,
  isMarketplaceLearningEnabled,
} from "@/lib/marketplace-learning";
import {
  getMarketplaceOperatorDashboard,
  isMarketplaceOperatorEnabled,
} from "@/lib/marketplace-operator";
import { generatePromotionRecommendations } from "@/lib/promotion/intelligence/recommendations";
import { isPromotionIntelligenceEnabled } from "@/lib/promotion/intelligence/flags";
import {
  getSellerGrowthCoach,
  isMarketplaceEducationEnabled,
} from "@/lib/marketplace-education";
import {
  getSellerGrowthDashboard,
  isSellerGrowthEnabled,
} from "@/lib/seller-growth";
import { loadSellerHealthSnapshot } from "@/lib/seller-growth/seller-health";
import {
  getAdminTrustCenterDashboard,
  getSellerTrustCoach,
  getTrustNotifications,
  isTrustSafetyEnabled,
} from "@/lib/trust-safety";

import {
  buildSellerAiSummary,
  emptyAdminCommandCenter,
  emptySellerCommandCenter,
  SELLER_COMMAND_CENTER_TITLE,
} from "./dashboard";
import { isMarketplaceCommandCenterEnabled } from "./flags";
import { loadSellerHealthScores } from "./health";
import {
  pickOneNextAction,
  pickTopPriorities,
  priorityFromExecution,
  priorityFromGrowth,
  priorityFromLearning,
  priorityFromOperator,
  priorityFromPromotion,
  priorityFromTrust,
} from "./priorities";
import type {
  AdminCommandCenterDashboard,
  CommandCenterNotification,
  CommandCenterPriority,
  SellerCommandCenterDashboard,
} from "./types";
import {
  buildAdminHealthWidgets,
  buildExecutionWidgets,
  buildSellerOpportunityWidgets,
  buildWhatWorksWidgets,
} from "./widgets";

async function collectSellerPriorities(
  sellerProfileId: string,
): Promise<CommandCenterPriority[]> {
  const candidates: CommandCenterPriority[] = [];

  if (isSellerGrowthEnabled()) {
    const growth = await getSellerGrowthDashboard(sellerProfileId);
    if (growth?.nextAction) {
      candidates.push(
        priorityFromGrowth({
          action: growth.nextAction.action,
          reason:
            growth.insights[0]?.reason ?? "Рекомендация Growth Score",
          impact: growth.nextAction.impact,
          productId: growth.nextAction.productId,
          priority: growth.nextAction.priority,
        }),
      );
    }
  }

  if (isTrustSafetyEnabled()) {
    const coach = await getSellerTrustCoach(sellerProfileId);
    const top = coach?.improvements[0];
    if (top) {
      candidates.push(
        priorityFromTrust({
          action: top.action,
          why: top.why,
          href: top.href,
        }),
      );
    }
  }

  if (isMarketplaceLearningEnabled()) {
    const learning = await getSellerLearningInsights(sellerProfileId);
    const top = learning.whatWorks[0];
    if (top) {
      candidates.push(priorityFromLearning({ statement: top.statement }));
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
        }),
      );
    }
  }

  if (isMarketplaceEducationEnabled()) {
    const coach = await getSellerGrowthCoach(sellerProfileId);
    if (coach?.steps[0]) {
      candidates.push(
        priorityFromGrowth({
          action: coach.steps[0].text,
          reason: coach.analysis,
          impact: "Улучшит конверсию карточки",
          href: coach.steps[0].href ?? coach.href,
          priority: "MEDIUM",
        }),
      );
    }
  }

  if (isMarketplaceCommunicationEnabled()) {
    const lot = await getSellerLotRecommendation(sellerProfileId);
    if (lot) {
      candidates.push(
        priorityFromOperator({
          title: lot.headline,
          body: lot.body.split("\n")[0] ?? lot.body,
          href: lot.href,
        }),
      );
    }
  }

  return candidates;
}

export async function getSellerCommandCenterDashboard(
  sellerProfileId: string,
): Promise<SellerCommandCenterDashboard> {
  if (!isMarketplaceCommandCenterEnabled()) {
    return emptySellerCommandCenter();
  }

  const [health, healthSnapshot, growth, learning] = await Promise.all([
    loadSellerHealthScores(sellerProfileId),
    loadSellerHealthSnapshot(sellerProfileId).catch(() => null),
    isSellerGrowthEnabled()
      ? getSellerGrowthDashboard(sellerProfileId).catch(() => null)
      : Promise.resolve(null),
    isMarketplaceLearningEnabled()
      ? getSellerLearningInsights(sellerProfileId).catch(() => null)
      : Promise.resolve(null),
  ]);

  const totalViews =
    healthSnapshot?.products.reduce(
      (s, p) => s + (p.productViews || p.views),
      0,
    ) ?? 0;

  const weakProduct = healthSnapshot?.products
    .slice()
    .sort((a, b) => a.qualityScore - b.qualityScore)[0];

  const candidates = await collectSellerPriorities(sellerProfileId);
  const topPriorities = pickTopPriorities(candidates, 5);
  const nextAction = pickOneNextAction(candidates);

  const aiSummary = buildSellerAiSummary({
    totalViews,
    totalProducts: healthSnapshot?.productCount ?? 0,
    health,
    primaryWeakness: growth?.score.weaknesses[0] ?? null,
  });

  const opportunities = buildSellerOpportunityWidgets({
    readyForPromotion: growth?.opportunities.readyForPromotionCount ?? 0,
    needsImprovement: growth?.opportunities.needsImprovementCount ?? 0,
    lowStock: growth?.opportunities.lowStockCount ?? 0,
    weakProductId: weakProduct?.id ?? null,
  });

  const whatWorks = buildWhatWorksWidgets(
    learning?.whatWorks.map((w) => ({ id: w.id, statement: w.statement })) ??
      [],
  );

  return {
    enabled: true,
    title: SELLER_COMMAND_CENTER_TITLE,
    health,
    aiSummary,
    nextAction,
    opportunities,
    whatWorks,
    topPriorities,
  };
}

export async function getAdminCommandCenterDashboard(): Promise<AdminCommandCenterDashboard> {
  if (!isMarketplaceCommandCenterEnabled()) {
    return emptyAdminCommandCenter();
  }

  const adminPriorities: CommandCenterPriority[] = [];
  const marketplaceHealth: AdminCommandCenterDashboard["marketplaceHealth"] = [];
  const executionStatus: AdminCommandCenterDashboard["executionStatus"] = [];
  const learning: AdminCommandCenterDashboard["learning"] = [];
  const trust: AdminCommandCenterDashboard["trust"] = [];
  const revenueOpportunities: AdminCommandCenterDashboard["revenueOpportunities"] =
    [];

  if (isMarketplaceIntelligenceEnabled()) {
    const intel = await getMarketplaceIntelligenceDashboard();
    if (intel.enabled) {
      marketplaceHealth.push(
        ...buildAdminHealthWidgets({
          gmv: intel.health.gmv,
          sellers: intel.health.sellers,
          buyers: intel.health.buyers,
          conversionRate: intel.health.conversionRate,
          activeProducts: intel.health.activeProducts,
        }),
      );
      for (const problem of intel.problems.slice(0, 3)) {
        adminPriorities.push(
          priorityFromOperator({
            title: problem.title,
            body: problem.detail,
            href: ROUTES.ADMIN_INTELLIGENCE,
          }),
        );
      }
      for (const [index, opp] of intel.revenueOpportunities.slice(0, 3).entries()) {
        revenueOpportunities.push({
          id: `rev-${index}`,
          title: opp.title,
          body: opp.forecast,
          href: ROUTES.ADMIN_INTELLIGENCE,
          testId: `cc-rev-${index}`,
        });
      }
      for (const opp of intel.opportunities.slice(0, 2)) {
        adminPriorities.push(
          priorityFromOperator({
            title: opp.title,
            body: opp.reason,
            href: ROUTES.ADMIN_INTELLIGENCE,
          }),
        );
      }
    }
  }

  if (isMarketplaceOperatorEnabled()) {
    const operator = await getMarketplaceOperatorDashboard();
    if (operator.enabled) {
      for (const plan of operator.actionPlans.slice(0, 2)) {
        adminPriorities.push(
          priorityFromOperator({
            title: plan.title,
            body: plan.expectedEffect,
            href: ROUTES.ADMIN_OPERATOR,
          }),
        );
      }
    }
  }

  if (isMarketplaceExecutionEnabled()) {
    const execution = await getMarketplaceExecutionDashboard();
    if (execution.enabled) {
      executionStatus.push(
        ...buildExecutionWidgets({
          activePlans: execution.activePlans.length,
          openTasks: execution.taskPipeline.filter(
            (t) => t.status !== "COMPLETED" && t.status !== "CANCELLED",
          ).length,
          completedTasks: execution.completedTasks.length,
        }),
      );
    }
  }

  if (isMarketplaceLearningEnabled()) {
    const learningDash = await getAdminLearningCenterDashboard();
    if (learningDash.enabled) {
      learning.push(
        {
          id: "learning-quality",
          title: "Качество AI",
          body: `${learningDash.aiAccuracy.score}/100 — ${learningDash.aiAccuracy.label}`,
          testId: "cc-admin-learning-quality",
        },
        {
          id: "learning-patterns",
          title: "Успешные эксперименты",
          body: `${learningDash.successfulPatterns.length} patterns`,
          href: ROUTES.ADMIN_LEARNING,
          testId: "cc-admin-learning-patterns",
        },
      );
    }
  }

  if (isTrustSafetyEnabled()) {
    const trustDash = await getAdminTrustCenterDashboard();
    if (trustDash.enabled) {
      for (const risk of trustDash.sellerRisks.slice(0, 3)) {
        trust.push({
          id: risk.id,
          title: risk.title,
          body: risk.body,
          badge: risk.badge,
          href: ROUTES.ADMIN_TRUST_CENTER,
          testId: `cc-trust-${risk.id}`,
        });
      }
    }
  }

  return {
    enabled: true,
    marketplaceHealth,
    aiPriorities: pickTopPriorities(adminPriorities, 5),
    executionStatus,
    learning,
    trust,
    revenueOpportunities,
    topPriorities: pickTopPriorities(adminPriorities, 5),
  };
}

export async function getCommandCenterNotifications(input: {
  sellerProfileId?: string | null;
  userId?: string | null;
}): Promise<CommandCenterNotification[]> {
  const now = new Date().toISOString();
  const notifications: CommandCenterNotification[] = [];

  if (isAiExperienceEnabled() && input.sellerProfileId) {
    const ai = await getAiNotifications({
      sellerProfileId: input.sellerProfileId,
      userId: input.userId ?? null,
    });
    for (const n of ai) {
      notifications.push({
        ...n,
        source: "AI_EXPERIENCE",
      });
    }
  }

  if (isTrustSafetyEnabled() && input.sellerProfileId) {
    const trust = await getTrustNotifications({
      sellerProfileId: input.sellerProfileId,
    });
    for (const n of trust) {
      notifications.push({
        ...n,
        source: "TRUST",
      });
    }
  }

  if (isMarketplaceLearningEnabled() && input.sellerProfileId) {
    const learning = await getSellerLearningInsights(input.sellerProfileId);
    for (const item of learning.whatWorks.slice(0, 2)) {
      notifications.push({
        id: `learning-result-${item.id}`,
        type: "LEARNING_RESULT",
        title: "Learning Loop",
        body: item.statement,
        href: ROUTES.ACCOUNT_COMMAND_CENTER,
        createdAt: now,
        read: false,
        source: "LEARNING",
      });
    }
  }

  if (isMarketplaceExecutionEnabled() && input.sellerProfileId) {
    const tasks = await getSellerExecutionActions(input.sellerProfileId);
    for (const task of tasks.slice(0, 2)) {
      notifications.push({
        id: `exec-${task.taskId}`,
        type: "EXECUTION_TASK",
        title: task.headline,
        body: task.description,
        href: task.href,
        createdAt: now,
        read: false,
        source: "EXECUTION",
      });
    }
  }

  return notifications.slice(0, 20);
}
