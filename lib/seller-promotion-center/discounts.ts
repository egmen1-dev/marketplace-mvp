import { ProductStatus } from "@prisma/client";

import { toPriceNumber } from "@/features/products/mappers";
import { prisma } from "@/lib/prisma";

import type { PromotionDiscountRow } from "./types";

function discountPercent(price: number, compareAt: number | null): number | null {
  if (compareAt === null || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export async function listPromotionDiscounts(sellerProfileId: string): Promise<PromotionDiscountRow[]> {
  const products = await prisma.product.findMany({
    where: {
      sellerId: sellerProfileId,
      status: ProductStatus.ACTIVE,
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      price: true,
      compareAt: true,
      updatedAt: true,
    },
  });

  return products
    .map((product) => {
      const price = toPriceNumber(product.price);
      const compareAt = product.compareAt !== null ? toPriceNumber(product.compareAt) : null;
      return {
        productId: product.id,
        productName: product.name,
        price,
        compareAt,
        discountPercent: discountPercent(price, compareAt),
        updatedAt: product.updatedAt.toISOString(),
      };
    })
    .filter((row) => row.compareAt !== null);
}

export async function updatePromotionDiscount(input: {
  sellerProfileId: string;
  productId: string;
  compareAt: number | null;
}): Promise<PromotionDiscountRow | null> {
  const product = await prisma.product.findFirst({
    where: { id: input.productId, sellerId: input.sellerProfileId, status: ProductStatus.ACTIVE },
    select: { id: true, name: true, price: true, compareAt: true, updatedAt: true },
  });
  if (!product) return null;

  const price = toPriceNumber(product.price);
  if (input.compareAt !== null && input.compareAt <= price) {
    throw new Error("COMPARE_AT_MUST_EXCEED_PRICE");
  }

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: { compareAt: input.compareAt },
    select: { id: true, name: true, price: true, compareAt: true, updatedAt: true },
  });

  const nextCompareAt = updated.compareAt !== null ? toPriceNumber(updated.compareAt) : null;
  return {
    productId: updated.id,
    productName: updated.name,
    price: toPriceNumber(updated.price),
    compareAt: nextCompareAt,
    discountPercent: discountPercent(toPriceNumber(updated.price), nextCompareAt),
    updatedAt: updated.updatedAt.toISOString(),
  };
}
