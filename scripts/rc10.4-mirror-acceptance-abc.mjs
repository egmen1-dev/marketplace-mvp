#!/usr/bin/env node
/** Mirror acceptance A→B→C create exactly to reproduce C DATABASE_ERROR */
import { randomUUID } from "node:crypto";

const STAGING = "https://web-production-e56fb.up.railway.app";
const RUN_ID = process.env.RC10_4_ACCEPTANCE_RUN_ID ?? randomUUID().slice(0, 8);
const PASSWORD = "demo1234";
const JPEG =
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

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
  const headers = { ...(init.headers ?? {}), "x-acceptance-run-id": RUN_ID };
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
    body: JSON.stringify({ action: "login", email, password: PASSWORD, deviceId: `mirror-${RUN_ID}-${email}` }),
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
    body: new URLSearchParams({ csrfToken, email: "admin@demo.lot", password: PASSWORD, callbackUrl: STAGING }),
    redirect: "manual",
  });
  cookie = mergeCookies(cookie, loginRes.headers.getSetCookie?.() ?? []);
  return cookie;
}

async function uploadImage(token) {
  const form = new FormData();
  form.append("file", new Blob([Buffer.from(JPEG, "base64")], { type: "image/jpeg" }), "moderation.jpg");
  const res = await fetch(`${STAGING}/api/mobile/seller/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "x-acceptance-run-id": RUN_ID },
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

async function buyerVisibility(title, productId, buyerToken) {
  const catalog = await json(`/api/mobile/catalog/products?q=${encodeURIComponent(title)}`, {}, buyerToken);
  const catalogHit = (catalog.body?.items ?? []).some((i) => i.id === productId);
  const pdp = await json(`/api/products/${productId}`, {}, buyerToken);
  return { catalogHit, pdpOk: pdp.ok, pdpStatus: pdp.status };
}

async function createAndSubmitLot(token, { title, description, taxonomy, characteristics, uploadBody, tag }) {
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
    characteristics,
  };
  const created = await json(
    "/api/mobile/seller/products",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
    token,
  );
  const productId = created.body?.product?.id ?? created.body?.id;
  const submitted = productId
    ? await json(
        `/api/mobile/seller/products/${productId}`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, status: "ACTIVE" }) },
        token,
      )
    : null;
  return { productId, created, submitted, payload, tag };
}

async function main() {
  console.log("RUN_ID", RUN_ID);
  const sellerToken = await mobileLogin("seller@demo.lot");
  const buyerToken = await mobileLogin("buyer@demo.lot");
  const adminCookie = await adminLogin();
  const taxonomy = await resolveProductType(sellerToken);
  const characteristics = await buildCharacteristics(sellerToken, taxonomy.productTypeId);
  const uploadBody = (await uploadImage(sellerToken)).body;

  const titleA = `rc104-${RUN_ID}-A sofa acceptance`;
  const lotA = await createAndSubmitLot(sellerToken, {
    title: titleA,
    description: "Обычный диван для теста модерации",
    taxonomy,
    characteristics,
    uploadBody,
    tag: "A",
  });
  console.log("A create", lotA.created.status, lotA.productId);

  await json(`/api/mobile/seller/products/${lotA.productId}/moderation`, {}, sellerToken);
  await json(`/api/admin/moderation/${lotA.productId}/decision`, {}, null, adminCookie);
  const visA = await buyerVisibility(titleA, lotA.productId, buyerToken);
  console.log("visA", visA);

  const approveB = await json(
    `/api/admin/moderation/${lotA.productId}/decision`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "APPROVE" }) },
    null,
    adminCookie,
  );
  const detailB = await json(`/api/admin/moderation/${lotA.productId}/decision`, {}, null, adminCookie);
  const visB = await buyerVisibility(titleA, lotA.productId, buyerToken);
  console.log("approveB", approveB.status, "detailB", detailB.status, "visB", visB);

  await new Promise((r) => setTimeout(r, 2000));

  const titleC = `rc104-${RUN_ID}-C needs-fix flow`;
  const lotC = await createAndSubmitLot(sellerToken, {
    title: titleC,
    description: "Звоните 8-999-123-45-67 за деталями",
    taxonomy,
    characteristics,
    uploadBody,
    tag: "C",
  });
  console.log("C create", lotC.created.status, JSON.stringify(lotC.created.body).slice(0, 400));
}

main().catch(console.error);
