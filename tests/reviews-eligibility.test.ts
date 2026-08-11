import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { ReviewError, assertCanReview } from "@/features/reviews/eligibility";
import {
  createReview,
  editReview,
  removeReviewByBuyer,
  sellerReplyToReview,
} from "@/features/reviews/queries";

const stamp = Date.now();
const ids: {
  sellerUserId?: string;
  otherSellerUserId?: string;
  buyerAId?: string;
  buyerBId?: string;
  sellerProfileId?: string;
  otherSellerProfileId?: string;
  productId?: string;
  orderDeliveredId?: string;
  orderItemDeliveredId?: string;
  orderNewId?: string;
  orderItemNewId?: string;
  selfOrderId?: string;
  selfOrderItemId?: string;
} = {};

async function makeOrder(
  userId: string,
  productId: string,
  status: "DELIVERED" | "NEW",
  suffix: string,
) {
  const order = await prisma.order.create({
    data: {
      userId,
      orderNumber: `RVW-${stamp}-${suffix}`,
      status,
      subtotal: 1000,
      total: 1000,
      items: {
        create: {
          productId,
          productName: "Тестовый товар",
          unitPrice: 1000,
          quantity: 1,
          totalPrice: 1000,
        },
      },
    },
    include: { items: true },
  });
  return { orderId: order.id, orderItemId: order.items[0].id };
}

beforeAll(async () => {
  const sellerUser = await prisma.user.create({
    data: { email: `rvw-seller-${stamp}@e2e.lot`, name: "Продавец", role: "SELLER" },
  });
  const otherSellerUser = await prisma.user.create({
    data: { email: `rvw-seller2-${stamp}@e2e.lot`, name: "Другой", role: "SELLER" },
  });
  const buyerA = await prisma.user.create({
    data: { email: `rvw-buyerA-${stamp}@e2e.lot`, name: "Анна", role: "BUYER" },
  });
  const buyerB = await prisma.user.create({
    data: { email: `rvw-buyerB-${stamp}@e2e.lot`, name: "Борис", role: "BUYER" },
  });
  const sellerProfile = await prisma.sellerProfile.create({
    data: { userId: sellerUser.id, storeName: "RVW Store", slug: `rvw-store-${stamp}` },
  });
  const otherSellerProfile = await prisma.sellerProfile.create({
    data: { userId: otherSellerUser.id, storeName: "RVW Store 2", slug: `rvw-store2-${stamp}` },
  });
  const product = await prisma.product.create({
    data: {
      sellerId: sellerProfile.id,
      name: "Отзыв тест товар",
      slug: `rvw-product-${stamp}`,
      price: 1000,
      status: "ACTIVE",
    },
  });

  const delivered = await makeOrder(buyerA.id, product.id, "DELIVERED", "d");
  const fresh = await makeOrder(buyerA.id, product.id, "NEW", "n");
  const self = await makeOrder(sellerUser.id, product.id, "DELIVERED", "s");

  Object.assign(ids, {
    sellerUserId: sellerUser.id,
    otherSellerUserId: otherSellerUser.id,
    buyerAId: buyerA.id,
    buyerBId: buyerB.id,
    sellerProfileId: sellerProfile.id,
    otherSellerProfileId: otherSellerProfile.id,
    productId: product.id,
    orderDeliveredId: delivered.orderId,
    orderItemDeliveredId: delivered.orderItemId,
    orderNewId: fresh.orderId,
    orderItemNewId: fresh.orderItemId,
    selfOrderId: self.orderId,
    selfOrderItemId: self.orderItemId,
  });
});

afterAll(async () => {
  await prisma.review.deleteMany({ where: { productId: ids.productId } });
  await prisma.productReviewStats.deleteMany({ where: { productId: ids.productId } });
  await prisma.sellerReviewStats.deleteMany({
    where: { sellerId: { in: [ids.sellerProfileId!, ids.otherSellerProfileId!] } },
  });
  await prisma.order.deleteMany({
    where: { id: { in: [ids.orderDeliveredId!, ids.orderNewId!, ids.selfOrderId!] } },
  });
  await prisma.product.deleteMany({ where: { id: ids.productId } });
  await prisma.sellerProfile.deleteMany({
    where: { id: { in: [ids.sellerProfileId!, ids.otherSellerProfileId!] } },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [ids.sellerUserId!, ids.otherSellerUserId!, ids.buyerAId!, ids.buyerBId!],
      },
    },
  });
});

describe("review eligibility & security (section 36)", () => {
  it("buyer can review a delivered purchase", async () => {
    const ctx = await assertCanReview(prisma, {
      buyerId: ids.buyerAId!,
      orderItemId: ids.orderItemDeliveredId!,
    });
    expect(ctx.productId).toBe(ids.productId);
    expect(ctx.sellerId).toBe(ids.sellerProfileId);
  });

  it("guest / foreign buyer cannot review another buyer's purchase (IDOR)", async () => {
    await expect(
      assertCanReview(prisma, {
        buyerId: ids.buyerBId!,
        orderItemId: ids.orderItemDeliveredId!,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<ReviewError>);
  });

  it("cannot review a non-completed order", async () => {
    await expect(
      assertCanReview(prisma, {
        buyerId: ids.buyerAId!,
        orderItemId: ids.orderItemNewId!,
      }),
    ).rejects.toMatchObject({ code: "NOT_COMPLETED" });
  });

  it("seller cannot review their own product", async () => {
    await expect(
      assertCanReview(prisma, {
        buyerId: ids.sellerUserId!,
        orderItemId: ids.selfOrderItemId!,
      }),
    ).rejects.toMatchObject({ code: "SELF_REVIEW" });
  });

  it("create → aggregates update; duplicate is blocked", async () => {
    const created = await createReview(ids.buyerAId!, {
      orderItemId: ids.orderItemDeliveredId!,
      rating: 5,
      title: "Отлично",
      text: "Отличный товар, всё соответствует описанию.",
      recommended: true,
    });
    expect(created.productId).toBe(ids.productId);

    const pStats = await prisma.productReviewStats.findUnique({
      where: { productId: ids.productId },
    });
    expect(pStats?.ratingCount).toBe(1);
    expect(Number(pStats?.avgRating)).toBe(5);
    expect(pStats?.rating5Count).toBe(1);

    const sStats = await prisma.sellerReviewStats.findUnique({
      where: { sellerId: ids.sellerProfileId },
    });
    expect(sStats?.reviewCount).toBe(1);
    expect(Number(sStats?.avgProductRating)).toBe(5);

    await expect(
      createReview(ids.buyerAId!, {
        orderItemId: ids.orderItemDeliveredId!,
        rating: 4,
        title: null,
        text: null,
        recommended: null,
      }),
    ).rejects.toMatchObject({ code: "ALREADY_REVIEWED" });
  });

  it("edit updates aggregates; buyer soft-delete removes from aggregate", async () => {
    const review = await prisma.review.findFirstOrThrow({
      where: { orderItemId: ids.orderItemDeliveredId! },
    });
    await editReview(ids.buyerAId!, {
      reviewId: review.id,
      rating: 3,
      title: "Норм",
      text: "Средне, но работает.",
      recommended: false,
    });
    let pStats = await prisma.productReviewStats.findUnique({
      where: { productId: ids.productId },
    });
    expect(Number(pStats?.avgRating)).toBe(3);

    await removeReviewByBuyer(ids.buyerAId!, review.id);
    pStats = await prisma.productReviewStats.findUnique({
      where: { productId: ids.productId },
    });
    expect(pStats?.ratingCount).toBe(0);
  });

  it("only the product's seller can reply (foreign seller blocked)", async () => {
    // Re-create a review to reply to.
    await prisma.review.deleteMany({ where: { orderItemId: ids.orderItemDeliveredId! } });
    const created = await createReview(ids.buyerAId!, {
      orderItemId: ids.orderItemDeliveredId!,
      rating: 5,
      title: null,
      text: "Хороший товар",
      recommended: null,
    });

    await expect(
      sellerReplyToReview(ids.otherSellerUserId!, {
        reviewId: created.id,
        text: "Чужой ответ",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await sellerReplyToReview(ids.sellerUserId!, {
      reviewId: created.id,
      text: "Спасибо за покупку!",
    });
    const replied = await prisma.review.findUniqueOrThrow({ where: { id: created.id } });
    expect(replied.sellerReply).toBe("Спасибо за покупку!");
  });
});
