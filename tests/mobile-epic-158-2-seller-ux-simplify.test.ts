import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { formatLotCreateError } from "../apps/mobile/src/seller/lot-create-errors";
import { LOT_CREATE_COPY } from "../apps/mobile/src/seller/lot-create-copy";

const chip = readFileSync("apps/mobile/src/components/ui/Chip.tsx", "utf8");
const catalogToolbar = readFileSync("apps/mobile/src/components/ui/CatalogToolbar.tsx", "utf8");
const productCartCta = readFileSync("apps/mobile/src/components/ui/ProductCartCta.tsx", "utf8");
const tokens = readFileSync("apps/mobile/src/theme/tokens.ts", "utf8");
const createLotSource = readFileSync("apps/mobile/app/sell/create.tsx", "utf8");
const copySource = readFileSync("apps/mobile/src/seller/lot-create-copy.ts", "utf8");
const hookSource = readFileSync("apps/mobile/src/seller/use-lot-create-form.ts", "utf8");
const errorsSource = readFileSync("apps/mobile/src/seller/lot-create-errors.ts", "utf8");
const stickyFooterSource = readFileSync("apps/mobile/src/seller/LotCreateStickyFooter.tsx", "utf8");
const draftStorageSource = readFileSync("apps/mobile/src/seller/lot-draft-storage.ts", "utf8");

describe("EPIC 158.2 — CategoryRail single-line chips", () => {
  it("keeps category chips on one line with ellipsis", () => {
    expect(chip).toContain('variant?: "default" | "category"');
    expect(chip).toContain("numberOfLines={1}");
    expect(chip).toContain('ellipsizeMode="tail"');
    expect(chip).not.toContain("numberOfLines={isCategory ? 2 : 1}");
    expect(chip).toContain("height: 42");
    expect(catalogToolbar).toContain('variant="category"');
  });
});

describe("EPIC 158.2 — ProductCard CTA branding", () => {
  it("uses ctaPrimary orange with white text and pressed state", () => {
    expect(tokens).toContain("ctaPrimary:");
    expect(productCartCta).toContain("colors.ctaPrimary");
    expect(productCartCta).toContain("colors.ctaPrimaryPressed");
    expect(productCartCta).toContain('color={colors.white}');
    expect(productCartCta).toContain("stepper");
  });
});

describe("EPIC 158.2 — human-readable seller errors", () => {
  it("maps technical upload errors to friendly copy", () => {
    const formatted = formatLotCreateError(new Error("Unsupported FormDataPart implementation"), "upload");
    expect(formatted.message).toBe(LOT_CREATE_COPY.uploadErrorTitle);
    expect(formatted.detail).toBe(LOT_CREATE_COPY.uploadErrorBody);
    expect(formatted.canRetry).toBe(true);
  });

  it("never surfaces raw technical strings in create UI wiring", () => {
    expect(errorsSource).toContain("formdatapart");
    expect(hookSource).toContain("formatLotCreateError");
    expect(createLotSource).toContain("LotCreateErrorBlock");
    expect(createLotSource).toContain("LOT_CREATE_COPY.retryLabel");
    expect(createLotSource).not.toContain("FormDataPart");
  });
});

describe("EPIC 158.2 — simplified LOT creation copy", () => {
  it("uses Avito-style LOT language in create flow", () => {
    expect(copySource).toContain('photosTitle: "Добавьте фото"');
    expect(copySource).toContain('detailsTitle: "Что продаёте?"');
    expect(copySource).toContain('continueLabel: "Продолжить"');
    expect(copySource).toContain('publishLabel: "Опубликовать ЛОТ"');
    expect(copySource).toContain('previewTitle: "Проверьте ЛОТ перед публикацией"');
    expect(copySource).toContain("Стул IKEA, новый, белый");
    expect(copySource).not.toContain("Сохранить ЛОТ");
    expect(copySource).not.toContain("черновик");
    expect(copySource).not.toContain("товар");
  });

  it("shows success actions and sticky orange footer CTA", () => {
    expect(createLotSource).toContain("LOT_CREATE_COPY.viewLot");
    expect(createLotSource).toContain("LOT_CREATE_COPY.createAnother");
    expect(createLotSource).toContain("LotCreateStickyFooter");
    expect(stickyFooterSource).toContain("colors.ctaPrimary");
    expect(stickyFooterSource).toContain("layout.stickyCtaHeight");
  });

  it("avoids forbidden seller-create strings", () => {
    expect(createLotSource).not.toMatch(/товар/i);
    expect(createLotSource).not.toMatch(/черновик/i);
    expect(createLotSource).not.toContain("Опубликовать товар");
  });
});

describe("EPIC 158.2 — draft preservation", () => {
  it("keeps autosave, restore, and error recovery contracts", () => {
    expect(draftStorageSource).toContain("lot-draft-v2");
    expect(hookSource).toContain("uploadImagesWithRecovery");
    expect(hookSource).toContain("retryLastAction");
    expect(hookSource).toContain("useFocusEffect");
    expect(hookSource).toContain("await flushSave(draft)");
  });
});
