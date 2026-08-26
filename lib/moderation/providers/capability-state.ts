import { isImageModerationOperational, isOcrOperational } from "./evaluate-lot-images";

export type PolicyV2Capability = "AVAILABLE" | "UNAVAILABLE";
export type OcrCapability = "OPERATIONAL" | "DEGRADED" | "UNAVAILABLE";
/** Pixel OCR + QR + OCR-derived signals; visual object CV is separate and unavailable. */
export type ImageModerationCapability = "PARTIAL" | "OPERATIONAL" | "DEGRADED" | "UNAVAILABLE";

export function getPolicyV2CapabilityState(): PolicyV2Capability {
  return "AVAILABLE";
}

export function getOcrCapabilityState(): OcrCapability {
  if (process.env.MODERATION_OCR_PROVIDER === "unavailable") return "UNAVAILABLE";
  if (!isOcrOperational()) return "UNAVAILABLE";
  if (process.env.MODERATION_OCR_PROVIDER === "degraded") return "DEGRADED";
  return "OPERATIONAL";
}

export function getImageModerationCapabilityState(): ImageModerationCapability {
  if (process.env.MODERATION_IMAGE_PROVIDER === "unavailable") return "UNAVAILABLE";
  if (!isImageModerationOperational()) return "UNAVAILABLE";
  if (process.env.MODERATION_IMAGE_PROVIDER === "degraded") return "DEGRADED";
  // Honest: no general visual object CV — pixel OCR + QR + OCR-derived signals only.
  return "PARTIAL";
}

export function getVisualObjectClassificationState(): "UNAVAILABLE" | "OPERATIONAL" {
  return process.env.GOOGLE_CLOUD_VISION_ENABLED === "true" ? "OPERATIONAL" : "UNAVAILABLE";
}
