import { Prisma, ProductStatus } from "@prisma/client";

import {
  LOW_STOCK_THRESHOLD,
  getInventoryAvailability,
} from "@/features/orders/lib/inventory-sync";
import { prisma } from "@/lib/prisma";

import type { InventoryStockFilter, InventoryStockPage, InventoryStockRow, InventoryStockSort } from "./types";

const PAGE_SIZE = 20;

function mapRow(input: {
  id: string;
  name: string;
  sku: string | null;
  status: ProductStatus;
  stock: number;
  updatedAt: Date;
  images: Array<{ url: string }>;
  inventory: { quantity: number; reservedQuantity: number; updatedAt: Date } | null;
}): InventoryStockRow {
  const quantity = input.inventory?.quantity ?? input.stock ?? 0;
  return {
    productId: input.id,
    name: input.name,
    sku: input.sku,
    imageUrl: input.images[0]?.url ?? null,
    quantity,
    reservedQuantity: input.inventory?.reservedQuantity ?? 0,
    availability: getInventoryAvailability(quantity),
    status: input.status,
    lowStockThreshold: LOW_STOCK_THRESHOLD,
    updatedAt: (input.inventory?.updatedAt ?? input.updatedAt).toISOString(),
  };
}

function buildWhere(
  sellerProfileId: string,
  filter: InventoryStockFilter,
  query?: string | null,
): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {
    sellerId: sellerProfileId,
    status: { in: [ProductStatus.ACTIVE, ProductStatus.OUT_OF_STOCK] },
  };

  if (query?.trim()) {
    where.OR = [
      { name: { contains: query.trim(), mode: "insensitive" } },
      { sku: { contains: query.trim(), mode: "insensitive" } },
    ];
  }

  if (filter === "out") {
    where.AND = [
      {
        OR: [
          { stock: { lte: 0 } },
          { status: ProductStatus.OUT_OF_STOCK },
          { inventory: { is: { quantity: { lte: 0 } } } },
          { inventory: { is: null }, stock: { lte: 0 } },
        ],
      },
    ];
  } else if (filter === "low") {
    where.AND = [
      {
        OR: [
          { inventory: { is: { quantity: { gt: 0, lte: LOW_STOCK_THRESHOLD } } } },
          { inventory: { is: null }, stock: { gt: 0, lte: LOW_STOCK_THRESHOLD } },
        ],
      },
    ];
  } else if (filter === "in_stock") {
    where.AND = [
      {
        OR: [
          { inventory: { is: { quantity: { gt: LOW_STOCK_THRESHOLD } } } },
          { inventory: { is: null }, stock: { gt: LOW_STOCK_THRESHOLD } },
        ],
      },
    ];
  }

  return where;
}

function buildOrderBy(sort: InventoryStockSort): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "name_desc":
      return { name: "desc" };
    case "stock_asc":
      return { stock: "asc" };
    case "stock_desc":
      return { stock: "desc" };
    case "updated_desc":
      return { updatedAt: "desc" };
    case "name_asc":
    default:
      return { name: "asc" };
  }
}

export async function listSellerInventoryStock(input: {
  sellerProfileId: string;
  cursor?: string | null;
  query?: string | null;
  filter?: InventoryStockFilter;
  sort?: InventoryStockSort;
  pageSize?: number;
}): Promise<InventoryStockPage> {
  const page = parsePageCursor(input.cursor);
  const pageSize = input.pageSize ?? PAGE_SIZE;
  const filter = input.filter ?? "all";
  const sort = input.sort ?? "updated_desc";
  const where = buildWhere(input.sellerProfileId, filter, input.query);

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: buildOrderBy(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        sku: true,
        status: true,
        stock: true,
        updatedAt: true,
        images: { take: 1, select: { url: true }, orderBy: { sortOrder: "asc" } },
        inventory: { select: { quantity: true, reservedQuantity: true, updatedAt: true } },
      },
    }),
  ]);

  const items = products.map(mapRow);
  const hasMore = page * pageSize < total;

  return {
    items,
    nextCursor: hasMore ? `page:${page + 1}` : null,
    hasMore,
    total,
  };
}

export async function listAllSellerStockRows(
  sellerProfileId: string,
  filter: InventoryStockFilter,
  limit = 50,
): Promise<InventoryStockRow[]> {
  const page = await listSellerInventoryStock({
    sellerProfileId,
    filter,
    pageSize: limit,
  });
  return page.items;
}

export async function getSellerInventoryProductDetail(
  sellerProfileId: string,
  productId: string,
): Promise<InventoryStockRow | null> {
  const product = await prisma.product.findFirst({
    where: { id: productId, sellerId: sellerProfileId },
    select: {
      id: true,
      name: true,
      sku: true,
      status: true,
      stock: true,
      updatedAt: true,
      images: { take: 1, select: { url: true }, orderBy: { sortOrder: "asc" } },
      inventory: { select: { quantity: true, reservedQuantity: true, updatedAt: true } },
    },
  });
  if (!product) return null;
  return mapRow(product);
}

function parsePageCursor(cursor?: string | null): number {
  if (!cursor) return 1;
  const match = cursor.match(/^page:(\d+)$/);
  return match ? Number(match[1]) : 1;
}
