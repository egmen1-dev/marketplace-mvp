import { ModerationStatus, ProductStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  resolveSellerLotSection,
  sellerLotSectionLabel,
  sellerLotSectionMatchesTab,
  sellerLotSectionTone,
} from "@/lib/mobile/seller-lots-section";

describe("seller-lots-section — canonical mapping", () => {
  it("maps ACTIVE approved to active section", () => {
    expect(
      resolveSellerLotSection({
        status: ProductStatus.ACTIVE,
        moderationState: ModerationStatus.APPROVED,
      }),
    ).toBe("active");
  });

  it("maps DRAFT + PENDING_REVIEW to pending", () => {
    expect(
      resolveSellerLotSection({
        status: ProductStatus.DRAFT,
        moderationState: ModerationStatus.PENDING_REVIEW,
      }),
    ).toBe("pending");
  });

  it("maps NEEDS_FIX to needs_fix (pending tab)", () => {
    expect(
      resolveSellerLotSection({
        status: ProductStatus.DRAFT,
        moderationState: ModerationStatus.NEEDS_FIX,
      }),
    ).toBe("needs_fix");
    expect(sellerLotSectionMatchesTab("needs_fix", "pending")).toBe(true);
  });

  it("maps plain DRAFT to drafts", () => {
    expect(resolveSellerLotSection({ status: ProductStatus.DRAFT, moderationState: null })).toBe("drafts");
  });

  it("maps REJECTED to rejected (drafts tab)", () => {
    expect(
      resolveSellerLotSection({
        status: ProductStatus.DRAFT,
        moderationState: ModerationStatus.REJECTED,
      }),
    ).toBe("rejected");
    expect(sellerLotSectionMatchesTab("rejected", "drafts")).toBe(true);
  });

  it("never places pending in active tab", () => {
    expect(sellerLotSectionMatchesTab("pending", "active")).toBe(false);
    expect(sellerLotSectionMatchesTab("needs_fix", "active")).toBe(false);
    expect(sellerLotSectionMatchesTab("drafts", "active")).toBe(false);
  });

  it("exposes human labels", () => {
    expect(sellerLotSectionLabel("pending")).toBe("На проверке");
    expect(sellerLotSectionLabel("drafts")).toBe("Сохранён");
    expect(sellerLotSectionLabel("needs_fix")).toBe("Нужно исправить");
  });

  it("uses warning tone for pending states", () => {
    expect(sellerLotSectionTone("pending")).toBe("warning");
    expect(sellerLotSectionTone("active")).toBe("success");
  });
});
