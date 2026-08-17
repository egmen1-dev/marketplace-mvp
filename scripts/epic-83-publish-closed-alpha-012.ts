#!/usr/bin/env tsx
/** EPIC-83 — publish Closed Alpha release 0.1.2-alpha to MRP registry */
import { ensureClosedAlpha012ReleasePublished } from "@/lib/mobile-release-platform/publish-closed-alpha-012";
import {
  CLOSED_ALPHA_APK,
  CLOSED_ALPHA_APK_DOWNLOAD_URL,
  CLOSED_ALPHA_APK_PREVIOUS,
} from "@/lib/mobile-release-platform/constants";

async function main() {
  const testerEmail = process.env.CLOSED_ALPHA_TESTER_EMAIL;
  const testerName = process.env.CLOSED_ALPHA_TESTER_NAME;

  console.log("Publishing Closed Alpha 0.1.2-alpha (FIRST SUPPORTED)…");
  console.log(`  previous: ${CLOSED_ALPHA_APK_PREVIOUS.versionName} (${CLOSED_ALPHA_APK_PREVIOUS.versionCode})`);
  console.log(`  version:  ${CLOSED_ALPHA_APK.versionName} (${CLOSED_ALPHA_APK.versionCode})`);
  console.log(`  sha256:   ${CLOSED_ALPHA_APK.sha256}`);
  console.log(`  url:      ${CLOSED_ALPHA_APK_DOWNLOAD_URL}`);

  if (CLOSED_ALPHA_APK.sha256.startsWith("pending")) {
    throw new Error("Update constants.ts with real SHA256 before MRP publish");
  }

  const result = await ensureClosedAlpha012ReleasePublished({
    testerEmail,
    testerName,
    rolloutPercent: 100,
  });

  console.log("\nPublished:");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
