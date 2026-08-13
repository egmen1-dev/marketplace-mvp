import {
  ModerationItemType,
  ModerationStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { analyzeProductContent } from "../content-quality/product-quality";
import { analyzeProductPhotos } from "../content-quality/photo-analysis";
import { detectProhibitedProduct } from "../risk/prohibited-products";
import type { ModerationIssue } from "../reviews/types";
import {
  trackModerationItemCreated,
  trackPhotoQualityIssueFound,
  trackProductQualityIssueFound,
} from "../analytics";

export async function runProductModerationChecks(productId: string): Promise<{
  qualityScore: number;
  issues: ModerationIssue[];
  prohibitedHit: boolean;
  prohibitedLabel?: string;
  photoIssueCount: number;
  contentIssueCount: number;
}> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      _count: { select: { characteristicValues: true } },
    },
  });
  if (!product) {
    return {
      qualityScore: 0,
      issues: [],
      prohibitedHit: false,
      photoIssueCount: 0,
      contentIssueCount: 0,
    };
  }

  const prohibited = detectProhibitedProduct({
    name: product.name,
    description: product.description,
  });

  const photo = analyzeProductPhotos({
    imageCount: product.images.length,
    hasPrimary: product.images.some((i) => i.isPrimary) || product.images.length > 0,
  });

  const content = await analyzeProductContent({
    productId,
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    characteristicCount: product._count.characteristicValues,
  });

  const issues = [...photo.issues, ...content.issues];
  if (prohibited.hit) {
    issues.unshift({
      id: "prohibited",
      severity: "error",
      message: `Запрещённая категория: ${prohibited.label}`,
      recommendation: "Удалите запрещённый контент",
    });
  }

  const qualityScore = Math.round((photo.score + content.score) / 2);

  return {
    qualityScore,
    issues,
    prohibitedHit: prohibited.hit,
    prohibitedLabel: prohibited.label,
    photoIssueCount: photo.issues.length,
    contentIssueCount: content.issues.length,
  };
}

export async function submitProductForModeration(productId: string): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { sellerId: true, name: true },
  });
  if (!product) return;

  const checks = await runProductModerationChecks(productId);
  const status = checks.prohibitedHit
    ? ModerationStatus.REJECTED
    : checks.qualityScore >= 70 && checks.issues.every((i) => i.severity !== "error")
      ? ModerationStatus.PENDING_REVIEW
      : ModerationStatus.NEEDS_FIX;

  await prisma.productModeration.upsert({
    where: { productId },
    create: {
      productId,
      status,
      qualityScore: checks.qualityScore,
      issues: checks.issues,
      prohibitedHit: checks.prohibitedHit,
    },
    update: {
      status,
      qualityScore: checks.qualityScore,
      issues: checks.issues,
      prohibitedHit: checks.prohibitedHit,
    },
  });

  await prisma.moderationQueueItem.create({
    data: {
      type: ModerationItemType.PRODUCT,
      entityId: productId,
      sellerId: product.sellerId,
      status,
      riskLevel: checks.prohibitedHit ? "high" : checks.qualityScore < 60 ? "medium" : "low",
      summary: `${product.name} · ${checks.qualityScore}/100`,
    },
  });

  trackModerationItemCreated(productId);
  if (checks.photoIssueCount > 0) trackPhotoQualityIssueFound(productId);
  if (checks.contentIssueCount > 0) trackProductQualityIssueFound(productId);
}

export async function isProductModerationApproved(
  productId: string,
): Promise<boolean> {
  const mod = await prisma.productModeration.findUnique({ where: { productId } });
  return mod?.status === ModerationStatus.APPROVED;
}

export class ProductModerationPendingError extends Error {
  constructor(message = "Товар ожидает модерации") {
    super(message);
    this.name = "ProductModerationPendingError";
  }
}

export async function assertProductModerationApproved(
  productId: string,
): Promise<void> {
  const mod = await prisma.productModeration.findUnique({ where: { productId } });
  if (!mod || mod.status !== ModerationStatus.APPROVED) {
    throw new ProductModerationPendingError(
      mod?.status === ModerationStatus.NEEDS_FIX
        ? "Исправьте карточку перед публикацией"
        : "Товар проверяется модерацией",
    );
  }
}
