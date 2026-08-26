import type { PolicyEvidenceHit } from "./types";
import type { LotImageEvaluationAggregate, PerImageEvaluation } from "../providers/types";
import { matchPatterns } from "./text-engine";

const PIXEL_OCR_ENGINE = "LOT_POLICY_V2_TESSERACT_OCR/1.0.0";
const PIXEL_IMAGE_ENGINE = "LOT_POLICY_V2_PIXEL_IMAGE/1.0.0";

export type PixelImageOcrAnalysis = {
  imageSignals: {
    evaluation: "NOT_EVALUATED" | "SAFE" | "FLAGGED";
    ocrAvailable: boolean;
    imageText: string | null;
    engineVersion: string;
  };
  ocrText: string;
  evidence: PolicyEvidenceHit[];
  notEvaluatedReasons: string[];
  perImage: PerImageEvaluation[];
  aggregate?: LotImageEvaluationAggregate;
};

const SIGNAL_TO_POLICY: Record<string, string> = {
  nicotine_text_on_packaging: "LOT_NICOTINE_LIQUID_V2",
  vape_text_on_packaging: "LOT_VAPE_LIQUID_AMBIGUOUS_V2",
  alcohol_text_on_packaging: "LOT_ALCOHOL_REMOTE_V2",
  weapon_text_on_packaging: "LOT_WEAPON_FIREARM_V2",
  document_text_on_packaging: "LOT_OFFICIAL_DOCUMENTS_V2",
  qr_code_detected: "LOT_QR_IN_IMAGE_V2",
  contact_phone_in_image: "LOT_CONTACT_IN_IMAGE_V2",
  contact_telegram_in_image: "LOT_CONTACT_IN_IMAGE_V2",
  contact_whatsapp_in_image: "LOT_CONTACT_IN_IMAGE_V2",
  contact_url_in_image: "LOT_CONTACT_IN_IMAGE_V2",
};

export function analyzePixelImageAndOcr(input: {
  imageEvaluation: LotImageEvaluationAggregate | null;
  evaluatedAt: string;
}): PixelImageOcrAnalysis {
  const evidence: PolicyEvidenceHit[] = [];
  const notEvaluatedReasons: string[] = [];
  const agg = input.imageEvaluation;

  if (!agg || agg.perImage.length === 0) {
    return {
      imageSignals: {
        evaluation: "NOT_EVALUATED",
        ocrAvailable: false,
        imageText: null,
        engineVersion: `${PIXEL_IMAGE_ENGINE};no-images`,
      },
      ocrText: "",
      evidence: [],
      notEvaluatedReasons: [],
      perImage: [],
      aggregate: agg ?? undefined,
    };
  }

  for (const per of agg.perImage) {
    for (const block of per.ocr.blocks) {
      if (!block.text.trim()) continue;
      evidence.push({
        source: "OCR_SIGNAL",
        policyId: "LOT_PIXEL_OCR_V2",
        confidence: block.confidence,
        matchedValue: block.text.slice(0, 300),
        detail: `imageId=${per.imageId}; normalized=${block.normalizedText.slice(0, 120)}`,
        engineVersion: `${PIXEL_OCR_ENGINE};${per.ocr.provider}/${per.ocr.providerVersion}`,
        evaluatedAt: input.evaluatedAt,
      });
    }

    for (const sig of per.image.policySignals) {
      const policyId = SIGNAL_TO_POLICY[sig.label] ?? "LOT_IMAGE_SIGNAL_V2";
      evidence.push({
        source: "IMAGE_SIGNAL",
        policyId,
        confidence: sig.confidence,
        matchedValue: sig.label,
        detail: `imageId=${per.imageId}; ${sig.detail ?? ""}`,
        engineVersion: `${PIXEL_IMAGE_ENGINE};${per.image.provider}/${per.image.providerVersion}`,
        evaluatedAt: input.evaluatedAt,
      });
    }

    if (per.ocr.status === "FAILED" || per.ocr.status === "TIMEOUT") {
      notEvaluatedReasons.push(`OCR_${per.ocr.status}:${per.imageId}`);
    }
    if (per.image.status === "FAILED" || per.image.status === "TIMEOUT") {
      notEvaluatedReasons.push(`IMAGE_${per.image.status}:${per.imageId}`);
    }
  }

  const ocrText = agg.combinedOcrText;
  const hasPixelOcr = agg.ocrStatus === "EVALUATED";
  const hasPixelImage = agg.imageStatus === "EVALUATED";

  if (!hasPixelOcr) {
    notEvaluatedReasons.push("PIXEL_OCR_NOT_EVALUATED");
  }
  if (!hasPixelImage) {
    notEvaluatedReasons.push("PIXEL_IMAGE_CLASSIFICATION_INCOMPLETE");
  }

  const flagged = evidence.some(
    (e) =>
      e.policyId.startsWith("LOT_CONTACT") ||
      e.policyId.startsWith("LOT_QR") ||
      e.policyId === "LOT_NICOTINE_LIQUID_V2" ||
      e.policyId === "LOT_ALCOHOL_REMOTE_V2" ||
      e.policyId === "LOT_WEAPON_FIREARM_V2",
  );

  const nicotineInOcr = matchPatterns(ocrText, ["никотин", "nicotine", "mg/ml", "20mg"]).length > 0;

  const evaluation =
    flagged || nicotineInOcr ? "FLAGGED" : hasPixelOcr && hasPixelImage ? "SAFE" : "NOT_EVALUATED";

  return {
    imageSignals: {
      evaluation,
      ocrAvailable: hasPixelOcr,
      imageText: ocrText || null,
      engineVersion: `${PIXEL_OCR_ENGINE}+${PIXEL_IMAGE_ENGINE}`,
    },
    ocrText,
    evidence,
    notEvaluatedReasons: [...new Set(notEvaluatedReasons)],
    perImage: agg.perImage,
    aggregate: agg,
  };
}

/** @deprecated URL/alt heuristic only — not pixel OCR. Do not use for operational status. */
export function analyzeImageAndOcrHeuristic(input: {
  imageUrls: string[];
  imageAltTexts: string[];
  evaluatedAt: string;
}): PixelImageOcrAnalysis {
  void input;
  return {
    imageSignals: {
      evaluation: "NOT_EVALUATED",
      ocrAvailable: false,
      imageText: null,
      engineVersion: "HEURISTIC_DISABLED_EPIC_189_1",
    },
    ocrText: "",
    evidence: [],
    notEvaluatedReasons: input.imageUrls.length > 0 ? ["PIXEL_OCR_REQUIRED"] : [],
    perImage: [],
  };
}
