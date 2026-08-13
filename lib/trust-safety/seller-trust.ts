import { OrderStatus } from "@prisma/client";

import {
  getSellerReputationMetrics,
  type SellerTrustProfile,
} from "@/features/seller/lib/reputation";
import { prisma } from "@/lib/prisma";
import { loadSellerHealthSnapshot } from "@/lib/seller-growth/seller-health";

import {
  clampTrustScore,
  formatAccountTenure,
  formatCompletionRate,
  trustLevelLabel,
} from "./trust-score";
import type { SellerTrustScore } from "./types";

const COMPLETED_STATUSES: OrderStatus[] = [
  OrderStatus.COMPLETED,
  OrderStatus.DELIVERED,
  OrderStatus.PICKED_UP,
];

const DISPUTE_STATUSES: OrderStatus[] = [
  OrderStatus.RETURN_REQUESTED,
  OrderStatus.RETURN_APPROVED,
  OrderStatus.RETURNED,
  OrderStatus.REFUNDED,
];

export type SellerTrustInput = {
  joinedAt: Date | string;
  isVerified: boolean;
  completedOrders: number;
  successfulDeliveries: number;
  totalOrders: number;
  cancelledOrders: number;
  disputeCount: number;
  avgProductQuality: number;
  responseActivityScore: number;
};

export async function loadSellerTrustInput(
  sellerProfileId: string,
): Promise<SellerTrustInput> {
  const [metrics, orderStats, disputeCount, health, messageCount] =
    await Promise.all([
      getSellerReputationMetrics(sellerProfileId),
      prisma.order.groupBy({
        by: ["status"],
        where: {
          items: { some: { product: { sellerId: sellerProfileId } } },
          status: {
            in: [
              ...COMPLETED_STATUSES,
              OrderStatus.CANCELLED,
              OrderStatus.REJECTED,
              OrderStatus.PAID,
              OrderStatus.CONFIRMED,
              OrderStatus.PROCESSING,
              OrderStatus.SHIPPED,
              OrderStatus.IN_TRANSIT,
              OrderStatus.DELIVERED,
            ],
          },
        },
        _count: { _all: true },
      }),
      prisma.order.count({
        where: {
          items: { some: { product: { sellerId: sellerProfileId } } },
          status: { in: DISPUTE_STATUSES },
        },
      }),
      loadSellerHealthSnapshot(sellerProfileId).catch(() => null),
      prisma.sellerProfile
        .findUnique({
          where: { id: sellerProfileId },
          select: { userId: true },
        })
        .then((profile) =>
          profile
            ? prisma.message.count({
                where: {
                  conversation: { sellerId: sellerProfileId },
                  senderId: profile.userId,
                  createdAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                  },
                },
              })
            : 0,
        ),
    ]);

  const statusMap = new Map(
    orderStats.map((row) => [row.status, row._count._all]),
  );
  const completedOrders = metrics.completedOrdersCount;
  const cancelledOrders =
    (statusMap.get(OrderStatus.CANCELLED) ?? 0) +
    (statusMap.get(OrderStatus.REJECTED) ?? 0);
  const totalOrders =
    completedOrders +
    cancelledOrders +
    (statusMap.get(OrderStatus.PAID) ?? 0) +
    (statusMap.get(OrderStatus.CONFIRMED) ?? 0) +
    (statusMap.get(OrderStatus.PROCESSING) ?? 0) +
    (statusMap.get(OrderStatus.SHIPPED) ?? 0) +
    (statusMap.get(OrderStatus.IN_TRANSIT) ?? 0);

  const avgProductQuality =
    health && health.products.length > 0
      ? health.products.reduce((sum, p) => sum + p.qualityScore, 0) /
        health.products.length
      : 50;

  const responseActivityScore =
    messageCount >= 10 ? 1 : messageCount >= 3 ? 0.7 : messageCount >= 1 ? 0.4 : 0.2;

  return {
    joinedAt: metrics.joinedAt,
    isVerified: health?.isVerified ?? false,
    completedOrders,
    successfulDeliveries: completedOrders,
    totalOrders: Math.max(totalOrders, completedOrders),
    cancelledOrders,
    disputeCount,
    avgProductQuality,
    responseActivityScore,
  };
}

/** Advisory seller trust score — does NOT affect search ranking. */
export function computeSellerTrustScore(input: SellerTrustInput): SellerTrustScore {
  const accountAgeDays = Math.floor(
    (Date.now() - new Date(input.joinedAt).getTime()) / (1000 * 60 * 60 * 24),
  );

  const accountAgeScore = Math.min(12, (accountAgeDays / 365) * 12);
  const completedScore = Math.min(15, (input.completedOrders / 20) * 15);
  const deliveryScore = Math.min(15, (input.successfulDeliveries / 20) * 15);

  const cancelRate =
    input.totalOrders > 0 ? input.cancelledOrders / input.totalOrders : 0;
  const cancellationScore = Math.max(0, 12 - cancelRate * 24);

  const responseScore = input.responseActivityScore * 8;
  const completenessScore = (input.avgProductQuality / 100) * 15;

  const disputePenalty = Math.min(13, input.disputeCount * 4);
  const disputeScore = Math.max(0, 13 - disputePenalty);

  const financeScore =
    (input.isVerified ? 5 : 0) +
    Math.min(5, (input.completedOrders / 10) * 5);

  const raw =
    accountAgeScore +
    completedScore +
    deliveryScore +
    cancellationScore +
    responseScore +
    completenessScore +
    disputeScore +
    financeScore;

  const score = clampTrustScore(raw);
  const levelLabel = trustLevelLabel(score);

  const factors = [
    {
      key: "account_age",
      label: "Возраст аккаунта",
      value: formatAccountTenure(input.joinedAt),
      contribution: Math.round(accountAgeScore),
    },
    {
      key: "completed_orders",
      label: "Завершённые заказы",
      value: String(input.completedOrders),
      contribution: Math.round(completedScore),
    },
    {
      key: "deliveries",
      label: "Успешные доставки",
      value: String(input.successfulDeliveries),
      contribution: Math.round(deliveryScore),
    },
    {
      key: "cancellation",
      label: "Отмены",
      value:
        input.totalOrders > 0
          ? `${Math.round(cancelRate * 100)}%`
          : "Нет данных",
      contribution: Math.round(cancellationScore),
    },
    {
      key: "response",
      label: "Активность ответов",
      value:
        input.responseActivityScore >= 0.7
          ? "Отвечает покупателям"
          : "Мало переписки",
      contribution: Math.round(responseScore),
    },
    {
      key: "completeness",
      label: "Качество карточек",
      value: `${Math.round(input.avgProductQuality)}/100`,
      contribution: Math.round(completenessScore),
    },
    {
      key: "disputes",
      label: "Споры",
      value: input.disputeCount > 0 ? String(input.disputeCount) : "Нет",
      contribution: Math.round(disputeScore),
    },
    {
      key: "finance",
      label: "Финансовая история",
      value: input.isVerified ? "Проверенный продавец" : "Базовый профиль",
      contribution: Math.round(financeScore),
    },
  ];

  const highlights: string[] = [];
  if (input.isVerified) highlights.push("Проверенный продавец");
  if (input.completedOrders > 0) {
    highlights.push(formatCompletionRate(input.completedOrders, input.totalOrders));
  }
  highlights.push(formatAccountTenure(input.joinedAt));

  return { score, levelLabel, factors, highlights };
}

export async function getSellerTrustScoreForProfile(
  sellerProfileId: string,
): Promise<SellerTrustScore> {
  const input = await loadSellerTrustInput(sellerProfileId);
  return computeSellerTrustScore(input);
}

export function sellerTrustFromProfile(
  profile: SellerTrustProfile,
  score: SellerTrustScore,
): {
  joinedLabel: string;
  completionLabel: string | null;
  scoreLabel: string;
} {
  return {
    joinedLabel: formatAccountTenure(profile.joinedAt),
    completionLabel:
      profile.metrics.completedOrdersCount > 0
        ? formatCompletionRate(
            profile.metrics.completedOrdersCount,
            Math.max(
              profile.metrics.completedOrdersCount,
              profile.metrics.salesCount,
            ),
          )
        : null,
    scoreLabel: `${score.score}/100 — ${score.levelLabel}`,
  };
}
