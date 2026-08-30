import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { formatCheckoutHandoffError } from "../apps/mobile/src/checkout/checkout-handoff-errors";
import { HOME_TRUST_ITEMS } from "../apps/mobile/src/home/content";
import { mapLotDeepLinkToHref } from "../apps/mobile/src/deep-links/native-route-map";
import {
  mapCharacteristicFormValues,
  mapSellerLotImages,
  mapSellerLotToEditDraft,
  resolveEditPublishAllowed,
} from "../lib/mobile/seller-lot-edit-map";
import { formatLotEditLoadError } from "../lib/mobile/seller-lot-edit-errors";
import type { SellerLotEditSource } from "../lib/mobile/seller-lot-edit-map";

const profileSource = readFileSync("apps/mobile/app/(tabs)/profile.tsx", "utf8");
const checkoutSource = readFileSync("apps/mobile/app/checkout.tsx", "utf8");
const hookSource = readFileSync("apps/mobile/src/seller/use-lot-create-form.ts", "utf8");
const createSource = readFileSync("apps/mobile/app/sell/create.tsx", "utf8");
const storefrontSource = readFileSync("lib/mobile/seller-storefront-data.ts", "utf8");
const productDetailSource = readFileSync("apps/mobile/app/product/[id].tsx", "utf8");
const sellerLotDetailSource = readFileSync("apps/mobile/app/sell/lot/[id].tsx", "utf8");
const homeContentSource = readFileSync("apps/mobile/src/home/content.ts", "utf8");
const submitBarSource = readFileSync("apps/mobile/src/checkout/ui/CheckoutSubmitBar.tsx", "utf8");

describe("product wave A — truthful home trust copy", () => {
  it("removes unsupported 14-day return, 24/7 support, and verified seller promises", () => {
    const serialized = JSON.stringify(HOME_TRUST_ITEMS);
    expect(serialized).not.toMatch(/14 дней/i);
    expect(serialized).not.toMatch(/24\/7/i);
    expect(serialized).not.toMatch(/Проверенные продавцы/i);
    expect(homeContentSource).not.toMatch(/Возврат 14 дней/);
    expect(homeContentSource).not.toMatch(/Поддержка 24\/7/);
  });

  it("uses only implemented marketplace capabilities in trust strip", () => {
    const titles = HOME_TRUST_ITEMS.map((item) => item.title);
    expect(titles).toEqual(["Чат с продавцом", "Статус заказа", "Проверка ЛОТов"]);
  });
});

describe("product wave A — seller response signal", () => {
  it("does not hardcode respondsInChat as true", () => {
    expect(storefrontSource).not.toMatch(/respondsInChat:\s*true/);
  });

  it("does not render an unsupported seller response-speed claim from legacy API data", () => {
    expect(productDetailSource).not.toContain('label: "Быстро отвечает"');
  });
});

describe("product wave A — seller LOT edit", () => {
  const baseLot: SellerLotEditSource = {
    id: "lot-1",
    title: "Тестовый ЛОТ",
    description: "Описание",
    price: 1200,
    city: "Екатеринбург",
    condition: "NEW",
    status: "DRAFT",
    stock: 2,
    pickupEnabled: false,
    category: { id: "cat-1", name: "Электроника", slug: "electronics" },
    productType: { id: "pt-1", name: "Смартфон" },
    images: [{ id: "img-1", url: "https://example.com/a.jpg", alt: null, sortOrder: 0, isPrimary: true }],
    pickupPoints: [],
    moderationState: "NEEDS_FIX",
  };

  it("maps seller lot detail into editable draft with persisted product id", () => {
    const draft = mapSellerLotToEditDraft(baseLot);
    expect(draft.savedProductId).toBe("lot-1");
    expect(draft.title).toBe("Тестовый ЛОТ");
    expect(draft.images[0]?.uploadedUrl).toBe("https://example.com/a.jpg");
  });

  it("loads characteristic values into edit form state", () => {
    const draft = mapSellerLotToEditDraft({
      ...baseLot,
      characteristicValues: [{ definitionId: "def-1", type: "TEXT", formValue: "128 ГБ" }],
    });
    expect(draft.characteristicValues["def-1"]?.text).toBe("128 ГБ");
    expect(mapCharacteristicFormValues([{ definitionId: "def-2", type: "BOOLEAN", formValue: "true" }])["def-2"]?.boolean).toBe(
      true,
    );
  });

  it("detects edit mode wiring in create screen and hook", () => {
    expect(createSource).toContain("useLocalSearchParams");
    expect(createSource).toContain("useLotCreateForm({ editLotId");
    expect(hookSource).toContain("fetchSellerLot(editLotId)");
    expect(hookSource).toContain("mapSellerLotToDraft");
    expect(hookSource).toContain("saveEditedLot");
    expect(hookSource).toContain("updateSellerLot(productId, payload)");
  });

  it("exposes edit mode for saved draft LOTs", () => {
    expect(sellerLotDetailSource).toContain('lot.status === "DRAFT" || showNeedsChangesBanner');
    expect(sellerLotDetailSource).toContain("{showEditButton ? (");
  });

  it("does not persist edit state into the create LOT autosave", () => {
    expect(hookSource).toContain("if (!editLotId) await saveLotDraft(next)");
    expect(hookSource).toContain('setFormMode("create")');
  });

  it("formats human-readable edit load errors", () => {
    expect(formatLotEditLoadError({ status: 404, message: "404" })).toMatch(/не найден/i);
    expect(formatLotEditLoadError({ status: 403, message: "403" })).toMatch(/доступа/i);
  });

  it("allows re-submit only for draft or needs-fix lots", () => {
    expect(resolveEditPublishAllowed({ status: "DRAFT", moderationState: null })).toBe(true);
    expect(resolveEditPublishAllowed({ status: "ACTIVE", moderationState: "NEEDS_FIX" })).toBe(true);
    expect(resolveEditPublishAllowed({ status: "ACTIVE", moderationState: "APPROVED" })).toBe(false);
  });

  it("preserves uploaded image order for edit", () => {
    const images = mapSellerLotImages([
      { id: "b", url: "https://example.com/b.jpg", alt: null, sortOrder: 1, isPrimary: false },
      { id: "a", url: "https://example.com/a.jpg", alt: null, sortOrder: 0, isPrimary: true },
    ]);
    expect(images.map((img) => img.uploadedUrl)).toEqual([
      "https://example.com/a.jpg",
      "https://example.com/b.jpg",
    ]);
  });
});

describe("product wave A — checkout truthfulness", () => {
  it("does not render fake delivery/payment radio selection components", () => {
    expect(checkoutSource).not.toContain("CheckoutDeliveryInfo");
    expect(checkoutSource).not.toContain("CheckoutPaymentInfo");
    expect(checkoutSource).toContain("CheckoutHandoffBanner");
    expect(checkoutSource).toContain("CheckoutNextStepInfo");
  });

  it("keeps truthful checkout CTA and human browser handoff failure copy", () => {
    expect(submitBarSource).toContain("Перейти к оформлению");
    expect(formatCheckoutHandoffError(new Error("Cannot open URL lot://bad"))).toMatch(/страницу оформления/i);
  });

  it("preserves checkout deep-link routes", () => {
    expect(mapLotDeepLinkToHref("lot://checkout")).toBe("/checkout");
    expect(mapLotDeepLinkToHref("lot:///checkout")).toBe("/checkout");
    expect(mapLotDeepLinkToHref("lot://cart")).toBe("/cart");
  });
});

describe("product wave A — profile identity", () => {
  it("does not show truncated internal user id as primary identity", () => {
    expect(profileSource).not.toMatch(/userId\.slice/);
    expect(profileSource).not.toMatch(/ID:/);
    expect(profileSource).toContain("meta?.email");
  });
});

describe("product wave A — seller storefront payload", () => {
  it("does not hardcode positive chat response in storefront builder source", () => {
    expect(storefrontSource).toContain("respondsInChat: false");
  });
});
