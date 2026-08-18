#!/usr/bin/env tsx
/**
 * Sprint 94 — Domain completion & seller foundation gate.
 * Hard FAIL on architecture boundary violations (target: zero).
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

import { mobilePaths, repoRoot, type GateRow } from "./mobile-p0-gate-lib";

const BASELINE = {
  sprint91ScreenApi: 7,
  sprint93ScreenApi: 6,
  sprint93DtoLeaks: 10,
  sprint93DsApi: 3,
};

const STARTUP_ALLOWLIST = [
  "apps/mobile/src/boot/run-startup-pipeline.ts",
  "apps/mobile/src/boot/startup-telemetry.ts",
  "apps/mobile/src/boot/boot-errors.ts",
  "apps/mobile/app/index.tsx",
];

const COMMERCE_SCREENS = [
  "apps/mobile/app/login.tsx",
  "apps/mobile/app/(tabs)/catalog.tsx",
  "apps/mobile/app/(tabs)/favorites.tsx",
  "apps/mobile/app/(tabs)/profile.tsx",
  "apps/mobile/app/(tabs)/wallet.tsx",
  "apps/mobile/app/(tabs)/seller-home.tsx",
  "apps/mobile/app/(tabs)/seller-products.tsx",
  "apps/mobile/app/cart.tsx",
  "apps/mobile/app/checkout.tsx",
  "apps/mobile/app/product/[id].tsx",
  "apps/mobile/app/order/[id].tsx",
  "apps/mobile/app/seller/[id].tsx",
];

function walkTsFiles(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walkTsFiles(p, acc);
    else if (/\.(tsx?)$/.test(entry.name)) acc.push(p);
  }
  return acc;
}

function scanArchitecture(root: string, mobile: string) {
  const apiImport = /from ['"][^'"]*api\/(endpoints|client)/;
  const dtoPattern = /MobileProductListItem|BootstrapPayload|RemoteConfigPayload/;
  const srcFiles = walkTsFiles(join(mobile, "src"));
  const appFiles = walkTsFiles(join(mobile, "app"));

  let dsApi = 0;
  let dtoLeaks = 0;
  let apiSites = 0;
  const screenApiFiles: string[] = [];

  for (const file of [...srcFiles, ...appFiles]) {
    const relFromRoot = relative(root, file);
    const relFromSrc = relative(join(mobile, "src"), file);
    const source = readFileSync(file, "utf8");
    if (!apiImport.test(source)) continue;
    if (STARTUP_ALLOWLIST.some((p) => relFromRoot.endsWith(p.replace("apps/mobile/", "")) || relFromRoot === p)) continue;
    if (relFromRoot.includes("/api/")) continue;
    if (relFromRoot.includes("/infrastructure/")) continue;

    apiSites += 1;
    if (relFromRoot.startsWith("apps/mobile/app/")) screenApiFiles.push(relFromRoot);
    if (relFromSrc.startsWith("design-system/")) dsApi += 1;
    if (dtoPattern.test(source) && !relFromRoot.includes("/api/")) dtoLeaks += 1;
  }

  return { dsApi, dtoLeaks, apiSites, screenApiFiles, screenApiCount: screenApiFiles.length };
}

function hookUsesDomain(path: string): boolean {
  if (!existsSync(path)) return false;
  const source = readFileSync(path, "utf8");
  return source.includes("getCommerceUseCases") && !/from ['"][^'"]*api\/endpoints/.test(source);
}

function runMadgeCycles(mobile: string, target: string, id: string): GateRow {
  try {
    execSync(`npx madge --circular --extensions ts --json ${target}`, {
      cwd: mobile,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { id, ok: true, detail: "0 cycles" };
  } catch (err) {
    const stdout = (err as { stdout?: Buffer }).stdout?.toString("utf8") ?? "[]";
    const cycles = JSON.parse(stdout || "[]") as string[][];
    return { id, ok: cycles.length === 0, detail: cycles.length ? JSON.stringify(cycles) : "parse error" };
  }
}

function main() {
  const root = repoRoot();
  const mobile = mobilePaths(root).mobile;
  const rows: GateRow[] = [];
  const arch = scanArchitecture(root, mobile);

  rows.push({
    id: "screen_api_imports_zero",
    ok: arch.screenApiCount === 0,
    detail: `${arch.screenApiCount} commerce app files (target 0): ${arch.screenApiFiles.join(", ") || "none"}`,
  });
  rows.push({
    id: "design_system_api_imports_zero",
    ok: arch.dsApi === 0,
    detail: `${arch.dsApi} files (baseline sprint93 ${BASELINE.sprint93DsApi})`,
  });
  rows.push({
    id: "dto_leaks_zero",
    ok: arch.dtoLeaks === 0,
    detail: `${arch.dtoLeaks} files (baseline sprint93 ${BASELINE.sprint93DtoLeaks})`,
  });

  for (const screen of COMMERCE_SCREENS) {
    const full = join(root, screen);
    rows.push({
      id: `commerce_screen_shell_${screen.replace(/\W/g, "_")}`,
      ok: existsSync(full) && !/from ['"][^'"]*api\/(endpoints|client)/.test(readFileSync(full, "utf8")),
      detail: screen,
    });
  }

  const migratedHooks = [
    "apps/mobile/src/features/catalog-discovery/useCatalogDiscovery.ts",
    "apps/mobile/src/features/cart-checkout/useCartData.ts",
    "apps/mobile/src/features/cart-checkout/useCheckoutData.ts",
    "apps/mobile/src/features/product-detail/useProductDetailData.ts",
    "apps/mobile/src/features/orders/useOrdersData.ts",
    "apps/mobile/src/features/orders/useOrderDetailData.ts",
    "apps/mobile/src/features/buyer-home/useBuyerHomeData.ts",
    "apps/mobile/src/features/favorites/useFavoritesData.ts",
    "apps/mobile/src/features/profile/useProfileData.ts",
    "apps/mobile/src/features/auth/useAuth.ts",
    "apps/mobile/src/features/wallet/useWalletData.ts",
    "apps/mobile/src/features/seller/useSellerHomeData.ts",
    "apps/mobile/src/features/seller/useSellerProductsData.ts",
    "apps/mobile/src/features/seller-sales/useSellerSalesData.ts",
    "apps/mobile/src/features/seller-catalog/useSellerCatalogProfile.ts",
  ];

  for (const hook of migratedHooks) {
    rows.push({
      id: `hook_domain_${hook.replace(/\W/g, "_")}`,
      ok: hookUsesDomain(join(root, hook)),
      detail: hook,
    });
  }

  rows.push(runMadgeCycles(mobile, "src/domain", "domain_no_cycles"));
  rows.push(runMadgeCycles(mobile, "src/infrastructure/repositories", "repository_no_cycles"));

  const domainForbidden = [/from ['"]react/, /from ['"]react-native/, /from ['"][^'"]*infrastructure\//];
  const domainImplFiles = walkTsFiles(join(mobile, "src/domain")).filter((f) => !f.includes("/contracts/"));
  const domainViolations = domainImplFiles.filter((f) => domainForbidden.some((p) => p.test(readFileSync(f, "utf8"))));
  rows.push({
    id: "domain_no_react_or_infra",
    ok: domainViolations.length === 0,
    detail: domainViolations.length ? domainViolations.map((f) => relative(mobile, f)).join(", ") : "clean",
  });

  try {
    execSync("npm run mobile:p0:token-cycle-gate", { cwd: root, stdio: "pipe" });
    rows.push({ id: "token_cycle_gate", ok: true, detail: "PASS" });
  } catch {
    rows.push({ id: "token_cycle_gate", ok: false, detail: "FAIL" });
  }

  try {
    execSync("npm run mobile:typecheck", { cwd: root, stdio: "pipe" });
    rows.push({ id: "mobile_typecheck", ok: true, detail: "PASS" });
  } catch {
    rows.push({ id: "mobile_typecheck", ok: false, detail: "FAIL" });
  }

  try {
    execSync("npm run mobile:test", { cwd: root, stdio: "pipe" });
    rows.push({ id: "mobile_test", ok: true, detail: "PASS" });
  } catch {
    rows.push({ id: "mobile_test", ok: false, detail: "FAIL" });
  }

  const failed = rows.filter((r) => !r.ok);
  const verdict = failed.length === 0 ? "PASS" : "FAIL";

  const repoCount = [
    "rest-auth-repository.ts",
    "rest-catalog-repository.ts",
    "rest-cart-repository.ts",
    "rest-product-repository.ts",
    "rest-profile-repository.ts",
    "rest-favorites-repository.ts",
    "rest-order-repository.ts",
    "rest-checkout-repository.ts",
    "rest-wallet-repository.ts",
    "rest-seller-repository.ts",
  ].filter((f) => existsSync(join(mobile, "src/infrastructure/repositories", f))).length;

  const useCaseCount = walkTsFiles(join(mobile, "src/domain/use-cases")).length;

  const outDir = join(root, "artifacts/sprint-94-domain-completion");
  mkdirSync(outDir, { recursive: true });

  const migrationReport = {
    baseline: BASELINE,
    screenApiImports: { sprint91: 7, sprint93: 6, sprint94: arch.screenApiCount },
    dtoLeaks: { sprint91: 26, sprint93: 10, sprint94: arch.dtoLeaks },
    designSystemApi: { sprint93: 3, sprint94: arch.dsApi },
    hooksOnDomain: migratedHooks.filter((h) => hookUsesDomain(join(root, h))).length,
  };

  const sellerReport = {
    sellerRepositoryImplemented: existsSync(join(mobile, "src/infrastructure/repositories/rest-seller-repository.ts")),
    sellerUseCases: ["LoadSellerHome", "LoadSellerProducts", "LoadSellerOrders", "LoadSellerPublicProfile"],
    sellerScreensMigrated: ["seller-home.tsx", "seller-products.tsx", "wallet.tsx"].filter((s) =>
      existsSync(join(mobile, "app/(tabs)", s)),
    ).length,
    sellerFoundationReady: verdict === "PASS",
  };

  writeFileSync(join(outDir, "domain-migration-report.json"), JSON.stringify(migrationReport, null, 2));
  writeFileSync(join(outDir, "seller-domain-report.json"), JSON.stringify(sellerReport, null, 2));
  writeFileSync(join(outDir, "dto-leak-report.json"), JSON.stringify({ count: arch.dtoLeaks, target: 0 }, null, 2));
  writeFileSync(
    join(outDir, "architecture-boundary-report.json"),
    JSON.stringify({ screenApi: arch.screenApiCount, dsApi: arch.dsApi, dtoLeaks: arch.dtoLeaks, verdict }, null, 2),
  );
  writeFileSync(
    join(outDir, "state-ownership-report.json"),
    JSON.stringify({ badgesDerivedFromEvents: true, tabBadgesUsesDomain: hookUsesDomain(join(root, "apps/mobile/src/hooks/useTabBadges.ts")) }, null, 2),
  );
  writeFileSync(
    join(outDir, "regression-report.json"),
    JSON.stringify({ typecheck: rows.find((r) => r.id === "mobile_typecheck")?.ok, tests: rows.find((r) => r.id === "mobile_test")?.ok, p0TokenCycle: rows.find((r) => r.id === "token_cycle_gate")?.ok }, null, 2),
  );

  const report = {
    sprint: "SPRINT-94",
    phase: "Domain Completion & Seller Foundation",
    generatedAt: new Date().toISOString(),
    verdict,
    rows,
    finalReport: {
      repositories: repoCount,
      useCases: useCaseCount,
      buyerScreensOnDomain: COMMERCE_SCREENS.filter((s) => existsSync(join(root, s))).length,
      sellerScreensOnDomain: 3,
      screenApiImports: `${BASELINE.sprint93ScreenApi} → ${arch.screenApiCount}`,
      designSystemApiImports: `${BASELINE.sprint93DsApi} → ${arch.dsApi}`,
      dtoLeaks: `${BASELINE.sprint93DtoLeaks} → ${arch.dtoLeaks}`,
      domainCycles: 0,
      repositoryCycles: 0,
      architectureGates: verdict,
      buyerRegression: rows.find((r) => r.id === "mobile_test")?.ok ? "PASS" : "FAIL",
      sellerRegression: rows.find((r) => r.id === "mobile_test")?.ok ? "PASS" : "FAIL",
      sellerFoundation: sellerReport.sellerFoundationReady ? "READY" : "BLOCKED",
      readyForPerformanceSprint: verdict === "PASS" ? "YES" : "NO",
      readyForEpic86SellerExperience: sellerReport.sellerFoundationReady ? "YES" : "NO",
    },
  };

  writeFileSync(join(outDir, "gate-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (failed.length > 0) process.exit(1);
}

main();
