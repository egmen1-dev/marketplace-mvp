import type { InventoryAvailability } from "@/features/orders/lib/inventory-sync";

export type InventorySectionId =
  | "current_stock"
  | "low_stock"
  | "out_of_stock"
  | "incoming"
  | "reserved"
  | "history"
  | "movements"
  | "adjustments"
  | "warehouses"
  | "thresholds";

export type InventorySectionMeta = {
  id: InventorySectionId;
  title: string;
  supported: boolean;
  hiddenReason?: string;
};

export type InventoryStockRow = {
  productId: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  quantity: number;
  reservedQuantity: number;
  availability: InventoryAvailability;
  status: string;
  lowStockThreshold: number;
  updatedAt: string;
};

export type InventoryHistoryRow = {
  id: string;
  productId: string;
  productName: string;
  delta: number;
  quantityAfter: number;
  note: string | null;
  createdAt: string;
  actorUserId: string | null;
};

export type InventoryAdjustmentRow = InventoryHistoryRow;

export type InventoryStockFilter = "all" | "in_stock" | "low" | "out";
export type InventoryStockSort =
  | "name_asc"
  | "name_desc"
  | "stock_asc"
  | "stock_desc"
  | "updated_desc";

export type InventoryStockPage = {
  items: InventoryStockRow[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
};

export type InventoryCenterSections = {
  generatedAt: string;
  enabled: boolean;
  sections: InventorySectionMeta[];
  currentStock: InventoryStockRow[];
  lowStock: InventoryStockRow[];
  outOfStock: InventoryStockRow[];
  history: InventoryHistoryRow[];
  adjustments: InventoryAdjustmentRow[];
  summary: {
    totalSkus: number;
    totalUnits: number;
    lowStockCount: number;
    outOfStockCount: number;
    inStockCount: number;
    lowStockThreshold: number;
  };
  cacheVersion: string;
  retryAfterMs: number;
  advisoryOnly: true;
};

export type InventoryAdjustInput = {
  productId: string;
  quantity?: number;
  delta?: number;
  note?: string | null;
};

export type InventoryBatchAdjustInput = {
  items: InventoryAdjustInput[];
};
