import { afterEach, describe, expect, it } from "vitest";

import { isLotWalletEnabled } from "@/lib/lot-wallet/flags";
import { isSellerPromotionCenterEnabled } from "@/lib/seller-promotion-center/flags";
import { accountNavItemsFor } from "@/features/account/components/account-nav-items";
import { ROUTES } from "@/lib/constants";

describe("promotion visibility nav", () => {
  const prevWallet = process.env.LOT_WALLET_ENABLED;
  const prevPromo = process.env.SELLER_PROMOTION_CENTER_ENABLED;

  afterEach(() => {
    if (prevWallet === undefined) delete process.env.LOT_WALLET_ENABLED;
    else process.env.LOT_WALLET_ENABLED = prevWallet;
    if (prevPromo === undefined) delete process.env.SELLER_PROMOTION_CENTER_ENABLED;
    else process.env.SELLER_PROMOTION_CENTER_ENABLED = prevPromo;
  });

  it("unified seller nav includes Продвижение and Кошелёк", () => {
    process.env.LOT_WALLET_ENABLED = "true";
    const items = accountNavItemsFor(true);
    const labels = items.map((i) => i.label);
    expect(labels).toContain("Продвижение");
    expect(labels).toContain("Кошелёк");
    expect(labels).not.toContain("Баланс");
    expect(labels).not.toContain("Вывод");
    const promo = items.find((i) => i.label === "Продвижение");
    expect(promo?.href).toBe(ROUTES.ACCOUNT_PROMOTION_CENTER);
  });

  it("flags default to enabled unless explicitly false", () => {
    delete process.env.LOT_WALLET_ENABLED;
    delete process.env.SELLER_PROMOTION_CENTER_ENABLED;
    expect(isLotWalletEnabled()).toBe(true);
    expect(isSellerPromotionCenterEnabled()).toBe(true);
  });
});
