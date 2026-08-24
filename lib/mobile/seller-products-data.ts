import { ProductStatus } from "@prisma/client";

import { resolveRequestUser, isSellerCapable } from "@/features/auth/resolve-request-user";
import { listProducts } from "@/features/products/queries";
import { parseMobilePageCursor, toMobilePagination } from "@/lib/mobile/pagination";

export type SellerLotsTab = "active" | "drafts" | "sold";

function resolveStatusFilter(tab: string | null | undefined): ProductStatus | "ALL" {
  if (tab === "drafts") return ProductStatus.DRAFT;
  if (tab === "sold") return ProductStatus.ARCHIVED;
  return ProductStatus.ACTIVE;
}

export async function buildMobileSellerProductsFromRequest(
  request: Request,
  cursor?: string | null,
  tab?: string | null,
) {
  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return { items: [], nextCursor: null, hasMore: false };
  }

  const page = parseMobilePageCursor(cursor);
  const status = resolveStatusFilter(tab);
  const result = await listProducts({
    sellerId: user.sellerProfileId,
    status,
    page,
    pageSize: 20,
  });

  return toMobilePagination(result);
}
