import { PayoutRequestStatus, ProductStatus } from "@prisma/client";

import { ROUTES } from "@/lib/constants";
import { loadSellerProgressSignals } from "@/lib/seller-lifecycle/progress";
import { prisma } from "@/lib/prisma";

import { isSellerJourneyEnabled } from "./flags";
import { detectJourneyMilestones, latestAchievedMilestone } from "./milestones";
import { resolveSellerJourneyStep } from "./progress";
import { buildEmptyStateCopy, buildSellerJourneyCoach } from "./recommendations";
import {
  buildJourneyChecklist,
  computeJourneyProgress,
  pickNextAction,
} from "./steps";
import type {
  AdminSellerJourneyFunnel,
  SellerJourneyDashboard,
  SellerJourneyEmptyState,
  SellerJourneyNotification,
} from "./types";
import { journeyStepLabel } from "./types";

const disabledDashboard: SellerJourneyDashboard = {
  enabled: false,
  step: "NOT_STARTED",
  stepLabel: "SELLER_JOURNEY_ENABLED=false",
  progressPercent: 0,
  progressCurrent: 0,
  progressTotal: 6,
  checklist: [],
  coach: {
    headline: "Seller Journey",
    why: "",
    body: "SELLER_JOURNEY_ENABLED=false",
    bullets: [],
    ctaLabel: "",
    ctaHref: ROUTES.ACCOUNT,
    tone: "info",
  },
  milestones: [],
  nextAction: null,
};

export async function getSellerJourneyDashboard(
  sellerProfileId: string,
): Promise<SellerJourneyDashboard> {
  if (!isSellerJourneyEnabled()) return disabledDashboard;

  const signals = await loadSellerProgressSignals(sellerProfileId);
  const step = resolveSellerJourneyStep(signals);
  const checklist = buildJourneyChecklist(step);
  const progress = computeJourneyProgress(checklist);
  const milestones = detectJourneyMilestones(signals);

  return {
    enabled: true,
    step,
    stepLabel: journeyStepLabel(step),
    progressPercent: progress.percent,
    progressCurrent: progress.current,
    progressTotal: progress.total,
    checklist,
    coach: buildSellerJourneyCoach({ step, signals }),
    milestones,
    nextAction: pickNextAction(checklist),
  };
}

export async function getSellerJourneyEmptyState(
  context: "products" | "orders" | "payouts",
): Promise<SellerJourneyEmptyState | null> {
  if (!isSellerJourneyEnabled()) return null;
  return buildEmptyStateCopy(context);
}

export async function getAdminSellerJourneyFunnel(): Promise<AdminSellerJourneyFunnel> {
  if (!isSellerJourneyEnabled()) {
    return { enabled: false, started: 0, steps: [] };
  }

  const sellers = await prisma.sellerProfile.findMany({ select: { id: true } });
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
          where: { sellerId: { in: sellerIds }, paidAmount: { gt: 0 } },
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
    { label: "Начали продавать", count: started },
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

export async function getSellerJourneyNotifications(input: {
  sellerProfileId: string;
}): Promise<SellerJourneyNotification[]> {
  if (!isSellerJourneyEnabled()) return [];

  const [dashboard, signals] = await Promise.all([
    getSellerJourneyDashboard(input.sellerProfileId),
    loadSellerProgressSignals(input.sellerProfileId),
  ]);

  const notifications: SellerJourneyNotification[] = [];
  const now = new Date().toISOString();

  if (dashboard.nextAction) {
    notifications.push({
      id: `journey-next-${dashboard.step}`,
      type: "SELLER_NEXT_STEP",
      title: "Ваш следующий шаг",
      body: dashboard.coach.headline,
      href: dashboard.coach.ctaHref,
      createdAt: now,
      read: false,
    });
  }

  notifications.push({
    id: `journey-progress-${dashboard.progressCurrent}`,
    type: "SELLER_PROGRESS",
    title: `Ваш путь: ${dashboard.progressCurrent} из ${dashboard.progressTotal}`,
    body: dashboard.coach.why,
    href: ROUTES.ACCOUNT_GROWTH,
    createdAt: now,
    read: false,
  });

  const milestone = latestAchievedMilestone(dashboard.milestones);
  if (milestone?.achievedAt) {
    notifications.push({
      id: `journey-milestone-${milestone.type}`,
      type: "SELLER_MILESTONE",
      title: `${milestone.emoji} ${milestone.label}`,
      body: "Отличная работа — продолжайте путь продавца",
      href: ROUTES.ACCOUNT_GROWTH,
      createdAt: milestone.achievedAt,
      read: false,
    });
  }

  if (dashboard.step === "FIRST_ORDER" || signals.ordersCount === 1) {
    notifications.push({
      id: "journey-first-order",
      type: "SELLER_FIRST_ORDER",
      title: "Поздравляем!",
      body: "Вы получили первую продажу.",
      href: ROUTES.ACCOUNT_SALES,
      createdAt: now,
      read: false,
    });
  }

  if (
    dashboard.step === "FIRST_PAYOUT" ||
    signals.completedPayouts > 0 ||
    signals.paidAmount > 0
  ) {
    notifications.push({
      id: "journey-first-payout",
      type: "SELLER_FIRST_PAYOUT",
      title: "Первая выплата",
      body: "Вы прошли путь до первой выплаты.",
      href: ROUTES.ACCOUNT_PAYOUTS,
      createdAt: now,
      read: false,
    });
  }

  return notifications.slice(0, 6);
}
