#!/usr/bin/env tsx
/** Mobile web parity gate — distinguishes verification levels (no APK build in this EPIC). */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

type Level = "PASS" | "FAIL" | "NOT_RUN" | "NOT_BUILT";

type Matrix = {
  verificationLevels: Record<string, Record<string, Level>>;
};

function main() {
  const matrixPath = "artifacts/mobile-web-parity/feature-matrix.json";
  const matrix = JSON.parse(readFileSync(matrixPath, "utf8")) as Matrix;

  const requiredFiles = [
    "apps/mobile/src/components/CommerceHeader.tsx",
    "apps/mobile/app/messages/index.tsx",
    "app/api/mobile/conversations/route.ts",
    "docs/mobile/EPIC_WEB_MOBILE_PARITY_CHAT.md",
  ];

  const results: Array<{ name: string; ok: boolean; detail?: string }> = [];

  for (const file of requiredFiles) {
    try {
      readFileSync(file);
      results.push({ name: `file:${file}`, ok: true });
    } catch {
      results.push({ name: `file:${file}`, ok: false, detail: "missing" });
    }
  }

  const chat = matrix.verificationLevels.chat;
  results.push({ name: "chat_source_pass", ok: chat?.source === "PASS" });
  results.push({ name: "chat_apk_not_built", ok: chat?.apk === "NOT_BUILT" });
  results.push({ name: "no_version_bump", ok: !readFileSync("apps/mobile/app.json", "utf8").includes("0.1.10-beta.3") });

  try {
    execSync("npm run mobile:typecheck", { stdio: "pipe" });
    results.push({ name: "mobile_typecheck", ok: true });
  } catch (e) {
    results.push({ name: "mobile_typecheck", ok: false, detail: String(e) });
  }

  const failed = results.filter((r) => !r.ok);
  const outDir = "artifacts/mobile-web-parity";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "gate-report.json"), JSON.stringify({ results, failed: failed.length, verdict: failed.length ? "BLOCKED" : "READY_FOR_BUILD" }, null, 2));

  if (failed.length) {
    console.error("mobile-web-parity gate FAILED", failed);
    process.exit(1);
  }
  console.log("mobile-web-parity gate PASS");
}

main();
