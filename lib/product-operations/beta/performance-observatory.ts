import { prisma } from "@/lib/prisma";

import { PERFORMANCE_METRICS } from "./types";
import type { PerformanceMetricRow } from "./types";

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return Math.round(sorted[idx]);
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

export async function getPerformanceObservatory(days = 7): Promise<PerformanceMetricRow[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const events = await prisma.productTelemetryEvent.findMany({
    where: {
      createdAt: { gte: since },
      eventType: { in: ["perf_timing", "boot_timing", "api_timing", "screen_render"] },
    },
    select: { eventType: true, screen: true, metadata: true },
    take: 5000,
  });

  const buckets = new Map<string, number[]>();

  for (const event of events) {
    const meta = (event.metadata as { metric?: string; durationMs?: number }) ?? {};
    const metric = meta.metric ?? event.screen ?? event.eventType;
    const duration = Number(meta.durationMs);
    if (!Number.isFinite(duration) || duration <= 0) continue;
    const list = buckets.get(metric) ?? [];
    list.push(duration);
    buckets.set(metric, list);
  }

  const rows: PerformanceMetricRow[] = PERFORMANCE_METRICS.map((metric) => {
    const values = buckets.get(metric) ?? [];
    return {
      metric,
      count: values.length,
      p50Ms: percentile(values, 50),
      p95Ms: percentile(values, 95),
      p99Ms: percentile(values, 99),
      worstMs: values.length > 0 ? Math.max(...values) : 0,
      avgMs: avg(values),
    };
  });

  for (const [metric, values] of buckets.entries()) {
    if (PERFORMANCE_METRICS.includes(metric as typeof PERFORMANCE_METRICS[number])) continue;
    rows.push({
      metric,
      count: values.length,
      p50Ms: percentile(values, 50),
      p95Ms: percentile(values, 95),
      p99Ms: percentile(values, 99),
      worstMs: values.length > 0 ? Math.max(...values) : 0,
      avgMs: avg(values),
    });
  }

  return rows.sort((a, b) => b.p95Ms - a.p95Ms);
}
