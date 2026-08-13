import { describe, expect, it } from "vitest";

import { Prisma } from "@prisma/client";

import {
  MARKETPLACE_COMMISSION_BPS,
  splitCommission,
} from "@/features/finance/lib/commission";

describe("commission split", () => {
  it("applies 10% commission by default", () => {
    const split = splitCommission(10_000);
    expect(split.commissionBps).toBe(MARKETPLACE_COMMISSION_BPS);
    expect(split.gross.toNumber()).toBe(10_000);
    expect(split.commission.toNumber()).toBe(1_000);
    expect(split.sellerAmount.toNumber()).toBe(9_000);
  });

  it("keeps kopeck precision for uneven amounts", () => {
    const split = splitCommission(99.99);
    expect(split.gross.toNumber()).toBe(99.99);
    expect(split.commission.add(split.sellerAmount).toNumber()).toBe(99.99);
  });

  it("accepts Prisma.Decimal input", () => {
    const split = splitCommission(new Prisma.Decimal("1000.00"), 500);
    expect(split.commission.toNumber()).toBe(50);
    expect(split.sellerAmount.toNumber()).toBe(950);
  });
});
