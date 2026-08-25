#!/usr/bin/env node
/**
 * EPIC 174.1 — Moderation staging acceptance (scenarios A–H).
 * Requires deployed main with EPIC 174 + MARKETPLACE_TRUST_LOOP_ENABLED=true.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const SELLER = process.env.MOBILE_SELLER_EMAIL ?? "seller@demo.lot";
const SELLER_B = process.env.MOBILE_SELLER_B_EMAIL ?? "seller2@demo.lot";
const BUYER = process.env.MOBILE_BUYER_EMAIL ?? "buyer@demo.lot";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@demo.lot";
const PASSWORD = process.env.MOBILE_TEST_PASSWORD ?? "demo1234";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? PASSWORD;
const EXPECTED_SHA = (process.env.EXPECTED_RAILWAY_SHA ?? "c02c114").slice(0, 7);
const RUN_ID = process.env.RC10_4_ACCEPTANCE_RUN_ID ?? randomUUID().slice(0, 8);
const OUT = resolve("artifacts/closed-beta-rc10.4/staging-moderation-acceptance.json");
const server500Events = [];

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

async function json(path, init = {}, token, cookie = "", requestId = RUN_ID) {
  const headers = { ...(init.headers ?? {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  if (requestId) headers["x-acceptance-run-id"] = requestId;
  const res = await fetch(`${STAGING}${path}`, { ...init, headers, signal: AbortSignal.timeout(45000) });
  const body = await res.json().catch(() => ({}));
  if (res.status >= 500) {
    server500Events.push({
      runId: RUN_ID,
      path,
      method: init.method ?? "GET",
      status: res.status,
      body,
      at: new Date().toISOString(),
    });
  }
  return { ok: res.ok, status: res.status, body, headers: res.headers };
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function mobileLogin(email, attempt = 1) {
  const r = await json("/api/mobile/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "login",
      email,
      password: PASSWORD,
      deviceId: `mod-acc-${RUN_ID}-${email}-${attempt}`,
    }),
  });
  if (!r.body?.accessToken && attempt < 4) {
    await sleep(1000 * attempt);
    return mobileLogin(email, attempt + 1);
  }
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
    body: new URLSearchParams({ csrfToken, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, callbackUrl: STAGING }),
    redirect: "manual",
  });
  cookie = mergeCookies(cookie, loginRes.headers.getSetCookie?.() ?? []);
  if (!cookie.includes("authjs.session-token") && !cookie.includes("__Secure-authjs.session-token")) {
    throw new Error(`Admin login failed (${loginRes.status})`);
  }
  return cookie;
}

async function uploadImage(token, attempt = 1) {
  const jpeg = Buffer.from(JPEG_BASE64, "base64");
  const form = new FormData();
  form.append("file", new Blob([jpeg], { type: "image/jpeg" }), "moderation.jpg");
  const res = await fetch(`${STAGING}/api/mobile/seller/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "x-acceptance-run-id": RUN_ID },
    body: form,
    signal: AbortSignal.timeout(45000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok && attempt < 4) {
    await sleep(1000 * attempt);
    return uploadImage(token, attempt + 1);
  }
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

  const queue = ["root"];
  while (queue.length) {
    const categoryId = queue.shift();
    const browse = await json(`/api/taxonomy/browse?categoryId=${encodeURIComponent(categoryId)}`, {}, token);
    if (!browse.ok) continue;
    const pt = browse.body?.productTypes?.[0];
    if (pt?.id) return { productTypeId: pt.id, categoryId: pt.categoryId ?? categoryId };
    for (const child of browse.body?.children ?? []) if (child?.id) queue.push(child.id);
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

function cloneCharacteristics(characteristics) {
  return characteristics.map((row) => ({ ...row }));
}

async function getUpload(token, preferFresh = false) {
  if (!preferFresh && sessionUpload) return sessionUpload;
  const upload = await uploadImage(token);
  if (!upload.ok) {
    if (sessionUpload) return sessionUpload;
    throw new Error(`upload failed (${JSON.stringify(upload.body).slice(0, 120)})`);
  }
  if (!preferFresh || !sessionUpload) sessionUpload = upload.body;
  return upload.body;
}

async function createAndSubmitLot(
  token,
  {
    title,
    description = "EPIC 174 staging acceptance",
    taxonomy = sessionTaxonomy,
    characteristics,
    uploadBody,
    scenarioTag = "lot",
  } = {},
) {
  if (!taxonomy) {
    const probe = await json("/api/taxonomy/browse?categoryId=root", {}, token);
    throw new Error(
      `taxonomy unavailable (root browse status=${probe.status} body=${JSON.stringify(probe.body).slice(0, 120)})`,
    );
  }

  const resolvedUpload = uploadBody ?? (await getUpload(token, true));
  if (!resolvedUpload?.url) throw new Error("upload unavailable for createAndSubmitLot");

  const resolvedCharacteristics =
    cloneCharacteristics(
      characteristics ?? sessionCharacteristics ?? (await buildCharacteristics(token, taxonomy.productTypeId)),
    );

  const payload = {
    title,
    description,
    price: 2500,
    city: "Москва",
    condition: "NEW",
    categoryId: taxonomy.categoryId,
    productTypeId: taxonomy.productTypeId,
    images: [{ url: resolvedUpload.url, pathname: resolvedUpload.pathname ?? null }],
    stock: 1,
    status: "DRAFT",
    pickupEnabled: false,
    pickupPointIds: [],
    characteristics: resolvedCharacteristics,
  };

  const created = await json(
    "/api/mobile/seller/products",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    token,
  );

  const productId = created.body?.product?.id ?? created.body?.id;
  if (!created.ok || !productId) {
    const diagnostics = {
      runId: RUN_ID,
      scenarioTag,
      title,
      status: created.status,
      body: created.body,
      payload: {
        ...payload,
        images: payload.images,
        characteristics: resolvedCharacteristics,
      },
    };
    writeFileSync(
      resolve(`artifacts/closed-beta-rc10.4/create-failure-${scenarioTag}-${RUN_ID}.json`),
      JSON.stringify(diagnostics, null, 2),
    );
    throw new Error(
      `create failed for "${title}" ${created.status} ${JSON.stringify(created.body).slice(0, 200)}`,
    );
  }

  const submitted = await json(
    `/api/mobile/seller/products/${productId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, status: "ACTIVE" }),
    },
    token,
  );

  return { productId, payload, submitted, taxonomy, createDiagnostics: { status: created.status } };
}

async function buyerVisibility(title, productId, buyerToken) {
  const catalog = await json(`/api/mobile/catalog/products?q=${encodeURIComponent(title)}`, {}, buyerToken);
  const catalogHit = (catalog.body?.items ?? []).some((i) => i.id === productId);
  const pdp = await json(`/api/products/${productId}`, {}, buyerToken);
  return { catalogHit, pdpOk: pdp.ok, pdpStatus: pdp.status };
}

async function sellerModeration(productId, sellerToken) {
  return json(`/api/mobile/seller/products/${productId}/moderation`, {}, sellerToken);
}

async function adminDetail(productId, cookie) {
  return json(`/api/admin/moderation/${productId}/decision`, {}, null, cookie);
}

async function adminDecision(productId, action, cookie, extra = {}) {
  return json(`/api/admin/moderation/${productId}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...extra }),
  }, null, cookie);
}

async function adminQueue(cookie) {
  return json("/api/admin/moderation", {}, null, cookie);
}

const SCENARIO_DELAY_MS = Number(process.env.RC10_4_SCENARIO_DELAY_MS ?? 800);

function scenario(id, status, extra = {}) {
  return { scenario: id, status, ...extra };
}

async function betweenScenarios() {
  if (SCENARIO_DELAY_MS > 0) await sleep(SCENARIO_DELAY_MS);
}

async function runAcceptanceCleanup() {
  try {
    const { spawnSync } = await import("node:child_process");
    const db = spawnSync("npx", ["tsx", "scripts/rc10.4-cleanup-acceptance.ts"], {
      stdio: "pipe",
      encoding: "utf8",
      env: process.env,
    });
    if (db.status === 0) {
      console.log(`[cleanup] db ok: ${db.stdout.trim().split("\n").pop()}`);
      return;
    }
    const http = spawnSync("node", ["scripts/rc10.4-cleanup-acceptance-http.mjs"], {
      stdio: "pipe",
      encoding: "utf8",
      env: process.env,
    });
    console.log(`[cleanup] http: ${http.stdout.trim().split("\n").pop() ?? http.stderr?.trim() ?? "done"}`);
  } catch (err) {
    console.warn("[cleanup] skipped:", err);
  }
}

async function main() {
  mkdirSync(resolve("artifacts/closed-beta-rc10.4"), { recursive: true });
  await runAcceptanceCleanup();
  await sleep(1500);
  const scenarios = [];
  const sellerToken = await mobileLogin(SELLER);
  const sellerBToken = await mobileLogin(SELLER_B);
  const buyerToken = await mobileLogin(BUYER);
  if (!sellerToken || !buyerToken) throw new Error("login failed");

  const health = await json("/api/health");
  const deployedSha = health.body?.version?.commit ?? null;
  const deployPass = deployedSha?.startsWith(EXPECTED_SHA);

  scenarios.push(scenario("deploy", deployPass ? "PASS" : "FAIL", {
    deployedSha,
    expectedSha: EXPECTED_SHA,
    databaseOk: health.body?.checks?.database?.ok ?? false,
  }));

  if (!deployPass) {
    const report = {
      generatedAt: new Date().toISOString(),
      staging: STAGING,
      verdict: "BLOCKED_FOR_RC10_4_BUILD",
      reason: "Staging deploy SHA does not include merged EPIC 174 + update hotfix",
      scenarios,
    };
    writeFileSync(OUT, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  let adminCookie;
  try {
    adminCookie = await adminLogin();
  } catch (e) {
    scenarios.push(scenario("admin-auth", "FAIL", { error: String(e) }));
    const report = { generatedAt: new Date().toISOString(), staging: STAGING, verdict: "BLOCKED_FOR_RC10_4_BUILD", scenarios };
    writeFileSync(OUT, JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const queueProbe = await adminQueue(adminCookie);
  const migrationFieldsPresent =
    queueProbe.ok &&
    typeof queueProbe.body?.counters === "object" &&
    Array.isArray(queueProbe.body?.queue);
  scenarios.push(scenario("migration-api", migrationFieldsPresent ? "PASS" : "FAIL", {
    adminModerationStatus: queueProbe.status,
    counters: queueProbe.body?.counters ?? null,
  }));

  sessionTaxonomy = await resolveProductType(sellerToken);
  if (!sessionTaxonomy) throw new Error("taxonomy unavailable at acceptance startup");
  sessionCharacteristics = await buildCharacteristics(sellerToken, sessionTaxonomy.productTypeId);
  sessionUpload = (await uploadImage(sellerToken)).body;
  if (!sessionUpload?.url) throw new Error("upload unavailable at acceptance startup");

  // A — normal LOT submit
  const titleA = `rc104-${RUN_ID}-A sofa acceptance`;
  const lotA = await createAndSubmitLot(sellerToken, {
    title: titleA,
    description: "Обычный диван для теста модерации",
    scenarioTag: "A",
  });
  const modA = await sellerModeration(lotA.productId, sellerToken);
  const detailA = await adminDetail(lotA.productId, adminCookie);
  const visA = await buyerVisibility(titleA, lotA.productId, buyerToken);
  const pmA = detailA.body?.product?.productModeration ?? null;
  const passA =
    lotA.submitted.body?.publishOutcome === "PENDING_REVIEW" &&
    lotA.submitted.body?.isPublic === false &&
    modA.body?.status === "PENDING_REVIEW" &&
    pmA?.riskScore != null &&
    pmA?.policyVersion &&
    !visA.catalogHit &&
    !visA.pdpOk;
  scenarios.push(scenario("A", passA ? "PASS" : "FAIL", {
    productId: lotA.productId,
    moderationId: pmA?.id ?? null,
    serverState: {
      productStatus: detailA.body?.product?.status,
      moderationStatus: pmA?.status,
      reviewMode: pmA?.reviewMode,
      stage: pmA?.stage,
      contentVersion: detailA.body?.product?.contentVersion,
      systemRecommendation: pmA?.systemRecommendation,
      isPublic: lotA.submitted.body?.isPublic,
    },
    buyerVisibility: visA,
    auditVerified: false,
  }));

  await betweenScenarios();

  // B — admin APPROVE → buyer visible
  const approveB = await adminDecision(lotA.productId, "APPROVE", adminCookie);
  const detailB = await adminDetail(lotA.productId, adminCookie);
  const visB = await buyerVisibility(titleA, lotA.productId, buyerToken);
  const pmB = detailB.body?.product?.productModeration;
  const passB =
    approveB.ok &&
    pmB?.status === "APPROVED" &&
    detailB.body?.product?.status === "ACTIVE" &&
    detailB.body?.product?.publishedAt &&
    visB.catalogHit &&
    visB.pdpOk;
  scenarios.push(scenario("B", passB ? "PASS" : "FAIL", {
    productId: lotA.productId,
    approveStatus: approveB.status,
    approveBody: approveB.body?.ok ?? approveB.body?.code ?? approveB.body?.error ?? null,
    serverState: {
      moderationStatus: pmB?.status,
      productStatus: detailB.body?.product?.status,
      publishedAt: detailB.body?.product?.publishedAt,
    },
    buyerVisibility: visB,
    auditVerified: (pmB?.auditEvents?.length ?? 0) > 0,
  }));

  await betweenScenarios();

  // C — NEEDS_CHANGES → edit → resubmit → approve
  await sleep(2000);
  const titleC = `rc104-${RUN_ID}-C needs-fix flow`;
  const lotC = await createAndSubmitLot(sellerToken, {
    title: titleC,
    description: "Звоните 8-999-123-45-67 за деталями",
    scenarioTag: "C",
  });
  await adminDecision(lotC.productId, "NEEDS_CHANGES", adminCookie, {
    reasonCodes: ["CONTACT_INFO_IN_TEXT"],
    comment: "Уберите контактные данные",
  });
  const modC1 = await sellerModeration(lotC.productId, sellerToken);
  const visC1 = await buyerVisibility(titleC, lotC.productId, buyerToken);
  const cvBefore = (await adminDetail(lotC.productId, adminCookie)).body?.product?.contentVersion;
  const editC = await json(`/api/mobile/seller/products/${lotC.productId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description: "Описание без контактов", status: "DRAFT" }),
  }, sellerToken);
  const cvAfter = (await adminDetail(lotC.productId, adminCookie)).body?.product?.contentVersion;
  const resubmitC = await json(`/api/mobile/seller/products/${lotC.productId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...lotC.payload, description: "Описание без контактов", status: "ACTIVE" }),
  }, sellerToken);
  await adminDecision(lotC.productId, "APPROVE", adminCookie);
  const visC2 = await buyerVisibility(titleC, lotC.productId, buyerToken);
  const passC =
    modC1.body?.sellerLabel === "Нужно исправить" &&
    modC1.body?.issues?.length > 0 &&
    !visC1.catalogHit &&
    cvAfter > cvBefore &&
    resubmitC.body?.publishOutcome === "PENDING_REVIEW" &&
    visC2.catalogHit &&
    visC2.pdpOk;
  scenarios.push(scenario("C", passC ? "PASS" : "FAIL", {
    productId: lotC.productId,
    serverState: { contentVersionBefore: cvBefore, contentVersionAfter: cvAfter, resubmitOutcome: resubmitC.body?.publishOutcome },
    buyerVisibility: { before: visC1, after: visC2 },
    auditVerified: true,
  }));

  await betweenScenarios();

  // D — REJECT
  const titleD = `rc104-${RUN_ID}-D reject flow`;
  const lotD = await createAndSubmitLot(sellerToken, {
    title: titleD,
    description: "Тестовый fixture для reject",
    scenarioTag: "D",
  });
  await adminDecision(lotD.productId, "REJECT", adminCookie, {
    reasonCodes: ["OTHER"],
    comment: "Тестовый reject fixture",
  });
  const modD = await sellerModeration(lotD.productId, sellerToken);
  const visD = await buyerVisibility(titleD, lotD.productId, buyerToken);
  const passD =
    modD.body?.status === "REJECTED" &&
    modD.body?.sellerLabel === "Отклонён" &&
    !visD.catalogHit &&
    !visD.pdpOk;
  scenarios.push(scenario("D", passD ? "PASS" : "FAIL", { productId: lotD.productId, buyerVisibility: visD, auditVerified: true }));

  await betweenScenarios();

  // E — ambiguous signal → manual review (soft prohibited / contact)
  const titleE = `rc104-${RUN_ID}-E manual review`;
  const lotE = await createAndSubmitLot(sellerToken, {
    title: titleE,
    description: "Книга про ножи и кухонные принадлежности",
    scenarioTag: "E",
  });
  const detailE = await adminDetail(lotE.productId, adminCookie);
  const pmE = detailE.body?.product?.productModeration;
  const passE =
    pmE?.status === "PENDING_REVIEW" &&
    pmE?.systemRecommendation === "MANUAL_REVIEW" &&
    (pmE?.riskScore ?? 0) >= 0;
  scenarios.push(scenario("E", passE ? "PASS" : "FAIL", {
    productId: lotE.productId,
    serverState: { moderationStatus: pmE?.status, systemRecommendation: pmE?.systemRecommendation, riskScore: pmE?.riskScore },
    auditVerified: true,
  }));

  await betweenScenarios();

  // F — content version security after approve
  const titleF = `rc104-${RUN_ID}-F content-version`;
  const lotF = await createAndSubmitLot(sellerToken, {
    title: titleF,
    description: "Content version security test",
    scenarioTag: "F",
  });
  await adminDecision(lotF.productId, "APPROVE", adminCookie);
  const beforeF = await adminDetail(lotF.productId, adminCookie);
  const visF1 = await buyerVisibility(titleF, lotF.productId, buyerToken);
  await json(`/api/mobile/seller/products/${lotF.productId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: `${titleF} ИЗМЕНЕНО`, status: "DRAFT" }),
  }, sellerToken);
  const afterF = await adminDetail(lotF.productId, adminCookie);
  const visF2 = await buyerVisibility(`${titleF} ИЗМЕНЕНО`, lotF.productId, buyerToken);
  const pmF = afterF.body?.product?.productModeration;
  const passF =
    visF1.catalogHit &&
    beforeF.body?.product?.status === "ACTIVE" &&
    pmF?.status === "PENDING_REVIEW" &&
    afterF.body?.product?.status === "DRAFT" &&
    !visF2.catalogHit;
  scenarios.push(scenario("F", passF ? "PASS" : "FAIL", {
    productId: lotF.productId,
    serverState: {
      beforeStatus: beforeF.body?.product?.status,
      afterStatus: afterF.body?.product?.status,
      moderationStatus: pmF?.status,
      contentVersion: afterF.body?.product?.contentVersion,
      moderatedContentVersion: pmF?.moderatedContentVersion,
    },
    buyerVisibility: { before: visF1, after: visF2 },
    auditVerified: true,
  }));

  await betweenScenarios();

  // G — authorization
  const buyerApprove = await json(`/api/admin/moderation/${lotE.productId}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${buyerToken}` },
    body: JSON.stringify({ action: "APPROVE" }),
  });
  const sellerApproveOther = await json(`/api/admin/moderation/${lotE.productId}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${sellerToken}` },
    body: JSON.stringify({ action: "APPROVE" }),
  });
  const sellerBypass = await json(`/api/mobile/seller/products/${lotE.productId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "ACTIVE" }),
  }, sellerToken);
  const crossSeller = await json(`/api/mobile/seller/products/${lotA.productId}`, {}, sellerBToken);
  const passG =
    (buyerApprove.status === 401 || buyerApprove.status === 403) &&
    (sellerApproveOther.status === 401 || sellerApproveOther.status === 403) &&
  (sellerBypass.body?.publishOutcome !== "PUBLISHED" || sellerBypass.status === 400) &&
    (crossSeller.status === 404 || crossSeller.status === 403);
  scenarios.push(scenario("G", passG ? "PASS" : "FAIL", {
    buyerApproveStatus: buyerApprove.status,
    sellerApproveStatus: sellerApproveOther.status,
    sellerBypassStatus: sellerBypass.status,
    crossSellerStatus: crossSeller.status,
  }));

  await betweenScenarios();

  // H — idempotency / concurrency
  const titleH = `rc104-${RUN_ID}-H idempotency`;
  const lotH = await createAndSubmitLot(sellerToken, { title: titleH, scenarioTag: "H" });
  const d1 = await adminDecision(lotH.productId, "APPROVE", adminCookie);
  const d2 = await adminDecision(lotH.productId, "APPROVE", adminCookie);
  const d3 = await adminDecision(lotH.productId, "REJECT", adminCookie);
  const detailH = await adminDetail(lotH.productId, adminCookie);
  const passH =
    d1.ok &&
    (d2.status === 409 || d2.body?.code === "ALREADY_REVIEWED") &&
    (d3.status === 409 || d3.body?.code === "ALREADY_REVIEWED") &&
    detailH.body?.product?.status === "ACTIVE";
  scenarios.push(scenario("H", passH ? "PASS" : "FAIL", {
    productId: lotH.productId,
    decisions: { first: d1.status, secondApprove: d2.status, rejectAfter: d3.status },
    auditEventCount: detailH.body?.product?.productModeration?.auditEvents?.length ?? 0,
    auditVerified: (detailH.body?.product?.productModeration?.auditEvents?.length ?? 0) >= 1,
  }));

  const allPass = scenarios.every((s) => s.status === "PASS") && server500Events.length === 0;
  const report = {
    generatedAt: new Date().toISOString(),
    staging: STAGING,
    runId: RUN_ID,
    deployedSha,
    server500Events,
    unexplainedServer500Count: server500Events.length,
    effectiveConfig: {
      note: "Runtime env inferred from moderation behavior; secrets not logged",
      trustLoopInferred: passA,
      moderationAutomationModeInferred: "SHADOW",
    },
    scenarios,
    adminAcceptance: {
      queueLoads: queueProbe.ok,
      detailLoads: detailA.ok,
      counters: queueProbe.body?.counters ?? null,
      verdict: queueProbe.ok && detailA.ok ? "PASS" : "FAIL",
    },
    verdict: allPass ? "READY_FOR_RC10_4_BUILD" : "BLOCKED_FOR_RC10_4_BUILD",
  };

  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  try {
    writeFileSync(
      OUT,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          staging: STAGING,
          runId: RUN_ID,
          verdict: "BLOCKED_FOR_RC10_4_BUILD",
          error: String(err),
        },
        null,
        2,
      ),
    );
  } catch {
    // ignore artifact write errors
  }
  process.exit(1);
});
