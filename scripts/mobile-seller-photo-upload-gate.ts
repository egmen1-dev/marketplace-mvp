#!/usr/bin/env tsx
/** P0 seller photo upload gate — source contracts + staging JPEG smoke */
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const checks: Array<{ id: string; ok: boolean; detail: string }> = [];

function pass(id: string, detail: string) {
  checks.push({ id, ok: true, detail });
}

function fail(id: string, detail: string) {
  checks.push({ id, ok: false, detail });
}

function mustContain(file: string, needle: string, id: string) {
  const src = readFileSync(file, "utf8");
  if (src.includes(needle)) pass(id, `${file} contains ${needle}`);
  else fail(id, `${file} missing ${needle}`);
}

function mustNotContain(file: string, needle: string, id: string) {
  const src = readFileSync(file, "utf8");
  if (!src.includes(needle)) pass(id, `${file} excludes ${needle}`);
  else fail(id, `${file} still contains ${needle}`);
}

mustContain("apps/mobile/src/seller/upload-seller-lot-image.ts", 'from "expo-file-system"', "expo_file_system");
mustContain("apps/mobile/src/seller/upload-seller-lot-image.ts", "form.append(\"file\", uploadFile)", "formdata_file_object");
mustNotContain("apps/mobile/src/seller/upload-seller-lot-image.ts", "uri: localUri", "no_rn_uri_formdata");
mustNotContain("apps/mobile/src/seller/upload-seller-lot-image.ts", "as unknown as Blob", "no_fake_blob_cast");
mustContain("apps/mobile/src/seller/normalize-image-picker-asset.ts", "defaultLotPhotoFileName", "asset_normalization");
mustContain("apps/mobile/src/seller/use-lot-create-form.ts", "processUploadQueue", "upload_on_pick");
mustContain("apps/mobile/src/seller/use-lot-create-form.ts", "uploadWaitPublish", "publish_upload_guard");
mustContain("apps/mobile/src/seller/lot-create-copy.ts", "uploadInProgress", "upload_progress_copy");
mustContain("app/api/mobile/seller/uploads/route.ts", "requireSellerFromRequest", "mobile_jwt_upload_route");
mustContain("app/api/mobile/seller/uploads/route.ts", "mimeType: contentType", "upload_response_contract");

const smokePath = "artifacts/mobile-seller-photo-upload/staging-smoke.json";
if (!existsSync(smokePath)) {
  try {
    execFileSync("node", ["scripts/mobile-seller-photo-upload-staging-smoke.mjs"], { stdio: "pipe", encoding: "utf8" });
  } catch (err) {
    const output = err instanceof Error && "stdout" in err ? String((err as { stdout?: string }).stdout ?? "") : "";
    fail("staging_smoke", `staging smoke failed: ${output.slice(0, 300)}`);
  }
}

if (existsSync(smokePath)) {
  const smoke = JSON.parse(readFileSync(smokePath, "utf8")) as { verdict?: string };
  if (smoke.verdict === "PASS") pass("staging_smoke", "real JPEG upload smoke PASS");
  else fail("staging_smoke", `verdict=${smoke.verdict ?? "UNKNOWN"}`);
}

const failed = checks.filter((c) => !c.ok);
const verdict = failed.length === 0 ? "PASS" : "FAIL";

console.log(
  JSON.stringify(
    {
      gate: "mobile:seller-photo-upload",
      verdict,
      status: failed.length === 0 ? "READY_FOR_RC10.1_BUILD" : "BLOCKED",
      checks,
      failed: failed.map((f) => f.id),
    },
    null,
    2,
  ),
);

process.exit(failed.length === 0 ? 0 : 1);
