import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

import { DEMO, attachErrorCollector, signIn } from "./helpers";

/** Minimal valid 1×1 JPEG */
const JPEG_BYTES = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEABj8Cf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8hf//Z",
  "base64",
);

function writeTempJpeg(): string {
  const file = path.join(os.tmpdir(), `lot-e2e-${Date.now()}.jpg`);
  fs.writeFileSync(file, JPEG_BYTES);
  return file;
}

function writeTempTxt(): string {
  const file = path.join(os.tmpdir(), `lot-e2e-${Date.now()}.txt`);
  fs.writeFileSync(file, "not an image");
  return file;
}

async function mockUploadsConfigured(page: import("@playwright/test").Page) {
  await page.route("**/api/uploads", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          maxCount: 10,
          maxBytes: 20 * 1024 * 1024,
          mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
          configured: true,
          // Intentionally omit productPathPrefix — page must supply pathPrefix prop.
          productPathPrefix: null,
          avatarPathPrefix: "avatars/e2e-user/",
        }),
      });
      return;
    }
    if (method === "DELETE") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ clientToken: "test" }),
    });
  });
}

test.describe("product image upload", () => {
  test("invalid image shows user-friendly error", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await mockUploadsConfigured(page);

    await page.goto("/account/products/new");
    await expect(page.getByTestId("product-image-input")).toBeAttached({
      timeout: 20_000,
    });

    const bad = writeTempTxt();
    try {
      await page.getByTestId("product-image-input").setInputFiles(bad);
      await expect(page.getByTestId("product-image-error")).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByTestId("product-image-error")).toContainText(
        /JPEG|PNG|WebP|GIF|тип|файл/i,
      );
      await expect(page.getByTestId("product-image-error")).not.toContainText(
        /BLOB_|stack|process\.env/i,
      );
    } finally {
      fs.unlinkSync(bad);
    }

    errors.assertClean();
  });

  test("valid image upload succeeds via client-direct flow", async ({
    page,
  }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);
    await mockUploadsConfigured(page);

    // Bypass real Blob PUT — assert UI wiring of POST token path + result URL.
    await page.addInitScript(() => {
      (
        window as Window & {
          __lotUploadImage?: (
            file: File,
            options: { pathPrefix: string; purpose: string },
          ) => Promise<{ url: string; pathname: string }>;
        }
      ).__lotUploadImage = async (file, options) => {
        if (!options.pathPrefix.startsWith("products/")) {
          throw new Error("bad prefix");
        }
        if (!file.size) throw new Error("empty");
        return {
          url: "https://example.com/products/e2e-test.jpg",
          pathname: `${options.pathPrefix}e2e-test.jpg`,
        };
      };
    });

    await page.goto("/account/products/new");
    await expect(page.getByTestId("product-image-input")).toBeEnabled({
      timeout: 20_000,
    });

    const jpeg = writeTempJpeg();
    try {
      await page.getByTestId("product-image-input").setInputFiles(jpeg);
      await expect(page.getByRole("img", { name: /Фото 1/i })).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByTestId("product-image-error")).toHaveCount(0);
    } finally {
      fs.unlinkSync(jpeg);
    }

    errors.assertClean();
  });

  test("unavailable storage shows friendly message", async ({ page }) => {
    const errors = attachErrorCollector(page);
    await signIn(page, DEMO.sellerEmail);

    await page.route("**/api/uploads", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            maxCount: 10,
            maxBytes: 20 * 1024 * 1024,
            mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
            configured: false,
          }),
        });
        return;
      }
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Загрузка изображений временно недоступна",
          code: "NOT_CONFIGURED",
        }),
      });
    });

    await page.goto("/account/products/new");
    await expect(page.getByTestId("product-image-error")).toContainText(
      "Загрузка изображений временно недоступна",
      { timeout: 20_000 },
    );
    await expect(page.getByTestId("product-image-error")).not.toContainText(
      /BLOB_|TOKEN|stack/i,
    );

    errors.assertClean();
  });
});
