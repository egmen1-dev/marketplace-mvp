import { prisma } from "@/lib/prisma";

import type { InventoryHistoryRow } from "./types";

const PAGE_SIZE = 30;

export async function listInventoryHistory(input: {
  sellerProfileId: string;
  productId?: string | null;
  cursor?: string | null;
  pageSize?: number;
}): Promise<{ items: InventoryHistoryRow[]; nextCursor: string | null; hasMore: boolean }> {
  const page = parsePageCursor(input.cursor);
  const pageSize = input.pageSize ?? PAGE_SIZE;

  const where = {
    product: {
      sellerId: input.sellerProfileId,
      ...(input.productId ? { id: input.productId } : {}),
    },
  };

  const [total, rows] = await Promise.all([
    prisma.inventoryHistory.count({ where }),
    prisma.inventoryHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        productId: true,
        delta: true,
        quantityAfter: true,
        note: true,
        createdAt: true,
        actorUserId: true,
        product: { select: { name: true } },
      },
    }),
  ]);

  const items = rows.map((row) => ({
    id: row.id,
    productId: row.productId,
    productName: row.product.name,
    delta: row.delta,
    quantityAfter: row.quantityAfter,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    actorUserId: row.actorUserId,
  }));

  const hasMore = page * pageSize < total;
  return {
    items,
    nextCursor: hasMore ? `page:${page + 1}` : null,
    hasMore,
  };
}

export async function listInventoryAdjustments(
  sellerProfileId: string,
  limit = 30,
): Promise<InventoryHistoryRow[]> {
  const rows = await prisma.inventoryHistory.findMany({
    where: {
      product: { sellerId: sellerProfileId },
      OR: [
        { note: { contains: "Корректировка" } },
        { actorUserId: { not: null } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      productId: true,
      delta: true,
      quantityAfter: true,
      note: true,
      createdAt: true,
      actorUserId: true,
      product: { select: { name: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    productId: row.productId,
    productName: row.product.name,
    delta: row.delta,
    quantityAfter: row.quantityAfter,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    actorUserId: row.actorUserId,
  }));
}

function parsePageCursor(cursor?: string | null): number {
  if (!cursor) return 1;
  const match = cursor.match(/^page:(\d+)$/);
  return match ? Number(match[1]) : 1;
}
