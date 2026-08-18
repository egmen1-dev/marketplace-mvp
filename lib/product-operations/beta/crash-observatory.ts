import { prisma } from "@/lib/prisma";

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
    take: 1000,
  });

  const grouped = new Map<string, typeof events>();
  for (const event of events) {
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
  return prisma.productTelemetryEvent.count({
    where: {
      createdAt: { gte: since },
      eventType: { in: ["crash", "js_crash", "native_crash", "unhandled_promise"] },
    },
  });
}
