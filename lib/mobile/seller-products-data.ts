import { ModerationStatus, ProductStatus, type Prisma } from "@prisma/client";

import { resolveRequestUser, isSellerCapable } from "@/features/auth/resolve-request-user";
import { mapProductListItem } from "@/features/products/mappers";
import { parseMobilePageCursor, toMobilePagination } from "@/lib/mobile/pagination";
import {
  parseSellerLotsTab,
  resolveSellerLotSection,
  sellerLotSectionLabel,
  type SellerLotsTab,
} from "@/lib/mobile/seller-lots-section";
import { buildSellerProductPublishContract } from "@/lib/mobile/seller-product-publish";
import { prisma } from "@/lib/prisma";

export type { SellerLotsTab } from "@/lib/mobile/seller-lots-section";

const listInclude = {
  category: { select: { id: true, name: true, slug: true } },
  images: {
    orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }],
    take: 1,
  },
  seller: { select: { id: true, storeName: true, slug: true } },
  productModeration: { select: { status: true } },
};

function mapSellerListItem(row: {
  productModeration?: { status: ModerationStatus } | null;
} & Parameters<typeof mapProductListItem>[0]) {
  const base = mapProductListItem(row);
  const moderationState = row.productModeration?.status ?? null;
  const section = resolveSellerLotSection({ status: base.status, moderationState });
  return {
    ...base,
    ...buildSellerProductPublishContract({
      id: base.id,
      status: base.status,
      moderationState,
    }),
    sellerSection: section,
    sellerSectionLabel: sellerLotSectionLabel(section),
  };
}

function titleSearchFilter(q: string | null | undefined): Prisma.ProductWhereInput | null {
  const trimmed = q?.trim();
  if (!trimmed) return null;
  return { name: { contains: trimmed, mode: "insensitive" } };
}

function whereForTab(tab: SellerLotsTab): Prisma.ProductWhereInput {
  if (tab === "pending") {
    return {
      status: { not: ProductStatus.ACTIVE },
      productModeration: {
        status: { in: [ModerationStatus.PENDING_REVIEW, ModerationStatus.NEEDS_FIX] },
      },
    };
  }

  if (tab === "drafts") {
    return {
      status: ProductStatus.DRAFT,
      OR: [
        { productModeration: { is: null } },
        {
          productModeration: {
            status: {
              in: [ModerationStatus.REJECTED, ModerationStatus.APPROVED],
            },
          },
        },
      ],
    };
  }

  if (tab === "sold") {
    return { status: ProductStatus.ARCHIVED };
  }

  // Active — only genuinely published LOTs (ACTIVE + approved or legacy without moderation row).
  return {
    status: ProductStatus.ACTIVE,
    OR: [
      { productModeration: { is: null } },
      { productModeration: { status: ModerationStatus.APPROVED } },
    ],
  };
}

async function listSellerLotsByTab(
  sellerId: string,
  tab: SellerLotsTab,
  page: number,
  pageSize: number,
  q?: string | null,
) {
  const skip = (page - 1) * pageSize;
  const take = pageSize;
  const search = titleSearchFilter(q);
  const where: Prisma.ProductWhereInput = {
    sellerId,
    ...whereForTab(tab),
    ...(search ?? {}),
  };

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: listInclude,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items: rows.map(mapSellerListItem),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function buildMobileSellerProductsFromRequest(
  request: Request,
  cursor?: string | null,
  tab?: string | null,
  q?: string | null,
) {
  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return { items: [], nextCursor: null, hasMore: false };
  }

  const page = parseMobilePageCursor(cursor);
  const resolvedTab = parseSellerLotsTab(tab);
  const result = await listSellerLotsByTab(user.sellerProfileId, resolvedTab, page, 20, q);

  return toMobilePagination(result);
}

export async function buildMobileSellerProductDetailFromRequest(request: Request, productId: string) {
  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return null;
  }

  const row = await prisma.product.findFirst({
    where: { id: productId, sellerId: user.sellerProfileId },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      productType: {
        select: {
          id: true,
          name: true,
          lotName: true,
          slug: true,
          categoryId: true,
        },
      },
      images: {
        orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }],
      },
      seller: { select: { id: true, storeName: true, slug: true } },
      productModeration: { select: { status: true } },
      pickupPoints: { include: { pickupPoint: true } },
      characteristicValues: {
        include: {
          definition: { select: { id: true, type: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!row) return null;

  const moderationState = row.productModeration?.status ?? null;
  const publish = buildSellerProductPublishContract({
    id: row.id,
    status: row.status,
    moderationState,
  });
  const section = resolveSellerLotSection({ status: row.status, moderationState });

  return {
    ...publish,
    sellerSection: section,
    sellerSectionLabel: sellerLotSectionLabel(section),
    title: row.name,
    description: row.description,
    price: Number(row.price),
    city: row.city,
    condition: row.condition,
    stock: row.stock,
    pickupEnabled: row.pickupEnabled,
    category: row.category,
    productType: row.productType
      ? {
          id: row.productType.id,
          name: row.productType.lotName ?? row.productType.name,
        }
      : null,
    images: row.images.map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt,
      sortOrder: img.sortOrder,
      isPrimary: img.isPrimary,
    })),
    pickupPoints: row.pickupPoints
      .map((link) => link.pickupPoint)
      .filter((point) => point.isActive)
      .map((point) => ({
        id: point.id,
        name: point.name,
        city: point.city,
        address: point.address,
      })),
    characteristicValues: row.characteristicValues.map((value) => ({
      definitionId: value.definitionId,
      type: value.definition.type,
      formValue: mapSellerCharacteristicFormValue(value),
    })),
  };
}

function mapSellerCharacteristicFormValue(value: {
  valueBoolean: boolean | null;
  valueNumber: unknown;
  valueJson: unknown;
  valueText: string | null;
}): string {
  if (value.valueBoolean != null) return value.valueBoolean ? "true" : "false";
  if (value.valueNumber != null) return String(Number(value.valueNumber));
  if (Array.isArray(value.valueJson)) return value.valueJson.map(String).join(",");
  return value.valueText?.trim() || "";
}
