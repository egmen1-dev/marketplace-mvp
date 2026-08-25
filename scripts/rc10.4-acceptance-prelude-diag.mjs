#!/usr/bin/env node
/** Exact mirror of acceptance A+B prelude with payload diagnostics */
import { readFileSync } from "node:fs";

// inline minimal helpers from acceptance script
const STAGING = "https://web-production-e56fb.up.railway.app";
const PASSWORD = "demo1234";
const SELLER = "seller@demo.lot";
const ADMIN = "admin@demo.lot";
const JPEG_BASE64 = readFileSync ? "" : "";
const JPEG = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

function mergeCookies(existing, setCookie) {
  const jar = new Map();
  for (const part of existing ? existing.split("; ") : []) {
    const [k, ...v] = part.split("=");
    if (k) jar.set(k, v.join("="));
  }
  for (const line of setCookie ?? []) {
    const [pair] = line.split(";");
    const [k, ...v] = pair.split("=");
    if (k) jar.set(k.trim(), v.join("="));
  }
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function json(path, init = {}, token, cookie = "") {
  const headers = { ...(init.headers ?? {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(`${STAGING}${path}`, { ...init, headers, signal: AbortSignal.timeout(45000) });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function mobileLogin(email) {
  const r = await json("/api/mobile/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email, password: PASSWORD, deviceId: `diag-${email}` }),
  });
  return r.body?.accessToken ?? null;
}

async function adminLogin() {
  let cookie = "";
  const csrfRes = await fetch(`${STAGING}/api/auth/csrf`, { redirect: "manual" });
  cookie = mergeCookies(cookie, csrfRes.headers.getSetCookie?.() ?? []);
  const csrfToken = (await csrfRes.json()).csrfToken;
  const loginRes = await fetch(`${STAGING}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie },
    body: new URLSearchParams({ csrfToken, email: ADMIN, password: PASSWORD, callbackUrl: STAGING }),
    redirect: "manual",
  });
  cookie = mergeCookies(cookie, loginRes.headers.getSetCookie?.() ?? []);
  return cookie;
}

async function uploadImage(token) {
  const jpeg = Buffer.from(JPEG, "base64");
  const form = new FormData();
  form.append("file", new Blob([jpeg], { type: "image/jpeg" }), "moderation.jpg");
  const res = await fetch(`${STAGING}/api/mobile/seller/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return { ok: res.ok, body: await res.json().catch(() => ({})) };
}

async function resolveProductType(token) {
  const template = await json("/api/products/cmsmzsjx0002xy0w60fa73kqf", {}, token);
  if (template.body?.productType?.id) {
    return {
      productTypeId: template.body.productType.id,
      categoryId: template.body.category?.id ?? template.body.productType.categoryId,
    };
  }
  return null;
}

async function buildCharacteristics(token, productTypeId) {
  const detail = await json(`/api/taxonomy/browse?productTypeId=${encodeURIComponent(productTypeId)}`, {}, token);
  const characteristics = [];
  for (const def of detail.body?.characteristics ?? []) {
    if (!def.required) continue;
    if (def.type === "NUMBER") characteristics.push({ definitionId: def.id, valueNumber: 800 });
    else characteristics.push({ definitionId: def.id, valueText: def.options?.[0] ?? "Стандарт" });
  }
  return characteristics;
}

let sessionTaxonomy = null;
let sessionCharacteristics = null;
let sessionUpload = null;

async function createAndSubmitLot(token, { title, description }) {
  const taxonomy = sessionTaxonomy;
  const uploadBody = sessionUpload;
  const resolvedCharacteristics = sessionCharacteristics;
  const payload = {
    title,
    description,
    price: 2500,
    city: "Москва",
    condition: "NEW",
    categoryId: taxonomy.categoryId,
    productTypeId: taxonomy.productTypeId,
    images: [{ url: uploadBody.url, pathname: uploadBody.pathname ?? null }],
    stock: 1,
    status: "DRAFT",
    pickupEnabled: false,
    pickupPointIds: [],
    characteristics: resolvedCharacteristics,
  };
  const created = await json("/api/mobile/seller/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, token);
  const productId = created.body?.product?.id ?? created.body?.id;
  const submitted = productId
    ? await json(`/api/mobile/seller/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, status: "ACTIVE" }),
      }, token)
    : null;
  return { productId, payload, created, submitted };
}

async function buyerVisibility(title, productId, buyerToken) {
  const catalog = await json(`/api/mobile/catalog/products?q=${encodeURIComponent(title)}`, {}, buyerToken);
  const catalogHit = (catalog.body?.items ?? []).some((i) => i.id === productId);
  const pdp = await json(`/api/products/${productId}`, {}, buyerToken);
  return { catalogHit, pdpOk: pdp.ok, pdpStatus: pdp.status };
}

async function main() {
  const sellerToken = await mobileLogin(SELLER);
  const buyerToken = await mobileLogin("buyer@demo.lot");
  const adminCookie = await adminLogin();

  sessionTaxonomy = await resolveProductType(sellerToken);
  sessionCharacteristics = await buildCharacteristics(sellerToken, sessionTaxonomy.productTypeId);
  sessionUpload = (await uploadImage(sellerToken)).body;

  console.log("taxonomy", sessionTaxonomy);
  console.log("upload pathname", sessionUpload.pathname);

  const titleA = `Диван тест moderation ${Date.now()}`;
  const lotA = await createAndSubmitLot(sellerToken, { title: titleA, description: "Обычный диван для теста модерации" });
  console.log("A create", lotA.created.status, lotA.productId);
  console.log("A submit", lotA.submitted?.status, lotA.submitted?.body?.publishOutcome);

  const modA = await json(`/api/mobile/seller/products/${lotA.productId}/moderation`, {}, sellerToken);
  const detailA = await json(`/api/admin/moderation/${lotA.productId}/decision`, {}, null, adminCookie);
  const visA = await buyerVisibility(titleA, lotA.productId, buyerToken);
  console.log("modA", modA.status, "detailA", detailA.status, "visA", visA);

  const approveB = await json(`/api/admin/moderation/${lotA.productId}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "APPROVE" }),
  }, null, adminCookie);
  const detailB = await json(`/api/admin/moderation/${lotA.productId}/decision`, {}, null, adminCookie);
  const visB = await buyerVisibility(titleA, lotA.productId, buyerToken);
  console.log("approve", approveB.status, JSON.stringify(approveB.body).slice(0, 400));
  console.log("detailB", detailB.status, JSON.stringify(detailB.body).slice(0, 200));
  console.log("visB", visB);
  console.log("lotA product status after approve attempt:", detailB.body?.product?.status, detailB.body?.product?.productModeration?.status);

  await new Promise((r) => setTimeout(r, 2000));

  const titleC = `NEEDS_CHANGES moderation ${Date.now()}`;
  const payloadC = {
    title: titleC,
    description: "Звоните 8-999-123-45-67 за деталями",
    price: 2500,
    city: "Москва",
    condition: "NEW",
    categoryId: sessionTaxonomy.categoryId,
    productTypeId: sessionTaxonomy.productTypeId,
    images: [{ url: sessionUpload.url, pathname: sessionUpload.pathname ?? null }],
    stock: 1,
    status: "DRAFT",
    pickupEnabled: false,
    pickupPointIds: [],
    characteristics: sessionCharacteristics,
  };

  console.log("\nA payload keys:", Object.keys(lotA.payload));
  console.log("C payload:", JSON.stringify(payloadC, null, 2));

  const createdC = await json("/api/mobile/seller/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payloadC),
  }, sellerToken);

  console.log("\nC create result:", createdC.status, JSON.stringify(createdC.body));
}

main().catch(console.error);
