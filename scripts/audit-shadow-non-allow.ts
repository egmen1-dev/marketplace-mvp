#!/usr/bin/env node
/** EPIC 190.2 — audit non-ALLOW cases from shadow report with full evidence chain */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { evaluateLotPolicyV2 } from "@/lib/moderation/policy-v2/evaluate";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const REPORT = join(process.cwd(), "artifacts/policy-v2-shadow/staging-shadow-report.json");
const OUT = join(process.cwd(), "artifacts/policy-v2-shadow/non-allow-audit.json");
const OUT_BEFORE = join(process.cwd(), "artifacts/policy-v2-shadow/non-allow-audit-before-v2_1.json");

type Row = {
  productId: string;
  policyDecision: string;
  rulesTriggered?: string[];
};

async function fetchProduct(id: string) {
  const res = await fetch(`${STAGING}/api/products/${id}`, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) return null;
  return (await res.json()) as {
    title?: string;
    description?: string | null;
    category?: { slug?: string; name?: string };
    productType?: { slug?: string; name?: string };
  };
}

async function main() {
  mkdirSync(join(process.cwd(), "artifacts/policy-v2-shadow"), { recursive: true });
  const report = JSON.parse(readFileSync(REPORT, "utf8")) as { rows: Row[] };
  const nonAllow = report.rows.filter((r) => r.policyDecision !== "ALLOW");

  const audits = [];
  for (const row of nonAllow) {
    const product = await fetchProduct(row.productId);
    const title = product?.title ?? "";
    const description = product?.description ?? "";
    const categorySlug = product?.category?.slug ?? null;
    const productTypeSlug = product?.productType?.slug ?? null;

    const policy = evaluateLotPolicyV2({
      title,
      description,
      categorySlug,
      productTypeSlug,
    });

    let verdict: "CORRECT" | "SUSPECTED_FALSE_POSITIVE" | "NEEDS_HUMAN_REVIEW" = "NEEDS_HUMAN_REVIEW";
    const evidence = policy.evidence.map((e) => ({
      source: e.source,
      policyId: e.policyId,
      matchedValue: e.matchedValue,
      detail: e.detail,
    }));

    if (policy.rulesTriggered.includes("LOT_ADULT_CONTENT_V2") && /^x+$/i.test(description.trim())) {
      verdict = "SUSPECTED_FALSE_POSITIVE";
    }
    if (
      policy.rulesTriggered.includes("LOT_WEAPON_FIREARM_V2") &&
      /патроном\s+sds|sds\+|патрон\s+для\s+дрел|сверлильн/i.test(`${title}\n${description}`)
    ) {
      verdict = "SUSPECTED_FALSE_POSITIVE";
    }
    if (policy.rulesTriggered.includes("LOT_COSMETICS_V2") && policy.decisionClass === "RESTRICTED_REVIEW") {
      verdict = "CORRECT";
    }
    if (
      policy.rulesTriggered.includes("LOT_COSMETICS_V2") &&
      policy.decisionClass === "ALLOW" &&
      /парфюм|духи/i.test(title)
    ) {
      verdict = "SUSPECTED_FALSE_POSITIVE";
    }

    audits.push({
      productId: row.productId,
      title,
      category: product?.category?.name ?? categorySlug,
      productType: product?.productType?.name ?? productTypeSlug,
      policyDecision: policy.decisionClass,
      rulesTriggered: policy.rulesTriggered,
      evidence,
      exactReason: policy.adminSummary,
      verdict,
    });
  }

  const out = {
    generatedAt: new Date().toISOString(),
    policyVersion: "LOT_POLICY_V2_1",
    count: audits.length,
    suspectedFalsePositives: audits.filter((a) => a.verdict === "SUSPECTED_FALSE_POSITIVE").length,
    audits,
  };
  try {
    const prior = JSON.parse(readFileSync(OUT, "utf8")) as { audits: typeof audits };
    writeFileSync(OUT_BEFORE, JSON.stringify(prior, null, 2));
  } catch {
    // no prior audit artifact
  }
  writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ out: OUT, ...out }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
