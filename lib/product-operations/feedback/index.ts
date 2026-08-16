import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { hashDeviceId } from "../telemetry";
import type { FeedbackClassification } from "../types";

const CLASSIFIER_RULES: Array<{ type: FeedbackClassification; patterns: RegExp[] }> = [
  { type: "crash", patterns: [/crash/i, /вылет/i, /закрыва/i, /fatal/i] },
  { type: "error", patterns: [/error/i, /ошиб/i, /не работ/i, /баг/i, /500/i] },
  { type: "ux", patterns: [/ux/i, /интерф/i, /непонят/i, /удоб/i, /design/i] },
  { type: "feature_request", patterns: [/feature/i, /добав/i, /хочу/i, /нужн/i, /wish/i] },
  { type: "wish", patterns: [/пожел/i, /лучше/i, /improve/i] },
];

export function classifyFeedback(content: string): { classification: FeedbackClassification; confidence: number } {
  for (const rule of CLASSIFIER_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(content)) {
        return { classification: rule.type, confidence: 0.85 };
      }
    }
  }
  return { classification: "ux", confidence: 0.4 };
}

export async function recordFeedback(input: {
  content: string;
  source?: string;
  userId?: string;
  deviceId?: string;
  versionCode?: number;
  screen?: string;
  metadata?: Record<string, unknown>;
}) {
  const { classification, confidence } = classifyFeedback(input.content);
  return prisma.productFeedbackItem.create({
    data: {
      content: input.content,
      classification,
      confidence,
      source: input.source ?? "mobile",
      userId: input.userId,
      deviceIdHash: input.deviceId ? hashDeviceId(input.deviceId) : undefined,
      versionCode: input.versionCode,
      screen: input.screen,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function listFeedback(limit = 50) {
  return prisma.productFeedbackItem.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getFeedbackSummary() {
  const rows = await prisma.productFeedbackItem.groupBy({
    by: ["classification"],
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.classification, r._count._all]));
}
