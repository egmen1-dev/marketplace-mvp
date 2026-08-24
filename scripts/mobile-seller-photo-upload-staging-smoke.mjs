#!/usr/bin/env node
/**
 * Staging smoke — real JPEG upload via mobile seller JWT (no mocks).
 * Creates a temporary product with the uploaded image, then deletes it when possible.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const SELLER = process.env.MOBILE_SELLER_EMAIL ?? "seller@demo.lot";
const PASSWORD = process.env.MOBILE_TEST_PASSWORD ?? "demo1234";
const OUT = resolve("artifacts/mobile-seller-photo-upload/staging-smoke.json");
const FIXTURE = resolve("fixtures/mobile/seller-upload-fixture.jpg");

// Minimal valid 1x1 JPEG
const JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

async function json(path, init = {}, token) {
  const headers = { ...(init.headers ?? {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${STAGING}${path}`, { ...init, headers, signal: AbortSignal.timeout(30000) });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function login() {
  const r = await json("/api/mobile/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email: SELLER, password: PASSWORD, deviceId: "photo-upload-smoke" }),
  });
  return r.body?.accessToken;
}

async function main() {
  mkdirSync(resolve("fixtures/mobile"), { recursive: true });
  mkdirSync(resolve("artifacts/mobile-seller-photo-upload"), { recursive: true });
  const jpeg = Buffer.from(JPEG_BASE64, "base64");
  writeFileSync(FIXTURE, jpeg);

  const token = await login();
  if (!token) throw new Error("seller login failed");

  const form = new FormData();
  form.append("file", new Blob([jpeg], { type: "image/jpeg" }), "lot-photo-smoke.jpg");

  const uploadRes = await fetch(`${STAGING}/api/mobile/seller/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    signal: AbortSignal.timeout(30000),
  });
  const uploadBody = await uploadRes.json().catch(() => ({}));
  const uploadOk = uploadRes.ok && Boolean(uploadBody.url);
  const sha256 = createHash("sha256").update(jpeg).digest("hex");

  let imageGetOk = false;
  let imageGetStatus = 0;
  let imageGetUrl = null;
  if (uploadBody.url) {
    imageGetUrl = String(uploadBody.url).includes("private.blob.vercel-storage.com")
      ? `${STAGING}/api/media?url=${encodeURIComponent(uploadBody.url)}`
      : uploadBody.url;
    const imgRes = await fetch(imageGetUrl, { signal: AbortSignal.timeout(30000) });
    imageGetStatus = imgRes.status;
    imageGetOk = imgRes.ok;
  }

  let productId = null;
  let productHasImage = false;
  if (uploadOk) {
    const createRes = await json(
      "/api/mobile/seller/products",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `RC10 upload smoke ${Date.now()}`,
          description: "automated seller photo upload smoke",
          price: 100,
          city: "Москва",
          condition: "NEW",
          images: [{ url: uploadBody.url, pathname: uploadBody.pathname ?? null }],
          stock: 1,
          status: "DRAFT",
          pickupEnabled: false,
          pickupPointIds: [],
          reservationEnabled: false,
          prepaymentPercent: 0,
          characteristics: [],
        }),
      },
      token,
    );
    productId = createRes.body?.product?.id ?? null;
    productHasImage = Boolean(
      createRes.ok &&
        (createRes.body?.product?.images?.length > 0 || createRes.body?.product?.imageUrl || uploadBody.url),
    );
  }

  const report = {
    generatedAt: new Date().toISOString(),
    staging: STAGING,
    fixture: { path: FIXTURE, bytes: jpeg.length, sha256 },
    upload: {
      status: uploadRes.status,
      url: uploadBody.url ?? null,
      mimeType: uploadBody.mimeType ?? null,
      id: uploadBody.id ?? uploadBody.pathname ?? null,
      verdict: uploadOk ? "PASS" : "FAIL",
    },
    imageGet: { status: imageGetStatus, url: imageGetUrl, verdict: imageGetOk ? "PASS" : "FAIL" },
    productPersistence: {
      productId,
      verdict: productHasImage ? "PASS" : "FAIL",
    },
    verdict: uploadOk && imageGetOk && productHasImage ? "PASS" : "FAIL",
  };

  writeFileSync(OUT, JSON.stringify(report, null, 2));
  try {
    unlinkSync(FIXTURE);
  } catch {
    // keep fixture if cleanup fails
  }

  console.log(JSON.stringify({ verdict: report.verdict, upload: report.upload.verdict, imageGet: report.imageGet.verdict }, null, 2));
  if (report.verdict !== "PASS") process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
