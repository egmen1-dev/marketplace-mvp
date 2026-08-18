import { isSellerInventoryCenterEnabled } from "./flags";
import { listInventoryAdjustments, listInventoryHistory } from "./history";
import { getInventoryDashboardSummary } from "./queries";
import { listAllSellerStockRows } from "./stock";
import type { InventoryCenterSections, InventorySectionMeta } from "./types";

const SECTION_DEFINITIONS: InventorySectionMeta[] = [
  { id: "current_stock", title: "Текущий остаток", supported: true },
  { id: "low_stock", title: "Заканчивается", supported: true },
  { id: "out_of_stock", title: "Нет в наличии", supported: true },
  { id: "history", title: "История", supported: true },
  { id: "adjustments", title: "Корректировки", supported: true },
  { id: "incoming", title: "Поступления", supported: false, hiddenReason: "NOT_SUPPORTED" },
  { id: "reserved", title: "Резерв", supported: false, hiddenReason: "NOT_SUPPORTED" },
  { id: "movements", title: "Перемещения", supported: false, hiddenReason: "NOT_SUPPORTED" },
  { id: "warehouses", title: "Склады", supported: false, hiddenReason: "NOT_SUPPORTED" },
  { id: "thresholds", title: "Пороги", supported: false, hiddenReason: "NOT_SUPPORTED" },
];

export async function getInventoryCenterSections(
  sellerProfileId: string,
): Promise<InventoryCenterSections> {
  if (!isSellerInventoryCenterEnabled()) {
    return {
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
    };
  }

  const [summary, currentStock, lowStock, outOfStock, historyPage, adjustments] = await Promise.all([
    getInventoryDashboardSummary(sellerProfileId),
    listAllSellerStockRows(sellerProfileId, "all", 50),
    listAllSellerStockRows(sellerProfileId, "low", 50),
    listAllSellerStockRows(sellerProfileId, "out", 50),
    listInventoryHistory({ sellerProfileId, pageSize: 30 }),
    listInventoryAdjustments(sellerProfileId, 30),
  ]);

  const visibleSections = SECTION_DEFINITIONS.filter((section) => {
    if (!section.supported) return false;
    if (section.id === "current_stock") return currentStock.length > 0;
    if (section.id === "low_stock") return lowStock.length > 0;
    if (section.id === "out_of_stock") return outOfStock.length > 0;
    if (section.id === "history") return historyPage.items.length > 0;
    if (section.id === "adjustments") return adjustments.length > 0;
    return true;
  });

  return {
    generatedAt: new Date().toISOString(),
    enabled: true,
    sections: visibleSections,
    currentStock,
    lowStock,
    outOfStock,
    history: historyPage.items,
    adjustments,
    summary,
    cacheVersion: "inventory-v1",
    retryAfterMs: 60_000,
    advisoryOnly: true,
  };
}
