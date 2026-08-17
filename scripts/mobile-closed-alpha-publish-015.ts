#!/usr/bin/env tsx
/** RELEASE 0.1.5-alpha — P0 expo-clipboard + ErrorUtils MRP publish (after GitHub Release upload) */
import { ensureClosedAlpha015ReleasePublished } from "@/lib/mobile-release-platform/publish-closed-alpha-015";
import {
  CLOSED_ALPHA_APK,
  CLOSED_ALPHA_APK_DOWNLOAD_URL,
  CLOSED_ALPHA_APK_PREVIOUS,
} from "@/lib/mobile-release-platform/constants";

async function main() {
  const testerEmail = process.env.CLOSED_ALPHA_TESTER_EMAIL;
  const testerName = process.env.CLOSED_ALPHA_TESTER_NAME;

  console.log("Publishing Closed Alpha 0.1.5-alpha (P0 hotfix)…");
  console.log(`  previous: ${CLOSED_ALPHA_APK_PREVIOUS.versionName} (${CLOSED_ALPHA_APK_PREVIOUS.versionCode})`);
  console.log(`  version:  ${CLOSED_ALPHA_APK.versionName} (${CLOSED_ALPHA_APK.versionCode})`);
  console.log(`  sha256:   ${CLOSED_ALPHA_APK.sha256}`);
  console.log(`  url:      ${CLOSED_ALPHA_APK_DOWNLOAD_URL}`);
  console.log("  rollout:  100% (operator publish)");

  const result = await ensureClosedAlpha015ReleasePublished({
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
