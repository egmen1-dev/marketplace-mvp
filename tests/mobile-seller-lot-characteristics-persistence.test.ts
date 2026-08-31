import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createProductSchema, updateProductSchema } from "@/features/products/schemas";
import {
  serializeLotCharacteristicPayload,
  validateLotCharacteristicForm,
  type LotCharacteristicDefinition,
} from "@/lib/mobile/lot-characteristics";
import { mapSellerLotToEditDraft, type SellerLotEditSource } from "@/lib/mobile/seller-lot-edit-map";

const sellerApiSource = readFileSync("apps/mobile/src/api/seller-lot.ts", "utf8");
const sellerFormSource = readFileSync("apps/mobile/src/seller/use-lot-create-form.ts", "utf8");
const productServiceSource = readFileSync("features/products/queries.ts", "utf8");
const sellerDetailSource = readFileSync("lib/mobile/seller-products-data.ts", "utf8");

const definitionId = "cmsoz1onq5rawsgev";
const productTypeId = "cmsoz1onq5rawsgeu";
const categoryId = "cmsoz1onq5rawsget";

const powerDefinition: LotCharacteristicDefinition = {
  id: definitionId,
  name: "Мощность",
  slug: "power-w",
  type: "NUMBER",
  required: true,
  unit: "Вт",
  options: null,
  sortOrder: 0,
  filterable: true,
};

const createBody = {
  title: "Тестовая дрель",
  description: "Тестовое описание",
  price: 1500,
  city: "Москва",
  condition: "NEW" as const,
  status: "DRAFT" as const,
  stock: 1,
  categoryId,
  productTypeId,
  images: [{ url: "https://example.com/drill.jpg" }],
  characteristics: [{ definitionId, valueNumber: 750 }],
};

describe("seller LOT characteristics persistence contract", () => {
  it("keeps the form characteristic in the create payload", () => {
    expect(serializeLotCharacteristicPayload([powerDefinition], {
      [definitionId]: { number: "750" },
    })).toEqual([{ definitionId, valueNumber: 750 }]);
    expect(sellerFormSource).toContain("const characteristics = serializeLotCharacteristicPayload(");
    expect(sellerFormSource).toContain("characteristics,");
    expect(sellerApiSource).toContain("characteristics: payload.characteristics ?? []");
  });

  it("accepts characteristics at the create boundary and persists characteristicValues", () => {
    expect(createProductSchema.parse(createBody).characteristics).toEqual(createBody.characteristics);
    expect(productServiceSource).toContain("characteristicValues: {");
    expect(productServiceSource).toContain("create: (input.characteristics ?? [])");
  });

  it("exposes persisted characteristic values from seller detail", () => {
    expect(sellerDetailSource).toContain("characteristicValues: {");
    expect(sellerDetailSource).toContain("characteristicValues: row.characteristicValues.map((value) => ({");
    expect(sellerDetailSource).toContain("definitionId: value.definitionId");
    expect(sellerDetailSource).toContain("formValue: mapSellerCharacteristicFormValue(value)");
  });

  it("preloads seller detail characteristic values into edit form state", () => {
    const lot: SellerLotEditSource = {
      id: "lot-1",
      title: "Тестовая дрель",
      description: "Тестовое описание",
      price: 1500,
      city: "Москва",
      condition: "NEW",
      status: "DRAFT",
      stock: 1,
      pickupEnabled: false,
      moderationState: null,
      category: { id: categoryId, name: "Инструменты", slug: "tools" },
      productType: { id: productTypeId, name: "Дрели" },
      images: [],
      pickupPoints: [],
      characteristicValues: [{ definitionId, type: "NUMBER", formValue: "750" }],
    };
    expect(mapSellerLotToEditDraft(lot).characteristicValues).toEqual({
      [definitionId]: { number: "750" },
    });
  });

  it("accepts changed characteristics at update and upserts them", () => {
    expect(updateProductSchema.parse({ characteristics: [{ definitionId, valueNumber: 900 }] }).characteristics)
      .toEqual([{ definitionId, valueNumber: 900 }]);
    expect(sellerApiSource).toContain("characteristics: payload.characteristics,");
    expect(productServiceSource).toContain("if (input.characteristics !== undefined)");
    expect(productServiceSource).toContain("productCharacteristicValue.upsert");
  });

  it("keeps legacy empty-characteristics drafts loadable", () => {
    const parsed = createProductSchema.parse({ ...createBody, characteristics: undefined });
    expect(parsed.characteristics).toEqual([]);
    expect(mapSellerLotToEditDraft({
      id: "legacy-lot",
      title: "Старый черновик",
      description: null,
      price: 100,
      city: "Москва",
      condition: "USED",
      status: "DRAFT",
      stock: 1,
      pickupEnabled: false,
      moderationState: null,
      category: null,
      productType: null,
      images: [],
      pickupPoints: [],
    }).characteristicValues).toEqual({});
  });

  it("still reports a missing required characteristic", () => {
    expect(validateLotCharacteristicForm([powerDefinition], {}, { onlyRequired: true })).toEqual([
      expect.objectContaining({ definitionId, name: "Мощность" }),
    ]);
  });
});
