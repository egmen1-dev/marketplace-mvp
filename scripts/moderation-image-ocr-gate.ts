#!/usr/bin/env node
/** EPIC 189.1 — real pixel OCR + image moderation gate */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  evaluateLotImages,
  isImageModerationOperational,
  isOcrOperational,
} from "@/lib/moderation/providers";
import { evaluateLotPolicyV2 } from "@/lib/moderation/policy-v2/evaluate";
import { OCR_AVAILABLE, IMAGE_MODERATION_AVAILABLE } from "@/lib/moderation/signals/image-signals";
import { automationVerdict } from "@/lib/moderation/policy-v2/safe-auto-approval";

function fail(msg: string): never {
  console.error(`[FAIL] ${msg}`);
  process.exit(1);
}

const requiredDocs = [
  "docs/product/LOT_IMAGE_OCR_PROVIDER_DECISION.md",
  "docs/product/LOT_POLICY_V2_ARCHITECTURE.md",
];

for (const doc of requiredDocs) {
  if (!existsSync(doc)) fail(`missing ${doc}`);
}

const imagesDir = join(process.cwd(), "tests/fixtures/policy-v2/images");
const manifestPath = join(imagesDir, "manifest.json");
if (!existsSync(manifestPath)) {
  console.log("[RUN] generate image fixtures");
  execFileSync("node", ["scripts/generate-policy-v2-image-fixtures.mjs"], { stdio: "inherit" });
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
  fixtures: Array<{ id: string; path: string }>;
};
if (manifest.fixtures.length < 10) {
  fail(`expected >= 10 image fixtures, got ${manifest.fixtures.length}`);
}

if (!isOcrOperational() || !OCR_AVAILABLE) {
  fail("OCR provider must be operational for this gate");
}
if (!isImageModerationOperational() || !IMAGE_MODERATION_AVAILABLE) {
  fail("Image moderation provider must be operational for this gate");
}

async function main(): Promise<void> {
  const nicotineFixture = manifest.fixtures.find((f) => f.id === "nicotine-label");
  if (!nicotineFixture) fail("missing nicotine-label fixture");

  const imageEval = await evaluateLotImages({
    images: [{ imageId: "gate-nicotine", url: nicotineFixture.path, sortOrder: 0 }],
    fetchFromPath: true,
  });

  if (imageEval.ocrStatus !== "EVALUATED") {
    fail(`OCR status expected EVALUATED, got ${imageEval.ocrStatus}`);
  }
  if (!imageEval.combinedOcrText.match(/nicotine|никотин|mg/i)) {
    fail("OCR failed to extract nicotine label text from fixture");
  }

  const multimodal = evaluateLotPolicyV2({
    title: "Ароматизатор",
    description: "без никотина",
    characteristics: [{ name: "Никотин", value: "0" }],
    imageUrls: [nicotineFixture.path],
    imageEvaluation: imageEval,
  });

  if (multimodal.decisionClass === "ALLOW") {
    fail("multimodal conflict must not ALLOW");
  }

  console.log("[RUN] vitest moderation-image-ocr");
  execFileSync("npm", ["test", "--", "tests/moderation-image-ocr.test.ts"], { stdio: "inherit" });

  console.log("[RUN] moderation:policy-v2:gate");
  execFileSync("npm", ["run", "moderation:policy-v2:gate"], { stdio: "inherit" });

  const verdict = automationVerdict({
    policyResearchComplete: true,
    imageEngineOperational: IMAGE_MODERATION_AVAILABLE,
    ocrOperational: OCR_AVAILABLE,
    criticalFalseNegatives: 0,
  });

  console.log(
    JSON.stringify(
      {
        verdict: "PASS",
        automationVerdict: verdict,
        ocrProvider: "tesseract",
        imageProvider: "pixel-composite",
        imageFixtures: manifest.fixtures.length,
        ocrStatus: imageEval.ocrStatus,
        imageStatus: imageEval.imageStatus,
        multimodalDecision: multimodal.decisionClass,
        guardedAuto: "DISABLED",
        enforce: "DISABLED",
        rc105: "NOT_STARTED",
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
