/**
 * MVP-AUDIT-001 — staging reality audit runner.
 * Usage: BASE_URL=https://web-production-e56fb.up.railway.app node scripts/mvp-audit-001.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE =
  process.env.BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const OUT = process.env.OUT_DIR ?? "/opt/cursor/artifacts";
const SHOTS = path.join(OUT, "screenshots");

const ADMIN = { email: "admin@demo.lot", password: "demo1234" };
const SELLER = { email: "seller@demo.lot", password: "demo1234" };
const BUYER = { email: "buyer@demo.lot", password: "demo1234" };

const VK_UA =
  "Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/112.0.5615.136 Mobile Safari/537.36 VKAndroidApp/8.15-12345";

async function fetchJson(urlPath, init) {
  const res = await fetch(`${BASE}${urlPath}`, init);
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body, ok: res.ok };
}

async function signIn(page, email, password) {
  await page.goto(`${BASE}/auth/sign-in`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Пароль").fill(password);
  await page.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL((url) => !url.pathname.includes("/auth/sign-in"), {
    timeout: 30_000,
  });
}

async function adminPageStatus(page, route, heading) {
  await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const url = page.url();
  const isLogin = url.includes("/auth/sign-in");
  const hasError = await page
    .getByRole("heading", { name: /Application error/i })
    .count();
  let headingVisible = false;
  if (heading) {
    headingVisible = await page
      .getByRole("heading", { name: heading })
      .first()
      .isVisible()
      .catch(() => false);
  }
  return {
    route,
    finalUrl: url,
    status: isLogin
      ? "redirect_login"
      : hasError > 0
        ? "error"
        : heading
          ? headingVisible
            ? "200_ok"
            : "200_unknown"
          : "200_ok",
  };
}

async function main() {
  await mkdir(SHOTS, { recursive: true });
  const report = {
    baseUrl: BASE,
    auditedAt: new Date().toISOString(),
    deployment: {},
    homepage: {},
    admin: [],
    ads: {},
    features: {},
    buyerJourney: [],
    sellerJourney: [],
    database: {},
  };

  const version = await fetchJson("/api/version");
  const health = await fetchJson("/api/health");
  report.deployment = {
    version: version.body,
    health: health.body,
    versionStatus: version.status,
    healthStatus: health.status,
  };

  const analyticsPost = await fetchJson("/api/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "landing_view",
      route: "/",
      visitorId: "mvp-audit-001",
    }),
  });
  report.features.analyticsPost = {
    status: analyticsPost.status,
    ok: analyticsPost.body?.ok === true,
  };

  const sitemapRes = await fetch(`${BASE}/sitemap.xml`);
  const sitemapText = await sitemapRes.text();
  report.features.sitemap = {
    status: sitemapRes.status,
    hasLocalhost: sitemapText.includes("localhost"),
    urlCount: (sitemapText.match(/<url>/g) ?? []).length,
    sampleLoc: sitemapText.match(/<loc>([^<]+)<\/loc>/)?.[1] ?? null,
  };

  const homeHtmlRes = await fetch(`${BASE}/`);
  const homeHtml = await homeHtmlRes.text();
  report.homepage.markers = {
    design001_homeMarketplace: homeHtml.includes("home-marketplace"),
    design001_heroTitle: homeHtml.includes("Покупайте выгодно"),
    preDesign001_heroTitle: homeHtml.includes(
      "Покупайте и продавайте всё в одном месте",
    ),
    heroSearchTestId: homeHtml.includes('data-testid="home-hero-search"'),
    popularCategories: homeHtml.includes("Популярные категории"),
    marketplaceStats: homeHtml.includes("Товара") || homeHtml.includes("товар"),
    trustSection: homeHtml.includes("Безопасная оплата"),
    sellerCtaDesign001: homeHtml.includes("HomeSellerCta") || homeHtml.includes("Стать продавцом"),
  };

  const browser = await chromium.launch();
  const desktop = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: "ru-RU",
  });
  const desktopPage = await desktop.newPage();
  await desktopPage.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await desktopPage.waitForTimeout(600);
  await desktopPage.screenshot({
    path: path.join(SHOTS, "mvp-audit-home-desktop-1920.png"),
  });
  report.homepage.desktopScreenshot =
    "mvp-audit-home-desktop-1920.png";

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: VK_UA,
    isMobile: true,
    locale: "ru-RU",
  });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(600);
  await mobilePage.screenshot({
    path: path.join(SHOTS, "mvp-audit-home-mobile-390.png"),
  });
  report.homepage.mobileScreenshot = "mvp-audit-home-mobile-390.png";
  await mobile.close();
  await desktop.close();

  const adminCtx = await browser.newContext({ locale: "ru-RU" });
  const adminPage = await adminCtx.newPage();
  await signIn(adminPage, ADMIN.email, ADMIN.password);

  const adminRoutes = [
    ["/admin", null],
    ["/admin/users", /Пользователи|Users/i],
    ["/admin/products", /Товары|Products/i],
    ["/admin/orders", /Заказы|Orders/i],
    ["/admin/analytics", /Analytics|Аналитика/i],
    ["/admin/conversion", /Conversion|Конверс/i],
    ["/admin/ads", /Ads readiness/i],
    ["/admin/seo", /SEO/i],
    ["/admin/categories", /Категории/i],
    ["/admin/sellers", /Продавцы/i],
    ["/admin/taxonomy/import", /Taxonomy|Import|Импорт/i],
    ["/admin/ai-understanding", /AI|Understanding/i],
  ];

  for (const [route, heading] of adminRoutes) {
    report.admin.push(await adminPageStatus(adminPage, route, heading));
  }

  await adminPage.goto(`${BASE}/admin/ads`, { waitUntil: "networkidle" });
  report.ads.adminPanel = {
    panelVisible: await adminPage
      .getByTestId("admin-ads-panel")
      .isVisible()
      .catch(() => false),
    readyFilter: await adminPage
      .getByTestId("ads-filter-ready")
      .isVisible()
      .catch(() => false),
    blockedFilter: await adminPage
      .getByTestId("ads-filter-blocked")
      .isVisible()
      .catch(() => false),
    qualityScoreText: await adminPage
      .getByText(/quality score/i)
      .first()
      .isVisible()
      .catch(() => false),
    promotionControls: await adminPage
      .getByRole("button", { name: /запустить|продвиж|кампан/i })
      .count(),
  };
  await adminPage.screenshot({
    path: path.join(SHOTS, "mvp-audit-admin-ads.png"),
  });

  await adminPage.goto(`${BASE}/admin/conversion`, { waitUntil: "networkidle" });
  report.features.conversionAdmin = {
    pageOk: await adminPage
      .getByRole("heading", { name: /Conversion|Конверс/i })
      .first()
      .isVisible()
      .catch(() => false),
    lowQualitySection: await adminPage
      .getByText(/quality score|низкий/i)
      .first()
      .isVisible()
      .catch(() => false),
  };

  await adminPage.goto(`${BASE}/admin/analytics`, { waitUntil: "networkidle" });
  report.features.analyticsAdmin = {
    pageOk: await adminPage
      .getByRole("heading", { name: /Analytics|Аналитика/i })
      .first()
      .isVisible()
      .catch(() => false),
    funnelMention: await adminPage.getByText(/funnel|воронк/i).count(),
  };

  await adminPage.goto(`${BASE}/admin/seo`, { waitUntil: "networkidle" });
  report.features.seoAdmin = {
    pageOk: await adminPage
      .getByRole("heading", { name: /SEO/i })
      .first()
      .isVisible()
      .catch(() => false),
  };

  const catalogRes = await fetchJson("/api/catalog/stats").catch(() => null);
  report.database.catalogStatsApi = catalogRes;

  await adminPage.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  const adminText = await adminPage.locator("main").innerText();
  const countMatch = adminText.match(/(\d+)\s*товар/i);
  report.database.adminDashboardHint = countMatch?.[0] ?? null;

  await adminCtx.close();

  const buyerCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "ru-RU",
  });
  const buyerPage = await buyerCtx.newPage();

  async function step(name, fn) {
    try {
      await fn();
      report.buyerJourney.push({ step: name, status: "ok" });
    } catch (err) {
      report.buyerJourney.push({
        step: name,
        status: "fail",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await step("homepage", async () => {
    await buyerPage.goto(`${BASE}/`);
    await buyerPage.getByRole("heading", { level: 1 }).waitFor({ timeout: 10_000 });
  });
  await step("catalog", async () => {
    await buyerPage.goto(`${BASE}/catalog`);
    await buyerPage.getByRole("heading", { name: /Каталог/i }).waitFor({
      timeout: 15_000,
    });
  });
  await step("product_pdp", async () => {
    const link = buyerPage.locator('main a[href^="/product/"]').first();
    await link.waitFor({ state: "visible", timeout: 15_000 });
    await link.click();
    await buyerPage.waitForURL(/\/product\//);
    await buyerPage.locator("main h1").first().waitFor({ timeout: 15_000 });
  });
  await step("add_to_cart", async () => {
    const btn = buyerPage
      .locator("main")
      .getByRole("button", { name: "В корзину" })
      .first();
    await btn.waitFor({ state: "visible", timeout: 10_000 });
    await btn.click();
  });
  await step("cart", async () => {
    await buyerPage.goto(`${BASE}/cart`);
    await buyerPage.getByRole("heading", { name: /Корзина/i }).waitFor({
      timeout: 15_000,
    });
  });
  await step("sign_in_buyer", async () => {
    await signIn(buyerPage, BUYER.email, BUYER.password);
  });
  await step("checkout_page", async () => {
    await buyerPage.goto(`${BASE}/checkout`);
    const heading = buyerPage.getByRole("heading", {
      name: /Оформление|Checkout/i,
    });
    await heading.waitFor({ timeout: 15_000 });
  });

  await buyerCtx.close();

  const sellerCtx = await browser.newContext({ locale: "ru-RU" });
  const sellerPage = await sellerCtx.newPage();

  async function sellerStep(name, fn) {
    try {
      await fn();
      report.sellerJourney.push({ step: name, status: "ok" });
    } catch (err) {
      report.sellerJourney.push({
        step: name,
        status: "fail",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await sellerStep("seller_sign_in", async () => {
    await signIn(sellerPage, SELLER.email, SELLER.password);
  });
  await sellerStep("seller_products_list", async () => {
    await sellerPage.goto(`${BASE}/account/products`);
    await sellerPage
      .getByRole("heading", { name: /Мои товары|Товары/i })
      .first()
      .waitFor({ timeout: 15_000 });
  });
  await sellerStep("seller_create_product_page", async () => {
    await sellerPage.goto(`${BASE}/account/products/new`);
    await sellerPage
      .getByRole("heading", { name: /Новый товар|Создание/i })
      .first()
      .waitFor({ timeout: 15_000 });
  });
  await sellerStep("ai_understanding_ui", async () => {
    const aiBtn = sellerPage.getByRole("button", {
      name: /AI|понимание|заполн/i,
    });
    const aiText = sellerPage.getByText(/AI|понимание товара/i);
    report.features.aiSellerUi = {
      buttonCount: await aiBtn.count(),
      textCount: await aiText.count(),
    };
    if ((await aiBtn.count()) === 0 && (await aiText.count()) === 0) {
      throw new Error("AI understanding controls not visible on create form");
    }
  });
  await sellerStep("product_quality_card", async () => {
    await sellerPage.goto(`${BASE}/account/products`);
    const edit = sellerPage.locator('a[href*="/account/products/"]').first();
    await edit.waitFor({ state: "visible", timeout: 15_000 });
    await edit.click();
    report.features.sellerQualityCard = await sellerPage
      .getByTestId("product-quality-card")
      .isVisible()
      .catch(() => false);
    report.features.sellerAdBanner = await sellerPage
      .getByText(/продвижен|реклам|quality score/i)
      .first()
      .isVisible()
      .catch(() => false);
    report.features.sellerPromotionButton = await sellerPage
      .getByRole("button", { name: /продвиж|реклам|promot/i })
      .count();
  });
  await sellerStep("published_product_public_view", async () => {
    await sellerPage.goto(`${BASE}/catalog`);
    const link = sellerPage.locator('main a[href^="/product/"]').first();
    await link.click();
    await sellerPage.waitForURL(/\/product\//);
    report.features.pdpPromotedBadge = await sellerPage
      .getByText(/promoted|реклам|продвига/i)
      .count();
  });

  await sellerCtx.close();
  await browser.close();

  const outJson = path.join(OUT, "mvp-audit-001-report.json");
  await writeFile(outJson, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log("Saved", outJson);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
