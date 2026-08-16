import { createHash } from "node:crypto";

import type { Prisma, ProductOpsSurface } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type { CrashIntelligenceRow } from "../types";

export function hashDeviceId(deviceId: string): string {
  return createHash("sha256").update(deviceId).digest("hex").slice(0, 16);
}

export type TelemetryInput = {
  eventType: string;
  surface?: ProductOpsSurface;
  screen?: string;
  sessionId?: string;
  deviceId?: string;
  versionCode?: number;
  versionName?: string;
  platform?: string;
  metadata?: Record<string, unknown>;
};

export async function recordTelemetryEvent(input: TelemetryInput) {
  const deviceIdHash = input.deviceId ? hashDeviceId(input.deviceId) : undefined;
  return prisma.productTelemetryEvent.create({
    data: {
      eventType: input.eventType,
      surface: input.surface ?? "MOBILE",
      screen: input.screen,
      sessionId: input.sessionId,
      deviceIdHash,
      versionCode: input.versionCode,
      versionName: input.versionName,
      platform: input.platform,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function getCrashIntelligence(limit = 20): Promise<CrashIntelligenceRow[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const events = await prisma.productTelemetryEvent.findMany({
    where: {
      createdAt: { gte: since },
      eventType: { in: ["crash", "error", "error_report_requested"] },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const grouped = new Map<string, typeof events>();
  for (const event of events) {
    const key = `${event.eventType}:${event.screen ?? "unknown"}`;
    const bucket = grouped.get(key) ?? [];
    bucket.push(event);
    grouped.set(key, bucket);
  }

  const total = events.length || 1;

  return [...grouped.entries()]
    .map(([key, rows]) => {
      const [eventType] = key.split(":");
      const count = rows.length;
      const probability = Math.round((count / total) * 1000) / 10;
      const severity: CrashIntelligenceRow["severity"] =
        count >= 10 ? "high" : count >= 3 ? "medium" : "low";

      return {
        eventType,
        count,
        deviceModels: [...new Set(rows.map((r) => String((r.metadata as { model?: string })?.model ?? "unknown")))],
        versionCodes: [...new Set(rows.map((r) => r.versionCode).filter((v): v is number => v != null))],
        screens: [...new Set(rows.map((r) => r.screen).filter((s): s is string => Boolean(s)))],
        severity,
        probability,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function countTelemetrySince(hours: number, eventTypes?: string[]) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return prisma.productTelemetryEvent.count({
    where: {
      createdAt: { gte: since },
      ...(eventTypes ? { eventType: { in: eventTypes } } : {}),
    },
  });
}
