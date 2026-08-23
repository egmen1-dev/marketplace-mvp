#!/usr/bin/env node
/** RC7 APK forensics — verify bundle contains expected symbols (presence only, not physical PASS). */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const apkPath = process.argv[2] ?? "artifacts/closed-beta-rc7/lot_android_closed_beta_0.1.12_beta.1.apk";
const OUT = resolve("artifacts/closed-beta-rc7/apk-feature-verification.json");
const fullPath = resolve(apkPath);

function run(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: "utf8" }).trim();
  } catch (err) {
    return "";
  }
}

function bundleContains(pattern) {
  const out = run("bash", [
    "-c",
    `unzip -p '${fullPath}' 'assets/index.android.bundle' 2>/dev/null | grep -F '${pattern}' | head -1`,
  ]);
  return out.length > 0;
}

const bytes = readFileSync(fullPath);
const sha256 = createHash("sha256").update(bytes).digest("hex");
const sizeBytes = statSync(fullPath).size;
const aapt = run("aapt", ["dump", "badging", fullPath]);

const identity = {
  package: aapt.match(/package: name='([^']+)'/)?.[1],
  versionName: aapt.match(/versionName='([^']+)'/)?.[1],
  versionCode: aapt.match(/versionCode='([^']+)'/)?.[1],
  nativeCode: aapt.match(/native-code: '([^']+)'/)?.[1],
  sha256,
  sizeBytes,
};

const symbolGroups = {
  visual: [
    { name: "BootSplash", pattern: "BootSplash" },
    { name: "CategoryRail", pattern: "CategoryRail" },
    { name: "Chip", pattern: "Chip" },
    { name: "CatalogToolbar", pattern: "CatalogToolbar" },
    { name: "BetaBanner", pattern: "BetaBanner" },
    { name: "ProductCardLayout", pattern: "PRODUCT_CARD_LAYOUT" },
    { name: "selectRailCategories", pattern: "selectRailCategories" },
  ],
  commerce: [
    { name: "useCommerceActions", pattern: "useCommerceActions" },
    { name: "cart", pattern: "/cart" },
    { name: "favorites", pattern: "favorites" },
    { name: "resolveImageUrl", pattern: "resolveImageUrl" },
  ],
  header: [
    { name: "CommerceHeader", pattern: "CommerceHeader" },
    { name: "searchEntry", pattern: "focusSearch" },
    { name: "messagesEntry", pattern: "/messages" },
    { name: "cartEntry", pattern: "/cart" },
    { name: "useMessagesBadge", pattern: "useMessagesBadge" },
  ],
  chat: [
    { name: "messagesRoute", pattern: "/messages" },
    { name: "conversationScreen", pattern: "conversations" },
    { name: "sendMessage", pattern: "sendConversationMessage" },
    { name: "unreadHandling", pattern: "fetchConversationsUnread" },
  ],
  seller: [
    { name: "sellerStorefront", pattern: "seller" },
    { name: "openSellerStorefront", pattern: "openSellerStorefront" },
  ],
  update: [
    { name: "updateRoute", pattern: "/update" },
    { name: "useUpdateCheckFlow", pattern: "useUpdateCheckFlow" },
    { name: "fetchMobileUpdate", pattern: "fetchMobileUpdate" },
    { name: "startApkDownload", pattern: "startApkDownload" },
  ],
};

const checks = [];
for (const [group, items] of Object.entries(symbolGroups)) {
  for (const item of items) {
    const present = bundleContains(item.pattern);
    checks.push({ group, name: item.name, pattern: item.pattern, present, ok: present });
  }
}

const identityChecks = [
  { name: "versionName", ok: identity.versionName === "0.1.12-beta.1", expected: "0.1.12-beta.1", actual: identity.versionName },
  { name: "versionCode", ok: identity.versionCode === "12", expected: "12", actual: identity.versionCode },
  { name: "package", ok: identity.package === "ru.lot.marketplace.alpha", expected: "ru.lot.marketplace.alpha", actual: identity.package },
  { name: "abi", ok: identity.nativeCode?.includes("arm64-v8a"), expected: "arm64-v8a", actual: identity.nativeCode },
  { name: "rc7Label", ok: bundleContains("RC7"), expected: "RC7 in bundle", actual: bundleContains("RC7") ? "present" : "missing" },
  { name: "stagingChannel", ok: bundleContains("staging") || bundleContains("web-production-e56fb"), expected: "staging", actual: "bundle" },
  { name: "closedBeta", ok: bundleContains("CLOSED_BETA"), expected: "CLOSED_BETA", actual: bundleContains("CLOSED_BETA") ? "present" : "missing" },
];

const failed = checks.filter((c) => !c.ok).concat(identityChecks.filter((c) => !c.ok));
const report = {
  generatedAt: new Date().toISOString(),
  apkPath: fullPath,
  identity,
  identityChecks,
  symbolChecks: checks,
  evidenceNote: "APK bundle symbol presence only — not physical PASS",
  failed: failed.map((f) => f.name),
  verdict: failed.length === 0 ? "PASS" : "FAIL",
};

mkdirSync(resolve("artifacts/closed-beta-rc7"), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ verdict: report.verdict, failed: report.failed, identity }, null, 2));
process.exit(report.verdict === "PASS" ? 0 : 1);
