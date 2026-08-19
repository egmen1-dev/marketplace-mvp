#!/usr/bin/env tsx
/** Publish Closed Beta RC2 (0.1.7-beta.1 code 6) to MRP BETA channel on staging/production DB. */
import { ensureClosedBetaRC2Published } from "@/lib/mobile-release-platform/publish-closed-beta-rc2";
import { CLOSED_BETA_RC2_DOWNLOAD_URL, CLOSED_BETA_RELEASE_RC2 } from "@/lib/mobile-release-platform/closed-beta-rc2";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required to publish to the mobile release registry.");
    process.exit(1);
  }

  console.log("Publishing Closed Beta RC2 to MRP BETA channel…");
  console.log(`  version: ${CLOSED_BETA_RELEASE_RC2.versionName} (${CLOSED_BETA_RELEASE_RC2.versionCode})`);
  console.log(`  sha256:  ${CLOSED_BETA_RELEASE_RC2.sha256}`);
  console.log(`  url:     ${CLOSED_BETA_RC2_DOWNLOAD_URL}`);

  const result = await ensureClosedBetaRC2Published();

  console.log("\nPublished:");
  console.log(JSON.stringify(result.release, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
