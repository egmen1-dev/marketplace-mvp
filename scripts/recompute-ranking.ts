/**
 * Recompute LOT Ranking v1 stats for all ACTIVE products.
 *
 * Run: npm run ranking:recompute
 */
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env" });

import { prisma } from "../lib/prisma";

async function main() {
  const { recomputeRankingStats } = await import("../lib/ranking/aggregate");
  const res = await recomputeRankingStats(prisma);
  console.log(
    `Ranking recompute: products=${res.productsScored} version=${res.rankingVersion} durationMs=${res.durationMs}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
