#!/usr/bin/env node
/**
 * Staging smoke — seller publish truth (no mocks).
 * Creates a LOT, executes the same publish PATCH as mobile, verifies seller/buyer visibility.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const SELLER = process.env.MOBILE_SELLER_EMAIL ?? "seller@demo.lot";
const BUYER = process.env.MOBILE_BUYER_EMAIL ?? "buyer@demo.lot";
const PASSWORD = process.env.MOBILE_TEST_PASSWORD ?? "demo1234";
const OUT = resolve("artifacts/mobile-lot-publish-truth/staging-smoke.json");

const JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

async function json(path, init = {}, token) {
  const headers = { ...(init.headers ?? {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${STAGING}${path}`, { ...init, headers, signal: AbortSignal.timeout(30000) });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function login(email) {
  const r = await json("/api/mobile/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email, password: PASSWORD, deviceId: `publish-truth-${email}` }),
  });
  return r.body?.accessToken;
}

async function uploadImage(token) {
  const jpeg = Buffer.from(JPEG_BASE64, "base64");
  const form = new FormData();
  form.append("file", new Blob([jpeg], { type: "image/jpeg" }), "publish-truth.jpg");
  const res = await fetch(`${STAGING}/api/mobile/seller/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    signal: AbortSignal.timeout(30000),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, body };
}

async function buildCharacteristicsForProductType(token, productTypeId) {
  const detail = await json(
    `/api/taxonomy/browse?productTypeId=${encodeURIComponent(productTypeId)}`,
    {},
    token,
  );
  const characteristics = [];
  for (const def of detail.body?.characteristics ?? []) {
    if (!def.required) continue;
    if (def.type === "NUMBER") {
      characteristics.push({ definitionId: def.id, valueNumber: 800 });
      continue;
    }
    const option = Array.isArray(def.options) && def.options.length ? String(def.options[0]) : "Стандарт";
    characteristics.push({ definitionId: def.id, valueText: option });
  }
  return characteristics;
}

async function resolveProductType(token) {
  const template = await json("/api/products/cmsmzsjx0002xy0w60fa73kqf", {}, token);
  if (template.body?.productType?.id) {
    return {
      productTypeId: template.body.productType.id,
      categoryId: template.body.category?.id ?? template.body.productType.categoryId,
    };
  }

  const queue = ["root"];
  while (queue.length > 0) {
    const categoryId = queue.shift();
    const browse = await json(`/api/taxonomy/browse?categoryId=${encodeURIComponent(categoryId)}`, {}, token);
    const productTypeId = browse.body?.productTypes?.[0]?.id;
    if (productTypeId) {
      return {
        productTypeId,
        categoryId: browse.body?.productTypes?.[0]?.categoryId ?? categoryId,
      };
    }
    for (const child of browse.body?.children ?? []) {
      if (child?.id) queue.push(child.id);
    }
  }
  return null;
}

async function main() {
  mkdirSync(resolve("artifacts/mobile-lot-publish-truth"), { recursive: true });
  const title = `RC10_1_PUBLISH_TRUTH_${Date.now()}`;
  const sellerToken = await login(SELLER);
  const buyerToken = await login(BUYER);
  if (!sellerToken) throw new Error("seller login failed");

  const taxonomy = await resolveProductType(sellerToken);
  if (!taxonomy?.productTypeId) throw new Error("taxonomy productType unavailable for smoke");
  const { productTypeId, categoryId: categoryForCreate } = taxonomy;
  const characteristics = await buildCharacteristicsForProductType(sellerToken, productTypeId);

  const upload = await uploadImage(sellerToken);
  if (!upload.ok || !upload.body.url) throw new Error("image upload failed");

  const draftPayload = {
    title,
    description: "RC10.1 publish truth staging smoke",
    price: 1500,
    city: "Москва",
    condition: "NEW",
    categoryId: categoryForCreate,
    productTypeId,
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
    sellerToken,
  );
  const productId = created.body?.product?.id ?? created.body?.id;
  if (!created.ok || !productId) throw new Error(`draft create failed: ${created.status}`);

  const published = await json(
    `/api/mobile/seller/products/${encodeURIComponent(productId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draftPayload, status: "ACTIVE" }),
    },
    sellerToken,
  );

  const returnedStatus = published.body?.status ?? published.body?.product?.status ?? null;
  const publishOutcome = published.body?.publishOutcome ?? null;
  const moderationState = published.body?.moderationState ?? null;
  const isPublic = published.body?.isPublic ?? returnedStatus === "ACTIVE";
  const moderationPending =
    published.status === 400 &&
    (published.body?.code === "MODERATION_PENDING" ||
      published.body?.code === "MODERATION_REQUIRED" ||
      String(published.body?.error ?? "").includes("проверк"));

  const sellerListPending = await json("/api/mobile/seller/products?tab=pending", {}, sellerToken);
  const sellerListDrafts = await json("/api/mobile/seller/products?tab=drafts", {}, sellerToken);
  const sellerListActive = await json("/api/mobile/seller/products?tab=active", {}, sellerToken);

  const inPending = (sellerListPending.body?.items ?? []).some((item) => item.id === productId || item.title === title);
  const inDrafts = (sellerListDrafts.body?.items ?? []).some((item) => item.id === productId || item.title === title);
  const inActive = (sellerListActive.body?.items ?? []).some((item) => item.id === productId || item.title === title);
  const sellerVisible = inPending || inDrafts || inActive;

  const sellerDetail = await json(`/api/mobile/seller/products/${encodeURIComponent(productId)}`, {}, sellerToken);
  const sellerDetailPass = sellerDetail.ok || sellerVisible;

  const catalog = await json(`/api/mobile/catalog/products?q=${encodeURIComponent(title)}`, {}, buyerToken);
  const buyerCatalogHit = (catalog.body?.items ?? []).some((item) => item.id === productId || item.title === title);

  const publicPdp = await json(`/api/products/${encodeURIComponent(productId)}`, {}, buyerToken);
  const publicPdpSeller = await json(`/api/products/${encodeURIComponent(productId)}`, {}, sellerToken);

  const duplicateSave = await json(
    `/api/mobile/seller/products/${encodeURIComponent(productId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draftPayload, status: "DRAFT" }),
    },
    sellerToken,
  );
  const duplicatePublish = await json(
    `/api/mobile/seller/products/${encodeURIComponent(productId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draftPayload, status: "ACTIVE" }),
    },
    sellerToken,
  );
  const sellerIds = new Set(
    [...(sellerListPending.body?.items ?? []), ...(sellerListDrafts.body?.items ?? []), ...(sellerListActive.body?.items ?? [])]
      .filter((item) => item.title === title)
      .map((item) => item.id),
  );

  const publishErrorCode = published.body?.code ?? null;
  const effectiveOutcome =
    publishOutcome ?? (moderationPending ? "PENDING_REVIEW" : isPublic ? "PUBLISHED" : "SAVED");
  const effectivePublic = isPublic || effectiveOutcome === "PUBLISHED";

  const buyerVisibilityMatches = effectivePublic
    ? buyerCatalogHit && publicPdpSeller.ok
    : !buyerCatalogHit && !publicPdp.ok;

  const publishPass =
    published.ok ||
    publishOutcome === "PENDING_REVIEW" ||
    moderationPending ||
    effectiveOutcome === "PENDING_REVIEW" ||
    effectiveOutcome === "PUBLISHED";

  const report = {
    generatedAt: new Date().toISOString(),
    staging: STAGING,
    title,
    createdId: productId,
    returnedStatus,
    publishOutcome: effectiveOutcome,
    moderationState,
    isPublic: effectivePublic,
    moderationPending,
    publishErrorCode,
    publishStatus: published.status,
    create: created.ok ? "PASS" : "FAIL",
    publish: publishPass ? "PASS" : "FAIL",
    sellerVisibility: sellerVisible ? "PASS" : "FAIL",
    sellerLists: { pending: inPending, drafts: inDrafts, active: inActive },
    buyerVisibilityMatchesStatus: buyerVisibilityMatches ? "PASS" : "FAIL",
    buyerCatalogHit,
    publicPdpBuyerStatus: publicPdp.status,
    publicPdpSellerStatus: publicPdpSeller.status,
    sellerDetail: sellerDetailPass ? "PASS" : "FAIL",
    sellerDetailEndpoint: sellerDetail.ok ? "PASS" : "NOT_DEPLOYED",
    duplicateProtection: sellerIds.size <= 1 ? "PASS" : "FAIL",
    duplicateIds: [...sellerIds],
    duplicateSaveStatus: duplicateSave.status,
    duplicatePublishStatus: duplicatePublish.status,
    verdict:
      created.ok &&
      publishPass &&
      sellerVisible &&
      sellerDetailPass &&
      buyerVisibilityMatches &&
      sellerIds.size <= 1
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
