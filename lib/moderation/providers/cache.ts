import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";

import { LOT_POLICY_V2 } from "../policy-v2/types";
import type { ImageModerationResult, OcrResult } from "./types";

export type CacheKind = "OCR" | "IMAGE";

export async function getCachedOcrResult(input: {
  imageContentHash: string;
  provider: string;
  providerVersion: string;
  policyEngineVersion?: string;
}): Promise<OcrResult | null> {
  const row = await getCachedModerationEvaluation({ ...input, kind: "OCR" });
  return row as OcrResult | null;
}

export async function getCachedImageModerationResult(input: {
  imageContentHash: string;
  provider: string;
  providerVersion: string;
  policyEngineVersion?: string;
}): Promise<ImageModerationResult | null> {
  const row = await getCachedModerationEvaluation({ ...input, kind: "IMAGE" });
  return row as ImageModerationResult | null;
}

export async function getCachedModerationEvaluation(input: {
  imageContentHash: string;
  provider: string;
  providerVersion: string;
  kind: CacheKind;
  policyEngineVersion?: string;
}): Promise<OcrResult | ImageModerationResult | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const row = await prisma.moderationImageEvaluationCache.findUnique({
      where: {
        imageContentHash_provider_providerVersion_kind: {
          imageContentHash: input.imageContentHash,
          provider: input.provider,
          providerVersion: input.providerVersion,
          kind: input.kind,
        },
      },
    });
    if (!row) return null;
    if (input.policyEngineVersion && row.policyEngineVersion !== input.policyEngineVersion) {
      return null;
    }
    return row.resultJson as OcrResult | ImageModerationResult;
  } catch {
    return null;
  }
}

export async function setCachedModerationEvaluation(input: {
  imageContentHash: string;
  provider: string;
  providerVersion: string;
  kind: CacheKind;
  policyEngineVersion?: string;
  result: OcrResult | ImageModerationResult;
}): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    await prisma.moderationImageEvaluationCache.upsert({
    where: {
      imageContentHash_provider_providerVersion_kind: {
        imageContentHash: input.imageContentHash,
        provider: input.provider,
        providerVersion: input.providerVersion,
        kind: input.kind,
      },
    },
    create: {
      id: randomUUID(),
      imageContentHash: input.imageContentHash,
      provider: input.provider,
      providerVersion: input.providerVersion,
      kind: input.kind,
      policyEngineVersion: input.policyEngineVersion ?? LOT_POLICY_V2,
      resultJson: input.result as object,
    },
    update: {
      policyEngineVersion: input.policyEngineVersion ?? LOT_POLICY_V2,
      resultJson: input.result as object,
    },
  });
  } catch {
    // cache optional when migration not applied (tests)
  }
}
