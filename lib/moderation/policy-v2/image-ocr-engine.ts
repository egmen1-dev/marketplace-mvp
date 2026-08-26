import type { PolicyEvidenceHit } from "./types";

const IMAGE_ENGINE = "LOT_POLICY_V2_IMAGE_HEURISTIC/1.0.0";
const OCR_ENGINE = "LOT_POLICY_V2_OCR_HEURISTIC/1.0.0";

const CONTACT_IN_URL = /(t\.me\/|telegram|whatsapp|wa\.me|viber|vk\.com\/)/i;
const QR_HINT = /qr|qrcode|штрих/i;

export type ImageOcrAnalysis = {
  imageSignals: {
    evaluation: "NOT_EVALUATED" | "SAFE" | "FLAGGED";
    ocrAvailable: boolean;
    imageText: string | null;
    engineVersion: string;
  };
  ocrText: string;
  evidence: PolicyEvidenceHit[];
  notEvaluatedReasons: string[];
};

/** Heuristic image/OCR — uses alt text, URL paths, and fetch metadata. Full CV deferred to external provider. */
export function analyzeImageAndOcrHeuristic(input: {
  imageUrls: string[];
  imageAltTexts: string[];
  evaluatedAt: string;
}): ImageOcrAnalysis {
  const evidence: PolicyEvidenceHit[] = [];
  const notEvaluatedReasons: string[] = [];
  const ocrParts: string[] = [];

  for (let i = 0; i < input.imageUrls.length; i++) {
    const url = input.imageUrls[i] ?? "";
    const alt = input.imageAltTexts[i] ?? "";
    if (alt) ocrParts.push(alt);
    try {
      const path = new URL(url).pathname;
      ocrParts.push(path.replace(/[-_/]/g, " "));
    } catch {
      // relative url
      ocrParts.push(url);
    }

    if (CONTACT_IN_URL.test(url)) {
      evidence.push({
        source: "IMAGE_SIGNAL",
        policyId: "LOT_CONTACT_IN_IMAGE_V2",
        confidence: 0.9,
        matchedValue: url,
        detail: "contact pattern in image URL",
        engineVersion: IMAGE_ENGINE,
        evaluatedAt: input.evaluatedAt,
      });
    }
    if (QR_HINT.test(url) || QR_HINT.test(alt)) {
      evidence.push({
        source: "IMAGE_SIGNAL",
        policyId: "LOT_QR_IN_IMAGE_V2",
        confidence: 0.75,
        matchedValue: alt || url,
        engineVersion: IMAGE_ENGINE,
        evaluatedAt: input.evaluatedAt,
      });
    }
  }

  const ocrText = ocrParts.join("\n").trim();
  const hasPixelOcr = false; // external CV provider not wired in v2 foundation

  if (input.imageUrls.length === 0) {
    // No images uploaded — not a missing safety dimension for text-only evaluation.
  }
  if (!hasPixelOcr && input.imageUrls.length > 0) {
    notEvaluatedReasons.push("PIXEL_OCR_NOT_AVAILABLE");
  }
  if (!hasPixelOcr && input.imageUrls.length > 0) {
    notEvaluatedReasons.push("PIXEL_IMAGE_CLASSIFICATION_NOT_AVAILABLE");
  }

  if (ocrText) {
    evidence.push({
      source: "OCR_SIGNAL",
      policyId: "LOT_OCR_HEURISTIC_V2",
      confidence: 0.45,
      matchedValue: ocrText.slice(0, 200),
      detail: "heuristic from alt/url only — not pixel OCR",
      engineVersion: OCR_ENGINE,
      evaluatedAt: input.evaluatedAt,
    });
  }

  const flagged = evidence.some((e) => e.policyId.startsWith("LOT_CONTACT") || e.policyId.startsWith("LOT_QR"));
  const evaluation =
    input.imageUrls.length === 0
      ? "NOT_EVALUATED"
      : flagged
        ? "FLAGGED"
        : hasPixelOcr
          ? "SAFE"
          : "NOT_EVALUATED";

  return {
    imageSignals: {
      evaluation,
      ocrAvailable: Boolean(ocrText),
      imageText: ocrText || null,
      engineVersion: hasPixelOcr ? OCR_ENGINE : `${OCR_ENGINE};pixel=unavailable`,
    },
    ocrText,
    evidence,
    notEvaluatedReasons,
  };
}
