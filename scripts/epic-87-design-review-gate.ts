#!/usr/bin/env tsx
/** EPIC 87 acceptance gate — system + at least one physical screenshot workflow */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadBaselineManifest } from "@/lib/product-design-review/screenshot/intake";
import { reviewScreen } from "@/lib/product-design-review/review/orchestrator";
import {
  DEFAULT_RELEASE,
  buildDesignReviewReport,
  saveDesignReviewReport,
} from "@/lib/product-design-review/report/builder";

type Row = { id: string; ok: boolean; detail?: string };

async function main() {
  const rows: Row[] = [];
  const release = process.env.DESIGN_REVIEW_RELEASE ?? DEFAULT_RELEASE;
  const root = process.cwd();

  const required = [
    "lib/product-design-review/index.ts",
    "lib/product-design-review/types.ts",
    "scripts/design-review-cli.ts",
    "scripts/product-design-gate.ts",
    "docs/product/EPIC_87_DESIGN_REVIEW_SYSTEM.md",
    "docs/product/DESIGN_REVIEW_OPERATOR_GUIDE.md",
    "app/api/admin/product-ops/design-quality/route.ts",
  ];

  for (const file of required) {
    rows.push({ id: `file_${file.split("/").pop()}`, ok: existsSync(join(root, file)), detail: file });
  }

  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { scripts?: Record<string, string> };
  rows.push({ id: "design_review_cli", ok: pkg.scripts?.["design:review"] === "tsx scripts/design-review-cli.ts" });
  rows.push({ id: "product_design_gate", ok: pkg.scripts?.["product:design-gate"] === "tsx scripts/product-design-gate.ts" });
  rows.push({ id: "epic_87_gate", ok: pkg.scripts?.["product:epic-87:design-review"] === "tsx scripts/epic-87-design-review-gate.ts" });

  const agents = readFileSync(join(root, "AGENTS.md"), "utf8");
  rows.push({ id: "agents_epic_87_rule", ok: agents.includes("EPIC 87") && agents.includes("Design Review Gate") });

  const pilotScreen = process.env.DESIGN_REVIEW_PILOT_SCREEN ?? "login";
  const pilotResult = await reviewScreen({ screen: pilotScreen, release, includeScreenshot: true });
  rows.push({
    id: "pilot_screen_review_runs",
    ok: pilotResult.reviewRulesVersion.length > 0 && pilotResult.issues.every((i) => i.evidence.length > 0),
    detail: `${pilotScreen} issues=${pilotResult.issues.length}`,
  });

  const hasPhysicalScreenshot = existsSync(
    join(root, "artifacts/design-review", release, pilotScreen, "screenshot.png"),
  );
  const approvals = loadBaselineManifest(release, root);
  const pilotApproved = approvals.some((a) => a.screen === pilotScreen);

  rows.push({
    id: "physical_screenshot_workflow",
    ok: hasPhysicalScreenshot,
    detail: hasPhysicalScreenshot ? "screenshot.png present" : "MISSING_PHYSICAL_EVIDENCE",
  });
  rows.push({
    id: "human_baseline_approval",
    ok: pilotApproved,
    detail: pilotApproved ? `approved by ${approvals.find((a) => a.screen === pilotScreen)?.approvedBy}` : "pending operator approval",
  });
  rows.push({
    id: "epic_87_hard_gate_physical",
    ok: hasPhysicalScreenshot && pilotApproved,
    detail: "Screenshot → Review → Human approval → Approved baseline",
  });

  const report = buildDesignReviewReport([pilotResult], release);
  saveDesignReviewReport(report);

  rows.push({
    id: "missing_screenshot_not_fake_pass",
    ok: !hasPhysicalScreenshot ? pilotResult.verdict !== "PASS" || pilotResult.issues.some((i) => i.title.includes("MISSING_PHYSICAL_EVIDENCE")) : true,
  });

  const failed = rows.filter((r) => !r.ok);
  const out = {
    epic: "EPIC-87",
    generatedAt: new Date().toISOString(),
    verdict: failed.length === 0 ? "PASS" : "FAIL",
    pilotScreen,
    release,
    sellerSprint1: report.finalVerdicts.sellerExperienceSprint1,
    rows,
  };

  const outDir = join(root, "artifacts/epic-87-design-review");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "acceptance-gate.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
