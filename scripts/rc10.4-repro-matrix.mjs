#!/usr/bin/env node
/**
 * Minimal reproduction matrix R1–R6 for RC10.4 scenario C create 500.
 */
const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const PASSWORD = process.env.MOBILE_TEST_PASSWORD ?? "demo1234";
const SELLER = process.env.MOBILE_SELLER_EMAIL ?? "seller@demo.lot";
const ADMIN = process.env.ADMIN_EMAIL ?? "admin@demo.lot";

const JPEG_BASE64 =
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
    body: JSON.stringify({ action: "login", email, password: PASSWORD, deviceId: `repro-${email}` }),
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
  const jpeg = Buffer.from(JPEG_BASE64, "base64");
  const form = new FormData();
  form.append("file", new Blob([jpeg], { type: "image/jpeg" }), "moderation.jpg");
  const res = await fetch(`${STAGING}/api/mobile/seller/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    signal: AbortSignal.timeout(45000),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function resolveProductType(token) {
  const template = await json("/api/products/cmsmzsjx0002xy0w60fa73kqf", {}, token);
  if (template.body?.productType?.id) {
    return {
      productTypeId: template.body.productType.id,
      categoryId: template.body.category?.id ?? template.body.productType.categoryId,
    };
  }
  const browse = await json("/api/taxonomy/browse?categoryId=root", {}, token);
  const pt = browse.body?.productTypes?.[0];
  return pt ? { productTypeId: pt.id, categoryId: pt.categoryId } : null;
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

async function createLot(token, { title, description, taxonomy, characteristics, uploadBody, reuseSession = false }) {
  const chars = characteristics ?? (await buildCharacteristics(token, taxonomy.productTypeId));
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
    characteristics: chars,
  };
  const created = await json(
    "/api/mobile/seller/products",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
    token,
  );
  return { created, payload };
}

async function submitLot(token, productId, payload) {
  return json(
    `/api/mobile/seller/products/${productId}`,
    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, status: "ACTIVE" }) },
    token,
  );
}

async function approve(productId, cookie) {
  return json(
    `/api/admin/moderation/${productId}/decision`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "APPROVE" }) },
    null,
    cookie,
  );
}

async function runCase(name, fn) {
  try {
    const result = await fn();
    console.log(`\n=== ${name} ===`);
    console.log(JSON.stringify(result, null, 2));
    return { name, pass: result.pass, ...result };
  } catch (e) {
    console.log(`\n=== ${name} ===`);
    console.log("ERROR:", e.message);
    return { name, pass: false, error: e.message };
  }
}

async function main() {
  const runId = Date.now();
  const sellerToken = await mobileLogin(SELLER);
  const adminCookie = await adminLogin();
  const taxonomy = await resolveProductType(sellerToken);
  const sessionChars = await buildCharacteristics(sellerToken, taxonomy.productTypeId);
  const sessionUpload = (await uploadImage(sellerToken)).body;

  const results = [];

  // R1 — C create alone
  results.push(
    await runCase("R1 C create alone", async () => {
      const freshUpload = (await uploadImage(sellerToken)).body;
      const c = await createLot(sellerToken, {
        title: `rc104-${runId}-R1-C`,
        description: "R1 isolated create",
        taxonomy,
        characteristics: sessionChars,
        uploadBody: freshUpload,
      });
      return { pass: c.created.ok, createStatus: c.created.status, body: c.created.body };
    }),
  );

  // R2 — A create → C create without approve
  results.push(
    await runCase("R2 A create -> C create (no approve)", async () => {
      const uploadA = (await uploadImage(sellerToken)).body;
      const a = await createLot(sellerToken, {
        title: `rc104-${runId}-R2-A`,
        description: "R2 lot A",
        taxonomy,
        characteristics: sessionChars,
        uploadBody: uploadA,
      });
      const uploadC = (await uploadImage(sellerToken)).body;
      const c = await createLot(sellerToken, {
        title: `rc104-${runId}-R2-C`,
        description: "R2 lot C",
        taxonomy,
        characteristics: sessionChars,
        uploadBody: uploadC,
      });
      return {
        pass: a.created.ok && c.created.ok,
        aStatus: a.created.status,
        cStatus: c.created.status,
        cBody: c.created.body,
      };
    }),
  );

  // R3 — A create → APPROVE → C create
  results.push(
    await runCase("R3 A create -> APPROVE -> C create", async () => {
      const uploadA = (await uploadImage(sellerToken)).body;
      const a = await createLot(sellerToken, {
        title: `rc104-${runId}-R3-A`,
        description: "Обычный диван для теста модерации",
        taxonomy,
        characteristics: sessionChars,
        uploadBody: uploadA,
      });
      const subA = await submitLot(sellerToken, a.created.body.product.id, a.payload);
      const appr = await approve(a.created.body.product.id, adminCookie);
      const uploadC = (await uploadImage(sellerToken)).body;
      const c = await createLot(sellerToken, {
        title: `rc104-${runId}-R3-C`,
        description: "Звоните 8-999-123-45-67 за деталями",
        taxonomy,
        characteristics: sessionChars,
        uploadBody: uploadC,
      });
      return {
        pass: a.created.ok && appr.ok && c.created.ok,
        aCreate: a.created.status,
        aSubmit: subA.status,
        aSubmitOutcome: subA.body?.publishOutcome,
        approve: appr.status,
        cCreate: c.created.status,
        cBody: c.created.body,
      };
    }),
  );

  // R4 — A create → APPROVE → immediate C create (shared session upload like acceptance)
  results.push(
    await runCase("R4 A -> APPROVE -> immediate C (shared session upload)", async () => {
      const uploadBody = (await uploadImage(sellerToken)).body;
      const a = await createLot(sellerToken, {
        title: `rc104-${runId}-R4-A`,
        description: "Обычный диван для теста модерации",
        taxonomy,
        characteristics: sessionChars,
        uploadBody,
      });
      const subA = await submitLot(sellerToken, a.created.body.product.id, a.payload);
      const appr = await approve(a.created.body.product.id, adminCookie);
      const c = await createLot(sellerToken, {
        title: `rc104-${runId}-R4-C`,
        description: "Звоните 8-999-123-45-67 за деталями",
        taxonomy,
        characteristics: sessionChars,
        uploadBody, // same image pathname
      });
      return {
        pass: a.created.ok && appr.ok && c.created.ok,
        aCreate: a.created.status,
        aSubmit: subA.status,
        approve: appr.status,
        cCreate: c.created.status,
        cBody: c.created.body,
        sharedPathname: uploadBody.pathname,
      };
    }),
  );

  // R5 — A create → APPROVE → wait 10s → C create
  results.push(
    await runCase("R5 A -> APPROVE -> wait 10s -> C", async () => {
      const uploadA = (await uploadImage(sellerToken)).body;
      const a = await createLot(sellerToken, {
        title: `rc104-${runId}-R5-A`,
        description: "Обычный диван для теста модерации",
        taxonomy,
        characteristics: sessionChars,
        uploadBody: uploadA,
      });
      await submitLot(sellerToken, a.created.body.product.id, a.payload);
      await approve(a.created.body.product.id, adminCookie);
      await new Promise((r) => setTimeout(r, 10000));
      const uploadC = (await uploadImage(sellerToken)).body;
      const c = await createLot(sellerToken, {
        title: `rc104-${runId}-R5-C`,
        description: "Звоните 8-999-123-45-67",
        taxonomy,
        characteristics: sessionChars,
        uploadBody: uploadC,
      });
      return { pass: c.created.ok, cCreate: c.created.status, cBody: c.created.body };
    }),
  );

  // R6 — Full A+B prelude then C with session fixtures (mirrors acceptance)
  results.push(
    await runCase("R6 acceptance-like A+B then C (session fixtures)", async () => {
      const uploadBody = sessionUpload;
      const a = await createLot(sellerToken, {
        title: `Диван тест moderation ${runId}`,
        description: "Обычный диван для теста модерации",
        taxonomy,
        characteristics: sessionChars,
        uploadBody,
      });
      const subA = await submitLot(sellerToken, a.created.body.product.id, a.payload);
      const appr = await approve(a.created.body.product.id, adminCookie);
      await new Promise((r) => setTimeout(r, 2000));
      const c = await createLot(sellerToken, {
        title: `NEEDS_CHANGES moderation ${runId}`,
        description: "Звоните 8-999-123-45-67 за деталями",
        taxonomy,
        characteristics: sessionChars,
        uploadBody,
      });
      return {
        pass: a.created.ok && appr.ok && c.created.ok,
        aCreate: a.created.status,
        aSubmit: subA.status,
        aSubmitOutcome: subA.body?.publishOutcome,
        approve: appr.status,
        cCreate: c.created.status,
        cBody: c.created.body,
        sharedPathname: uploadBody.pathname,
      };
    }),
  );

  console.log("\n\n=== SUMMARY ===");
  for (const r of results) {
    console.log(`${r.name}: ${r.pass ? "PASS" : "FAIL"}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
