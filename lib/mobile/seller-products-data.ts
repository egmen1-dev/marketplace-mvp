import { resolveRequestUser, isSellerCapable } from "@/features/auth/resolve-request-user";
import { listProducts } from "@/features/products/queries";
import { parseMobilePageCursor, toMobilePagination } from "@/lib/mobile/pagination";

export async function buildMobileSellerProductsFromRequest(request: Request, cursor?: string | null) {
  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return { items: [], nextCursor: null, hasMore: false };
  }

  const page = parseMobilePageCursor(cursor);
  const result = await listProducts({
    sellerId: user.sellerProfileId,
    status: "ALL",
    page,
    pageSize: 20,
  });

  return toMobilePagination(result);
}
