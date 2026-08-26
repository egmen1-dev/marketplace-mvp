#!/usr/bin/env node
/** EPIC 190.1 — staging image/OCR smoke before full shadow dataset */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { evaluateLotPolicyV2 } from "@/lib/moderation/policy-v2/evaluate";
import { evaluateLotImages } from "@/lib/moderation/providers/evaluate-lot-images";
import { terminateTesseractWorker } from "@/lib/moderation/providers/tesseract-ocr";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const OUT = join(process.cwd(), "artifacts/policy-v2-shadow/staging-image-ocr-smoke.json");

type SmokeCase = {
  id: string;
  source: "fixture" | "staging";
  imagePath?: string;
  imageUrl?: string;
};

const FIXTURE_CASES: SmokeCase[] = [
  { id: "safe-drill", source: "fixture", imagePath: "tests/fixtures/policy-v2/images/safe-drill.png" },
  { id: "cyrillic-packaging", source: "fixture", imagePath: "tests/fixtures/policy-v2/images/cyrillic-packaging.png" },
  { id: "mixed-latin-cyrillic", source: "fixture", imagePath: "tests/fixtures/policy-v2/images/mixed-latin-cyrillic.png" },
  { id: "phone-on-image", source: "fixture", imagePath: "tests/fixtures/policy-v2/images/phone-on-image.png" },
  { id: "url-on-image", source: "fixture", imagePath: "tests/fixtures/policy-v2/images/url-on-image.png" },
  { id: "nicotine-label", source: "fixture", imagePath: "tests/fixtures/policy-v2/images/nicotine-label.png" },
  { id: "vape-packaging", source: "fixture", imagePath: "tests/fixtures/policy-v2/images/vape-packaging.png" },
  { id: "ambiguous-bottle", source: "fixture", imagePath: "tests/fixtures/policy-v2/images/ambiguous-bottle.png" },
  { id: "low-contrast", source: "fixture", imagePath: "tests/fixtures/policy-v2/images/low-contrast.png" },
];

async function fetchStagingSampleImage(): Promise<SmokeCase | null> {
  try {
    const res = await fetch(`${STAGING}/api/mobile/catalog/products?pageSize=5`, {
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { items?: Array<{ id: string; name: string; imageUrl?: string }> };
    const item = body.items?.find((i) => i.imageUrl);
    if (!item?.imageUrl) return null;
    return { id: `staging-${item.id}`, source: "staging", imageUrl: item.imageUrl };
  } catch {
    return null;
  }
}

async function runCase(testCase: SmokeCase) {
  const started = Date.now();
  const imageEval = await evaluateLotImages({
    images: [
      {
        imageId: testCase.id,
        url: testCase.imagePath ?? testCase.imageUrl ?? "",
        sortOrder: 0,
      },
    ],
    fetchFromPath: Boolean(testCase.imagePath),
  });

  const policy = evaluateLotPolicyV2({
    title: testCase.id,
    description: "smoke test",
    imageUrls: [testCase.imagePath ?? testCase.imageUrl ?? ""],
    imageEvaluation: imageEval,
  });

  return {
    id: testCase.id,
    source: testCase.source,
    imageHash: imageEval.perImage[0]?.contentHash ?? null,
    ocrStatus: imageEval.ocrStatus,
    ocrText: imageEval.combinedOcrText.slice(0, 500),
    ocrConfidence: imageEval.perImage[0]?.ocr.confidence ?? 0,
    imageStatus: imageEval.imageStatus,
    signals: imageEval.perImage[0]?.image.policySignals?.map((s) => s.label) ?? [],
    qrDetected: imageEval.perImage[0]?.image.qrDetected ?? false,
    rulesTriggered: policy.rulesTriggered,
    recommendation: policy.decisionClass,
    evaluationCompleteness: policy.evaluationCompleteness,
    notEvaluated: policy.notEvaluatedDimensions,
    conflicts: policy.conflicts,
    latencyMs: Date.now() - started,
    providerFailure: imageEval.ocrStatus === "FAILED" || imageEval.imageStatus === "FAILED",
    notAllowOnFailure: policy.decisionClass !== "ALLOW" || imageEval.ocrStatus !== "FAILED",
  };
}

async function main(): Promise<void> {
  mkdirSync(join(process.cwd(), "artifacts/policy-v2-shadow"), { recursive: true });

  const cases = [...FIXTURE_CASES];
  const stagingCase = await fetchStagingSampleImage();
  if (stagingCase) cases.push(stagingCase);

  // Failure simulation — unavailable provider env
  process.env.MODERATION_OCR_PROVIDER = "unavailable";
  const failureEval = evaluateLotPolicyV2({
    title: "failure-sim",
    description: "test",
    imageUrls: [FIXTURE_CASES[0].imagePath!],
    imageEvaluation: null,
  });
  delete process.env.MODERATION_OCR_PROVIDER;

  const results = [];
  for (const testCase of cases) {
    results.push(await runCase(testCase));
  }

  const vapeNoNicotine = evaluateLotPolicyV2({
    title: "Жидкость для вэйпа",
    description: "фруктовый вкус",
    imageUrls: ["tests/fixtures/policy-v2/images/vape-packaging.png"],
    imageEvaluation: await evaluateLotImages({
      images: [{ imageId: "vape-a", url: "tests/fixtures/policy-v2/images/vape-packaging.png", sortOrder: 0 }],
      fetchFromPath: true,
    }),
  });

  const vapeNicotine = evaluateLotPolicyV2({
    title: "Ароматизатор",
    description: "без никотина",
    characteristics: [{ name: "Никотин", value: "0" }],
    imageUrls: ["tests/fixtures/policy-v2/images/nicotine-label.png"],
    imageEvaluation: await evaluateLotImages({
      images: [{ imageId: "vape-b", url: "tests/fixtures/policy-v2/images/nicotine-label.png", sortOrder: 0 }],
      fetchFromPath: true,
    }),
  });

  const vapeAccessory = evaluateLotPolicyV2({
    title: "Чехол для вейпа",
    description: "силиконовый чехол",
  });

  const report = {
    generatedAt: new Date().toISOString(),
    staging: STAGING,
    caseCount: results.length,
    results,
    failureSimulation: {
      decision: failureEval.decisionClass,
      notEvaluated: failureEval.notEvaluatedDimensions,
      notAllow: failureEval.decisionClass !== "ALLOW",
    },
    vapeCases: {
      noNicotineEvidence: vapeNoNicotine.decisionClass,
      nicotineEvidence: vapeNicotine.decisionClass,
      accessory: vapeAccessory.decisionClass,
    },
    verdict: results.every((r) => !r.providerFailure || r.recommendation !== "ALLOW") ? "PASS" : "FAIL",
  };

  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ out: OUT, verdict: report.verdict, cases: results.length }, null, 2));
  await terminateTesseractWorker();
}

main().catch(async (err) => {
  console.error(err);
  await terminateTesseractWorker().catch(() => {});
  process.exit(1);
});
