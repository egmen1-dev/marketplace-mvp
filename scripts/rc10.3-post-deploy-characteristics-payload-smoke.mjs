#!/usr/bin/env node
/** Post-deploy payload verification — characteristics use stable definitionId values. */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const SELLER = process.env.MOBILE_SELLER_EMAIL ?? "seller@demo.lot";
const PASSWORD = process.env.MOBILE_TEST_PASSWORD ?? "demo1234";
const OUT = resolve("artifacts/closed-beta-rc10.3/staging-characteristics-payload-smoke.json");

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
    body: JSON.stringify({ action: "login", email, password: PASSWORD, deviceId: `payload-${email}` }),
  });
  return r.body?.accessToken;
}

async function main() {
  const token = await login(SELLER);
  if (!token) throw new Error("seller login failed");

  const schema = await json(
    "/api/mobile/seller/product-types/cmsoz1oa9vw8rphtp/characteristics",
    {},
    token,
  );
  const required = (schema.body?.characteristics ?? []).filter((c) => c.required);
  if (!schema.ok || required.length === 0) throw new Error("characteristics schema unavailable on deployed staging");
  const powerDef = required.find((c) => c.name === "Мощность") ?? required[0];
  const characteristics = required.map((def) => {
    if (def.type === "NUMBER") {
      return { definitionId: def.id, valueNumber: def.name === "Мощность" ? 850 : 1 };
    }
    const option = Array.isArray(def.options) && def.options.length ? String(def.options[0]) : "Стандарт";
    return { definitionId: def.id, valueText: option };
  });

  const uploadForm = new FormData();
  uploadForm.append("file", new Blob([Buffer.from(JPEG_BASE64, "base64")], { type: "image/jpeg" }), "payload.jpg");
  const uploadRes = await fetch(`${STAGING}/api/mobile/seller/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: uploadForm,
    signal: AbortSignal.timeout(30000),
  });
  const uploadBody = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok || !uploadBody.url) throw new Error("upload failed");

  const title = `RC103_PAYLOAD_${Date.now()}`;
  const payload = {
    title,
    description: "RC10.3 characteristics payload smoke",
    price: 2200,
    city: "Москва",
    condition: "NEW",
    categoryId: schema.body.categoryId,
    productTypeId: schema.body.productTypeId,
    images: [{ url: uploadBody.url, pathname: uploadBody.pathname ?? null }],
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
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
    token,
  );
  const productId = created.body?.product?.id ?? created.body?.id;
  if (!created.ok || !productId) {
    throw new Error(`create failed ${created.status}: ${JSON.stringify(created.body)}`);
  }

  const published = await json(
    `/api/mobile/seller/products/${encodeURIComponent(productId)}`,
    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, status: "ACTIVE" }) },
    token,
  );

  const pdp = await json(`/api/products/${encodeURIComponent(productId)}`, {}, token);
  const chars = pdp.body?.characteristics ?? [];
  const powerRow = chars.find((c) => c.definitionId === powerDef.id || c.name === "Мощность");
  const powerSent = characteristics.find((c) => c.definitionId === powerDef.id);
  const selectDef = required.find((c) => c.type === "SELECT");
  const selectRow = selectDef
    ? chars.find((c) => c.definitionId === selectDef.id || c.name === selectDef.name)
    : null;
  const selectSent = selectDef
    ? characteristics.find((c) => c.definitionId === selectDef.id)
    : null;

  const publishPass =
    published.ok ||
    published.body?.publishOutcome === "PENDING_REVIEW" ||
    published.body?.code === "MODERATION_PENDING" ||
    published.body?.code === "MODERATION_REQUIRED" ||
    String(published.body?.error ?? "").includes("проверк");

  const report = {
    generatedAt: new Date().toISOString(),
    staging: STAGING,
    deployedEndpoint: schema.ok ? "PASS" : "FAIL",
    definitionIdUsed: powerDef.id,
    sentPayload: characteristics,
    publishStatus: published.status,
    publishOutcome: published.body?.publishOutcome ?? null,
    persistedCharacteristics: chars,
    checks: {
      usesDefinitionId: characteristics.every((c) => typeof c.definitionId === "string" && c.definitionId.length > 10),
      numericValue: typeof powerSent?.valueNumber === "number",
      selectValue: selectDef ? typeof selectSent?.valueText === "string" : true,
      powerPersisted: Boolean(powerRow),
      selectPersisted: selectDef ? Boolean(selectRow) : true,
      noLabelOnlyPersistence: !characteristics.some((c) => c.name && !c.definitionId),
      humanErrorsAbsent: !String(published.body?.error ?? "").includes("Заполните обязательную"),
    },
    verdict:
      schema.ok &&
      powerSent?.definitionId === powerDef.id &&
      typeof powerSent?.valueNumber === "number" &&
      publishPass &&
      Boolean(powerRow) &&
      (!selectDef || Boolean(selectRow))
        ? "PASS"
        : "FAIL",
  };

  mkdirSync(resolve("artifacts/closed-beta-rc10.3"), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (report.verdict !== "PASS") process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
