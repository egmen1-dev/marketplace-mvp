import type { AnalyticsEventName } from "@/lib/analytics/events";

export type FunnelStepMetric = {
  event: AnalyticsEventName | "page_view";
  label: string;
  count: number;
  uniqueVisitors: number;
  /** % of previous step unique visitors */
  conversionFromPrevious: number | null;
  /** % of traffic (page_view) unique visitors */
  conversionFromTraffic: number | null;
  /** Previous unique − current unique */
  dropOff: number | null;
};

export function pctRate(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}

export function buildFunnelStepMetrics(
  steps: ReadonlyArray<{ event: string; label: string }>,
  counts: Record<string, number>,
  uniques: Record<string, number>,
): FunnelStepMetric[] {
  const trafficUnique = uniques.page_view ?? uniques.landing_view ?? 0;

  return steps.map((step, index) => {
    const count = counts[step.event] ?? 0;
    const uniqueVisitors = uniques[step.event] ?? 0;
    const prevUnique =
      index > 0
        ? (uniques[steps[index - 1]!.event] ?? 0)
        : trafficUnique;

    const conversionFromPrevious = pctRate(uniqueVisitors, prevUnique);
    const conversionFromTraffic = pctRate(uniqueVisitors, trafficUnique);
    const dropOff =
      index > 0 && prevUnique > 0 ? Math.max(0, prevUnique - uniqueVisitors) : null;

    return {
      event: step.event as FunnelStepMetric["event"],
      label: step.label,
      count,
      uniqueVisitors,
      conversionFromPrevious,
      conversionFromTraffic,
      dropOff,
    };
  });
}

export function formatPct(value: number | null): string {
  if (value == null) return "—";
  return `${value}%`;
}
