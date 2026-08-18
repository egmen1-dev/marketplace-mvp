#!/usr/bin/env tsx
/** Sprint 89 — deep link contract report */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { deepLinkTargetToHref, resolveDeepLinkTarget } from "../apps/mobile/src/deep-links/resolve-deep-link-target";
import { parseLotDeepLink } from "../apps/mobile/src/deep-links/parse-lot-link";

type Case = { uri: string; expectRoute: string | null; expectHref: string | null };

const CASES: Case[] = [
  { uri: "lot://product/p-1", expectRoute: "product", expectHref: "/product/p-1" },
  { uri: "lot://order/ord-1", expectRoute: "order", expectHref: "/order/ord-1" },
  { uri: "lot://seller/s-1", expectRoute: "seller", expectHref: "/seller/s-1" },
  { uri: "lot://catalog", expectRoute: "catalog", expectHref: "/(tabs)/catalog" },
  { uri: "lot://favorites", expectRoute: "favorites", expectHref: "/(tabs)/favorites" },
  { uri: "lot://profile", expectRoute: "profile", expectHref: "/(tabs)/profile" },
  { uri: "lot://seller/sales", expectRoute: "sellerSales", expectHref: "/(tabs)/seller-sales" },
  { uri: "lot://unknown", expectRoute: null, expectHref: null },
];

function main() {
  const rows = CASES.map((c) => {
    const parsed = parseLotDeepLink(c.uri);
    const screen = parsed?.screen ?? null;
    const href = parsed ? deepLinkTargetToHref(resolveDeepLinkTarget(parsed)) : null;
    const ok = screen === c.expectRoute && href === c.expectHref;
    return { ...c, screen, href, ok };
  });

  let testOk = true;
  try {
    execSync("npm run mobile:test", { stdio: "pipe" });
  } catch {
    testOk = false;
  }

  const failed = rows.filter((r) => !r.ok);
  const report = {
    sprint: "SPRINT-89",
    generatedAt: new Date().toISOString(),
    verdict: failed.length === 0 && testOk ? "PASS" : "FAIL",
    automatedTests: testOk ? "PASS" : "FAIL",
    rows,
    failed,
  };

  const outDir = join(process.cwd(), "artifacts/sprint-89-product-correctness");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "deep-link-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (report.verdict !== "PASS") process.exit(1);
}

main();
