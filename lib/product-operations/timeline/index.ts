import { prisma } from "@/lib/prisma";

import { listFeedback } from "../feedback";
import type { ProductTimelineEntry } from "../types";

export async function buildProductTimeline(limit = 40): Promise<ProductTimelineEntry[]> {
  const [releases, experiments, feedback, crashes] = await Promise.all([
    prisma.mobileReleaseVersion.findMany({ orderBy: { createdAt: "desc" }, take: 15 }),
    prisma.productExperiment.findMany({ orderBy: { updatedAt: "desc" }, take: 10 }),
    listFeedback(15),
    prisma.productTelemetryEvent.findMany({
      where: { eventType: { in: ["crash", "error"] } },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  const entries: ProductTimelineEntry[] = [
    ...releases.map((r) => ({
      id: r.id,
      type: "release" as const,
      title: `Release ${r.versionName}`,
      at: (r.publishedAt ?? r.createdAt).toISOString(),
      detail: `${r.status} · ${r.channel}`,
    })),
    ...experiments.map((e) => ({
      id: e.id,
      type: "experiment" as const,
      title: `Experiment ${e.name}`,
      at: e.updatedAt.toISOString(),
      detail: e.status + (e.winner ? ` · winner=${e.winner}` : ""),
    })),
    ...feedback.map((f) => ({
      id: f.id,
      type: "feedback" as const,
      title: `Feedback · ${f.classification}`,
      at: f.createdAt.toISOString(),
      detail: f.content.slice(0, 80),
    })),
    ...crashes.map((c) => ({
      id: c.id,
      type: "crash" as const,
      title: `Crash · ${c.screen ?? "unknown"}`,
      at: c.createdAt.toISOString(),
      detail: c.eventType,
    })),
  ];

  return entries.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
