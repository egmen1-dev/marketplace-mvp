#!/usr/bin/env node
/** RC8 APK forensics — verify bundle contains EPIC 152/154 symbols (presence only, not physical PASS). */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const apkPath = process.argv[2] ?? "artifacts/closed-beta-rc8/lot_android_closed_beta_0.1.13_beta.1.apk";
const OUT = resolve("artifacts/closed-beta-rc8/apk-feature-verification.json");
const fullPath = resolve(apkPath);

function run(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function bundleContains(pattern) {
  const out = run("bash", [
    "-c",
    `unzip -p '${fullPath}' 'assets/index.android.bundle' 2>/dev/null | strings | grep -F '${pattern}' | head -1`,
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
  epic152_sellerLoop: [
    { name: "fetchSellerOrders", pattern: "fetchSellerOrders" },
    { name: "sellerSalesScreen", pattern: "seller-sales" },
    { name: "openWebHandoff", pattern: "openWebHandoff" },
    { name: "buildBuyerOrderTimeline", pattern: "buildBuyerOrderTimeline" },
    { name: "orderDetailRoute", pattern: "/order/" },
  ],
  epic154_criticalPath: [
    { name: "useCheckoutReturnRefresh", pattern: "useCheckoutReturnRefresh" },
    { name: "checkoutSuccessParam", pattern: "checkoutSuccess=1" },
    { name: "formatBuyerOrderStatus", pattern: "formatBuyerOrderStatus" },
    { name: "orderSuccessBanner", pattern: "successCard" },
    { name: "sellerTrustBlock", pattern: "trustBlock" },
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

const commitInBundle = bundleContains(process.env.EXPO_PUBLIC_COMMIT_SHA?.slice(0, 7) ?? "4cf3b19")
  ? process.env.EXPO_PUBLIC_COMMIT_SHA?.slice(0, 7) ?? "present"
  : bundleContains("4cf3b19") ? "4cf3b19" : "missing";

const identityChecks = [
  { name: "versionName", ok: identity.versionName === "0.1.13-beta.1", expected: "0.1.13-beta.1", actual: identity.versionName },
  { name: "versionCode", ok: identity.versionCode === "13", expected: "13", actual: identity.versionCode },
  { name: "package", ok: identity.package === "ru.lot.marketplace.alpha", expected: "ru.lot.marketplace.alpha", actual: identity.package },
  { name: "abi", ok: identity.nativeCode?.includes("arm64-v8a"), expected: "arm64-v8a", actual: identity.nativeCode },
  { name: "rc8Label", ok: bundleContains("RC8"), expected: "RC8 in bundle", actual: bundleContains("RC8") ? "present" : "missing" },
  { name: "stagingUrl", ok: bundleContains("web-production-e56fb"), expected: "staging URL", actual: bundleContains("web-production-e56fb") ? "present" : "missing" },
  { name: "closedBeta", ok: bundleContains("CLOSED_BETA"), expected: "CLOSED_BETA", actual: bundleContains("CLOSED_BETA") ? "present" : "missing" },
  { name: "commitSha", ok: commitInBundle !== "missing", expected: "commit SHA in bundle", actual: commitInBundle },
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

mkdirSync(resolve("artifacts/closed-beta-rc8"), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ verdict: report.verdict, failed: report.failed, identity }, null, 2));
process.exit(report.verdict === "PASS" ? 0 : 1);
