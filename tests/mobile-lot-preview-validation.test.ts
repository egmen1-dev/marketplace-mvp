import { describe, expect, it } from "vitest";

import { evaluateLotPolicyV2 } from "@/lib/moderation/policy-v2/evaluate";
import {
  evaluateLotPreviewValidation,
  formatPreviewBlockersMessage,
  parseLotPriceNumber,
} from "@/lib/mobile/lot-preview-validation";
import type { LotCharacteristicDefinition } from "@/lib/mobile/lot-characteristics";

const smartphoneDraft = {
  title: "Телефон самсунг a57",
  price: "11000",
  stock: "1",
  city: "Москва",
  categoryId: "cat-electronics",
  productTypeId: "pt-smartphones",
  imagesCount: 1,
  pickupEnabled: false,
  pickupPointIds: [] as string[],
  characteristicDefinitions: [] as LotCharacteristicDefinition[],
  characteristicValues: {},
};

function powerToolDefs(): LotCharacteristicDefinition[] {
  return [
    {
      id: "char-power",
      name: "Мощность",
      slug: "power",
      type: "NUMBER",
      required: true,
      unit: "Вт",
      options: null,
    },
  ];
}

describe("P0 mobile create LOT preview validation", () => {
  it("A — allowed smartphone reaches preview when minimal fields complete", () => {
    const result = evaluateLotPreviewValidation(smartphoneDraft);
    expect(result.canPreview).toBe(true);
    expect(result.canSubmit).toBe(true);
    expect(result.reasonCodes).toHaveLength(0);
  });

  it("B — category missing shows visible reason", () => {
    const result = evaluateLotPreviewValidation({ ...smartphoneDraft, categoryId: null });
    expect(result.canPreview).toBe(false);
    expect(result.previewBlockers.some((b) => b.code === "CATEGORY_MISSING")).toBe(true);
    expect(formatPreviewBlockersMessage(result.previewBlockers)).toContain("Выберите категорию");
  });

  it("C — price missing/invalid shows visible reason", () => {
    const result = evaluateLotPreviewValidation({ ...smartphoneDraft, price: "" });
    expect(result.canPreview).toBe(false);
    expect(result.previewBlockers.some((b) => b.code === "PRICE_INVALID")).toBe(true);
  });

  it("D — quantity invalid shows visible reason", () => {
    const result = evaluateLotPreviewValidation({ ...smartphoneDraft, stock: "0" });
    expect(result.canPreview).toBe(false);
    expect(result.previewBlockers.some((b) => b.code === "STOCK_INVALID")).toBe(true);
  });

  it("E — photos required for preview contract", () => {
    const result = evaluateLotPreviewValidation({ ...smartphoneDraft, imagesCount: 0 });
    expect(result.canPreview).toBe(false);
    expect(result.previewBlockers.some((b) => b.code === "PHOTOS_MISSING")).toBe(true);
  });

  it("F — required characteristics block submit but not preview", () => {
    const defs = powerToolDefs();
    const withChars = {
      ...smartphoneDraft,
      characteristicDefinitions: defs,
      characteristicValues: {},
    };
    const preview = evaluateLotPreviewValidation(withChars);
    expect(preview.canPreview).toBe(true);
    expect(preview.canSubmit).toBe(false);
    expect(preview.submitBlockers.some((b) => b.code === "CHARACTERISTIC_MISSING")).toBe(true);
  });

  it("physical smartphone case — category without product type blocks preview", () => {
    const partial = evaluateLotPreviewValidation({
      ...smartphoneDraft,
      productTypeId: null,
      city: "",
    });
    expect(partial.canPreview).toBe(false);
    expect(partial.previewBlockers.map((b) => b.code)).toEqual(
      expect.arrayContaining(["PRODUCT_TYPE_MISSING", "CITY_MISSING"]),
    );
    const message = formatPreviewBlockersMessage(partial.previewBlockers);
    expect(message).toContain("тип");
    expect(message).toContain("город");
  });

  it("K — price parsing handles spaces and comma", () => {
    expect(parseLotPriceNumber("11 000")).toBe(11000);
    expect(parseLotPriceNumber("11,5")).toBe(11.5);
  });
});

describe("P0 mobile create LOT — policy safety (no weakening)", () => {
  it("G — vape ambiguous stays MANUAL_REVIEW", () => {
    const result = evaluateLotPolicyV2({
      title: "Жидкость для вэйпа",
      description: "фруктовый вкус",
    });
    expect(result.decisionClass).toBe("MANUAL_REVIEW");
  });

  it("H — nicotine evidence stays HARD_BLOCK", () => {
    const result = evaluateLotPolicyV2({
      title: "Жидкость для вейпа",
      description: "nicotine 20mg/ml",
    });
    expect(result.decisionClass).toBe("HARD_BLOCK");
  });

  it("I — SDS+ drill not firearm false positive", () => {
    const result = evaluateLotPolicyV2({
      title: "Перфоратор RockDrill SDS+",
      description: "Комплект с патроном SDS+",
    });
    expect(result.decisionClass).toBe("ALLOW");
    expect(result.rulesTriggered).not.toContain("LOT_WEAPON_FIREARM_V2");
  });

  it("J — ordinary perfume RESTRICTED_REVIEW", () => {
    const result = evaluateLotPolicyV2({
      title: "Парфюм Cedar & Amber",
      description: "Новый",
    });
    expect(result.decisionClass).toBe("RESTRICTED_REVIEW");
  });

  it("ordinary smartphone is not HARD_BLOCK", () => {
    for (const title of [
      "Телефон самсунг a57",
      "Samsung A57",
      "Samsung Galaxy A57",
      "Смартфон Samsung A57",
      "Телефон Android",
    ]) {
      const result = evaluateLotPolicyV2({ title, description: "Б/у, рабочий" });
      expect(result.decisionClass, title).not.toBe("HARD_BLOCK");
    }
  });
});
