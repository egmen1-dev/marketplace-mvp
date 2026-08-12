/**
 * In-process taxonomy cache for matcher suggest (1000+ ProductTypes ready).
 * Invalidated after taxonomy sync / unify.
 */

import type { PrismaClient } from "@prisma/client";

import { buildMatchCandidates } from "./migration";
import type { MatchCandidate } from "./types";

const DEFAULT_TTL_MS = 60_000;

let cachedCandidates: MatchCandidate[] | null = null;
let cachedAt = 0;
let ttlMs = DEFAULT_TTL_MS;

export function configureTaxonomyCacheTtl(ms: number): void {
  ttlMs = Math.max(1_000, ms);
}

export function invalidateTaxonomyCache(): void {
  cachedCandidates = null;
  cachedAt = 0;
}

/** Cached match candidates — single DB round-trip per TTL window. */
export async function getMatchCandidates(
  db: PrismaClient,
  options?: { force?: boolean },
): Promise<MatchCandidate[]> {
  const force = options?.force ?? false;
  const now = Date.now();
  if (
    !force &&
    cachedCandidates &&
    now - cachedAt < ttlMs
  ) {
    return cachedCandidates;
  }
  cachedCandidates = await buildMatchCandidates(db);
  cachedAt = now;
  return cachedCandidates;
}
