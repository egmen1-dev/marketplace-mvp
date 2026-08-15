import { expect, test } from "@playwright/test";

const STAGING =
  process.env.PLAYWRIGHT_BASE_URL?.includes("railway.app") ?? false;

test.describe("FINANCIAL-E2E ranking advisory staging", () => {
  test.skip(!STAGING, "Set PLAYWRIGHT_BASE_URL to Railway staging");

  test("ranking advisory page loads on staging", async ({ request }) => {
    const res = await request.get("/account/ranking", { maxRedirects: 0 });
    expect([200, 307, 308]).toContain(res.status());
  });

  test("admin ranking lab loads for authenticated admin session", async ({
    page,
    request,
  }) => {
    test.skip(true, "Requires admin session — run in manual acceptance");
    await page.goto("/admin/ranking");
    expect((await request.get("/api/health")).ok()).toBeTruthy();
  });
});
