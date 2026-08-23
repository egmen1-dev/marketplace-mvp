#!/usr/bin/env node
/** Cart image contract staging smoke — add product with image, verify cart DTO. */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const OUT = resolve("artifacts/mobile-physical-fixes/cart-image-contract.json");

async function json(path, init = {}, token) {
  const headers = { ...(init.headers ?? {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${STAGING}${path}`, { ...init, headers, signal: AbortSignal.timeout(25000) });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function login() {
  const r = await json("/api/mobile/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email: "buyer@demo.lot", password: "demo1234", deviceId: "cart-image-smoke" }),
  });
  return r.body?.accessToken;
}

function isResolvableImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  if (url.startsWith("http://") || url.startsWith("https://")) return true;
  if (url.startsWith("/images/") || url.startsWith("/api/media")) return true;
  return false;
}

async function main() {
  const token = await login();
  if (!token) throw new Error("Login failed");
  const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const catalog = await json("/api/mobile/catalog/products?limit=10", { headers: auth });
  const product = (catalog.body?.items ?? []).find((p) => p.primaryImage?.url);
  if (!product) throw new Error("No product with image in catalog");

  await json("/api/cart", { method: "POST", headers: auth, body: JSON.stringify({ productId: product.id, quantity: 1 }) });
  const cart = await json("/api/cart", { headers: auth });
  const item = (cart.body?.items ?? []).find((i) => i.productId === product.id);
  const imageUrl = item?.product?.primaryImage?.url ?? null;

  const checks = [
    { name: "cart_get_ok", ok: cart.ok },
    { name: "item_present", ok: Boolean(item) },
    { name: "primaryImage_present", ok: Boolean(imageUrl) },
    { name: "image_url_resolvable", ok: isResolvableImageUrl(imageUrl) },
    { name: "matches_catalog_image", ok: imageUrl === product.primaryImage?.url },
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    staging: STAGING,
    productId: product.id,
    catalogImageUrl: product.primaryImage?.url ?? null,
    cartImageUrl: imageUrl,
    mobileRenderContract: "resolveImageUrl(relativePath, apiBaseUrl) required on client",
    checks,
    verdict: checks.every((c) => c.ok) ? "PASS" : "FAIL",
  };

  mkdirSync(resolve("artifacts/mobile-physical-fixes"), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.verdict === "PASS" ? 0 : 1);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
