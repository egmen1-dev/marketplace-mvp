import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { REPRESENTATIVE_CATEGORY_MATRIX } from "@/lib/mobile/lot-characteristics-category-matrix";
import { evaluateLotPreviewValidation } from "@/lib/mobile/lot-preview-validation";
import {
  humanCharacteristicPrompt,
  isForbiddenCharacteristicUiMessage,
  mapServerCharacteristicRejection,
  pruneCharacteristicValuesForSchema,
  serializeLotCharacteristicPayload,
  splitCharacteristicDefinitions,
  validateLotCharacteristicForm,
  type LotCharacteristicDefinition,
} from "@/lib/mobile/lot-characteristics";

const hookSource = readFileSync("apps/mobile/src/seller/use-lot-create-form.ts", "utf8");
const createSource = readFileSync("apps/mobile/app/sell/create.tsx", "utf8");
const sellerLotSource = readFileSync("apps/mobile/src/api/seller-lot.ts", "utf8");
const draftSource = readFileSync("apps/mobile/src/seller/lot-draft-storage.ts", "utf8");
const errorsSource = readFileSync("apps/mobile/src/seller/lot-create-errors.ts", "utf8");
const apiRouteSource = readFileSync(
  "app/api/mobile/seller/product-types/[productTypeId]/characteristics/route.ts",
  "utf8",
);

function defs(names: Array<{ name: string; required?: boolean; type?: string; id?: string }>) {
  return names.map(
    (item, index): LotCharacteristicDefinition => ({
      id: item.id ?? `def-${index}`,
      name: item.name,
      slug: item.name.toLowerCase(),
      type: item.type ?? (item.name === "Мощность" || item.name === "Производительность" ? "NUMBER" : "SELECT"),
      required: item.required ?? true,
      unit: item.name === "Мощность" ? "Вт" : item.name === "Производительность" ? "л/мин" : null,
      options: item.type === "SELECT" || item.name === "Размер" ? ["42", "44", "46"] : null,
      sortOrder: index,
      filterable: false,
    }),
  );
}

describe("P0.1 lot dynamic characteristics — shared lib", () => {
  it("uses human prompts instead of backend copy", () => {
    expect(humanCharacteristicPrompt({ name: "Мощность", type: "NUMBER" })).toBe("Укажите мощность");
    expect(humanCharacteristicPrompt({ name: "Размер", type: "SELECT" })).toBe("Выберите размер");
    expect(isForbiddenCharacteristicUiMessage("Заполните обязательную характеристику «Мощность»")).toBe(true);
  });

  it("required characteristics block submit, not preview", () => {
    const schema = defs([{ name: "Мощность", type: "NUMBER" }]);
    const issues = validateLotCharacteristicForm(schema, {}, { onlyRequired: true });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toBe("Укажите мощность");

    const preview = evaluateLotPreviewValidation({
      title: "Дрель",
      price: "1000",
      stock: "1",
      city: "Москва",
      categoryId: "cat",
      productTypeId: "pt",
      imagesCount: 1,
      pickupEnabled: false,
      pickupPointIds: [],
      characteristicDefinitions: schema,
      characteristicValues: {},
    });
    expect(preview.canPreview).toBe(true);
    expect(preview.canSubmit).toBe(false);
  });

  it("serializes stable definition ids for publish payload", () => {
    const schema = defs([
      { id: "char-power", name: "Мощность", type: "NUMBER" },
      { id: "char-size", name: "Размер", type: "SELECT", required: false },
    ]);
    const payload = serializeLotCharacteristicPayload(schema, {
      "char-power": { number: "800" },
      "char-size": { text: "46" },
    });
    expect(payload).toEqual([
      { definitionId: "char-power", valueNumber: 800 },
      { definitionId: "char-size", valueText: "46" },
    ]);
  });

  it("prunes stale values after category/product type change", () => {
    const nextSchema = defs([{ id: "size-1", name: "Размер", type: "SELECT" }]);
    const pruned = pruneCharacteristicValuesForSchema(nextSchema, {
      "power-1": { number: "800" },
      "size-1": { text: "46" },
    });
    expect(pruned).toEqual({ "size-1": { text: "46" } });
  });

  it("maps server CHARACTERISTICS_REQUIRED to human reconciliation copy", () => {
    const schema = defs([{ id: "power-1", name: "Мощность", type: "NUMBER" }]);
    const mapped = mapServerCharacteristicRejection(
      "CHARACTERISTICS_REQUIRED",
      "Заполните обязательную характеристику «Мощность»",
      schema,
    );
    expect(mapped.kind).toBe("characteristics");
    expect(mapped.userMessage).toBe("Укажите мощность");
  });

  it("splits required vs optional for compact seller UI", () => {
    const schema = defs([
      { name: "Размер", required: true },
      { name: "Цвет", required: false },
    ]);
    const split = splitCharacteristicDefinitions(schema);
    expect(split.required.map((d) => d.name)).toEqual(["Размер"]);
    expect(split.optional.map((d) => d.name)).toEqual(["Цвет"]);
  });
});

describe("P0.1 lot dynamic characteristics — representative category matrix", () => {
  for (const row of REPRESENTATIVE_CATEGORY_MATRIX) {
    it(`${row.categoryName} / ${row.productTypeName} isolates required fields`, () => {
      const schema = defs(
        row.requiredCharacteristicNames.map((name) => ({
          name,
          required: true,
          type: name === "Мощность" || name === "Производительность" ? "NUMBER" : "SELECT",
        })),
      );
      const missing = validateLotCharacteristicForm(schema, {}, { onlyRequired: true });
      expect(missing).toHaveLength(row.requiredCharacteristicNames.length);
      for (const forbidden of row.forbiddenRequiredNames) {
        expect(schema.some((def) => def.required && def.name === forbidden)).toBe(false);
      }
    });
  }
});

describe("P0.1 lot dynamic characteristics — mobile wiring", () => {
  it("loads schema by product type and persists values in draft", () => {
    expect(sellerLotSource).toContain("fetchProductTypeCharacteristics");
    expect(sellerLotSource).not.toMatch(/characteristics:\s*\[\]/);
    expect(draftSource).toContain("characteristicValues");
    expect(draftSource).toContain("characteristicsProductTypeId");
  });

  it("validates before preview and reconciles server rejections", () => {
    expect(hookSource).toContain("evaluateLotPreviewValidation");
    expect(hookSource).toContain("handleCharacteristicRejection");
    expect(hookSource).toContain("serializeLotCharacteristicPayload");
    expect(hookSource).toContain("CHARACTERISTICS_REQUIRED");
  });

  it("renders dynamic characteristics section in create flow", () => {
    expect(createSource).toContain("LotCharacteristicsSection");
    expect(createSource).toContain("characteristicPreviewRows");
  });

  it("filters forbidden technical seller errors", () => {
    expect(errorsSource).toContain("isForbiddenCharacteristicUiMessage");
    expect(errorsSource).toContain("characteristicsMissing");
  });

  it("exposes mobile seller characteristics API route", () => {
    expect(apiRouteSource).toContain("getProductTypeWithCharacteristics");
    expect(apiRouteSource).toContain("characteristics");
  });
});
