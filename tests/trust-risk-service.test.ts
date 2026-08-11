import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  recordRiskSignal,
  resolveRiskEvent,
} from "@/features/trust-risk/risk-event-service";
import {
  recomputeProductRiskStats,
  recomputeSellerTrustStats,
  recomputeUserTrustStats,
} from "@/features/trust-risk/reputation";

const stamp = Date.now();
const ids: {
  adminId?: string;
  buyerId?: string;
  sellerUserId?: string;
  sellerProfileId?: string;
  productId?: string;
} = {};

beforeAll(async () => {
  const admin = await prisma.user.create({
    data: { email: `tr-admin-${stamp}@e2e.lot`, name: "Админ", role: "ADMIN" },
  });
  const buyer = await prisma.user.create({
    data: { email: `tr-buyer-${stamp}@e2e.lot`, name: "Покупатель", role: "BUYER" },
  });
  const sellerUser = await prisma.user.create({
    data: { email: `tr-seller-${stamp}@e2e.lot`, name: "Продавец", role: "SELLER" },
  });
  const seller = await prisma.sellerProfile.create({
    data: { userId: sellerUser.id, storeName: "TR Store", slug: `tr-store-${stamp}` },
  });
  const product = await prisma.product.create({
    data: {
      sellerId: seller.id,
      name: "TR risk товар",
      slug: `tr-product-${stamp}`,
      price: 10000,
      status: "ACTIVE",
    },
  });
  Object.assign(ids, {
    adminId: admin.id,
    buyerId: buyer.id,
    sellerUserId: sellerUser.id,
    sellerProfileId: seller.id,
    productId: product.id,
  });
});

afterAll(async () => {
  await prisma.riskAuditLog.deleteMany({ where: { actorUserId: ids.adminId } });
  await prisma.riskEvent.deleteMany({
    where: {
      OR: [
        { userId: ids.buyerId },
        { sellerId: ids.sellerProfileId },
        { productId: ids.productId },
      ],
    },
  });
  await prisma.productRiskStats.deleteMany({ where: { productId: ids.productId } });
  await prisma.sellerTrustStats.deleteMany({ where: { sellerId: ids.sellerProfileId } });
  await prisma.userTrustStats.deleteMany({ where: { userId: ids.buyerId } });
  await prisma.product.deleteMany({ where: { id: ids.productId } });
  await prisma.sellerProfile.deleteMany({ where: { id: ids.sellerProfileId } });
  await prisma.user.deleteMany({
    where: { id: { in: [ids.adminId!, ids.buyerId!, ids.sellerUserId!] } },
  });
});

describe("RiskEventService idempotency (section 28)", () => {
  it("repeated domain event (same sourceEventId) creates only one event", async () => {
    const key = `evt-${stamp}`;
    const a = await recordRiskSignal(prisma, {
      type: "PRICE_OUTLIER",
      source: "PRODUCTS",
      severity: "MEDIUM",
      scoreDelta: 30,
      confidence: 80,
      reason: "тест",
      sourceEventId: key,
      productId: ids.productId,
      sellerId: ids.sellerProfileId,
    });
    const b = await recordRiskSignal(prisma, {
      type: "PRICE_OUTLIER",
      source: "PRODUCTS",
      severity: "MEDIUM",
      scoreDelta: 30,
      confidence: 80,
      sourceEventId: key,
      productId: ids.productId,
    });
    expect(a.created).toBe(true);
    expect(b.created).toBe(false);
    expect(b.id).toBe(a.id);

    const count = await prisma.riskEvent.count({ where: { sourceEventId: key } });
    expect(count).toBe(1);
  });
});

describe("Admin resolution + audit (sections 31/41)", () => {
  it("dismiss sets status and writes an audit log; event is not deleted", async () => {
    const rec = await recordRiskSignal(prisma, {
      type: "DUPLICATE_LISTING",
      source: "PRODUCTS",
      severity: "MEDIUM",
      confidence: 70,
      productId: ids.productId,
      sellerId: ids.sellerProfileId,
    });
    await resolveRiskEvent(prisma, {
      adminUserId: ids.adminId!,
      riskEventId: rec.id,
      action: "dismiss",
      note: "ложное срабатывание",
    });
    const ev = await prisma.riskEvent.findUniqueOrThrow({ where: { id: rec.id } });
    expect(ev.status).toBe("DISMISSED");
    expect(ev.resolvedById).toBe(ids.adminId);

    const audit = await prisma.riskAuditLog.findFirst({
      where: { riskEventId: rec.id, action: "dismiss" },
    });
    expect(audit).toBeTruthy();
  });
});

describe("Reputation neutral priors (sections 15–18/38/39)", () => {
  it("fresh buyer/seller/product get neutral trust and low risk", async () => {
    await recomputeUserTrustStats(prisma, ids.buyerId!);
    await recomputeSellerTrustStats(prisma, ids.sellerProfileId!);
    await recomputeProductRiskStats(prisma, ids.productId!);

    const u = await prisma.userTrustStats.findUniqueOrThrow({ where: { userId: ids.buyerId } });
    const s = await prisma.sellerTrustStats.findUniqueOrThrow({ where: { sellerId: ids.sellerProfileId } });
    const p = await prisma.productRiskStats.findUniqueOrThrow({ where: { productId: ids.productId } });

    expect(u.trustScore).toBe(50); // neutral new buyer
    expect(s.trustScore).toBe(50); // neutral new seller
    expect(u.accountStatus).toBe("NORMAL");
    expect(p.riskScore).toBeLessThan(25); // normal product → LOW
  });
});
