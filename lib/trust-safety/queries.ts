import { OrderStatus, ProductStatus } from "@prisma/client";

import {
  formatSellerJoinedDate,
  getSellerTrustProfile,
  type SellerTrustProfile,
} from "@/features/seller/lib/reputation";
import type { ProductDetail } from "@/features/products/types";
import { ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { loadSellerHealthSnapshot } from "@/lib/seller-growth/seller-health";

import { isTrustSafetyEnabled } from "./flags";
import {
  computeProductTrustScore,
  type ProductTrustInput,
} from "./product-trust";
import {
  buildSellerTrustImprovements,
  trustCoachSummary,
} from "./recommendations";
import {
  detectProductRiskSignals,
  detectSellerRiskSignals,
} from "./risk-signals";
import {
  computeSellerTrustScore,
  getSellerTrustScoreForProfile,
  loadSellerTrustInput,
  sellerTrustFromProfile,
} from "./seller-trust";
import {
  getProtectionBullets,
  getTransactionProtectionFlow,
} from "./transaction-protection";
import type {
  AdminTrustCenterDashboard,
  PdpTrustExperience,
  SellerTrustCoach,
  TrustNotification,
} from "./types";

export async function getSellerTrustCoach(
  sellerProfileId: string,
): Promise<SellerTrustCoach | null> {
  if (!isTrustSafetyEnabled()) return null;

  const [trustInput, health] = await Promise.all([
    loadSellerTrustInput(sellerProfileId),
    loadSellerHealthSnapshot(sellerProfileId).catch(() => null),
  ]);

  const trustScore = computeSellerTrustScore(trustInput);
  const riskSignals = detectSellerRiskSignals(trustInput);
  const weakProduct = health?.products
    .slice()
    .sort((a, b) => a.qualityScore - b.qualityScore)[0];

  const improvements = buildSellerTrustImprovements({
    trustInput,
    trustScore,
    riskSignals,
    weakProductId: weakProduct?.id ?? null,
  });

  return {
    enabled: true,
    score: trustScore.score,
    levelLabel: trustScore.levelLabel,
    summary: trustCoachSummary(trustScore),
    improvements,
    riskSignals,
  };
}

export async function getPdpTrustExperience(input: {
  product: ProductDetail;
  seller: SellerTrustProfile;
}): Promise<PdpTrustExperience | null> {
  if (!isTrustSafetyEnabled()) return null;

  const sellerInput = await loadSellerTrustInput(input.seller.id);
  const sellerScore = computeSellerTrustScore(sellerInput);
  const sellerMeta = sellerTrustFromProfile(input.seller, sellerScore);

  const requiredCount = input.product.characteristics.filter((c) =>
    Boolean(c.displayValue?.trim()),
  ).length;

  const productInput: ProductTrustInput = {
    imageCount: input.product.images.length,
    title: input.product.title,
    description: input.product.description,
    characteristicCount: input.product.characteristics.length,
    requiredCharacteristicCount: input.product.characteristics.length,
    filledRequiredCharacteristicCount: requiredCount,
    hasCategory: Boolean(input.product.category),
    hasProductType: Boolean(input.product.productType),
    stock: input.product.stock,
    sellerVerified: input.seller.isVerified,
    sellerBlocked: false,
    sellerCompletedOrders: input.seller.metrics.completedOrdersCount,
    sellerTrustScore: sellerScore.score,
    price: input.product.price,
  };

  const productScore = computeProductTrustScore(productInput);
  const productRisks = detectProductRiskSignals({
    imageCount: input.product.images.length,
    price: input.product.price,
  });
  const sellerRisks = detectSellerRiskSignals(sellerInput);

  const sellerBullets = [
    `На площадке с ${formatSellerJoinedDate(input.seller.joinedAt).split(",")[0] ?? sellerMeta.joinedLabel}`,
    ...sellerScore.highlights.filter(
      (h) => !h.includes("На площадке") && !h.includes("мес"),
    ),
  ];
  if (sellerMeta.completionLabel) {
    sellerBullets.push(sellerMeta.completionLabel);
  }

  return {
    enabled: true,
    title: "Почему можно доверять покупке",
    sellerSection: {
      headline: "Продавец",
      bullets: sellerBullets.slice(0, 4),
      score: sellerScore.score,
    },
    productSection: {
      headline: "Товар",
      bullets: productScore.checklist
        .filter((c) => c.ok)
        .map((c) => c.label)
        .slice(0, 4),
      score: productScore.score,
    },
    protectionSection: getTransactionProtectionFlow(),
    riskSignals: [...productRisks, ...sellerRisks].slice(0, 3),
  };
}

export async function getAdminTrustCenterDashboard(): Promise<AdminTrustCenterDashboard> {
  if (!isTrustSafetyEnabled()) {
    return {
      enabled: false,
      marketplaceHealth: [],
      sellerRisks: [],
      productsWithoutTrust: [],
      disputeOverview: [],
    };
  }

  const [
    sellerCount,
    verifiedSellers,
    activeProducts,
    productsNoImages,
    disputeOrders,
    cancelledOrders,
    completedOrders,
  ] = await Promise.all([
    prisma.sellerProfile.count({ where: { isBlocked: false } }),
    prisma.sellerProfile.count({
      where: { isBlocked: false, isVerified: true },
    }),
    prisma.product.count({ where: { status: ProductStatus.ACTIVE } }),
    prisma.product.count({
      where: {
        status: ProductStatus.ACTIVE,
        images: { none: {} },
      },
    }),
    prisma.order.count({
      where: {
        status: {
          in: [
            OrderStatus.RETURN_REQUESTED,
            OrderStatus.RETURN_APPROVED,
            OrderStatus.RETURNED,
            OrderStatus.REFUNDED,
          ],
        },
      },
    }),
    prisma.order.count({ where: { status: OrderStatus.CANCELLED } }),
    prisma.order.count({
      where: {
        status: {
          in: [
            OrderStatus.COMPLETED,
            OrderStatus.DELIVERED,
            OrderStatus.PICKED_UP,
          ],
        },
      },
    }),
  ]);

  const verificationRate =
    sellerCount > 0 ? Math.round((verifiedSellers / sellerCount) * 100) : 0;

  const weakProducts = await prisma.product.findMany({
    where: {
      status: ProductStatus.ACTIVE,
      OR: [{ images: { none: {} } }, { description: null }, { description: "" }],
    },
    select: { id: true, name: true },
    take: 8,
    orderBy: { updatedAt: "desc" },
  });

  const newSellers = await prisma.sellerProfile.findMany({
    where: {
      isBlocked: false,
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    select: { id: true, storeName: true },
    take: 6,
  });

  return {
    enabled: true,
    marketplaceHealth: [
      {
        id: "health-sellers",
        title: "Продавцы на площадке",
        body: `${sellerCount} активных, ${verificationRate}% проверены`,
        badge: verificationRate >= 50 ? "OK" : "WATCH",
      },
      {
        id: "health-products",
        title: "Активные товары",
        body: `${activeProducts} карточек, ${productsNoImages} без фото`,
        badge: productsNoImages === 0 ? "OK" : "ATTENTION",
      },
      {
        id: "health-orders",
        title: "Завершённые сделки",
        body: `${completedOrders} завершено · ${cancelledOrders} отмен`,
      },
    ],
    sellerRisks: newSellers.map((seller) => ({
      id: `risk-seller-${seller.id}`,
      title: seller.storeName,
      body: "Новый продавец — рекомендуйте завершить первые продажи",
      badge: "NEW",
    })),
    productsWithoutTrust: weakProducts.map((product) => ({
      id: `weak-product-${product.id}`,
      title: product.name,
      body: "Слабая карточка — нет фото или описания",
      href: `${ROUTES.ADMIN_PRODUCTS}/${product.id}`,
    })),
    disputeOverview: [
      {
        id: "disputes-open",
        title: "Споры и возвраты",
        body:
          disputeOrders > 0
            ? `${disputeOrders} заказов в статусах возврата/возмещения`
            : "Активных споров нет",
      },
      {
        id: "disputes-policy",
        title: "Рекомендация",
        body: "Проверяйте новых продавцов и слабые карточки — без автоблокировок",
      },
    ],
  };
}

export async function getTrustNotifications(input: {
  sellerProfileId?: string | null;
}): Promise<TrustNotification[]> {
  if (!isTrustSafetyEnabled() || !input.sellerProfileId) return [];

  const coach = await getSellerTrustCoach(input.sellerProfileId);
  if (!coach) return [];

  const now = new Date().toISOString();
  const notifications: TrustNotification[] = [];

  for (const risk of coach.riskSignals.slice(0, 2)) {
    notifications.push({
      id: `trust-warning-${risk.type.toLowerCase()}`,
      type: "TRUST_WARNING",
      title: "Внимание к доверию",
      body: risk.message,
      href: ROUTES.ACCOUNT_GROWTH,
      createdAt: now,
      read: false,
    });
  }

  for (const item of coach.improvements.slice(0, 2)) {
    notifications.push({
      id: `trust-improve-${item.id}`,
      type: "TRUST_IMPROVEMENT",
      title: item.action,
      body: item.why,
      href: item.href,
      createdAt: now,
      read: false,
    });
  }

  notifications.push({
    id: "trust-protection-info",
    type: "TRANSACTION_PROTECTION",
    title: "Как защищена сделка",
    body: getProtectionBullets()[0] ?? "Деньги удерживаются до подтверждения",
    href: ROUTES.ACCOUNT_BALANCE,
    createdAt: now,
    read: false,
  });

  return notifications.slice(0, 6);
}

export async function getSellerTrustScoreSummary(
  sellerProfileId: string,
): Promise<{ score: number; levelLabel: string } | null> {
  if (!isTrustSafetyEnabled()) return null;
  const score = await getSellerTrustScoreForProfile(sellerProfileId);
  return { score: score.score, levelLabel: score.levelLabel };
}

export async function getSellerTrustScoreBySlug(
  slug: string,
): Promise<{ score: number; levelLabel: string } | null> {
  if (!isTrustSafetyEnabled()) return null;
  const profile = await getSellerTrustProfile(slug);
  if (!profile) return null;
  const score = await getSellerTrustScoreForProfile(profile.id);
  return { score: score.score, levelLabel: score.levelLabel };
}
