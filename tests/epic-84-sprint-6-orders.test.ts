import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { detectCrudInSource } from "@/lib/product-operations/marketplace-quality/crud-detection";
import { enrichAuditFile, loadMarketplaceQualityAudit } from "@/lib/product-operations/marketplace-quality/report";
import { computeMarketplaceFeeling, computeMarketplaceScore } from "@/lib/product-operations/marketplace-quality/criteria";

describe("EPIC 84 Sprint 6 — Orders & Post-Purchase", () => {
  it("orders tab uses OrdersExperience module", () => {
    const source = readFileSync("apps/mobile/app/(tabs)/orders.tsx", "utf8");
    expect(source).toContain("OrdersExperience");
    expect(source).not.toContain("fetchOrders");
  });

  it("order detail route uses OrderDetailExperience", () => {
    const source = readFileSync("apps/mobile/app/order/[id].tsx", "utf8");
    expect(source).toContain("OrderDetailExperience");
  });

  it("experience has commerce sections and timeline", () => {
    const list = readFileSync("apps/mobile/src/features/orders/OrdersExperience.tsx", "utf8");
    const detail = readFileSync("apps/mobile/src/features/orders/OrderDetailExperience.tsx", "utf8");
    expect(list).toContain("OrdersHeader");
    expect(list).toContain("OrderCard");
    expect(list).toContain("OrdersEmptyState");
    expect(detail).toContain("OrderTimeline");
    expect(list).not.toContain("Alert.alert");
  });

  it("telemetry covers post-purchase funnel", () => {
    const listHook = readFileSync("apps/mobile/src/features/orders/useOrdersData.ts", "utf8");
    const detailHook = readFileSync("apps/mobile/src/features/orders/useOrderDetailData.ts", "utf8");
    expect(listHook).toContain("order_list_opened");
    expect(listHook).toContain("orders_empty");
    expect(detailHook).toContain("order_opened");
    expect(detailHook).toContain("order_reordered");
    expect(detailHook).toContain("order_shared");
  });

  it("orders files pass CRUD detection", () => {
    for (const file of [
      "apps/mobile/app/(tabs)/orders.tsx",
      "apps/mobile/src/features/orders/OrdersExperience.tsx",
      "apps/mobile/src/features/orders/OrderDetailExperience.tsx",
    ]) {
      expect(detectCrudInSource(file).fail).toBe(false);
    }
  });

  it("meets sprint gate marketplace scores", () => {
    const audit = enrichAuditFile(loadMarketplaceQualityAudit());
    const orders = audit.screens.find((s) => s.screenId === "orders");
    expect(orders?.scoresAfter).toBeTruthy();
    expect(computeMarketplaceScore(orders!.scoresAfter!)).toBeGreaterThanOrEqual(9.7);
    expect(computeMarketplaceFeeling(orders!.scoresAfter!)).toBeGreaterThanOrEqual(9.7);
  });
});
