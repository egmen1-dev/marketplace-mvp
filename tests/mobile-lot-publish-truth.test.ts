import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  buildSellerProductPublishContract,
  isSellerProductPublic,
  resolveLotPublishOutcome,
} from "@/lib/mobile/seller-product-publish";
import { ModerationStatus, ProductStatus } from "@prisma/client";

const hookSource = readFileSync("apps/mobile/src/seller/use-lot-create-form.ts", "utf8");
const createSource = readFileSync("apps/mobile/app/sell/create.tsx", "utf8");
const copySource = readFileSync("apps/mobile/src/seller/lot-create-copy.ts", "utf8");
const sellerProductsSource = readFileSync("apps/mobile/app/(tabs)/seller-products.tsx", "utf8");
const sellerLotRouteSource = readFileSync("app/api/products/[id]/route.ts", "utf8");
const sellerDataSource = readFileSync("lib/mobile/seller-products-data.ts", "utf8");
const mobileOutcomeSource = readFileSync("apps/mobile/src/seller/resolve-lot-publish-outcome.ts", "utf8");

describe("P0 lot publish truth — outcome mapper", () => {
  it("maps ACTIVE to PUBLISHED", () => {
    expect(
      resolveLotPublishOutcome({ id: "p1", status: ProductStatus.ACTIVE, moderationState: null }),
    ).toBe("PUBLISHED");
  });

  it("maps moderation pending to PENDING_REVIEW", () => {
    expect(
      resolveLotPublishOutcome({
        id: "p1",
        status: ProductStatus.DRAFT,
        moderationState: ModerationStatus.PENDING_REVIEW,
      }),
    ).toBe("PENDING_REVIEW");
  });

  it("maps plain draft to SAVED", () => {
    expect(resolveLotPublishOutcome({ id: "p1", status: ProductStatus.DRAFT })).toBe("SAVED");
  });

  it("builds publish contract with isPublic only for ACTIVE", () => {
    const published = buildSellerProductPublishContract({
      id: "p1",
      status: ProductStatus.ACTIVE,
      moderationState: ModerationStatus.APPROVED,
    });
    const draft = buildSellerProductPublishContract({
      id: "p2",
      status: ProductStatus.DRAFT,
      moderationState: ModerationStatus.PENDING_REVIEW,
    });
    expect(published.isPublic).toBe(true);
    expect(draft.isPublic).toBe(false);
    expect(isSellerProductPublic(ProductStatus.ACTIVE)).toBe(true);
  });
});

describe("P0 lot publish truth — mobile wiring", () => {
  it("does not swallow publish failures into generic saved copy", () => {
    expect(hookSource).not.toContain("reviewNote = LOT_CREATE_COPY.savedForReview");
    expect(hookSource).toContain("mapMutationOutcome");
    expect(hookSource).toContain("setPublishOutcome");
    expect(hookSource).toContain("publishCtaLabel");
  });

  it("uses state-aware success screens and seller detail routing", () => {
    expect(createSource).toContain("pendingReviewTitle");
    expect(createSource).toContain("sellerLotDetailRoute");
    expect(createSource).toContain("sellerLotsTabForOutcome");
    expect(copySource).toContain("pendingReviewBody");
    expect(mobileOutcomeSource).toContain("/sell/lot/");
  });

  it("exposes pending review tab in My LOTs", () => {
    expect(sellerProductsSource).toContain('"pending"');
    expect(sellerProductsSource).toContain("На проверке");
    expect(sellerDataSource).toContain("pending");
    expect(sellerDataSource).toContain("productModeration");
  });

  it("allows mobile bearer auth on public PDP route", () => {
    expect(sellerLotRouteSource).toContain("resolveRequestUser(request)");
  });
});

describe("EPIC 159 — duplicate protection preserved", () => {
  it("updates existing savedProductId before publish", () => {
    expect(hookSource).toContain("updateSellerLot(productId, draftPayload)");
    expect(hookSource).toContain("draft.savedProductId");
  });
});
