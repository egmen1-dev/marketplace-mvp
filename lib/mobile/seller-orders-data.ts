import { resolveRequestUser, isSellerCapable } from "@/features/auth/resolve-request-user";
import { listSellerOrders, type SellerOrderListItem } from "@/features/seller/queries";
import { parseMobilePageCursor } from "@/lib/mobile/pagination";

export type MobileSellerOrderItem = {
  id: string;
  orderNumber: string;
  status: SellerOrderListItem["status"];
  fulfillmentType: SellerOrderListItem["fulfillmentType"];
  isOverdue: boolean;
  total: number;
  sellerSubtotal: number;
  currency: string;
  createdAt: string;
  buyerName: string | null;
  itemCount: number;
  sellerItemNames: string[];
};

export async function buildMobileSellerOrdersFromRequest(request: Request, cursor?: string | null) {
  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return { items: [] as MobileSellerOrderItem[], nextCursor: null, hasMore: false };
  }

  const page = parseMobilePageCursor(cursor);
  const result = await listSellerOrders(user.sellerProfileId, { page, pageSize: 20 });

  const items: MobileSellerOrderItem[] = result.items.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    fulfillmentType: order.fulfillmentType,
    isOverdue: order.isOverdue,
    total: order.total,
    sellerSubtotal: order.sellerSubtotal,
    currency: order.currency,
    createdAt: order.createdAt,
    buyerName: order.buyerName,
    itemCount: order.itemCount,
    sellerItemNames: order.sellerItemNames,
  }));

  const hasMore = page * result.pageSize < result.total;
  const nextCursor = hasMore ? String(page + 1) : null;

  return { items, nextCursor, hasMore };
}
