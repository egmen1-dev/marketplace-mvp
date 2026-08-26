import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { createJourneyHarness } from "@/lib/mobile/seller-journey/journey-harness";
import { createOneTapGuard } from "@/lib/mobile/seller-journey/one-tap-action";
import { buildPhotoStepUiContract } from "@/lib/mobile/seller-journey/photo-step-state";
import {
  isSilentAsyncFailure,
  resolveAsyncActionOutcome,
} from "@/lib/mobile/seller-journey/submit-action-state";

const hookSource = readFileSync("apps/mobile/src/seller/use-lot-create-form.ts", "utf8");
const createSource = readFileSync("apps/mobile/app/sell/create.tsx", "utf8");
const clientSource = readFileSync("apps/mobile/src/api/client.ts", "utf8");
const sellerLotSource = readFileSync("apps/mobile/src/api/seller-lot.ts", "utf8");
const aboutSource = readFileSync("apps/mobile/app/about.tsx", "utf8");
const diagnosticsSource = readFileSync("apps/mobile/src/seller/journey-diagnostics.ts", "utf8");
const patchRouteSource = readFileSync("app/api/mobile/seller/products/[id]/route.ts", "utf8");

describe("P0-A photo → Continue — state machine", () => {
  it("blocks continue while picker/processing and shows upload hint while uploading", () => {
    expect(buildPhotoStepUiContract([], { pickerBusy: true }).canContinue).toBe(false);
    expect(buildPhotoStepUiContract([{ uploadStatus: "idle" }]).canContinue).toBe(false);
    expect(buildPhotoStepUiContract([{ uploadStatus: "uploading" }]).hint).toContain("Загружаем");
    expect(buildPhotoStepUiContract([{ uploadStatus: "uploaded", uploadedUrl: "https://x" }]).canContinue).toBe(true);
  });

  it("one Continue tap navigates to details when photos are ready", async () => {
    const harness = createJourneyHarness();
    harness.simulatePickerReturn([{ uploadStatus: "uploaded", uploadedUrl: "https://cdn/1.jpg" }]);
    const first = await harness.tapContinue();
    expect(first.navigated).toBe(true);
    expect(first.step).toBe("details");
    const second = await harness.tapContinue();
    expect(second.navigated).toBe(false);
    expect(second.step).toBe("details");
  });

  it("rejects first Continue during processing (RC10.5 regression)", () => {
    const ui = buildPhotoStepUiContract([{ uploadStatus: "idle" }]);
    expect(ui.canContinue).toBe(false);
    expect(ui.ctaDisabled).toBe(true);
  });

  it("double rapid Continue yields one navigation", async () => {
    const harness = createJourneyHarness();
    harness.simulatePickerReturn([{ uploadStatus: "uploaded", uploadedUrl: "https://cdn/1.jpg" }]);
    const [a, b] = await Promise.all([harness.tapContinue(50), harness.tapContinue(0)]);
    const navigations = [a, b].filter((r) => r.navigated).length;
    expect(navigations).toBe(1);
    expect(harness.getState().step).toBe("details");
  });
});

describe("P0-B submit — no silent async failure", () => {
  it("detects black-hole outcome when loading ends without success or error", () => {
    const snapshot = {
      publishing: false,
      savingLot: false,
      step: "preview" as const,
      publishOutcome: null,
      error: null,
      actionStarted: true,
    };
    expect(resolveAsyncActionOutcome(snapshot)).toBe("IDLE_WITHOUT_OUTCOME");
    expect(isSilentAsyncFailure(snapshot)).toBe(true);
  });

  it("submit with PENDING_REVIEW reaches success step", async () => {
    const harness = createJourneyHarness({ step: "preview" });
    const result = await harness.tapSubmit(async () => ({ ok: true, outcome: "PENDING_REVIEW" }));
    expect(result.step).toBe("success");
    expect(result.error).toBeNull();
    expect(harness.isSilentSubmitFailure()).toBe(false);
  });

  it("submit server error stays on preview with visible error", async () => {
    const harness = createJourneyHarness({ step: "preview" });
    const result = await harness.tapSubmit(async () => ({ ok: false, message: "Не удалось отправить ЛОТ на проверку" }));
    expect(result.step).toBe("preview");
    expect(result.error).toContain("Не удалось");
    expect(harness.isSilentSubmitFailure()).toBe(false);
  });

  it("RC10.5 silent CHARACTERISTICS_REQUIRED catch is forbidden in hook", () => {
    expect(hookSource).not.toMatch(
      /if \(err instanceof ApiClientError && err\.code === "CHARACTERISTICS_REQUIRED"\) \{\s*return;\s*\}/,
    );
    expect(hookSource).toContain("handleCharacteristicRejection");
    expect(hookSource).toContain("publishOnServer(images, actionId)");
  });

  it("double submit issues one request", async () => {
    const harness = createJourneyHarness({ step: "preview" });
    await Promise.all([
      harness.tapSubmit(async () => {
        await new Promise((r) => setTimeout(r, 30));
        return { ok: true, outcome: "PENDING_REVIEW" };
      }),
      harness.tapSubmit(async () => ({ ok: true, outcome: "PENDING_REVIEW" })),
    ]);
    expect(harness.getState().submitRequestCount).toBe(1);
  });
});

describe("failure matrix A–L", () => {
  const latencies = [0, 250, 1000, 3000];

  it.each(latencies)("A slow upload: processing blocks, ready navigates at %ims", async (ms) => {
    const harness = createJourneyHarness();
    harness.simulatePickerReturn([{ uploadStatus: "idle" }]);
    const blocked = await harness.tapContinue(ms);
    expect(blocked.navigated).toBe(false);
    harness.setImages([{ uploadStatus: "uploaded", uploadedUrl: "https://cdn/a.jpg" }]);
    const ok = await harness.tapContinue(ms);
    expect(ok.navigated).toBe(true);
  });

  it("B upload fail blocks continue with error hint", () => {
    const ui = buildPhotoStepUiContract([{ uploadStatus: "failed" }]);
    expect(ui.phase).toBe("ERROR");
    expect(ui.canContinue).toBe(false);
  });

  it("C first tap during processing is blocked; uploading may continue", async () => {
    const processing = createJourneyHarness();
    processing.simulatePickerReturn([{ uploadStatus: "idle" }]);
    expect((await processing.tapContinue()).navigated).toBe(false);

    const uploading = createJourneyHarness();
    uploading.simulatePickerReturn([{ uploadStatus: "uploading" }]);
    expect((await uploading.tapContinue()).navigated).toBe(true);
  });

  it("D double tap Continue is idempotent", async () => {
    const harness = createJourneyHarness();
    harness.simulatePickerReturn([{ uploadStatus: "uploaded", uploadedUrl: "https://x" }]);
    await harness.tapContinue();
    const again = await harness.tapContinue();
    expect(again.navigated).toBe(false);
  });

  it("E submit 200 PENDING_REVIEW success", async () => {
    const harness = createJourneyHarness({ step: "preview" });
    const r = await harness.tapSubmit(async () => ({ ok: true, outcome: "PENDING_REVIEW" }));
    expect(r.step).toBe("success");
  });

  it("F submit 200 PUBLISHED success", async () => {
    const harness = createJourneyHarness({ step: "preview" });
    const r = await harness.tapSubmit(async () => ({ ok: true, outcome: "PUBLISHED" }));
    expect(r.step).toBe("success");
  });

  it("G submit 400 validation error visible", async () => {
    const harness = createJourneyHarness({ step: "preview" });
    const r = await harness.tapSubmit(async () => ({ ok: false, message: "Заполните обязательное поле" }));
    expect(r.error).toBeTruthy();
    expect(r.step).toBe("preview");
  });

  it("H submit 409 conflict visible", async () => {
    const harness = createJourneyHarness({ step: "preview" });
    const r = await harness.tapSubmit(async () => ({ ok: false, message: "Конфликт версии ЛОТа" }));
    expect(r.error).toContain("Конфликт");
  });

  it("I submit 500 visible", async () => {
    const harness = createJourneyHarness({ step: "preview" });
    const r = await harness.tapSubmit(async () => ({ ok: false, message: "Не удалось отправить ЛОТ на проверку" }));
    expect(r.error).toBeTruthy();
  });

  it("J timeout/abort visible", async () => {
    const harness = createJourneyHarness({ step: "preview" });
    const r = await harness.tapSubmit(async () => ({ ok: false, message: "Проверьте подключение к интернету" }));
    expect(r.error).toContain("интернет");
  });

  it("K duplicate submit tap single request", async () => {
    const harness = createJourneyHarness({ step: "preview" });
    const guard = createOneTapGuard();
    expect(guard.tryBegin()).toBe(true);
    expect(guard.tryBegin()).toBe(false);
    guard.finish();
    await harness.tapSubmit(async () => ({ ok: true, outcome: "PENDING_REVIEW" }));
    expect(harness.getState().submitRequestCount).toBe(1);
  });

  it("L silent catch simulation is detected", () => {
    const harness = createJourneyHarness({ step: "preview" });
    harness.simulateCharacteristicRequiredSilentCatch();
    expect(harness.isSilentSubmitFailure()).toBe(true);
  });
});

describe("wiring contracts", () => {
  it("mobile create screen uses photo step contract + continueFromPhotos", () => {
    expect(createSource).toContain("continueFromPhotos");
    expect(createSource).toContain("photoStepUi");
    expect(createSource).toContain('keyboardShouldPersistTaps="handled"');
    expect(hookSource).toContain("InteractionManager.runAfterInteractions");
    expect(hookSource).toContain("uploadQueueRef");
  });

  it("request correlation header is wired for seller mutations", () => {
    expect(clientSource).toContain("x-client-action-id");
    expect(sellerLotSource).toContain("clientActionId");
  });

  it("beta diagnostics copy surface exists", () => {
    expect(aboutSource).toContain("Скопировать диагностику");
    expect(diagnosticsSource).toContain("formatSellerJourneyDiagnostics");
    expect(diagnosticsSource).not.toMatch(/password|jwt|authorization/i);
  });

  it("server PATCH logs client action correlation", () => {
    expect(patchRouteSource).toContain("x-client-action-id");
    expect(patchRouteSource).toContain("mobile_seller_product_update");
    expect(patchRouteSource).toContain("publishOutcome");
  });
});
