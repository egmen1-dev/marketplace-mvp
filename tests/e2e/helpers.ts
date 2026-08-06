import { expect, type Page, type Request, type Response } from "@playwright/test";

/**
 * Documented allowlist — Chrome/Next noise that is not an app regression.
 * Real app exceptions still fail via pageerror / unexpected console text.
 *
 * Hydration #418 was caused by ThemeToggle reading resolvedTheme for
 * aria-label/title before mount (server HTML ≠ first client paint).
 * Fixed in ThemeToggle — do not re-allowlist #418.
 */
const ALLOWED_CONSOLE_ERROR_PATTERNS: RegExp[] = [
  /Extra attributes from the server/i,
  /ResizeObserver loop/i,
  /^Failed to load resource: the server responded with a status of 404/i,
  // Optional Blob uploads may 503 when BLOB_READ_WRITE_TOKEN is unset (P2 infra)
  /^Failed to load resource: the server responded with a status of 503/i,
  /Failed to fetch RSC payload/i,
  /Falling back to browser navigation/i,
  /blocked by CORS policy/i,
  /net::ERR_FAILED/i,
  /net::ERR_ABORTED/i,
];

const ALLOWED_FAILED_REQUEST_PATTERNS: RegExp[] = [
  /\/favicon\.ico$/i,
  /_rsc=/i,
  /\/api\/uploads/i,
];

const ALLOWED_5XX_URL_PATTERNS: RegExp[] = [
  /\/api\/uploads/i,
  /images\.unsplash\.com/i,
];

export type PageErrorCollector = {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  serverErrors: string[];
  assertClean: () => void;
};

export function attachErrorCollector(page: Page): PageErrorCollector {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const serverErrors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (ALLOWED_CONSOLE_ERROR_PATTERNS.some((re) => re.test(text))) return;
    consoleErrors.push(text);
  });

  page.on("pageerror", (err) => {
    const message = err.message;
    if (ALLOWED_CONSOLE_ERROR_PATTERNS.some((re) => re.test(message))) return;
    pageErrors.push(message);
  });

  page.on("requestfailed", (req: Request) => {
    const url = req.url();
    if (ALLOWED_FAILED_REQUEST_PATTERNS.some((re) => re.test(url))) return;
    const failure = req.failure()?.errorText ?? "";
    if (/net::ERR_ABORTED|net::ERR_FAILED/i.test(failure)) return;
    failedRequests.push(`${req.method()} ${url} — ${failure}`);
  });

  page.on("response", (res: Response) => {
    const status = res.status();
    if (status < 500) return;
    const url = res.url();
    if (ALLOWED_5XX_URL_PATTERNS.some((re) => re.test(url))) return;
    if (ALLOWED_FAILED_REQUEST_PATTERNS.some((re) => re.test(url))) return;
    serverErrors.push(`${status} ${res.request().method()} ${url}`);
  });

  return {
    consoleErrors,
    pageErrors,
    failedRequests,
    serverErrors,
    assertClean() {
      expect(pageErrors, `pageerror: ${pageErrors.join("\n")}`).toEqual([]);
      expect(
        consoleErrors,
        `console.error: ${consoleErrors.join("\n")}`,
      ).toEqual([]);
      expect(serverErrors, `HTTP 5xx: ${serverErrors.join("\n")}`).toEqual([]);
      expect(
        failedRequests,
        `failed requests: ${failedRequests.join("\n")}`,
      ).toEqual([]);
    },
  };
}

export const DEMO = {
  sellerEmail: "seller@demo.lot",
  buyerEmail: "buyer@demo.lot",
  password: "demo1234",
} as const;

export async function signIn(
  page: Page,
  email: string,
  password: string = DEMO.password,
) {
  await page.goto("/auth/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Пароль").fill(password);
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).not.toHaveURL(/\/auth\/sign-in/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: /Application error/i }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Профиль" })).toBeVisible();
}

export async function signOut(page: Page) {
  // Clear session cookies — reliable across Base UI menu quirks.
  await page.context().clearCookies();
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Application error/i }),
  ).toHaveCount(0);
}

/** Open first catalog product PDP (not a card-only surface). */
export async function openFirstCatalogProduct(page: Page) {
  await page.goto("/catalog");
  const productLink = page.locator('main a[href^="/product/"]').first();
  await expect(productLink).toBeVisible({ timeout: 30_000 });
  await productLink.click();
  await expect(page).toHaveURL(/\/product\//, { timeout: 20_000 });
}

/** Primary add-to-cart on PDP (excludes similar-product cards). */
export function primaryAddToCart(page: Page) {
  return page.locator("main").getByRole("button", { name: "В корзину" }).first();
}

export function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}@e2e.lot`;
}
