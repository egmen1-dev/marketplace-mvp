#!/usr/bin/env node
/**
 * Post-deploy RC10.2 publish-truth staging smoke.
 * Requires PR #170 backend on staging (publishOutcome, seller detail GET, Bearer PDP).
 * Must reach real final publish state — NOT CHARACTERISTICS_REQUIRED.
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const SELLER = process.env.MOBILE_SELLER_EMAIL ?? "seller@demo.lot";
const BUYER = process.env.MOBILE_BUYER_EMAIL ?? "buyer@demo.lot";
const PASSWORD = process.env.MOBILE_TEST_PASSWORD ?? "demo1234";
const EXPECTED_SHA_PREFIX = (process.env.EXPECTED_RAILWAY_SHA ?? "e872ed8").slice(0, 7);
const OUT = resolve("artifacts/closed-beta-rc10.2/staging-publish-truth-smoke.json");

const JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

async function json(path, init = {}, token) {
  const headers = { ...(init.headers ?? {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${STAGING}${path}`, { ...init, headers, signal: AbortSignal.timeout(45000) });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function login(email) {
  const r = await json("/api/mobile/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email, password: PASSWORD, deviceId: `rc10.2-smoke-${email}` }),
  });
  return r.body?.accessToken;
}

async function uploadImage(token) {
  const jpeg = Buffer.from(JPEG_BASE64, "base64");
  const form = new FormData();
  form.append("file", new Blob([jpeg], { type: "image/jpeg" }), "rc10.2-publish-truth.jpg");
  const res = await fetch(`${STAGING}/api/mobile/seller/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    signal: AbortSignal.timeout(45000),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, body };
}

async function resolvePublishableType(token) {
  const template = await json("/api/products/cmsmzsjx0002xy0w60fa73kqf", {}, token);
  const productTypeId = template.body?.productType?.id;
  const categoryId = template.body?.category?.id ?? template.body?.productType?.categoryId;
  if (!productTypeId || !categoryId) throw new Error("template product type unavailable");
  const detail = await json(`/api/taxonomy/browse?productTypeId=${encodeURIComponent(productTypeId)}`, {}, token);
  if (!detail.ok) throw new Error("taxonomy detail unavailable");
  return { productTypeId, categoryId, characteristics: buildCharacteristics(detail.body?.characteristics ?? []) };
}

function buildCharacteristics(definitions) {
  const values = [];
  for (const def of definitions) {
    if (!def.required) continue;
    const entry = { definitionId: def.id };
    switch (def.type) {
      case "NUMBER":
      case "DECIMAL":
        entry.valueNumber = 750;
        break;
      case "BOOLEAN":
        entry.valueBoolean = true;
        break;
      case "ENUM":
      case "SELECT":
        entry.valueText = Array.isArray(def.options) && def.options.length > 0 ? String(def.options[0]) : "Другое";
        break;
      default:
        entry.valueText = `smoke-${def.slug ?? def.name ?? "value"}`;
    }
    values.push(entry);
  }
  return values;
}

function listHasTitle(items, title, id) {
  return (items ?? []).some((item) => item.id === id || item.title === title);
}

async function main() {
  mkdirSync(resolve("artifacts/closed-beta-rc10.2"), { recursive: true });

  const health = await json("/api/health");
  const railwaySha = health.body?.version?.commit ?? null;
  const railwayShaShort = railwaySha?.slice(0, 7) ?? null;
  const deployOk = railwayShaShort === EXPECTED_SHA_PREFIX;

  const title = `RC10_2_PHYSICAL_READY_${Date.now()}`;
  const sellerToken = await login(SELLER);
  const buyerToken = await login(BUYER);
  if (!sellerToken) throw new Error("seller login failed");

  const bootstrap = await json("/api/mobile/bootstrap", {}, sellerToken);
  const sellerPublishPolicy = bootstrap.body?.sellerPublish ?? null;

  const upload = await uploadImage(sellerToken);
  const photoUploadPass = upload.ok && Boolean(upload.body?.url);

  const taxonomy = await resolvePublishableType(sellerToken);
  const draftPayload = {
    title,
    description: "RC10.2 post-deploy publish truth smoke",
    price: 1990,
    city: "Москва",
    condition: "NEW",
    categoryId: taxonomy.categoryId,
    productTypeId: taxonomy.productTypeId,
    characteristics: taxonomy.characteristics,
    images: [{ url: upload.body.url, pathname: upload.body.pathname ?? null }],
    stock: 1,
    status: "DRAFT",
    pickupEnabled: false,
    pickupPointIds: [],
    reservationEnabled: false,
    prepaymentPercent: 0,
  };

  const created = await json(
    "/api/mobile/seller/products",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draftPayload) },
    sellerToken,
  );
  const productId = created.body?.product?.id ?? created.body?.id;
  const createPass = created.ok && Boolean(productId);

  const published = await json(
    `/api/mobile/seller/products/${encodeURIComponent(productId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draftPayload, status: "ACTIVE" }),
    },
    sellerToken,
  );

  const publishErrorCode = published.body?.code ?? null;
  const publishOutcome = published.body?.publishOutcome ?? null;
  const returnedStatus = published.body?.status ?? published.body?.product?.status ?? null;
  const moderationState = published.body?.moderationState ?? null;
  const isPublic = published.body?.isPublic ?? returnedStatus === "ACTIVE";
  const characteristicsBlocked = publishErrorCode === "CHARACTERISTICS_REQUIRED";

  const publishPass =
    !characteristicsBlocked &&
    (published.ok || publishOutcome === "PENDING_REVIEW" || publishOutcome === "PUBLISHED");

  const sellerListActive = await json("/api/mobile/seller/products?tab=active", {}, sellerToken);
  const sellerListPending = await json("/api/mobile/seller/products?tab=pending", {}, sellerToken);
  const sellerListDrafts = await json("/api/mobile/seller/products?tab=drafts", {}, sellerToken);
  const sellerListSold = await json("/api/mobile/seller/products?tab=sold", {}, sellerToken);

  const inActive = listHasTitle(sellerListActive.body?.items, title, productId);
  const inPending = listHasTitle(sellerListPending.body?.items, title, productId);
  const inDrafts = listHasTitle(sellerListDrafts.body?.items, title, productId);
  const inSold = listHasTitle(sellerListSold.body?.items, title, productId);
  const sellerVisible = inActive || inPending || inDrafts || inSold;

  const sellerDetailRes = await json(`/api/mobile/seller/products/${encodeURIComponent(productId)}`, {}, sellerToken);
  const sellerDetailPass =
    sellerDetailRes.ok &&
    sellerDetailRes.body?.id === productId &&
    Boolean(sellerDetailRes.body?.publishOutcome ?? sellerDetailRes.body?.status);

  const catalog = await json(`/api/mobile/catalog/products?q=${encodeURIComponent(title)}`, {}, buyerToken);
  const buyerCatalogHit = listHasTitle(catalog.body?.items, title, productId);
  const publicPdpBuyer = await json(`/api/products/${encodeURIComponent(productId)}`, {}, buyerToken);
  const publicPdpSellerBearer = await json(`/api/products/${encodeURIComponent(productId)}`, {}, sellerToken);

  const expectedPublished = publishOutcome === "PUBLISHED" || (isPublic && returnedStatus === "ACTIVE");
  const expectedPending =
    publishOutcome === "PENDING_REVIEW" ||
    moderationState === "PENDING_REVIEW" ||
    moderationState === "NEEDS_FIX";

  const buyerVisibilityPass = expectedPublished
    ? buyerCatalogHit && publicPdpBuyer.ok
    : expectedPending || !isPublic
      ? !buyerCatalogHit && !publicPdpBuyer.ok
      : !buyerCatalogHit;

  const inventoryTabPass = expectedPublished
    ? inActive
    : expectedPending
      ? inPending
      : inDrafts;

  const duplicateSave = await json(
    `/api/mobile/seller/products/${encodeURIComponent(productId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draftPayload, status: "DRAFT" }),
    },
    sellerToken,
  );
  await json(
    `/api/mobile/seller/products/${encodeURIComponent(productId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draftPayload, status: "ACTIVE", characteristics: taxonomy.characteristics }),
    },
    sellerToken,
  );
  const allSellerIds = new Set(
    [
      ...(sellerListActive.body?.items ?? []),
      ...(sellerListPending.body?.items ?? []),
      ...(sellerListDrafts.body?.items ?? []),
    ]
      .filter((item) => item.title === title)
      .map((item) => item.id),
  );

  const report = {
    generatedAt: new Date().toISOString(),
    staging: STAGING,
    title,
    expectedRailwaySha: EXPECTED_SHA_PREFIX,
    railwaySha: railwayShaShort,
    deployVerified: deployOk ? "PASS" : "FAIL",
    sellerPublishPolicy,
    createdId: productId ?? null,
    characteristicsCount: taxonomy.characteristics.length,
    photoUpload: photoUploadPass ? "PASS" : "FAIL",
    create: createPass ? "PASS" : "FAIL",
    publishRequest: publishPass ? "PASS" : "FAIL",
    publishStatus: published.status,
    publishErrorCode,
    returnedStatus,
    publishOutcome,
    moderationState,
    isPublic,
    sellerInventory: sellerVisible && inventoryTabPass ? "PASS" : "FAIL",
    sellerLists: { active: inActive, pending: inPending, drafts: inDrafts, sold: inSold },
    sellerDetail: sellerDetailPass ? "PASS" : "FAIL",
    sellerDetailEndpoint: sellerDetailRes.status,
    buyerVisibilityMatchesState: buyerVisibilityPass ? "PASS" : "FAIL",
    buyerCatalogHit,
    publicPdpBuyerStatus: publicPdpBuyer.status,
    publicPdpSellerBearerStatus: publicPdpSellerBearer.status,
    duplicateProtection: allSellerIds.size <= 1 ? "PASS" : "FAIL",
    duplicateIds: [...allSellerIds],
    duplicateSaveStatus: duplicateSave.status,
    branch:
      expectedPublished ? "PUBLISHED" : expectedPending ? "PENDING_REVIEW" : publishOutcome ?? returnedStatus ?? "UNKNOWN",
    verdict:
      deployOk &&
      photoUploadPass &&
      createPass &&
      publishPass &&
      sellerVisible &&
      inventoryTabPass &&
      sellerDetailPass &&
      buyerVisibilityPass &&
      allSellerIds.size <= 1
        ? "PASS"
        : "FAIL",
  };

  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (report.verdict !== "PASS") process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
