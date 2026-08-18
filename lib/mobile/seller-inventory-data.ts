import { resolveRequestUser, isSellerCapable } from "@/features/auth/resolve-request-user";
import {
  adjustSellerInventory,
  batchAdjustSellerInventory,
  getInventoryCenterSections,
  getSellerInventoryProductDetail,
  listInventoryHistory,
  listSellerInventoryStock,
} from "@/lib/seller-inventory-center";
import type { InventoryAdjustInput, InventoryStockFilter, InventoryStockSort } from "@/lib/seller-inventory-center/types";

import { buildMobileSellerInventoryPayload } from "./seller-inventory-types";
import { trackSellerInventoryEvent } from "./seller-inventory-telemetry";

const EMPTY_PAYLOAD = buildMobileSellerInventoryPayload({
  generatedAt: new Date().toISOString(),
  enabled: false,
  sections: [],
  currentStock: [],
  lowStock: [],
  outOfStock: [],
  history: [],
  adjustments: [],
  summary: {
    totalSkus: 0,
    totalUnits: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    inStockCount: 0,
    lowStockThreshold: 5,
  },
  cacheVersion: "inventory-v1",
  retryAfterMs: 60_000,
  advisoryOnly: true,
});

export async function buildMobileSellerInventoryFromRequest(request: Request) {
  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return EMPTY_PAYLOAD;
  }

  const sections = await getInventoryCenterSections(user.sellerProfileId);
  trackSellerInventoryEvent("inventory_opened", {
    sellerProfileId: user.sellerProfileId,
    totalSkus: sections.summary.totalSkus,
  });
  return buildMobileSellerInventoryPayload(sections);
}

export async function buildMobileSellerInventoryStockFromRequest(
  request: Request,
  params: {
    cursor?: string | null;
    query?: string | null;
    filter?: InventoryStockFilter;
    sort?: InventoryStockSort;
  },
) {
  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return { items: [], nextCursor: null, hasMore: false, total: 0 };
  }

  if (params.query?.trim()) {
    trackSellerInventoryEvent("inventory_searched", { query: params.query.trim() });
  }
  if (params.filter && params.filter !== "all") {
    trackSellerInventoryEvent("inventory_filtered", { filter: params.filter });
  }

  return listSellerInventoryStock({
    sellerProfileId: user.sellerProfileId,
    cursor: params.cursor,
    query: params.query,
    filter: params.filter,
    sort: params.sort,
  });
}

export async function updateMobileSellerInventoryStockFromRequest(
  request: Request,
  productId: string,
  body: { quantity?: number; delta?: number; note?: string | null },
) {
  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return { ok: false as const, error: "UNAUTHORIZED" };
  }

  const result = await adjustSellerInventory({
    sellerProfileId: user.sellerProfileId,
    actorUserId: user.id,
    adjustment: { productId, ...body },
  });

  if (!result.ok) return result;

  trackSellerInventoryEvent("stock_updated", { productId, quantity: result.product.quantity });
  return result;
}

export async function batchUpdateMobileSellerInventoryFromRequest(
  request: Request,
  body: { items: InventoryAdjustInput[] },
) {
  const user = await resolveRequestUser(request);
  if (!user || !isSellerCapable(user.role) || !user.sellerProfileId) {
    return { ok: false as const, error: "UNAUTHORIZED", updated: [], failed: [] };
  }

  const result = await batchAdjustSellerInventory({
    sellerProfileId: user.sellerProfileId,
    actorUserId: user.id,
    items: body.items ?? [],
  });

  trackSellerInventoryEvent("stock_adjusted", { count: result.updated.length });
  return result;
}

export {
  getSellerInventoryProductDetail,
  listInventoryHistory,
  listSellerInventoryStock,
};
