import { prisma } from "@/lib/prisma";

import { isEligibleReleaseMetric } from "./evidence-eligibility";
import type { CrashObservatoryRow } from "./types";

const CRASH_EVENT_TYPES = [
  "crash",
  "js_crash",
  "native_crash",
  "unhandled_promise",
  "api_failure",
  "timeout",
  "offline_failure",
  "memory_warning",
  "slow_startup",
  "image_failure",
  "upload_failure",
  "navigation_failure",
  "error",
  "error_report_requested",
];

export async function getCrashObservatory(days = 7, limit = 30): Promise<CrashObservatoryRow[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const events = await prisma.productTelemetryEvent.findMany({
    where: {
      createdAt: { gte: since },
      eventType: { in: CRASH_EVENT_TYPES },
    },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });

  const eligible = events.filter((event) =>
    isEligibleReleaseMetric({
      createdAt: event.createdAt,
      screen: event.screen,
      sessionId: event.sessionId,
      metadata: event.metadata,
    }),
  );

  const grouped = new Map<string, typeof eligible>();
  for (const event of eligible) {
    const key = `${event.eventType}:${event.screen ?? "unknown"}`;
    const bucket = grouped.get(key) ?? [];
    bucket.push(event);
    grouped.set(key, bucket);
  }

  return [...grouped.entries()]
    .map(([key, rows]) => {
      const [eventType, screen] = key.split(":");
      const count = rows.length;
      const meta = (r: typeof rows[number]) => (r.metadata as Record<string, unknown>) ?? {};
      const severity: CrashObservatoryRow["severity"] =
        count >= 20 ? "critical" : count >= 10 ? "high" : count >= 3 ? "medium" : "low";

      const stepsBeforeCrash = rows
        .map((r) => String(meta(r).stepsBeforeCrash ?? meta(r).navigationPath ?? ""))
        .filter(Boolean)
        .slice(0, 5);

      return {
        eventType,
        screen,
        count,
        userRoles: [...new Set(rows.map((r) => String(meta(r).userRole ?? "unknown")))],
        networks: [...new Set(rows.map((r) => String(meta(r).network ?? "unknown")))],
        builds: [...new Set(rows.map((r) => r.versionCode).filter((v): v is number => v != null))],
        devices: [...new Set(rows.map((r) => String(meta(r).model ?? meta(r).device ?? "unknown")))],
        stepsBeforeCrash,
        severity,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function countCrashesSince(hours: number): Promise<number> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const events = await prisma.productTelemetryEvent.findMany({
    where: {
      createdAt: { gte: since },
      eventType: { in: ["crash", "js_crash", "native_crash", "unhandled_promise"] },
    },
    select: { createdAt: true, screen: true, sessionId: true, metadata: true },
    take: 5000,
  });
  return events.filter((event) =>
    isEligibleReleaseMetric({
      createdAt: event.createdAt,
      screen: event.screen,
      sessionId: event.sessionId,
      metadata: event.metadata,
    }),
  ).length;
}

/** Trace helper for release investigations — includes validation events. */
export async function traceCrashEvidence(limit = 20) {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const events = await prisma.productTelemetryEvent.findMany({
    where: {
      createdAt: { gte: since },
      eventType: { in: CRASH_EVENT_TYPES },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return events.map((event) => {
    const meta = (event.metadata as Record<string, unknown>) ?? {};
    return {
      id: event.id,
      createdAt: event.createdAt.toISOString(),
      eventType: event.eventType,
      screen: event.screen,
      sessionId: event.sessionId,
      versionCode: event.versionCode,
      versionName: event.versionName,
      platform: event.platform,
      exception: meta.errorMessage ?? meta.errorCode,
      stack: meta.errorStack,
      source: meta.evidenceSource ?? "inferred",
      eligibleForReleaseMetrics: isEligibleReleaseMetric({
        createdAt: event.createdAt,
        screen: event.screen,
        sessionId: event.sessionId,
        metadata: event.metadata,
      }),
    };
  });
}
