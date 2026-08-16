#!/usr/bin/env tsx
/** EPIC-80 — publish Closed Alpha release 0.1.0-alpha to MRP registry */
import { ensureClosedAlphaReleasePublished } from "@/lib/mobile-release-platform/publish-closed-alpha";
import { CLOSED_ALPHA_APK, CLOSED_ALPHA_APK_DOWNLOAD_URL } from "@/lib/mobile-release-platform/constants";

async function main() {
  const testerEmail = process.env.CLOSED_ALPHA_TESTER_EMAIL;
  const testerName = process.env.CLOSED_ALPHA_TESTER_NAME;

  console.log("Publishing Closed Alpha release…");
  console.log(`  version: ${CLOSED_ALPHA_APK.versionName} (${CLOSED_ALPHA_APK.versionCode})`);
  console.log(`  sha256:  ${CLOSED_ALPHA_APK.sha256}`);
  console.log(`  url:     ${CLOSED_ALPHA_APK_DOWNLOAD_URL}`);

  const result = await ensureClosedAlphaReleasePublished({
    testerEmail,
    testerName,
    rolloutPercent: 100,
  });

  console.log("\nPublished:");
  console.log(JSON.stringify(result.release, null, 2));
  if (result.tester) {
    console.log(`\nTester assigned: ${result.tester.email}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
