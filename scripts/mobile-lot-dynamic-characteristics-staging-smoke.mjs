#!/usr/bin/env node
/**
 * Staging smoke — category-aware LOT characteristics (P0.1).
 * Verifies schema retrieval, required-field publish path, and taxonomy isolation.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const SELLER = process.env.MOBILE_SELLER_EMAIL ?? "seller@demo.lot";
const BUYER = process.env.MOBILE_BUYER_EMAIL ?? "buyer@demo.lot";
const PASSWORD = process.env.MOBILE_TEST_PASSWORD ?? "demo1234";
const OUT = resolve("artifacts/mobile-lot-dynamic-characteristics/staging-smoke.json");

const JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

const CASES = [
  {
    id: "clothing-dress",
    productTypeId: "cmsoz2l37b4srj0dg",
    categoryId: "cmsoz1jxvu05pn2y8",
    fill: (chars) => fillRequiredCharacteristics(chars),
    forbiddenRequired: ["Мощность", "Производительность"],
  },
  {
    id: "power-tools",
    productTypeId: "cmsoz1oa9vw8rphtp",
    categoryId: "cmsmzs3hp000vy0w6q7fuponx",
    fill: (chars) => fillRequiredCharacteristics(chars),
    forbiddenRequired: ["Производительность"],
  },
  {
    id: "auto-accessories-phone-mount",
    productTypeId: "cmsoz2hj73n1gu0pd",
    categoryId: "cmsoz1je6yofifqw0",
    fill: () => [],
    forbiddenRequired: ["Мощность", "Производительность"],
  },
];

function fillRequiredCharacteristics(chars) {
  return chars
    .filter((c) => c.required)
    .map((def) => {
      if (def.type === "NUMBER") {
        const valueNumber = def.name === "Мощность" ? 800 : 1;
        return { definitionId: def.id, valueNumber };
      }
      const option = Array.isArray(def.options) && def.options.length ? String(def.options[0]) : "46";
      return { definitionId: def.id, valueText: option };
    });
}

async function json(path, init = {}, token) {
  const headers = { ...(init.headers ?? {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${STAGING}${path}`, { ...init, headers, signal: AbortSignal.timeout(30000) });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function login(email, attempts = 4) {
  for (let i = 0; i < attempts; i += 1) {
    const r = await json("/api/mobile/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", email, password: PASSWORD, deviceId: `lot-chars-${email}` }),
    });
    if (r.body?.accessToken) return r.body.accessToken;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500 * (i + 1)));
  }
  return null;
}

async function uploadImage(token) {
  const jpeg = Buffer.from(JPEG_BASE64, "base64");
  const form = new FormData();
  form.append("file", new Blob([jpeg], { type: "image/jpeg" }), "lot-chars.jpg");
  const res = await fetch(`${STAGING}/api/mobile/seller/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    signal: AbortSignal.timeout(30000),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, body };
}

async function resolveProductType(token, testCase) {
  if (testCase.productTypeId) {
    const mobileSchema = await json(
      `/api/mobile/seller/product-types/${encodeURIComponent(testCase.productTypeId)}/characteristics`,
      {},
      token,
    );
    if (mobileSchema.ok) {
      return {
        productTypeId: testCase.productTypeId,
        categoryId: testCase.categoryId ?? mobileSchema.body?.categoryId,
        productTypeName: mobileSchema.body?.productTypeName ?? testCase.productTypeId,
        characteristics: mobileSchema.body?.characteristics ?? [],
      };
    }
    const detail = await json(
      `/api/taxonomy/browse?productTypeId=${encodeURIComponent(testCase.productTypeId)}`,
      {},
      token,
    );
    if (!detail.ok) return null;
    return {
      productTypeId: testCase.productTypeId,
      categoryId: testCase.categoryId ?? detail.body?.categoryId ?? testCase.categoryPath?.at(-1),
      productTypeName: detail.body?.name ?? testCase.productTypeId,
      characteristics: detail.body?.characteristics ?? [],
    };
  }

  const categoryId = testCase.categoryPath[testCase.categoryPath.length - 1];
  const browse = await json(`/api/taxonomy/browse?categoryId=${encodeURIComponent(categoryId)}`, {}, token);
  if (!browse.ok) return null;
  const productType =
    (browse.body?.productTypes ?? []).find((pt) => testCase.productTypeMatch.test(pt.name)) ??
    browse.body?.productTypes?.[0];
  if (!productType?.id) return null;
  const detail = await json(
    `/api/taxonomy/browse?productTypeId=${encodeURIComponent(productType.id)}`,
    {},
    token,
  );
  return {
    productTypeId: productType.id,
    categoryId: detail.body?.categoryId ?? productType.categoryId ?? categoryId,
    productTypeName: productType.name,
    characteristics: detail.body?.characteristics ?? [],
  };
}

async function runCase(token, buyerToken, testCase) {
  const resolved = await resolveProductType(token, testCase);
  if (!resolved?.productTypeId) {
    return { id: testCase.id, verdict: "FAIL", reason: "productType not resolved" };
  }

  const requiredNames = resolved.characteristics.filter((c) => c.required).map((c) => c.name);
  const forbiddenHit = testCase.forbiddenRequired.filter((name) => requiredNames.includes(name));
  const characteristics = testCase.fill(resolved.characteristics);

  const title = `P01_CHARS_${testCase.id}_${Date.now()}`;
  const upload = await uploadImage(token);
  if (!upload.ok || !upload.body.url) {
    return { id: testCase.id, verdict: "FAIL", reason: "upload failed" };
  }

  const draftPayload = {
    title,
    description: `P0.1 characteristics smoke ${testCase.id}`,
    price: 1990,
    city: "Москва",
    condition: "NEW",
    categoryId: resolved.categoryId,
    productTypeId: resolved.productTypeId,
    images: [{ url: upload.body.url, pathname: upload.body.pathname ?? null }],
    stock: 1,
    status: "DRAFT",
    pickupEnabled: false,
    pickupPointIds: [],
    reservationEnabled: false,
    prepaymentPercent: 0,
    characteristics,
  };

  const created = await json(
    "/api/mobile/seller/products",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draftPayload),
    },
    token,
  );
  const productId = created.body?.product?.id ?? created.body?.id;
  if (!created.ok || !productId) {
    return { id: testCase.id, verdict: "FAIL", reason: `draft create failed ${created.status}` };
  }

  const published = await json(
    `/api/mobile/seller/products/${encodeURIComponent(productId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draftPayload, status: "ACTIVE" }),
    },
    token,
  );

  const publishOutcome = published.body?.publishOutcome ?? null;
  const moderationPending =
    published.status === 400 &&
    (published.body?.code === "MODERATION_PENDING" ||
      published.body?.code === "MODERATION_REQUIRED" ||
      String(published.body?.error ?? "").includes("проверк"));
  const characteristicsRejected = published.body?.code === "CHARACTERISTICS_REQUIRED";

  const sellerPending = await json("/api/mobile/seller/products?tab=pending", {}, token);
  const inPending = (sellerPending.body?.items ?? []).some((item) => item.id === productId);
  const catalog = await json(`/api/mobile/catalog/products?q=${encodeURIComponent(title)}`, {}, buyerToken);
  const buyerHit = (catalog.body?.items ?? []).some((item) => item.id === productId);

  const publishPass =
    published.ok || publishOutcome === "PENDING_REVIEW" || moderationPending || publishOutcome === "PUBLISHED";

  return {
    id: testCase.id,
    productType: resolved.productTypeName,
    requiredNames,
    forbiddenHit,
    characteristicsSent: characteristics.length,
    publishStatus: published.status,
    publishOutcome,
    publishErrorCode: published.body?.code ?? null,
    sellerPending: inPending ? "PASS" : "FAIL",
    buyerNotPublic: !buyerHit ? "PASS" : "FAIL",
    taxonomyIsolation: forbiddenHit.length === 0 ? "PASS" : "FAIL",
    publish: publishPass && !characteristicsRejected ? "PASS" : "FAIL",
    verdict:
      forbiddenHit.length === 0 && publishPass && !characteristicsRejected && inPending && !buyerHit
        ? "PASS"
        : "FAIL",
  };
}

async function main() {
  mkdirSync(resolve("artifacts/mobile-lot-dynamic-characteristics"), { recursive: true });
  const sellerToken = await login(SELLER);
  const buyerToken = await login(BUYER);
  if (!sellerToken) throw new Error("seller login failed");

  const results = [];
  for (const testCase of CASES) {
    results.push(await runCase(sellerToken, buyerToken, testCase));
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    staging: STAGING,
    cases: results,
    verdict: results.every((row) => row.verdict === "PASS") ? "PASS" : "FAIL",
    policy: {
      rc102: "BLOCKED_FOR_BETA",
      nextBuild: "READY_FOR_RC10.3_BUILD_AFTER_MERGE_DEPLOY",
    },
  };

  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (report.verdict !== "PASS") process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
