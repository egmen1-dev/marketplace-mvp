import { postTelemetry } from "../api/endpoints";
import { getBetaConfig } from "./config";

const marks = new Map<string, number>();

export function markPerformance(metric: string): void {
  if (!getBetaConfig().performanceTrackingEnabled) return;
  marks.set(metric, Date.now());
}

export function measurePerformance(screen: string, metric: string): void {
  if (!getBetaConfig().performanceTrackingEnabled) return;
  const start = marks.get(metric);
  if (!start) return;
  const durationMs = Date.now() - start;
  marks.delete(metric);
  void postTelemetry({
    screen,
    event: "perf_timing",
    metadata: { metric, durationMs },
  }).catch(() => null);
}

export function trackApiLatency(screen: string, endpoint: string, durationMs: number): void {
  if (!getBetaConfig().performanceTrackingEnabled) return;
  void postTelemetry({
    screen,
    event: "api_timing",
    metadata: { metric: "api_latency", endpoint, durationMs },
  }).catch(() => null);
}

export function trackBootTiming(step: string, durationMs: number): void {
  if (!getBetaConfig().performanceTrackingEnabled) return;
  void postTelemetry({
    screen: "boot",
    event: "boot_timing",
    metadata: { metric: "startup", step, durationMs },
  }).catch(() => null);
}
