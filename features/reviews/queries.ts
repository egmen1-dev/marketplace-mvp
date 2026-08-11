import "server-only";

import { ReviewStatus, type Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { refreshReviewAggregates } from "./aggregate";
import {
  assertCanReview,
  listReviewableOrderItems,
  REVIEW_EDIT_WINDOW_DAYS,
  ReviewError,
} from "./eligibility";
import type {
  CreateReviewInput,
  EditReviewInput,
  ReviewSort,
  SellerReplyInput,
} from "./schemas";

/** Safe public display name — never leak email / PII (section 8). */
function displayName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed && !trimmed.includes("@") ? trimmed : "Покупатель";
}

export type ReviewCardDto = {
  id: string;
  rating: number;
  title: string | null;
  text: string | null;
  recommended: boolean | null;
  authorName: string;
  createdAt: string;
  editedAt: string | null;
  verifiedPurchase: true;
  sellerReply: string | null;
  sellerRepliedAt: string | null;
};

export type ReviewSummary = {
  avgRating: number;
  ratingCount: number;
  distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
};

const reviewCardSelect = {
  id: true,
  rating: true,
  title: true,
  text: true,
  recommended: true,
  createdAt: true,
  editedAt: true,
  sellerReply: true,
  sellerRepliedAt: true,
  buyer: { select: { name: true } },
} satisfies Prisma.ReviewSelect;

function toCard(r: {
  id: string;
  rating: number;
  title: string | null;
  text: string | null;
  recommended: boolean | null;
  createdAt: Date;
  editedAt: Date | null;
  sellerReply: string | null;
  sellerRepliedAt: Date | null;
  buyer: { name: string | null };
}): ReviewCardDto {
  return {
    id: r.id,
    rating: r.rating,
    title: r.title,
    text: r.text,
    recommended: r.recommended,
    authorName: displayName(r.buyer.name),
    createdAt: r.createdAt.toISOString(),
    editedAt: r.editedAt?.toISOString() ?? null,
    verifiedPurchase: true,
    sellerReply: r.sellerReply,
    sellerRepliedAt: r.sellerRepliedAt?.toISOString() ?? null,
  };
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export async function createReview(
  buyerId: string,
  input: CreateReviewInput,
): Promise<{ id: string; productId: string }> {
  const ctx = await assertCanReview(prisma, {
    buyerId,
    orderItemId: input.orderItemId,
  });

  const review = await prisma.review.create({
    data: {
      productId: ctx.productId,
      buyerId,
      sellerId: ctx.sellerId,
      orderId: ctx.orderId,
      orderItemId: ctx.orderItemId,
      rating: input.rating,
      title: input.title ?? null,
      text: input.text ?? null,
      recommended: input.recommended ?? null,
      status: ReviewStatus.PUBLISHED,
    },
    select: { id: true, productId: true },
  });

  await refreshReviewAggregates(prisma, {
    productId: ctx.productId,
    sellerId: ctx.sellerId,
  });
  return review;
}

export async function editReview(
  buyerId: string,
  input: EditReviewInput,
): Promise<{ id: string; productId: string }> {
  const existing = await prisma.review.findUnique({
    where: { id: input.reviewId },
    select: {
      id: true,
      buyerId: true,
      productId: true,
      sellerId: true,
      status: true,
      createdAt: true,
    },
  });
  if (!existing) throw new ReviewError("NOT_FOUND", "Отзыв не найден", 404);
  if (existing.buyerId !== buyerId) {
    throw new ReviewError("FORBIDDEN", "Это не ваш отзыв", 403);
  }
  if (existing.status === ReviewStatus.REMOVED) {
    throw new ReviewError("FORBIDDEN", "Отзыв удалён", 403);
  }
  const ageDays =
    (Date.now() - existing.createdAt.getTime()) / 86_400_000;
  if (ageDays > REVIEW_EDIT_WINDOW_DAYS) {
    throw new ReviewError(
      "EDIT_WINDOW_CLOSED",
      `Редактирование доступно ${REVIEW_EDIT_WINDOW_DAYS} дней после публикации`,
      403,
    );
  }

  await prisma.review.update({
    where: { id: existing.id },
    data: {
      rating: input.rating,
      title: input.title ?? null,
      text: input.text ?? null,
      recommended: input.recommended ?? null,
      editedAt: new Date(),
    },
  });
  await refreshReviewAggregates(prisma, {
    productId: existing.productId,
    sellerId: existing.sellerId,
  });
  return { id: existing.id, productId: existing.productId };
}

/** Buyer soft-deletes their own review (no hard delete — section 12). */
export async function removeReviewByBuyer(
  buyerId: string,
  reviewId: string,
): Promise<void> {
  const existing = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, buyerId: true, productId: true, sellerId: true },
  });
  if (!existing) throw new ReviewError("NOT_FOUND", "Отзыв не найден", 404);
  if (existing.buyerId !== buyerId) {
    throw new ReviewError("FORBIDDEN", "Это не ваш отзыв", 403);
  }
  await prisma.review.update({
    where: { id: existing.id },
    data: { status: ReviewStatus.REMOVED },
  });
  await refreshReviewAggregates(prisma, {
    productId: existing.productId,
    sellerId: existing.sellerId,
  });
}

/** Seller replies to a review on their own product (authorization enforced). */
export async function sellerReplyToReview(
  sellerUserId: string,
  input: SellerReplyInput,
): Promise<void> {
  const review = await prisma.review.findUnique({
    where: { id: input.reviewId },
    select: {
      id: true,
      seller: { select: { userId: true } },
    },
  });
  if (!review) throw new ReviewError("NOT_FOUND", "Отзыв не найден", 404);
  if (review.seller.userId !== sellerUserId) {
    throw new ReviewError(
      "FORBIDDEN",
      "Можно отвечать только на отзывы о своих товарах",
      403,
    );
  }
  await prisma.review.update({
    where: { id: review.id },
    data: { sellerReply: input.text, sellerRepliedAt: new Date() },
  });
}

export type ModerationAction = "hide" | "restore" | "remove";

/** Admin moderation (cannot fake a buyer rating — only status changes). */
export async function moderateReview(
  adminUserId: string,
  reviewId: string,
  action: ModerationAction,
): Promise<void> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, productId: true, sellerId: true },
  });
  if (!review) throw new ReviewError("NOT_FOUND", "Отзыв не найден", 404);
  const status =
    action === "hide"
      ? ReviewStatus.HIDDEN
      : action === "remove"
        ? ReviewStatus.REMOVED
        : ReviewStatus.PUBLISHED;
  await prisma.review.update({
    where: { id: review.id },
    data: { status, moderatedAt: new Date(), moderatedById: adminUserId },
  });
  await refreshReviewAggregates(prisma, {
    productId: review.productId,
    sellerId: review.sellerId,
  });
}

// ─── Reads ───────────────────────────────────────────────────────────────────

export async function getProductReviewSummary(
  productId: string,
): Promise<ReviewSummary> {
  const stats = await prisma.productReviewStats.findUnique({
    where: { productId },
  });
  if (!stats) {
    return {
      avgRating: 0,
      ratingCount: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }
  return {
    avgRating: Number(stats.avgRating),
    ratingCount: stats.ratingCount,
    distribution: {
      1: stats.rating1Count,
      2: stats.rating2Count,
      3: stats.rating3Count,
      4: stats.rating4Count,
      5: stats.rating5Count,
    },
  };
}

function reviewOrderBy(sort: ReviewSort): Prisma.ReviewOrderByWithRelationInput[] {
  switch (sort) {
    case "highest":
      return [{ rating: "desc" }, { createdAt: "desc" }];
    case "lowest":
      return [{ rating: "asc" }, { createdAt: "desc" }];
    case "newest":
    default:
      return [{ createdAt: "desc" }];
  }
}

export async function listProductReviews(
  productId: string,
  opts?: { sort?: ReviewSort; page?: number; pageSize?: number },
): Promise<{ items: ReviewCardDto[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.min(Math.max(opts?.pageSize ?? 5, 1), 50);
  const where: Prisma.ReviewWhereInput = {
    productId,
    status: ReviewStatus.PUBLISHED,
  };
  const [rows, total] = await Promise.all([
    prisma.review.findMany({
      where,
      select: reviewCardSelect,
      orderBy: reviewOrderBy(opts?.sort ?? "newest"),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.review.count({ where }),
  ]);
  return { items: rows.map(toCard), total, page, pageSize };
}

export type BuyerReviewItem = ReviewCardDto & {
  productId: string;
  productName: string;
  productSlug: string | null;
  status: ReviewStatus;
  editable: boolean;
};

export async function listBuyerReviews(
  buyerId: string,
): Promise<BuyerReviewItem[]> {
  const rows = await prisma.review.findMany({
    where: { buyerId, status: { not: ReviewStatus.REMOVED } },
    select: {
      ...reviewCardSelect,
      status: true,
      productId: true,
      product: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    ...toCard(r),
    productId: r.productId,
    productName: r.product.name,
    productSlug: r.product.slug,
    status: r.status,
    editable:
      (Date.now() - r.createdAt.getTime()) / 86_400_000 <= REVIEW_EDIT_WINDOW_DAYS,
  }));
}

export async function listBuyerReviewables(buyerId: string) {
  return listReviewableOrderItems(prisma, buyerId);
}

export type SellerReviewItem = ReviewCardDto & {
  productId: string;
  productName: string;
  productSlug: string | null;
};

export async function listSellerReviews(
  sellerId: string,
): Promise<SellerReviewItem[]> {
  const rows = await prisma.review.findMany({
    where: { sellerId, status: ReviewStatus.PUBLISHED },
    select: {
      ...reviewCardSelect,
      productId: true,
      product: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map((r) => ({
    ...toCard(r),
    productId: r.productId,
    productName: r.product.name,
    productSlug: r.product.slug,
  }));
}

export async function getSellerReviewSummary(sellerId: string): Promise<{
  avgRating: number;
  reviewCount: number;
}> {
  const stats = await prisma.sellerReviewStats.findUnique({ where: { sellerId } });
  return {
    avgRating: stats ? Number(stats.avgProductRating) : 0,
    reviewCount: stats?.reviewCount ?? 0,
  };
}

export async function getReviewForEdit(buyerId: string, reviewId: string) {
  const r = await prisma.review.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      buyerId: true,
      rating: true,
      title: true,
      text: true,
      recommended: true,
      createdAt: true,
      product: { select: { name: true, slug: true } },
    },
  });
  if (!r || r.buyerId !== buyerId) return null;
  return r;
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export type AdminReviewFilters = {
  rating?: number;
  status?: ReviewStatus;
  sellerId?: string;
  productId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function adminListReviews(filters: AdminReviewFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 1), 100);
  const where: Prisma.ReviewWhereInput = {};
  if (filters.rating) where.rating = filters.rating;
  if (filters.status) where.status = filters.status;
  if (filters.sellerId) where.sellerId = filters.sellerId;
  if (filters.productId) where.productId = filters.productId;
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { text: { contains: filters.q, mode: "insensitive" } },
      { product: { name: { contains: filters.q, mode: "insensitive" } } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.review.findMany({
      where,
      select: {
        id: true,
        rating: true,
        title: true,
        text: true,
        status: true,
        createdAt: true,
        orderId: true,
        product: { select: { id: true, name: true, slug: true } },
        seller: { select: { id: true, storeName: true } },
        buyer: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.review.count({ where }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      text: r.text,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      orderId: r.orderId,
      product: r.product,
      sellerName: r.seller.storeName,
      authorName: displayName(r.buyer.name),
    })),
    total,
    page,
    pageSize,
  };
}

export async function adminReviewCounters() {
  const [total, hidden, avg] = await Promise.all([
    prisma.review.count(),
    prisma.review.count({ where: { status: ReviewStatus.HIDDEN } }),
    prisma.review.aggregate({
      where: { status: ReviewStatus.PUBLISHED },
      _avg: { rating: true },
    }),
  ]);
  return {
    total,
    hidden,
    avgMarketplaceRating: avg._avg.rating ? Number(avg._avg.rating) : 0,
  };
}
