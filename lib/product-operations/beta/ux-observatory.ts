import { prisma } from "@/lib/prisma";

import type { UxConfusionRow } from "./types";

const UX_SIGNALS = [
  "back_press",
  "rage_tap",
  "abandoned_flow",
  "repeated_retry",
  "repeated_reopen",
  "hesitation",
  "dead_end",
  "form_abandon",
  "ignored_button",
] as const;

export async function getUxObservatory(days = 7): Promise<UxConfusionRow[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const events = await prisma.productTelemetryEvent.findMany({
    where: {
      createdAt: { gte: since },
      eventType: { in: [...UX_SIGNALS, "screen_view", "button_press"] },
    },
    select: { eventType: true, screen: true, metadata: true },
    take: 5000,
  });

  const grouped = new Map<string, number>();
  for (const event of events) {
    const screen = event.screen ?? "unknown";
    const key = `${event.eventType}:${screen}`;
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  }

  const rows: UxConfusionRow[] = [...grouped.entries()].map(([key, count]) => {
    const [signal, screen] = key.split(":");
    let detail = signal;
    if (signal === "back_press") detail = "Repeated back navigation";
    if (signal === "rage_tap") detail = "Rage taps detected";
    if (signal === "abandoned_flow") detail = "Flow abandoned before completion";
    if (signal === "form_abandon") detail = "Form abandoned mid-entry";
    if (signal === "dead_end") detail = "Dead-end screen reached";
    return { signal, screen, count, detail };
  });

  return rows.sort((a, b) => b.count - a.count).slice(0, 40);
}

export async function getWeeklyUxReport(days = 7): Promise<{
  generatedAt: string;
  mostAbandonedScreen: string | null;
  mostAbandonedForm: string | null;
  mostIgnoredButton: string | null;
  longestHesitationScreen: string | null;
  mostCommonDeadEnd: string | null;
  rows: UxConfusionRow[];
}> {
  const rows = await getUxObservatory(days);
  const abandoned = rows.find((r) => r.signal === "abandoned_flow");
  const formAbandon = rows.find((r) => r.signal === "form_abandon");
  const ignored = rows.find((r) => r.signal === "ignored_button");
  const hesitation = rows.find((r) => r.signal === "hesitation");
  const deadEnd = rows.find((r) => r.signal === "dead_end");

  return {
    generatedAt: new Date().toISOString(),
    mostAbandonedScreen: abandoned?.screen ?? null,
    mostAbandonedForm: formAbandon?.screen ?? null,
    mostIgnoredButton: ignored?.screen ?? null,
    longestHesitationScreen: hesitation?.screen ?? null,
    mostCommonDeadEnd: deadEnd?.screen ?? null,
    rows,
  };
}
