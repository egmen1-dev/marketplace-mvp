import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const hookSource = readFileSync("apps/mobile/src/seller/use-lot-create-form.ts", "utf8");
const apiSource = readFileSync("apps/mobile/src/api/seller-lot.ts", "utf8");
const copySource = readFileSync("apps/mobile/src/seller/lot-create-copy.ts", "utf8");
const createSource = readFileSync("apps/mobile/app/sell/create.tsx", "utf8");
const reportSource = readFileSync("docs/product/SELLER_BETA_ACCEPTANCE_REPORT.md", "utf8");
const checklistSource = readFileSync("docs/mobile/EPIC_159_PHYSICAL_ACCEPTANCE_CHECKLIST.md", "utf8");

describe("EPIC 159 — seller publish without duplicate LOT", () => {
  it("updates existing savedProductId instead of always creating new LOT", () => {
    expect(apiSource).toContain("updateSellerLot");
    expect(hookSource).toContain("persistServerDraft");
    expect(hookSource).toContain("publishOnServer");
    expect(hookSource).toContain("publishSellerLot");
    expect(hookSource).toContain("draft.savedProductId");
  });
});

describe("EPIC 159 — publish success copy", () => {
  it("uses beta acceptance success messaging", () => {
    expect(copySource).toContain("Ваш ЛОТ теперь виден покупателям");
    expect(copySource).toContain('createAnother: "Создать ещё один"');
    expect(copySource).toContain("successSavedTitle");
    expect(createSource).toContain("savedForReview");
    expect(createSource).toContain("LOT_CREATE_COPY.successBody");
  });
});

describe("EPIC 159 — acceptance deliverables", () => {
  it("documents seller, buyer, order, update, and trust audit sections", () => {
    expect(reportSource).toContain("## 1. Seller journey");
    expect(reportSource).toContain("## 2. Buyer journey");
    expect(reportSource).toContain("## 3. Order lifecycle");
    expect(reportSource).toContain("## 4. Update flow");
    expect(reportSource).toContain("## 5. Found issues");
    expect(reportSource).toContain("## 6. Fixed issues");
    expect(reportSource).toContain("## 7. Deferred issues");
    expect(reportSource).toContain("READY_FOR_FIRST_BETA_USERS");
    expect(reportSource).toContain("Missing trust elements");
  });

  it("includes physical checklist with demo accounts", () => {
    expect(checklistSource).toContain("seller@demo.lot");
    expect(checklistSource).toContain("buyer@demo.lot");
    expect(checklistSource).toContain("Проверьте ЛОТ");
    expect(checklistSource).toContain("Доступно обновление");
  });
});
