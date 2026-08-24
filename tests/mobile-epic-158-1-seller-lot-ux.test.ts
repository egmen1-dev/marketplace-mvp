import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const createLotSource = readFileSync("apps/mobile/app/sell/create.tsx", "utf8");
const draftStorageSource = readFileSync("apps/mobile/src/seller/lot-draft-storage.ts", "utf8");
const hookSource = readFileSync("apps/mobile/src/seller/use-lot-create-form.ts", "utf8");
const copySource = readFileSync("apps/mobile/src/seller/lot-create-copy.ts", "utf8");
const restorePromptSource = readFileSync("apps/mobile/src/seller/LotRestorePrompt.tsx", "utf8");
const autosaveSource = readFileSync("apps/mobile/src/seller/LotAutosaveIndicator.tsx", "utf8");
const sellerLotApiSource = readFileSync("apps/mobile/src/api/seller-lot.ts", "utf8");
const sellerProductsSource = readFileSync("apps/mobile/app/(tabs)/seller-products.tsx", "utf8");
const statusLabelsSource = readFileSync("apps/mobile/src/theme/status-labels.ts", "utf8");
const pickupRouteSource = readFileSync("app/api/mobile/seller/pickup-points/route.ts", "utf8");

describe("EPIC 158.1 — LOT terminology", () => {
  it("uses LOT language instead of черновик/модерация in create flow", () => {
    expect(copySource).toContain("Продолжить");
    expect(copySource).toContain("Опубликовать ЛОТ");
    expect(copySource).not.toContain("черновик");
    expect(createLotSource).not.toContain("Черновик ЛОТа");
    expect(sellerProductsSource).toContain("Сохранённые");
    expect(sellerProductsSource).not.toContain("Черновики");
    expect(statusLabelsSource).toContain('DRAFT: "Сохранён"');
  });
});

describe("EPIC 158.1 — autosave and restore", () => {
  it("migrates draft storage to v2 with pickup fields", () => {
    expect(draftStorageSource).toContain("lot-draft-v2");
    expect(draftStorageSource).toContain("pickupEnabled");
    expect(draftStorageSource).toContain("pickupPointIds");
    expect(draftStorageSource).toContain("isUnfinishedLot");
  });

  it("detects unfinished LOT from persisted fields", () => {
    expect(draftStorageSource).toContain("export function isUnfinishedLot");
    expect(draftStorageSource).toContain("pickupPointIds.length > 0");
  });

  it("shows restore prompt with continue/delete actions", () => {
    expect(copySource).toContain("Вы начали создавать ЛОТ");
    expect(restorePromptSource).toContain("LOT_CREATE_COPY.restoreContinue");
    expect(restorePromptSource).toContain("LOT_CREATE_COPY.restoreDelete");
    expect(createLotSource).toContain("LotRestorePrompt");
  });

  it("debounces autosave and shows saved indicator", () => {
    expect(hookSource).toContain("flushSave");
    expect(hookSource).toContain("useFocusEffect");
    expect(copySource).toContain("Сохранено");
    expect(createLotSource).toContain("LotAutosaveIndicator");
  });
});

describe("EPIC 158.1 — navigation and error preservation", () => {
  it("never clears draft on publish/upload errors", () => {
    expect(hookSource).toContain("await flushSave(draft)");
    expect(hookSource).toContain("uploadImagesWithRecovery");
    expect(hookSource).toContain("formatLotCreateError");
    expect(hookSource).toContain("setHumanError");
    expect(copySource).toContain("pickupSaveError");
    expect(copySource).toContain("Ваш ЛОТ сохранён");
  });

  it("preserves pickup selection in draft and API payload", () => {
    expect(hookSource).toContain("togglePickupPoint");
    expect(hookSource).toContain("pickupPointIds");
    expect(sellerLotApiSource).toContain("fetchSellerPickupPoints");
    expect(sellerLotApiSource).toContain("pickupEnabled");
    expect(pickupRouteSource).toContain("listSellerPickupPoints");
  });

  it("surfaces pickup load errors without clearing form", () => {
    expect(copySource).toContain("Не удалось загрузить точки самовывоза");
    expect(hookSource).toContain("pickupLoadError");
    expect(hookSource).toContain("LOT_CREATE_COPY.pickupLoadError");
  });
});
