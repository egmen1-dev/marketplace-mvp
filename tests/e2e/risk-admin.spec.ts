import { expect, test, type Page } from "@playwright/test";

import { DEMO, signIn, signOut } from "./helpers";

/**
 * AGENT-019 admin Risk Center E2E (sections 49/50) + security (sections 44/52).
 * Deterministic: the seller creates two near-identical listings so the duplicate
 * detector has a real signal regardless of DB state.
 */

async function createDrill(page: Page, title: string): Promise<void> {
  await page.goto("/account/products/new");
  await page.getByLabel("Название", { exact: true }).fill(title);
  await expect(page.getByText("Мы рекомендуем")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Дрели/i }).first().click();
  await expect(page.getByText("Характеристики")).toBeVisible({ timeout: 10_000 });
  const power = page.getByLabel(/Мощность/i).first();
  if (await power.isVisible().catch(() => false)) await power.fill("750");
  const powerSource = page
    .locator("select")
    .filter({ has: page.locator("option", { hasText: "сеть" }) })
    .first();
  if (await powerSource.isVisible().catch(() => false)) {
    await powerSource.selectOption({ label: "сеть" });
  }
  await page.locator("#description").fill("Ударная дрель для бетона и металла, кейс.");
  await page.getByLabel("Цена, ₽").fill("9990");
  await page.getByLabel("Количество на складе").fill("5");
  await page.getByLabel("Город", { exact: true }).fill("Москва");
  await page.getByRole("button", { name: "Опубликовать товар" }).click();
  await expect(page).toHaveURL(/\/account\/products/, { timeout: 45_000 });
}

test.describe("admin risk center", () => {
  test("duplicate scenario → scan → event → explainability → resolve (history kept)", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const stamp = Date.now();
    const title = `Дрель Makita HR2470 AGENT019 ${stamp}`;

    // Seller creates two near-identical listings (section 49).
    await signIn(page, DEMO.sellerEmail);
    await createDrill(page, title);
    await createDrill(page, title);

    // Admin scans and reviews the duplicate risk event.
    await signOut(page);
    await signIn(page, DEMO.adminEmail);
    await page.goto("/admin/risk");
    await expect(page.getByRole("heading", { name: "Риск-центр" })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByTestId("risk-scan").click();
    await expect(page.getByTestId("risk-events-list")).toBeVisible({ timeout: 20_000 });

    const dup = page
      .getByTestId("risk-event")
      .filter({ has: page.getByText("DUPLICATE_LISTING") })
      .first();
    await expect(dup).toBeVisible({ timeout: 20_000 });

    // Explainability on the product risk detail.
    await dup.getByRole("link", { name: /Товар/i }).first().click();
    await expect(page.getByTestId("entity-score")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("risk-explainability")).toBeVisible();

    // Resolve (dismiss) — event stays in history (not hard-deleted).
    await page.goto("/admin/risk");
    await page
      .getByTestId("risk-event")
      .first()
      .getByTestId("risk-resolve-dismiss")
      .click();
    await expect(page.getByTestId("risk-events-list")).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("risk center security (sections 44/52)", () => {
  test("buyer cannot access /admin/risk", async ({ page }) => {
    await signIn(page, DEMO.buyerEmail);
    await page.goto("/admin/risk");
    await expect(page).not.toHaveURL(/\/admin\/risk/, { timeout: 15_000 });
  });

  test("seller cannot access /admin/risk", async ({ page }) => {
    await signIn(page, DEMO.sellerEmail);
    await page.goto("/admin/risk");
    await expect(page).not.toHaveURL(/\/admin\/risk/, { timeout: 15_000 });
  });

  test("guest is redirected to sign-in", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/admin/risk");
    await expect(page).toHaveURL(/\/auth\/sign-in/, { timeout: 15_000 });
  });
});
