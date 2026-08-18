import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/seller-promotion-center/flags", () => ({
  isSellerPromotionCenterEnabled: () => true,
}));

const promotionCampaignCount = vi.fn(async () => 2);
const promotionCampaignFindMany = vi.fn(async () => [
  {
    id: "camp1",
    status: "STARTED",
    startedAt: new Date("2026-08-01T00:00:00Z"),
    endedAt: new Date("2026-08-08T00:00:00Z"),
    updatedAt: new Date("2026-08-01T00:00:00Z"),
    budget: { toNumber: () => 990 },
    product: { id: "prod1", name: "Product A" },
    placements: [{ surface: "CATALOG_TOP" }],
    orders: [{ amount: { toNumber: () => 990 }, plan: { name: "STARTER" } }],
  },
]);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    promotionCampaign: {
      count: promotionCampaignCount,
      findMany: promotionCampaignFindMany,
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
    promotionOrder: { create: vi.fn(), findMany: vi.fn(async () => []) },
    promotionPlacement: { findMany: vi.fn(async () => []), upsert: vi.fn() },
    promotionMetric: { findMany: vi.fn(async () => []) },
    promotionPlan: { findFirst: vi.fn(async () => ({ id: "plan_starter", name: "STARTER", durationDays: 7, price: 990 })) },
    product: {
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(),
      count: vi.fn(async () => 0),
    },
    walletLedgerEntry: {
      aggregate: vi.fn(async () => ({ _sum: { amount: 990 } })),
      findMany: vi.fn(async () => []),
    },
    order: { aggregate: vi.fn(async () => ({ _count: { _all: 1 }, _sum: { total: 5000 } })) },
  },
}));

describe("seller promotion center sections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not expose unsupported coupon or bundle sections", async () => {
    const { getPromotionCenterSections } = await import("@/lib/seller-promotion-center/sections");
    const sections = await getPromotionCenterSections("seller1");
    const ids = sections.sections.map((s) => s.id);
    expect(ids).not.toContain("coupons");
    expect(ids).not.toContain("bundles");
  });

  it("counts active campaigns from database", async () => {
    const { getPromotionCenterDashboard } = await import("@/lib/seller-promotion-center/queries");
    const dashboard = await getPromotionCenterDashboard("seller1");
    expect(dashboard.activeCampaigns).toBe(2);
  });

  it("lists campaigns from database rows", async () => {
    const { listPromotionCampaigns } = await import("@/lib/seller-promotion-center/campaigns");
    const campaigns = await listPromotionCampaigns("seller1");
    expect(campaigns).toHaveLength(1);
    expect(campaigns[0]?.productName).toBe("Product A");
  });
});
