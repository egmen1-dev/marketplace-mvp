import { expect, type Page, type Request, type Response } from "@playwright/test";

/**
 * Documented allowlist — Chrome/Next noise that is not an app regression.
 * Real app exceptions still fail via pageerror / unexpected console text.
 *
 * Hydration #418 must NOT be allowlisted. Root causes (locale formatting,
 * theme before mount, cart badge) are fixed in components — keep them fixed.
 */
const ALLOWED_CONSOLE_ERROR_PATTERNS: RegExp[] = [
  /Extra attributes from the server/i,
  /ResizeObserver loop/i,
  /^Failed to load resource: the server responded with a status of 404/i,
  // Auth.js / session polls during sign-out can 401 briefly (not an app bug)
  /^Failed to load resource: the server responded with a status of 401/i,
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
  reset: () => void;
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
    reset() {
      consoleErrors.length = 0;
      pageErrors.length = 0;
      failedRequests.length = 0;
      serverErrors.length = 0;
    },
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
  /** Second seller store (isolation tests). */
  sellerBEmail: "toolspro@demo.lot",
  buyerEmail: "buyer@demo.lot",
  adminEmail: "admin@demo.lot",
  password: "demo1234",
} as const;

export type AuthSessionPayload = {
  user?: { email?: string | null; name?: string | null } | null;
};

/** Auth.js session endpoint — used to prove identity after sign-in/out. */
export async function getAuthSession(page: Page): Promise<AuthSessionPayload> {
  const res = await page.request.get("/api/auth/session");
  if (!res.ok()) return {};
  const data = (await res.json()) as AuthSessionPayload | null;
  return data ?? {};
}

export async function expectSessionEmail(page: Page, email: string | null) {
  await expect
    .poll(
      async () => {
        const session = await getAuthSession(page);
        return session?.user?.email ?? null;
      },
      { timeout: 15_000 },
    )
    .toBe(email);
}

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
  await expectSessionEmail(page, email);
}

export async function signOut(page: Page) {
  // Double cookie wipe around navigation — staging Auth.js can re-emit cookies
  // on the first hit after CSRF/sign-out (root cause of seller→buyer identity races).
  await page.context().clearCookies();
  await page.goto("/auth/sign-in", { waitUntil: "domcontentloaded" });
  await page.context().clearCookies();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 15_000 });
  await expect
    .poll(
      async () => (await getAuthSession(page))?.user?.email ?? null,
      { timeout: 20_000, intervals: [250, 500, 1000, 2000] },
    )
    .toBeNull();
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

/** Empty authenticated cart via API (avoids mixed-seller pickup blocks in e2e). */
export async function clearCart(page: Page) {
  const res = await page.request.get("/api/cart");
  if (!res.ok()) return;
  const data = (await res.json()) as {
    items?: { productId: string }[];
  };
  for (const item of data.items ?? []) {
    await page.request.delete(
      `/api/cart?productId=${encodeURIComponent(item.productId)}`,
    );
  }
}

export type PickupFixture = {
  marker: string;
  productId: string;
  productPath: string;
  title: string;
  pickupPointId: string;
  pickupPointName: string;
  prepaymentPercent: number;
  price: number;
  stock: number;
  sellerUserId: string;
  sellerProfileId: string;
  sellerEmail: string;
  buyerEmail: string;
};

function e2eSecret(): string {
  const secret = process.env.E2E_FIXTURE_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "E2E_FIXTURE_SECRET is required for deterministic pickup fixtures",
    );
  }
  return secret;
}

export function uniquePickupMarker(suffix?: string): string {
  const id =
    suffix ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `E2E-PICKUP-${id}`;
}

/** Create isolated pickup product via server fixture (no taxonomy UI). */
export async function createPickupFixture(
  page: Page,
  opts?: {
    marker?: string;
    prepaymentPercent?: number;
    price?: number;
    stock?: number;
  },
): Promise<PickupFixture> {
  const marker = opts?.marker ?? uniquePickupMarker();
  const res = await page.request.post("/api/e2e/pickup-fixture", {
    headers: { "x-e2e-secret": e2eSecret() },
    data: {
      marker,
      prepaymentPercent: opts?.prepaymentPercent ?? 20,
      price: opts?.price ?? 10_000,
      stock: opts?.stock ?? 3,
    },
  });
  expect(
    res.ok(),
    `pickup fixture create failed: ${res.status()} ${await res.text()}`,
  ).toBeTruthy();
  return (await res.json()) as PickupFixture;
}

export async function cleanupPickupFixture(page: Page, marker: string) {
  const res = await page.request.delete(
    `/api/e2e/pickup-fixture?marker=${encodeURIComponent(marker)}`,
    { headers: { "x-e2e-secret": e2eSecret() } },
  );
  expect(res.ok(), `pickup fixture cleanup failed: ${res.status()}`).toBeTruthy();
}
