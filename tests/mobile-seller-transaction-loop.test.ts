import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  buyerOrderTimelineEmoji,
  buyerOrderTimelineLabel,
  mobileSellerOrderStatusLabel,
  mobileSellerOrderTabToStatuses,
  toMobileSellerOrderStatus,
} from "@/lib/mobile/seller-orders";

const sellSource = readFileSync("apps/mobile/app/(tabs)/sell.tsx", "utf8");
const sellerSalesSource = readFileSync("apps/mobile/app/(tabs)/seller-sales.tsx", "utf8");
const ordersSource = readFileSync("apps/mobile/app/(tabs)/orders.tsx", "utf8");
const orderDetailSource = readFileSync("apps/mobile/app/order/[id].tsx", "utf8");
const endpointsSource = readFileSync("apps/mobile/src/api/endpoints.ts", "utf8");
const sellerHomeSource = readFileSync("apps/mobile/app/(tabs)/seller-home.tsx", "utf8");
const chatQueriesSource = readFileSync("features/chat/queries.ts", "utf8");

describe("EPIC 152 — seller transaction loop contracts", () => {
  it("exposes mobile seller orders API endpoints", () => {
    expect(endpointsSource).toContain("/api/mobile/seller/orders");
    expect(endpointsSource).toContain("/status");
    expect(endpointsSource).toContain("fetchWebHandoffUrl");
  });

  it("sell tab routes non-sellers to web onboarding and sellers to hub actions", () => {
    expect(sellSource).toContain("Начните продавать");
    expect(sellSource).toContain("Создать магазин");
    expect(sellSource).toContain("openWebHandoff");
    expect(sellSource).toContain("/account/seller-start");
    expect(sellSource).toContain("Добавить товар");
    expect(sellSource).toContain("Мои товары");
    expect(sellSource).toContain("Заказы");
    expect(sellSource).toContain("Сообщения");
  });

  it("seller sales screen has tabs and accept action", () => {
    expect(sellerSalesSource).toContain("Новые");
    expect(sellerSalesSource).toContain("В работе");
    expect(sellerSalesSource).toContain("Завершенные");
    expect(sellerSalesSource).toContain("patchSellerOrderStatus");
    expect(sellerSalesSource).toContain("Покупатель:");
  });

  it("buyer orders navigate to detail with timeline", () => {
    expect(ordersSource).toContain("/order/");
    expect(orderDetailSource).toContain("buildBuyerOrderTimeline");
    expect(orderDetailSource).toContain("Написать продавцу");
  });

  it("seller home shows minimal sales summary", () => {
    expect(sellerHomeSource).toContain("Сегодня");
    expect(sellerHomeSource).toContain("Ожидают");
    expect(sellerHomeSource).toContain("Сообщения");
    expect(endpointsSource).toContain("sales: { todayCount");
  });

  it("maps prisma order statuses to mobile seller tabs and labels", () => {
    expect(mobileSellerOrderTabToStatuses("new")).toContain("PAID");
    expect(mobileSellerOrderTabToStatuses("in_progress")).toContain("CONFIRMED");
    expect(mobileSellerOrderTabToStatuses("completed")).toContain("COMPLETED");
    expect(toMobileSellerOrderStatus("AWAITING_SELLER_CONFIRMATION")).toBe("NEW");
    expect(toMobileSellerOrderStatus("SHIPPED")).toBe("SHIPPED");
    expect(mobileSellerOrderStatusLabel("CONFIRMED")).toBe("Подтверждён");
    expect(buyerOrderTimelineLabel("PAID")).toBe("Ожидает подтверждения");
    expect(buyerOrderTimelineEmoji("CONFIRMED")).toBe("🟢");
  });

  it("order created chat message includes product and quantity", () => {
    expect(chatQueriesSource).toContain("Создан новый заказ #");
    expect(chatQueriesSource).toContain("Товар:");
    expect(chatQueriesSource).toContain("Количество:");
  });
});
