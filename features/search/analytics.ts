import "server-only";

import { prisma } from "@/lib/prisma";
import { normalizeQuery } from "@/lib/search-intelligence";

/**
 * Search analytics (AGENT-020, section 21): frequency, empty queries, success.
 * Records only the (normalized) query text — no PII. Fire-and-forget.
 */

export function recordSearch(input: {
  original: string;
  resultCount: number;
  intent?: string;
}): void {
  const original = (input.original ?? "").slice(0, 200);
  if (!original.trim()) return;
  void prisma.searchQueryLog
    .create({
      data: {
        original,
        normalized: normalizeQuery(original),
        resultCount: input.resultCount,
        hasResults: input.resultCount > 0,
        intent: input.intent ?? null,
      },
    })
    .catch((err) => console.error("[recordSearch]", err));
}

export async function getSearchAnalytics(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const [total, empty, frequent, emptyTop] = await Promise.all([
    prisma.searchQueryLog.count({ where: { createdAt: { gte: since } } }),
    prisma.searchQueryLog.count({
      where: { createdAt: { gte: since }, hasResults: false },
    }),
    prisma.searchQueryLog.groupBy({
      by: ["normalized"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { normalized: "desc" } },
      take: 10,
    }),
    prisma.searchQueryLog.groupBy({
      by: ["normalized"],
      where: { createdAt: { gte: since }, hasResults: false },
      _count: { _all: true },
      orderBy: { _count: { normalized: "desc" } },
      take: 10,
    }),
  ]);

  return {
    total,
    empty,
    successRate: total > 0 ? (total - empty) / total : 1,
    frequent: frequent.map((f) => ({ query: f.normalized, count: f._count._all })),
    topEmpty: emptyTop.map((f) => ({ query: f.normalized, count: f._count._all })),
  };
}
