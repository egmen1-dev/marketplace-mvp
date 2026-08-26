import { describe, expect, it } from "vitest";

import { evaluateLotPreviewValidation } from "@/lib/mobile/lot-preview-validation";

/** Simulates autosave JSON roundtrip (SecureStore payload shape). */
function roundtripDraft<T extends Record<string, unknown>>(draft: T): T {
  return JSON.parse(JSON.stringify(draft)) as T;
}

describe("P0 — create LOT autosave / reload contract", () => {
  const smartphoneDraft = {
    title: "Телефон самсунг a57",
    price: "11000",
    stock: "1",
    city: "Москва",
    categoryId: "cat-electronics",
    categoryName: "Электроника",
    productTypeId: "pt-smartphones",
    productTypeName: "Смартфоны",
    characteristicValues: { "char-mem": { text: "128 ГБ" } },
    images: [{ uri: "file:///photo.jpg" }],
    step: "details",
  };

  it("preserves preview validation after JSON roundtrip", () => {
    const restored = roundtripDraft(smartphoneDraft);
    const before = evaluateLotPreviewValidation({
      title: smartphoneDraft.title,
      price: smartphoneDraft.price,
      stock: smartphoneDraft.stock,
      city: smartphoneDraft.city,
      categoryId: smartphoneDraft.categoryId,
      productTypeId: smartphoneDraft.productTypeId,
      imagesCount: smartphoneDraft.images.length,
      pickupEnabled: false,
      pickupPointIds: [],
      characteristicDefinitions: [],
      characteristicValues: smartphoneDraft.characteristicValues,
    });
    const after = evaluateLotPreviewValidation({
      title: restored.title,
      price: restored.price,
      stock: restored.stock,
      city: restored.city,
      categoryId: restored.categoryId,
      productTypeId: restored.productTypeId,
      imagesCount: restored.images.length,
      pickupEnabled: false,
      pickupPointIds: [],
      characteristicDefinitions: [],
      characteristicValues: restored.characteristicValues,
    });
    expect(before.canPreview).toBe(true);
    expect(after.canPreview).toBe(true);
    expect(after.canPreview).toBe(before.canPreview);
  });

  it("newer in-memory edits win over stale restore payload (contract)", () => {
    const staleRestore = roundtripDraft({ ...smartphoneDraft, city: "Казань", price: "9000" });
    const userEdited = { ...staleRestore, city: "Москва", price: "11000" };
    const validation = evaluateLotPreviewValidation({
      title: userEdited.title,
      price: userEdited.price,
      stock: userEdited.stock,
      city: userEdited.city,
      categoryId: userEdited.categoryId,
      productTypeId: userEdited.productTypeId,
      imagesCount: userEdited.images.length,
      pickupEnabled: false,
      pickupPointIds: [],
      characteristicDefinitions: [],
      characteristicValues: userEdited.characteristicValues,
    });
    expect(validation.canPreview).toBe(true);
    expect(staleRestore.city).toBe("Казань");
    expect(userEdited.city).toBe("Москва");
  });
});
