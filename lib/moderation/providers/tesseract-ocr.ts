import { createHash } from "node:crypto";

import sharp from "sharp";
import { createWorker, type Worker } from "tesseract.js";

import { normalizePolicyText } from "@/lib/moderation/policy-v2/text-engine";

import type { OcrProvider, OcrResult, OcrTextBlock, ProviderEvaluationStatus } from "./types";

const PROVIDER_ID = "tesseract";
const PROVIDER_VERSION = "5.1.0-rus+eng";

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker(["rus", "eng"], 1, {
        logger: () => {},
      });
      return worker;
    })();
  }
  return workerPromise;
}

function hashRaw(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

export class TesseractOcrProvider implements OcrProvider {
  readonly id = PROVIDER_ID;
  readonly version = PROVIDER_VERSION;

  async recognize(input: {
    imageId: string;
    bytes: Buffer;
    mimeType: string;
  }): Promise<OcrResult> {
    const started = Date.now();
    const evaluatedAt = new Date().toISOString();

    try {
      const png = await sharp(input.bytes)
        .rotate()
        .resize({ width: 1600, withoutEnlargement: true })
        .png()
        .toBuffer();

      const worker = await getWorker();
      const { data } = await worker.recognize(png);
      const text = data.text?.trim() ?? "";
      const normalizedText = normalizePolicyText(text);
      const confidence = data.confidence ? data.confidence / 100 : text ? 0.55 : 0;

      const blocks: OcrTextBlock[] = (data.blocks ?? []).flatMap((block) => {
        const blockText = block.text?.trim();
        if (!blockText) return [];
        return [
          {
            text: blockText,
            normalizedText: normalizePolicyText(blockText),
            confidence: (block.confidence ?? confidence * 100) / 100,
            boundingBox: block.bbox
              ? {
                  x: block.bbox.x0,
                  y: block.bbox.y0,
                  width: block.bbox.x1 - block.bbox.x0,
                  height: block.bbox.y1 - block.bbox.y0,
                }
              : undefined,
          },
        ];
      });

      if (blocks.length === 0 && text) {
        blocks.push({
          text,
          normalizedText,
          confidence,
        });
      }

      const status: ProviderEvaluationStatus = text.length > 0 || confidence > 0 ? "EVALUATED" : "EVALUATED";

      return {
        status,
        provider: this.id,
        providerVersion: this.version,
        evaluatedAt,
        blocks,
        normalizedText,
        confidence,
        language: "rus+eng",
        rawResultHash: hashRaw(text),
        latencyMs: Date.now() - started,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown";
      const isTimeout = message.includes("abort") || message.includes("TIMEOUT");
      return {
        status: isTimeout ? "TIMEOUT" : "FAILED",
        provider: this.id,
        providerVersion: this.version,
        evaluatedAt,
        blocks: [],
        normalizedText: "",
        confidence: 0,
        rawResultHash: "",
        latencyMs: Date.now() - started,
        errorClass: isTimeout ? "TIMEOUT" : "PROVIDER_ERROR",
        errorMessage: message.slice(0, 240),
      };
    }
  }
}

export async function terminateTesseractWorker(): Promise<void> {
  if (workerPromise) {
    const worker = await workerPromise;
    await worker.terminate();
    workerPromise = null;
  }
}
