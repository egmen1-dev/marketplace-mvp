import { describe, expect, it } from "vitest";

import { ROUTES } from "@/lib/constants";

describe("account settings unification routes", () => {
  it("wallet route is defined", () => {
    expect(ROUTES.ACCOUNT_WALLET).toBe("/account/wallet");
  });

  it("promotions legacy redirects to promotion center path", () => {
    expect(ROUTES.ACCOUNT_PROMOTIONS).toBe("/account/promotions");
    expect(ROUTES.ACCOUNT_PROMOTION_CENTER).toBe("/account/promotion-center");
  });
});
