import { PayoutRequestStatus, ProductStatus } from "@prisma/client";

import { toPriceNumber } from "@/features/products/mappers";
import { ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

import { isSellerLifecycleEnabled } from "./flags";
import {
  buildJourneySteps,
  computeJourneyProgress,
  pickNextJourneyStep,
  resolveLifecycleStage,
} from "./journey";
import { detectMilestones, latestAchievedMilestone } from "./milestones";
import {
  emptySellerSignals,
  loadSellerProgressSignals,
} from "./progress";
import { buildSellerJourneyCoach } from "./recommendations";
import type {
  AdminSellerFunnel,
  SellerLifecycleDashboard,
  SellerLifecycleNotification,
} from "./types";
import { stageLabel } from "./types";

export async function getSellerLifecycleDashboard(
  sellerProfileId: string,
): Promise<SellerLifecycleDashboard> {
  if (!isSellerLifecycleEnabled()) {
    return {
      enabled: false,
      stage: "NOT_STARTED",
      stageLabel: "SELLER_LIFECYCLE_ENABLED=false",
      progressCurrent: 0,
      progressTotal: 8,
      steps: [],
      coach: {
        headline: "Seller Lifecycle",
        body: "SELLER_LIFECYCLE_ENABLED=false",
        bullets: [],
        ctaLabel: "",
        ctaHref: ROUTES.ACCOUNT,
        tone: "info",
      },
      milestones: [],
      nextStep: null,
    };
  }

  const signals = await loadSellerProgressSignals(sellerProfileId);
  const stage = resolveLifecycleStage(signals);
  const steps = buildJourneySteps({ stage, signals });
  const progress = computeJourneyProgress(steps);
  const milestones = detectMilestones(signals);

  return {
    enabled: true,
    stage,
    stageLabel: stageLabel(stage),
    progressCurrent: progress.current,
    progressTotal: progress.total,
    steps,
    coach: buildSellerJourneyCoach({ stage, signals }),
    milestones,
    nextStep: pickNextJourneyStep(steps),
  };
}

export async function getAdminSellerFunnel(): Promise<AdminSellerFunnel> {
  if (!isSellerLifecycleEnabled()) {
    return { enabled: false, started: 0, steps: [] };
  }

  const sellers = await prisma.sellerProfile.findMany({
    select: { id: true },
  });
  const started = sellers.length;
  if (started === 0) {
    return { enabled: true, started: 0, steps: [] };
  }

  const sellerIds = sellers.map((s) => s.id);

  const [withProduct, withPublished, withViews, withOrders, withPayout] =
    await Promise.all([
      prisma.product.groupBy({
        by: ["sellerId"],
        where: { sellerId: { in: sellerIds } },
      }),
      prisma.product.groupBy({
        by: ["sellerId"],
        where: { sellerId: { in: sellerIds }, status: ProductStatus.ACTIVE },
      }),
      prisma.product.groupBy({
        by: ["sellerId"],
        where: { sellerId: { in: sellerIds }, views: { gt: 0 } },
      }),
      prisma.orderItem.groupBy({
        by: ["productId"],
        where: { product: { sellerId: { in: sellerIds } } },
      }).then(async (items) => {
        if (items.length === 0) return [];
        const productIds = items.map((i) => i.productId);
        return prisma.product.groupBy({
          by: ["sellerId"],
          where: { id: { in: productIds } },
        });
      }),
      Promise.all([
        prisma.sellerBalance.findMany({
          where: {
            sellerId: { in: sellerIds },
            paidAmount: { gt: 0 },
          },
          select: { sellerId: true },
        }),
        prisma.payoutRequest.groupBy({
          by: ["sellerId"],
          where: {
            sellerId: { in: sellerIds },
            status: PayoutRequestStatus.COMPLETED,
          },
        }),
      ]).then(([paidBalances, payoutGroups]) => {
        const ids = new Set<string>();
        for (const row of paidBalances) ids.add(row.sellerId);
        for (const row of payoutGroups) ids.add(row.sellerId);
        return [...ids];
      }),
    ]);

  const counts = [
    { label: "Зарегистрировались как продавцы", count: started },
    { label: "Создали товар", count: withProduct.length },
    { label: "Опубликовали", count: withPublished.length },
    { label: "Получили просмотры", count: withViews.length },
    { label: "Получили заказ", count: withOrders.length },
    { label: "Получили выплату", count: withPayout.length },
  ];

  const steps = counts.map((row, index) => {
    const prev = index > 0 ? counts[index - 1]!.count : null;
    return {
      label: row.label,
      count: row.count,
      percentOfPrevious:
        prev && prev > 0 ? Math.round((row.count / prev) * 100) : null,
      percentOfStarted: Math.round((row.count / started) * 100),
    };
  });

  return { enabled: true, started, steps };
}

export async function getSellerLifecycleNotifications(input: {
  sellerProfileId: string;
}): Promise<SellerLifecycleNotification[]> {
  if (!isSellerLifecycleEnabled()) return [];

  const dashboard = await getSellerLifecycleDashboard(input.sellerProfileId);
  const notifications: SellerLifecycleNotification[] = [];
  const now = new Date().toISOString();

  if (dashboard.nextStep) {
    notifications.push({
      id: `lifecycle-next-${dashboard.nextStep.id}`,
      type: "SELLER_NEXT_STEP",
      title: "Следующий шаг",
      body: dashboard.nextStep.label,
      href: dashboard.nextStep.href ?? ROUTES.ACCOUNT_COMMAND_CENTER,
      createdAt: now,
      read: false,
    });
  }

  const milestone = latestAchievedMilestone(dashboard.milestones);
  if (milestone?.achievedAt) {
    notifications.push({
      id: `lifecycle-milestone-${milestone.type}`,
      type: "SELLER_MILESTONE",
      title: `${milestone.emoji} ${milestone.label}`,
      body: "Отличная работа — продолжайте путь продавца",
      href: ROUTES.ACCOUNT_COMMAND_CENTER,
      createdAt: milestone.achievedAt,
      read: false,
    });
  }

  if (dashboard.stage === "BALANCE_AVAILABLE") {
    const signals = await loadSellerProgressSignals(input.sellerProfileId);
    notifications.push({
      id: "lifecycle-money-available",
      type: "SELLER_MONEY_AVAILABLE",
      title: "Средства доступны к выводу",
      body: `${signals.availableBalance.toLocaleString("ru-RU")} ₽ готовы к выводу`,
      href: ROUTES.ACCOUNT_PAYOUTS,
      createdAt: now,
      read: false,
    });
  }

  notifications.push({
    id: `lifecycle-progress-${dashboard.progressCurrent}`,
    type: "SELLER_PROGRESS",
    title: `Ваш путь: ${dashboard.progressCurrent} из ${dashboard.progressTotal}`,
    body: dashboard.coach.headline,
    href: ROUTES.ACCOUNT_COMMAND_CENTER,
    createdAt: now,
    read: false,
  });

  return notifications.slice(0, 6);
}

export { emptySellerSignals, loadSellerProgressSignals };
