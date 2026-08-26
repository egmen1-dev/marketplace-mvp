import { createHash } from "node:crypto";

import jsQR from "jsqr";
import sharp from "sharp";

import type { ImageModerationProvider, ImageModerationResult, OcrResult } from "./types";

const PROVIDER_ID = "pixel-composite";
const PROVIDER_VERSION = "1.0.0";

const CONTACT_PATTERNS = [
  { id: "phone", re: /(?:\+7|8)[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/ },
  { id: "telegram", re: /(?:t\.me\/|telegram\.me\/|@[\w_]{4,})/i },
  { id: "whatsapp", re: /(?:wa\.me\/|whatsapp)/i },
  { id: "url", re: /https?:\/\/[^\s]+/i },
];

const OCR_POLICY_KEYWORDS: Array<{ signalId: string; label: string; policyClass: string; re: RegExp }> = [
  { signalId: "nicotine_text", label: "nicotine_text_on_packaging", policyClass: "nicotine", re: /никотин|nicotine|mg\s*\/\s*ml|мг\s*\/\s*мл/i },
  { signalId: "vape_text", label: "vape_text_on_packaging", policyClass: "vape", re: /вейп|вэйп|vape|pod|жижа|e-liquid/i },
  { signalId: "alcohol_text", label: "alcohol_text_on_packaging", policyClass: "alcohol", re: /водка|виски|пиво|alcohol|abv|крепость/i },
  { signalId: "weapon_text", label: "weapon_text_on_packaging", policyClass: "weapons", re: /пистолет|оружие|патрон|ammo/i },
  { signalId: "document_text", label: "document_text_on_packaging", policyClass: "documents", re: /паспорт|удостоверение|passport|id card/i },
];

function hashRaw(payload: string): string {
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

async function decodeQr(bytes: Buffer): Promise<{ detected: boolean; payload: string | null }> {
  try {
    const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const imageData = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
    const code = jsQR(imageData, info.width, info.height);
    if (code?.data) {
      return { detected: true, payload: code.data };
    }
  } catch {
    // fall through
  }
  return { detected: false, payload: null };
}

function signalsFromOcr(ocr: OcrResult | null | undefined): ImageModerationResult["policySignals"] {
  if (!ocr || ocr.status !== "EVALUATED") return [];
  const text = `${ocr.normalizedText}\n${ocr.blocks.map((b) => b.text).join("\n")}`;
  const signals: ImageModerationResult["policySignals"] = [];

  for (const pattern of OCR_POLICY_KEYWORDS) {
    if (pattern.re.test(text)) {
      signals.push({
        signalId: pattern.signalId,
        label: pattern.label,
        policyClass: pattern.policyClass,
        confidence: Math.min(0.92, ocr.confidence + 0.1),
        detail: "derived from pixel OCR text on image",
      });
    }
  }

  for (const pattern of CONTACT_PATTERNS) {
    if (pattern.re.test(text)) {
      signals.push({
        signalId: `contact_${pattern.id}`,
        label: `contact_${pattern.id}_in_image`,
        policyClass: "contact",
        confidence: 0.88,
        detail: "contact pattern in pixel OCR",
      });
    }
  }

  return signals;
}

/** Pixel-level image moderation: QR detection + OCR-derived policy signals. Visual object CV requires optional cloud provider. */
export class PixelCompositeImageModerationProvider implements ImageModerationProvider {
  readonly id = PROVIDER_ID;
  readonly version = PROVIDER_VERSION;

  async analyze(input: {
    imageId: string;
    bytes: Buffer;
    mimeType: string;
    ocrResult?: OcrResult | null;
  }): Promise<ImageModerationResult> {
    const started = Date.now();
    const evaluatedAt = new Date().toISOString();

    try {
      const qr = await decodeQr(input.bytes);
      const policySignals = signalsFromOcr(input.ocrResult);

      if (qr.detected) {
        policySignals.push({
          signalId: "qr_code",
          label: "qr_code_detected",
          policyClass: "contact",
          confidence: 0.9,
          detail: qr.payload ? `payload:${qr.payload.slice(0, 80)}` : undefined,
        });
      }

      const labels: ImageModerationResult["labels"] = [];
      if (qr.detected) labels.push({ name: "qr_code", confidence: 0.9 });
      for (const sig of policySignals) {
        labels.push({ name: sig.label, confidence: sig.confidence });
      }

      const hasSignals = policySignals.length > 0;
      const status = hasSignals || qr.detected || input.ocrResult?.status === "EVALUATED" ? "EVALUATED" : "NOT_EVALUATED";

      return {
        status,
        provider: this.id,
        providerVersion: this.version,
        evaluatedAt,
        labels,
        policySignals,
        confidence: hasSignals ? Math.max(...policySignals.map((s) => s.confidence)) : qr.detected ? 0.9 : 0.5,
        rawResultHash: hashRaw(JSON.stringify({ qr, signals: policySignals.map((s) => s.signalId) })),
        latencyMs: Date.now() - started,
        qrDetected: qr.detected,
        qrPayload: qr.payload,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown";
      return {
        status: "FAILED",
        provider: this.id,
        providerVersion: this.version,
        evaluatedAt,
        labels: [],
        policySignals: [],
        confidence: 0,
        rawResultHash: "",
        latencyMs: Date.now() - started,
        errorClass: "PROVIDER_ERROR",
        errorMessage: message.slice(0, 240),
      };
    }
  }
}
