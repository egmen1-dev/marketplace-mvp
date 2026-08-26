import { log } from "@/lib/logger";

import {
  getCachedImageModerationResult,
  getCachedOcrResult,
  setCachedModerationEvaluation,
} from "./cache";
import { fetchImageBytes, fetchImageBytesFromPath } from "./fetch-image";
import { PixelCompositeImageModerationProvider } from "./pixel-image-moderation";
import { TesseractOcrProvider } from "./tesseract-ocr";
import type {
  ImageInput,
  ImageModerationProvider,
  LotImageEvaluationAggregate,
  OcrProvider,
  PerImageEvaluation,
  ProviderEvaluationStatus,
} from "./types";
import { LOT_POLICY_V2 } from "../policy-v2/types";

export type ModerationProvidersConfig = {
  ocr: OcrProvider;
  image: ImageModerationProvider;
};

let cachedProviders: ModerationProvidersConfig | null = null;

export function getModerationProviders(): ModerationProvidersConfig {
  if (!cachedProviders) {
    cachedProviders = {
      ocr: new TesseractOcrProvider(),
      image: new PixelCompositeImageModerationProvider(),
    };
  }
  return cachedProviders;
}

export function __resetModerationProvidersForTests(): void {
  cachedProviders = null;
}

export function isOcrOperational(): boolean {
  return process.env.MODERATION_OCR_PROVIDER !== "unavailable";
}

export function isImageModerationOperational(): boolean {
  return process.env.MODERATION_IMAGE_PROVIDER !== "unavailable";
}

function aggregateStatus(statuses: ProviderEvaluationStatus[]): ProviderEvaluationStatus {
  if (statuses.some((s) => s === "FAILED" || s === "TIMEOUT")) return "FAILED";
  if (statuses.every((s) => s === "EVALUATED")) return "EVALUATED";
  if (statuses.some((s) => s === "EVALUATED")) return "EVALUATED";
  if (statuses.some((s) => s === "UNAVAILABLE")) return "UNAVAILABLE";
  return "NOT_EVALUATED";
}

export async function evaluateLotImages(input: {
  images: ImageInput[];
  fetchFromPath?: boolean;
}): Promise<LotImageEvaluationAggregate> {
  const providers = getModerationProviders();
  const evaluatedAt = new Date().toISOString();
  const perImage: PerImageEvaluation[] = [];

  if (!isOcrOperational() || !isImageModerationOperational()) {
    return {
      evaluatedAt,
      perImage: [],
      combinedOcrText: "",
      ocrStatus: "UNAVAILABLE",
      imageStatus: "UNAVAILABLE",
      providerOcr: providers.ocr.id,
      providerImage: providers.image.id,
    };
  }

  for (const image of input.images) {
    const started = Date.now();
    try {
      const fetched = input.fetchFromPath
        ? await fetchImageBytesFromPath(image.url)
        : await fetchImageBytes(image.url);

      let ocr =
        (await getCachedOcrResult({
          imageContentHash: fetched.contentHash,
          provider: providers.ocr.id,
          providerVersion: providers.ocr.version,
          policyEngineVersion: LOT_POLICY_V2,
        })) ?? null;

      if (!ocr) {
        log.info("ocr_started", { imageId: image.imageId });
        ocr = await providers.ocr.recognize({
          imageId: image.imageId,
          bytes: fetched.bytes,
          mimeType: fetched.mimeType,
        });
        if (ocr.status === "EVALUATED" || ocr.status === "FAILED" || ocr.status === "TIMEOUT") {
          await setCachedModerationEvaluation({
            imageContentHash: fetched.contentHash,
            provider: providers.ocr.id,
            providerVersion: providers.ocr.version,
            kind: "OCR",
            policyEngineVersion: LOT_POLICY_V2,
            result: ocr,
          });
        }
        log.info("ocr_completed", {
          imageId: image.imageId,
          status: ocr.status,
          latencyMs: ocr.latencyMs,
        });
      }

      let imageResult =
        (await getCachedImageModerationResult({
          imageContentHash: fetched.contentHash,
          provider: providers.image.id,
          providerVersion: providers.image.version,
          policyEngineVersion: LOT_POLICY_V2,
        })) ?? null;

      if (!imageResult) {
        log.info("image_moderation_started", { imageId: image.imageId });
        imageResult = await providers.image.analyze({
          imageId: image.imageId,
          bytes: fetched.bytes,
          mimeType: fetched.mimeType,
          ocrResult: ocr,
        });
        await setCachedModerationEvaluation({
          imageContentHash: fetched.contentHash,
          provider: providers.image.id,
          providerVersion: providers.image.version,
          kind: "IMAGE",
          policyEngineVersion: LOT_POLICY_V2,
          result: imageResult,
        });
        log.info("image_moderation_completed", {
          imageId: image.imageId,
          status: imageResult.status,
          latencyMs: imageResult.latencyMs,
        });
      }

      perImage.push({
        imageId: image.imageId,
        url: image.url,
        sortOrder: image.sortOrder,
        contentHash: fetched.contentHash,
        ocr: ocr as PerImageEvaluation["ocr"],
        image: imageResult as PerImageEvaluation["image"],
      });

      void started;
    } catch (err) {
      log.error("image_evaluation_failed", {
        imageId: image.imageId,
        errorMessage: err instanceof Error ? err.message.slice(0, 200) : "unknown",
      });
      const failedAt = new Date().toISOString();
      perImage.push({
        imageId: image.imageId,
        url: image.url,
        sortOrder: image.sortOrder,
        contentHash: "",
        ocr: {
          status: "FAILED",
          provider: providers.ocr.id,
          providerVersion: providers.ocr.version,
          evaluatedAt: failedAt,
          blocks: [],
          normalizedText: "",
          confidence: 0,
          rawResultHash: "",
          latencyMs: 0,
          errorClass: "FETCH_ERROR",
        },
        image: {
          status: "FAILED",
          provider: providers.image.id,
          providerVersion: providers.image.version,
          evaluatedAt: failedAt,
          labels: [],
          policySignals: [],
          confidence: 0,
          rawResultHash: "",
          latencyMs: 0,
          errorClass: "FETCH_ERROR",
        },
      });
    }
  }

  const combinedOcrText = perImage
    .map((p) => p.ocr.blocks.map((b) => b.text).join("\n") || p.ocr.normalizedText)
    .filter(Boolean)
    .join("\n");

  return {
    evaluatedAt,
    perImage,
    combinedOcrText,
    ocrStatus: aggregateStatus(perImage.map((p) => p.ocr.status)),
    imageStatus: aggregateStatus(perImage.map((p) => p.image.status)),
    providerOcr: providers.ocr.id,
    providerImage: providers.image.id,
  };
}
