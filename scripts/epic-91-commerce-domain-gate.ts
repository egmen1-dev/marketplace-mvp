#!/usr/bin/env tsx
/** EPIC 91 — Commerce Domain Platform architecture gate (no code changes expected) */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { repoRoot } from "./mobile-p0-gate-lib";

const REQUIRED = [
  "docs/product/EPIC_91_COMMERCE_DOMAIN_PLATFORM.md",
  "docs/product/COMMERCE_DOMAIN_GUIDELINES.md",
  "artifacts/epic-91-domain/domain-map.json",
  "artifacts/epic-91-domain/repository-map.json",
  "artifacts/epic-91-domain/usecase-map.json",
  "artifacts/epic-91-domain/state-map.json",
  "artifacts/epic-91-domain/dependency-report.json",
  "artifacts/epic-91-domain/seller-readiness.json",
  "artifacts/epic-91-domain/gate-report.json",
];

function main() {
  const root = repoRoot();
  const missing = REQUIRED.filter((p) => !existsSync(join(root, p)));
  const domainMap = JSON.parse(readFileSync(join(root, "artifacts/epic-91-domain/domain-map.json"), "utf8"));
  const repoMap = JSON.parse(readFileSync(join(root, "artifacts/epic-91-domain/repository-map.json"), "utf8"));
  const useCaseMap = JSON.parse(readFileSync(join(root, "artifacts/epic-91-domain/usecase-map.json"), "utf8"));
  const depReport = JSON.parse(readFileSync(join(root, "artifacts/epic-91-domain/dependency-report.json"), "utf8"));

  const report = {
    epic: "EPIC-91",
    generatedAt: new Date().toISOString(),
    verdict: missing.length === 0 ? "PASS" : "FAIL",
    missingDeliverables: missing,
    counts: {
      domains: domainMap.summary?.domainCount ?? domainMap.domains?.length,
      repositories: repoMap.summary?.repositoryCount ?? repoMap.repositories?.length,
      useCases: useCaseMap.summary?.useCaseCount ?? useCaseMap.useCases?.length,
      domainCycles: depReport.cycles?.domainCycles ?? 0,
      repositoryCycles: depReport.cycles?.repositoryCycles ?? 0,
    },
    baselineViolations: depReport.metrics,
    architectureReady: missing.length === 0,
    sellerReady: false,
    recommendedNextSprint: "Sprint 92 — Domain Foundation Implementation",
  };

  console.log(JSON.stringify(report, null, 2));
  if (missing.length > 0) process.exit(1);
}

main();
