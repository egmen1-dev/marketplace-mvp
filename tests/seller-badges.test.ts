import { SellerKind } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  NEW_SELLER_DAYS,
  NEW_SELLER_MAX_ORDERS,
  isNewSeller,
  resolveSellerBadges,
} from "@/features/seller/lib/reputation";

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

describe("new-seller badge rule (30 days AND < 5 completed orders)", () => {
  it("is NEW when fresh account with no completed orders", () => {
    expect(isNewSeller(daysAgo(3), 0)).toBe(true);
  });

  it("graduates by time once past the day window", () => {
    expect(isNewSeller(daysAgo(NEW_SELLER_DAYS + 1), 0)).toBe(false);
  });

  it("graduates by sales once reaching the order threshold", () => {
    expect(isNewSeller(daysAgo(1), NEW_SELLER_MAX_ORDERS)).toBe(false);
    expect(isNewSeller(daysAgo(1), NEW_SELLER_MAX_ORDERS - 1)).toBe(true);
  });

  it("stays NEW at the exact day boundary with few sales", () => {
    expect(isNewSeller(daysAgo(NEW_SELLER_DAYS), 0)).toBe(true);
  });
});

describe("resolveSellerBadges", () => {
  it("marks a brand-new individual seller as NEW_SELLER only", () => {
    const badges = resolveSellerBadges({
      isVerified: false,
      kind: SellerKind.INDIVIDUAL,
      joinedAt: daysAgo(2),
      completedOrders: 0,
    });
    expect(badges).toEqual(["NEW_SELLER"]);
  });

  it("drops NEW_SELLER after enough completed sales, keeps STORE + VERIFIED", () => {
    const badges = resolveSellerBadges({
      isVerified: true,
      kind: SellerKind.SHOP,
      joinedAt: daysAgo(2),
      completedOrders: NEW_SELLER_MAX_ORDERS + 3,
    });
    expect(badges).toContain("STORE");
    expect(badges).toContain("VERIFIED_SELLER");
    expect(badges).not.toContain("NEW_SELLER");
  });

  it("defaults completedOrders to 0 (time-only fallback) when omitted", () => {
    expect(
      resolveSellerBadges({
        isVerified: false,
        kind: SellerKind.INDIVIDUAL,
        joinedAt: daysAgo(1),
      }),
    ).toContain("NEW_SELLER");
    expect(
      resolveSellerBadges({
        isVerified: false,
        kind: SellerKind.INDIVIDUAL,
        joinedAt: daysAgo(NEW_SELLER_DAYS + 5),
      }),
    ).not.toContain("NEW_SELLER");
  });
});
