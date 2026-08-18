import type { InventoryCenterSections } from "@/lib/seller-inventory-center/types";

export type MobileSellerInventoryPayload = InventoryCenterSections & {
  telemetry: readonly [
    "inventory_opened",
    "stock_updated",
    "stock_adjusted",
    "inventory_filtered",
    "inventory_searched",
  ];
};

export function buildMobileSellerInventoryPayload(
  input: InventoryCenterSections,
): MobileSellerInventoryPayload {
  return {
    ...input,
    telemetry: [
      "inventory_opened",
      "stock_updated",
      "stock_adjusted",
      "inventory_filtered",
      "inventory_searched",
    ],
  };
}
