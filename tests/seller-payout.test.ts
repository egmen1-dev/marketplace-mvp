import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { prisma } from "@/lib/prisma";
import { isSellerPayoutEnabled } from "@/lib/seller-payout/flags";
import {
  approvePayoutRequest,
  markPayoutCompleted,
  rejectPayoutRequest,
  setSellerAvailableBalanceForE2E,
} from "@/lib/seller-payout/lifecycle";
import { createSellerPaymentMethod } from "@/lib/seller-payout/methods";
import {
  assertAdminPayoutAccess,
  assertSellerOwnsPayoutResource,
  assertSellerPayoutAccess,
  SellerPayoutForbiddenError,
} from "@/lib/seller-payout/permissions";
import {
  createPayoutRequest,
  validatePayoutAmount,
} from "@/lib/seller-payout/requests";
import { MIN_PAYOUT_AMOUNT } from "@/lib/seller-payout/types";
import { getSellerBalance } from "@/lib/finance/balance";

const PREV_FLAG = process.env.SELLER_PAYOUT_ENABLED;

describe("seller payout flag", () => {
  afterEach(() => {
    process.env.SELLER_PAYOUT_ENABLED = PREV_FLAG;
  });

  it("is off by default", () => {
    delete process.env.SELLER_PAYOUT_ENABLED;
    expect(isSellerPayoutEnabled()).toBe(false);
  });
});

describe("validatePayoutAmount", () => {
  it("rejects amount above available balance", () => {
    expect(
      validatePayoutAmount({ amount: 50_000, availableAmount: 42_000 }),
    ).toContain("превышает");
  });

  it("rejects below minimum threshold", () => {
    expect(
      validatePayoutAmount({ amount: 500, availableAmount: 42_000 }),
    ).toContain(String(MIN_PAYOUT_AMOUNT));
  });
});

describe("permissions", () => {
  it("blocks cross-seller payout access", () => {
    expect(() =>
      assertSellerOwnsPayoutResource("seller-a", "seller-b"),
    ).toThrow(SellerPayoutForbiddenError);
  });

  it("requires seller profile", () => {
    expect(() =>
      assertSellerPayoutAccess({ role: "SELLER", sellerProfileId: null }),
    ).toThrow(SellerPayoutForbiddenError);
  });

  it("requires admin for admin payout control", () => {
    expect(() => assertAdminPayoutAccess("SELLER")).toThrow(
      SellerPayoutForbiddenError,
    );
  });
});

describe("payout lifecycle integration", () => {
  beforeEach(() => {
    process.env.SELLER_PAYOUT_ENABLED = "true";
  });

  afterEach(async () => {
    process.env.SELLER_PAYOUT_ENABLED = PREV_FLAG;
    const seller = await prisma.sellerProfile.findFirst({ select: { id: true } });
    if (!seller) return;
    await prisma.payoutTransaction.deleteMany({ where: { sellerId: seller.id } });
    await prisma.payoutRequest.deleteMany({ where: { sellerId: seller.id } });
    await prisma.sellerPaymentMethod.deleteMany({ where: { sellerId: seller.id } });
    await prisma.sellerBalance.updateMany({
      where: { sellerId: seller.id },
      data: {
        availableAmount: 0,
        reservedForPayoutAmount: 0,
        paidAmount: 0,
      },
    });
  });

  it("reserves balance on request and completes payout", async () => {
    const seller = await prisma.sellerProfile.findFirst({ select: { id: true } });
    if (!seller) return;

    await setSellerAvailableBalanceForE2E(seller.id, 50_000);
    const method = await createSellerPaymentMethod({
      sellerId: seller.id,
      type: "CARD",
      detailsReference: "9012",
    });

    const request = await createPayoutRequest({
      sellerId: seller.id,
      amount: 20_000,
      paymentMethodId: method.id,
    });

    let balance = await getSellerBalance(seller.id);
    expect(balance.availableAmount).toBe(30_000);
    expect(balance.reservedForPayoutAmount).toBe(20_000);

    await approvePayoutRequest(request.id);
    await markPayoutCompleted({ requestId: request.id, externalReference: "test-ref" });

    balance = await getSellerBalance(seller.id);
    expect(balance.reservedForPayoutAmount).toBe(0);
    expect(balance.paidAmount).toBe(20_000);
    expect(balance.availableAmount).toBe(30_000);
  });

  it("returns reserved funds on reject", async () => {
    const seller = await prisma.sellerProfile.findFirst({ select: { id: true } });
    if (!seller) return;

    await setSellerAvailableBalanceForE2E(seller.id, 42_000);
    const method = await createSellerPaymentMethod({
      sellerId: seller.id,
      type: "BANK_ACCOUNT",
      detailsReference: "5678",
    });

    const request = await createPayoutRequest({
      sellerId: seller.id,
      amount: 15_000,
      paymentMethodId: method.id,
    });

    await rejectPayoutRequest({ requestId: request.id, adminNote: "test reject" });

    const balance = await getSellerBalance(seller.id);
    expect(balance.availableAmount).toBe(42_000);
    expect(balance.reservedForPayoutAmount).toBe(0);
  });

  it("cannot create request exceeding available balance", async () => {
    const seller = await prisma.sellerProfile.findFirst({ select: { id: true } });
    if (!seller) return;

    await setSellerAvailableBalanceForE2E(seller.id, 5_000);
    const method = await createSellerPaymentMethod({
      sellerId: seller.id,
      type: "CARD",
      detailsReference: "1111",
    });

    await expect(
      createPayoutRequest({
        sellerId: seller.id,
        amount: 20_000,
        paymentMethodId: method.id,
      }),
    ).rejects.toThrow(/доступн|превышает/i);
  });
});
