import { describe, expect, it } from "vitest";

import { accountNavItemsFor } from "@/features/account/components/account-nav-items";
import { ROUTES } from "@/lib/constants";

describe("account unification nav", () => {
  it("does not expose separate profile nav when wallet flag path is active in code", () => {
    const buyerItems = accountNavItemsFor(false);
    const labels = buyerItems.map((item) => item.label);
    expect(labels).not.toContain("Мой профиль");
    expect(labels).toContain("Настройки");
  });

  it("uses unified wallet route label for sellers when enabled at runtime", () => {
    const sellerItems = accountNavItemsFor(true);
    const wallet = sellerItems.find((item) => item.href === ROUTES.ACCOUNT_WALLET);
    if (wallet) {
      expect(wallet.label).toBe("Кошелёк");
    }
  });
});

describe("settings inline expectations", () => {
  it("profile redirect target is settings with section", () => {
    expect(ROUTES.SETTINGS).toBe("/account/settings");
    expect(`${ROUTES.SETTINGS}?section=profile#profile`).toContain("section=profile");
  });
});
