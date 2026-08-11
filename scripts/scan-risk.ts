/**
 * Run the AGENT-019 risk scan (detectors → idempotent RiskEvents + stats).
 * Analysis only; never mutates products/orders.
 *
 * Run: npm run risk:scan
 */
import { config } from "dotenv";
config({ path: ".env" });

import { prisma } from "../lib/prisma";
import { scanProductRisks } from "../features/trust-risk/scan";

async function main() {
  const res = await scanProductRisks(prisma, { limit: 500 });
  console.log(
    `Risk scan: products=${res.productsScanned} priceOutliers=${res.priceOutliers} duplicates=${res.duplicates} selfDeals=${res.selfDeals}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
