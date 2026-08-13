import { ProductStatus } from "@prisma/client";

import { listLowCompletenessProducts } from "@/lib/conversion/queries";
import { ROUTES } from "@/lib/constants";
import {
  getBuyerDemandActions,
  getMarketplaceOperatorDashboard,
} from "@/lib/marketplace-operator/queries";
import { isMarketplaceOperatorEnabled } from "@/lib/marketplace-operator/flags";
import { prisma } from "@/lib/prisma";

import {
  buildExecutionPlans,
  mergeTasksIntoPlans,
} from "./execution-plan";
import { isMarketplaceExecutionEnabled } from "./flags";
import {
  applyTaskStatuses,
  calculateExecutionProgress,
  loadPersistedTaskStatuses,
} from "./progress";
import { generateAllExecutionTasks } from "./tasks";
import type {
  BuyerExecutionAction,
  MarketplaceExecutionDashboard,
  MarketplaceTask,
  SellerExecutionAction,
} from "./types";

export async function getMarketplaceExecutionDashboard(): Promise<MarketplaceExecutionDashboard> {
  if (!isMarketplaceExecutionEnabled()) {
    return emptyDashboard();
  }

  if (!isMarketplaceOperatorEnabled()) {
    return {
      ...emptyDashboard(),
      enabled: true,
      progress: {
        tasksTotal: 0,
        tasksCompleted: 0,
        tasksInProgress: 0,
        impactScore: 0,
        completionRate: 0,
        weekSummary: ["Включите MARKETPLACE_OPERATOR_ENABLED для планов"],
      },
    };
  }

  const operator = await getMarketplaceOperatorDashboard();
  if (!operator.enabled) {
    return emptyDashboard(true);
  }

  const plans = buildExecutionPlans({
    actionPlans: operator.actionPlans,
    diagnoses: operator.diagnoses,
  });

  const tasksByPlan = generateAllExecutionTasks({
    plans,
    actionPlans: operator.actionPlans.map((p) => ({
      id: p.id,
      diagnosisId: p.diagnosisId,
      actions: p.actions,
    })),
    diagnoses: operator.diagnoses,
  });

  const snapshots = await loadPersistedTaskStatuses();
  const plansWithTasks = mergeTasksIntoPlans(plans, tasksByPlan).map((plan) => ({
    ...plan,
    tasks: applyTaskStatuses(plan.tasks, snapshots),
  }));

  const allTasks = plansWithTasks.flatMap((p) => p.tasks);
  const activePlans = plansWithTasks.filter(
    (p) => p.status === "ACTIVE" || p.status === "DRAFT",
  );

  const avgImpact =
    activePlans.length > 0
      ? Math.round(
          activePlans.reduce((s, p) => s + p.impactScore, 0) /
            activePlans.length,
        )
      : 0;

  const progress = await calculateExecutionProgress(allTasks, avgImpact);

  const todaysPriorities = allTasks
    .filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED")
    .sort((a, b) => {
      const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return order[a.priority] - order[b.priority];
    })
    .slice(0, 5);

  const taskPipeline = allTasks.filter(
    (t) => t.status === "PENDING" || t.status === "IN_PROGRESS",
  );

  const completedTasks = allTasks
    .filter((t) => t.status === "COMPLETED")
    .slice(0, 10);

  return {
    enabled: true,
    activePlans: activePlans.filter((p) => p.status === "ACTIVE"),
    todaysPriorities,
    taskPipeline,
    completedTasks,
    progress,
  };
}

function emptyDashboard(partial = false): MarketplaceExecutionDashboard {
  return {
    enabled: partial,
    activePlans: [],
    todaysPriorities: [],
    taskPipeline: [],
    completedTasks: [],
    progress: {
      tasksTotal: 0,
      tasksCompleted: 0,
      tasksInProgress: 0,
      impactScore: 0,
      completionRate: 0,
      weekSummary: partial
        ? ["Operator выключен"]
        : ["MARKETPLACE_EXECUTION_ENABLED=false"],
    },
  };
}

/** Seller execution — actionable fixes linked to Seller Growth. */
export async function getSellerExecutionActions(
  sellerProfileId: string,
): Promise<SellerExecutionAction[]> {
  if (!isMarketplaceExecutionEnabled()) return [];

  const [lowQuality, products] = await Promise.all([
    listLowCompletenessProducts(5),
    prisma.product.findMany({
      where: { sellerId: sellerProfileId, status: ProductStatus.ACTIVE },
      select: {
        id: true,
        name: true,
        _count: { select: { images: true, characteristicValues: true } },
      },
      take: 20,
    }),
  ]);

  const actions: SellerExecutionAction[] = [];
  const ownedLow = products.filter(
    (p) => p._count.images === 0 || p._count.characteristicValues < 2,
  );

  for (const product of ownedLow.slice(0, 3)) {
    actions.push({
      taskId: `seller-${product.id}`,
      headline: "Ваш товар теряет продажи",
      description:
        product._count.images === 0
          ? `${product.name}: нет фото — низкая конверсия карточки`
          : `${product.name}: добавьте характеристики для доверия покупателей`,
      fixLabel: "Исправить",
      href: `/account/products/${product.id}/edit`,
      productId: product.id,
    });
  }

  if (actions.length === 0 && lowQuality.length > 0) {
    actions.push({
      taskId: "seller-general-improve",
      headline: "Улучшите карточки товаров",
      description:
        "Marketplace Execution рекомендует усилить фото и описания — это advisory, без автоправок.",
      fixLabel: "Открыть товары",
      href: ROUTES.SELLER_PRODUCTS,
    });
  }

  return actions.slice(0, 3);
}

/** Buyer demand gap → admin category action (advisory). */
export async function getBuyerExecutionActions(): Promise<
  BuyerExecutionAction[]
> {
  if (!isMarketplaceExecutionEnabled()) return [];

  const demandActions = await getBuyerDemandActions();
  return demandActions.map((d) => ({
    headline: d.headline,
    description: d.detail,
    actionLabel: "Расширить ассортимент категории",
    href: ROUTES.ADMIN_CATEGORIES,
    query: d.query,
  }));
}

export { isMarketplaceExecutionEnabled } from "./flags";

export type { MarketplaceTask };
