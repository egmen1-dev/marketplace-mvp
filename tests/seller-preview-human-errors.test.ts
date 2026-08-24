import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { formatLotCreateError } from "../apps/mobile/src/seller/lot-create-errors";
import { LOT_CREATE_COPY } from "../apps/mobile/src/seller/lot-create-copy";
import { conditionPreviewLabel, formatPickupPreview, pickupPointsLabel } from "../apps/mobile/src/seller/lot-create-preview";

const createLotSource = readFileSync("apps/mobile/app/sell/create.tsx", "utf8");
const copySource = readFileSync("apps/mobile/src/seller/lot-create-copy.ts", "utf8");
const previewFooterSource = readFileSync("apps/mobile/src/seller/LotCreatePreviewFooter.tsx", "utf8");
const errorsSource = readFileSync("apps/mobile/src/seller/lot-create-errors.ts", "utf8");

describe("EPIC 158.3 — seller preview human errors", () => {
  it("maps technical publish errors to friendly copy with retry", () => {
    const formatted = formatLotCreateError(new Error("Unsupported FormDataPart implementation"), "publish");
    expect(formatted.message).toBe(LOT_CREATE_COPY.publishError);
    expect(formatted.detail).toBe(LOT_CREATE_COPY.publishErrorBody);
    expect(formatted.canRetry).toBe(true);
  });

  it("never surfaces raw technical strings in preview UI", () => {
    expect(createLotSource).not.toContain("FormDataPart");
    expect(createLotSource).toContain("LotCreateErrorBlock");
    expect(createLotSource).toContain("LOT_CREATE_COPY.retryLabel");
    expect(errorsSource).toContain("formdatapart");
  });

  it("uses preview screen title Проверьте ЛОТ", () => {
    expect(copySource).toContain('previewTitle: "Проверьте ЛОТ"');
    expect(createLotSource).toContain("LOT_CREATE_COPY.previewTitle");
    expect(createLotSource).toContain('resizeMode="cover"');
  });

  it("formats condition and pickup copy for humans", () => {
    expect(conditionPreviewLabel("USED")).toBe("Состояние: Б/у");
    expect(pickupPointsLabel(1)).toBe("1 точка доступна");
    expect(formatPickupPreview([], ["a"])).toEqual({ title: "Самовывоз", detail: "1 точка доступна" });
    expect(
      formatPickupPreview(
        [{ id: "p1", name: "Склад", city: "Москва", address: "ул. Ленина, 1" }],
        ["p1"],
      ).detail,
    ).toContain("Склад");
  });

  it("orders preview CTAs: publish, save, back", () => {
    expect(previewFooterSource).toContain("colors.ctaPrimary");
    expect(previewFooterSource).toContain("layout.stickyCtaHeight");
    expect(createLotSource).toContain("LotCreatePreviewFooter");
    expect(createLotSource).toContain("LOT_CREATE_COPY.saveLotLabel");
    expect(createLotSource).not.toContain("Самовывоз: {form.draft.pickupPointIds.length} точек");
  });
});
