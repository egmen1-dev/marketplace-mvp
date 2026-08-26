import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { evaluateLotPolicyV2 } from "@/lib/moderation/policy-v2/evaluate";
import { evaluateLotImages, isImageModerationOperational, isOcrOperational } from "@/lib/moderation/providers";
import { TesseractOcrProvider } from "@/lib/moderation/providers/tesseract-ocr";
import { PixelCompositeImageModerationProvider } from "@/lib/moderation/providers/pixel-image-moderation";
import { fetchImageBytesFromPath, hashImageBytes } from "@/lib/moderation/providers/fetch-image";
import { OCR_AVAILABLE, IMAGE_MODERATION_AVAILABLE } from "@/lib/moderation/signals/image-signals";

const imagesDir = join(process.cwd(), "tests/fixtures/policy-v2/images");
const manifestPath = join(imagesDir, "manifest.json");

describe("EPIC 189.1 — provider contracts", () => {
  it("exposes operational flags truthfully", () => {
    expect(typeof isOcrOperational()).toBe("boolean");
    expect(typeof isImageModerationOperational()).toBe("boolean");
    expect(OCR_AVAILABLE).toBe(isOcrOperational());
    expect(IMAGE_MODERATION_AVAILABLE).toBe(isImageModerationOperational());
  });

  it("provider interfaces return status fields", async () => {
    if (!existsSync(join(imagesDir, "safe-drill.png"))) {
      return;
    }
    const { bytes, mimeType } = await fetchImageBytesFromPath(
      "tests/fixtures/policy-v2/images/safe-drill.png",
    );
    const ocr = new TesseractOcrProvider();
    const result = await ocr.recognize({ imageId: "test", bytes, mimeType });
    expect(["EVALUATED", "FAILED", "TIMEOUT", "UNAVAILABLE"]).toContain(result.status);
    expect(result.provider).toBe("tesseract");
    expect(result.providerVersion).toBeTruthy();
    expect(typeof result.latencyMs).toBe("number");
  });
});

describe("EPIC 189.1 — pixel OCR on fixtures", () => {
  it.skipIf(!existsSync(manifestPath))("extracts Cyrillic/Latin text from packaging fixtures", async () => {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      fixtures: Array<{ id: string; path: string; lines: string[] }>;
    };

    expect(manifest.fixtures.length).toBeGreaterThanOrEqual(10);

    const nicotine = manifest.fixtures.find((f) => f.id === "nicotine-label");
    expect(nicotine).toBeTruthy();

    const evaluation = await evaluateLotImages({
      images: [
        {
          imageId: "img-nicotine",
          url: nicotine!.path,
          sortOrder: 0,
        },
      ],
      fetchFromPath: true,
    });

    expect(evaluation.ocrStatus).toBe("EVALUATED");
    expect(evaluation.combinedOcrText.toLowerCase()).toMatch(/nicotine|никотин|mg/);

    const policy = evaluateLotPolicyV2({
      title: "Ароматизатор",
      description: "без никотина",
      characteristics: [{ name: "Никотин", value: "0" }],
      imageUrls: [nicotine!.path],
      imageEvaluation: evaluation,
    });

    expect(policy.decisionClass).not.toBe("ALLOW");
    expect(policy.conflicts.length + policy.rulesTriggered.length).toBeGreaterThan(0);
  });

  it.skipIf(!existsSync(join(imagesDir, "phone-on-image.png")))(
    "detects contact patterns from pixel OCR",
    async () => {
      const evaluation = await evaluateLotImages({
        images: [
          {
            imageId: "img-phone",
            url: "tests/fixtures/policy-v2/images/phone-on-image.png",
            sortOrder: 0,
          },
        ],
        fetchFromPath: true,
      });

      const contactSignal = evaluation.perImage.some((p) =>
        p.image.policySignals.some((s) => s.policyClass === "contact"),
      );
      expect(contactSignal || evaluation.combinedOcrText.includes("999")).toBe(true);
    },
  );
});

describe("EPIC 189.1 — vape physical case with real OCR", () => {
  it.skipIf(!existsSync(join(imagesDir, "ambiguous-bottle.png")))(
    "Жидкость для вэйпа — MANUAL_REVIEW without fabricated nicotine",
    async () => {
      const evaluation = await evaluateLotImages({
        images: [
          {
            imageId: "vape-1",
            url: "tests/fixtures/policy-v2/images/ambiguous-bottle.png",
            sortOrder: 0,
          },
        ],
        fetchFromPath: true,
      });

      const policy = evaluateLotPolicyV2({
        title: "Жидкость для вэйпа",
        description: "фруктовый вкус",
        imageUrls: ["tests/fixtures/policy-v2/images/ambiguous-bottle.png"],
        imageEvaluation: evaluation,
      });

      expect(["MANUAL_REVIEW", "NOT_EVALUATED", "HARD_BLOCK"]).toContain(policy.decisionClass);
      if (evaluation.combinedOcrText.match(/nicotine|никотин|20\s*mg/i)) {
        expect(policy.decisionClass).toBe("HARD_BLOCK");
      } else {
        expect(policy.decisionClass).toBe("MANUAL_REVIEW");
      }
    },
  );
});

describe("EPIC 189.1 — cache key stability", () => {
  it("hashes identical bytes consistently", async () => {
    const a = Buffer.from("test-image-bytes");
    expect(hashImageBytes(a)).toBe(hashImageBytes(Buffer.from("test-image-bytes")));
  });
});
