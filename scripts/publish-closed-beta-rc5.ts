#!/usr/bin/env tsx
/** Publish Closed Beta RC5 (0.1.10-beta.1 code 9) to MRP BETA channel. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ensureClosedBetaRC5Published } from "@/lib/mobile-release-platform/publish-closed-beta-rc5";
import { CLOSED_BETA_RC5_DOWNLOAD_URL, CLOSED_BETA_RELEASE_RC5 } from "@/lib/mobile-release-platform/closed-beta-rc5";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required to publish to the mobile release registry.");
    process.exit(1);
  }

  const manifestPath = resolve("artifacts/closed-beta-rc5/build-manifest.json");
  let sha256 = process.env.RC5_SHA256 ?? "";
  let artifactSizeBytes = Number(process.env.RC5_SIZE_BYTES ?? "0");
  let gitCommit = process.env.RC5_COMMIT_SHA ?? "";

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      commitSha?: string;
      artifact?: { sha256?: string; sizeBytes?: number };
    };
    sha256 = sha256 || manifest.artifact?.sha256 || "";
    artifactSizeBytes = artifactSizeBytes || manifest.artifact?.sizeBytes || 0;
    gitCommit = gitCommit || manifest.commitSha?.slice(0, 7) || "";
  } catch {
    if (!sha256) {
      console.error("build-manifest.json not found and RC5_SHA256 not set.");
      process.exit(1);
    }
  }

  console.log("Publishing Closed Beta RC5 to MRP BETA channel…");
  console.log(`  version: ${CLOSED_BETA_RELEASE_RC5.versionName} (${CLOSED_BETA_RELEASE_RC5.versionCode})`);
  console.log(`  sha256:  ${sha256}`);
  console.log(`  url:     ${CLOSED_BETA_RC5_DOWNLOAD_URL}`);

  const result = await ensureClosedBetaRC5Published({
    sha256,
    artifactSizeBytes,
    gitCommit,
  });

  console.log("\nPublished:");
  console.log(JSON.stringify(result.release, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
